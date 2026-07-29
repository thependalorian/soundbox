"""Password hashing and JWT session tokens.

This is the sole source of authority for "who is making this request" --
replaces the old X-User-Role header trust. A token is only ever issued here
(POST /auth/login) after a real password check, and only ever trusted here
(decode_access_token), against SECRET_KEY.
"""

import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_ALGORITHM = "HS256"
# An operator's shift, not a browser session forever -- short enough that a
# leaked token has a bounded blast radius, long enough not to re-login mid-shift.
ACCESS_TOKEN_EXPIRE_MINUTES = 12 * 60


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return _pwd_context.verify(plain, hashed)
    except ValueError:
        return False


def generate_device_secret() -> str:
    """A per-device credential, shown once at provisioning time (POST
    /devices response). Only its hash (via hash_password, same bcrypt
    context) is ever persisted -- the plaintext is not recoverable."""
    return secrets.token_urlsafe(32)


def create_access_token(
    subject: str,
    role: str,
    name: str,
    merchant_id: Optional[str] = None,
) -> str:
    if not settings.SECRET_KEY:
        raise RuntimeError("SECRET_KEY is not configured; cannot issue session tokens.")
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: Dict[str, Any] = {"sub": subject, "role": role, "name": name, "exp": expire}
    if merchant_id:
        payload["merchant_id"] = merchant_id
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
