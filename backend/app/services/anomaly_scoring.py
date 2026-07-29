import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

import numpy as np
import logging
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.helpers import get_or_create_merchant, get_or_create_organization, log_status_change
from app.db.models import AIModelVersion, Device, AnomalyAlert, AnomalyAlertStatusLog, Transaction
from app.services import anomaly_rule_config

logger = logging.getLogger(__name__)

MODEL_NAME = "rule_based_anomaly_scorer"
# 1.1.0: velocity rules compare a merchant against their own same-weekday
# history instead of a fixed national threshold. Scores change, so the
# version changes — a stored alert must remain attributable to the exact
# logic that produced it.
# 1.2.0: rule weights, thresholds and risk bands are read from configuration
# instead of being module constants. The logic is unchanged; what changed is
# who decides the numbers. Because a score is now only meaningful alongside
# the configuration that produced it, every alert also stores a
# `rule_config` fingerprint — see anomaly_rule_config.fingerprint().
MODEL_VERSION = "1.2.0"


class AnomalyScoringEngine:
    """Real-time anomaly scoring.

    This is a **rule-based** scorer, not a learned model. Each rule
    contributes a fixed weight, and the rules that fire are returned as the
    explanation, so every score traces back to the exact conditions that
    produced it — the property that makes it defensible under EU AI Act /
    NIST CSF style scrutiny and what the "why was this flagged" UI renders.

    The scores this produces are unchanged from the previous revision; what
    is new is that the reasoning is now returned and persisted instead of
    being discarded. The version is therefore still 1.0.0.

    A learned model is deliberately NOT implemented yet: it needs confirmed
    outcomes, which only accumulate once reviewers start agreeing and
    disagreeing with these alerts. The full intended approach — features, model
    shape, training, serving, and the data threshold that must be met first
    — is documented in backend/ml/README.md.
    """

    def __init__(self, db: Session):
        self.db = db
        self.organization = get_or_create_organization(db)
        # Loaded once per engine rather than per transaction: a batch must be
        # scored under one consistent policy, and a fingerprint that changed
        # mid-batch would make the batch unattributable.
        self.rules = anomaly_rule_config.load_rules(db, self.organization.id)
        self.policy = anomaly_rule_config.load_policy(db, self.organization.id)
        self.rule_config_fingerprint = anomaly_rule_config.fingerprint(self.rules, self.policy)
        self.feature_names = [
            'amount_normalized', 'transaction_frequency',
            'merchant_age_days', 'time_of_day', 'day_of_week',
            'device_age_days', 'avg_transaction_amount', 'std_transaction_amount',
            'velocity_1h', 'velocity_24h'
        ]

    def _get_active_model_version(self) -> AIModelVersion:
        """Every anomaly score is traceable to a specific model/version — the
        governance record required for auditable, explainable automated
        risk-scoring (NIST CSF 2.0 / EU AI Act posture)."""
        model = self.db.query(AIModelVersion).filter(
            AIModelVersion.organization_id == self.organization.id,
            AIModelVersion.model_name == MODEL_NAME,
            AIModelVersion.version == MODEL_VERSION,
        ).first()
        if model:
            return model

        model = AIModelVersion(
            id=uuid.uuid4(),
            organization_id=self.organization.id,
            model_name=MODEL_NAME,
            version=MODEL_VERSION,
            trained_at=datetime.utcnow(),
            feature_set={"features": self.feature_names},
            performance_metrics={},
            approved_by="system",
            approved_at=datetime.utcnow(),
            is_active=True,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def extract_named_features(self, transaction: Dict) -> Dict[str, float]:
        """Extract the feature set for a single transaction, keyed by name.

        Named rather than positional because the scoring rules below need to
        quote real values back to the analyst ("14 transactions in the last
        hour"), and indexing a bare array by position made that error-prone.
        `extract_features` returns the same values as an ordered vector for
        model input — the two must stay consistent, which is why one is
        derived from the other.
        """
        try:
            merchant = get_or_create_merchant(
                self.db, self.organization.id, transaction.get("merchant_id")
            )
            merchant_txns = self.db.query(Transaction).filter(
                Transaction.merchant_id == merchant.id
            ).all()

            device = None
            device_code = transaction.get("device_id")
            if device_code:
                device = self.db.query(Device).filter(
                    Device.device_code == device_code
                ).first()

            timestamp_str = transaction.get("timestamp", datetime.utcnow().isoformat())
            timestamp = datetime.fromisoformat(timestamp_str)

            return {
                'amount_normalized': self._normalize_amount(transaction.get("amount", 0)),
                'transaction_frequency': len(merchant_txns),
                'merchant_age_days': self._calculate_merchant_age(merchant_txns),
                'time_of_day': timestamp.hour,
                'day_of_week': timestamp.weekday(),
                'device_age_days': self._calculate_device_age(device) if device else 0,
                'avg_transaction_amount': self._get_avg_transaction_amount(merchant_txns),
                'std_transaction_amount': self._get_std_transaction_amount(merchant_txns),
                'velocity_1h': self._get_transaction_velocity(merchant.id, minutes=60, as_of=timestamp),
                'velocity_24h': self._get_transaction_velocity(merchant.id, hours=24, as_of=timestamp),
                'recent_identical_amount': self._recent_identical_amount(
                    merchant.id, float(transaction.get("amount", 0) or 0), timestamp,
                    window_minutes=float(
                        self.rules["possible_duplicate"].get("threshold") or 10.0
                    ),
                ),
                'is_new_counterparty': self._is_new_counterparty(
                    merchant.id, transaction.get("payer_ref")
                ),
                # None when the merchant has too little same-weekday history.
                # Kept out of `feature_names` because the model vector cannot
                # carry a null; the rules read it directly.
                'weekday_baseline': self._weekday_baseline(merchant.id, timestamp.weekday()),
                'weekday_hourly_baseline': self._weekday_hourly_baseline(
                    merchant.id, timestamp.weekday()
                ),
            }
        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            return {name: 0.0 for name in self.feature_names}

    def extract_features(self, transaction: Dict) -> np.ndarray:
        """Ordered feature vector, for model input. Order is `feature_names`."""
        try:
            features = self.extract_named_features(transaction)
            # `weekday_baseline` is deliberately absent from feature_names: it
            # is nullable, and a model vector cannot carry a null.
            return np.array([features.get(f, 0) or 0 for f in self.feature_names])
        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            return np.zeros(len(self.feature_names))

    # A weekday baseline needs enough same-weekday observations to be a
    # baseline rather than an accident. Four weeks is the floor; below that
    # the merchant is treated as having no established norm.
    MIN_WEEKDAY_OBSERVATIONS = 4
    BASELINE_WINDOW_WEEKS = 12

    def _recent_identical_amount(self, merchant_id, amount: float, as_of: datetime,
                                 window_minutes: float = 10.0) -> int:
        """Payments of exactly this amount to this business inside the
        configured look-back window, excluding the one being scored."""
        try:
            if amount <= 0:
                return 0
            return self.db.query(Transaction).filter(
                Transaction.organization_id == self.organization.id,
                Transaction.deleted_at.is_(None),
                Transaction.merchant_id == merchant_id,
                Transaction.amount == Decimal(str(amount)),
                Transaction.created_at >= as_of - timedelta(minutes=window_minutes),
                Transaction.created_at < as_of,
            ).count()
        except Exception as e:
            logger.error(f"Error checking duplicates: {e}")
            return 0

    def _is_new_counterparty(self, merchant_id, payer_ref: Optional[str]) -> bool:
        """Whether this business has ever been paid by this payer before.

        Returns False when the rails give us no payer reference — absence of
        information is not evidence of novelty.
        """
        try:
            if not payer_ref:
                return False
            seen = self.db.query(Transaction).filter(
                Transaction.organization_id == self.organization.id,
                Transaction.deleted_at.is_(None),
                Transaction.merchant_id == merchant_id,
                Transaction.payer_info["ref"].astext == str(payer_ref),
            ).count()
            return seen == 0
        except Exception as e:
            logger.error(f"Error checking counterparty history: {e}")
            return False

    def _weekday_hourly_baseline(self, merchant_id, weekday: int) -> Optional[float]:
        """Typical *busiest hour* for this merchant on this weekday.

        An earlier version derived this by dividing the daily norm by four,
        which silently assumed every business concentrates its trade into a
        four-hour window. A stall open from dawn to dusk and a taxi rank with
        two rush hours have the same daily total and completely different
        hourly shapes, so the divisor flagged one of them constantly.

        Learning it from history removes the assumption.
        """
        try:
            since = datetime.utcnow() - timedelta(weeks=self.BASELINE_WINDOW_WEEKS)
            bucket = func.date_trunc("hour", Transaction.created_at)

            hourly = self.db.query(
                bucket.label("hour"),
                func.count(Transaction.id).label("count"),
            ).filter(
                Transaction.organization_id == self.organization.id,
                Transaction.deleted_at.is_(None),
                Transaction.merchant_id == merchant_id,
                Transaction.created_at >= since,
                func.extract("dow", Transaction.created_at) == (weekday + 1) % 7,
            ).group_by(bucket).subquery()

            counts = sorted(r.count for r in self.db.query(hourly.c.count).all())
            if len(counts) < self.MIN_WEEKDAY_OBSERVATIONS:
                return None
            # 90th percentile rather than the median: the question is what a
            # normal *peak* looks like, not a normal hour. Most trading hours
            # are quiet, and comparing a rush against them would flag every
            # rush.
            idx = min(int(len(counts) * 0.9), len(counts) - 1)
            return float(counts[idx])
        except Exception as e:
            logger.error(f"Error computing hourly baseline: {e}")
            return None

    def _weekday_baseline(self, merchant_id, weekday: int) -> Optional[float]:
        """Typical daily payment count for this merchant on this weekday.

        Payment activity is strongly seasonal by day of week — a market
        vendor is busiest on Saturday, a government disbursement point is
        dead at the weekend and spikes at month-end. An absolute threshold
        therefore flags *busy trading* rather than *unusual trading*, and it
        does so hardest for the segments with the sharpest weekly cycle:
        informal vendors, taxi drivers and cash agents. That is a systematic
        bias against exactly the businesses this platform exists to include.

        Comparing a Saturday against this merchant's other Saturdays removes
        that. Median rather than mean, because a single exceptional trading
        day would otherwise raise the bar enough to hide a real anomaly.

        Returns None when there is not enough history to say anything, which
        callers must treat as "no opinion" rather than "normal".
        """
        try:
            since = datetime.utcnow() - timedelta(weeks=self.BASELINE_WINDOW_WEEKS)
            day = func.date(Transaction.created_at)

            daily = self.db.query(
                day.label("day"),
                func.count(Transaction.id).label("count"),
            ).filter(
                Transaction.organization_id == self.organization.id,
                Transaction.deleted_at.is_(None),
                Transaction.merchant_id == merchant_id,
                Transaction.created_at >= since,
                # Postgres DOW: 0 = Sunday. Python weekday(): 0 = Monday.
                func.extract("dow", Transaction.created_at) == (weekday + 1) % 7,
            ).group_by(day).subquery()

            counts = [r.count for r in self.db.query(daily.c.count).all()]
            if len(counts) < self.MIN_WEEKDAY_OBSERVATIONS:
                return None

            counts.sort()
            mid = len(counts) // 2
            median = (
                counts[mid]
                if len(counts) % 2
                else (counts[mid - 1] + counts[mid]) / 2
            )
            return float(median)
        except Exception as e:
            logger.error(f"Error computing weekday baseline: {e}")
            return None

    def _evaluate_rules(self, transaction: Dict, f: Dict[str, float]) -> List[Dict]:
        """Run every rule, returning one entry per rule that fired.

        Each entry carries the real numbers behind it so the UI can show an
        analyst *why*, not just *how much*. `contribution` is the weight the
        rule adds to the score, and both it and every threshold below come
        from configuration — see anomaly_rule_config. A rule that has been
        switched off contributes nothing and produces no reason, so a
        disabled rule leaves no trace in the explanation rather than an
        explanation with a zero in it.
        """
        amount = float(transaction.get("amount", 0) or 0)
        reasons: List[Dict] = []

        def rule(code: str) -> Optional[Dict]:
            r = self.rules.get(code)
            return r if r and r.get("enabled") else None

        weekday = int(f["day_of_week"])
        weekday_name = [
            "Monday", "Tuesday", "Wednesday", "Thursday",
            "Friday", "Saturday", "Sunday",
        ][weekday % 7]
        baseline = f.get("weekday_baseline")
        daily = f["velocity_24h"]

        r24 = rule("velocity_24h")
        r1h = rule("velocity_1h")

        if baseline is not None and baseline > 0:
            # Compared against this merchant's own history for this weekday,
            # so a busy Saturday is only unusual against other Saturdays.
            if r24 and daily > baseline * float(r24["threshold"]):
                reasons.append({
                    "code": "velocity_24h",
                    "label": "Unusual for this business on a " + weekday_name,
                    "detail": (
                        f"{int(daily)} payments today. This business normally takes "
                        f"about {baseline:.0f} on a {weekday_name}."
                    ),
                    "contribution": float(r24["contribution"]),
                })
            # Sudden bursts still matter, but the bar is this merchant's own
            # normal peak hour for this weekday — learned, not assumed.
            hourly_bar = f.get("weekday_hourly_baseline")
            if r1h and hourly_bar and f["velocity_1h"] > hourly_bar * float(r1h["threshold"]):
                reasons.append({
                    "code": "velocity_1h",
                    "label": "Sudden burst of payments",
                    "detail": (
                        f"{int(f['velocity_1h'])} payments in one hour, against a busy "
                        f"{weekday_name} hour of about {hourly_bar:.0f} for this business."
                    ),
                    "contribution": float(r1h["contribution"]),
                })
        else:
            # No established norm yet. Rather than fall back to the national
            # threshold that caused the bias, this fires only on activity too
            # extreme to be ordinary for any small business, and says openly
            # that it is judging without a baseline.
            rnb = rule("velocity_no_baseline")
            if rnb and daily > float(rnb["threshold"]):
                reasons.append({
                    "code": "velocity_no_baseline",
                    "label": "High volume, no history to compare against",
                    "detail": (
                        f"{int(daily)} payments in 24 hours from a business with less "
                        f"than four {weekday_name}s of trading history."
                    ),
                    "contribution": float(rnb["contribution"]),
                })

        ramt = rule("amount_anomaly")
        avg_amount = f["avg_transaction_amount"]
        if ramt and avg_amount > 0 and amount > avg_amount * float(ramt["threshold"]):
            reasons.append({
                "code": "amount_anomaly",
                "label": "Unusual transaction amount",
                "detail": (
                    f"N${amount:,.2f} is {amount / avg_amount:.1f}x this merchant's "
                    f"average of N${avg_amount:,.2f}"
                ),
                "contribution": float(ramt["contribution"]),
            })

        # Duplicate and erroneous payments. Protocol-level idempotency
        # already catches the same reference reported twice; this catches a
        # different problem — the same amount to the same business again
        # within minutes, which is usually a genuine double payment rather
        # than a replayed message. Nomentia's product literature puts these
        # ahead of fraud by loss volume, and recovering the money afterwards
        # costs more than catching it.
        rdup = rule("possible_duplicate")
        recent_identical = f.get("recent_identical_amount", 0)
        if rdup and recent_identical >= 1:
            reasons.append({
                "code": "possible_duplicate",
                "label": "Possible duplicate payment",
                "detail": (
                    f"The same amount, N${amount:,.2f}, was already recorded for this "
                    f"business within the last {float(rdup['threshold']):g} minutes."
                ),
                "contribution": float(rdup["contribution"]),
            })

        # A counterparty never seen before. First-time payers are ordinary at
        # a market stall and notable at a business that trades with a settled
        # set of suppliers, so this is weighted lightly on its own.
        rnew = rule("new_counterparty")
        if rnew and f.get("is_new_counterparty"):
            reasons.append({
                "code": "new_counterparty",
                "label": "First payment from this payer",
                "detail": "This business has not received a payment from this payer before.",
                "contribution": float(rnew["contribution"]),
            })

        roff = rule("off_hours")
        if roff:
            opens = int(float(roff["threshold"]))
            closes = opens + 16
            hour = int(f["time_of_day"])
            if hour < opens or hour > closes:
                reasons.append({
                    "code": "off_hours",
                    "label": "Outside normal trading hours",
                    "detail": (
                        f"Transaction at {hour:02d}:00, outside the "
                        f"{opens:02d}:00-{closes:02d}:00 window"
                    ),
                    "contribution": float(roff["contribution"]),
                })

        return reasons

    def _score_anomaly(self, transaction: Dict) -> Optional[Dict]:
        """Ask the unsupervised model for an opinion, if one is trained.

        Imported lazily and wrapped: scoring must not break because a
        model artifact is missing, unreadable, or a dependency changed.
        """
        try:
            from app.services import anomaly_detection

            merchant = get_or_create_merchant(
                self.db, self.organization.id, transaction.get("merchant_id")
            )
            timestamp_str = transaction.get("timestamp", datetime.utcnow().isoformat())
            return anomaly_detection.score_transaction(
                self.db,
                self.organization.id,
                merchant.id,
                float(transaction.get("amount", 0) or 0),
                datetime.fromisoformat(timestamp_str),
            )
        except Exception as e:
            logger.error(f"Anomaly model unavailable, continuing with rules: {e}")
            return None

    def predict(self, transaction: Dict) -> Dict:
        """Score a transaction and explain the score.

        Returns the probability and risk level as before, plus the reasons
        that produced it, a categorical confidence band, and the expected
        loss. Callers that only need the number can ignore the extra keys.
        """
        try:
            f = self.extract_named_features(transaction)
            reasons = self._evaluate_rules(transaction, f)

            # If a trained anomaly model is available, it contributes an
            # additional reason like any rule. When it is not — the state
            # the system ships in — scoring is unchanged. The model is never
            # allowed to be the *only* thing behind an alert: it can raise a
            # score, but the rule reasons remain what an analyst reads.
            rseq = self.rules.get("sequence_anomaly")
            anomaly = self._score_anomaly(transaction) if (rseq and rseq.get("enabled")) else None
            if anomaly and anomaly.get("isAnomaly"):
                reasons.append({
                    "code": "sequence_anomaly",
                    "label": "Unusual versus regional peers",
                    "detail": (
                        f"Anomaly score {anomaly['anomalyScore']:.2f} from "
                        f"{anomaly['modelName']} v{anomaly['modelVersion']}, "
                        f"which compares this merchant against others in the "
                        f"same region"
                    ),
                    "contribution": float(rseq["contribution"]),
                })

            anomaly_score = min(sum(r["contribution"] for r in reasons), 1.0)

            if anomaly_score < self.policy["band_medium"]:
                risk_level = "LOW"
            elif anomaly_score < self.policy["band_high"]:
                risk_level = "MEDIUM"
            else:
                risk_level = "HIGH"

            amount = float(transaction.get("amount", 0) or 0)

            return {
                "transaction_id": transaction.get("transaction_id"),
                "anomaly_score": round(anomaly_score, 2),
                "risk_level": risk_level,
                # Categorical band, shown ahead of the raw number in the UI:
                # operators act on "high/low", not on two decimal places.
                "confidence_band": risk_level.lower(),
                # Expected loss if this alert is real and goes un-actioned.
                # Triage queues sort by this rather than by probability.
                "expected_loss": round(anomaly_score * amount, 2),
                "reasons": reasons,
                # Whether this score is high enough for a person to be asked
                # to look. Recorded either way: everything is scored, only
                # some of it is queued.
                "needs_review": anomaly_score >= self.policy["review_threshold"],
                "model": {"name": MODEL_NAME, "version": MODEL_VERSION},
                # The configuration this score was produced under. Two scores
                # with different fingerprints are not directly comparable, and
                # anomaly_rule_config.history() says what moved between them.
                "rule_config": self.rule_config_fingerprint,
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error(f"Error scoring transaction: {e}")
            return {
                "transaction_id": transaction.get("transaction_id"),
                "anomaly_score": 0.0,
                "risk_level": "LOW",
                "confidence_band": "low",
                "expected_loss": 0.0,
                "reasons": [],
                "needs_review": False,
                "model": {"name": MODEL_NAME, "version": MODEL_VERSION},
                "rule_config": self.rule_config_fingerprint,
                "timestamp": datetime.utcnow().isoformat(),
            }

    def create_anomaly_alert(self, transaction_id: str, merchant_id: str,
                          amount: float, anomaly_score: float,
                          risk_level: str, signal_type: Optional[str] = None,
                          reasons: Optional[List[Dict]] = None) -> Optional[AnomalyAlert]:
        """Create an anomaly alert in the database, linked to the model
        version that produced the score.

        `reasons` is the `reasons` list from `predict()`. It is persisted so
        the explanation survives independently of the model version that
        generated it — an alert raised today must still be explainable after
        the scorer is replaced.
        """
        try:
            merchant = get_or_create_merchant(self.db, self.organization.id, merchant_id)
            model_version = self._get_active_model_version()

            transaction = self.db.query(Transaction).filter(
                Transaction.transaction_ref == transaction_id
            ).first()

            alert = AnomalyAlert(
                id=uuid.uuid4(),
                organization_id=self.organization.id,
                merchant_id=merchant.id,
                transaction_id=transaction.id if transaction else None,
                device_id=transaction.device_id if transaction else None,
                model_version_id=model_version.id,
                amount=Decimal(str(amount)),
                anomaly_score=Decimal(str(anomaly_score)),
                risk_level=risk_level,
                signal_type=signal_type or "suspicious_pattern",
                explanation={
                    "reasons": reasons or [],
                    "model": {"name": MODEL_NAME, "version": MODEL_VERSION},
                    "rule_config": self.rule_config_fingerprint,
                },
                expected_loss=Decimal(str(round(anomaly_score * amount, 2))),
                status="open",
            )
            self.db.add(alert)
            self.db.commit()
            self.db.refresh(alert)

            log_status_change(
                self.db, AnomalyAlertStatusLog, self.organization.id, "anomaly_alert_id", alert.id,
                from_status=None, to_status="open", note="Anomaly alert created.",
            )
            self.db.commit()

            logger.info(f"Anomaly alert created for transaction {transaction_id}")
            return alert
        except Exception as e:
            logger.error(f"Error creating anomaly alert: {e}")
            self.db.rollback()
            return None

    def _normalize_amount(self, amount: float) -> float:
        """Normalize amount to 0-1 scale"""
        # Assuming max transaction amount is 100,000 NAD
        return min(amount / 100000, 1.0)

    def _calculate_merchant_age(self, transactions: List[Transaction]) -> int:
        """Calculate merchant age in days"""
        if not transactions:
            return 0
        oldest = min(t.created_at for t in transactions)
        return (datetime.utcnow() - oldest).days

    def _calculate_device_age(self, device: Device) -> int:
        """Calculate device age in days"""
        if not device:
            return 0
        return (datetime.utcnow() - device.registered_at).days

    def _get_avg_transaction_amount(self, transactions: List[Transaction]) -> float:
        """Get average transaction amount"""
        if not transactions:
            return 0
        return float(sum(t.amount for t in transactions) / len(transactions))

    def _get_std_transaction_amount(self, transactions: List[Transaction]) -> float:
        """Get standard deviation of transaction amounts"""
        if len(transactions) < 2:
            return 0
        amounts = [float(t.amount) for t in transactions]
        return float(np.std(amounts))

    def _get_transaction_velocity(
        self,
        merchant_id,
        minutes: Optional[int] = None,
        hours: Optional[int] = None,
        as_of: Optional[datetime] = None,
    ) -> int:
        """Payments by this merchant in the window ending at `as_of`.

        Two defects fixed here, both found by tests/test_weekday_baseline.py:

        1. The window was anchored to `utcnow()` rather than to the
           transaction being scored. Scoring asks "how busy was this merchant
           *around this payment*", so anchoring to wall-clock time gave the
           wrong answer for anything not scored the instant it happened —
           replays, backfills and any batch rescoring included.
        2. The query filtered by merchant but not by organisation. Every
           other query in this file is tenancy-scoped; this one silently was
           not, so a merchant id colliding across tenants would have counted
           both. No tenant boundary should depend on id uniqueness.
        """
        try:
            anchor = as_of or datetime.utcnow()
            if minutes:
                start_time = anchor - timedelta(minutes=minutes)
            elif hours:
                start_time = anchor - timedelta(hours=hours)
            else:
                return 0

            count = self.db.query(Transaction).filter(
                Transaction.organization_id == self.organization.id,
                Transaction.deleted_at.is_(None),
                Transaction.merchant_id == merchant_id,
                Transaction.created_at >= start_time,
                Transaction.created_at <= anchor,
            ).count()
            return count
        except Exception as e:
            logger.error(f"Error getting transaction velocity: {e}")
            return 0
