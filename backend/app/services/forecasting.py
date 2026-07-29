"""Forecasting — and an explicit statement of what is not forecastable.

Nothing in this platform forecast anything before now. That was a real gap:
a payment system department plans capacity, settlement liquidity and agent
float against expected volume, and "expected" means a number with a date on
it.

**What is forecast here: volume and value.** Payment counts have strong,
stable weekly seasonality — market days, month-end, weekends — which is
exactly the structure a decomposition-based forecast handles well.

**What is deliberately not forecast: fraud.** A forecast extrapolates a
pattern. Fraud is adversarial: it changes *because* you detect it, so the
pattern you fit is the one your own controls are already destroying. A fraud
forecast would be a confident number about the behaviour of someone actively
trying to make it wrong. The scorer finds the unusual; a person decides what
it meant; neither of those is a prediction of next month.

Method: additive decomposition — level, linear trend, and a weekly seasonal
index — fitted on daily aggregates. Chosen over ARIMA deliberately:

- The components are separately inspectable. An analyst can see that Saturday
  carries 1.8x an average day and disagree with it, which is not possible
  with fitted AR coefficients.
- It degrades honestly on short series. ARIMA on eight weeks of data produces
  parameters that look authoritative and are not.
- It needs no stationarity transformation, so nothing about the input is
  silently altered before the forecast is made.

Intervals come from the spread of in-sample residuals, not from a
distributional assumption. They widen with horizon because uncertainty does.
"""

import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import numpy as np
from sqlalchemy.orm import Session

from app.db.helpers import get_or_create_organization
from app.db.models import Merchant, Transaction

logger = logging.getLogger(__name__)

MODEL_NAME = "additive_decomposition_forecast"
MODEL_VERSION = "1.0.0"

# Four full weeks is the floor for estimating a weekly seasonal index at all;
# below it, a "Saturday effect" is one or two Saturdays and an accident.
MIN_DAYS = 28

# Beyond this the seasonal index is being extrapolated further than the data
# supports, and the interval would be wide enough to be useless anyway.
MAX_HORIZON_DAYS = 28

# Any day with no payments inside the observed span is a real zero, not a
# missing value: the network was up and nothing happened. Zeros are kept.


def _daily_series(
    db: Session, organization_id, days: int, merchant_id=None
) -> Tuple[List[str], np.ndarray, np.ndarray]:
    """Daily payment count and value, with gaps filled as genuine zeros."""
    since = (datetime.utcnow() - timedelta(days=days)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    q = db.query(Transaction).filter(
        Transaction.organization_id == organization_id,
        Transaction.deleted_at.is_(None),
        Transaction.created_at >= since,
    )
    if merchant_id:
        q = q.filter(Transaction.merchant_id == merchant_id)

    counts: Dict[str, int] = defaultdict(int)
    values: Dict[str, float] = defaultdict(float)
    for t in q.all():
        key = t.created_at.strftime("%Y-%m-%d")
        counts[key] += 1
        values[key] += float(t.amount or 0)

    dates: List[str] = []
    cursor = since
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    while cursor < today:
        dates.append(cursor.strftime("%Y-%m-%d"))
        cursor += timedelta(days=1)

    return (
        dates,
        np.array([counts[d] for d in dates], dtype=float),
        np.array([values[d] for d in dates], dtype=float),
    )


def _decompose(series: np.ndarray) -> Tuple[float, float, np.ndarray, np.ndarray]:
    """Level, trend per day, weekly seasonal indices, and residuals.

    The trend is fitted by least squares on the *deseasonalised* series in a
    second pass. Fitting a trend through raw daily counts lets whichever
    weekday the window happens to start and end on tilt the slope, which on a
    short series can invert its sign entirely.
    """
    n = series.size
    x = np.arange(n, dtype=float)

    # First pass: rough trend, only to remove it before measuring seasonality.
    rough_slope, rough_intercept = np.polyfit(x, series, 1)
    detrended = series - (rough_slope * x + rough_intercept)

    # Weekly seasonal index: mean deviation for each weekday, centred so the
    # indices sum to zero and cannot smuggle a level shift into the trend.
    seasonal = np.zeros(7)
    for weekday in range(7):
        members = detrended[weekday::7]
        seasonal[weekday] = float(members.mean()) if members.size else 0.0
    seasonal -= seasonal.mean()

    # Second pass: trend on the deseasonalised series.
    deseasonalised = series - seasonal[np.arange(n) % 7]
    slope, intercept = np.polyfit(x, deseasonalised, 1)

    fitted = slope * x + intercept + seasonal[np.arange(n) % 7]
    residuals = series - fitted
    return float(intercept), float(slope), seasonal, residuals


def forecast_series(
    dates: List[str], series: np.ndarray, horizon: int, label: str
) -> Dict:
    """Forecast one daily series with an interval from residual spread."""
    n = series.size
    intercept, slope, seasonal, residuals = _decompose(series)

    # Interval half-width from residual standard deviation, widened with the
    # square root of horizon: uncertainty compounds, and a flat band would
    # claim day 28 is as knowable as tomorrow.
    sigma = float(residuals.std())

    # The weekday the series ends on, so the seasonal index continues in phase.
    last_date = datetime.strptime(dates[-1], "%Y-%m-%d")

    points = []
    for step in range(1, horizon + 1):
        target = last_date + timedelta(days=step)
        index = n + step - 1
        centre = intercept + slope * index + seasonal[target.weekday()]
        # Payment counts and values cannot be negative. A trend extrapolated
        # far enough will predict one, and a negative forecast is a signal
        # that the model has left the range it can speak to.
        centre = max(centre, 0.0)
        band = 1.96 * sigma * np.sqrt(step)
        points.append({
            "date": target.strftime("%Y-%m-%d"),
            "weekday": target.strftime("%a"),
            "forecast": round(centre, 2),
            "lower": round(max(centre - band, 0.0), 2),
            "upper": round(centre + band, 2),
        })

    weekday_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    daily_mean = float(series.mean())

    return {
        "label": label,
        "observedDays": n,
        "observedMean": round(daily_mean, 2),
        "trendPerDay": round(slope, 4),
        # Stated as a plain-language direction so nobody has to read a slope.
        "trendDirection": (
            "rising" if slope > daily_mean * 0.005
            else "falling" if slope < -daily_mean * 0.005
            else "flat"
        ),
        "weeklyPattern": [
            {
                "weekday": weekday_names[i],
                "effect": round(float(seasonal[i]), 2),
                # Relative to an average day, which is what a reader wants.
                "vsAverage": round(float(seasonal[i]) / daily_mean, 3) if daily_mean else None,
            }
            for i in range(7)
        ],
        "residualStdDev": round(sigma, 2),
        # How much of the variation the fit explains. Reported so a weak fit
        # is visible rather than implied by a wide band alone.
        "fitQuality": round(
            float(1 - (residuals.var() / series.var())) if series.var() > 0 else 0.0, 3
        ),
        "forecast": points,
    }


class ForecastingService:
    """Volume and value forecasts. Read-only, like everything else here."""

    def __init__(self, db: Session):
        self.db = db
        self.organization = get_or_create_organization(db)

    def forecast_activity(
        self, horizon: int = 14, observed_days: int = 90, merchant_id_or_code: Optional[str] = None
    ) -> Dict:
        """Forecast daily payment count and value.

        Returns `insufficient_data` rather than a number when the series is
        too short. A forecast produced from three weeks of trading would be
        indistinguishable in presentation from one produced from a year, and
        the reader cannot tell them apart unless we say so.
        """
        try:
            horizon = max(1, min(horizon, MAX_HORIZON_DAYS))

            merchant_uuid = None
            if merchant_id_or_code:
                m = self.db.query(Merchant).filter(
                    Merchant.organization_id == self.organization.id,
                    Merchant.deleted_at.is_(None),
                ).filter(
                    (Merchant.merchant_code == merchant_id_or_code)
                ).first()
                if m:
                    merchant_uuid = m.id

            dates, counts, values = _daily_series(
                self.db, self.organization.id, observed_days, merchant_uuid
            )

            trading_days = int((counts > 0).sum())
            if len(dates) < MIN_DAYS or trading_days < MIN_DAYS // 2:
                return {
                    "status": "insufficient_data",
                    "observedDays": len(dates),
                    "daysWithActivity": trading_days,
                    "daysRequired": MIN_DAYS,
                    "detail": (
                        f"{trading_days} days carried payments out of {len(dates)} observed. "
                        f"At least {MIN_DAYS} days are needed before a weekly pattern is a "
                        f"pattern rather than a coincidence."
                    ),
                    "volume": None,
                    "value": None,
                }

            return {
                "status": "ok",
                "model": {"name": MODEL_NAME, "version": MODEL_VERSION},
                "horizonDays": horizon,
                "observedDays": len(dates),
                "currencyCode": "NAD",
                "volume": forecast_series(dates, counts, horizon, "payments per day"),
                "value": forecast_series(dates, values, horizon, "value per day"),
                "history": [
                    {"date": d, "count": int(c), "value": round(float(v), 2)}
                    for d, c, v in zip(dates, counts, values)
                ],
                "notForecast": [
                    "Fraud. A forecast extrapolates a pattern; fraud changes "
                    "because it is detected, so the pattern being fitted is "
                    "the one our own controls are destroying.",
                    "Individual merchant failure. Aggregate seasonality does "
                    "not transfer to a single stall, and presenting it as "
                    "though it did would put a number on someone's livelihood "
                    "that the method cannot support.",
                ],
            }
        except Exception as e:
            logger.error(f"Error forecasting activity: {e}")
            return {"status": "error", "detail": "Could not produce a forecast."}
