"""rename fraud to anomaly

The system detects **anomalies**, not fraud. It has no labelled fraud
outcomes and no way to measure whether an anomaly is fraudulent — that is a
human judgement recorded afterwards. Naming the tables `fraud_*` told every
future reader otherwise.

`fraud_probability` was the worst of it: the value is
`min(sum(rule_contributions), 1.0)`, which is neither a probability (it is
not calibrated and comes from no likelihood) nor about fraud. Renamed to
`anomaly_score`, which is what it is.

Done now because both tables are empty. A rename with production history
behind it is a far larger piece of work, and the naming would have shaped
how everyone thought about the system in the meantime.

Revision ID: c8f1a26d90b3
Revises: 9b4d02f7c115
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'c8f1a26d90b3'
down_revision: Union[str, None] = '9b4d02f7c115'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.rename_table("fraud_alerts", "anomaly_alerts")
    op.rename_table("fraud_alert_status_log", "anomaly_alert_status_log")

    op.alter_column("anomaly_alerts", "fraud_probability", new_column_name="anomaly_score")
    op.alter_column("anomaly_alerts", "fraud_type", new_column_name="signal_type")
    op.alter_column("anomaly_alert_status_log", "fraud_alert_id", new_column_name="anomaly_alert_id")

    # The denormalised fast-read cache on the transaction itself.
    op.alter_column("transactions", "fraud_score", new_column_name="anomaly_score")

    for old, new in [
        ("ix_fraud_alerts_org_merchant", "ix_anomaly_alerts_org_merchant"),
        ("ix_fraud_alerts_org_status", "ix_anomaly_alerts_org_status"),
    ]:
        op.execute(f"ALTER INDEX IF EXISTS {old} RENAME TO {new}")


def downgrade() -> None:
    for new, old in [
        ("ix_anomaly_alerts_org_merchant", "ix_fraud_alerts_org_merchant"),
        ("ix_anomaly_alerts_org_status", "ix_fraud_alerts_org_status"),
    ]:
        op.execute(f"ALTER INDEX IF EXISTS {new} RENAME TO {old}")
    op.alter_column("transactions", "anomaly_score", new_column_name="fraud_score")
    op.alter_column("anomaly_alert_status_log", "anomaly_alert_id", new_column_name="fraud_alert_id")
    op.alter_column("anomaly_alerts", "signal_type", new_column_name="fraud_type")
    op.alter_column("anomaly_alerts", "anomaly_score", new_column_name="fraud_probability")
    op.rename_table("anomaly_alert_status_log", "fraud_alert_status_log")
    op.rename_table("anomaly_alerts", "fraud_alerts")
