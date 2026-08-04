"""The National Payment System indicator set.

Organised around the five strategic themes of the *NPS Vision and Strategy
2030* rather than around our own tables, so a figure produced here maps onto
something the Bank of Namibia already committed to measuring. Where the
strategy names a success indicator, the metric that evidences it says so.

Conventions used throughout, and the reason for each:

- **Per 10,000 adults aged 15 and over**, not per capita. This is the Global
  Findex and IMF Financial Access Survey basis, so a figure here is
  comparable to what Namibia already reports internationally. Denominators
  come from the 2023 census, held in region configuration and reconciled to
  the published national total by tests/test_census_figures.py.
- **Every ratio carries its denominator and its population.** A success rate
  over eleven payments is arithmetic; over eleven thousand it is evidence,
  and the reader is told which.
- **Absent is returned as null, never as zero.** A region with no recorded
  population produces no access-per-capita figure rather than an infinite
  one; an unrecorded instrument is counted separately rather than assumed.
- **Nothing is annualised from a partial period.** Extrapolating a month into
  a year produces a number that looks like a measurement and is a forecast.

What this module does **not** produce: anything evidencing the *Strategic
Foresight and Innovation* theme, or the capacity-building half of *Knowledge
Communities*. Those are institutional programmes — policy positions, training
curricula, sandbox participation — and no amount of payment data evidences
them. Claiming otherwise would be the most damaging thing in a return.
"""

import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import numpy as np
from sqlalchemy.orm import Session

from app.data.payment_repository import PaymentRepository
from app.db.helpers import get_or_create_organization
from app.db.models import (
    AnomalyAlert,
    Merchant,
    Transaction,
)

logger = logging.getLogger(__name__)

# The IMF Financial Access Survey reporting basis.
PER_ADULTS = 10_000

# Below this, a rate is arithmetic rather than evidence. Reported alongside
# every figure so a reader can discount it without having to ask.
MIN_OBSERVATIONS = 30

# The seven use cases enabled at go-live, per the Instant Payment Programme
# stakeholder pack. Kept here so a return can state coverage of the enabled
# set rather than of whatever happens to be in the data.
GO_LIVE_USE_CASES = [
    "p2p", "p2b", "b2p", "g2p",
    "cash_in_merchant", "cash_out_merchant", "atm_withdrawal",
]


def _rate(numerator: float, denominator: float, places: int = 2) -> Optional[float]:
    """A rate, or None when there is nothing to divide by."""
    if not denominator:
        return None
    return round((numerator / denominator) * 100, places)


class NpsMetricsService:
    """The indicator set, grouped by strategic theme."""

    def __init__(self, db: Session, repository: Optional[PaymentRepository] = None):
        self.db = db
        self.organization = get_or_create_organization(db)
        # Injected so a caller assembling several metrics can share one
        # repository, and so the read layer can be substituted in a test
        # without a database.
        self.repo = repository or PaymentRepository(db, self.organization.id)

    # -- shared loads -----------------------------------------------------

    def _regions(self) -> Dict[str, Dict]:
        return self.repo.regions()

    def _transactions(self, days: int) -> List[Transaction]:
        return self.repo.transactions(days)

    def _merchants(self) -> List[Merchant]:
        return self.repo.merchants()

    # -- theme: Digital Enablement ---------------------------------------

    def adoption(self, days: int = 90) -> Dict:
        """Usage growth by use case.

        Evidences: "Deepened digital payment adoption, evidenced by sustained
        year-on-year growth in digital payment usage."

        Growth is measured against the immediately preceding window of equal
        length rather than year-on-year, and the response says so. A platform
        that has not been running a year cannot report year-on-year, and
        labelling a 90-day comparison as annual would be false.
        """
        try:
            now = datetime.utcnow()
            current = self._transactions(days)
            prior = self.db.query(Transaction).filter(
                Transaction.organization_id == self.organization.id,
                Transaction.deleted_at.is_(None),
                Transaction.created_at >= now - timedelta(days=days * 2),
                Transaction.created_at < now - timedelta(days=days),
            ).all()

            def summarise(rows: List[Transaction]) -> Dict[str, Dict[str, float]]:
                out: Dict[str, Dict[str, float]] = defaultdict(
                    lambda: {"count": 0, "value": 0.0}
                )
                for t in rows:
                    out[t.payment_type or "unrecorded"]["count"] += 1
                    out[t.payment_type or "unrecorded"]["value"] += float(t.amount or 0)
                return out

            now_by_type = summarise(current)
            was_by_type = summarise(prior)

            by_use_case = []
            for code in GO_LIVE_USE_CASES:
                c = now_by_type.get(code, {"count": 0, "value": 0.0})
                p = was_by_type.get(code, {"count": 0, "value": 0.0})
                by_use_case.append({
                    "useCase": code,
                    "count": int(c["count"]),
                    "value": round(c["value"], 2),
                    # None, not zero: with no prior activity there is no
                    # growth rate, and 0% would read as "flat".
                    "countGrowthPct": (
                        round(((c["count"] - p["count"]) / p["count"]) * 100, 2)
                        if p["count"] else None
                    ),
                    "valueGrowthPct": (
                        round(((c["value"] - p["value"]) / p["value"]) * 100, 2)
                        if p["value"] else None
                    ),
                    "carriedInPeriod": c["count"] > 0,
                })

            unexpected = sorted(set(now_by_type) - set(GO_LIVE_USE_CASES))

            return {
                "status": "ok",
                "theme": "Digital Enablement",
                "indicator": "Sustained year-on-year growth in digital payment usage",
                "comparisonBasis": f"preceding {days} days, not year-on-year",
                "observationDays": days,
                "transactions": len(current),
                "value": round(sum(float(t.amount or 0) for t in current), 2),
                "currencyCode": "NAD",
                "priorTransactions": len(prior),
                "overallCountGrowthPct": (
                    round(((len(current) - len(prior)) / len(prior)) * 100, 2)
                    if prior else None
                ),
                "byUseCase": by_use_case,
                "useCasesCarrying": sum(1 for u in by_use_case if u["carriedInPeriod"]),
                "useCasesEnabled": len(GO_LIVE_USE_CASES),
                # Payment types outside the go-live set. Their presence is a
                # data-quality signal, not an adoption one.
                "unexpectedUseCases": unexpected,
                "belowEvidenceFloor": len(current) < MIN_OBSERVATIONS,
            }
        except Exception as e:
            logger.error(f"Error computing adoption: {e}")
            return {"status": "error", "detail": "Could not compute adoption."}

    def access(self) -> Dict:
        """Access points per 10,000 adults, by region.

        Evidences the inclusion half of Digital Enablement, and is the
        measure that makes regions comparable. "142 businesses in Khomas"
        against "31 in Omaheke" says nothing until both carry a denominator.

        An access point here is an **active acceptance point**: a business in
        `active` status, i.e. a place a person can actually pay digitally or
        take cash out. This is the Global Findex / IMF Financial Access Survey
        sense of the term, which is what makes the figure comparable with what
        Namibia already reports internationally.

        Two things it deliberately is not. It is not every registered
        business: one still `pending_kyc` or `suspended` cannot accept a
        payment, and counting it would overstate reach. And it is not a count
        of terminals — a business is reachable or it is not, and counting
        equipment would measure our own estate rather than the country's
        acceptance footprint.
        """
        try:
            regions = self._regions()
            merchants = self._merchants()

            points_by_region: Dict[str, int] = defaultdict(int)
            for m in merchants:
                if m.status == "active" and m.region_id:
                    points_by_region[str(m.region_id)] += 1

            rows = []
            for region_id, meta in regions.items():
                points = points_by_region.get(region_id, 0)
                adults = meta.get("adults")
                rows.append({
                    "region": meta["label"],
                    "accessPoints": points,
                    "adults": adults,
                    # None where population is unrecorded: an absent
                    # denominator must not become an infinite rate.
                    "perTenThousandAdults": (
                        round((points / adults) * PER_ADULTS, 2) if adults else None
                    ),
                    "hasAccess": points > 0,
                })
            rows.sort(key=lambda r: (r["perTenThousandAdults"] or -1), reverse=True)

            total_points = sum(points_by_region.values())
            total_adults = sum(m["adults"] or 0 for m in regions.values())

            return {
                "status": "ok",
                "theme": "Digital Enablement",
                "indicator": "Access to digital payment acceptance",
                "basis": f"active acceptance points per {PER_ADULTS:,} adults aged 15 and over",
                "populationSource": "Namibia Population and Housing Census 2023 (NSA), main report 30 October 2024",
                "accessPoints": total_points,
                "nationalPerTenThousandAdults": (
                    round((total_points / total_adults) * PER_ADULTS, 2) if total_adults else None
                ),
                "regionsWithAccess": sum(1 for r in rows if r["hasAccess"]),
                "regionsTotal": len(rows),
                "regionsWithoutAccess": [r["region"] for r in rows if not r["hasAccess"]],
                "byRegion": rows,
                "belowEvidenceFloor": total_points < MIN_OBSERVATIONS,
            }
        except Exception as e:
            logger.error(f"Error computing access: {e}")
            return {"status": "error", "detail": "Could not compute access."}

    def interoperability(self, days: int = 90) -> Dict:
        """Coverage across instruments and use cases.

        Evidences: "interoperability coverage" under Foster Co-opetition.

        Measured as the share of payments where a wallet-funded payer paid a
        business — the cross-instrument case interoperability exists to
        enable. Payments with no recorded instrument are excluded from the
        basis rather than assumed to be one or the other.
        """
        try:
            txns = self._transactions(days)
            if not txns:
                return {"status": "no_data", "observationDays": days,
                        "detail": "No payments in this window."}

            with_instrument = [t for t in txns if t.payer_instrument]
            wallet_funded = [t for t in with_instrument if t.payer_instrument == "wallet"]
            cross = [t for t in wallet_funded if t.payment_type in
                     ("p2b", "cash_in_merchant", "cash_out_merchant")]

            use_cases_seen = {t.payment_type for t in txns if t.payment_type}
            covered = [c for c in GO_LIVE_USE_CASES if c in use_cases_seen]

            return {
                "status": "ok",
                "theme": "Knowledge Communities",
                "indicator": "Interoperability coverage",
                "observationDays": days,
                "transactions": len(txns),
                "instrumentRecorded": len(with_instrument),
                "instrumentNotRecorded": len(txns) - len(with_instrument),
                "walletFundedPct": _rate(len(wallet_funded), len(with_instrument)),
                "crossInstrumentPct": _rate(len(cross), len(with_instrument)),
                "useCasesCovered": covered,
                "useCaseCoveragePct": _rate(len(covered), len(GO_LIVE_USE_CASES)),
                "belowEvidenceFloor": len(with_instrument) < MIN_OBSERVATIONS,
            }
        except Exception as e:
            logger.error(f"Error computing interoperability: {e}")
            return {"status": "error", "detail": "Could not compute interoperability."}

    # -- theme: Trust and Resilience --------------------------------------

    def resilience(self, days: int = 30) -> Dict:
        """Availability and straight-through processing.

        Evidences: "Streamline and always-on payment capabilities" and the
        strategy's stated aim to "improve end-to-end straight-through
        processing of payments".

        Straight-through processing is measured as the share of payments that
        reached success with no status reversal and no manual intervention.
        """
        try:
            txns = self._transactions(days)
            if not txns:
                return {"status": "no_data", "observationDays": days,
                        "detail": "No payments in this window."}

            successful = [t for t in txns if t.status == "success"]
            confirmed = [t for t in successful if t.verified_at]

            # Straight-through: confirmed, and confirmed quickly enough that
            # nothing intervened. A payment that took minutes was waiting on
            # something.
            stp = [
                t for t in confirmed
                if t.created_at and (t.verified_at - t.created_at).total_seconds() <= 60
            ]

            by_day: Dict[str, List[Transaction]] = defaultdict(list)
            for t in txns:
                by_day[t.created_at.strftime("%Y-%m-%d")].append(t)
            day_rates = [
                (sum(1 for t in rows if t.status == "success") / len(rows)) * 100
                for rows in by_day.values() if len(rows) >= 10
            ]

            return {
                "status": "ok",
                "theme": "Trust and Resilience",
                "indicator": "Always-on payment capability and straight-through processing",
                "observationDays": days,
                "transactions": len(txns),
                "successRatePct": _rate(len(successful), len(txns)),
                "straightThroughPct": _rate(len(stp), len(successful)),
                "straightThroughBasis": len(successful),
                # The floor across days with enough traffic to judge. A
                # monthly average can hide a day on which nothing worked.
                "worstDayRatePct": round(min(day_rates), 2) if day_rates else None,
                "daysMeasured": len(day_rates),
                "belowEvidenceFloor": len(txns) < MIN_OBSERVATIONS,
            }
        except Exception as e:
            logger.error(f"Error computing resilience: {e}")
            return {"status": "error", "detail": "Could not compute resilience."}

    def integrity(self, days: int = 90) -> Dict:
        """Anomaly and confirmed-fraud incidence.

        Evidences: "Sustained year-on-year reduction in payment fraud
        incidents", with an important qualification stated in the response.

        **The alert rate is not a fraud rate.** Alerts are payments a person
        was asked to look at. Only reviewer verdicts produce confirmed cases,
        and until enough have accumulated the confirmed rate rests on a small
        base. Both are returned, separately, because reporting the first as
        the second is the easiest way to mislead a supervisor with true
        numbers.
        """
        try:
            since = datetime.utcnow() - timedelta(days=days)
            txns = self._transactions(days)
            alerts = self.db.query(AnomalyAlert).filter(
                AnomalyAlert.organization_id == self.organization.id,
                AnomalyAlert.deleted_at.is_(None),
                AnomalyAlert.detected_at >= since,
            ).all()

            confirmed = [a for a in alerts if a.status == "escalated"]
            dismissed = [a for a in alerts if a.status == "resolved"]
            reviewed = confirmed + dismissed
            open_alerts = [a for a in alerts if a.status in ("open", "under_review")]

            exposure = sum(float(a.expected_loss or 0) for a in open_alerts)

            return {
                "status": "ok",
                "theme": "Trust and Resilience",
                "indicator": "Reduction in payment fraud incidents",
                "observationDays": days,
                "transactions": len(txns),
                "alertsRaised": len(alerts),
                "alertsPerTenThousandPayments": (
                    round((len(alerts) / len(txns)) * 10_000, 2) if txns else None
                ),
                "alertsReviewed": len(reviewed),
                "reviewCompletionPct": _rate(len(reviewed), len(alerts)),
                "confirmedFraud": len(confirmed),
                # Only meaningful once reviewers have worked the queue.
                "confirmedFraudPerTenThousandPayments": (
                    round((len(confirmed) / len(txns)) * 10_000, 2) if txns else None
                ),
                "falsePositivePct": _rate(len(dismissed), len(reviewed)) if reviewed else None,
                "openExposure": round(exposure, 2),
                "currencyCode": "NAD",
                "caveat": (
                    "The alert rate counts payments a person was asked to examine, "
                    "not confirmed fraud. Only reviewer verdicts confirm a case, and "
                    "the confirmed rate rests on however many have been worked."
                ),
                "belowEvidenceFloor": len(reviewed) < MIN_OBSERVATIONS,
            }
        except Exception as e:
            logger.error(f"Error computing integrity: {e}")
            return {"status": "error", "detail": "Could not compute integrity metrics."}

    # -- theme: User-Centricity -------------------------------------------

    def user_impact(self, days: int = 90) -> Dict:
        """Whether people are actually using this, and continuing to.

        Evidences: "Sustained growth in active digital payment usage across
        user segments, supported by enhanced trust, safety, and confidence."

        Trust is not directly measurable from payment data and no proxy for
        it is invented here. What is measurable is *repeat* behaviour, which
        is the closest honest signal: a business that keeps accepting, and a
        payer who comes back, has revealed a preference.
        """
        try:
            txns = self._transactions(days)
            if not txns:
                return {"status": "no_data", "observationDays": days,
                        "detail": "No payments in this window."}

            active_merchants = {str(t.merchant_id) for t in txns}
            approved = [m for m in self._merchants() if m.status == "active"]

            # Repeat payers, where the rails gave us an alias to count by.
            payer_counts: Dict[str, int] = defaultdict(int)
            for t in txns:
                alias = (t.payer_info or {}).get("alias")
                if alias:
                    payer_counts[str(alias)] += 1
            identified = sum(payer_counts.values())
            repeat = sum(v for v in payer_counts.values() if v > 1)

            per_merchant = [
                sum(1 for t in txns if str(t.merchant_id) == mid)
                for mid in active_merchants
            ]

            return {
                "status": "ok",
                "theme": "User-Centricity",
                "indicator": "Active digital payment usage across user segments",
                "observationDays": days,
                "activeBusinesses": len(active_merchants),
                "approvedBusinesses": len(approved),
                "activeSharePct": _rate(len(active_merchants), len(approved)),
                "medianPaymentsPerActiveBusiness": (
                    round(float(np.median(per_merchant)), 1) if per_merchant else None
                ),
                "distinctPayersIdentified": len(payer_counts),
                "repeatPayerPct": _rate(repeat, identified) if identified else None,
                "repeatPayerBasis": identified,
                "payerAliasCoveragePct": _rate(identified, len(txns)),
                "note": (
                    "Trust and confidence are not measurable from payment data. "
                    "Repeat use is the closest honest signal and is what is "
                    "reported; the survey work the strategy calls for is the "
                    "instrument for the rest."
                ),
                "belowEvidenceFloor": len(txns) < MIN_OBSERVATIONS,
            }
        except Exception as e:
            logger.error(f"Error computing user impact: {e}")
            return {"status": "error", "detail": "Could not compute user impact."}

    # -- the whole set ----------------------------------------------------

    # The assembled, cross-theme report lives in nps_dashboard.py. It draws
    # on this service and on MarketAnalyticsService, and neither knows about
    # the other — a service computing one theme should not have to know which
    # module happens to hold the rest.
