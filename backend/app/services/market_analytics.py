"""Market-structure and inclusion metrics, for oversight rather than operations.

The existing analytics answer operational questions: how many payments, how
many succeeded, where are they. Those are necessary and they are not what a
central bank's payment system department actually asks. This module carries
the measures that are standard in that setting and were absent here:

- **Concentration** (HHI). Whether the rails depend on a few participants is
  a systemic question, and the Herfindahl-Hirschman Index is the measure
  competition and payment authorities already use, so a number reported here
  is comparable to numbers they hold from elsewhere.
- **Distribution, not averages.** A mean ticket size across market stalls and
  fuel stations describes neither. Median, p90 and a Gini coefficient say how
  value is actually spread.
- **Inclusion**, measured as first-time acceptance and wallet reliance —
  the programme's stated purpose, which nothing was measuring.
- **Retention by cohort.** Whether a business is still trading three months
  after it was onboarded is the honest test of adoption; cumulative merchant
  counts hide churn entirely.
- **Availability.** Success rate alone hides a bad hour inside a good month.
  Worst-day and worst-hour figures are what an operator is held to.

Every metric returns the population it was computed over. A ratio without a
denominator is not reportable, and several of these will be computed on thin
data for some time.
"""

import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import numpy as np
from sqlalchemy.orm import Session

from app.data.payment_repository import PaymentRepository
from app.db.helpers import get_or_create_organization
from app.db.models import Merchant, Transaction

logger = logging.getLogger(__name__)

# Below this a ratio is arithmetic rather than evidence. Returned alongside
# every figure so a reader can discount it themselves.
MIN_OBSERVATIONS = 30


def _gini(values: np.ndarray) -> Optional[float]:
    """Gini coefficient of a value distribution.

    0 means every business takes the same share; 1 means one takes
    everything. Reported because "the top three merchants" depends on how
    many merchants exist, while Gini does not — it stays comparable as the
    network grows, which a top-N share does not.
    """
    if values.size < 2:
        return None
    v = np.sort(np.clip(values, 0, None))
    total = v.sum()
    if total <= 0:
        return None
    n = v.size
    index = np.arange(1, n + 1)
    return float((2 * (index * v).sum()) / (n * total) - (n + 1) / n)


def _hhi(shares: List[float]) -> Optional[float]:
    """Herfindahl-Hirschman Index over percentage shares.

    Scaled 0-10,000 as competition authorities use it, so the conventional
    reading applies directly: under 1,500 unconcentrated, 1,500-2,500
    moderately concentrated, above 2,500 highly concentrated.
    """
    if not shares:
        return None
    return float(sum(s ** 2 for s in shares))


class MarketAnalyticsService:
    """Oversight metrics. Read-only, like everything else here."""

    def __init__(self, db: Session, repository: Optional[PaymentRepository] = None):
        self.db = db
        self.organization = get_or_create_organization(db)
        # Injected so a caller assembling several metrics can share one
        # repository, and so the read layer can be substituted in a test
        # without a database.
        self.repo = repository or PaymentRepository(db, self.organization.id)

    def _region_labels(self) -> Dict[str, str]:
        return self.repo.region_labels()

    def _transactions(self, days: int) -> List[Transaction]:
        return self.repo.transactions(days)

    # -- concentration ----------------------------------------------------

    def get_concentration(self, days: int = 90) -> Dict:
        """How concentrated the rails are, by business and by region.

        Two HHIs because they answer different questions. Merchant
        concentration says whether volume depends on a few businesses;
        regional concentration says whether it depends on one part of the
        country. A national programme can look healthy on the first and
        fail on the second.
        """
        try:
            # Aggregated in Postgres, not here. This window is 90 days of
            # every payment on the WayaMe rails; the grouped result is one row
            # per business, which is the only thing this method ever needed.
            totals = self.repo.totals(days)
            if not totals["count"]:
                return {
                    "status": "no_data",
                    "observationDays": days,
                    "detail": "No payments in this window.",
                }

            total_value = totals["value"]
            if total_value <= 0:
                return {"status": "no_data", "observationDays": days,
                        "detail": "No settled value in this window."}

            by_merchant: Dict[str, float] = self.repo.value_by_merchant(days)
            txn_count = totals["count"]

            merchant_shares = [(v / total_value) * 100 for v in by_merchant.values()]
            merchant_shares.sort(reverse=True)

            merchants = {
                str(m.id): m for m in self.db.query(Merchant).filter(
                    Merchant.organization_id == self.organization.id,
                    Merchant.deleted_at.is_(None),
                ).all()
            }
            regions = self._region_labels()

            by_region: Dict[str, float] = defaultdict(float)
            for merchant_id, value in by_merchant.items():
                m = merchants.get(merchant_id)
                label = regions.get(str(m.region_id)) if m and m.region_id else "Unrecorded"
                by_region[label] += value
            region_shares = [(v / total_value) * 100 for v in by_region.values()]

            hhi_merchant = _hhi(merchant_shares)
            band = (
                "unconcentrated" if hhi_merchant is not None and hhi_merchant < 1500
                else "moderately concentrated" if hhi_merchant is not None and hhi_merchant < 2500
                else "highly concentrated"
            )

            return {
                "status": "ok",
                "observationDays": days,
                "merchants": len(by_merchant),
                "transactions": txn_count,
                "totalValue": round(total_value, 2),
                "currencyCode": "NAD",
                "merchantHhi": round(hhi_merchant, 1) if hhi_merchant is not None else None,
                "merchantConcentrationBand": band,
                "regionHhi": round(_hhi(region_shares), 1) if region_shares else None,
                "top3MerchantShare": round(sum(merchant_shares[:3]), 2),
                "top10MerchantShare": round(sum(merchant_shares[:10]), 2),
                "valueGini": (lambda g: round(g, 4) if g is not None else None)(
                    _gini(np.array(list(by_merchant.values())))
                ),
                "regionShares": sorted(
                    [{"region": k, "sharePct": round((v / total_value) * 100, 2),
                      "value": round(v, 2)} for k, v in by_region.items()],
                    key=lambda r: r["sharePct"], reverse=True,
                ),
                "belowEvidenceFloor": txn_count < MIN_OBSERVATIONS,
            }
        except Exception as e:
            logger.error(f"Error computing concentration: {e}")
            return {"status": "error", "detail": "Could not compute concentration."}

    # -- value distribution ----------------------------------------------

    def get_value_distribution(self, days: int = 90) -> Dict:
        """Where payment values actually sit.

        Percentiles rather than a mean. On these rails the mean sits between
        two populations that both exist and neither of which it describes.
        """
        try:
            txns = self._transactions(days)
            amounts = np.array([float(t.amount or 0) for t in txns], dtype=float)
            if amounts.size == 0:
                return {"status": "no_data", "observationDays": days,
                        "detail": "No payments in this window."}

            buckets = [(0, 20), (20, 50), (50, 100), (100, 500), (500, 2000), (2000, None)]
            histogram = []
            for lo, hi in buckets:
                count = int(((amounts >= lo) & (amounts < hi)).sum()) if hi else int((amounts >= lo).sum())
                histogram.append({
                    "label": f"N${lo:,.0f}-{hi:,.0f}" if hi else f"N${lo:,.0f}+",
                    "from": lo,
                    "to": hi,
                    "count": count,
                    "sharePct": round((count / amounts.size) * 100, 2),
                })

            return {
                "status": "ok",
                "observationDays": days,
                "transactions": int(amounts.size),
                "currencyCode": "NAD",
                "min": round(float(amounts.min()), 2),
                "p25": round(float(np.percentile(amounts, 25)), 2),
                "median": round(float(np.median(amounts)), 2),
                "p75": round(float(np.percentile(amounts, 75)), 2),
                "p90": round(float(np.percentile(amounts, 90)), 2),
                "p99": round(float(np.percentile(amounts, 99)), 2),
                "max": round(float(amounts.max()), 2),
                "mean": round(float(amounts.mean()), 2),
                # Stated so nobody quotes the mean without seeing the gap.
                "meanExceedsMedianBy": round(float(amounts.mean() - np.median(amounts)), 2),
                "histogram": histogram,
                "belowEvidenceFloor": int(amounts.size) < MIN_OBSERVATIONS,
            }
        except Exception as e:
            logger.error(f"Error computing value distribution: {e}")
            return {"status": "error", "detail": "Could not compute distribution."}

    # -- inclusion --------------------------------------------------------

    def get_inclusion_metrics(self, days: int = 90) -> Dict:
        """Progress against the reason this programme exists.

        Wallet reliance is the closest available proxy for acceptance by
        people without a bank account. Payments whose instrument was not
        recorded are counted separately and never folded into either side —
        a gap in the data must not read as a finding in one direction.
        """
        try:
            txns = self._transactions(days)
            if not txns:
                return {"status": "no_data", "observationDays": days,
                        "detail": "No payments in this window."}

            wallet = sum(1 for t in txns if (t.payer_instrument or "") == "wallet")
            bank = sum(1 for t in txns if (t.payer_instrument or "") == "bank")
            unknown = len(txns) - wallet - bank
            known = wallet + bank

            since = datetime.utcnow() - timedelta(days=days)
            newly_active = self.db.query(Merchant).filter(
                Merchant.organization_id == self.organization.id,
                Merchant.deleted_at.is_(None),
                Merchant.created_at >= since,
            ).count()

            accepting = len({str(t.merchant_id) for t in txns})
            registered = self.db.query(Merchant).filter(
                Merchant.organization_id == self.organization.id,
                Merchant.deleted_at.is_(None),
                Merchant.status == "active",
            ).count()

            regions = self._region_labels()
            covered = {
                str(m.region_id) for m in self.db.query(Merchant).filter(
                    Merchant.organization_id == self.organization.id,
                    Merchant.deleted_at.is_(None),
                    Merchant.region_id.isnot(None),
                ).all()
            }
            uncovered = [label for rid, label in regions.items() if rid not in covered]

            return {
                "status": "ok",
                "observationDays": days,
                "walletPayments": wallet,
                "bankPayments": bank,
                # Reported, never redistributed.
                "instrumentNotRecorded": unknown,
                "walletSharePct": round((wallet / known) * 100, 2) if known else None,
                "walletShareBasis": known,
                "businessesRegistered": registered,
                "businessesAccepting": accepting,
                "acceptanceRatePct": round((accepting / registered) * 100, 2) if registered else None,
                "businessesOnboardedInWindow": newly_active,
                "regionsWithNoBusiness": sorted(uncovered),
                "regionsCovered": len(covered),
                "regionsTotal": len(regions),
                "belowEvidenceFloor": len(txns) < MIN_OBSERVATIONS,
            }
        except Exception as e:
            logger.error(f"Error computing inclusion metrics: {e}")
            return {"status": "error", "detail": "Could not compute inclusion metrics."}

    # -- retention --------------------------------------------------------

    def get_cohort_retention(self, months: int = 6) -> Dict:
        """Are businesses still trading after they onboard?

        Grouped by the month they were registered, then measured month by
        month afterwards. A cumulative merchant count only ever rises and so
        cannot show churn; this can, which is why adoption claims should rest
        on it instead.
        """
        try:
            since = datetime.utcnow() - timedelta(days=months * 31)
            merchants = self.db.query(Merchant).filter(
                Merchant.organization_id == self.organization.id,
                Merchant.deleted_at.is_(None),
                Merchant.created_at >= since,
            ).all()
            if not merchants:
                return {"status": "no_data", "months": months,
                        "detail": "No businesses onboarded in this window."}

            txns = self.db.query(Transaction).filter(
                Transaction.organization_id == self.organization.id,
                Transaction.deleted_at.is_(None),
                Transaction.created_at >= since,
            ).all()

            active_months: Dict[str, set] = defaultdict(set)
            for t in txns:
                active_months[str(t.merchant_id)].add(t.created_at.strftime("%Y-%m"))

            cohorts: Dict[str, List[Merchant]] = defaultdict(list)
            for m in merchants:
                cohorts[m.created_at.strftime("%Y-%m")].append(m)

            def month_offset(start: str, offset: int) -> str:
                year, month = int(start[:4]), int(start[5:7])
                total = (year * 12 + month - 1) + offset
                return f"{total // 12:04d}-{total % 12 + 1:02d}"

            now_month = datetime.utcnow().strftime("%Y-%m")
            rows = []
            for cohort_month in sorted(cohorts):
                members = cohorts[cohort_month]
                periods = []
                for offset in range(0, months):
                    target = month_offset(cohort_month, offset)
                    if target > now_month:
                        break
                    retained = sum(1 for m in members if target in active_months.get(str(m.id), set()))
                    periods.append({
                        "monthOffset": offset,
                        "month": target,
                        "active": retained,
                        "retentionPct": round((retained / len(members)) * 100, 2),
                    })
                rows.append({
                    "cohort": cohort_month,
                    "size": len(members),
                    "periods": periods,
                })

            return {
                "status": "ok",
                "months": months,
                "cohorts": rows,
                "belowEvidenceFloor": len(merchants) < MIN_OBSERVATIONS,
            }
        except Exception as e:
            logger.error(f"Error computing cohort retention: {e}")
            return {"status": "error", "detail": "Could not compute retention."}

    # -- availability -----------------------------------------------------

    def get_availability(self, days: int = 30) -> Dict:
        """Reliability as an operator is actually held to it.

        A monthly success rate can hide a day on which nothing worked. The
        worst day and worst hour are reported alongside the aggregate,
        because those are the periods a trader remembers and a supervisor
        asks about.
        """
        try:
            txns = self._transactions(days)
            if not txns:
                return {"status": "no_data", "observationDays": days,
                        "detail": "No payments in this window."}

            def rate(rows) -> float:
                if not rows:
                    return 0.0
                return sum(1 for t in rows if t.status == "success") / len(rows) * 100

            by_day: Dict[str, list] = defaultdict(list)
            by_hour: Dict[str, list] = defaultdict(list)
            for t in txns:
                by_day[t.created_at.strftime("%Y-%m-%d")].append(t)
                by_hour[t.created_at.strftime("%Y-%m-%d %H:00")].append(t)

            # Only periods with enough traffic to mean something. One failed
            # payment in an hour that saw two is not an outage.
            day_rates = [(d, rate(r), len(r)) for d, r in by_day.items() if len(r) >= 10]
            hour_rates = [(h, rate(r), len(r)) for h, r in by_hour.items() if len(r) >= 10]

            failures: Dict[str, int] = defaultdict(int)
            for t in txns:
                if t.status != "success":
                    failures[t.status or "unknown"] += 1

            latencies = [t.response_time_ms for t in txns if t.response_time_ms]

            worst_day = min(day_rates, key=lambda r: r[1]) if day_rates else None
            worst_hour = min(hour_rates, key=lambda r: r[1]) if hour_rates else None

            return {
                "status": "ok",
                "observationDays": days,
                "transactions": len(txns),
                "successRatePct": round(rate(txns), 2),
                "worstDay": {
                    "date": worst_day[0], "successRatePct": round(worst_day[1], 2),
                    "transactions": worst_day[2],
                } if worst_day else None,
                "worstHour": {
                    "hour": worst_hour[0], "successRatePct": round(worst_hour[1], 2),
                    "transactions": worst_hour[2],
                } if worst_hour else None,
                "daysMeasured": len(day_rates),
                "failuresByStatus": [
                    {"status": k, "count": v} for k, v in
                    sorted(failures.items(), key=lambda kv: kv[1], reverse=True)
                ],
                "medianResponseMs": round(float(np.median(latencies)), 1) if latencies else None,
                "p95ResponseMs": round(float(np.percentile(latencies, 95)), 1) if latencies else None,
                "responseTimeBasis": len(latencies),
                "belowEvidenceFloor": len(txns) < MIN_OBSERVATIONS,
            }
        except Exception as e:
            logger.error(f"Error computing availability: {e}")
            return {"status": "error", "detail": "Could not compute availability."}

    # -- settlement lag ---------------------------------------------------

    def get_settlement_lag(self, days: int = 30) -> Dict:
        """How long money takes to reach a business, at each stage.

        `settled_at` was written on every row and read by nothing, so the
        single figure the payee actually cares about — when the money is
        theirs — was uncollected.

        Two distinct intervals, and conflating them is the usual mistake:

        - **Confirmation lag** (`created_at` to `verified_at`) is what the
          seller waits at the counter. Seconds matter; this is the number the
          SoundBox exists to shorten the *perception* of.
        - **Settlement lag** (`verified_at` to `settled_at`) is interbank net
          settlement, which happens later in cycles. The payee is credited in
          real time and settlement follows; a seller is not waiting on this,
          and reporting it as though they were would misstate the experience.
        """
        try:
            txns = [t for t in self._transactions(days) if t.status == "success"]
            if not txns:
                return {"status": "no_data", "observationDays": days,
                        "detail": "No settled payments in this window."}

            confirm = np.array([
                (t.verified_at - t.created_at).total_seconds()
                for t in txns if t.verified_at and t.created_at
            ], dtype=float)
            settle = np.array([
                (t.settled_at - t.verified_at).total_seconds() / 3600.0
                for t in txns if t.settled_at and t.verified_at
            ], dtype=float)

            unsettled = sum(1 for t in txns if not t.settled_at)

            def stats(arr: np.ndarray, unit: str) -> Optional[Dict]:
                if arr.size == 0:
                    return None
                return {
                    "unit": unit,
                    "median": round(float(np.median(arr)), 2),
                    "p90": round(float(np.percentile(arr, 90)), 2),
                    "p99": round(float(np.percentile(arr, 99)), 2),
                    "max": round(float(arr.max()), 2),
                    "basis": int(arr.size),
                }

            return {
                "status": "ok",
                "observationDays": days,
                "successfulPayments": len(txns),
                "confirmation": stats(confirm, "seconds"),
                "settlement": stats(settle, "hours"),
                "awaitingSettlement": unsettled,
                "awaitingSettlementPct": round((unsettled / len(txns)) * 100, 2),
                # Named so the two are never read as one number.
                "note": (
                    "Confirmation is what the seller waits at the counter. "
                    "Settlement is the interbank cycle that follows; the payee "
                    "is credited before it completes."
                ),
                "belowEvidenceFloor": len(txns) < MIN_OBSERVATIONS,
            }
        except Exception as e:
            logger.error(f"Error computing settlement lag: {e}")
            return {"status": "error", "detail": "Could not compute settlement lag."}

    # -- cash flow at agents ----------------------------------------------

    def get_cash_flow(self, days: int = 30) -> Dict:
        """Net cash demand at agent points.

        Cash-in and cash-out at a merchant are two of the seven go-live use
        cases, and together they say something neither says alone: whether an
        agent is accumulating cash or running out of it.

        This is an operational constraint, not a statistic. An agent whose
        withdrawals persistently exceed deposits runs dry and stops serving —
        which looks, in a coverage map, exactly like a region that was never
        reached.
        """
        try:
            txns = self._transactions(days)
            cash_in = [t for t in txns if t.payment_type == "cash_in_merchant"]
            cash_out = [t for t in txns if t.payment_type == "cash_out_merchant"]
            atm = [t for t in txns if t.payment_type == "atm_withdrawal"]

            if not (cash_in or cash_out or atm):
                return {"status": "no_data", "observationDays": days,
                        "detail": "No cash-in or cash-out activity in this window."}

            in_value = sum(float(t.amount or 0) for t in cash_in)
            out_value = sum(float(t.amount or 0) for t in cash_out)
            atm_value = sum(float(t.amount or 0) for t in atm)

            by_merchant: Dict[str, Dict[str, float]] = defaultdict(
                lambda: {"cashIn": 0.0, "cashOut": 0.0}
            )
            for t in cash_in:
                by_merchant[str(t.merchant_id)]["cashIn"] += float(t.amount or 0)
            for t in cash_out:
                by_merchant[str(t.merchant_id)]["cashOut"] += float(t.amount or 0)

            names = {
                str(m.id): (m.trading_name or m.legal_name)
                for m in self.db.query(Merchant).filter(
                    Merchant.organization_id == self.organization.id,
                    Merchant.deleted_at.is_(None),
                ).all()
            }

            agents = []
            for merchant_id, flow in by_merchant.items():
                net = flow["cashIn"] - flow["cashOut"]
                agents.append({
                    "merchantId": merchant_id,
                    "displayName": names.get(merchant_id, "Unknown"),
                    "cashIn": round(flow["cashIn"], 2),
                    "cashOut": round(flow["cashOut"], 2),
                    "netCashPosition": round(net, 2),
                    # Negative net means the agent is paying out more than it
                    # takes in, and will need replenishing.
                    "drawingDown": net < 0,
                })
            agents.sort(key=lambda a: a["netCashPosition"])

            return {
                "status": "ok",
                "observationDays": days,
                "currencyCode": "NAD",
                "cashInValue": round(in_value, 2),
                "cashOutAtMerchantValue": round(out_value, 2),
                "atmWithdrawalValue": round(atm_value, 2),
                "netAtAgents": round(in_value - out_value, 2),
                "agentsDrawingDown": sum(1 for a in agents if a["drawingDown"]),
                "agentsMeasured": len(agents),
                # Most negative first: these are the ones that will run dry.
                "agents": agents[:20],
                "belowEvidenceFloor": len(cash_in) + len(cash_out) < MIN_OBSERVATIONS,
            }
        except Exception as e:
            logger.error(f"Error computing cash flow: {e}")
            return {"status": "error", "detail": "Could not compute cash flow."}

    # -- activation and dormancy ------------------------------------------

    def get_activation_and_dormancy(self, dormant_after_days: int = 30) -> Dict:
        """Two questions a headcount cannot answer.

        **Deliberately not windowed.** An earlier revision took a `days`
        parameter, echoed it back as `observationDays`, and ignored it — a
        caller could change it and watch nothing move. Removing it is the
        honest fix rather than making it work, because both measures are
        all-time by nature: a business's *first* payment is not the first one
        inside an arbitrary window, and clipping the history would report a
        long-established business as newly activated.

        **Activation lag** — how long between approving a business and its
        first payment. A long lag says onboarding completes and adoption does
        not, which is a different problem from a business never signing up
        and needs a different response.

        **Dormancy** — approved businesses that have stopped. They are still
        counted in every coverage figure, so without this the network looks
        larger than it is.
        """
        try:
            merchants = self.db.query(Merchant).filter(
                Merchant.organization_id == self.organization.id,
                Merchant.deleted_at.is_(None),
                Merchant.status == "active",
            ).all()
            if not merchants:
                return {"status": "no_data", "detail": "No approved businesses yet."}

            first_payment: Dict[str, datetime] = {}
            last_payment: Dict[str, datetime] = {}
            for t in self.repo.all_transactions():
                key = str(t.merchant_id)
                if key not in first_payment or t.created_at < first_payment[key]:
                    first_payment[key] = t.created_at
                if key not in last_payment or t.created_at > last_payment[key]:
                    last_payment[key] = t.created_at

            lags = []
            never_traded = []
            dormant = []
            cutoff = datetime.utcnow() - timedelta(days=dormant_after_days)

            for m in merchants:
                key = str(m.id)
                first = first_payment.get(key)
                if not first:
                    never_traded.append({
                        "merchantId": key,
                        "displayName": m.trading_name or m.legal_name,
                        "approvedDaysAgo": (datetime.utcnow() - m.created_at).days,
                    })
                    continue
                if m.created_at and first >= m.created_at:
                    lags.append((first - m.created_at).total_seconds() / 86400.0)
                last = last_payment.get(key)
                if last and last < cutoff:
                    dormant.append({
                        "merchantId": key,
                        "displayName": m.trading_name or m.legal_name,
                        "lastPaymentDaysAgo": (datetime.utcnow() - last).days,
                    })

            lag_array = np.array(lags, dtype=float)
            never_traded.sort(key=lambda x: x["approvedDaysAgo"], reverse=True)
            dormant.sort(key=lambda x: x["lastPaymentDaysAgo"], reverse=True)

            return {
                "status": "ok",
                "basis": "all recorded payments; activation and dormancy are not windowed",
                "dormantAfterDays": dormant_after_days,
                "approvedBusinesses": len(merchants),
                "medianActivationDays": round(float(np.median(lag_array)), 1) if lag_array.size else None,
                "p90ActivationDays": round(float(np.percentile(lag_array, 90)), 1) if lag_array.size else None,
                "activationBasis": int(lag_array.size),
                "neverTraded": len(never_traded),
                "neverTradedExamples": never_traded[:10],
                "dormant": len(dormant),
                "dormantExamples": dormant[:10],
                # The figure that matters: approved businesses that are
                # neither dormant nor unstarted.
                "genuinelyActive": len(merchants) - len(never_traded) - len(dormant),
                "belowEvidenceFloor": len(merchants) < MIN_OBSERVATIONS,
            }
        except Exception as e:
            logger.error(f"Error computing activation and dormancy: {e}")
            return {"status": "error", "detail": "Could not compute activation and dormancy."}
