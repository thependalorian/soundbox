"""Merchant segmentation — clustering, which is a different job from scoring.

The anomaly work asks "is this payment unlike this business's own past".
Segmentation asks "which businesses behave alike", and the two are not
interchangeable: an isolation forest finds outliers, it does not produce
groups. Until now the platform had the first and none of the second.

Three things this makes possible that were not possible before:

1. **Peer comparison that means something.** "Unusual versus regional peers"
   currently compares a market stall to every other business in the region,
   including fuel stations. A stall should be compared to stalls.
2. **A picture of the market for oversight.** A regulator asking "what kinds
   of merchant are actually on these rails" has, today, only a merchant-type
   field somebody typed at onboarding. Behaviour is more honest than a
   self-declared category, and it updates itself.
3. **Coverage gaps by segment, not just by geography.** Knowing that
   high-frequency low-value traders are absent from a region says something
   that a headcount does not.

Method. K-means on standardised behavioural features, with k chosen by
silhouette score across a small range rather than fixed in advance —
declaring "there are four merchant types" before looking is exactly the
prior assumption the whole approach exists to avoid. Features are
per-merchant aggregates, deliberately scale-free where possible (shares and
coefficients of variation rather than raw totals), so segmentation reflects
*how* a business trades rather than merely how big it is.

Discipline matches ml/train_anomaly.py: below MIN_MERCHANTS this refuses to
produce an artifact. Clusters fitted on a handful of businesses would look
authoritative and mean nothing, and this output is intended for a central
bank.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import numpy as np
from sqlalchemy.orm import Session

from app.db.models import Merchant, Transaction

logger = logging.getLogger(__name__)

MODEL_NAME = "kmeans_merchant_segmentation"
MODEL_VERSION = "1.0.0"

# Below this, k-means partitions noise. Each cluster needs enough members to
# describe a pattern rather than a coincidence.
MIN_MERCHANTS = 30

# A merchant with almost no payments has no behaviour to characterise.
MIN_TRANSACTIONS_PER_MERCHANT = 20

# Range searched for k. The lower bound is 2 because k=1 is not a
# segmentation; the upper bound keeps segments describable to a human, which
# is the point of producing them.
K_RANGE = (2, 7)

OBSERVATION_DAYS = 90

FEATURE_NAMES: List[str] = [
    # How often. Distinguishes a market stall from a furniture shop more
    # sharply than anything else.
    "payments_per_active_day",
    # How much, on a log scale — value spans orders of magnitude across the
    # segments this platform serves, and untransformed amounts would let one
    # large merchant dominate every distance calculation.
    "median_amount_log",
    # Spread of ticket size relative to its own middle. A business with a
    # fixed price list looks nothing like one where every sale differs.
    "amount_variation",
    # Share of trade in the busiest four hours: a lunchtime peak versus a
    # flat day.
    "peak_hours_share",
    # Weekend share. Market days are the strongest weekly signal in this
    # data, and they separate consumer trade from business-to-business.
    "weekend_share",
    # Share of payers using a wallet rather than a bank instrument — the
    # financial-inclusion dimension, which is the policy question.
    "wallet_share",
    # How many distinct days the business traded in the window, as a share.
    # Separates continuous operations from occasional ones.
    "active_day_share",
]


@dataclass
class MerchantFeatures:
    merchant_id: str
    merchant_code: str
    display_name: str
    region_label: Optional[str]
    transactions: int
    values: List[float] = field(default_factory=list)


def build_merchant_matrix(
    db: Session, organization_id, days: int = OBSERVATION_DAYS
) -> Tuple[np.ndarray, List[MerchantFeatures]]:
    """One row per merchant with enough trade to characterise.

    Merchants below the transaction floor are excluded rather than padded
    with zeros. A zero row is not a quiet business, it is an absence of
    evidence, and k-means cannot tell the difference — it would cluster them
    together and the result would read as a discovered segment.
    """
    since = datetime.utcnow() - timedelta(days=days)
    merchants = db.query(Merchant).filter(
        Merchant.organization_id == organization_id,
        Merchant.deleted_at.is_(None),
    ).all()

    rows: List[MerchantFeatures] = []
    for m in merchants:
        txns = db.query(Transaction).filter(
            Transaction.organization_id == organization_id,
            Transaction.merchant_id == m.id,
            Transaction.deleted_at.is_(None),
            Transaction.created_at >= since,
        ).all()
        if len(txns) < MIN_TRANSACTIONS_PER_MERCHANT:
            continue

        amounts = np.array([float(t.amount or 0) for t in txns], dtype=float)
        hours = np.array([t.created_at.hour for t in txns])
        weekdays = np.array([t.created_at.weekday() for t in txns])
        dates = {t.created_at.date() for t in txns}

        active_days = max(len(dates), 1)
        payments_per_active_day = len(txns) / active_days

        median_amount = float(np.median(amounts)) if amounts.size else 0.0
        median_amount_log = float(np.log1p(max(median_amount, 0.0)))

        # Coefficient of variation, guarded: a business with one price has a
        # median but no meaningful spread, and dividing by it would explode.
        amount_variation = float(np.std(amounts) / median_amount) if median_amount > 0 else 0.0

        # The busiest four hours of the day, as a share of all trade.
        hour_counts = np.bincount(hours, minlength=24)
        peak_hours_share = float(np.sort(hour_counts)[-4:].sum() / len(txns))

        weekend_share = float(np.isin(weekdays, (5, 6)).sum() / len(txns))

        wallet = sum(1 for t in txns if (t.payer_instrument or "") == "wallet")
        known = sum(1 for t in txns if t.payer_instrument)
        # Unknown instruments are excluded from the denominator rather than
        # counted as bank: a gap in the data must not read as a finding.
        wallet_share = float(wallet / known) if known else 0.0

        active_day_share = float(active_days / max(days, 1))

        rows.append(MerchantFeatures(
            merchant_id=str(m.id),
            merchant_code=m.merchant_code,
            display_name=m.trading_name or m.legal_name,
            region_label=None,
            transactions=len(txns),
            values=[
                payments_per_active_day,
                median_amount_log,
                amount_variation,
                peak_hours_share,
                weekend_share,
                wallet_share,
                active_day_share,
            ],
        ))

    matrix = np.array([r.values for r in rows], dtype=float) if rows else np.empty((0, len(FEATURE_NAMES)))
    return matrix, rows


def _standardise(matrix: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Zero mean, unit variance per feature.

    Required, not cosmetic: k-means uses Euclidean distance, so without this
    `payments_per_active_day` (tens) would overwhelm `weekend_share` (a
    fraction) and the segmentation would be a single-feature sort.
    """
    mean = matrix.mean(axis=0)
    std = matrix.std(axis=0)
    # A feature with no variance carries no information; leaving std at zero
    # would divide by it.
    std[std == 0] = 1.0
    return (matrix - mean) / std, mean, std


def choose_k(scaled: np.ndarray, k_range: Tuple[int, int] = K_RANGE) -> Tuple[int, Dict[int, float]]:
    """Pick k by silhouette score.

    Silhouette asks whether points sit closer to their own cluster than to
    the next nearest — a measure of whether the grouping is real, not merely
    whether the algorithm converged. Chosen over the elbow method because it
    yields a number that can be reported rather than a curve someone eyeballs.
    """
    from sklearn.cluster import KMeans
    from sklearn.metrics import silhouette_score

    scores: Dict[int, float] = {}
    lo, hi = k_range
    hi = min(hi, len(scaled) - 1)
    for k in range(lo, hi + 1):
        model = KMeans(n_clusters=k, n_init=10, random_state=42)
        labels = model.fit_predict(scaled)
        if len(set(labels)) < 2:
            continue
        scores[k] = float(silhouette_score(scaled, labels))

    if not scores:
        return lo, {}
    best = max(scores, key=lambda key: scores[key])
    return best, scores


# What a cluster is called is derived from where it sits on the two features
# that separate merchant behaviour most legibly: how often it trades and how
# large the typical payment is. Labels are descriptive, never a judgement —
# a regulator reading "high-frequency, low-value" learns something; reading
# "segment 3" does not.
def describe_cluster(centre: Dict[str, float]) -> str:
    frequency = centre.get("payments_per_active_day", 0)
    value = float(np.expm1(centre.get("median_amount_log", 0)))

    freq_word = "high-frequency" if frequency >= 20 else "steady" if frequency >= 5 else "occasional"
    value_word = "low-value" if value < 100 else "mid-value" if value < 1000 else "high-value"

    note = ""
    if centre.get("weekend_share", 0) >= 0.4:
        note = ", weekend-weighted"
    elif centre.get("active_day_share", 0) >= 0.85:
        note = ", trades daily"

    return f"{freq_word}, {value_word}{note}"


def segment_merchants(
    db: Session, organization_id, days: int = OBSERVATION_DAYS
) -> Dict:
    """Group merchants by how they trade.

    Returns the segments, each merchant's assignment, and the silhouette
    score that justified the number of segments. When there is not enough
    data the response says so plainly and returns no clusters — an empty
    result is a truthful one, and inventing segments for a central bank
    would not be.
    """
    matrix, rows = build_merchant_matrix(db, organization_id, days=days)
    n = len(rows)

    if n < MIN_MERCHANTS:
        return {
            "status": "insufficient_data",
            "merchantsConsidered": n,
            "merchantsRequired": MIN_MERCHANTS,
            "observationDays": days,
            "detail": (
                f"{n} businesses have at least {MIN_TRANSACTIONS_PER_MERCHANT} payments "
                f"in the last {days} days; {MIN_MERCHANTS} are needed before segments "
                f"describe a pattern rather than a coincidence."
            ),
            "segments": [],
            "assignments": [],
        }

    from sklearn.cluster import KMeans

    scaled, mean, std = _standardise(matrix)
    k, scores = choose_k(scaled)
    model = KMeans(n_clusters=k, n_init=10, random_state=42)
    labels = model.fit_predict(scaled)

    # Centres are returned in the original units. A centre in standardised
    # space is uninterpretable, and an uninterpretable segment cannot be
    # acted on.
    centres_original = model.cluster_centers_ * std + mean

    segments = []
    for idx in range(k):
        members = [r for r, lab in zip(rows, labels) if lab == idx]
        centre = {name: float(v) for name, v in zip(FEATURE_NAMES, centres_original[idx])}
        segments.append({
            "segment": idx,
            "label": describe_cluster(centre),
            "merchants": len(members),
            "share": round(len(members) / n, 4),
            "centre": {key: round(value, 4) for key, value in centre.items()},
            "medianAmount": round(float(np.expm1(centre["median_amount_log"])), 2),
            "totalTransactions": sum(m.transactions for m in members),
        })

    segments.sort(key=lambda s: s["merchants"], reverse=True)

    return {
        "status": "ok",
        "model": {"name": MODEL_NAME, "version": MODEL_VERSION},
        "merchantsConsidered": n,
        "observationDays": days,
        "k": k,
        "silhouette": round(scores.get(k, 0.0), 4),
        "silhouetteByK": {str(key): round(value, 4) for key, value in scores.items()},
        "featureNames": FEATURE_NAMES,
        "segments": segments,
        "assignments": [{
            "merchantId": r.merchant_id,
            "merchantCode": r.merchant_code,
            "displayName": r.display_name,
            "segment": int(lab),
            "transactions": r.transactions,
            # Two axes for plotting, in units a reader recognises.
            "paymentsPerActiveDay": round(r.values[0], 2),
            "medianAmount": round(float(np.expm1(r.values[1])), 2),
        } for r, lab in zip(rows, labels)],
    }
