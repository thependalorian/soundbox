"""Validate the detector without a single confirmed case.

Adapted from the BIS framework: Desai, Kosse & Sharples, *Finding a Needle
in a Haystack: A Machine Learning Framework for Anomaly Detection in Payment
Systems*, BIS Working Paper 1188 (May 2024).

The paper addresses exactly our position — "the scarcity of anomalies and
the absence of pre-identified examples being the primary obstacle" — and
resolves it by testing against **artificially manipulated transactions**
rather than waiting for confirmed cases. Their result: the isolation forest
assigned roughly twice the anomaly score to manipulated transactions as to
their real counterparts.

The distinction that makes this legitimate rather than circular: nothing is
*trained* on synthetic labels. Real behaviour is generated, copies of it are
deliberately manipulated, and the detector is asked whether it can tell them
apart. That measures sensitivity, which is a different and answerable
question from "how much fraud is there".

What this does **not** establish is a fraud detection rate. It cannot: no
confirmed outcomes exist. It establishes that the scorer responds to the
kinds of manipulation it was designed to notice, and by how much.

Run:  cd backend && source venv/bin/activate && python -m tests.test_injection_validation
"""

import sys
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from statistics import mean

from app.db.helpers import get_or_create_merchant, get_or_create_organization
from app.db.models import Merchant, Transaction
from app.db.session import SessionLocal
from app.services.anomaly_scoring import AnomalyScoringEngine

MERCHANT_CODE = "TEST-INJECTION"
HISTORY_WEEKS = 12
TRADING_START, TRADING_HOURS = 8, 10
NORMAL_PER_DAY = 20
NORMAL_AMOUNT = 120.0

# Each manipulation mirrors a way payments actually go wrong, rather than
# random noise — random noise would prove only that the scorer reacts to
# randomness.
MANIPULATIONS = [
    ("Amount inflated 8x", "a compromised terminal pushing value through"),
    ("Volume burst", "an account being drained through rapid repeat payments"),
    ("Dead of night", "activity while the business is closed"),
    ("Duplicate amount", "the same payment submitted twice"),
]


def _seed_normal(db, org_id, merchant_id) -> None:
    """A steady, unremarkable trading history."""
    today = datetime.utcnow().replace(hour=12, minute=0, second=0, microsecond=0)
    for days_back in range(1, HISTORY_WEEKS * 7 + 1):
        day = today - timedelta(days=days_back)
        for i in range(NORMAL_PER_DAY):
            db.add(Transaction(
                id=uuid.uuid4(), organization_id=org_id, merchant_id=merchant_id,
                transaction_ref=f"INJ-N-{days_back}-{i}-{uuid.uuid4().hex[:6]}",
                amount=Decimal(str(NORMAL_AMOUNT)), status="success", payment_type="p2b",
                created_at=day.replace(hour=TRADING_START + (i * TRADING_HOURS) // NORMAL_PER_DAY,
                                       minute=(i * 3) % 60),
            ))
    db.commit()


def _clear_transactions(db, merchant_id) -> None:
    """Reset the fixture's payments, keeping the business row.

    Used between cases inside a run. Deleting the merchant here would orphan
    every row seeded afterwards, and the scorer would then read an empty
    history and flag nothing.
    """
    db.query(Transaction).filter(Transaction.merchant_id == merchant_id).delete()
    # Also by reference prefix. Deleting only by merchant id orphaned rows
    # once, when a bug changed the merchant between seeding and teardown —
    # they survived every subsequent cleanup because nothing pointed at them.
    db.query(Transaction).filter(
        Transaction.transaction_ref.like("INJ-%")
    ).delete(synchronize_session=False)
    db.commit()


def _purge(db, merchant_id) -> None:
    """Remove the fixture entirely, business row included.

    Teardown only. Earlier revisions deleted just the transactions, so every
    run left a TEST-* business behind in the live database, showing up in
    /merchants and in the counts a regulator reads. A test that pollutes the
    record it is meant to validate is worse than no test.
    """
    _clear_transactions(db, merchant_id)
    db.query(Merchant).filter(Merchant.id == merchant_id).delete()
    db.commit()


def main() -> int:
    db = SessionLocal()
    org = get_or_create_organization(db)
    merchant = get_or_create_merchant(db, org.id, MERCHANT_CODE)
    # Clear anything a previous run left, then take a fresh business row —
    # the purge removes the row itself, so re-creating it is required before
    # anything is seeded against its id.
    _purge(db, merchant.id)
    merchant = get_or_create_merchant(db, org.id, MERCHANT_CODE)

    try:
        _seed_normal(db, org.id, merchant.id)
        engine = AnomalyScoringEngine(db)
        base_day = datetime.utcnow().replace(hour=13, minute=0, second=0, microsecond=0)

        def score(amount: float, when: datetime) -> float:
            return engine.predict({
                "transaction_id": f"PROBE-{uuid.uuid4().hex[:8]}",
                "merchant_id": MERCHANT_CODE,
                "amount": amount,
                "timestamp": when.isoformat(),
            })["anomaly_score"]

        # Baseline: ordinary payments, scored as they are.
        real_scores = [score(NORMAL_AMOUNT, base_day.replace(hour=h)) for h in range(9, 17)]
        real_mean = mean(real_scores)
        print(f"Real payments        mean anomaly score: {real_mean:.3f}")

        manipulated = {}

        # 1. Amount inflated.
        manipulated["Amount inflated 8x"] = mean(
            score(NORMAL_AMOUNT * 8, base_day.replace(hour=h)) for h in range(9, 17)
        )

        # 2. Volume burst — a real burst, injected then scored.
        for i in range(120):
            db.add(Transaction(
                id=uuid.uuid4(), organization_id=org.id, merchant_id=merchant.id,
                transaction_ref=f"INJ-BURST-{i}-{uuid.uuid4().hex[:6]}",
                amount=Decimal(str(NORMAL_AMOUNT)), status="success", payment_type="p2b",
                created_at=base_day.replace(hour=11, minute=i % 60),
            ))
        db.commit()
        manipulated["Volume burst"] = score(NORMAL_AMOUNT, base_day.replace(hour=11, minute=59))

        # 3. Outside trading hours.
        manipulated["Dead of night"] = mean(
            score(NORMAL_AMOUNT, base_day.replace(hour=h)) for h in (2, 3, 4)
        )

        # 4. Duplicate: same amount moments earlier.
        dup_at = base_day.replace(hour=15, minute=30)
        db.add(Transaction(
            id=uuid.uuid4(), organization_id=org.id, merchant_id=merchant.id,
            transaction_ref=f"INJ-DUP-{uuid.uuid4().hex[:6]}",
            amount=Decimal("777.00"), status="success", payment_type="p2b",
            created_at=dup_at - timedelta(minutes=3),
        ))
        db.commit()
        manipulated["Duplicate amount"] = score(777.00, dup_at)

        print()
        results = []
        for name, why in MANIPULATIONS:
            got = manipulated[name]
            ratio = (got / real_mean) if real_mean > 0 else float("inf") if got > 0 else 0.0
            separated = got > real_mean
            results.append((name, got, ratio, separated))
            arrow = f"{ratio:.1f}x" if real_mean > 0 else ("detected" if got > 0 else "missed")
            print(f"  {name:22} {got:.3f}   ({arrow} baseline)  — {why}")
            print(f"  {'':22} {'PASS' if separated else 'FAIL'}: scored above ordinary trading")

        print("\n" + "-" * 70)
        missed = [n for n, _, _, ok in results if not ok]
        if real_mean > 0:
            overall = mean(g for _, g, _, _ in results) / real_mean
            print(f"  Mean separation across manipulations: {overall:.1f}x baseline")
            print("  BIS 1188 reported ~2x on the Canadian HVPS with an isolation forest.")
        else:
            print("  Ordinary trading scored 0.000 — the scorer is silent on normal activity,")
            print("  which is the desired baseline. Separation is therefore absolute.")

        if missed:
            print(f"\n  {len(missed)} manipulation(s) not separated: {', '.join(missed)}")
            return 1
        print("\n  Every manipulation scored above ordinary trading.")
        print("  This measures sensitivity, not a fraud detection rate — no confirmed")
        print("  cases exist, and none is claimed.")
        return 0
    finally:
        _purge(db, merchant.id)
        db.close()


if __name__ == "__main__":
    sys.exit(main())
