"""Real login: exchanges an email + password for a signed JWT.

This is the only place a session is created. Everything else in the app
(resources.py, settings.py, ...) only ever reads the token this issues --
nothing else accepts credentials, and nothing trusts a client-asserted role.
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.core.limiter import limiter
from app.core.security import create_access_token, verify_password
from app.api.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from sqlalchemy.orm import Session

router = APIRouter()
logger = logging.getLogger(__name__)


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    id: str
    role: str
    name: str
    # The caller already proved it holds this address; returning it saves the
    # client a round trip to /auth/me purely to learn which account it is.
    email: str


@router.post("/auth/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(User.email == body.email.strip().lower(), User.deleted_at.is_(None))
        .first()
    )
    # Same error for "no such user" and "wrong password" -- distinguishing
    # them lets a caller enumerate valid emails.
    if user is None or not user.is_active or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    user.last_login_at = datetime.utcnow()
    db.commit()

    token = create_access_token(
        subject=str(user.id),
        role=user.role,
        name=user.display_name,
    )
    return LoginResponse(
        access_token=token,
        id=str(user.id),
        role=user.role,
        name=user.display_name,
        email=user.email,
    )


@router.get("/auth/me")
async def me(user: User = Depends(get_current_user)):
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.display_name,
        "role": user.role,
    }
