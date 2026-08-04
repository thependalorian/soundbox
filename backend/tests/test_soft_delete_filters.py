"""Guard the soft-delete filter on every tenant-scoped read.

Soft deletes are the only deletion this schema has (workspace CLAUDE.md §2).
That makes `deleted_at IS NULL` load-bearing on every read: a withdrawn
record that is not filtered out does not disappear, it silently keeps
counting.

This test exists because that failure already happened, at scale and in the
worst possible place. Three services — `analytics_service`, `anomaly_scoring`
and `regulatory_reporting` — query the ORM directly instead of going through
`PaymentRepository`, which is the module that exists to enforce exactly this.
Thirty-eight query blocks across them omitted the filter. Four were in
`regulatory_reporting`, which means **withdrawn payments were being counted
into the PSD-6 return to the Bank of Namibia.**

Nothing about that failed loudly. Every individual query looked correct, the
totals looked plausible, and the only way to notice was to withdraw a payment
and check whether the number moved. That is precisely the kind of defect a
test has to catch, because review will not.

The check is structural rather than behavioural: it reads the source, finds
every query block that constrains `<Model>.organization_id` for a model
carrying `deleted_at`, and asserts the same block also constrains
`deleted_at` — unless the site is listed in EXEMPT below with a reason.

Run:  cd backend && PYTHONPATH=. python tests/test_soft_delete_filters.py
"""

import re
import pathlib
import sys

APP = pathlib.Path(__file__).resolve().parents[1] / "app"

# Sites where omitting the filter is correct, each with the reason it is
# correct. A new entry here should be rare and must explain itself.
#
# Both of these are uniqueness pre-checks against a column that is UNIQUE at
# the database level. A withdrawn row still occupies its code, so filtering
# soft-deleted rows out would report the code as available and then fail on
# INSERT with an integrity error the caller cannot act on.
EXEMPT = {
    ("api/resources.py", "Merchant"): "merchant_code uniqueness pre-check (UNIQUE at DB level)",
}

# Where a query block is considered to end.
TERMINATORS = re.compile(r"\.(all|count|scalar|first|one|update|delete|exists)\(")


def soft_deletable_models() -> set:
    """Models carrying a `deleted_at` column, read from models.py itself so
    the guard cannot drift from the schema."""
    src = (APP / "db" / "models.py").read_text()
    return {
        name
        for name, body in re.findall(r"class (\w+)\(Base\):(.*?)(?=\nclass |\Z)", src, re.S)
        if "deleted_at" in body
    }


def offending_blocks(models: set) -> list:
    """Every tenant-scoped query block that does not constrain deleted_at."""
    out = []
    for path in sorted(APP.rglob("*.py")):
        if path.name == "models.py":
            continue
        rel = str(path.relative_to(APP))
        lines = path.read_text().split("\n")
        for i, line in enumerate(lines):
            m = re.search(r"(\w+)\.organization_id\s*==", line)
            if not m or m.group(1) not in models:
                continue
            model = m.group(1)

            # Widen to the enclosing statement: back to `query(`, forward to
            # whichever method executes it.
            start = i
            while start > 0 and "query(" not in lines[start]:
                start -= 1
            end = i
            while end < len(lines) - 1 and not TERMINATORS.search(lines[end]):
                end += 1

            block = "\n".join(lines[start : end + 1])
            if "deleted_at" in block:
                continue
            if (rel, model) in EXEMPT:
                continue
            out.append((rel, i + 1, model))
    return out


def main() -> int:
    models = soft_deletable_models()
    if not models:
        print("FAIL: found no soft-deletable models — the guard cannot be trusted.")
        return 1

    print(f"Soft-deletable models: {len(models)}")
    print(f"Documented exemptions: {len(EXEMPT)}")
    for (rel, model), why in sorted(EXEMPT.items()):
        print(f"  - {rel} [{model}]: {why}")

    offenders = offending_blocks(models)
    print()
    if offenders:
        print(f"FAIL: {len(offenders)} tenant-scoped query block(s) do not filter deleted_at.\n")
        for rel, line, model in offenders:
            print(f"  {rel}:{line}  [{model}]")
        print(
            "\nA withdrawn record read by one of these still counts. Add\n"
            "  <Model>.deleted_at.is_(None)\n"
            "to the filter, or route the read through app/data/payment_repository.py,\n"
            "which applies it for you. If omitting it is genuinely correct, add the\n"
            "site to EXEMPT in this file with the reason."
        )
        return 1

    print("PASS: every tenant-scoped read filters soft-deleted rows.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
