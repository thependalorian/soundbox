"""Auth dependencies shared across routers.

get_current_user / require_roles replace the old per-router X-User-Role
header trust (removed from resources.py and settings.py): role now comes
from a verified JWT, never from a header the caller controls.

get_authenticated_device is the equivalent for the physical SoundBox units
themselves -- a device proves it is the device it claims to be with a
bcrypt-verified secret issued once at provisioning (POST /devices), sent as
X-Device-Code / X-Device-Key on every subsequent call.
"""

from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import decode_access_token, verify_password
from app.db.models import Device, User
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


def get_authenticated_device(
    x_device_code: Optional[str] = Header(default=None),
    x_device_key: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> Device:
    if not x_device_code or not x_device_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Device credentials required (X-Device-Code, X-Device-Key).",
        )
    device = (
        db.query(Device)
        .filter(Device.device_code == x_device_code, Device.deleted_at.is_(None))
        .first()
    )
    if device is None or not device.api_key_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unknown or unprovisioned device.",
        )
    if not verify_password(x_device_key, device.api_key_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid device key.")
    return device
