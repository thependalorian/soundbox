"""Agent tracing, exported to Langfuse over OTLP.

Follows AGENT_MASTER_GUIDE §8.6: Langfuse is reached as a plain OpenTelemetry
collector rather than through a bespoke SDK integration, so the agent stays
instrumented with `instrument=True` and nothing in the agent code knows which
backend the spans land in.

Configuration is optional by design. Missing keys disable tracing and log
once; they never prevent the agent — or the rest of the API — from running. An
observability dependency that can take the product down is worse than no
observability.
"""

from __future__ import annotations

import base64
import logging
import os

# Imported for its side effect as much as its value: app.core.config runs
# load_dotenv() at import, so reading Langfuse settings through `settings`
# rather than os.getenv guarantees backend/.env has actually been read.
from app.core.config import settings

logger = logging.getLogger(__name__)

_configured = False


def configure_langfuse() -> bool:
    """Point the OTLP exporter at Langfuse. Returns whether tracing is on.

    Safe to call more than once; only the first call does anything.
    """
    global _configured
    if _configured:
        return True

    public_key = settings.LANGFUSE_PUBLIC_KEY.strip()
    secret_key = settings.LANGFUSE_SECRET_KEY.strip()
    if not public_key or not secret_key:
        logger.info(
            "Langfuse keys not set — agent tracing is off. "
            "Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY to enable it."
        )
        return False

    host = (settings.LANGFUSE_BASE_URL or "https://cloud.langfuse.com").rstrip("/")

    auth = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
    os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = f"{host}/api/public/otel"
    os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"Authorization=Basic {auth}"

    try:
        import logfire

        # send_to_logfire=False: Logfire is used purely as the OTel plumbing
        # Pydantic AI already speaks. Spans go to Langfuse via the OTLP
        # variables set above; nothing is sent to Logfire's own service.
        logfire.configure(
            service_name="soundbox-analytics-agent",
            send_to_logfire=False,
            console=False,
        )
        logfire.instrument_pydantic_ai()
    except Exception as e:  # pragma: no cover - depends on runtime env
        logger.warning("Could not start agent tracing, continuing without it: %s", e)
        return False

    _configured = True
    logger.info("Agent tracing enabled, exporting to %s", host)
    return True
