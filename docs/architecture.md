# Architecture

> How the system is actually built, what it deliberately cannot do, and where it breaks at scale.
>
> Part of the Buffr Intelligence documentation set — see [README.md](README.md).

---

## 1. What this system is

> **Naming note.** Buffr Intelligence reads data from the WayaMe rails. WayaMe is the
> consumer-facing name of Namibia's instant payment service, operated by
> Instant Payments Namibia; it is named throughout this documentation to say
> what Buffr Intelligence connects to, **not to imply endorsement, partnership or
> approval that has not been granted**. Integration terms, branding terms and
> Data-sharing terms are being taken to the Bank of Namibia and IPN — the
> phased path is set out in [`business-plan.md`](business-plan.md).

### What WayaMe actually is

**WayaMe is not an app, and there is no WayaMe app to download.** It is the
consumer-facing *brand* of Namibia's Instant Payment Solution — the national
rails themselves. The name comes from "Wire Me".

| | |
|---|---|
| What it is | The brand of Namibia's national Instant Payment Solution (IPS) |
| Who administers it | **Instant Payments Namibia (IPN)** — a *subsidiary of the Bank of Namibia* |
| Long-term operator | **NamClear**, the authorised payment system operator, integrating the IPS with existing clearing infrastructure under a Declaration of Intent signed with BoN and IPN |
| How a customer pays | Through **their own bank's app**. The bank connects to WayaMe; the customer never installs anything branded WayaMe |
| First cohort live | Bank Windhoek, NamPost, Letshego Bank Namibia |
| Launch | Phased rollout from mid-2026, after pilot testing completed in live production |
| Use cases | Government-to-person first (including social grants), then person-to-person, person-to-business, and digital wallet interoperability |

Two consequences worth holding on to:

1. **The operator is a central bank subsidiary.** IPN is owned by the Bank of
   Namibia. The party we integrate with and the party that regulates the
   system are closely related, which raises the value of being able to say
   plainly that we never touch money.
2. **The stated target population is the hardest one to see.** The programme
   is explicitly aimed at small businesses, street vendors, farmers and
   township traders who have relied on cash. Those are precisely the
   participants a national aggregate hides, which is why every measure here
   reports its denominator and drills to constituency level. Individuals
   transact in their own right too — person-to-person is a live use case —
   so "participant" is never a synonym for "business" in this system.

### Our position in it

**An observer, not a participant.** The platform is told the outcome of
payments made over WayaMe and analyses them. It is not in the payment path.

This is the single most important fact about the architecture, and it is
structural rather than a policy we apply:

| It does | It cannot do |
|---|---|
| Receive transaction-pattern data under agreement | Start a payment |
| Analyse it for pattern, concentration and reach | Stop, hold or reverse a payment |
| Surface dashboards, anomalies and returns | Hold a balance or touch anyone's money |
| Flag unusual patterns for human review | Change what the rails recorded |

**Verifiable in the code, which is the point of stating it this way.** There
is no HTTP client in `backend/app/` that calls a payment rail at all, and no
function anywhere named initiate, authorise, debit, decline, hold or reverse.
The application's entire write surface is its own tables. This is not a
policy that could be relaxed by a configuration change — there is nothing to
relax.

**Why this matters commercially.** An analytics platform that holds no money
and moves no money is not exposed to the category of regulatory risk that
attaches to custody. Staying out of the payment path is a feature, not a
limitation, and it should be stated first in any conversation with the Bank
of Namibia.

---

## 2. Data flow

The platform is waiting to be told what happened. Every step below is
observation, not action.

```
  Payer                    WayaMe (operated by IPN)          Buffr Intelligence
    │                               │                                │
    │  1. initiates a payment in    │                                │
    │     their own institution's   │                                │
    │     app or by short code      │                                │
    │──────────────────────────────>│                                │
    │                               │  2. clears and settles,        │
    │                               │     institution to institution │
    │                               │     (nothing to do with us)    │
    │                               │                                │
    │                               │  3. transaction-pattern data   │
    │                               │     shared under agreement     │
    │                               │───────────────────────────────>│
    │                               │                                │  4. scored against
    │                               │                                │     that participant's
    │                               │                                │     own history
    │                               │                                │  5. measures and
    │                               │                                │     returns updated
    │                               │                                │  6. ranked for review
    │                               │                                │     by a named person
```

**Steps 1 and 2 complete without us.** By the time anything reaches this
platform the payment is final. That ordering is the architecture, not a
sequence diagram convention — there is no step at which an analytical result
could feed back into a payment, because the payment is already settled when
the data arrives.

### What arrives, and what does not

Data-sharing terms are scoped to aggregate, privacy-preserving transaction
analytics: masked or tokenised identifiers where linkage is needed, and no
retention of raw personal identifiers beyond a documented analytical purpose.
A stable pseudonym per participant is sufficient for every feature the models
use — enough to link one participant's payments to each other, and not enough
to identify a person. No phone number and no national ID is requested at any
phase. The full field-by-field ask, and what is lost if a field is withheld,
is in `backend/notebooks/anomaly_detection.ipynb` §11.

### Failure path

If a shared extract is late or incomplete, **no payment is affected** — they
all completed at step 2. What is delayed is the analysis. The platform
therefore:

1. Reports the period it actually holds data for, rather than presenting a
   partial period as a whole one.
2. Withholds a figure where the base is too thin to carry it, rather than
   publishing a ratio over eleven observations as though it were evidence.
3. Reconciles on the next complete extract.

### Idempotency

The same payment can be reported more than once — a replayed message, an
overlapping extract window. Every payment carries a reference
(`transactions.transaction_ref`, unique) and is upserted on it. A repeat is
recognised and counted once.

---

## 3. Components

| Component | Location | Responsibility |
|---|---|---|
| Backend API | `backend/app/api/` | Analytics, oversight, reporting, accounts. Every router mounts behind authentication |
| Data layer | `backend/app/db/` | Wiebe-pattern schema: immutable logs, soft deletes, tenancy on every table |
| Rule scorer | `backend/app/services/anomaly_scoring.py` | Transparent scorer that explains every score, with thresholds held as configuration |
| Anomaly models | `backend/ml/` + `backend/notebooks/` | The two-layer classifier-then-Isolation-Forest framework, five models compared — see `backend/notebooks/anomaly_detection.ipynb` |
| Segmentation | `backend/ml/segmentation.py` | k-means over behavioural features, k chosen by silhouette, refuses to segment on too little trade |
| Assistant | `backend/app/agents/` + `app/api/assistant.py` | Natural-language questions answered by tool-calling over existing analytics methods, never raw SQL |
| Synthetic data | `backend/scripts/seed_synthetic.py` | Phase 0 population: every use case, both party kinds, constituency spread, planted anomalies |
| Operator UI | `frontend/src/pages/` | Role-scoped console (regulator, administrator) |
| Public site | `frontend/src/pages/public/` | The institutional argument |
| Brand assets | `frontend/scripts/build_brand_assets.py` | Derives every mark and icon from source art — outputs are not hand-edited |

---

## 4. Data model principles

Full rules in the workspace `CLAUDE.md`; the ones that shape this system most:

- **Append-only history.** Status and ledger rows are never updated. A
  correction is a new row. This is what makes a dispute settleable months
  later.
- **Soft deletes only.** `deleted_at` timestamps; operational records are
  never removed.
- **Exact money.** `NUMERIC(15,2)` with a `currency_code` alongside. Floating
  point on money is treated as a defect.
- **No database-side logic.** Zero triggers, zero stored procedures. Every
  transition happens in application code that can be read and reviewed.
- **Tenancy everywhere.** `organization_id` leads every operational table and
  every index.
- **Config over enums.** Statuses and types live in `type_definitions` rows;
  adding a value is an INSERT, not a migration.

---

## 5. Why nothing is called "fraud"

The system detects **anomalies**. It has no confirmed outcomes and no way to
measure whether an anomaly was fraudulent — that is a human judgement,
recorded afterwards. Tables named `fraud_*` told every future reader
otherwise, and naming shapes how people reason about a system long after the
docs are forgotten.

| Was | Is | Why |
|---|---|---|
| `fraud_alerts` | `anomaly_alerts` | It holds unusual activity, not established fraud |
| `fraud_probability` | `anomaly_score` | It was `min(sum(rule_contributions), 1.0)` — neither a probability nor about fraud |
| `FraudDetectionEngine` | `AnomalyScoringEngine` | It scores; it does not detect fraud |
| `fraud_type` | `signal_type` | Names which signal fired, not a fraud category |
| `transactions.fraud_score` | `transactions.anomaly_score` | Same value, honest name |
| `/fraud-alerts` | `/flagged` | What the page shows |

**One thing keeps the word, deliberately.** The reviewer verdict is still
`confirmed_fraud` / `not_fraud`, because that *is* a statement about fraud —
the single moment a person decides whether unusual meant fraudulent.
Softening it there would erase the distinction the whole design rests on.

Done while both tables held zero rows. It would never have been cheaper, and
the misleading names would have shaped everyone's thinking in the meantime.

---

## 6. Forecasting: where it belongs, and where it does not

Nothing forecasts today. That is correct for now, and the order in which it
should change is deliberate.

### The rules are configuration, not code

Every rule the scorer applies — whether it runs, how much it contributes, and
how far above normal counts as unusual — is a `type_definitions` row under the
`anomaly_rule` domain. Changing a threshold is an UPDATE.

That flexibility is only safe because of three properties:

- **Defaults live in code** (`anomaly_rule_config.DEFAULT_RULES`) as the
  shipped position and the definition of every field. A missing row falls
  back rather than leaving the scorer without a rule.
- **Changes are append-only.** `anomaly_rule_config_log` records who changed
  which field, from what, to what. The current value is one query; the
  history cannot be rewritten.
- **Scores carry a configuration fingerprint.** Two alerts with different
  fingerprints were scored under different policy and are not directly
  comparable. Without it, "why is this a 0.6" becomes unanswerable the moment
  someone moves a slider.

Bounds are enforced rather than clamped. A contribution outside 0.0-1.0 is
rejected with the reason, because silently storing a different value than the
operator chose is worse than refusing the change.

### The resource API

`app/api/resources.py` carries everything a person uses to run the deployment:
businesses, payments, settlements and alerts — read and write. Three
rules hold throughout — `organization_id` on every query, `deleted_at IS NULL`
on every list, and the append-only status-log row written in the same request
as any status change.

Four decisions in the write paths are worth stating, because each one is a
constraint rather than a convenience:

- **Deletes are soft, always.** A payment recorded against a business closed
  last year must still resolve that business. `deleted_at` removes a record
  from every list without removing it from the history.
- **Status is never settable through a profile update.** A business moves
  between states only through `PUT /merchants/{id}/status`, so every
  transition carries a decision, an actor and a log row. There is no path
  that creates an already-approved business.
- **Adverse outcomes require a reason.** Suspending or closing a business is
  refused without a note. A business turned away is owed one, and a reviewer
  who cannot state a reason has not finished reviewing.
- **Triage is separate from judgement.** `PUT /anomaly-alerts/{id}/status`
  moves an alert through the queue; `POST /anomaly-alerts/{id}/verdict`
  records whether it was fraud. Only the second becomes training data, and
  conflating them would poison the only ground truth this product has.

**Taxonomies are read, not hardcoded.** `GET /type-definitions/{domain}`
gives the console its status options. A UI holding its own copy of a list
that lives in configuration will eventually offer a value the API rejects.

None of it can move money. These endpoints read payment outcomes and manage
the record around them; the observer position is a property of the service,
not a check inside one function.

**Authorization is server-verified, never caller-asserted.** One credential,
and it never trusts a claim the caller can set itself:

A person authenticates once (`POST /auth/login`, bcrypt-checked password) and
gets back a signed JWT. Every role-gated write decodes that token server-side
(`app/api/deps.py`'s `require_roles`) to get the actor's role and identity —
there is no header a request can set to grant itself `admin`.

**Reads are authenticated at the router, not per endpoint.** Every analytics,
oversight, reporting and resource router is mounted with an authentication
dependency in `app/main.py`, so a new endpoint added to any of them is
protected by default. Per-endpoint guards were how thirty-four read paths —
every payment, business, alert and the regulatory returns — ended up
publicly readable: not one of them was marked unsafe, each was simply
missing a decorator nobody noticed.

Session invalidation is carried in the token itself: a JWT's `iat` is
compared against `users.password_changed_at`, so changing a password
immediately invalidates every session issued before it without needing a
server-side session store.

Two fields are deliberately withheld from responses: a beneficial owner's
national ID (only `hasIdOnFile` is returned) and raw payer detail (only the
masked alias). Both are reasoned through in [privacy.md](privacy.md).

**Sensitivity is measurable today.** Following BIS Working Paper 1188, the
detector is validated against artificially manipulated transactions rather
than waiting for confirmed cases — see `backend/ml/README.md`. That measures
whether it responds to manipulation, which is answerable now.

**What cannot be forecast, at any point.** Fraud. There is no ground truth to
learn from, and §5 explains why we do not claim to measure it at all.
Forecasting a quantity we cannot measure would compound one overclaim into
a worse one.

**What is defensible, in order of how soon:**

| Forecast | Signal | Why it is first, or not |
|---|---|---|
| **Payment volume and value** | Weekly seasonality plus trend | Built and running. The seasonality is handled explicitly and shown separately, because a Saturday peak is not growth. Useful for capacity planning. |
| **Constituency coverage** | Onboarding rate per constituency | The most useful to oversight and the furthest away: it needs enough history per constituency to separate a genuine trend from one institution's onboarding push. |

Both need the same thing the anomaly models need: real transaction history.
The forecaster returns no number at all below four weeks of trading, and says
why — a projection built on three weeks looks identical to one built on three
years unless the system refuses to draw it.

Method, when the time comes, is the standard decomposition: separate trend
from seasonality, difference to stationarity, then fit. The weekday baseline
work in `AnomalyScoringEngine` already establishes the seasonal handling that
a volume forecast would reuse.

---

## 7. Known gaps

Stated as what would break first, not as a wish list. Nothing here is broken
at current scale.

| Gap | Status | Why it matters here |
|---|---|---|
| **No real data** | The entire analytical surface runs on `scripts/seed_synthetic.py`. | This is the only gap that matters, and it is not an engineering one. Every threshold, every detection rate and every seasonal index below is derived from a distribution we chose. They are re-derived, not carried over, the moment real activity exists. |
| **Liquidity features absent** | The published methodology uses collateral, credit limits and system-wide liquidity as a feature family. | A retail instant-payment rail has no direct analogue. Their absence is stated in the notebook rather than substituted with something weaker, because a proxy invented to fill a table is worse than an acknowledged gap. |
| **Two constituencies unresolved** | `namibia_geography.py` lists 119 of the 121 official constituencies. | Coverage is divided by the official 121, so the shortfall understates reach rather than overstating it. Resolving it is an INSERT against the Electoral Commission's delimitation record, not a migration. |
| **Model retraining is manual** | Models are fitted in the notebook, not on a schedule. | The participant population grows as institutions onboard, so a model fitted once drifts. This needs a retraining cadence before Phase 3, not before Phase 1. |
| **Ingestion queue** | There is no ingestion path at all yet; Phase 1 is a bounded historical extract. | Fine for an extract. A continuous feed at Phase 3 needs a queue in front of the writers so a backend deploy cannot drop records. |

---

## 8. Scale path

Current shape, adequate for pilot volumes:

```
data extract ──> FastAPI ──> Postgres
```

The shape it needs to become, and the order to get there:

```
data feed ──> ingest gateway ──> queue ──> workers ──> Postgres
                                    │
                                    └──> analytics / scoring
```

1. **Queue first.** Decouples ingestion from backend availability. A deploy or
   a slow query stops costing records.
2. **Read replica second.** Analytics and reporting compete with ingestion
   writes; separate them before they interfere.
3. **Partition transactions by month third.** See §8.2 — the trigger is
   closer than a merchant-count view of the product suggests.

Deliberately not planned: microservice decomposition or a streaming
platform. Neither is justified by current or near-term volume, and each would
add operational burden a small team cannot carry.

### 8.1 What sets the row count

**Buffr Intelligence reports on every payment carried by the WayaMe rails.**
That single fact governs every capacity question here, and it is easy to get
wrong: the instinct is to size the database against the number of businesses
on the platform, which is the wrong denominator by roughly two orders of
magnitude. Individuals transact in their own right, and the participant count
grows with every institution that onboards.

Namibia has 3,022,401 people and about 1,901,090 adults
(`app/db/namibia_geography.py`, which is the denominator of record). Sizing
against national instant-payment adoption:

| Rails maturity | Payments per adult per year | Rows per year |
|---|---|---|
| Early scheme | 10 | ~19M |
| Established | 50 | ~95M |
| Mature (Pix/UPI-like) | 150 | ~285M |

For contrast, a business-only view — 20,000 businesses at 20 payments a day —
is ~146M/year, and that is an ambitious ceiling. The rails number passes it at
moderate national adoption and keeps going, because it counts everyone
transacting rather than everyone onboarded to a platform.

A single Postgres table with correct indexes is comfortable to roughly 100M
rows. On the rails figures that is reached during ordinary scheme growth, not
at some distant success case.

### 8.2 Where partitioning actually lands

Range-partitioning `transactions` by month is therefore a **when, not an if**.
Two things follow:

- `transactions` is empty today. Converting an empty table to a partitioned
  one is trivial; converting a 100M-row table is a maintenance window on a
  system participants depend on. The cheapest moment to do this is the one where
  it appears to be least necessary.
- The partition key must be the column queries already filter on.
  `ix_transactions_org_merchant_created` leads with the tenant and carries
  `created_at`, and every analytics window filters on `created_at`, so the
  shape is already right. Nothing needs to change to keep the option open.

**This is a foundational schema decision and is deliberately left open here**
— per workspace `CLAUDE.md` §2, core schema and tenancy architecture are
designed by a human, not by an executing model. The recommendation on the
table is monthly range partitions on `transactions`, adopted before the first
production ingest of rails traffic rather than after.

### 8.3 Closed: what the read path does now

Three things were changed once the rails scope was clear.

- **Aggregation happens in Postgres.** `PaymentRepository` grew `totals`,
  `daily_counts`, `daily_values`, `value_by_merchant` and
  `count_by_payment_type`, each a `GROUP BY` rather than a Python fold over
  a loaded row set. `get_concentration` was loading a 90-day window into
  memory to compute two indices; it now reads one row per business. Memory
  is proportional to the number of groups, not to national payment volume.
  The `*_from_rows` variants remain for callers that already hold rows.
  Percentile and Gini work still needs every value, so `amounts()` returns a
  single float column instead of whole ORM objects.
- **Tenant indexes are partial.** All 15 composite tenant indexes now carry
  `WHERE deleted_at IS NULL` (migration `c4f8a21b7d90`), per `CLAUDE.md` §2.
  Soft deletes only accumulate, so without this an ever-growing share of each
  index is rows no query wants. The three remaining single-column
  `ix_*_organization_id` indexes are auto-created by the `ref_id()` helper and
  are redundant with the composites.
- **Derived aggregates are cached.** The twelve market and NPS oversight
  endpoints now go through `app/data/cache.py` (Redis, 300s, fails soft,
  every response annotated with `cachedAt`/`ageSeconds`). Only derived
  aggregates — never a payment, balance or alert status, because a cached
  payment status is a stale one and the whole argument for this product is
  that a regulator can trust what it says. Figures derived from anomaly
  thresholds are listed in `RULE_DEPENDENT_NAMESPACES` and dropped whenever a
  rule changes; a moved threshold makes a cached flag rate misleading rather
  than merely old.

### 8.4 Closed: withdrawn records were still being counted

A correctness defect surfaced alongside the scale work and is the more
serious of the two.

Soft deletes are the only deletion this schema has, which makes
`deleted_at IS NULL` load-bearing on every read: a withdrawn record that is
not filtered does not disappear, it silently keeps counting. **Thirty-eight
tenant-scoped query blocks omitted it**, across `analytics_service`,
`anomaly_scoring` and `regulatory_reporting` — the three services that query
the ORM directly rather than through `PaymentRepository`, which exists to
enforce exactly this.

It affected every soft-deletable entity, not just payments:

| Entity | Effect of the omission |
|---|---|
| `Transaction` | Withdrawn payments counted in totals, health, and **the PSD-6 return** |
| `EMoneyWallet` | Withdrawn wallets counted in **the PSD-3 float balance** |
| `AnomalyAlert` | Withdrawn alerts inflated flag counts and the review queue |
| `Settlement` | Withdrawn settlements counted in settlement value |

Nothing about this failed loudly. Every individual query read correctly, the
totals were plausible, and the only way to see it was to withdraw a record
and check whether the number moved. Verified after the fix by inserting live
and withdrawn rows side by side: payments report 10 of 15,
alerts 4 of 6, and PSD-3 reports 4 wallets at N$100.00 rather than 6 at
N$20,098.00.

**Two sites deliberately do not filter**, and are documented at the call
site: the `merchant_code` uniqueness pre-check in
`api/resources.py`. Both columns are `UNIQUE` at the database level, so a
withdrawn row still holds its code; filtering there would report the code as
free and then fail on INSERT with an integrity error the caller cannot act
on. Those are uniqueness checks, not record lookups.

**The recurrence guard is `backend/tests/test_soft_delete_filters.py`.** It
reads the source, finds every query block constraining
`<Model>.organization_id` for a model carrying `deleted_at`, and fails unless
the block also constrains `deleted_at` or is listed as an exemption with a
reason. It was verified to fail by reintroducing the PSD-6 bug, and it names
the offending file and line. This matters more than the fix itself: the
underlying cause — three services bypassing `PaymentRepository` — is
unchanged, so without a guard the same defect returns the next time someone
adds a query. Routing those services through the repository remains the
durable structural fix; the guard is what makes its absence safe.

---

## Decision: modular monolith, not microservices

**Status: decided, revisit at sustained load or a second team.**

The oversight work is now genuinely decoupled — a shared read layer
(`app/data/payment_repository.py`), services that do not import each other,
and a declarative composer (`app/services/nps_dashboard.py`) that assembles
the indicator set. That is *modularity*. It is not microservices, and the
distinction is deliberate.

### Why not split into services now

- **One relational database with cross-cutting tenancy.** Every operational
  table carries `organization_id`, and the metrics join across payments,
  businesses, payments and alerts. Splitting the deployment means either
  distributed transactions on payment data or eventual consistency in a
  regulatory return. Neither is a trade worth making to solve a problem we do
  not have.
- **No load to relieve.** Independent scaling is the main argument for
  separate services. There is no production traffic yet, so the argument
  currently buys nothing and costs service discovery, tracing, contract
  versioning and a deployment topology someone has to operate.
- **One team.** Microservices mostly solve an organisational problem —
  letting teams deploy without coordinating. With one team it is overhead
  paid for a benefit nobody collects.
- **The seams are already where the split would go.** Repository, services,
  composer, routers split by reader. If a service must be extracted later,
  the boundary already exists and the extraction is mechanical rather than
  archaeological.

The honest failure mode of deciding otherwise: a distributed system whose
parts still share one schema. That is a monolith with network calls in it,
and it is worse than either option.

### Decision: Redis for cached assemblies

`redis==5.0.1` sat declared and running, imported by nothing, for months.
It now caches the NPS dashboard assembly, and the numbers justify it:
**9,618ms cold, 335ms warm — 29x.** Fourteen indicators over a quarter of
payments is the slowest read in the platform and the one a person refreshes.

Scope is deliberately narrow: **derived, read-only aggregates only.** Never a
payment, a balance or an alert status. A cached payment status is a stale
payment status, and the whole argument for this product is that a regulator
can trust what it says. An aggregate is different — a concentration index five
minutes old is still true about five minutes ago, and every cached response
carries `cachedAt` and `ageSeconds` so a reader can tell.

Changing a rule threshold invalidates the cache. A cached alert rate computed
under superseded thresholds is not merely stale, it describes a policy no
longer in force.

Cache failure is soft: unreachable Redis means every request computes
normally. A cache that can break the thing it accelerates is worse than none.

### The latency that actually matters here

The slowest read in the platform is the dashboard assembly, and the person
waiting on it is an analyst rather than someone mid-transaction. That is a
materially easier problem than a payment path: a dashboard can be served from
a cache with its age stated, and a five-minute-old concentration index is
still a true statement about five minutes ago.

Nothing in this system sits inside a payment, so no latency here can delay a
payment reaching anyone. That is worth stating explicitly because it removes
an entire category of engineering constraint — there is no request whose
slowness costs someone their money.
