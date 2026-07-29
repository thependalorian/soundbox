"""Account management: create users, change a password, reset a forgotten one.

Split from auth.py, which only issues sessions. This is where accounts come
into existence and where their credentials change.

Rate limits are per-route and deliberately tight on the two unauthenticated
paths. `/auth/forgot-password` sends mail to an address the caller chooses, so
an unlimited one is both an enumeration oracle and a way to use this service
to spam someone. `/auth/reset-password` accepts a secret, so an unlimited one
is an offline-grade guessing budget handed out online.
"""

from __future__ import annotations

import logging
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.limiter import limiter
from app.db.helpers import get_or_create_organization
from app.db.models import User
from app.db.session import get_db
from app.services import user_service
from app.services.user_service import UserServiceError

router = APIRouter()
logger = logging.getLogger(__name__)


class UserSummary(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    merchant_id: Optional[str] = None
    is_active: bool
    last_login_at: Optional[str] = None
    created_at: Optional[str] = None


class CreateUserRequest(BaseModel):
    email: str
    display_name: str
    role: str
    password: str
    merchant_id: Optional[str] = None


class SetActiveRequest(BaseModel):
    is_active: bool


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    id: str
    token: str
    new_password: str


def _summary(u: User) -> UserSummary:
    return UserSummary(
        id=str(u.id),
        email=u.email,
        display_name=u.display_name,
        role=u.role,
        merchant_id=str(u.merchant_id) if u.merchant_id else None,
        is_active=bool(u.is_active),
        last_login_at=u.last_login_at.isoformat() if u.last_login_at else None,
        created_at=u.created_at.isoformat() if u.created_at else None,
    )


# ---------------------------------------------------------------------------
# Administration
# ---------------------------------------------------------------------------

@router.get("/users", response_model=List[UserSummary])
async def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    """Every account on this deployment. Administrators only."""
    org = get_or_create_organization(db)
    return [_summary(u) for u in user_service.list_users(db, org.id)]


@router.get("/users/roles")
async def list_roles(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    """Roles an administrator may assign, from type_definitions rather than a
    literal in the form -- adding one is an INSERT."""
    org = get_or_create_organization(db)
    return {"roles": user_service.assignable_roles(db, org.id)}


@router.post("/users", response_model=UserSummary, status_code=201)
async def create_user(
    body: CreateUserRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles("admin")),
):
    """Create an account.

    There is no self-service sign-up: on an oversight platform, an account
    someone can create for themselves is a defect. Accounts are issued, and
    this records who issued them.
    """
    org = get_or_create_organization(db)
    merchant_id = None
    if body.merchant_id:
        try:
            merchant_id = uuid.UUID(body.merchant_id)
        except (ValueError, AttributeError):
            raise HTTPException(status_code=400, detail="That is not a valid business id.")
    try:
        user = user_service.create_user(
            db,
            organization_id=org.id,
            email=body.email,
            display_name=body.display_name,
            role=body.role,
            password=body.password,
            merchant_id=merchant_id,
            actor_user_id=actor.id,
        )
    except UserServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _summary(user)


@router.put("/users/{user_id}/active", response_model=UserSummary)
async def set_user_active(
    user_id: str,
    body: SetActiveRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles("admin")),
):
    """Deactivate or reactivate an account.

    Deactivation rather than deletion, so the person's past actions in the
    status logs still resolve to a name.
    """
    org = get_or_create_organization(db)
    try:
        target_id = uuid.UUID(user_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="No such account.")
    target = (
        db.query(User)
        .filter(User.id == target_id, User.organization_id == org.id, User.deleted_at.is_(None))
        .first()
    )
    if target is None:
        raise HTTPException(status_code=404, detail="No such account.")
    try:
        updated = user_service.set_active(
            db, user=target, is_active=body.is_active, actor_user_id=actor.id
        )
    except UserServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _summary(updated)


# ---------------------------------------------------------------------------
# The account holder's own password
# ---------------------------------------------------------------------------

@router.post("/auth/change-password")
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Change your own password, proving the current one.

    Succeeding here ends every other session for this account, including the
    one being used right now on other devices.
    """
    try:
        user_service.change_password(
            db,
            user=user,
            current_password=body.current_password,
            new_password=body.new_password,
        )
    except UserServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "ok", "detail": "Your password has been changed."}


# ---------------------------------------------------------------------------
# Forgotten passwords -- unauthenticated
# ---------------------------------------------------------------------------

# Identical for every outcome. A different message for a registered address
# would turn this form into a way to discover who holds an account here.
_FORGOT_RESPONSE = {
    "status": "ok",
    "detail": "If that email address has an account, a reset link is on its way.",
}


@router.post("/auth/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Request a reset link.

    Always answers the same way, whether or not the address is registered,
    whether or not the account is active, and whether or not the mail was
    actually delivered.
    """
    org = get_or_create_organization(db)
    client_ip = request.client.host if request.client else None
    try:
        user_service.request_password_reset(
            db, organization_id=org.id, email=body.email, requested_ip=client_ip
        )
    except Exception:
        # Even a failure here must not change the shape of the answer.
        logger.exception("Password reset request failed internally")
    return _FORGOT_RESPONSE


@router.post("/auth/reset-password")
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Set a new password using an emailed link. Single use."""
    try:
        user_service.reset_password(
            db, token_id=body.id, token=body.token, new_password=body.new_password
        )
    except UserServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "ok", "detail": "Your password has been set. You can sign in now."}
