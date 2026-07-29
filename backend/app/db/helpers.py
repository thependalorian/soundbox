"""
Shared lookups and status-transition logging for the Wiebe-schema models.

Relationships between tables are enforced here (app layer), not via DB
foreign keys — see the module docstring in app/db/models.py.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import (
    Merchant,
    MerchantStatusLog,
    Organization,
)

DEFAULT_ORGANIZATION_SLUG = "wayame-soundbox"
DEFAULT_ORGANIZATION_NAME = "SoundBox"


def get_or_create_organization(
    db: Session,
    slug: str = DEFAULT_ORGANIZATION_SLUG,
    name: str = DEFAULT_ORGANIZATION_NAME,
) -> Organization:
    """Fetch the operating tenant, creating the seed row on first use."""
    org = db.query(Organization).filter(Organization.slug == slug).first()
    if org:
        return org
    org = Organization(id=uuid.uuid4(), name=name, slug=slug)
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


def get_or_create_merchant(
    db: Session,
    organization_id: uuid.UUID,
    merchant_code: str,
    legal_name: Optional[str] = None,
) -> Merchant:
    """Resolve the business-facing merchant_id (e.g. "M-101") used by device/
    payment API payloads to an internal Merchant row, creating a
    pending_kyc placeholder if this merchant hasn't been onboarded yet."""
    merchant = (
        db.query(Merchant)
        .filter(Merchant.merchant_code == merchant_code)
        .first()
    )
    if merchant:
        return merchant

    merchant = Merchant(
        id=uuid.uuid4(),
        organization_id=organization_id,
        merchant_code=merchant_code,
        legal_name=legal_name or merchant_code,
        status="pending_kyc",
    )
    db.add(merchant)
    db.commit()
    db.refresh(merchant)

    db.add(
        MerchantStatusLog(
            id=uuid.uuid4(),
            organization_id=organization_id,
            merchant_id=merchant.id,
            from_status=None,
            to_status="pending_kyc",
            note="Auto-created on first device/transaction reference.",
        )
    )
    db.commit()
    return merchant


def log_status_change(
    db: Session,
    log_model: type,
    organization_id: uuid.UUID,
    entity_fk_field: str,
    entity_id: uuid.UUID,
    from_status: Optional[str],
    to_status: str,
    note: Optional[str] = None,
    actor_user_id: Optional[uuid.UUID] = None,
) -> None:
    """Append a row to a `*_status_log` table. Does not commit — callers
    should commit alongside the fast-read status update on the parent row
    so both land in the same transaction."""
    kwargs = {
        "id": uuid.uuid4(),
        "organization_id": organization_id,
        entity_fk_field: entity_id,
        "from_status": from_status,
        "to_status": to_status,
        "note": note,
        "created_at": datetime.utcnow(),
    }
    if "actor_user_id" in log_model.__table__.columns.keys():
        kwargs["actor_user_id"] = actor_user_id
    db.add(log_model(**kwargs))
