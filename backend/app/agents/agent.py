"""The analytics agent itself.

One `Agent`, constructed once at import and reused — the same singleton
pattern as the FastAPI app (AGENT_MASTER_GUIDE §1.2). Tools come from
`tools.py`, the prompt from `prompts.py`, the model from `providers.py`, so
this module only does assembly.

Instrumentation is not a constructor argument on this version of Pydantic AI —
it is switched on process-wide by `logfire.instrument_pydantic_ai()` in
`app/core/observability.py`, which then exports spans to Langfuse over OTLP.
"""

from __future__ import annotations

import logging

from pydantic_ai import Agent

from app.agents.deps import AnalyticsDeps
from app.agents.prompts import SYSTEM_PROMPT
from app.agents.providers import get_llm_model
from app.agents.tools import ALL_TOOLS

logger = logging.getLogger(__name__)

_agent: Agent | None = None


def get_agent() -> Agent:
    """The analytics agent, built on first use.

    Built lazily rather than at import: `get_llm_model()` raises when no API
    key is configured, and a missing key should fail the one endpoint that
    needs it, not the entire application at startup. The rest of the platform
    — payments, devices, returns — has nothing to do with this agent and must
    still boot without it.
    """
    global _agent
    if _agent is None:
        _agent = Agent(
            get_llm_model(),
            # Names the trace in Langfuse. Without it every run lands as the
            # generic "a run", which is unusable in a project shared with
            # other workspace projects.
            name="soundbox-analytics",
            deps_type=AnalyticsDeps,
            instructions=SYSTEM_PROMPT,
            tools=ALL_TOOLS,
        )
        logger.info("Analytics agent initialised with %d tools", len(ALL_TOOLS))
    return _agent
