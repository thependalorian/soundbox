# User experience: personas, journeys, capabilities

> Who uses this, what they are trying to do, and what each role can reach.
>
> Part of the Buffr Intelligence documentation set — see [README.md](README.md).

---

## 1. Two roles, one analytical surface

Everyone who signs in is doing oversight work of some kind:

- **A regulator** supervises a payment system: coverage, market structure,
  the review queue and the returns.
- **An administrator** runs the deployment: accounts, scoring policy, and
  whatever is currently broken.

Both see the same analysis, because the analysis is the product and there is
no version of it that is safe for one and not the other. A business appears
here as a subject of the analysis, never as a caller — there is no account
type that represents one.

---

## 2. Personas

### The people being measured — not users of this platform

Nobody outside the supervising institution signs in. The traders, grant
recipients, agents and small businesses whose payments this analyses are
**subjects of the analysis, never callers of the API** — and the platform has
no account type that represents one.

Naming them anyway matters, because every measure is a claim about someone:

- A trader whose stall took forty payments last week and none this week is a
  retention signal, not a row that vanished.
- A grant recipient with one large inflow twice a year and long dormancy
  between is a seasonal-income pattern, not an anomaly — flagging it would be
  the platform failing at the thing it exists to do.
- A constituency with three active businesses is a coverage finding, and the
  denominator has to be its own population rather than a national average.

Individuals transact in their own right — person-to-person is a live use case,
and the participant count grows as institutions onboard — so "business" is not
a synonym for "participant" anywhere in this system.

### Johannes — payment system analyst, central bank

Fifteen years in financial regulation. High technical literacy, deep domain
knowledge, permanently short of trustworthy data on the informal economy.

**Goal:** know where the shift off cash is actually reaching, and spot
concentrations of risk before they become systemic.

**Pain:** national aggregates hide everything interesting. Reporting arrives
as spreadsheets that cannot be interrogated. Anomaly tooling produces scores
nobody can question, so nobody trusts them.

**What the product must do:** show coverage down to constituency level,
including regions at zero; explain every alert in the business's own numbers;
order work by money at risk rather than model confidence; and produce
returns that reconcile to what the dashboards show.

### Toivo — platform administrator

Operates the deployment. Needs the onboarding queue, account management,
scoring policy, and the ability to act on alerts.

**Goal:** keep the deployment answering correctly, and keep an audit trail
that survives a question asked months later.

**Pain:** a threshold changed six months ago and nobody can say by whom or
from what, so two alerts scored under different policy get compared as though
they were the same measurement.

**What the product must do:** record every configuration change append-only
with a named actor, and stamp every score with the configuration fingerprint
that produced it.

---

## 3. Journeys

### A payment becomes a measure

1. A payment is made, cleared and settled between institutions on the
   national rails. This platform is not consulted and cannot intervene.
2. Pattern data about it is shared under agreement — scoped, minimised, and
   with tokenised identifiers rather than personal ones.
3. Rules and models score it against that participant's own history.
4. If it ranks high enough, it enters the review queue.
5. A named reviewer records a verdict. Only that decides anything.

Steps 1 and 2 are the boundary: everything this platform does happens after
a payment is already final.

### Johannes investigates a concentration

1. Opens the dashboard, sees exposure rising in one region.
2. Coverage map (`/map`) weighted by money at risk, not transaction count.
3. Flagged queue (`/flagged`) ordered by exposure — the largest amount at
   risk first, not the highest-probability alert.
4. Opens an alert: signals, real numbers, contribution weights, plus a plain
   statement of what the score did *not* consider.
5. Records a verdict — confirmed, not fraud, or needs more information.
6. That verdict is appended to the alert's immutable log and becomes the only
   ground truth the system will ever have.

Step 6 is the loop that matters: unsupervised scoring can say what is
*unusual*, never what is *fraudulent*. Only Johannes can say which.

### Toivo onboards a business

1. The navigation carries a count of applications awaiting a decision, so a
   pending application is visible without opening the page. An application
   sitting unseen is the failure this queue exists to prevent.
2. `/merchants` → the list. Approving is possible from the row itself:
   opening each application, deciding, and navigating back is how a review
   queue stops being worked.
3. Rejection routes through the detail page, because it requires a stated
   reason and the backend refuses the change without one.
4. The detail page carries registration details, beneficial owners, recent
   payments, open alerts and the full status history. Owners show whether an
   identity document is on file, never the number itself.
5. Every decision is appended to the log with the actor and timestamp.

## 4. Capability matrix

Mirrors `Sidebar.tsx`'s `navigation` array and the `RoleRoute` guards in
`App.tsx`. Enforced at the router, not merely hidden from a menu.

| Capability | Regulator | Administrator |
|---|:---:|:---:|
| Dashboard | national | full |
| Payments | all | all |
| Flagged payments | all + verdict | all + verdict |
| Businesses list | yes | yes |
| Business detail | read-only + review | full + review |
| Coverage map | yes | yes |
| Analytics | national | full |
| Ask the data | yes | yes |
| Reports | yes | yes |
| Settings | own | own + organisation |
| Review thresholds | read + change | read + change |
| Register a business | yes | yes |
| Decide an application | yes | yes |
| Record an alert verdict | yes | yes |
| Manage accounts | — | yes |

Public and unauthenticated: landing, for-regulators, how-it-works and
privacy.

---

## 5. Trust patterns

Drawn from Kore, *Designing Human-Centric AI Experiences* (ch. 4–6), and
applied where they change actual behaviour:

| Pattern | Where | Why |
|---|---|---|
| Categorical confidence before numeric | `ConfidenceBadge` | Nobody can act on "0.72". "High" is actionable; the number stays as secondary detail for auditing. |
| Reasons collapsed by default | `ExplanationCard` | A wall of reasoning on every row is noise. Available on demand, never forced. |
| State what is *not* considered | `ExplanationCard` | An analyst who thinks the score covers ownership history will overtrust it. Naming the boundary keeps trust calibrated. |
| Acknowledge feedback on the spot | `FeedbackControl` | And say what it is for — that is the honest reason to bother. |
| Copy lives in one module | `lib/copy/public.ts` | Public pages make factual claims about how the national rails work. When one of those facts changes — as the payment use-case naming did — it must change everywhere at once, not wherever someone remembers. |
| Enumerate capability, never "ask anything" | `AskComposer` | Kore names "Ask me anything" explicitly as an anti-pattern: it sets expectations the system cannot meet. The composer lists what it can answer. |
| Show provenance | `AskComposer` | Answers name the queries that produced them, so the reader can see it came from data rather than memory. |

---

