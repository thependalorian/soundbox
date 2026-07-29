"""Make tenant indexes partial on active records

Revision ID: c4f8a21b7d90
Revises: b7c3e10d94af

Workspace CLAUDE.md §2 requires active-record indexes to be partial —
`WHERE deleted_at IS NULL`. Every composite tenant index predated that rule
and indexed withdrawn rows alongside live ones.

Why it matters here specifically: soft deletes only ever accumulate, and
SoundBox reports on all traffic carried by the WayaMe rails rather than only
the payments its own devices confirm. The row count is therefore set by
national instant-payment adoption, and an index that also carries every
withdrawn record grows without bound against queries that never want those
rows.

These are plain DROP/CREATE rather than CREATE INDEX CONCURRENTLY. At the
current table sizes that is instantaneous. Against a populated production
table it would take a write lock, so re-run this pattern concurrently and
outside a transaction if it is ever applied to a large deployment.
"""
from alembic import op
import sqlalchemy as sa

revision = "c4f8a21b7d90"
down_revision = "b7c3e10d94af"
branch_labels = None
depends_on = None

# (index name, table, column list)
INDEXES = [
    ("ix_anomaly_alerts_org_merchant", "anomaly_alerts", ["organization_id", "merchant_id"]),
    ("ix_anomaly_alerts_org_status", "anomaly_alerts", ["organization_id", "status"]),
    ("ix_devices_org_merchant", "devices", ["organization_id", "merchant_id"]),
    ("ix_devices_org_status", "devices", ["organization_id", "status"]),
    ("ix_wallets_org_status", "e_money_wallets", ["organization_id", "status"]),
    ("ix_media_assets_org_owner", "media_assets", ["organization_id", "owner_id"]),
    ("ix_media_assets_org_type", "media_assets", ["organization_id", "type_code"]),
    ("ix_merchants_org_region", "merchants", ["organization_id", "region_id"]),
    ("ix_merchants_org_status", "merchants", ["organization_id", "status"]),
    ("ix_security_incidents_org_status", "security_incidents", ["organization_id", "status"]),
    ("ix_settlements_org_merchant", "settlements", ["organization_id", "merchant_id"]),
    ("ix_transactions_org_instrument", "transactions", ["organization_id", "payer_instrument"]),
    ("ix_transactions_org_merchant_created", "transactions", ["organization_id", "merchant_id", "created_at"]),
    ("ix_transactions_org_status", "transactions", ["organization_id", "status"]),
    ("ix_users_org_role", "users", ["organization_id", "role"]),
]

ACTIVE_ONLY = "deleted_at IS NULL"


def upgrade() -> None:
    for name, table, cols in INDEXES:
        op.drop_index(name, table_name=table, if_exists=True)
        op.create_index(name, table, cols, postgresql_where=sa.text(ACTIVE_ONLY))


def downgrade() -> None:
    for name, table, cols in INDEXES:
        op.drop_index(name, table_name=table, if_exists=True)
        op.create_index(name, table, cols)
