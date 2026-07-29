"""Persistence for analytics assistant threads.

Kept out of the agent and out of the router: the agent answers questions, the
router authorises and streams, this decides what is written down.

Two rules shape everything here.

**Messages are immutable.** A turn is INSERTed once and never updated. The
value of the transcript is that an oversight officer can show the exact
question asked and the exact figures returned; a record that can be edited
afterwards is not a record. Corrections are new turns.

**Writing must never break answering.** A failed INSERT loses a transcript
row, which is bad. A failed INSERT that kills a streaming answer mid-sentence
is worse, and would make the whole surface feel unreliable. So persistence
failures are logged and swallowed — see `record_turn`.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.db.models import Conversation, ConversationMessage, ConversationStatusLog
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)

# A thread title is a browsing aid, not content. Long enough to tell two
# questions apart in a list, short enough not to wrap.
TITLE_MAX_CHARS = 120


def ensure_conversation(
    db: Session,
    *,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    conversation_id: uuid.UUID,
    title_seed: Optional[str] = None,
) -> Conversation:
    """Return the thread for `conversation_id`, creating it on first use.

    The id is supplied by the client (AG-UI's `threadId`), so this is also a
    tenancy boundary: an existing thread belonging to another organisation or
    another user is not reused and not silently forked — it raises, because a
    client that can pick the id could otherwise append to, and later read
    back, someone else's conversation.
    """
    existing = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.deleted_at.is_(None))
        .first()
    )
    if existing is not None:
        if existing.organization_id != organization_id or existing.user_id != user_id:
            raise PermissionError("That conversation belongs to a different account.")
        return existing

    conversation = Conversation(
        id=conversation_id,
        organization_id=organization_id,
        user_id=user_id,
        title=_title_from(title_seed),
        status="active",
    )
    db.add(conversation)
    # The status-log companion carries the opening transition, so a thread's
    # lifecycle reads the same way as every other entity's in this schema.
    db.add(
        ConversationStatusLog(
            id=uuid.uuid4(),
            organization_id=organization_id,
            conversation_id=conversation_id,
            from_status=None,
            to_status="active",
            actor_user_id=user_id,
        )
    )
    db.commit()
    return conversation


def _title_from(seed: Optional[str]) -> Optional[str]:
    """The opening question, trimmed, as a working title.

    Returns None rather than inventing something when there is no question to
    draw on. An untitled thread is honest; "New conversation" is noise in a
    list where every row would say it.
    """
    if not seed:
        return None
    cleaned = " ".join(seed.split())
    if not cleaned:
        return None
    if len(cleaned) <= TITLE_MAX_CHARS:
        return cleaned
    return cleaned[: TITLE_MAX_CHARS - 1].rstrip() + "…"


def record_turn(
    *,
    organization_id: uuid.UUID,
    conversation_id: uuid.UUID,
    user_text: str,
    assistant_text: str,
    tool_calls: Optional[list[dict[str, Any]]],
    model_name: Optional[str],
) -> None:
    """Write one completed exchange: the question, then the answer.

    Runs on its own session rather than the request's. The request session is
    torn down by FastAPI when the response finishes, and this is called from
    inside the stream's completion callback — close enough to that boundary
    that borrowing it would be a bug waiting for a slow write to expose.

    Never raises. See the module docstring.
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        db.add(
            ConversationMessage(
                id=uuid.uuid4(),
                organization_id=organization_id,
                conversation_id=conversation_id,
                role_code="user",
                content=user_text,
                created_at=now,
            )
        )
        db.add(
            ConversationMessage(
                id=uuid.uuid4(),
                organization_id=organization_id,
                conversation_id=conversation_id,
                role_code="assistant",
                content=assistant_text,
                tool_calls=tool_calls or None,
                model_name=model_name,
                # A microsecond after the question, so ordering by created_at
                # cannot put the answer before it.
                created_at=now.replace(microsecond=min(now.microsecond + 1, 999999)),
            )
        )
        # Touch the parent so the thread list sorts by real activity. The only
        # mutable field on the only mutable table here.
        db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.organization_id == organization_id,
        ).update({"updated_at": now})
        db.commit()
    except Exception:
        db.rollback()
        logger.exception(
            "Could not persist conversation turn (conversation_id=%s); "
            "the answer was still delivered.",
            conversation_id,
        )
    finally:
        db.close()


def extract_tool_calls(result: Any) -> list[dict[str, Any]]:
    """Flatten a run's tool calls into what the transcript needs.

    Name, arguments and result per call — the audit trail from a sentence in
    the answer back to the query that produced its numbers, and the payload
    the frontend re-renders charts from when a thread is reopened.
    """
    from pydantic_ai.messages import ToolCallPart, ToolReturnPart

    calls: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    try:
        messages = result.new_messages()
    except Exception:  # pragma: no cover - defensive, shape varies by version
        return []

    for message in messages:
        for part in getattr(message, "parts", []):
            if isinstance(part, ToolCallPart):
                key = part.tool_call_id or f"{part.tool_name}-{len(order)}"
                calls[key] = {
                    "tool_name": part.tool_name,
                    "args": _jsonable(part.args),
                    "result": None,
                }
                order.append(key)
            elif isinstance(part, ToolReturnPart):
                key = part.tool_call_id
                if key in calls:
                    calls[key]["result"] = _jsonable(part.content)

    return [calls[k] for k in order]


def _jsonable(value: Any) -> Any:
    """Coerce tool arguments and results into something JSONB accepts.

    Tool results carry Decimals (money) and dates, neither of which the JSON
    encoder handles. Anything else unexpected degrades to its string form
    rather than failing the write — an imperfect audit row beats none.
    """
    import json

    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    try:
        return json.loads(json.dumps(value, default=str))
    except (TypeError, ValueError):
        return str(value)
