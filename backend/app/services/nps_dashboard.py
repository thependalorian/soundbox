"""Assembles the NPS indicator set from independent metric providers.

`NpsMetricsService.dashboard()` used to reach into `MarketAnalyticsService`
directly. That put a dependency in the wrong direction: a service computing
one theme's indicators had to know which other service happened to hold the
rest, so adding a metric meant editing an unrelated module and neither could
be exercised without the other.

The dependency is inverted here. Both services stay unaware of each other;
this module depends on both and composes them. Adding a metric is a row in
INDICATORS, not an edit to a service.

**The composition is data.** INDICATORS maps a theme to the callables that
evidence it. That matters for the same reason the rest of this schema keeps
taxonomies in configuration: the mapping from a strategy theme to the
measures that evidence it is a claim someone should be able to read,
challenge and change without reading Python.

One window, one repository. Every metric in a return is computed from the
same rolling window against the same read layer, because two figures in one
report measured over different periods is an error nobody catches until it
is published.
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Dict, List

from sqlalchemy.orm import Session

from app.data.payment_repository import PaymentRepository
from app.db.helpers import get_or_create_organization
from app.services.market_analytics import MarketAnalyticsService
from app.services.nps_metrics import NpsMetricsService

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Indicator:
    """One measure, and where in the strategy it belongs."""

    key: str
    theme: str
    # Given the two services and the window, produce the metric. Kept as a
    # callable rather than a method name so a provider can be swapped without
    # the registry knowing which class it came from.
    compute: Callable[["MetricProviders", int], Dict]


@dataclass
class MetricProviders:
    """The services a metric may draw on. One instance per assembly."""

    nps: NpsMetricsService
    market: MarketAnalyticsService


# Themes as named in the NPS Vision and Strategy 2030.
THEME_USER = "userCentricity"
THEME_TRUST = "trustAndResilience"
THEME_DIGITAL = "digitalEnablement"
THEME_KNOWLEDGE = "knowledgeCommunities"

THEME_LABELS = {
    THEME_USER: "User-Centricity",
    THEME_TRUST: "Trust and Resilience",
    THEME_DIGITAL: "Digital Enablement",
    THEME_KNOWLEDGE: "Knowledge Communities",
}

# Availability, settlement and cash position are reported over a shorter
# window than adoption. A quarter of uptime averages away the bad afternoon
# that is the whole point of measuring it.
SHORT_WINDOW_DAYS = 30

INDICATORS: List[Indicator] = [
    Indicator("usage", THEME_USER, lambda p, d: p.nps.user_impact(d)),
    Indicator("retention", THEME_USER, lambda p, d: p.market.get_cohort_retention()),
    # Activation and dormancy take no window: both are all-time by nature.
    Indicator("activation", THEME_USER, lambda p, d: p.market.get_activation_and_dormancy()),

    Indicator("resilience", THEME_TRUST, lambda p, d: p.nps.resilience(min(d, SHORT_WINDOW_DAYS))),
    Indicator("integrity", THEME_TRUST, lambda p, d: p.nps.integrity(d)),
    Indicator("availability", THEME_TRUST, lambda p, d: p.market.get_availability(min(d, SHORT_WINDOW_DAYS))),
    Indicator("settlement", THEME_TRUST, lambda p, d: p.market.get_settlement_lag(min(d, SHORT_WINDOW_DAYS))),

    Indicator("adoption", THEME_DIGITAL, lambda p, d: p.nps.adoption(d)),
    Indicator("access", THEME_DIGITAL, lambda p, d: p.nps.access()),
    Indicator("interoperability", THEME_DIGITAL, lambda p, d: p.nps.interoperability(d)),
    Indicator("inclusion", THEME_DIGITAL, lambda p, d: p.market.get_inclusion_metrics(d)),
    Indicator("cashFlow", THEME_DIGITAL, lambda p, d: p.market.get_cash_flow(min(d, SHORT_WINDOW_DAYS))),

    Indicator("competition", THEME_KNOWLEDGE, lambda p, d: p.market.get_concentration(d)),
    Indicator("valueDistribution", THEME_KNOWLEDGE, lambda p, d: p.market.get_value_distribution(d)),
]

# Stated in every return. A reader who cannot see what a report omits will
# assume it covers everything, and for a document going to a central bank
# that assumption is the expensive one.
NOT_EVIDENCED = [
    "Strategic Foresight and Innovation — policy positions on AI, "
    "tokenisation and quantum readiness are institutional outputs, not "
    "measurements.",
    "Payments industry skills enablement — training and certification "
    "programmes, likewise.",
    "Cross-border corridor performance — this platform observes domestic "
    "acceptance only.",
    "Trust and confidence directly. Repeat use is the closest honest signal "
    "from payment data; the Consumer Payments Choice and Behaviour Survey "
    "the strategy calls for is the instrument for the rest.",
]


def assemble(db: Session, days: int = 90) -> Dict:
    """Every indicator, grouped by theme, over one window.

    A metric that raises does not take the return down with it. The entry
    records the failure and the rest of the report still renders — a partial
    return that says which part is missing is more useful than a 500, and
    far more useful than a silently absent section.
    """
    organization = get_or_create_organization(db)
    repository = PaymentRepository(db, organization.id)
    providers = MetricProviders(
        nps=NpsMetricsService(db, repository=repository),
        market=MarketAnalyticsService(db, repository=repository),
    )

    themes: Dict[str, Dict[str, Dict]] = {key: {} for key in THEME_LABELS}
    failures: List[str] = []

    for indicator in INDICATORS:
        try:
            themes[indicator.theme][indicator.key] = indicator.compute(providers, days)
        except Exception as e:
            logger.error("Indicator %s failed: %s", indicator.key, e)
            failures.append(indicator.key)
            themes[indicator.theme][indicator.key] = {
                "status": "error",
                "detail": "This measure could not be computed. The rest of the return is unaffected.",
            }

    return {
        "generatedAt": datetime.utcnow().isoformat(),
        "observationDays": days,
        "shortWindowDays": SHORT_WINDOW_DAYS,
        "currencyCode": "NAD",
        "source": "NPS Vision and Strategy 2030 indicator set",
        "themeLabels": THEME_LABELS,
        "themes": themes,
        "indicatorsComputed": len(INDICATORS) - len(failures),
        "indicatorsTotal": len(INDICATORS),
        "indicatorsFailed": failures,
        "notEvidencedHere": NOT_EVIDENCED,
    }
