"""Add actor_user_id to the status logs that lacked it

Revision ID: e7a2f4c81b53
Revises: d5b93c07e142

Five append-only logs recorded *what* changed without a structured record of
*who* changed it: device, settlement, transaction, e-money wallet and security
incident. The identity was not missing from the request — every write handler
already resolves `actor: User` from the verified JWT — it was being written
into the free-text `note` column as prose:

    note="Decided by {actor.display_name}."

That is readable and unqueryable. "Show me everything this account changed"
required string-matching a display name across notes, and a renamed user broke
the match. `merchant_status_log` had the column and still went unpopulated for
all 35 of its rows.

This adds the column everywhere it was absent and leaves the prose in place —
the note carries context a foreign key cannot ("was assigned to X, was Y"),
so the two are complements rather than duplicates.

Existing rows keep NULL. Backfilling from the note text would mean guessing an
account from a display name, and a wrong actor on an audit row is worse than
an absent one.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "e7a2f4c81b53"
down_revision = "d5b93c07e142"
branch_labels = None
depends_on = None

TABLES = [
    "device_status_log",
    "settlement_status_log",
    "transaction_status_log",
    "e_money_wallet_status_log",
    "security_incident_status_log",
]


def upgrade() -> None:
    for t in TABLES:
        op.add_column(t, sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True))
        # Answers "what did this account change", which is the question the
        # column exists for. Not partial: a log row is never soft-deleted.
        op.create_index(f"ix_{t}_actor", t, ["organization_id", "actor_user_id", "created_at"])


def downgrade() -> None:
    for t in TABLES:
        op.drop_index(f"ix_{t}_actor", table_name=t)
        op.drop_column(t, "actor_user_id")
