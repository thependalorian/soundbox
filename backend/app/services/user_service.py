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


# Every append-only log that records who acted, as
# (table, entity column). Used to answer "what has this account done".
ACTIVITY_LOGS = [
    ("merchant_status_log", "merchant_id"),
    ("device_status_log", "device_id"),
    ("transaction_status_log", "transaction_id"),
    ("anomaly_alert_status_log", "anomaly_alert_id"),
    ("settlement_status_log", "settlement_id"),
    # `wallet_id`, not `e_money_wallet_id` -- this table does not follow the
    # table-name-plus-_id convention the others do.
    ("e_money_wallet_status_log", "wallet_id"),
    ("security_incident_status_log", "security_incident_id"),
    ("user_status_log", "user_id"),
    ("media_asset_status_log", "media_asset_id"),
]


def activity_for(db: Session, *, organization_id: uuid.UUID, user_id: uuid.UUID,
                 limit: int = 50) -> List[dict]:
    """What this account has changed, newest first, across every status log.

    This is the question `actor_user_id` exists to answer. Before that column
    was populated the only record of who acted was a display name inside a
    free-text note, so supporting a user meant grepping prose.

    Parameterised throughout -- table names come from the fixed ACTIVITY_LOGS
    list above and never from a caller, and the ids are bound.
    """
    from sqlalchemy import text

    out: List[dict] = []
    for table, entity_col in ACTIVITY_LOGS:
        try:
            rows = db.execute(
                text(
                    f"select '{table}' as source, {entity_col} as entity_id, "
                    f"from_status, to_status, note, created_at "
                    f"from {table} "
                    f"where organization_id = :org and actor_user_id = :uid "
                    f"order by created_at desc limit :lim"
                ),
                {"org": str(organization_id), "uid": str(user_id), "lim": limit},
            ).mappings().all()
            out.extend(dict(r) for r in rows)
        except Exception:
            # A log without the column yet is skipped rather than fatal --
            # support must not break because one table lags a migration.
            #
            # The rollback is load-bearing, not tidiness. Postgres aborts the
            # whole transaction on a failed statement, so swallowing the error
            # without it left the session unusable and every later query in the
            # request failed with "current transaction is aborted" -- turning
            # one skippable table into a 500 for the entire page.
            db.rollback()
            logger.debug("Skipped %s while reading activity", table)
    out.sort(key=lambda r: r["created_at"], reverse=True)
    return out[:limit]


def history_for(db: Session, *, organization_id: uuid.UUID, user_id: uuid.UUID,
                limit: int = 50) -> List[dict]:
    """What has been done *to* this account, newest first.

    Distinct from `activity_for`, and both are needed to support someone. That
    reads `actor_user_id` and answers "what did they change"; this reads
    `user_id` on `user_status_log` and answers "what was changed about them" —
    created, role moved, deactivated, password set by an administrator.

    The two were conflated in the first version of this, which made a
    newly-created account look like it had no record at all: everything about
    it had been done *by* somebody else.
    """
    from sqlalchemy import text

    rows = db.execute(
        text(
            "select from_status, to_status, note, actor_user_id, created_at "
            "from user_status_log "
            "where organization_id = :org and user_id = :uid "
            "order by created_at desc limit :lim"
        ),
        {"org": str(organization_id), "uid": str(user_id), "lim": limit},
    ).mappings().all()

    # Resolve the acting account to a name once, so the caller does not have to
    # issue a lookup per row.
    actor_ids = {r["actor_user_id"] for r in rows if r["actor_user_id"]}
    names = {}
    if actor_ids:
        for u in db.query(User).filter(User.id.in_(actor_ids)).all():
            names[str(u.id)] = u.display_name
    return [
        {
            **dict(r),
            "actor_name": names.get(str(r["actor_user_id"])) if r["actor_user_id"] else None,
        }
        for r in rows
    ]


def update_user(
    db: Session,
    *,
    user: User,
    display_name: Optional[str],
    role: Optional[str],
    merchant_id: Optional[uuid.UUID],
    clear_merchant: bool,
    actor_user_id: uuid.UUID,
) -> User:
    """Change an account's name, role or business scoping.

    Role changes are the sharp edge here. Moving someone to `merchant` without
    a business would leave them able to see every business -- the exact
    boundary the role exists to draw -- so the same rule the create path
    enforces is enforced again rather than assumed.
    """
    changed = []

    if display_name is not None and display_name.strip() and display_name != user.display_name:
        user.display_name = display_name.strip()
        changed.append("name")

    new_role = role or user.role
    if role is not None and role != user.role:
        allowed = assignable_roles(db, user.organization_id)
        if role not in allowed:
            raise UserServiceError(f"Role must be one of: {', '.join(allowed)}.")
        # Refusing to demote the last administrator: an organisation with no
        # admin cannot issue accounts, cannot deactivate anyone, and cannot
        # recover without database access.
        if user.role == "admin" and role != "admin":
            remaining = (
                db.query(User)
                .filter(
                    User.organization_id == user.organization_id,
                    User.role == "admin",
                    User.is_active.is_(True),
                    User.deleted_at.is_(None),
                    User.id != user.id,
                )
                .count()
            )
            if remaining == 0:
                raise UserServiceError(
                    "This is the last administrator. Promote someone else first."
                )
        user.role = role
        changed.append("role")

    if clear_merchant:
        user.merchant_id = None
        changed.append("business")
    elif merchant_id is not None and merchant_id != user.merchant_id:
        user.merchant_id = merchant_id
        changed.append("business")

    if new_role == "merchant" and user.merchant_id is None:
        raise UserServiceError("A business operator account must be linked to a business.")
    if new_role != "merchant" and user.merchant_id is not None:
        raise UserServiceError("Only a business operator account can be linked to a business.")

    if not changed:
        return user

    user.updated_at = datetime.utcnow()
    log_status_change(
        db, UserStatusLog, user.organization_id, "user_id", user.id,
        from_status="active" if user.is_active else "inactive",
        to_status="active" if user.is_active else "inactive",
        note=f"Account updated ({', '.join(changed)})",
        actor_user_id=actor_user_id,
    )
    db.commit()
    logger.info("User %s updated: %s", user.id, ", ".join(changed))
    return user


def admin_set_password(
    db: Session, *, user: User, new_password: str, actor_user_id: uuid.UUID
) -> None:
    """Set someone else's password, as an administrator.

    The support path for "I cannot get in and the reset email is not reaching
    me" -- which is the common case for a merchant operator whose address was
    mistyped at onboarding, and for any account on a domain that cannot
    receive our mail.

    It does **not** require the current password, because the point is that
    nobody has it. That makes this the most dangerous endpoint in the module,
    so two things are non-negotiable: it is administrator-only, and it writes
    an immutable log row naming the administrator who did it. An admin able to
    take over an account silently would make every other audit row arguable.

    The new password ends every session the account had, exactly as a
    self-service change does.
    """
    try:
        validate_password(new_password)
    except WeakPassword as e:
        raise UserServiceError(str(e))

    now = datetime.utcnow()
    user.password_hash = hash_password(new_password)
    user.password_changed_at = now
    user.updated_at = now
    log_status_change(
        db, UserStatusLog, user.organization_id, "user_id", user.id,
        from_status="active" if user.is_active else "inactive",
        to_status="active" if user.is_active else "inactive",
        note="Password set by an administrator",
        actor_user_id=actor_user_id,
    )
    db.commit()
    logger.info("Password for user %s set by administrator %s", user.id, actor_user_id)


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
