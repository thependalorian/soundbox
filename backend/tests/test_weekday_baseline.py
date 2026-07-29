"""Proof that velocity scoring is seasonally fair.

The old rules fired on absolute thresholds — more than 10 payments in an
hour, more than 50 in a day. Payment activity is strongly seasonal by day of
week, so an absolute bar flags *busy trading* rather than *unusual trading*,
and it does so hardest for the businesses with the sharpest weekly cycle:
market vendors, taxi drivers and cash agents. That is a systematic bias
against exactly the segment the platform exists to include.

The test that matters is the third one: **the same absolute number of
payments is ordinary on a busy day and anomalous on a quiet one.** Under the
old rules both were flagged identically, which is precisely the defect.

Run:  cd backend && source venv/bin/activate && python -m tests.test_weekday_baseline
"""

import sys
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from app.db.helpers import get_or_create_merchant, get_or_create_organization
from app.db.models import Merchant, Transaction
from app.db.session import SessionLocal
from app.services.anomaly_scoring import AnomalyScoringEngine

# The merchant's trading shape: quiet midweek, busy Saturday. A real market
# stall, in other words.
SATURDAY_NORM = 40
WEEKDAY_NORM = 10
HISTORY_WEEKS = 12
TRADING_START = 8
TRADING_HOURS = 10

MERCHANT_CODE = "TEST-SEASONALITY"


def _seed_history(db, org_id, merchant_id) -> int:
    """Twelve weeks of trading with a pronounced weekly cycle."""
    created = 0
    today = datetime.utcnow().replace(hour=12, minute=0, second=0, microsecond=0)
    for days_back in range(1, HISTORY_WEEKS * 7 + 1):
        day = today - timedelta(days=days_back)
        count = SATURDAY_NORM if day.weekday() == 5 else WEEKDAY_NORM
        for i in range(count):
            # Spread across a 10-hour trading day. Clustering every payment
            # into one timestamp would give the merchant an unrealistically
            # spiky history and make any real burst look normal by
            # comparison — the test would then prove nothing.
            hour = TRADING_START + (i * TRADING_HOURS) // max(count, 1)
            db.add(Transaction(
                id=uuid.uuid4(),
                organization_id=org_id,
                merchant_id=merchant_id,
                transaction_ref=f"SEASON-{days_back}-{i}-{uuid.uuid4().hex[:6]}",
                amount=Decimal("100.00"),
                status="success",
                payment_type="p2b",
                created_at=day.replace(hour=hour, minute=(i * 7) % 60),
            ))
            created += 1
    db.commit()
    return created


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
        Transaction.transaction_ref.like("SEAS-%")
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


def _flagged_for_velocity(result) -> bool:
    return any(r["code"].startswith("velocity") for r in result["reasons"])


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
        n = _seed_history(db, org.id, merchant.id)
        print(f"Seeded {n} payments over {HISTORY_WEEKS} weeks "
              f"({SATURDAY_NORM}/Saturday, {WEEKDAY_NORM}/weekday)\n")

        engine = AnomalyScoringEngine(db)

        # Confirm the baselines were learned from history, not assumed.
        sat = engine._weekday_baseline(merchant.id, 5)
        tue = engine._weekday_baseline(merchant.id, 1)
        print(f"Learned baselines — Saturday: {sat}, Tuesday: {tue}")
        assert sat is not None and abs(sat - SATURDAY_NORM) < 1, f"Saturday baseline wrong: {sat}"
        assert tue is not None and abs(tue - WEEKDAY_NORM) < 1, f"Tuesday baseline wrong: {tue}"
        print("  baselines reflect this merchant's actual weekly cycle\n")

        results = []

        # 1. A busy but ordinary Saturday. Sixty payments is well over the old
        #    absolute bar of 50 and would have been flagged. It is 1.5x this
        #    merchant's own Saturday norm, which is simply a good day.
        today = datetime.utcnow()
        days_to_sat = (5 - today.weekday()) % 7
        saturday = (today + timedelta(days=days_to_sat)).replace(hour=14, minute=0)
        for i in range(60):
            db.add(Transaction(
                id=uuid.uuid4(), organization_id=org.id, merchant_id=merchant.id,
                transaction_ref=f"SAT-BUSY-{i}-{uuid.uuid4().hex[:6]}",
                amount=Decimal("100.00"), status="success", payment_type="p2b",
                created_at=saturday.replace(hour=TRADING_START + (i * TRADING_HOURS) // 60,
                                            minute=(i * 7) % 60),
            ))
        db.commit()
        r = engine.predict({
            "transaction_id": "SAT-BUSY", "merchant_id": MERCHANT_CODE,
            "amount": 100.0, "timestamp": saturday.isoformat(),
        })
        ok = not _flagged_for_velocity(r)
        results.append(("Busy Saturday (60 payments, 1.5x own norm)", "not flagged", ok))
        print(f"  1. Busy Saturday, 60 payments -> velocity flagged: "
              f"{_flagged_for_velocity(r)}  [{'PASS' if ok else 'FAIL'}]")

        # 2. A genuinely abnormal Saturday: 4x this merchant's own norm.
        for i in range(100):
            db.add(Transaction(
                id=uuid.uuid4(), organization_id=org.id, merchant_id=merchant.id,
                transaction_ref=f"SAT-WILD-{i}-{uuid.uuid4().hex[:6]}",
                amount=Decimal("100.00"), status="success", payment_type="p2b",
                # Deliberately concentrated: a genuine burst, not a busy day.
                created_at=saturday.replace(hour=13, minute=i % 60),
            ))
        db.commit()
        r = engine.predict({
            "transaction_id": "SAT-WILD", "merchant_id": MERCHANT_CODE,
            "amount": 100.0, "timestamp": saturday.isoformat(),
        })
        ok = _flagged_for_velocity(r)
        results.append(("Abnormal Saturday (160 payments, 4x own norm)", "flagged", ok))
        print(f"  2. Abnormal Saturday, 160 payments -> velocity flagged: "
              f"{_flagged_for_velocity(r)}  [{'PASS' if ok else 'FAIL'}]")
        if ok:
            for reason in r["reasons"]:
                if reason["code"].startswith("velocity"):
                    print(f"       \"{reason['detail']}\"")

        _clear_transactions(db, merchant.id)
        _seed_history(db, org.id, merchant.id)

        # 3. THE POINT OF ALL THIS. The same 60 payments, on a Tuesday.
        #    Identical absolute number to case 1 — ordinary there, six times
        #    the norm here. The old absolute rule could not tell these apart.
        days_to_tue = (1 - datetime.utcnow().weekday()) % 7
        tuesday = (datetime.utcnow() + timedelta(days=days_to_tue)).replace(hour=14, minute=0)
        for i in range(60):
            db.add(Transaction(
                id=uuid.uuid4(), organization_id=org.id, merchant_id=merchant.id,
                transaction_ref=f"TUE-{i}-{uuid.uuid4().hex[:6]}",
                amount=Decimal("100.00"), status="success", payment_type="p2b",
                created_at=tuesday.replace(hour=TRADING_START + (i * TRADING_HOURS) // 60,
                                           minute=(i * 7) % 60),
            ))
        db.commit()
        r = engine.predict({
            "transaction_id": "TUE-SPIKE", "merchant_id": MERCHANT_CODE,
            "amount": 100.0, "timestamp": tuesday.isoformat(),
        })
        ok = _flagged_for_velocity(r)
        results.append(("Same 60 payments on a Tuesday (6x own norm)", "flagged", ok))
        print(f"  3. Same 60 payments, but a Tuesday -> velocity flagged: "
              f"{_flagged_for_velocity(r)}  [{'PASS' if ok else 'FAIL'}]")
        if ok:
            for reason in r["reasons"]:
                if reason["code"].startswith("velocity"):
                    print(f"       \"{reason['detail']}\"")

        print("\n" + "-" * 68)
        failed = [name for name, _, passed in results if not passed]
        for name, expected, passed in results:
            print(f"  [{'PASS' if passed else 'FAIL'}] {name} -> {expected}")
        if failed:
            print(f"\n{len(failed)} case(s) failed.")
            return 1
        print("\nAll cases pass. The same volume is judged differently by weekday,")
        print("which is the whole point: busy is not the same as unusual.")
        return 0
    finally:
        _purge(db, merchant.id)
        db.close()


if __name__ == "__main__":
    sys.exit(main())
