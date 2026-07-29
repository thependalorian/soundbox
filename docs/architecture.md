# Architecture

> How the system is actually built, what it deliberately cannot do, and where it breaks at scale.
>
> Part of the SoundBox documentation set — see [README.md](README.md).

---

## 1. What this system is

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
2. **The stated target market is ours.** The programme is explicitly aimed at
   small businesses, street vendors, farmers and township traders who have
   relied on cash and lack access to expensive payment infrastructure. Those
   are precisely the people a sound box serves. We are not proposing a new
   market — we are proposing the missing piece of an existing one.

### Our position in it

**An observer, not a participant.** The platform is told the outcome of
payments made over WayaMe and announces them aloud. It is not in the payment
path.

This is the single most important fact about the architecture, and it is
structural rather than a policy we apply:

| It does | It cannot do |
|---|---|
| Receive confirmation from WayaMe that a payment succeeded | Start a payment |
| Announce the outcome on the device | Stop, hold or reverse a payment |
| Record what it observed, and where | Hold a balance or touch anyone's money |
| Flag unusual patterns for human review | Change what WayaMe recorded |

Verifiable in the code: the only outbound calls in
`backend/app/services/wayame_api_client.py` are `verify_payment`
(a **GET** on `/payment/status/{transaction_id}`), `register_device` and
`send_heartbeat`. There is no initiate, authorise, debit, decline or block
anywhere in `backend/app/`.

**Why this matters commercially.** The company that proved this model at
scale abroad suffered severe regulatory action against its *banking* arm,
which was a major factor in its collapse. A device business that holds no
money and moves no money is not exposed to that category of risk at all.
Staying out of the payment path is a feature, not a limitation, and it
should be stated first in any conversation with the Bank of Namibia.

> **On the precedent used throughout this document.** Namibia's instant
> payment platform is derived from technology licensed from NPCI
> International, so the Indian deployments are the closest available
> reference implementation. They are cited as evidence of what works at
> scale — not as a description of what we are building. Everything below
> describes the Namibian system: WayaMe, IPN, NAMQR, the Bank of Namibia.

---

## 2. Payment flow

The device is waiting to be told what happened. Every step below is
observation, not action.

```
  Customer phone                   WayaMe (operated by IPN)           SoundBox + this system
        │                                    │                                 │
        │  1. scans seller's static NAMQR    │                                 │
        │───────────────────────────────────>│                                 │
        │  2. approves payment in their      │                                 │
        │     own bank's app                 │                                 │
        │───────────────────────────────────>│                                 │
        │                                    │  3. money moves, bank to bank   │
        │                                    │      (nothing to do with us)    │
        │                                    │                                 │
        │                                    │  4. WayaMe pushes the outcome   │
        │                                    │────────────────────────────────>│
        │                                    │  5. (fallback) we ask for status│
        │                                    │<────────────────────────────────│
        │                                    │                                 │  6. speaks the
        │                                    │                                 │     amount aloud
        │                                    │                                 │  7. records it
```

**Step 4 should be a push, not a poll.** An earlier draft of this document
argued for polling on the grounds that a device behind carrier NAT cannot
receive an inbound webhook. That reasoning was wrong, and the correction
matters:

The Indian deployments — on the rails WayaMe is derived from — use
**MQTT (or WebSocket) push**. The device opens an
*outbound* long-lived connection to a broker and keeps it open, so
confirmations arrive in real time and NAT is never an issue — the device
dialled out. Polling costs battery and data on exactly the weak 2G links
where both are scarcest, and adds latency to the one moment the seller is
waiting on.

Polling remains the **fallback**, for a device that missed a push while
offline. It is the recovery path, not the primary one.

### Failure path

If step 4 cannot complete, **the payment is unaffected** — it already
happened at step 3. What is delayed is our knowledge of it. The device
therefore:

1. Reconnects and retries with exponential backoff (3 attempts).
2. Says *"payment pending"* rather than going silent — silence is the one
   outcome a seller cannot act on.
3. Holds the amber ring so nothing is handed over yet.
4. Re-checks when connectivity returns and announces the real result.

The seller is never told a payment succeeded when it did not, and never left
guessing.

### Idempotency

The same payment can be reported more than once — a retry that actually
succeeded, a duplicate device report, a replayed message. Every transaction
carries a reference (`transactions.transaction_ref`, unique) and is upserted
on it. A repeat is recognised, announced once, and counted once.

---

## 3. Components

| Component | Location | Responsibility |
|---|---|---|
| Firmware | `firmware/src/` | Modem and broker connection, audio announcement, retry loop, local pending queue |
| Backend API | `backend/app/api/` | Payment verification, device registration, heartbeats, analytics, reporting |
| Data layer | `backend/app/db/` | Wiebe-pattern schema: immutable logs, soft deletes, tenancy on every table |
| Scoring | `backend/app/services/anomaly_scoring.py` | Transparent rule scorer that explains every score |
| Anomaly model | `backend/ml/` + `app/services/anomaly_detection.py` | Unsupervised detector, built and untrained — see `backend/ml/README.md` |
| Assistant | `backend/app/services/ask_service.py` | Natural-language questions answered by tool-calling over existing analytics methods |
| Operator UI | `frontend/src/pages/` | Three role-scoped portals (seller, oversight, administrator) |
| Public site | `frontend/src/pages/public/` | Marketing and the self-contained demo |

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
devices, businesses, payments, settlements and alerts — read and write. Three
rules hold throughout — `organization_id` on every query, `deleted_at IS NULL`
on every list, and the append-only status-log row written in the same request
as any status change.

Four decisions in the write paths are worth stating, because each one is a
constraint rather than a convenience:

- **Deletes are soft, always.** A payment taken through a device retired last
  year must still resolve that device. `deleted_at` removes a record from
  every list without removing it from the history.
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

**A device need not belong to a business.** `devices.merchant_id` is nullable
because a unit in the warehouse has no stall yet, and a unit recovered from a
closed business has none again. The alternative — inventing an assignment —
inflates that business's device count and the coverage figures built on it.
Closing a business therefore releases its devices rather than leaving them
pointing at somewhere that no longer trades.

**Taxonomies are read, not hardcoded.** `GET /type-definitions/{domain}`
gives the console its status options. A UI holding its own copy of a list
that lives in configuration will eventually offer a value the API rejects.

None of it can move money. These endpoints read payment outcomes and manage
the estate around them; the observer position is a property of the service,
not a check inside one function.

**Authorization is server-verified, never caller-asserted.** Two credentials,
neither trusting a claim the caller can set itself:

- A **person** authenticates once (`POST /auth/login`, bcrypt-checked
  password) and gets back a signed JWT. Every role-gated write decodes that
  token server-side (`app/api/deps.py`'s `require_roles`) to get the actor's
  role and identity — there is no header a request can set to grant itself
  `admin`.
- A **device** authenticates with a secret issued once, at provisioning
  (`POST /devices`'s response), bcrypt-hashed at rest and never recoverable
  afterward. `/devices/register`, `/devices/heartbeat`, `/payments/verify`
  and `/payments/process_qr` all require it (`X-Device-Code` /
  `X-Device-Key`), which is why device registration no longer creates a row
  from an unauthenticated POST — a device must already exist, provisioned by
  an admin, before it can announce itself.

A NAMQR QR's CRC (tag 63) proves the code wasn't mis-scanned; it proves
nothing about who generated it. Where a QR carries a signature (tag 66),
`app/services/namqr_processor.py` verifies it with ECDSA P-256/SHA-256
against the presenting merchant's on-file key (falling back to a configured
org-wide key), per Bank of Namibia NAMQR Code Standards v5.0 Annexure I.

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
| **Device battery** | Monotonic discharge between charges, already captured in `device_heartbeat_log` | The strongest candidate. A physical signal, a short horizon, and an action attached — "this box dies in about three days, send someone". It makes no claim about money. |
| **Payment volume** | Weekly seasonality plus trend | Legitimate once history exists. Needs the seasonality handled explicitly — a Saturday peak is not growth. Useful for settlement and capacity planning. |
| **Regional coverage** | Merchant onboarding rate per region | The most useful to oversight and the furthest away: it needs enough history per region to separate a genuine trend from a single distributor's activity. |

All three need the same thing the anomaly model needs: real transaction
history. Battery is the exception worth noting — heartbeats accumulate as
soon as a device is switched on, so it becomes possible before any payment
is ever taken.

Method, when the time comes, is the standard decomposition: separate trend
from seasonality, difference to stationarity, then fit. The weekday baseline
work in `AnomalyScoringEngine` already establishes the seasonal handling that
a volume forecast would reuse.

---

## 7. Known gaps

Identified by comparing our build against the Indian deployments, which are
the closest available reference implementation for this product category.
Each gap below is stated in terms of what it means for Namibia.

| Gap | Status | Why it matters here |
|---|---|---|
| **Multilingual announcements** | `firmware/src/audio.h` declares `language_code[4]` with `"en"`, `"af"`, `"on"`. Nothing else in the stack surfaces it. | The Indian devices ship 11 languages, and does it **without a speech engine**: short pre-recorded clips in flash are concatenated at playback — "You have received" + "forty five dollars fifty". That is what makes multilingual affordable on a cheap SoC, and it is the approach to copy. Namibia's largest first-language group speaks Oshiwambo; English-only excludes much of the target market. |
| **2G fallback** | `firmware/src/modem.h` does not distinguish generations. | Kavango, Kunene and Omaheke have thin coverage. Proven designs pair a 4G radio with 2G fallback precisely because the last mile is where the customers are — and in Namibia the last mile is most of the country by area. |
| **Static merchant QR** | `namqr_processor.py` has no static/dynamic distinction. | A static NAMQR code tied to the seller's payment alias removes per-sale QR generation and lets onboarding be a printed sticker. This is what makes near-zero onboarding cost possible, and NAMQR being a national standard means one sticker works for every bank. |
| **Push delivery to devices** | Devices call the API over HTTP; there is no broker. | This is the largest gap. Push is how confirmations reach a device in real time without draining a 2G link. It needs an MQTT broker and a persistent device connection, and it changes the firmware contract — so it should be decided before hardware is finalised, not after. |
| **Device ingestion queue** | Direct HTTP to the API. | Fine at hundreds of devices. At tens of thousands, a queue feeding a gateway is required so a backend deploy cannot drop confirmations. |

None of these are broken today at current scale. They are the things that
break first when it works.

---

## 8. Scale path

Current shape, adequate for pilot volumes:

```
devices ──HTTP──> FastAPI ──> Postgres
```

The shape it needs to become, and the order to get there:

```
devices ──> ingest gateway ──> queue ──> workers ──> Postgres
                                  │
                                  └──> analytics / scoring
```

1. **Queue first.** Decouples device reporting from backend availability. A
   deploy or a slow query stops costing confirmations.
2. **Read replica second.** Analytics and reporting compete with verification
   writes; separate them before they interfere.
3. **Partition transactions by month third.** Only once table size actually
   hurts — not before.

Deliberately not planned: caching layers, microservice decomposition, or a
streaming platform. None are justified by current or near-term volume, and
each would add operational burden a small team cannot carry.

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
  businesses, devices and alerts. Splitting the deployment means either
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

### Decision: RabbitMQ adopted for the event stream

**Status: adopted and running. Superseding an earlier position in this
document that recommended deferring it.**

The earlier argument was that MQTT suits device delivery and Redis suits
background compute, so AMQP had no clear home yet. Both halves of that remain
true and both are now implemented — device delivery is still MQTT, and Redis
caches the assemblies. What the earlier position underweighted is that the
*event stream itself* is the thing worth having early: it is an interface,
and interfaces are cheap to establish before there are consumers and
expensive afterwards.

**Topology.** A durable topic exchange `soundbox.events`, routing keys
`payment.verified`, `payment.failed`, `alert.raised`, `alert.verdict`,
`device.status_changed`, `merchant.status_changed`. Consumers bind by name
rather than wildcard, so a new event type is an explicit decision to consume
rather than something that silently starts arriving.

**Postgres remains the system of record.** Every event describes a row that
is *already committed* — publishing happens after the commit, never before,
because an event describing a payment that did not persist would have a
consumer announcing money that is not there. A lost event costs a
notification, never the truth.

**Publishing is best-effort and never raises.** A broker outage must not fail
a payment: a seller at a stall does not care that our bus is down, and taking
a working system and making it depend on a new one would be the worst
possible trade. Measured with the broker stopped: the first publish returns
`False` after 56ms, subsequent publishes after 2ms — a degraded flag prevents
a timeout on every payment. `EVENTS_ENABLED=false` is a supported production
posture, not just a test convenience.

**Delivery is at-least-once; idempotency is the consumer's job.** Every event
carries an `event_id` generated before publishing, so a retried publish
carries the same id and the consumer discards the duplicate. Verified:
publishing the same event twice produces one `payment.verified` at the
consumer. Announcing a payment twice is a defect a seller notices.

**Failures dead-letter rather than requeue.** A message that fails
deterministically and is requeued loops forever and saturates the broker —
the classic poison-message failure. Failed messages go to
`soundbox.events.dead` for inspection while the stream keeps flowing.

**The consumer reconnects.** A broker restart initially killed the worker,
which is a real outage in disguise: the queue grows silently while a
supervisor waits to notice. It now reconnects with backoff to a 60-second
ceiling. Verified by bouncing the broker mid-session — the consumer
reconnected and drained a message published while it was down, because both
exchange and queue are durable and messages are persistent.

**What has not changed.** Device delivery is still MQTT: the box dials out
over a mobile link, which is what makes NAT a non-issue, and AMQP is a poor
fit for a constrained device on 2G. The AMQP consumer is the seam where the
two meet.

### Decision: Redis for cached assemblies

`redis==5.0.1` sat declared and running, imported by nothing, for months.
It now caches the NPS dashboard assembly, and the numbers justify it:
**9,618ms cold, 335ms warm — 29x.** Fourteen indicators over a quarter of
payments is the slowest read in the platform and the one a person refreshes.

Scope is deliberately narrow: **derived, read-only aggregates only.** Never a
payment, a balance or an alert status. A cached payment status is a stale
payment status, and the whole argument for this product is that a seller can
trust what it says. An aggregate is different — a concentration index five
minutes old is still true about five minutes ago, and every cached response
carries `cachedAt` and `ageSeconds` so a reader can tell.

Changing a rule threshold invalidates the cache. A cached alert rate computed
under superseded thresholds is not merely stale, it describes a policy no
longer in force.

Cache failure is soft: unreachable Redis means every request computes
normally. A cache that can break the thing it accelerates is worse than none.

### The one latency problem worth naming now

`verify_payment` awaits an external WayaMe call inside the request that the
seller is waiting on. No queue fixes that — a payment confirmation cannot be
deferred, since deferring it is exactly the uncertainty the box exists to
remove. What helps there is timeout discipline and the pending state the
firmware already implements: announce *pending* rather than go silent, and
re-announce the true result. That is a correctness property of the device
protocol, not a broker.
