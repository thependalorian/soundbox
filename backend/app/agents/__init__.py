"""The analytics agent.

Natural-language analytics over the platform's existing service layer, served
to a CopilotKit frontend over the AG-UI protocol. Design:
`docs/analytics-chat.md`. Stack rules: AGENT_MASTER_GUIDE.

**Pydantic AI only — no LangGraph, deliberately.** The guide's test (§1.0,
§2.1) is whether a turn needs orchestration beyond one model call plus tools.
This agent answers questions about data that already exists: no guardrail
retry loop, no supervisor delegating to specialists, no human-in-the-loop
gate, because nothing it can call performs a write. That is the single-agent
path (guide Part 4.7). If an approval step or a validate-and-retry loop is
ever needed, LangGraph goes *around* this agent rather than replacing it.

File roles follow the guide's Layout B/C conventions, adapted to live inside
an existing product API rather than a standalone agent service:

    providers.py  get_llm_model() — the only place the model is constructed
    deps.py       AnalyticsDeps — request-scoped dependencies
    prompts.py    SYSTEM_PROMPT
    tools.py      tool functions, each a thin wrapper over a service method
    agent.py      the Agent itself, and tool registration
"""
