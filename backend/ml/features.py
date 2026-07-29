"""Feature construction for unsupervised anomaly detection.

Two feature families, and the split matters:

**Absolute features** describe a transaction on its own terms (amount,
hour, velocity). They are what the rule scorer already uses.

**Peer-relative (geo) features** describe a transaction *relative to other
merchants in the same region*. These are the ones absolute features cannot
express: N$5,000 average ticket is unremarkable for a Windhoek CBD
retailer and highly unusual for a rural Kavango East vendor. Without a
regional baseline, a model trained on national data learns the urban
distribution and flags every rural merchant as anomalous — the exact
outcome that would make the system useless for financial-inclusion
oversight, which is one of its stated regulatory purposes.

Geography comes from the merchant, not the transaction: transactions carry
no location of their own (see `Transaction` in app/db/models.py), so every
geo feature is derived through the merchant's `region_id` /
`constituency_id` / `local_authority_id` / `lat` / `lng`, populated by the
work recorded in changelog 1.3.0.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import numpy as np
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Merchant, Transaction

logger = logging.getLogger(__name__)

# Order is the contract between training and inference. Appending is safe;
# reordering or removing invalidates every previously trained artifact, so
# any change here requires a new model version.
FEATURE_NAMES: List[str] = [
    # Absolute
    "amount",
    "amount_log",
    "hour_of_day",
    "day_of_week",
    # Ratios against this merchant's own same-weekday history, not raw
    # counts. A raw count teaches the model that busy equals suspicious,
    # which is the same seasonal bias the rule scorer had — and it would be
    # baked into the weights rather than sitting in a threshold anyone can
    # read. See app/services/anomaly_scoring.py::_weekday_baseline.
    "velocity_1h_vs_weekday_peak",
    "velocity_24h_vs_weekday_norm",
    "merchant_avg_amount",
    "merchant_std_amount",
    "amount_vs_merchant_avg",
    # Peer-relative (geo)
    "amount_vs_region_median",
    "velocity_vs_region_median",
    "merchant_region_volume_share",
]


def _safe_ratio(numerator: float, denominator: float) -> float:
    """Ratio that degrades to 1.0 (i.e. "typical") rather than exploding
    when the baseline is missing. A merchant with no history should look
    unremarkable, not infinitely anomalous."""
    if denominator is None or denominator == 0:
        return 1.0
    return float(numerator) / float(denominator)


class RegionBaselines:
    """Per-region medians, computed once per training/scoring pass.

    Computed as medians rather than means because regional transaction
    distributions are heavily right-skewed — a single large settlement in a
    small region would drag a mean baseline far enough to hide exactly the
    anomalies this is meant to surface.
    """

    def __init__(self, db: Session, organization_id):
        self.db = db
        self.organization_id = organization_id
        self._amount_median: Dict[str, float] = {}
        self._velocity_median: Dict[str, float] = {}
        self._region_volume: Dict[str, float] = {}
        self._merchant_region: Dict[str, Optional[str]] = {}
        self._loaded = False

    def load(self) -> None:
        merchants = self.db.query(
            Merchant.id, Merchant.region_id
        ).filter(
            Merchant.organization_id == self.organization_id,
            Merchant.deleted_at.is_(None),
        ).all()
        self._merchant_region = {
            str(m.id): (str(m.region_id) if m.region_id else None) for m in merchants
        }

        rows = self.db.query(
            Merchant.region_id,
            func.percentile_cont(0.5).within_group(Transaction.amount).label("median_amount"),
            func.sum(Transaction.amount).label("total_amount"),
            func.count(Transaction.id).label("txn_count"),
            func.count(func.distinct(Transaction.merchant_id)).label("merchant_count"),
        ).join(
            Transaction, Transaction.merchant_id == Merchant.id
        ).filter(
            Merchant.organization_id == self.organization_id,
            Merchant.deleted_at.is_(None),
        ).group_by(Merchant.region_id).all()

        for r in rows:
            key = str(r.region_id) if r.region_id else "unknown"
            self._amount_median[key] = float(r.median_amount or 0)
            self._region_volume[key] = float(r.total_amount or 0)
            merchant_count = int(r.merchant_count or 0) or 1
            self._velocity_median[key] = float(r.txn_count or 0) / merchant_count

        self._loaded = True

    def _key(self, merchant_id: str) -> str:
        return self._merchant_region.get(str(merchant_id)) or "unknown"

    def amount_median(self, merchant_id: str) -> float:
        return self._amount_median.get(self._key(merchant_id), 0.0)

    def velocity_median(self, merchant_id: str) -> float:
        return self._velocity_median.get(self._key(merchant_id), 0.0)

    def region_volume(self, merchant_id: str) -> float:
        return self._region_volume.get(self._key(merchant_id), 0.0)


def _weekday_median(db: Session, organization_id, merchant_id, weekday: int, grain: str) -> float:
    """Median payments per day (or per hour) for this merchant on this
    weekday. Returns 0 when there is too little history, which `_safe_ratio`
    turns into a neutral 1.0 rather than an infinite spike."""
    bucket = func.date(Transaction.created_at) if grain == "day" else func.date_trunc("hour", Transaction.created_at)
    rows = db.query(bucket.label("b"), func.count(Transaction.id).label("c")).filter(
        Transaction.organization_id == organization_id,
        Transaction.merchant_id == merchant_id,
        func.extract("dow", Transaction.created_at) == (weekday + 1) % 7,
    ).group_by(bucket).all()
    counts = sorted(r.c for r in rows)
    if len(counts) < 4:
        return 0.0
    mid = len(counts) // 2
    return float(counts[mid] if len(counts) % 2 else (counts[mid - 1] + counts[mid]) / 2)


def build_feature_row(
    db: Session,
    organization_id,
    merchant_id,
    amount: float,
    occurred_at: datetime,
    baselines: RegionBaselines,
) -> np.ndarray:
    """Build one feature vector, ordered per FEATURE_NAMES."""
    merchant_txns = db.query(
        func.count(Transaction.id),
        func.avg(Transaction.amount),
        func.stddev_pop(Transaction.amount),
        func.sum(Transaction.amount),
    ).filter(
        Transaction.organization_id == organization_id,
        Transaction.merchant_id == merchant_id,
    ).one()

    _count, avg_amount, std_amount, merchant_volume = merchant_txns
    avg_amount = float(avg_amount or 0)
    std_amount = float(std_amount or 0)
    merchant_volume = float(merchant_volume or 0)

    velocity_1h = db.query(func.count(Transaction.id)).filter(
        Transaction.organization_id == organization_id,
        Transaction.merchant_id == merchant_id,
        Transaction.created_at >= occurred_at - timedelta(hours=1),
        Transaction.created_at <= occurred_at,
    ).scalar() or 0

    velocity_24h = db.query(func.count(Transaction.id)).filter(
        Transaction.organization_id == organization_id,
        Transaction.merchant_id == merchant_id,
        Transaction.created_at >= occurred_at - timedelta(hours=24),
        Transaction.created_at <= occurred_at,
    ).scalar() or 0

    # Same-weekday baselines, so the model sees "three times this merchant's
    # normal Saturday" rather than "sixty payments".
    weekday = occurred_at.weekday()
    weekday_baseline = _weekday_median(db, organization_id, merchant_id, weekday, "day")
    hourly_baseline = _weekday_median(db, organization_id, merchant_id, weekday, "hour")

    region_volume = baselines.region_volume(merchant_id)

    values = {
        "amount": float(amount),
        # log1p because payment amounts span several orders of magnitude;
        # without it the tree splits are dominated by a handful of large
        # settlements.
        "amount_log": float(np.log1p(max(float(amount), 0))),
        "hour_of_day": float(occurred_at.hour),
        "day_of_week": float(occurred_at.weekday()),
        "velocity_1h_vs_weekday_peak": _safe_ratio(velocity_1h, hourly_baseline or 0),
        "velocity_24h_vs_weekday_norm": _safe_ratio(velocity_24h, weekday_baseline or 0),
        "merchant_avg_amount": avg_amount,
        "merchant_std_amount": std_amount,
        "amount_vs_merchant_avg": _safe_ratio(amount, avg_amount),
        "amount_vs_region_median": _safe_ratio(amount, baselines.amount_median(merchant_id)),
        "velocity_vs_region_median": _safe_ratio(
            velocity_24h, baselines.velocity_median(merchant_id)
        ),
        "merchant_region_volume_share": _safe_ratio(merchant_volume, region_volume),
    }

    return np.array([values[name] for name in FEATURE_NAMES], dtype=np.float64)


def build_training_matrix(db: Session, organization_id) -> tuple:
    """Build the full feature matrix from historical transactions.

    Returns `(X, transaction_ids)`. Unsupervised — no labels are read or
    required; IsolationForest learns the shape of normal activity and scores
    deviation from it.
    """
    baselines = RegionBaselines(db, organization_id)
    baselines.load()

    txns = db.query(
        Transaction.id, Transaction.merchant_id, Transaction.amount, Transaction.created_at
    ).filter(
        Transaction.organization_id == organization_id,
        Transaction.deleted_at.is_(None),
    ).order_by(Transaction.created_at).all()

    rows, ids = [], []
    for t in txns:
        rows.append(
            build_feature_row(
                db, organization_id, t.merchant_id, float(t.amount), t.created_at, baselines
            )
        )
        ids.append(str(t.id))

    if not rows:
        return np.empty((0, len(FEATURE_NAMES))), []
    return np.vstack(rows), ids
