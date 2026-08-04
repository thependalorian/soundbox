"""Generate synthetic payment data for Phase 0 validation.

No IPN data is required to build and demonstrate the analytics. This script
produces a population with the structure the real rails would have — regional
spread, weekly and month-end seasonality, a payment-type and instrument mix —
plus a set of deliberately manipulated rows to validate anomaly detection
against.

**Manipulating known-good rows and checking whether the model catches them is
the validation method itself, not a convenience.** There is no confirmed-fraud
ground truth in Namibia to train or test against, so the only honest way to
measure a detector before real data exists is to introduce anomalies you
control and see whether they are found. The same approach is used in the
published two-layer architecture this platform's methodology follows.

Everything written here is marked synthetic:

- Businesses use the `SYN-` merchant-code prefix.
- Payments use the `SYN-` transaction-reference prefix.
- Deliberately manipulated payments additionally carry `injected` in
  `payer_info`, so a reader of the raw table can tell which rows were planted.

That marking is what makes the script safe to run against a shared database
and makes `--purge` exact. It also means a figure produced from seeded data can
never be mistaken for a figure produced from real data.

Idempotent: re-running tops the population back up rather than duplicating it.

Run:
    cd backend && source venv/bin/activate
    PYTHONPATH=. python scripts/seed_synthetic.py            # seed
    PYTHONPATH=. python scripts/seed_synthetic.py --purge    # remove it all
"""

from __future__ import annotations

import argparse
import random
import sys
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from app.db.helpers import get_or_create_organization
from app.db.models import Merchant, Transaction, TypeDefinition
from app.db.namibia_geography import NAMIBIA_CONSTITUENCIES
from app.db.session import SessionLocal
from app.db.type_definitions_seed import seed_type_definitions

PREFIX = "SYN-"

# Enough history for a weekly seasonal fit and a month-end effect to be
# visible. The forecaster needs four weeks minimum before it will return a
# number at all, so anything shorter would leave that surface untestable.
DAYS_OF_HISTORY = 120

# Businesses per region. Deliberately uneven: a uniform spread would make the
# concentration and inclusion measures return meaningless, flat answers, and
# those measures exist precisely to show where activity is not.
MERCHANTS_PER_REGION = {
    "khomas": 14, "erongo": 8, "oshana": 6, "otjozondjupa": 5,
    "omusati": 4, "ohangwena": 4, "oshikoto": 3, "kavango_east": 3,
    "hardap": 2, "karas": 2, "zambezi": 2, "kunene": 2,
    "omaheke": 1, "kavango_west": 1,
}

TRADING_NAMES = [
    "Corner Shop", "Market Stall", "Fuel Stop", "Cash Point", "Kapana Grill",
    "Salon", "Hardware", "Bottle Store", "Bakery", "Taxi Rank", "Spaza",
    "Butchery", "Phone Shop", "Tuck Shop", "Car Wash",
]

# The full use-case taxonomy, weighted to what a retail rail actually carries.
#
# **Every code in the `payment_type` type_definitions domain appears here.**
# Seeding only the common ones leaves the rarer flows — business-to-business,
# tax and fee payments to government, government paying suppliers — with no
# rows at all, and a measure that silently returns nothing for a whole use
# case looks identical to a measure reporting that the use case is quiet.
# The oversight question "which use cases are lagging" cannot be asked of a
# dataset that never contained them.
#
# Weights are the shape, not a forecast: person-to-business dominates the
# counter, agent cash-in and cash-out are common, government disbursement is
# periodic and large, and the business and government flows are genuinely
# rarer but not absent.
PAYMENT_TYPES = (
    ["p2b"] * 40           # consumer to business — the counter sale
    + ["p2p"] * 18         # person to person
    + ["cash_out_merchant"] * 9
    + ["cash_in_merchant"] * 6
    + ["b2p"] * 6          # business to consumer — wages, refunds, payouts
    + ["g2p"] * 5          # government to person — grants
    + ["b2b"] * 6          # business to business — supplier settlement
    + ["atm_withdrawal"] * 4
    + ["p2g"] * 3          # person to government — fees, fines
    + ["b2g"] * 2          # business to government — tax, licences
    + ["g2b"] * 1          # government to business — supplier payment
)

# Wallet share is the financial-inclusion signal, so it must be present and
# must vary — a constant split would make the inclusion metric untestable.
INSTRUMENTS = ["wallet"] * 58 + ["bank_account"] * 42

# Individuals, not only businesses.
#
# **Both sides of a payment need a stable identifier, or the strongest feature
# family in the published methodology cannot be computed at all.** That work
# ranks "time since the last payment received from this same counterparty" as
# its single most important predictor. A dataset that records only which
# business was paid can express none of that: there is no counterparty to
# measure against.
#
# Individuals also transact in their own right — person-to-person is a live
# use case, and the participant count grows as more institutions onboard, so
# treating a business as the only kind of participant understates the network
# permanently.
#
# The identifier is a token, never a phone number and never a national ID.
# That is the same shape the real agreement is scoped to: enough to link a
# counterparty's payments to each other, and not enough to identify a person.
INDIVIDUALS = 900

# Who is on each side of each use case. Derived from the code itself rather
# than guessed per row: "p2b" says person pays business, and the data should
# say the same thing.
PAYER_KIND = {
    "p2b": "individual", "p2p": "individual", "p2g": "individual",
    "cash_in_merchant": "individual", "atm_withdrawal": "individual",
    "b2p": "business", "b2b": "business", "b2g": "business",
    "cash_out_merchant": "business",
    "g2p": "government", "g2b": "government",
}
PAYEE_KIND = {
    "p2b": "business", "p2p": "individual", "p2g": "government",
    "cash_in_merchant": "business", "atm_withdrawal": "individual",
    "b2p": "individual", "b2b": "business", "b2g": "government",
    "cash_out_merchant": "individual",
    "g2p": "individual", "g2b": "business",
}

WEEKDAY_WEIGHT = {0: 0.9, 1: 0.85, 2: 0.9, 3: 1.0, 4: 1.35, 5: 1.6, 6: 0.5}

# When each use case happens during the day, as (mean hour, spread).
#
# **This is load-bearing, not decoration.** The first analytical layer predicts
# a payment's submission time from its other attributes, and treats the ones it
# gets wrong as unusual. If submission time were drawn independently of
# everything else, that layer would be predicting noise and could never do
# better than chance — the data would make the method untestable rather than
# the method failing.
#
# The shape below is what a retail rail plausibly looks like: grant
# disbursements land in the morning, counter retail runs through the day and
# peaks late afternoon, and agent cash-out clusters early when float is
# available.
HOUR_PROFILE = {
    "g2p": (9.5, 1.6),                 # grants land early
    "b2g": (9.8, 1.5),                 # tax and licence payments, office hours
    "g2b": (10.2, 1.6),                # government paying a supplier
    "b2b": (10.8, 1.9),                # supplier settlement, business hours
    "b2p": (10.5, 2.0),                # wages and payouts
    "cash_out_merchant": (10.0, 2.2),  # agent float is available early
    "cash_in_merchant": (11.5, 2.4),
    "p2g": (12.0, 2.6),                # fees and fines, spread across the day
    "atm_withdrawal": (13.0, 3.4),
    "p2p": (14.5, 3.2),
    "p2b": (15.5, 2.8),                # the counter peaks late afternoon
}


def _payer_token(rng: random.Random) -> str:
    """A stable, non-identifying token for one payer.

    Zipf-ish rather than uniform: a minority of participants make most of the
    payments, which is what makes counterparty-relative features informative.
    A uniform draw would give every participant the same history length and
    flatten exactly the signal those features exist to carry.
    """
    n = min(int(abs(rng.gauss(0, INDIVIDUALS / 3))) + 1, INDIVIDUALS)
    return f"P{n:05d}"


def _minute_of_day(payment_type: str, rng: random.Random) -> int:
    """Submission time for a use case, in minutes past midnight.

    Drawn from that use case's own daily profile and clamped to trading hours,
    so time of day carries information about what kind of payment it is. See
    HOUR_PROFILE for why that dependence has to exist.
    """
    mean, spread = HOUR_PROFILE.get(payment_type, (14.0, 3.0))
    hour = min(max(rng.gauss(mean, spread), 6.5), 20.5)
    return int(hour * 60)


def _amount(payment_type: str, rng: random.Random) -> Decimal:
    """A plausible ticket for the use case.

    Separate distributions per type on purpose: a single distribution would
    collapse the value-distribution and Gini measures into noise, and those
    exist to show that a rising average is not the same as broadening reach.
    """
    if payment_type == "g2p":
        return Decimal(str(round(rng.uniform(600, 1400), 2)))
    if payment_type in ("cash_out_merchant", "cash_in_merchant"):
        return Decimal(str(round(rng.uniform(50, 900), 2)))
    if payment_type == "atm_withdrawal":
        return Decimal(str(round(rng.uniform(100, 2000), 2)))
    if payment_type == "b2p":
        return Decimal(str(round(rng.uniform(200, 2500), 2)))
    if payment_type == "b2b":
        # Supplier settlement is the largest ticket on a retail rail, and it
        # is what makes the value distribution genuinely long-tailed rather
        # than merely wide.
        return Decimal(str(round(rng.uniform(1500, 45000), 2)))
    if payment_type == "g2b":
        return Decimal(str(round(rng.uniform(3000, 60000), 2)))
    if payment_type == "b2g":
        return Decimal(str(round(rng.uniform(500, 18000), 2)))
    if payment_type == "p2g":
        return Decimal(str(round(rng.uniform(30, 900), 2)))
    if payment_type == "p2p":
        return Decimal(str(round(rng.uniform(20, 400), 2)))
    return Decimal(str(round(rng.uniform(8, 260), 2)))  # p2b, the counter


def seed(db, rng: random.Random) -> dict:
    org = get_or_create_organization(db)
    seed_type_definitions(db, org.id)

    regions = {
        r.code: r.id
        for r in db.query(TypeDefinition).filter(
            TypeDefinition.organization_id == org.id,
            TypeDefinition.domain == "region",
        ).all()
    }
    # Constituency, not only region.
    #
    # Oversight questions are asked at constituency level — "which
    # constituencies are being left behind" is a different question from
    # "which regions", and a region-only population makes the finer view
    # return nothing while still looking like it works. `merchants` carries
    # `constituency_id` and the analytics read it, so leaving it null here
    # would quietly disable a whole level of the drill-down.
    constituencies = {
        c.code: c.id
        for c in db.query(TypeDefinition).filter(
            TypeDefinition.organization_id == org.id,
            TypeDefinition.domain == "constituency",
        ).all()
    }

    existing = {
        m.merchant_code: m
        for m in db.query(Merchant).filter(
            Merchant.organization_id == org.id,
            Merchant.merchant_code.like(f"{PREFIX}%"),
        ).all()
    }

    merchants, created_m = [], 0
    for region_code, count in MERCHANTS_PER_REGION.items():
        region_id = regions.get(region_code)
        for i in range(count):
            # Full region code, not a truncation: kavango_east and
            # kavango_west both shorten to "KAVA" and collide on the unique
            # merchant_code constraint.
            code = f"{PREFIX}{region_code.upper()}-{i:02d}"
            m = existing.get(code)
            if m is None:
                # A minority stay pending or suspended. An all-active
                # population would make the acceptance-point measure report
                # every registered business as reachable, which is the
                # overstatement that measure is designed to avoid.
                roll = rng.random()
                status = "active" if roll < 0.85 else ("pending_kyc" if roll < 0.95 else "suspended")
                # Spread across that region's own constituencies rather than
                # all of them: a business in Khomas belongs to a Khomas
                # constituency, and a random national pick would put stalls in
                # places their region does not contain.
                in_region = NAMIBIA_CONSTITUENCIES.get(region_code, [])
                constituency_id = None
                if in_region:
                    # Weighted to the first few, so constituencies differ in
                    # activity. A flat spread would make the constituency
                    # drill-down report every area as identical.
                    pick = min(int(abs(rng.gauss(0, len(in_region) / 3))), len(in_region) - 1)
                    constituency_id = constituencies.get(in_region[pick][0])

                m = Merchant(
                    id=uuid.uuid4(),
                    organization_id=org.id,
                    merchant_code=code,
                    legal_name=f"{rng.choice(TRADING_NAMES)} {i} (Pty) Ltd",
                    trading_name=f"{rng.choice(TRADING_NAMES)} {region_code.title()} {i}",
                    status=status,
                    id_verification_status="verified" if status == "active" else "pending",
                    address={"region": region_code, "synthetic": True},
                    region_id=region_id,
                    constituency_id=constituency_id,
                    created_at=datetime.utcnow() - timedelta(days=rng.randint(30, DAYS_OF_HISTORY)),
                )
                db.add(m)
                created_m += 1
            merchants.append(m)
    db.commit()

    active = [m for m in merchants if m.status == "active"]

    already = db.query(Transaction).filter(
        Transaction.organization_id == org.id,
        Transaction.transaction_ref.like(f"{PREFIX}%"),
    ).count()
    if already:
        return {"merchants_created": created_m, "transactions_created": 0,
                "injected": 0, "note": f"{already} synthetic payments already present"}

    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    rows, created_t = [], 0
    for days_back in range(DAYS_OF_HISTORY, 0, -1):
        day = today - timedelta(days=days_back)
        # Month-end and the days just after carry salary and grant activity.
        month_end = 1.5 if day.day >= 28 or day.day <= 2 else 1.0
        # A gentle upward trend, so growth measures have something to find.
        trend = 1.0 + (DAYS_OF_HISTORY - days_back) / (DAYS_OF_HISTORY * 2.5)
        for m in active:
            n = int(rng.gauss(4, 1.4) * WEEKDAY_WEIGHT[day.weekday()] * month_end * trend)
            for _ in range(max(n, 0)):
                ptype = rng.choice(PAYMENT_TYPES)
                ts = day + timedelta(minutes=_minute_of_day(ptype, rng))
                rows.append(Transaction(
                    id=uuid.uuid4(),
                    organization_id=org.id,
                    merchant_id=m.id,
                    transaction_ref=f"{PREFIX}{uuid.uuid4().hex[:16]}",
                    amount=_amount(ptype, rng),
                    currency_code="NAD",
                    # A small failure share, so success rate and the health
                    # index are not a constant 100.
                    status="success" if rng.random() > 0.03 else "failed",
                    payment_type=ptype,
                    payer_instrument=rng.choice(INSTRUMENTS),
                    # Both sides identified by token. `payerToken` is what
                    # makes counterparty history computable; the alias is
                    # only what a reviewer sees on screen.
                    payer_info={
                        "alias": f"***{rng.randint(1000, 9999)}",
                        "payerToken": _payer_token(rng),
                        "payerKind": PAYER_KIND.get(ptype, "individual"),
                        "synthetic": True,
                    },
                    payee_info={
                        "merchantCode": m.merchant_code,
                        # A person-to-person payment is received by an
                        # individual, not by the business whose area it was
                        # recorded in. Saying otherwise would count every
                        # P2P payment as business revenue.
                        "payeeKind": PAYEE_KIND.get(ptype, "business"),
                        "payeeToken": (_payer_token(rng)
                                       if PAYEE_KIND.get(ptype) == "individual"
                                       else m.merchant_code),
                    },
                    response_time_ms=int(max(rng.gauss(180, 70), 40)),
                    created_at=ts,
                    verified_at=ts + timedelta(seconds=rng.randint(1, 4)),
                ))
                created_t += 1
        if len(rows) > 4000:
            db.bulk_save_objects(rows); db.commit(); rows = []
    if rows:
        db.bulk_save_objects(rows); db.commit()

    injected = _inject_anomalies(db, org.id, active, rng)
    return {"merchants_created": created_m, "transactions_created": created_t,
            "injected": injected, "note": ""}


def _inject_anomalies(db, org_id, merchants, rng: random.Random) -> int:
    """Plant anomalies of known shape, and label them.

    Three shapes, each matching a rule the scorer actually applies, so a
    validation run can report detection per shape rather than one aggregate
    number that hides which detector is doing the work.
    """
    now = datetime.utcnow()
    planted = []

    # 1. Amount far outside this business's own history.
    for m in rng.sample(merchants, min(4, len(merchants))):
        planted.append((m, Decimal("48000.00"), "amount_outlier", now - timedelta(hours=rng.randint(2, 40))))

    # 2. A burst: many payments in one hour at one business.
    burst_merchant = rng.choice(merchants)
    burst_at = now - timedelta(hours=6)
    for i in range(28):
        planted.append((burst_merchant, Decimal(str(round(rng.uniform(80, 300), 2))),
                        "velocity_burst", burst_at + timedelta(minutes=i)))

    # 3. Activity at an hour the business never trades.
    for m in rng.sample(merchants, min(3, len(merchants))):
        planted.append((m, Decimal(str(round(rng.uniform(400, 1200), 2))),
                        "off_hours", (now - timedelta(days=1)).replace(hour=3, minute=rng.randint(0, 59))))

    rows = [
        Transaction(
            id=uuid.uuid4(), organization_id=org_id, merchant_id=m.id,
            transaction_ref=f"{PREFIX}{uuid.uuid4().hex[:16]}",
            amount=amount, currency_code="NAD", status="success",
            payment_type="p2b", payer_instrument="wallet",
            # `injected` is what makes a planted row identifiable in the raw
            # table. A validation result that cannot be traced back to which
            # rows were planted is not a validation result.
            payer_info={
                "alias": "***0000", "synthetic": True, "injected": shape,
                "payerToken": "P00001", "payerKind": "individual",
            },
            payee_info={"merchantCode": m.merchant_code, "payeeKind": "business",
                        "payeeToken": m.merchant_code},
            response_time_ms=200, created_at=ts, verified_at=ts,
        )
        for m, amount, shape, ts in planted
    ]
    db.bulk_save_objects(rows)
    db.commit()
    return len(rows)


def purge(db) -> dict:
    org = get_or_create_organization(db)
    t = db.query(Transaction).filter(
        Transaction.organization_id == org.id,
        Transaction.transaction_ref.like(f"{PREFIX}%"),
    ).delete(synchronize_session=False)
    m = db.query(Merchant).filter(
        Merchant.organization_id == org.id,
        Merchant.merchant_code.like(f"{PREFIX}%"),
    ).delete(synchronize_session=False)
    db.commit()
    return {"transactions": t, "merchants": m}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--purge", action="store_true", help="remove all synthetic rows and exit")
    ap.add_argument("--seed", type=int, default=20260803, help="RNG seed, for a reproducible population")
    args = ap.parse_args()

    db = SessionLocal()
    try:
        if args.purge:
            r = purge(db)
            print(f"Removed {r['transactions']} synthetic payments and {r['merchants']} synthetic businesses.")
            return 0

        rng = random.Random(args.seed)
        r = seed(db, rng)
        print(f"Businesses created : {r['merchants_created']}")
        print(f"Payments created   : {r['transactions_created']}")
        print(f"Anomalies injected : {r['injected']}")
        if r["note"]:
            print(f"Note               : {r['note']}")
        print(f"\nAll rows carry the {PREFIX!r} prefix. Remove with --purge.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
