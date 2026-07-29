"""initial schema

Revision ID: 1c22b2586d66
Revises:
Create Date: 2026-07-27 18:16:35.224895

Wiebe-schema initial migration: tenancy (organizations/merchants),
type_definitions config table, devices, ledger-style transactions/
settlements, e-money, fraud/AI-model governance, regulatory compliance,
and analytics. See app/db/models.py module docstring for the conventions
(UUID PKs, bare-UUID references with no FK/cascade, NUMERIC money +
currency_code, organization_id tenancy, deleted_at soft delete, fast-read
status + append-only *_status_log companions).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '1c22b2586d66'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _id_col():
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True)


def _ref_col(name, nullable=False):
    return sa.Column(name, postgresql.UUID(as_uuid=True), nullable=nullable)


def _money_col(name, nullable=False, server_default=None):
    return sa.Column(name, sa.Numeric(15, 2), nullable=nullable, server_default=server_default)


def _currency_col():
    return sa.Column("currency_code", sa.CHAR(3), nullable=False, server_default="NAD")


def _timestamps(created=True, updated=False, deleted=False):
    cols = []
    if created:
        cols.append(sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()))
    if updated:
        cols.append(sa.Column("updated_at", sa.DateTime(), nullable=True))
    if deleted:
        cols.append(sa.Column("deleted_at", sa.DateTime(), nullable=True))
    return cols


def upgrade() -> None:
    # -- Tenancy ----------------------------------------------------------
    op.create_table(
        "organizations",
        _id_col(),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("default_currency_code", sa.CHAR(3), nullable=False, server_default="NAD"),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        *_timestamps(updated=True, deleted=True),
    )
    op.create_unique_constraint("uq_organizations_slug", "organizations", ["slug"])

    op.create_table(
        "merchants",
        _id_col(),
        _ref_col("organization_id"),
        sa.Column("merchant_code", sa.String(), nullable=False),
        sa.Column("legal_name", sa.String(), nullable=False),
        sa.Column("trading_name", sa.String(), nullable=True),
        sa.Column("registration_number", sa.String(), nullable=True),
        _ref_col("merchant_type_id", nullable=True),
        sa.Column("id_verification_status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("fia_client_category", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending_kyc"),
        sa.Column("contact_phone", sa.String(), nullable=True),
        sa.Column("contact_email", sa.String(), nullable=True),
        sa.Column("address", postgresql.JSONB(), nullable=False, server_default="{}"),
        *_timestamps(updated=True, deleted=True),
    )
    op.create_unique_constraint("uq_merchants_merchant_code", "merchants", ["merchant_code"])
    op.create_index("ix_merchants_org_status", "merchants", ["organization_id", "status"])

    op.create_table(
        "merchant_beneficial_owners",
        _id_col(),
        _ref_col("organization_id"),
        _ref_col("merchant_id"),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("id_number", sa.String(), nullable=False),
        sa.Column("ownership_percent", sa.Numeric(5, 2), nullable=False),
        sa.Column("is_pep", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        *_timestamps(deleted=True),
    )
    op.create_index("ix_mbo_merchant", "merchant_beneficial_owners", ["merchant_id"])

    op.create_table(
        "merchant_status_log",
        _id_col(),
        _ref_col("organization_id"),
        _ref_col("merchant_id"),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        _ref_col("actor_user_id", nullable=True),
        *_timestamps(),
    )
    op.create_index("ix_merchant_status_log_merchant", "merchant_status_log", ["merchant_id", "created_at"])

    # -- Config -------------------------------------------------------------
    op.create_table(
        "type_definitions",
        _id_col(),
        _ref_col("organization_id"),
        sa.Column("domain", sa.String(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("label", sa.String(), nullable=False),
        sa.Column("config", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        *_timestamps(updated=True),
    )
    op.create_unique_constraint(
        "uq_type_definition_org_domain_code", "type_definitions",
        ["organization_id", "domain", "code"],
    )
    op.create_index("ix_type_definitions_domain", "type_definitions", ["domain"])

    # -- Assets: devices ------------------------------------------------
    op.create_table(
        "devices",
        _id_col(),
        _ref_col("organization_id"),
        _ref_col("merchant_id"),
        sa.Column("device_code", sa.String(), nullable=False),
        _ref_col("device_type_id", nullable=True),
        sa.Column("firmware_version", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("battery_level", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("signal_strength", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("registered_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("last_heartbeat_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_unique_constraint("uq_devices_device_code", "devices", ["device_code"])
    op.create_index("ix_devices_org_merchant", "devices", ["organization_id", "merchant_id"])
    op.create_index("ix_devices_org_status", "devices", ["organization_id", "status"])

    op.create_table(
        "device_status_log",
        _id_col(),
        _ref_col("organization_id"),
        _ref_col("device_id"),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        *_timestamps(),
    )
    op.create_index("ix_device_status_log_device", "device_status_log", ["device_id", "created_at"])

    op.create_table(
        "device_heartbeat_log",
        _id_col(),
        _ref_col("organization_id"),
        _ref_col("device_id"),
        sa.Column("battery_level", sa.Integer(), nullable=True),
        sa.Column("signal_strength", sa.Integer(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(
        "ix_device_heartbeat_device_recorded", "device_heartbeat_log", ["device_id", "recorded_at"],
    )

    # -- Payments -------------------------------------------------------
    op.create_table(
        "transactions",
        _id_col(),
        _ref_col("organization_id"),
        _ref_col("merchant_id"),
        _ref_col("device_id", nullable=True),
        sa.Column("transaction_ref", sa.String(), nullable=False),
        _money_col("amount"),
        _currency_col(),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("payment_type", sa.String(), nullable=False, server_default="p2m"),
        sa.Column("payer_info", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("payee_info", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("response_time_ms", sa.Integer(), nullable=True),
        sa.Column("fraud_score", sa.Numeric(5, 4), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.Column("settled_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_unique_constraint("uq_transactions_ref", "transactions", ["transaction_ref"])
    op.create_index(
        "ix_transactions_org_merchant_created", "transactions",
        ["organization_id", "merchant_id", "created_at"],
    )
    op.create_index("ix_transactions_org_status", "transactions", ["organization_id", "status"])

    op.create_table(
        "transaction_status_log",
        _id_col(),
        _ref_col("organization_id"),
        _ref_col("transaction_id"),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        *_timestamps(),
    )
    op.create_index(
        "ix_transaction_status_log_txn", "transaction_status_log", ["transaction_id", "created_at"],
    )

    op.create_table(
        "settlements",
        _id_col(),
        _ref_col("organization_id"),
        _ref_col("merchant_id"),
        _money_col("amount"),
        _currency_col(),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("settlement_date", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("reference", sa.String(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_settlements_org_merchant", "settlements", ["organization_id", "merchant_id"])

    op.create_table(
        "settlement_status_log",
        _id_col(),
        _ref_col("organization_id"),
        _ref_col("settlement_id"),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        *_timestamps(),
    )

    op.create_table(
        "settlement_transactions",
        _id_col(),
        _ref_col("organization_id"),
        _ref_col("settlement_id"),
        _ref_col("transaction_id"),
        *_timestamps(),
    )
    op.create_unique_constraint(
        "uq_settlement_transaction", "settlement_transactions", ["settlement_id", "transaction_id"],
    )

    # -- E-money (PSD-3) --------------------------------------------------
    op.create_table(
        "e_money_wallets",
        _id_col(),
        _ref_col("organization_id"),
        _ref_col("merchant_id"),
        sa.Column("wallet_code", sa.String(), nullable=False),
        _money_col("balance", server_default="0"),
        _currency_col(),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("last_transaction_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_unique_constraint("uq_wallets_wallet_code", "e_money_wallets", ["wallet_code"])
    op.create_index("ix_wallets_org_status", "e_money_wallets", ["organization_id", "status"])

    op.create_table(
        "e_money_wallet_status_log",
        _id_col(),
        _ref_col("organization_id"),
        _ref_col("wallet_id"),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        *_timestamps(),
    )

    op.create_table(
        "trust_account_reconciliations",
        _id_col(),
        _ref_col("organization_id"),
        sa.Column("reconciliation_date", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        _money_col("total_liabilities"),
        _money_col("trust_account_balance"),
        _money_col("surplus"),
        _currency_col(),
        sa.Column("reconciled_by", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        *_timestamps(),
    )

    # -- Fraud / AML + AI model governance -------------------------------
    op.create_table(
        "ai_model_versions",
        _id_col(),
        _ref_col("organization_id"),
        sa.Column("model_name", sa.String(), nullable=False),
        sa.Column("version", sa.String(), nullable=False),
        sa.Column("trained_at", sa.DateTime(), nullable=True),
        sa.Column("feature_set", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("performance_metrics", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("approved_by", sa.String(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_timestamps(),
    )
    op.create_unique_constraint(
        "uq_model_org_name_version", "ai_model_versions", ["organization_id", "model_name", "version"],
    )

    op.create_table(
        "fraud_alerts",
        _id_col(),
        _ref_col("organization_id"),
        _ref_col("merchant_id"),
        _ref_col("transaction_id", nullable=True),
        _ref_col("device_id", nullable=True),
        _ref_col("model_version_id", nullable=True),
        _money_col("amount"),
        _currency_col(),
        sa.Column("fraud_probability", sa.Numeric(5, 4), nullable=False),
        sa.Column("risk_level", sa.String(), nullable=False),
        sa.Column("fraud_type", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="open"),
        sa.Column("detected_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_fraud_alerts_org_merchant", "fraud_alerts", ["organization_id", "merchant_id"])
    op.create_index("ix_fraud_alerts_org_status", "fraud_alerts", ["organization_id", "status"])

    op.create_table(
        "fraud_alert_status_log",
        _id_col(),
        _ref_col("organization_id"),
        _ref_col("fraud_alert_id"),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        _ref_col("actor_user_id", nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        *_timestamps(),
    )

    # -- Compliance ---------------------------------------------------------
    op.create_table(
        "regulatory_reports",
        _id_col(),
        _ref_col("organization_id"),
        sa.Column("report_type", sa.String(), nullable=False),
        sa.Column("period_start", sa.DateTime(), nullable=True),
        sa.Column("period_end", sa.DateTime(), nullable=True),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("generated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("generated_by", sa.String(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("submitted_reference", sa.String(), nullable=True),
    )
    op.create_index(
        "ix_regulatory_reports_org_type_generated", "regulatory_reports",
        ["organization_id", "report_type", "generated_at"],
    )

    op.create_table(
        "security_incidents",
        _id_col(),
        _ref_col("organization_id"),
        _ref_col("incident_type_id", nullable=True),
        sa.Column("severity", sa.String(), nullable=False, server_default="low"),
        sa.Column("status", sa.String(), nullable=False, server_default="open"),
        sa.Column("detected_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("reported_at", sa.DateTime(), nullable=True),
        sa.Column("reported_to", sa.String(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("rpo_breached", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("rto_breached", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "ix_security_incidents_org_status", "security_incidents", ["organization_id", "status"],
    )

    op.create_table(
        "security_incident_status_log",
        _id_col(),
        _ref_col("organization_id"),
        _ref_col("security_incident_id"),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        *_timestamps(),
    )

    # -- Analytics --------------------------------------------------------
    op.create_table(
        "analytics_events",
        _id_col(),
        _ref_col("organization_id"),
        sa.Column("event_type", sa.String(), nullable=False),
        _ref_col("device_id", nullable=True),
        _ref_col("merchant_id", nullable=True),
        _ref_col("transaction_id", nullable=True),
        sa.Column("event_data", postgresql.JSONB(), nullable=False, server_default="{}"),
        *_timestamps(),
    )
    op.create_index("ix_analytics_events_org_type", "analytics_events", ["organization_id", "event_type"])


def downgrade() -> None:
    op.drop_table("analytics_events")
    op.drop_table("security_incident_status_log")
    op.drop_table("security_incidents")
    op.drop_table("regulatory_reports")
    op.drop_table("fraud_alert_status_log")
    op.drop_table("fraud_alerts")
    op.drop_table("ai_model_versions")
    op.drop_table("trust_account_reconciliations")
    op.drop_table("e_money_wallet_status_log")
    op.drop_table("e_money_wallets")
    op.drop_table("settlement_transactions")
    op.drop_table("settlement_status_log")
    op.drop_table("settlements")
    op.drop_table("transaction_status_log")
    op.drop_table("transactions")
    op.drop_table("device_heartbeat_log")
    op.drop_table("device_status_log")
    op.drop_table("devices")
    op.drop_table("type_definitions")
    op.drop_table("merchant_status_log")
    op.drop_table("merchant_beneficial_owners")
    op.drop_table("merchants")
    op.drop_table("organizations")
