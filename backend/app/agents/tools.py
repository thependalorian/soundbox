"""Agent tools.

**Every tool here is a thin wrapper over an existing service method.** No
tool contains a query, a join, or an aggregation of its own. That is the
single rule this module exists to hold: if a figure is worth having, it
belongs in `app/services/` where the dashboards and the regulatory returns
can use the same one. A number that only the assistant can produce is a
number nobody can reconcile.

Docstrings are the tool descriptions the model actually reads when choosing
what to call, so they are written for that purpose rather than for a human
skimming the file — concrete about what comes back, and explicit about the
distinctions the model must not blur (an alert is not a confirmed case).

Nothing here writes. The whole surface is read-only, which is why the agent
needs no approval step (AGENT_MASTER_GUIDE §2.1).
"""

from __future__ import annotations

import json
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List

from pydantic_ai import RunContext

from app.agents.deps import AnalyticsDeps
from app.services.analytics_service import AnalyticsService
from app.services.forecasting import ForecastingService
from app.services.market_analytics import MarketAnalyticsService
from app.services.regulatory_reporting import RegulatoryReportingEngine


def json_safe(value: Any) -> Any:
    """ORM results carry Decimal and datetime; the wire does not.

    Kept identical in behaviour to the converter the previous ask_service
    used, so answers do not change shape as part of this migration.
    """

    def default(obj: Any) -> Any:
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return str(obj)

    return json.loads(json.dumps(value, default=default))


# ---------------------------------------------------------------------------
# Activity and health
# ---------------------------------------------------------------------------

async def get_transaction_summary(ctx: RunContext[AnalyticsDeps], days: int = 7) -> Dict:
    """Headline activity over the last N days: payment count, total value in
    NAD, and the share of payments flagged for review.
    Use for "how are we doing" and any total-volume question."""
    return json_safe(AnalyticsService(ctx.deps.db).get_transaction_summary(days=days))


async def get_transaction_trends(ctx: RunContext[AnalyticsDeps], days: int = 7) -> Dict:
    """Daily payment count and value for each of the last N days. Use for
    trend, growth and "over time" questions — the interface renders this as a
    chart."""
    return json_safe({"trends": AnalyticsService(ctx.deps.db).get_transaction_trends(days=days)})


async def get_system_health(ctx: RunContext[AnalyticsDeps]) -> Dict:
    """Overall payment system health: a 0-1 score, a status band, and the
    component measures behind it (success rate, latency, share flagged).
    The three are weighted to sum to 1.0, so a perfect system scores 1.0."""
    return json_safe(AnalyticsService(ctx.deps.db).get_system_health())


async def get_availability(ctx: RunContext[AnalyticsDeps], days: int = 30) -> Dict:
    """Payment availability with the worst day and worst hour called out
    separately, not just a monthly average — an average hides the day on which
    nothing worked. Includes failure counts by status."""
    return json_safe(MarketAnalyticsService(ctx.deps.db).get_availability(days=days))


async def get_settlement_lag(ctx: RunContext[AnalyticsDeps], days: int = 30) -> Dict:
    """How long money takes to arrive: the wait at the counter and the
    settlement cycle after it, reported separately because a seller only ever
    waits on the first."""
    return json_safe(MarketAnalyticsService(ctx.deps.db).get_settlement_lag(days=days))


# ---------------------------------------------------------------------------
# Alerts — unusual, never "fraud"
# ---------------------------------------------------------------------------

async def get_anomaly_alerts(ctx: RunContext[AnalyticsDeps], hours: int = 24) -> Dict:
    """Payments flagged as unusual in the last N hours, with the business,
    amount, risk level and anomaly score, ordered by money at risk.

    An alert is a payment a person was asked to examine. It is NOT a confirmed
    case of fraud, and must never be reported as one — only a reviewer's
    verdict makes it a finding."""
    return json_safe({"alerts": AnalyticsService(ctx.deps.db).get_anomaly_alerts(hours=hours)})


# ---------------------------------------------------------------------------
# Market structure
# ---------------------------------------------------------------------------

async def get_concentration(ctx: RunContext[AnalyticsDeps], days: int = 90) -> Dict:
    """Whether the network depends on too few businesses or one region.
    Returns the Herfindahl-Hirschman index by merchant and by region, top-3
    and top-10 shares, and a Gini coefficient on value. Under 1,500 is
    unconcentrated; over 2,500 is highly concentrated."""
    return json_safe(MarketAnalyticsService(ctx.deps.db).get_concentration(days=days))


async def get_value_distribution(ctx: RunContext[AnalyticsDeps], days: int = 90) -> Dict:
    """How payment values are actually spread — median, mean, p25/p75/p90/p99
    and a histogram. Use this rather than an average whenever the question is
    about typical payment size: the mean sits between two different economies
    and describes neither."""
    return json_safe(MarketAnalyticsService(ctx.deps.db).get_value_distribution(days=days))


# ---------------------------------------------------------------------------
# Inclusion, retention, reach
# ---------------------------------------------------------------------------

async def get_inclusion_metrics(ctx: RunContext[AnalyticsDeps], days: int = 90) -> Dict:
    """Financial-inclusion measures: wallet-funded versus bank-funded payment
    share (the clearest signal of reaching someone without a bank account),
    acceptance rate, businesses onboarded, and which regions have no activity
    at all. Instrument-not-recorded is counted separately, never folded into
    bank."""
    return json_safe(MarketAnalyticsService(ctx.deps.db).get_inclusion_metrics(days=days))


async def get_wallet_share(ctx: RunContext[AnalyticsDeps]) -> Dict:
    """Wallet-funded versus bank-funded payment counts by region, with wallet
    share as a percentage."""
    return json_safe({"regions": AnalyticsService(ctx.deps.db).get_wallet_share()})


async def get_cohort_retention(ctx: RunContext[AnalyticsDeps], months: int = 6) -> Dict:
    """Whether businesses onboarded in a given month are still trading later,
    by cohort. Use for any adoption or churn question: a cumulative merchant
    count hides churn completely, so growth claims need this."""
    return json_safe(MarketAnalyticsService(ctx.deps.db).get_cohort_retention(months=months))


async def get_activation_and_dormancy(
    ctx: RunContext[AnalyticsDeps], dormant_after_days: int = 30
) -> Dict:
    """Businesses approved but never trading, and businesses that have gone
    quiet. Both inflate coverage figures elsewhere, so they are worth naming
    when someone asks how many businesses are on the network."""
    return json_safe(
        MarketAnalyticsService(ctx.deps.db).get_activation_and_dormancy(
            dormant_after_days=dormant_after_days
        )
    )


# ---------------------------------------------------------------------------
# Geography
# ---------------------------------------------------------------------------

async def get_geo_distribution(ctx: RunContext[AnalyticsDeps]) -> Dict:
    """Per-business location, region and payment count. Use for map and
    "where are the businesses" questions."""
    return json_safe({"locations": AnalyticsService(ctx.deps.db).get_geo_distribution()})


async def get_geo_breakdown(
    ctx: RunContext[AnalyticsDeps],
    level: str = "region",
    parent_code: str = "",
    payment_type: str = "",
    payer_instrument: str = "",
    days: int = 0,
) -> Dict:
    """Activity by geography at any level: 'region', 'constituency' or
    'local_authority'. Optionally restrict to one parent region's children,
    filter to a single payment type (p2p, p2b, b2p, g2p, cash_in_merchant,
    cash_out_merchant, atm_withdrawal) or payer instrument, or use a rolling
    window in days.

    Use for any question about where activity is or is not happening — a
    national total hides the regions with nothing in them."""
    return json_safe(
        {
            "rows": AnalyticsService(ctx.deps.db).get_geo_breakdown(
                level=level,
                parent_code=parent_code or None,
                payment_type=payment_type or None,
                payer_instrument=payer_instrument or None,
                days=days or None,
            )
        }
    )


# ---------------------------------------------------------------------------
# Agent float
# ---------------------------------------------------------------------------

async def get_cash_flow(ctx: RunContext[AnalyticsDeps], days: int = 30) -> Dict:
    """Net cash position at agents — cash paid out against cash taken in, per
    agent. An agent paying out more than they take in eventually has nothing
    left to pay with, and on a coverage map that looks identical to a place
    that was never reached. Use for agent liquidity and "running dry"
    questions."""
    return json_safe(MarketAnalyticsService(ctx.deps.db).get_cash_flow(days=days))


# ---------------------------------------------------------------------------
# Forecasting
# ---------------------------------------------------------------------------

async def forecast_activity(
    ctx: RunContext[AnalyticsDeps], horizon: int = 14, observed_days: int = 90
) -> Dict:
    """Expected payment volume and value for the coming days, with intervals
    that widen as the horizon extends. `horizon` is days ahead (capped by the
    service); `observed_days` is how much history to fit on.

    Returns 'insufficient_data' rather than a number when there is under four
    weeks of history — report that plainly rather than estimating. Fraud is
    deliberately not forecastable here: it is adversarial, so a forecast of it
    would describe someone actively working to make the number wrong."""
    return json_safe(
        ForecastingService(ctx.deps.db).forecast_activity(
            horizon=horizon, observed_days=observed_days
        )
    )


# ---------------------------------------------------------------------------
# Regulatory returns
# ---------------------------------------------------------------------------

async def generate_psd6_report(ctx: RunContext[AnalyticsDeps], month: int, year: int) -> Dict:
    """The monthly payment-system return for a given month and year, produced
    from the same record the dashboards read, with its own reconciliation
    checks. Use when asked for the monthly return or whether last month
    reconciled."""
    engine = RegulatoryReportingEngine(ctx.deps.db, ctx.deps.organization_id)
    return json_safe(engine.generate_psd6_report(month=month, year=year))


async def generate_psd3_report(ctx: RunContext[AnalyticsDeps]) -> Dict:
    """The electronic-money return: wallet balances, trust-account
    reconciliation and the surplus or shortfall between them."""
    engine = RegulatoryReportingEngine(ctx.deps.db, ctx.deps.organization_id)
    return json_safe(engine.generate_psd3_report())


async def generate_flag_trend_report(ctx: RunContext[AnalyticsDeps], months: int = 12) -> Dict:
    """Monthly trend of flagged activity: alert counts, high-risk share and
    average score by month, plus a breakdown by signal type. These are alert
    figures, not confirmed fraud."""
    engine = RegulatoryReportingEngine(ctx.deps.db, ctx.deps.organization_id)
    return json_safe(engine.generate_flag_trend_report(months=months))


#: Registered on the agent in `agent.py`. Ordered by how a reviewer works —
#: activity first, then what is unusual, then structure and reach.
ALL_TOOLS: List[Any] = [
    get_transaction_summary,
    get_transaction_trends,
    get_system_health,
    get_availability,
    get_settlement_lag,
    get_anomaly_alerts,
    get_concentration,
    get_value_distribution,
    get_inclusion_metrics,
    get_wallet_share,
    get_cohort_retention,
    get_activation_and_dormancy,
    get_geo_distribution,
    get_geo_breakdown,
    get_cash_flow,
    forecast_activity,
    generate_psd6_report,
    generate_psd3_report,
    generate_flag_trend_report,
]
