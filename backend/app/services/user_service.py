"""Account lifecycle: creating users, changing passwords, resetting them.

Before this existed, the only account on a deployment was the one
`ensure_bootstrap_admin` seeded at startup, and the only recovery from a lost
password was editing the database. That is a reasonable place to start and an
unreasonable place to stay.

Three principles run through the module:

**Accounts are issued, not requested.** There is no self-service sign-up and
none is planned. On a platform whose whole purpose is oversight, anyone able
to create their own account is a defect. An administrator creates accounts;
that action is logged with who did it.

**A reset must not reveal who has an account.** `request_password_reset`
returns the same thing for a registered address, an unregistered one, and a
deactivated one. Anything else turns the forgot-password form into a way to
enumerate the platform's users — which, for a system whose users are named
regulators and merchants, is itself sensitive.

**Every state change is logged immutably.** User transitions land in
`user_status_log`, token transitions in `password_reset_token_status_log`,
both append-only.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    PASSWORD_RESET_TTL_MINUTES,
    WeakPassword,
    generate_reset_token,
    hash_password,
    validate_password,
    verify_password,
)
from app.db.helpers import log_status_change
from app.db.models import PasswordResetToken, PasswordResetTokenStatusLog, User, UserStatusLog
from app.services import email_service

logger = logging.getLogger(__name__)

# Roles an administrator may assign. Read from type_definitions at call time
# rather than hardcoded here -- adding a role is an INSERT, per CLAUDE.md §2.
ROLE_DOMAIN = "user_role"


class UserServiceError(Exception):
    """Carries a message that is safe to return to the caller."""


def assignable_roles(db: Session, organization_id: uuid.UUID) -> List[str]:
    """The role codes an administrator may choose from."""
    from app.db.models import TypeDefinition

    rows = (
        db.query(TypeDefinition)
        .filter(
            TypeDefinition.organization_id == organization_id,
            TypeDefinition.domain == ROLE_DOMAIN,
            TypeDefinition.is_active.is_(True),
        )
        .order_by(TypeDefinition.sort_order)
        .all()
    )
    return [r.code for r in rows]


def list_users(db: Session, organization_id: uuid.UUID) -> List[User]:
    return (
        db.query(User)
        .filter(User.organization_id == organization_id, User.deleted_at.is_(None))
        .order_by(User.created_at)
        .all()
    )


def create_user(
    db: Session,
    *,
    organization_id: uuid.UUID,
    email: str,
    display_name: str,
    role: str,
    password: str,
    merchant_id: Optional[uuid.UUID],
    actor_user_id: uuid.UUID,
) -> User:
    """Create an account. Raises UserServiceError with a safe message."""
    email = (email or "").strip().lower()
    if not email or "@" not in email:
        raise UserServiceError("Enter a valid email address.")
    if not (display_name or "").strip():
        raise UserServiceError("Enter a name for this person.")

    allowed = assignable_roles(db, organization_id)
    if role not in allowed:
        raise UserServiceError(f"Role must be one of: {', '.join(allowed)}.")

    # A merchant account that is not scoped to a business would see every
    # business on the platform -- the exact boundary the role exists to draw.
    if role == "merchant" and merchant_id is None:
        raise UserServiceError("A business operator account must be linked to a business.")
    if role != "merchant" and merchant_id is not None:
        raise UserServiceError("Only a business operator account can be linked to a business.")

    try:
        validate_password(password)
    except WeakPassword as e:
        raise UserServiceError(str(e))

    # Uniqueness is checked here for a clear message, and enforced by a UNIQUE
    # constraint underneath. Deliberately does NOT filter deleted_at: the
    # constraint covers withdrawn rows too, so ignoring them would report the
    # address as free and then fail on INSERT.
    if db.query(User).filter(User.email == email).first() is not None:
        raise UserServiceError("An account already exists for that email address.")

    now = datetime.utcnow()
    user = User(
        id=uuid.uuid4(),
        organization_id=organization_id,
        email=email,
        password_hash=hash_password(password),
        display_name=display_name.strip(),
        role=role,
        merchant_id=merchant_id,
        is_active=True,
        # Set at creation so the session check in app/api/deps.py has a
        # baseline; without it the first password change could not invalidate
        # anything issued before it.
        password_changed_at=now,
        created_at=now,
    )
    db.add(user)
    log_status_change(
        db, UserStatusLog, organization_id, "user_id", user.id,
        from_status=None, to_status="active",
        note=f"Account created with role {role}", actor_user_id=actor_user_id,
    )
    db.commit()
    logger.info("User %s created with role %s", user.id, role)
    return user


def set_active(
    db: Session, *, user: User, is_active: bool, actor_user_id: uuid.UUID
) -> User:
    """Deactivate or reactivate an account.

    Deactivation is the supported way to remove someone's access. The row is
    kept, so their past actions in the status logs still resolve to a name.
    """
    if user.id == actor_user_id and not is_active:
        raise UserServiceError("You cannot deactivate your own account.")

    was = "active" if user.is_active else "inactive"
    now = "active" if is_active else "inactive"
    if was == now:
        return user

    user.is_active = is_active
    user.updated_at = datetime.utcnow()
    log_status_change(
        db, UserStatusLog, user.organization_id, "user_id", user.id,
        from_status=was, to_status=now, actor_user_id=actor_user_id,
    )
    db.commit()
    return user


def change_password(
    db: Session, *, user: User, current_password: str, new_password: str
) -> None:
    """Change one's own password, proving the current one first.

    Requiring the current password is what stops an unattended browser from
    becoming a permanent account takeover.
    """
    if not verify_password(current_password, user.password_hash):
        raise UserServiceError("That is not your current password.")
    if current_password == new_password:
        raise UserServiceError("Choose a password you have not used here before.")
    try:
        validate_password(new_password)
    except WeakPassword as e:
        raise UserServiceError(str(e))

    now = datetime.utcnow()
    user.password_hash = hash_password(new_password)
    # Ends every other session for this account (app/api/deps.py).
    user.password_changed_at = now
    user.updated_at = now
    log_status_change(
        db, UserStatusLog, user.organization_id, "user_id", user.id,
        from_status="active", to_status="active",
        note="Password changed by the account holder", actor_user_id=user.id,
    )
    db.commit()
    logger.info("Password changed for user %s", user.id)


def request_password_reset(
    db: Session, *, organization_id: uuid.UUID, email: str, requested_ip: Optional[str]
) -> None:
    """Issue a reset link, if the address belongs to an active account.

    Returns None either way, and the caller must answer identically either
    way. See the module docstring.
    """
    email = (email or "").strip().lower()
    user = (
        db.query(User)
        .filter(User.email == email, User.deleted_at.is_(None))
        .first()
    )
    if user is None or not user.is_active:
        logger.info("Password reset requested for an address with no active account")
        return

    now = datetime.utcnow()

    # Any outstanding token for this account stops working. Without this, an
    # older link sitting in an inbox stays usable, so requesting a new one
    # would widen the window rather than replace it.
    outstanding = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.organization_id == organization_id,
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.status == "issued",
            PasswordResetToken.deleted_at.is_(None),
        )
        .all()
    )
    for token in outstanding:
        token.status = "superseded"
        log_status_change(
            db, PasswordResetTokenStatusLog, organization_id,
            "password_reset_token_id", token.id,
            from_status="issued", to_status="superseded",
            note="A newer reset was requested",
        )

    plaintext = generate_reset_token()
    record = PasswordResetToken(
        id=uuid.uuid4(),
        organization_id=organization_id,
        user_id=user.id,
        token_hash=hash_password(plaintext),
        status="issued",
        expires_at=now + timedelta(minutes=PASSWORD_RESET_TTL_MINUTES),
        requested_ip=requested_ip,
        created_at=now,
    )
    db.add(record)
    log_status_change(
        db, PasswordResetTokenStatusLog, organization_id,
        "password_reset_token_id", record.id,
        from_status=None, to_status="issued",
    )
    db.commit()

    reset_url = (
        f"{settings.APP_BASE_URL.rstrip('/')}/reset-password"
        f"?token={plaintext}&id={record.id}"
    )
    sent = email_service.send(
        to=user.email,
        subject="Reset your SoundBox password",
        text_body=email_service.password_reset_body(
            user.display_name, reset_url, PASSWORD_RESET_TTL_MINUTES
        ),
    )
    if not sent:
        # Logged, never surfaced -- the response is identical regardless.
        logger.error("Reset token %s was issued but its email could not be sent", record.id)


def reset_password(
    db: Session, *, token_id: str, token: str, new_password: str
) -> None:
    """Consume a reset token and set a new password."""
    generic = UserServiceError("That reset link is invalid or has expired. Request a new one.")

    try:
        token_uuid = uuid.UUID(str(token_id))
    except (ValueError, AttributeError, TypeError):
        raise generic

    record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.id == token_uuid, PasswordResetToken.deleted_at.is_(None))
        .first()
    )
    if record is None or record.status != "issued":
        raise generic

    now = datetime.utcnow()
    if record.expires_at < now:
        record.status = "expired"
        log_status_change(
            db, PasswordResetTokenStatusLog, record.organization_id,
            "password_reset_token_id", record.id,
            from_status="issued", to_status="expired",
        )
        db.commit()
        raise generic

    # The hash comparison is what makes a stolen database useless for this.
    if not verify_password(token or "", record.token_hash):
        raise generic

    user = (
        db.query(User)
        .filter(User.id == record.user_id, User.deleted_at.is_(None))
        .first()
    )
    if user is None or not user.is_active:
        raise generic

    # Password policy is checked after the token, so an invalid link never
    # gets a different-shaped answer than a weak password would.
    try:
        validate_password(new_password)
    except WeakPassword as e:
        raise UserServiceError(str(e))

    user.password_hash = hash_password(new_password)
    user.password_changed_at = now
    user.updated_at = now

    record.status = "used"
    record.used_at = now
    log_status_change(
        db, PasswordResetTokenStatusLog, record.organization_id,
        "password_reset_token_id", record.id,
        from_status="issued", to_status="used", actor_user_id=user.id,
    )
    log_status_change(
        db, UserStatusLog, user.organization_id, "user_id", user.id,
        from_status="active", to_status="active",
        note="Password reset via emailed link", actor_user_id=user.id,
    )
    db.commit()
    logger.info("Password reset completed for user %s", user.id)
