# Analytics chat: natural language and generative UI

> Design for moving the ask composer onto its own page, giving it a memory,
> and letting it answer with charts instead of paragraphs.
>
> Part of the SoundBox documentation set — see [README.md](README.md).

---

## 1. What exists today, and why it changes

There is already a working natural-language analytics feature. It is not a
prototype — it queries live data through the same service methods the
dashboards use. But its shape limits it to one kind of answer.

| Piece | Where | What it does |
|---|---|---|
| Composer | [`ui/AskComposer.tsx`](../frontend/src/components/ui/AskComposer.tsx) | One question, one answer, then a reset button |
| Mount point | `pages/DashboardPage.tsx` | A single `isAdmin &&` block above the stat cards |
| Endpoint | `POST /analytics/ask` (`app/api/analytics.py`) | Validates, delegates, maps errors |
| Agent | [`services/ask_service.py`](../backend/app/services/ask_service.py) | Claude `tool_runner` loop over nine read-only tools |
| Response | `{ answer, toolsUsed }` | A string, and the names of the tools that produced it |

Four limits, each of which the redesign has to remove:

1. **It is single-turn.** No conversation. "And by region?" is not a
   question it can be asked, because nothing carries the previous turn.
2. **Every answer is a paragraph.** The tools return structured figures —
   trends by day, activity by constituency, concentration indices — and all
   of it is flattened into prose. A regional breakdown read aloud as a
   sentence is the least useful form that data has.
3. **Nothing is remembered.** There are no conversation or message tables in
   the schema at all, so an analyst cannot return to what they asked
   yesterday, and no reviewer can reconstruct how a figure was reached.
4. **It is on the wrong surface.** A one-line input above the stat cards
   reads as a search box. What it actually is — a queryable interface to the
   whole record — deserves a page.

### The tool surface is narrower than what we now promise

The agent exposes nine tools: `get_transaction_summary`,
`get_transaction_trends`, `get_system_health`, `get_anomaly_alerts`,
`get_geo_distribution`, `get_geo_breakdown`, `get_wallet_share`,
`generate_psd6_report`, `generate_psd3_report`.

`MarketAnalyticsService` has **eight further methods the agent cannot
reach**: `get_concentration`, `get_value_distribution`,
`get_inclusion_metrics`, `get_cohort_retention`, `get_availability`,
`get_settlement_lag`, `get_cash_flow`, `get_activation_and_dormancy`.

That matters more than it looks. The oversight page now states seven
business questions this platform answers ([`business-plan.md`](business-plan.md)
§1.7), and the assistant can only answer two of them. Concentration,
inclusion and retention, agent float (`get_cash_flow`), and availability are
all built, tested and unreachable from the one surface that invites an
analyst to ask anything. **Widening the tool surface to match the seven
questions is part of this work, not a follow-up.**

---

## 2. What it becomes

A dedicated page, for **regulator and administrator roles only**, carrying:

- A conversation, not a transaction. Follow-up questions work.
- Answers that render as the real thing: a trend renders as a chart, a
  regional breakdown as a drill-down or a map, a monthly return as a report
  card. Text where text is the honest answer.
- History, so a question asked last week can be reopened, and so the
  reasoning behind a figure survives the session.

Merchants are deliberately excluded in v1 — see §8.

---

## 3. Architecture

**No Node tier is introduced, and none is needed.** This was the deciding
constraint. The frontend is Create React App (`react-scripts 5.0.1`), not
Next.js, so there is no server tier to host a Node `CopilotRuntime`.
CopilotKit's React provider connects directly to a backend that speaks the
**AG-UI protocol**, with `runtimeUrl` pointing at it — so the Python service
we already run can serve the agent itself.

```
browser
  └── <CopilotKit runtimeUrl="…/api/v1/assistant">   CopilotKit React
        │  AG-UI over HTTP (streaming)
        ▼
      FastAPI route  ── require_roles("regulator", "admin")
        │
        ▼
      Pydantic AI agent            app/agents/analytics_agent.py
        │  tools call existing services, never SQL
        ▼
      AnalyticsService · MarketAnalyticsService · RegulatoryReportingEngine
        │
        ▼
      Postgres
```

The agent framework is **Pydantic AI**, per workspace `CLAUDE.md` §1a, which
pins Pydantic AI and LangGraph as the agentic backend stack. It also carries
a first-class AG-UI adapter, so the protocol is not hand-rolled:

```python
# pip install 'pydantic-ai-slim[ag-ui]'
from pydantic_ai.ui.ag_ui import AGUIAdapter

@router.post("/assistant")
async def assistant(request: Request, user: User = Depends(require_roles("regulator", "admin"))):
    return await AGUIAdapter.dispatch_request(request, agent=analytics_agent, deps=...)
```

Tools are declared with `@agent.tool` / `@agent.tool_plain`; shared state
uses `StateDeps`; and `requires_approval=True` maps onto AG-UI's interrupt
lifecycle if a tool ever needs human confirmation before running. Nothing in
this platform writes, so no tool needs approval today — but report
generation may later be worth confirming before it is filed.

> **The CopilotKit MCP server was unavailable when this was written** —
> every call returned `Bad Request: No valid session`. The findings above
> came from the published documentation and the workspace's own
> `PRD-Master-Copilot-Generative-UI-Agentic-Chat.md` §3.2. Do not assume the
> MCP tooling works; verify against the docs.

---

## 4. Database

Two new tables and one companion log, held to the schema rules in workspace
`CLAUDE.md` §2. One Alembic migration, chained off the current head
`a1b2c3d4e5f6`.

### `conversations`

| Column | Notes |
|---|---|
| `id` | UUID primary key, generated app-side so a retried write reuses it |
| `organization_id` | Tenancy column, leads every index |
| `user_id` | Who is asking. A conversation belongs to a person, not a role |
| `title` | Derived from the first question; editable |
| `status` | Fast-read column — `active`, `archived` |
| `created_at`, `updated_at`, `deleted_at` | Soft delete only; never hard-deleted |

### `conversation_status_log`

The append-only companion, **created in the same migration as the parent**,
as the rules require. No `updated_at` and no UPDATE path: a correction is a
new row. Carries `from_status`, `to_status`, `actor_user_id`, `note`.

### `conversation_messages`

**Immutable.** A message is a record of what was said; editing one would
make the history worthless as an audit trail.

| Column | Notes |
|---|---|
| `id`, `organization_id`, `conversation_id` | Tenancy on the row, not inherited by join |
| `role` | `user`, `assistant`, `tool` — a `type_definition` value, not an enum |
| `content` | The text |
| `tool_calls` | JSONB: which tools ran, with what arguments and results. This is what makes an answer reconstructable later |
| `created_at` | No `updated_at`, deliberately |

### Rules this schema is holding to

- **No enums, no CHECK lists.** Message roles and conversation statuses are
  rows in `type_definitions` (`domain` + `code`), so adding one is an INSERT
  rather than a migration.
- **No triggers, no stored procedures.** Status transitions and message
  appends happen in application code.
- **Every index leads with `organization_id`**, and active-record indexes
  are partial: `WHERE deleted_at IS NULL`.
- **No `ON DELETE CASCADE`** and no foreign keys, matching the rest of
  `models.py` — relationships are enforced in `app/db/helpers.py`.

> **This schema is a proposal, not a decision.** Workspace `CLAUDE.md` §2
> reserves schema design to a human or to Fable — the executing model does
> not get to settle it. What is written above is held to the rules and is
> meant to be reviewed, corrected and signed off before a migration is
> written, not implemented straight from this page.

### What is stored, and what is not

`tool_calls` records the *arguments and aggregate results* of a query, never
raw payer detail. The privacy posture in [privacy.md](privacy.md) applies
unchanged: a conversation log must not become a side channel around the rule
that payer identifiers are never returned to a screen.

---

## 5. Backend

New module `app/agents/analytics_agent.py`.

**Tools call the existing service methods. They do not contain queries.**
This is the single most important constraint in the backend work — the same
one `ask_service.py` already honours. A tool is a thin, well-described
wrapper over `AnalyticsService`, `MarketAnalyticsService` or
`RegulatoryReportingEngine`. No SQL, no ORM queries, no new aggregation
logic. If a figure is worth having, it belongs in a service where the
dashboards can use it too.

The tool surface widens from nine to roughly seventeen, so that the seven
business questions in [`business-plan.md`](business-plan.md) §1.7 are all
answerable:

| Business question | Tool(s) |
|---|---|
| Which alerts deserve review first | `get_anomaly_alerts` |
| Is the network concentrating | `get_concentration` *(new)* |
| Is adoption reaching people | `get_inclusion_metrics`, `get_value_distribution`, `get_cohort_retention` *(new)* |
| Are agents running dry | `get_cash_flow` *(new)* |
| What does next month look like | forecasting service *(new)* |
| Do filed numbers reconcile | `generate_psd6_report`, `generate_psd3_report` |
| Anything not built as a report | the whole set, composed |

Other backend notes:

- **Model**: `claude-sonnet-5`, per `CLAUDE.md` §5 — Sonnet is the default
  and this is well within its range, as `ask_service.py` already documents.
- **Auth**: the route is gated with
  `Depends(require_roles("regulator", "admin"))` from
  [`app/api/deps.py`](../backend/app/api/deps.py). Role comes from the
  verified JWT, never a header.
- **Persistence** lives in a repository function, not in the agent. The
  agent answers; something else writes the row.
- **`/analytics/ask` stays** for one release and is then removed. It is the
  only consumer of `ask_service.py`, so both go together. Say so in the
  changelog when it happens rather than deleting it quietly.

---

## 6. Generative UI

This is the part that makes the page worth building.

Each tool result gets a React renderer registered with
`useCopilotAction({ name, render })`. The agent calls a tool; the frontend
renders the component instead of, or alongside, the sentence.

**Reuse the chart components that already exist.** They are built, they are
on the brand palette, and they are what the dashboards already use — a chart
in the chat should be the same chart the analyst sees elsewhere, not a
second implementation that drifts.

| Tool | Renders with |
|---|---|
| `get_transaction_trends` | [`Dashboard/TransactionChart.tsx`](../frontend/src/components/Dashboard/TransactionChart.tsx) |
| `get_geo_breakdown` | [`Analytics/GeoDrilldown.tsx`](../frontend/src/components/Analytics/GeoDrilldown.tsx) |
| `get_geo_distribution` | [`Map/GeoDistributionMap.tsx`](../frontend/src/components/Map/GeoDistributionMap.tsx) |
| `get_concentration` | [`Analytics/MarketStructure.tsx`](../frontend/src/components/Analytics/MarketStructure.tsx) |
| merchant segmentation | [`Analytics/SegmentScatter.tsx`](../frontend/src/components/Analytics/SegmentScatter.tsx) |
| `get_transaction_summary`, `get_system_health` | `ui/StatCard.tsx`, `ui/Sparkline.tsx`, `ui/Meter.tsx` |
| `get_anomaly_alerts` | `Dashboard/AnomalyAlertsCard.tsx`, `ui/ConfidenceBadge.tsx` |
| `generate_psd6_report`, `generate_psd3_report` | New report card, built from `ui/Card.tsx` and the table pattern already used on `ReportsPage` |

Three rules for the renderers:

1. **Colours come from [`lib/chartTokens.ts`](../frontend/src/lib/chartTokens.ts)**,
   never literals. That file exists because a brand change once missed every
   chart in the product. It also explains why the brand gradient never
   appears on data: a gradient encodes nothing and implies a scale that does
   not exist.
2. **A figure keeps its denominator.** The services return
   `belowEvidenceFloor` and population counts alongside ratios
   ([regulatory.md](regulatory.md)); a rendered chart must not drop them.
   A rate over eleven payments and one over eleven thousand must not look
   identical.
3. **Absent renders as absent.** Where a service returns
   `insufficient_data` or a null, the component says so. It does not draw an
   empty chart that reads as zero — `ui/EmptyState.tsx` exists for this.

---

## 7. Frontend wiring

| Change | File |
|---|---|
| New page | `pages/AnalyticsChatPage.tsx` |
| Route, role-guarded | `App.tsx` — inside the existing `<RoleRoute allow={['regulator', 'admin']}>` block |
| Nav entry | `components/Layout/Sidebar.tsx` — `roles: ['regulator', 'admin']` |
| Remove old mount | `pages/DashboardPage.tsx` — drop the `isAdmin && <AskComposer />` block |

The dashboard block is **replaced with a link to the new page**, not simply
deleted. `ui/PageAction.tsx` is the established pattern for that on this
page. An entry point that disappears is a feature nobody finds.

`AskComposer.tsx` is retired with `/analytics/ask`, in the same release.

---

## 8. Risks, and what is deliberately not being done

- **Auth on the CopilotKit transport.** The axios interceptor in
  [`api/api.ts`](../frontend/src/api/api.ts) attaches the bearer token to
  *its* requests. CopilotKit uses its own transport and will not inherit
  that. The token has to be passed explicitly, and this is the most likely
  thing to be missed — the symptom is a 401 that looks like a CORS failure.
- **CORS and headers.** `CORS_ALLOWED_ORIGINS` and the allowed-header list
  in `app/main.py` must cover the new route.
- **Create React App only exposes `REACT_APP_*`.** Any key the browser needs
  must be named `REACT_APP_COPILOTKIT_…`; a variable without that prefix is
  silently absent from the bundle at runtime, which presents as an
  unconfigured client rather than as an error. Note also that anything
  reaching the browser bundle is public by definition — a publishable
  (`ck_pub_…`) key is fine there, a secret key is not, and a secret one
  belongs only in `backend/.env`. Both env files are gitignored; keep the
  templates in `.env.example` as placeholders.
- **Streaming must not be buffered.** AG-UI streams its response. If a proxy
  buffers, answers arrive all at once at the end and the feature feels
  broken rather than slow. Check [`nginx.conf`](../frontend/nginx.conf) and
  the hosting layer.
- **Dependency discipline.** Exact pins, no `^` or `~`, and the seven-day
  cool-down on newly published packages applies (`CLAUDE.md` §4).
- **Merchant access is out of scope for v1.** The tools can see every
  business on the platform. Giving a merchant this page requires scoping
  every tool to their own `merchant_id` and proving it — that is a security
  boundary, not a filter, and it deserves its own pass rather than being
  bolted on here.
- **Conversation history is not a compliance record.** It shows what was
  asked and what the tools returned. The authoritative trail for a decision
  is still the status log on the record itself.
