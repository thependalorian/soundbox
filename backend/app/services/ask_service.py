import json
import logging
from decimal import Decimal
from datetime import datetime
from typing import Any, Dict, List

import anthropic
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.analytics_service import AnalyticsService
from app.services.regulatory_reporting import RegulatoryReportingEngine

logger = logging.getLogger(__name__)

# Sonnet is this workspace's default model (root CLAUDE.md §5: "Default
# model is Sonnet — it handles 90% of daily work"); this workspace-level
# standing rule overrides the generic claude-api skill's Opus-by-default
# guidance. Tool selection here is a handful of well-labeled, narrow
# analytics functions — well within Sonnet's range.
MODEL = "claude-sonnet-5"

SYSTEM_PROMPT = (
    "You are the analytics assistant embedded in the SoundBox "
    "operations dashboard for Namibia's Instant Payment Programme. Answer "
    "the operator's question using only the provided tools — never invent "
    "numbers. Cite the actual figures the tools return, with units (N$ for "
    "amounts, % for rates). Keep answers to 2-4 sentences unless the "
    "question explicitly asks for an itemized breakdown."
)


def _json_safe(value: Any) -> Any:
    """Tool results may contain Decimal/datetime from the ORM layer; make
    them JSON-serializable before handing them back to Claude."""

    def default(obj: Any) -> Any:
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return str(obj)

    return json.loads(json.dumps(value, default=default))


def ask_analytics(db: Session, question: str) -> Dict[str, Any]:
    """Route a natural-language question through Claude's tool-calling loop
    over the existing analytics/reporting service methods. Never generates
    or executes arbitrary SQL — the model can only call the fixed set of
    tools defined below."""
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key or api_key.startswith("REPLACE_"):
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")

    analytics = AnalyticsService(db)
    reports = RegulatoryReportingEngine(db)

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    @anthropic.beta_tool
    def get_transaction_summary(days: int = 7) -> dict:
        """Active device count, today's transaction count, total volume (NAD), and share flagged for review over the last N days."""
        return _json_safe(analytics.get_transaction_summary(days=days))

    @anthropic.beta_tool
    def get_transaction_trends(days: int = 7) -> dict:
        """Daily transaction count and volume (NAD) for each of the last N days — use for trend/growth questions."""
        return _json_safe({"trends": analytics.get_transaction_trends(days=days)})

    @anthropic.beta_tool
    def get_system_health() -> dict:
        """Overall payment system health score (0-1), status (HEALTHY/MONITOR/ATTENTION/CRITICAL), and component metrics (success rate, device availability, latency, share flagged)."""
        return _json_safe(analytics.get_system_health())

    @anthropic.beta_tool
    def get_anomaly_alerts(hours: int = 24) -> dict:
        """Payments flagged as unusual in the last N hours: merchant, amount, risk level, anomaly score. Unusual is not the same as fraudulent — a reviewer decides that."""
        return _json_safe({"alerts": analytics.get_anomaly_alerts(hours=hours)})

    @anthropic.beta_tool
    def get_geo_distribution() -> dict:
        """Per-merchant location, region, device count, and transaction count — use for geographic/regional coverage questions."""
        return _json_safe({"locations": analytics.get_geo_distribution()})

    @anthropic.beta_tool
    def get_geo_breakdown(level: str = "region", parent_code: str = "", payment_type: str = "", days: int = 0) -> dict:
        """Activity by geography at any level: 'region', 'constituency' or 'local_authority'. Optionally restrict to one parent region's children via parent_code, filter to a single payment type (p2p/p2b/b2p/g2p/cash_in_merchant/cash_out_merchant/atm_withdrawal), or a rolling window in days. Use for any question about where activity is or is not happening."""
        return _json_safe({"rows": analytics.get_geo_breakdown(
            level=level,
            parent_code=parent_code or None,
            payment_type=payment_type or None,
            days=days or None,
        )})

    @anthropic.beta_tool
    def get_wallet_share() -> dict:
        """Wallet-funded vs bank-funded payment counts by region, with wallet share as a percentage. Use for financial-inclusion questions — who is paying without a bank account, and where."""
        return _json_safe({"regions": analytics.get_wallet_share()})

    @anthropic.beta_tool
    def generate_psd6_report(month: int, year: int) -> dict:
        """PSD-6 Payment System Operator Return for a given calendar month/year: transaction volumes and values by payment type, settlement summary."""
        return _json_safe(reports.generate_psd6_report(month=month, year=year))

    @anthropic.beta_tool
    def generate_psd3_report() -> dict:
        """PSD-3 E-Money Issuer Report: e-wallet counts, dormancy, trust account reconciliation."""
        return _json_safe(reports.generate_psd3_report())

    tools = [
        get_transaction_summary,
        get_transaction_trends,
        get_system_health,
        get_anomaly_alerts,
        get_geo_distribution,
        get_geo_breakdown,
        get_wallet_share,
        generate_psd6_report,
        generate_psd3_report,
    ]

    runner = client.beta.messages.tool_runner(
        model=MODEL,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        tools=tools,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": question}],
    )

    tools_used: List[str] = []
    final_message = None
    for message in runner:
        final_message = message
        for block in message.content:
            if getattr(block, "type", None) == "tool_use":
                tools_used.append(getattr(block, "name", "unknown_tool"))

    if final_message is None:
        raise RuntimeError("Claude returned no response")

    if final_message.stop_reason == "refusal":
        answer = "This question couldn't be answered — it may fall outside what the analytics assistant is scoped to handle."
    else:
        answer = "".join(
            getattr(block, "text", "")
            for block in final_message.content
            if getattr(block, "type", None) == "text"
        ).strip()

    analytics.queue_analytics_event(
        event_type="ai_query_asked",
        event_data={"question": question, "tools_used": tools_used},
    )

    return {"answer": answer, "toolsUsed": tools_used}
