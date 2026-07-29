"""Transactional email, sent through Resend.

`RESEND_API_KEY` sat in configuration for a while without anything importing
it. This is what it was for.

One rule shapes this module: **a send failure must never be reported to the
person who asked.** The only mail this sends is a password reset, and the
reset endpoint deliberately answers identically whether or not the address
belongs to an account — otherwise the form becomes a way to test which email
addresses are registered. Surfacing "we could not send that" would leak the
same fact by a different route. So `send` returns a boolean the caller logs
and does not act on.

HTTP is called directly rather than through the `resend` SDK. One POST to one
documented endpoint does not justify a dependency, and this keeps the failure
handling explicit rather than inherited.
"""

from __future__ import annotations

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

RESEND_ENDPOINT = "https://api.resend.com/emails"
TIMEOUT_SECONDS = 10.0


def is_configured() -> bool:
    """Whether mail can be sent at all. Checked at startup so an operator
    learns from a log line rather than from a user who never got a link."""
    return bool(settings.RESEND_API_KEY and settings.RESEND_FROM_EMAIL)


def send(to: str, subject: str, text_body: str) -> bool:
    """Send one plain-text email. Returns whether it left the building.

    Never raises. See the module docstring: the caller must not be able to
    tell the difference between "not sent" and "no such account".
    """
    if not is_configured():
        logger.warning(
            "Email is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL); "
            "not sending %r to %s", subject, _redact(to),
        )
        return False

    try:
        response = httpx.post(
            RESEND_ENDPOINT,
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.RESEND_FROM_EMAIL,
                "to": [to],
                "subject": subject,
                "text": text_body,
            },
            timeout=TIMEOUT_SECONDS,
        )
        if response.status_code >= 400:
            # The body can echo the recipient, so it is not logged verbatim.
            logger.error(
                "Resend rejected a message to %s: HTTP %s",
                _redact(to), response.status_code,
            )
            return False
        return True
    except Exception as e:  # pragma: no cover - network dependent
        logger.error("Could not send mail to %s: %s", _redact(to), type(e).__name__)
        return False


def _redact(address: str) -> str:
    """`george@example.com` -> `g***@example.com`.

    Enough to correlate a delivery failure with an account during support,
    without writing readable addresses into logs that outlive the incident.
    """
    if not address or "@" not in address:
        return "<invalid>"
    local, _, domain = address.partition("@")
    return f"{local[:1]}***@{domain}"


def password_reset_body(display_name: str, reset_url: str, ttl_minutes: int) -> str:
    """The reset email.

    Plain text, and it says what to do if the request was not theirs —
    receiving one of these unexpectedly is the earliest signal a person gets
    that someone is trying their account.
    """
    return (
        f"Hello {display_name},\n\n"
        "Someone asked to reset the password for your SoundBox account.\n\n"
        f"To choose a new one, open this link within {ttl_minutes} minutes:\n\n"
        f"{reset_url}\n\n"
        "The link can be used once. If you did not ask for this, you can "
        "ignore this message — your password has not changed. If you get "
        "these unexpectedly, reply to this email and tell us.\n\n"
        "SoundBox\n"
    )
