"""Auth dependencies shared across routers.

get_current_user / require_roles replace the old per-router X-User-Role
header trust: role now comes from a verified JWT, never from a header the
caller controls.

Every account belongs to the supervising institution. There is no
credential type for a supervised business -- businesses are subjects of the
analysis, not callers of this API.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import decode_access_token, verify_password
from app.db.models import User
from app.db.session import get_db


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    user = (
        db.query(User)
        .filter(User.id == user_id, User.deleted_at.is_(None))
        .first()
    )
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive account.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # A JWT cannot be revoked, so changing a password would otherwise leave
    # every already-issued session valid for the rest of its twelve hours --
    # including whoever's access prompted the change. Refusing tokens issued
    # before the password moved is what actually makes a reset take effect.
    if user.password_changed_at is not None:
        issued_at = payload.get("iat")
        if issued_at is None:
            # Predates this check. Treated as stale rather than trusted:
            # failing open here would make the whole mechanism optional.
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session no longer valid. Sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        issued = datetime.utcfromtimestamp(int(issued_at))
        # One second of slack: `iat` is stored whole-second, so a token minted
        # in the same second as the change would otherwise reject itself --
        # which is exactly what happens to the session that just reset it.
        if issued < user.password_changed_at.replace(microsecond=0) - timedelta(seconds=1):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your password changed. Sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    return user


def require_roles(*roles: str):
    """FastAPI dependency factory: 403s unless the verified JWT's user has
    one of `roles`. Usage: Depends(require_roles("admin", "regulator"))."""
    allowed = set(roles)

    def _dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of: {', '.join(sorted(allowed))}.",
            )
        return user

    return _dependency
