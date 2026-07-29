"""Oversight analytics: market structure, the NPS indicator set, forecasting.

Separate from `analytics.py`, which serves the operational console. The split
is by *reader*, not by table: an operations desk asks what happened today and
whether it worked; a payment system department asks whether the system is
concentrated, whether it is reaching people, and what next month looks like.
Those questions have different windows, different evidence floors and
different consequences for being wrong, and a single 25-endpoint module made
that indistinguishable.

Every handler here is a thin pass-through. The reasoning lives in the
services; a router that computes anything is a router that has to be
redeployed to change a number.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.data import cache
from app.db.session import get_db
from app.services import nps_dashboard
from app.services.forecasting import ForecastingService
from app.services.market_analytics import MarketAnalyticsService
from app.services.nps_metrics import NpsMetricsService

router = APIRouter()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
#
# Market structure, distribution, inclusion, retention and availability. These
# answer the questions a payment system department asks, which are not the
# questions an operations dashboard answers.


@router.get("/market/concentration")
async def get_concentration(days: int = 90, db: Session = Depends(get_db)):
    """Herfindahl-Hirschman concentration by business and by region."""
    try:
        return cache.get_or_compute(
            "market_concentration",
            {"days": days},
            lambda: MarketAnalyticsService(db).get_concentration(days=days),
        )
    except Exception as e:
        logger.error(f"Error getting concentration: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/market/value-distribution")
async def get_value_distribution(days: int = 90, db: Session = Depends(get_db)):
    """Percentiles and a histogram of payment values."""
    try:
        return cache.get_or_compute(
            "market_value_distribution",
            {"days": days},
            lambda: MarketAnalyticsService(db).get_value_distribution(days=days),
        )
    except Exception as e:
        logger.error(f"Error getting value distribution: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/market/inclusion")
async def get_inclusion(days: int = 90, db: Session = Depends(get_db)):
    """Wallet reliance, acceptance rate, and regions with no business yet."""
    try:
        return cache.get_or_compute(
            "market_inclusion",
            {"days": days},
            lambda: MarketAnalyticsService(db).get_inclusion_metrics(days=days),
        )
    except Exception as e:
        logger.error(f"Error getting inclusion metrics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/market/retention")
async def get_retention(months: int = 6, db: Session = Depends(get_db)):
    """Retention by onboarding cohort — the honest test of adoption."""
    try:
        return cache.get_or_compute(
            "market_retention",
            {"months": months},
            lambda: MarketAnalyticsService(db).get_cohort_retention(months=months),
        )
    except Exception as e:
        logger.error(f"Error getting retention: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/market/availability")
async def get_availability(days: int = 30, db: Session = Depends(get_db)):
    """Success rate with the worst day and worst hour, not just the average."""
    try:
        return cache.get_or_compute(
            "market_availability",
            {"days": days},
            lambda: MarketAnalyticsService(db).get_availability(days=days),
        )
    except Exception as e:
        logger.error(f"Error getting availability: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/market/segments")
async def get_merchant_segments(days: int = 90, db: Session = Depends(get_db)):
    """Behavioural segmentation of businesses.

    Clustering, which is a different question from anomaly scoring: the
    scorer finds outliers, this finds groups. Returns `insufficient_data`
    rather than inventing segments when there is not enough trade to
    characterise — a fabricated segmentation shown to a central bank would
    be worse than none.
    """
    try:
        from app.db.helpers import get_or_create_organization
        from ml.segmentation import segment_merchants

        org = get_or_create_organization(db)
        return segment_merchants(db, org.id, days=days)
    except Exception as e:
        logger.error(f"Error segmenting merchants: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ---------------------------------------------------------------------------
# NPS indicator set and forecasting
# ---------------------------------------------------------------------------


@router.get("/nps/dashboard")
async def get_nps_dashboard(days: int = 90, db: Session = Depends(get_db)):
    """Every NPS indicator, grouped by the 2030 strategy's five themes.

    Assembled server-side so the figures in one return are measured over the
    same window. Computing each in a separate request lets the periods drift
    apart, and two numbers in one report from different windows is the kind
    of error nobody catches until it is published.
    """
    try:
        # Cached: fourteen indicators over a quarter of payments is the
        # slowest read in the platform, and it is the one a person refreshes.
        # The response carries `fromCache` and `ageSeconds` so nobody mistakes
        # a five-minute-old figure for a live one.
        return cache.get_or_compute(
            "nps_dashboard",
            {"days": days},
            lambda: nps_dashboard.assemble(db, days=days),
        )
    except Exception as e:
        logger.error(f"Error assembling NPS dashboard: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/nps/adoption")
async def get_nps_adoption(days: int = 90, db: Session = Depends(get_db)):
    """Usage growth by use case, against the preceding equal window."""
    try:
        return cache.get_or_compute(
            "nps_adoption",
            {"days": days},
            lambda: NpsMetricsService(db).adoption(days=days),
        )
    except Exception as e:
        logger.error(f"Error computing adoption: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/nps/access")
async def get_nps_access(db: Session = Depends(get_db)):
    """Access points per 10,000 adults aged 15 and over, by region."""
    try:
        return cache.get_or_compute(
            "nps_access",
            {},
            lambda: NpsMetricsService(db).access(),
        )
    except Exception as e:
        logger.error(f"Error computing access: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/nps/resilience")
async def get_nps_resilience(days: int = 30, db: Session = Depends(get_db)):
    """Availability and straight-through processing."""
    try:
        return cache.get_or_compute(
            "nps_resilience",
            {"days": days},
            lambda: NpsMetricsService(db).resilience(days=days),
        )
    except Exception as e:
        logger.error(f"Error computing resilience: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/nps/integrity")
async def get_nps_integrity(days: int = 90, db: Session = Depends(get_db)):
    """Anomaly and confirmed-fraud incidence, reported separately."""
    try:
        return cache.get_or_compute(
            "nps_integrity",
            {"days": days},
            lambda: NpsMetricsService(db).integrity(days=days),
        )
    except Exception as e:
        logger.error(f"Error computing integrity: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/nps/interoperability")
async def get_nps_interoperability(days: int = 90, db: Session = Depends(get_db)):
    """Cross-instrument coverage and use-case coverage."""
    try:
        return cache.get_or_compute(
            "nps_interoperability",
            {"days": days},
            lambda: NpsMetricsService(db).interoperability(days=days),
        )
    except Exception as e:
        logger.error(f"Error computing interoperability: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/market/settlement-lag")
async def get_settlement_lag(days: int = 30, db: Session = Depends(get_db)):
    """Confirmation lag and settlement lag, kept apart."""
    try:
        return cache.get_or_compute(
            "market_settlement_lag",
            {"days": days},
            lambda: MarketAnalyticsService(db).get_settlement_lag(days=days),
        )
    except Exception as e:
        logger.error(f"Error computing settlement lag: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/market/cash-flow")
async def get_cash_flow(days: int = 30, db: Session = Depends(get_db)):
    """Net cash position at agent points — who is running dry."""
    try:
        return cache.get_or_compute(
            "market_cash_flow",
            {"days": days},
            lambda: MarketAnalyticsService(db).get_cash_flow(days=days),
        )
    except Exception as e:
        logger.error(f"Error computing cash flow: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/market/activation")
async def get_activation(dormant_after_days: int = 30, db: Session = Depends(get_db)):
    """Activation lag and dormancy among approved businesses.

    Not windowed: a business's first payment is not the first one inside an
    arbitrary window, and clipping the history would report a long-established
    business as newly activated.
    """
    try:
        return MarketAnalyticsService(db).get_activation_and_dormancy(
            dormant_after_days=dormant_after_days
        )
    except Exception as e:
        logger.error(f"Error computing activation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/forecast/activity")
async def get_activity_forecast(
    horizon: int = 14, days: int = 90, merchant_id: str = None, db: Session = Depends(get_db)
):
    """Forecast daily payment volume and value.

    Volume and value only. Fraud is deliberately not forecast: a forecast
    extrapolates a pattern, and fraud changes because it is detected, so the
    pattern being fitted is the one our own controls are destroying.
    """
    try:
        return ForecastingService(db).forecast_activity(
            horizon=horizon, observed_days=days, merchant_id_or_code=merchant_id
        )
    except Exception as e:
        logger.error(f"Error forecasting activity: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/cache/health")
async def get_cache_health():
    """Whether the cache is working.

    Reported rather than assumed: a silently unavailable cache looks
    identical to a working one apart from latency, and latency is exactly
    what nobody notices until it matters.
    """
    return cache.health()
