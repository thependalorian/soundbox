"""
Wiebe-schema database models for the SoundBox backend.

Conventions (see workspace CLAUDE.md §2 and hotel-etuna-os/supabase/migrations
for the canonical in-repo example of this pattern):
  - UUID primary keys, generated client-side (Python `default=uuid.uuid4`,
    not a DB-side default) so retried writes can reuse the same id.
  - All `*_id` reference columns are bare UUIDs with no FK constraint and no
    ORM `relationship()` — relationships are enforced in the service layer
    (app/db/helpers.py), matching hotel-etuna-os's convention. This avoids
    DB-level cascades entirely (zero `ON DELETE CASCADE`).
  - Fixed lists (statuses, types) are never hardcoded as enums/CHECK
    constraints. They live as rows in `type_definitions` (domain + code);
    adding a new value is an INSERT, not a migration.
  - Every stateful entity has a fast-read `status` column plus an
    append-only `*_status_log` companion table.
  - Money is always `Numeric(15, 2)` with a `currency_code CHAR(3)` alongside
    (never Float/Double).
  - `organization_id` is the leading tenancy column on every operational
    table. Soft delete via `deleted_at`; no hard deletes.
  - Zero triggers, zero stored procedures, zero application logic in the DB.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CHAR,
    Column,
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


def uuid_pk() -> Column:
    """New UUID primary key column. Generated app-side (not a DB default) so
    idempotent retries can pass the same id and land on the same row."""
    return Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def ref_id(nullable: bool = False) -> Column:
    """Bare UUID reference to another table's id. No FK constraint — see
    module docstring."""
    return Column(UUID(as_uuid=True), nullable=nullable, index=True)


def money(nullable: bool = False, default=None) -> Column:
    return Column(Numeric(15, 2), nullable=nullable, default=default)


def currency() -> Column:
    return Column(CHAR(3), nullable=False, default="NAD")


# ---------------------------------------------------------------------------
# Tenancy
# ---------------------------------------------------------------------------

class Organization(Base):
    """The operating PSP/tenant. Single seed row today; the business plan's
    bank-partnership distribution channel implies white-label tenants later."""

    __tablename__ = "organizations"

    id = uuid_pk()
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, unique=True)
    default_currency_code = currency()
    status = Column(String, nullable=False, default="active")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)


class Merchant(Base):
    """The business receiving payments (this project's "property" equivalent).
    KYC / beneficial-ownership fields ground PSD-1 §8.4 and FIA (AML/CFT)."""

    __tablename__ = "merchants"

    id = uuid_pk()
    organization_id = ref_id()
    merchant_code = Column(String, nullable=False, unique=True, index=True)
    legal_name = Column(String, nullable=False)
    trading_name = Column(String, nullable=True)
    registration_number = Column(String, nullable=True)
    merchant_type_id = ref_id(nullable=True)  # type_definitions(domain='merchant_type')
    id_verification_status = Column(String, nullable=False, default="pending")
    fia_client_category = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending_kyc")
    contact_phone = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    address = Column(JSONB, nullable=False, default=dict)
    # Anchor location for maps/heatmap analytics (docs/device.md's "Geographic
    # Distribution" / "Merchant Activity Heatmaps" data products). Devices
    # don't carry their own lat/lng — they're installed at the merchant's
    # premises, so location lives here, one level up, to avoid duplicating
    # the same coordinates on every device row.
    lat = Column(Numeric(9, 6), nullable=True)
    lng = Column(Numeric(9, 6), nullable=True)
    region_id = ref_id(nullable=True)  # type_definitions(domain='region')
    constituency_id = ref_id(nullable=True)  # type_definitions(domain='constituency')
    local_authority_id = ref_id(nullable=True)  # type_definitions(domain='local_authority')
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_merchants_org_status", "organization_id", "status"),
        Index("ix_merchants_org_region", "organization_id", "region_id"),
    )


class MerchantBeneficialOwner(Base):
    """PSD-1 §8.4 beneficial ownership — a child table, not a JSON list,
    per the "never store a list in a column" rule."""

    __tablename__ = "merchant_beneficial_owners"

    id = uuid_pk()
    organization_id = ref_id()
    merchant_id = ref_id()
    full_name = Column(String, nullable=False)
    id_number = Column(String, nullable=False)
    ownership_percent = Column(Numeric(5, 2), nullable=False)
    is_pep = Column(Boolean, nullable=False, default=False)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)


class MerchantStatusLog(Base):
    __tablename__ = "merchant_status_log"

    id = uuid_pk()
    organization_id = ref_id()
    merchant_id = ref_id()
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    actor_user_id = ref_id(nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_merchant_status_log_merchant", "merchant_id", "created_at"),
    )


# ---------------------------------------------------------------------------
# Config: fixed lists as data, not enums
# ---------------------------------------------------------------------------

class TypeDefinition(Base):
    """Config-driven taxonomy replacing hardcoded status/type enums.
    Domains in use: device_type, device_status, merchant_type,
    merchant_status, transaction_status, payment_type, anomaly_risk_level,
    signal_type, wallet_status, settlement_status, incident_type, event_type.
    """

    __tablename__ = "type_definitions"

    id = uuid_pk()
    organization_id = ref_id()
    domain = Column(String, nullable=False, index=True)
    code = Column(String, nullable=False)
    label = Column(String, nullable=False)
    config = Column(JSONB, nullable=False, default=dict)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "domain", "code",
            name="uq_type_definition_org_domain_code",
        ),
    )


# ---------------------------------------------------------------------------
# Assets: devices
# ---------------------------------------------------------------------------

class Device(Base):
    """SoundBox device. `device_code` is the business/WayaMe-facing
    identifier (e.g. "SB-001"); `id` is the internal UUID PK."""

    __tablename__ = "devices"

    id = uuid_pk()
    organization_id = ref_id()
    # Nullable: a device in the warehouse has no business yet, and a device
    # recovered from a closed business has none again. Asserting otherwise
    # forced an invented assignment, which inflated coverage figures.
    merchant_id = ref_id(nullable=True)
    device_code = Column(String, nullable=False, unique=True, index=True)
    device_type_id = ref_id(nullable=True)  # type_definitions(domain='device_type')
    firmware_version = Column(String, nullable=False)
    status = Column(String, nullable=False, default="active")
    battery_level = Column(Integer, nullable=False, default=100)
    signal_strength = Column(Integer, nullable=False, default=0)
    registered_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_heartbeat_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_devices_org_merchant", "organization_id", "merchant_id"),
        Index("ix_devices_org_status", "organization_id", "status"),
    )


class DeviceStatusLog(Base):
    __tablename__ = "device_status_log"

    id = uuid_pk()
    organization_id = ref_id()
    device_id = ref_id()
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_device_status_log_device", "device_id", "created_at"),
    )


class DeviceHeartbeatLog(Base):
    """Persists device telemetry that was previously Redis-only (TTL'd and
    lost). Backs the "device/network health" analytics product pitched in
    docs/architecture.md."""

    __tablename__ = "device_heartbeat_log"

    id = uuid_pk()
    organization_id = ref_id()
    device_id = ref_id()
    battery_level = Column(Integer, nullable=True)
    signal_strength = Column(Integer, nullable=True)
    recorded_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_device_heartbeat_device_recorded", "device_id", "recorded_at"),
    )


# ---------------------------------------------------------------------------
# Payments (ledger-style; corrections are reversal rows, not UPDATEs)
# ---------------------------------------------------------------------------

class Transaction(Base):
    __tablename__ = "transactions"

    id = uuid_pk()
    organization_id = ref_id()
    merchant_id = ref_id()
    device_id = ref_id(nullable=True)
    transaction_ref = Column(String, nullable=False, unique=True, index=True)
    amount = money()
    currency_code = currency()
    status = Column(String, nullable=False, default="pending")
    payment_type = Column(String, nullable=False, default="p2b")
    # Bank account or mobile wallet. Wallet-funded volume is the clearest
    # available measure of whether the shift off cash is reaching people
    # without bank accounts, so it is a first-class column rather than a
    # detail buried inside payer_info.
    payer_instrument = Column(String, nullable=True)
    # PERSONAL DATA. Store the minimum the rails return and nothing more:
    # a masked alias and, where present, a display name. Never a full phone
    # number, national ID, or account number. Namibia's Data Protection Bill
    # is not yet law, but it is drafted along GDPR/POPIA lines — building to
    # that standard now is far cheaper than retrofitting it later.
    # See docs/privacy.md for the retention and minimisation rules.
    payer_info = Column(JSONB, nullable=False, default=dict)
    payee_info = Column(JSONB, nullable=False, default=dict)
    response_time_ms = Column(Integer, nullable=True)
    # Denormalized fast-read cache of the latest anomaly score for this
    # transaction (paired with the authoritative, model-versioned audit
    # trail in anomaly_alerts). Same fast-read-column + log pattern as status.
    anomaly_score = Column(Numeric(5, 4), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)
    settled_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index(
            "ix_transactions_org_merchant_created",
            "organization_id", "merchant_id", "created_at",
        ),
        Index("ix_transactions_org_status", "organization_id", "status"),
    )


class TransactionStatusLog(Base):
    __tablename__ = "transaction_status_log"

    id = uuid_pk()
    organization_id = ref_id()
    transaction_id = ref_id()
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_transaction_status_log_txn", "transaction_id", "created_at"),
    )


class Settlement(Base):
    __tablename__ = "settlements"

    id = uuid_pk()
    organization_id = ref_id()
    merchant_id = ref_id()
    amount = money()
    currency_code = currency()
    status = Column(String, nullable=False, default="pending")
    settlement_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    reference = Column(String, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_settlements_org_merchant", "organization_id", "merchant_id"),
    )


class SettlementStatusLog(Base):
    __tablename__ = "settlement_status_log"

    id = uuid_pk()
    organization_id = ref_id()
    settlement_id = ref_id()
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class SettlementTransaction(Base):
    """Junction table linking a settlement batch to the transactions it
    covers — replaces the old bare `Settlement.transaction_count` integer,
    which had no traceable link. This is the reconciliation artifact the
    fintech domain rule requires per money movement."""

    __tablename__ = "settlement_transactions"

    id = uuid_pk()
    organization_id = ref_id()
    settlement_id = ref_id()
    transaction_id = ref_id()
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint(
            "settlement_id", "transaction_id", name="uq_settlement_transaction",
        ),
    )


# ---------------------------------------------------------------------------
# E-money (PSD-3)
# ---------------------------------------------------------------------------

class EMoneyWallet(Base):
    __tablename__ = "e_money_wallets"

    id = uuid_pk()
    organization_id = ref_id()
    merchant_id = ref_id()
    wallet_code = Column(String, nullable=False, unique=True, index=True)
    balance = money(default=0)
    currency_code = currency()
    status = Column(String, nullable=False, default="active")
    last_transaction_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_wallets_org_status", "organization_id", "status"),
    )


class EMoneyWalletStatusLog(Base):
    __tablename__ = "e_money_wallet_status_log"

    id = uuid_pk()
    organization_id = ref_id()
    wallet_id = ref_id()
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class TrustAccountReconciliation(Base):
    """Immutable, append-only. PSD-3 trust-account reconciliation snapshot."""

    __tablename__ = "trust_account_reconciliations"

    id = uuid_pk()
    organization_id = ref_id()
    reconciliation_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    total_liabilities = money()
    trust_account_balance = money()
    surplus = money()
    currency_code = currency()
    reconciled_by = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# Fraud / AML + AI model governance
# ---------------------------------------------------------------------------

class AIModelVersion(Base):
    """Governance record for the scoring model. Every anomaly_alert
    references the model version that produced it, giving the risk-scoring
    pipeline the traceability NIST CSF 2.0 (Identify/Protect/Detect/Respond/
    Recover) and the EU AI Act's approach to high-impact automated decisions
    both call for."""

    __tablename__ = "ai_model_versions"

    id = uuid_pk()
    organization_id = ref_id()
    model_name = Column(String, nullable=False)
    version = Column(String, nullable=False)
    trained_at = Column(DateTime, nullable=True)
    feature_set = Column(JSONB, nullable=False, default=dict)
    performance_metrics = Column(JSONB, nullable=False, default=dict)
    approved_by = Column(String, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "model_name", "version",
            name="uq_model_org_name_version",
        ),
    )


class AnomalyAlert(Base):
    __tablename__ = "anomaly_alerts"

    id = uuid_pk()
    organization_id = ref_id()
    merchant_id = ref_id()
    transaction_id = ref_id(nullable=True)
    device_id = ref_id(nullable=True)
    model_version_id = ref_id(nullable=True)
    amount = money()
    currency_code = currency()
    anomaly_score = Column(Numeric(5, 4), nullable=False)
    risk_level = Column(String, nullable=False)
    signal_type = Column(String, nullable=True)
    status = Column(String, nullable=False, default="open")
    # Why the scorer flagged this alert: the rules that actually fired, with
    # their real numbers and per-rule contribution. Persisted so an analyst
    # (or an auditor) can reconstruct the reasoning months later, even after
    # the model version that produced it has been retired.
    explanation = Column(JSONB, nullable=False, default=dict)
    # anomaly_score x amount — the expected loss if this alert is real
    # and goes un-actioned. Triage queues sort by this, not by probability:
    # a 40% x N$50,000 alert outranks a 95% x N$500 one.
    expected_loss = money(nullable=True)
    detected_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_anomaly_alerts_org_merchant", "organization_id", "merchant_id"),
        Index("ix_anomaly_alerts_org_status", "organization_id", "status"),
    )


class AnomalyAlertStatusLog(Base):
    __tablename__ = "anomaly_alert_status_log"

    id = uuid_pk()
    organization_id = ref_id()
    anomaly_alert_id = ref_id()
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    actor_user_id = ref_id(nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# Compliance: regulatory reporting + security incidents
# ---------------------------------------------------------------------------

class RegulatoryReport(Base):
    """Persists what was actually generated/submitted for PSD-6, PSD-3, and
    other filings — closing the audit-trail gap where reports were only
    ever returned as ephemeral JSON."""

    __tablename__ = "regulatory_reports"

    id = uuid_pk()
    organization_id = ref_id()
    report_type = Column(String, nullable=False, index=True)
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)
    payload = Column(JSONB, nullable=False)
    generated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    generated_by = Column(String, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    submitted_reference = Column(String, nullable=True)

    __table_args__ = (
        Index(
            "ix_regulatory_reports_org_type_generated",
            "organization_id", "report_type", "generated_at",
        ),
    )


class SecurityIncident(Base):
    """PSD-12 operational/cybersecurity compliance: 24-hour incident
    reporting, RPO (5 min) / RTO (2 hr) tracking. No backing table existed
    before this redesign."""

    __tablename__ = "security_incidents"

    id = uuid_pk()
    organization_id = ref_id()
    incident_type_id = ref_id(nullable=True)  # type_definitions(domain='incident_type')
    severity = Column(String, nullable=False, default="low")
    status = Column(String, nullable=False, default="open")
    detected_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    reported_at = Column(DateTime, nullable=True)
    reported_to = Column(String, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    rpo_breached = Column(Boolean, nullable=False, default=False)
    rto_breached = Column(Boolean, nullable=False, default=False)
    description = Column(Text, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_security_incidents_org_status", "organization_id", "status"),
    )


class SecurityIncidentStatusLog(Base):
    __tablename__ = "security_incident_status_log"

    id = uuid_pk()
    organization_id = ref_id()
    security_incident_id = ref_id()
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = uuid_pk()
    organization_id = ref_id()
    event_type = Column(String, nullable=False, index=True)
    device_id = ref_id(nullable=True)
    merchant_id = ref_id(nullable=True)
    transaction_id = ref_id(nullable=True)
    event_data = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_analytics_events_org_type", "organization_id", "event_type"),
    )


# ---------------------------------------------------------------------------
# Media
# ---------------------------------------------------------------------------

class MediaAsset(Base):
    """Images attached to an entity — a merchant storefront, a device photo.

    The interface renders drawn illustrations today, which never go stale and
    need no storage. This table exists so real photography can be introduced
    later without a schema change: the read path and the alt-text contract are
    settled now, while they are cheap to settle.

    `alt_text` is NOT NULL deliberately. An image without a text alternative
    is unusable to anyone on a screen reader and unindexable besides, so the
    schema refuses to store one.
    """

    __tablename__ = "media_assets"

    id = uuid_pk()
    organization_id = ref_id()
    # type_definitions domain 'media_type': merchant_storefront, device_photo,
    # region_scene. A new kind of image is an INSERT, not a migration.
    type_code = Column(String, nullable=False)
    # Bare UUID of whatever the image belongs to — merchant, device, region.
    # Which table it points at is given by type_code, resolved in the app
    # layer like every other reference here.
    owner_id = ref_id(nullable=True)
    storage_key = Column(String, nullable=False)
    alt_text = Column(Text, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    status = Column(String, nullable=False, default="active")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_media_assets_org_type", "organization_id", "type_code"),
        Index("ix_media_assets_org_owner", "organization_id", "owner_id"),
    )


class MediaAssetStatusLog(Base):
    """Append-only companion, created with the table as the rules require."""

    __tablename__ = "media_asset_status_log"

    id = uuid_pk()
    organization_id = ref_id()
    media_asset_id = ref_id()
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    actor_user_id = ref_id(nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class AnomalyRuleConfigLog(Base):
    """Immutable record of every anomaly rule and policy change.

    The rules themselves live in `type_definitions`, which is mutable by
    design — an operator must be able to read the current threshold in one
    query. This table is the other half of that bargain: the current value is
    fast to read, and the history of how it got there cannot be rewritten.

    It matters because thresholds decide what a person is asked to look at.
    Without this, "the queue went quiet last month" has no answer.
    """

    __tablename__ = "anomaly_rule_config_log"

    id = uuid_pk()
    organization_id = ref_id()
    domain = Column(String, nullable=False)
    code = Column(String, nullable=False)
    field = Column(String, nullable=False)
    from_value = Column(String, nullable=True)
    to_value = Column(String, nullable=True)
    changed_by = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_anomaly_rule_config_log_org_at", "organization_id", "created_at"),
    )
