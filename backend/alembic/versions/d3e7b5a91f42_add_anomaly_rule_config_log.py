"""Add anomaly_rule_config_log

Anomaly rules move from Python constants into type_definitions rows, so a
threshold change becomes an UPDATE rather than a deploy. That flexibility is
only acceptable with an immutable record of who changed what, which is what
this table holds. No status_log companion: this table *is* a log.

Revision ID: d3e7b5a91f42
Revises: c8f1a26d90b3
"""
from alembic import op
import sqlalchemy as sa

revision = "d3e7b5a91f42"
down_revision = "c8f1a26d90b3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "anomaly_rule_config_log",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("domain", sa.String(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("field", sa.String(), nullable=False),
        sa.Column("from_value", sa.String(), nullable=True),
        sa.Column("to_value", sa.String(), nullable=True),
        sa.Column("changed_by", sa.String(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_anomaly_rule_config_log_org_at",
        "anomaly_rule_config_log",
        ["organization_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_anomaly_rule_config_log_org_at", table_name="anomaly_rule_config_log")
    op.drop_table("anomaly_rule_config_log")
