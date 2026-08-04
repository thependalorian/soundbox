"""Password hashing and JWT session tokens.

This is the sole source of authority for "who is making this request". A
token is only ever issued here (POST /auth/login) after a real password
check, and only ever trusted here (decode_access_token), against SECRET_KEY.
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


# How long a reset link stays usable. Short on purpose: the link is a
# bearer credential sitting in an inbox, and the person who asked for it is
# almost always looking at their mail right now.
PASSWORD_RESET_TTL_MINUTES = 60

# Length, not composition rules. Character-class requirements push people
# toward "Password1!" — long passphrases are stronger and easier to keep.
MIN_PASSWORD_LENGTH = 12


class WeakPassword(ValueError):
    """Raised by `validate_password`. Carries a message safe to show a user."""


def validate_password(password: str) -> None:
    """Reject passwords that are trivially weak. Raises WeakPassword.

    Deliberately minimal: a length floor and a check that it is not entirely
    one repeated character. Anything more elaborate is theatre, and this is
    the whole policy rather than a first line of several.
    """
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        raise WeakPassword(
            f"Choose a password of at least {MIN_PASSWORD_LENGTH} characters."
        )
    if len(set(password)) < 4:
        raise WeakPassword("Choose a password with more variety of characters.")


def generate_reset_token() -> str:
    """A single-use password reset grant.

    Only its hash is persisted (`password_reset_tokens.token_hash`), so the
    plaintext exists once — in the email. 32 bytes of `secrets` entropy is
    not guessable, which matters because this value alone can take over an
    account.
    """
    return secrets.token_urlsafe(32)


def create_access_token(subject: str, role: str, name: str) -> str:
    if not settings.SECRET_KEY:
        raise RuntimeError("SECRET_KEY is not configured; cannot issue session tokens.")
    now = datetime.utcnow()
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # `iat` is what makes a password change able to end existing sessions.
    # A JWT cannot be revoked, so app/api/deps.py compares this against
    # users.password_changed_at and refuses anything older. Truncated to whole
    # seconds because that is the resolution the JWT spec stores.
    payload: Dict[str, Any] = {
        "sub": subject,
        "role": role,
        "name": name,
        "exp": expire,
        "iat": now.replace(microsecond=0),
    }
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
