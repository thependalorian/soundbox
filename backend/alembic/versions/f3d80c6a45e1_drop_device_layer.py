"""Drop the device tables and their references

Revision ID: f3d80c6a45e1
Revises: e7a2f4c81b53

The platform observes payment data shared under agreement. It has no
hardware estate, so the tables describing one carry no information about the
payment system and cannot be populated by anything that remains.

Two things worth knowing about the columns dropped here:

- `transactions.device_id`, `anomaly_alerts.device_id` and
  `analytics_events.device_id` were never written by any code path. They are
  NULL on every row, so nothing is lost.
- `users.merchant_id` scoped an account to a single supervised business.
  Every account now belongs to the supervising institution; a business is a
  subject of the analysis, not a caller of the API.

The forward direction is destructive by nature — a dropped table cannot be
soft-deleted. The downgrade recreates the structures so the migration
round-trips, but it cannot recover rows, and that is stated rather than
implied.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "f3d80c6a45e1"
down_revision = "e7a2f4c81b53"
branch_labels = None
depends_on = None

# (table, column) pairs that referenced a device.
DEVICE_FKS = [
    ("transactions", "device_id"),
    ("anomaly_alerts", "device_id"),
    ("analytics_events", "device_id"),
]


def upgrade() -> None:
    for table, column in DEVICE_FKS:
        op.drop_column(table, column)

    op.drop_column("merchants", "namqr_public_key_pem")
    op.drop_column("users", "merchant_id")

    # Children first: the logs reference a device id.
    op.drop_table("device_heartbeat_log")
    op.drop_table("device_status_log")
    op.drop_table("devices")


def downgrade() -> None:
    op.create_table(
        "devices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("device_code", sa.String(), nullable=False, unique=True),
        sa.Column("device_type_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("firmware_version", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("battery_level", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("signal_strength", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("api_key_hash", sa.String(), nullable=True),
        sa.Column("registered_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("last_heartbeat_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_devices_org_merchant", "devices", ["organization_id", "merchant_id"],
                    postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("ix_devices_org_status", "devices", ["organization_id", "status"],
                    postgresql_where=sa.text("deleted_at IS NULL"))

    op.create_table(
        "device_status_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_device_status_log_device", "device_status_log", ["device_id", "created_at"])
    op.create_index("ix_device_status_log_actor", "device_status_log",
                    ["organization_id", "actor_user_id", "created_at"])

    op.create_table(
        "device_heartbeat_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("battery_level", sa.Integer(), nullable=True),
        sa.Column("signal_strength", sa.Integer(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_device_heartbeat_device_recorded", "device_heartbeat_log",
                    ["device_id", "recorded_at"])

    op.add_column("users", sa.Column("merchant_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("merchants", sa.Column("namqr_public_key_pem", sa.Text(), nullable=True))
    for table, column in DEVICE_FKS:
        op.add_column(table, sa.Column(column, postgresql.UUID(as_uuid=True), nullable=True))
