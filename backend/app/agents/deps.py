"""Request-scoped dependencies for the analytics agent.

AGENT_MASTER_GUIDE §4.1/§4.7: dependencies travel in a dataclass reached
through `RunContext[Deps]`, never through module globals and never through the
prompt. Secrets and connections live here; the model sees neither.

The identity fields are not decoration. Every tool result is scoped to
`organization_id`, so the tenancy boundary is enforced on the way *into* the
query rather than trusted to the model's discretion afterwards.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session


@dataclass
class AnalyticsDeps:
    """What one agent run is allowed to touch."""

    db: Session
    organization_id: uuid.UUID

    # Carried for the audit trail and for Langfuse trace correlation, so a
    # answer in the UI can be tied back to a span and a database row.
    user_id: uuid.UUID
    user_name: str
    user_role: str
    conversation_id: uuid.UUID
