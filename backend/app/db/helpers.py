"""
Shared lookups and status-transition logging for the Wiebe-schema models.

Relationships between tables are enforced here (app layer), not via DB
foreign keys — see the module docstring in app/db/models.py.
"""

import logging
import os
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.models import (
    Merchant,
    MerchantStatusLog,
    Organization,
    User,
)

logger = logging.getLogger(__name__)

# The slug is the stable key every existing row already points at. It is
# deliberately not renamed alongside the display name: the slug identifies the
# tenant, the name is what a person reads.
DEFAULT_ORGANIZATION_SLUG = "wayame-soundbox"
DEFAULT_ORGANIZATION_NAME = "Buffr Intelligence"


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


def ensure_bootstrap_admin(db: Session) -> None:
    """Create the first admin user on a fresh deployment.

    Runs once, at startup: if any user already exists this is a no-op. There
    is no hardcoded default credential (the old mock login's "password" for
    every role is exactly the defect this closes) -- BOOTSTRAP_ADMIN_EMAIL
    and BOOTSTRAP_ADMIN_PASSWORD must both be set, or nothing is created and
    an operator has to seed the first account by hand (e.g. a one-off script
    calling hash_password() and inserting a User row directly)."""
    if db.query(User).filter(User.deleted_at.is_(None)).count() > 0:
        return

    email = os.getenv("BOOTSTRAP_ADMIN_EMAIL")
    password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD")
    if not email or not password:
        logger.warning(
            "No users exist and BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD "
            "are not set -- skipping bootstrap. No one can log in until a "
            "first user is created."
        )
        return

    org = get_or_create_organization(db)
    user = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=email.strip().lower(),
        password_hash=hash_password(password),
        display_name="Administrator",
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    logger.info(f"Bootstrap admin user created: {user.email}")
