"""Guard the census denominators.

Every access-per-adult figure this platform reports divides by these numbers.
A typo in one of them does not fail loudly — it produces a plausible figure
for one region that is quietly wrong, and that figure can end up in a return
to the Bank of Namibia.

The check that catches it is arithmetic the source already provides: the
fourteen regional populations must sum to the published national total. A
transposed digit almost always breaks that sum, which is why it is worth
asserting rather than trusting.

This is also a correction with history. An earlier revision of the table was
written from memory: nine of the fourteen figures were wrong, the largest
error being Zambezi at 106,633 against an actual 142,373 — a 25% understatement
that would have inflated that region's access-per-adult by a third. The
figures were then verified against the 2023 census. This test exists so the
next person to touch the table does not have to repeat that discovery.

Source: Namibia Statistics Agency, 2023 Population and Housing Census Main
Report (published 30 October 2024).

Run:  cd backend && source venv/bin/activate && python -m tests.test_census_figures
"""

import sys

from app.db.namibia_geography import (
    NAMIBIA_ADULT_SHARE,
    NAMIBIA_CENSUS_TOTAL,
    NAMIBIA_REGION_POPULATION,
)

EXPECTED_REGIONS = 14

# Spot checks on the two extremes, both widely published. If the table were
# ever replaced wholesale with figures from a different census year, the sum
# might still reconcile internally while every value moved; these would not.
KNOWN = {
    "khomas": 494_605,   # most populous
    "omaheke": 102_881,  # least populous
}


def main() -> int:
    failures = []

    count = len(NAMIBIA_REGION_POPULATION)
    if count != EXPECTED_REGIONS:
        failures.append(f"Expected {EXPECTED_REGIONS} regions, found {count}.")
    print(f"  Regions in table: {count}")

    total = sum(NAMIBIA_REGION_POPULATION.values())
    if total != NAMIBIA_CENSUS_TOTAL:
        failures.append(
            f"Regional populations sum to {total:,}, published national total is "
            f"{NAMIBIA_CENSUS_TOTAL:,} (difference {total - NAMIBIA_CENSUS_TOTAL:+,}). "
            f"One of the fourteen figures is wrong."
        )
    print(f"  Sum: {total:,}  Published: {NAMIBIA_CENSUS_TOTAL:,}  "
          f"{'reconciles' if total == NAMIBIA_CENSUS_TOTAL else 'DOES NOT RECONCILE'}")

    for code, expected in KNOWN.items():
        actual = NAMIBIA_REGION_POPULATION.get(code)
        if actual != expected:
            failures.append(f"{code}: expected {expected:,}, found {actual:,}.")
    print(f"  Spot checks: {', '.join(KNOWN)}")

    # A share outside this range is a units error — someone has written 62.9
    # where 0.629 was meant, which would shrink every access figure by a
    # hundredfold without looking obviously wrong on the page.
    if not 0.4 <= NAMIBIA_ADULT_SHARE <= 0.8:
        failures.append(
            f"Adult share is {NAMIBIA_ADULT_SHARE}, outside the plausible 0.4-0.8 "
            f"range. Expected a fraction, not a percentage."
        )
    adults = int(total * NAMIBIA_ADULT_SHARE)
    print(f"  Adult basis (15+): {NAMIBIA_ADULT_SHARE:.1%} -> {adults:,} adults")

    # Every region needs a population, or its access figure silently vanishes
    # while the national figure still prints.
    missing = [c for c, v in NAMIBIA_REGION_POPULATION.items() if not v or v <= 0]
    if missing:
        failures.append(f"Regions with no usable population: {', '.join(missing)}.")

    print("\n" + "-" * 70)
    if failures:
        print("  FAIL")
        for f in failures:
            print(f"    {f}")
        return 1

    print("  All checks pass. The denominators behind every access figure")
    print("  reconcile to the published census total.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
