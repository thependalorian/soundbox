"""Model construction — the one place it happens.

AGENT_MASTER_GUIDE Part 13: `providers.py` is the single place for
`get_llm_model()`; client setup must not be scattered across modules. The
guide's examples are OpenAI; this platform is on Anthropic, so the provider
differs while the rule does not.
"""

from __future__ import annotations

from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.providers.anthropic import AnthropicProvider

from app.core.config import settings

# Sonnet is the workspace default (CLAUDE.md §5: "Default model is Sonnet — it
# handles 90% of daily work"). The work here is choosing among a fixed set of
# well-labelled analytics tools and reporting the numbers they return, which
# is comfortably within its range. The previous ask_service.py made the same
# call for the same reason.
MODEL_NAME = "claude-sonnet-5"


def get_llm_model() -> AnthropicModel:
    """The model the analytics agent runs on.

    Raises rather than returning a half-configured client: an agent that
    constructs successfully and then fails on every request is harder to
    diagnose than one that refuses to start.
    """
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key or api_key.startswith("REPLACE_"):
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not configured — the analytics agent cannot start."
        )
    return AnthropicModel(MODEL_NAME, provider=AnthropicProvider(api_key=api_key))
