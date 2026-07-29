"""The analytics assistant endpoint, spoken over AG-UI.

This is the seam between the CopilotKit frontend and the Pydantic AI agent.
The frontend's `runtimeUrl` points straight here — there is no Node runtime
tier, which is what makes the feature viable on a Create React App frontend
that has no server of its own (see `docs/analytics-chat.md` §3).

Two things this module is responsible for, and the agent is not:

1. **Authorisation.** The route is gated to regulator and administrator roles
   from the verified JWT. The agent's tools can read every business on the
   platform, so who may open a conversation is decided here, once, rather
   than trusted to the model.
2. **Tenancy.** `AnalyticsDeps` is built from the authenticated user, so every
   tool call is scoped to that user's organisation on the way in.
3. **The transcript.** The question and the answer are written down once the
   run completes, with the tool calls that produced the figures. See
   `app/services/conversation_service.py` for why that record is immutable.
"""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from starlette.responses import Response

from app.agents.agent import get_agent
from app.agents.deps import AnalyticsDeps
from app.agents.providers import MODEL_NAME
from app.api.deps import require_roles
from app.db.helpers import get_or_create_organization
from app.db.models import User
from app.db.session import get_db
from app.services.conversation_service import (
    ensure_conversation,
    extract_tool_calls,
    record_turn,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Oversight work, not seller work. A merchant would need every tool scoped to
# their own merchant_id first — a security boundary, not a filter — so they
# are excluded until that exists. See docs/analytics-chat.md §8.
ASSISTANT_ROLES = ("regulator", "admin")


@router.post("/assistant")
async def assistant(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*ASSISTANT_ROLES)),
) -> Response:
    """Run one turn of the analytics conversation.

    The response is a stream of AG-UI events: text deltas, tool calls and
    tool results. The frontend renders tool results as charts rather than
    reading them out as prose, which is the whole point of the surface.
    """
    try:
        agent = get_agent()
    except RuntimeError as e:
        # No API key configured. A clear 503 beats a 500 with a stack trace,
        # and beats failing the whole application at startup.
        logger.error("Analytics assistant unavailable: %s", e)
        raise HTTPException(
            status_code=503,
            detail="The analytics assistant is not configured on this deployment.",
        )

    organization = get_or_create_organization(db)

    # Read the body before dispatching. Starlette caches it on the request, so
    # the adapter still parses it normally below -- this is not consuming the
    # stream out from under it.
    try:
        body = await request.json()
    except Exception:
        body = {}

    # AG-UI's threadId is the thread identity the browser already keeps, so it
    # is the conversation id. Falling back to a fresh one means a malformed
    # client starts a new thread rather than landing in an arbitrary one.
    thread_id = body.get("threadId")
    conversation_id = uuid.UUID(thread_id) if _is_uuid(thread_id) else uuid.uuid4()
    question = _latest_user_text(body)

    try:
        ensure_conversation(
            db,
            organization_id=organization.id,
            user_id=user.id,
            conversation_id=conversation_id,
            title_seed=question,
        )
    except PermissionError:
        # The client picks the thread id, so this is a real boundary: someone
        # else's conversation is not appended to and not silently forked.
        raise HTTPException(status_code=403, detail="That conversation belongs to a different account.")

    deps = AnalyticsDeps(
        db=db,
        organization_id=organization.id,
        user_id=user.id,
        user_name=user.display_name,
        user_role=user.role,
        conversation_id=conversation_id,
    )

    async def persist(result) -> None:
        """Write the exchange down once the run finishes. Never raises."""
        record_turn(
            organization_id=organization.id,
            conversation_id=conversation_id,
            user_text=question,
            assistant_text=str(result.output or ""),
            tool_calls=extract_tool_calls(result),
            model_name=MODEL_NAME,
        )

    from pydantic_ai.ui.ag_ui import AGUIAdapter

    return await AGUIAdapter.dispatch_request(
        request, agent=agent, deps=deps, on_complete=persist
    )


def _latest_user_text(body: dict) -> str:
    """The question this turn is answering: the last user message in the run.

    AG-UI resends the whole thread on every turn, so the last user entry is
    the new one; everything before it is already in the transcript.
    """
    for message in reversed(body.get("messages") or []):
        if message.get("role") == "user":
            content = message.get("content")
            if isinstance(content, str):
                return content
            # Multi-part content: concatenate the text parts, ignore the rest.
            if isinstance(content, list):
                return " ".join(
                    part.get("text", "")
                    for part in content
                    if isinstance(part, dict) and part.get("type") == "text"
                ).strip()
    return ""


def _is_uuid(value) -> bool:
    try:
        uuid.UUID(value)
        return True
    except (ValueError, AttributeError, TypeError):
        return False
