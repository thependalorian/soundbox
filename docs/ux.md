# User experience: personas, journeys, capabilities

> Who uses this, what they are trying to do, and what each role can reach.
>
> Part of the SoundBox documentation set — see [README.md](README.md).

---

## 1. Two audiences, opposite needs

The product serves two groups who want almost nothing in common:

- **Sellers** want certainty at the counter, in the next two seconds.
- **Oversight** wants visibility across the country, over months.

Trying to serve both in one screen or one page of copy serves neither. The
public site splits at the first click (`/for-merchants`, `/for-regulators`)
and the application splits by role.

---

## 2. Personas

### Maria — market trader, Katutura

Runs a vegetable stall. Basic smartphone, uses WhatsApp. Income around
N$2,000–3,000/month. Reads English slowly; speaks Oshiwambo at home.

**Goal:** take payment without holding up the queue or getting cheated.

**Pain:** a customer holds up a phone showing a "paid" screen. She cannot
tell a real confirmation from a screenshot or an old message, cannot hear a
notification over market noise, and cannot afford to lose a day's stock.

**What the product must do:** say the amount out loud, immediately, in a
language she uses. Nothing to read, no app, no login. If it does not know
yet, it must say so rather than go quiet — silence is the one outcome she
cannot act on.

**Her customers are not all on smartphones either.** Payment reaches her
through a banking app or through Universal USSD on a basic handset. She
cannot tell which from where she stands, and she should not have to: the box
announces both identically.

**Current gap:** announcements are English-only. `firmware/src/audio.h`
anticipates `"en"`, `"af"`, `"on"` but nothing else in the stack surfaces
language selection. For Maria specifically this is the difference between
adoption and rejection.

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

Operates the deployment. Needs device fleet health, onboarding queues, and
the ability to act on alerts.

---

## 3. Journeys

### Maria takes a payment

1. Switches the box on once. It finds the network itself.
2. Customer scans the printed code on her stall.
3. Customer approves the payment — in a banking app, or by dialling a short
   code on a basic handset.
4. Box announces *"N$45.50 received"*; ring turns green.
5. She hands over the vegetables.

**Step 3 has two paths, and the second one is the one that matters.** The
rails are reachable through a participant app *or* through Universal USSD, so
a customer with a feature phone can pay. That is a large share of the people
Maria serves. It also sharpens why the box exists: with USSD there is no
payment confirmation screen for the customer to show her, so the only
evidence available is the sound her own device makes.

Steps 3 and 4 are separated by the platform confirming the payment — she is
never asked to wait on a screen. Total added time: none.

**When the network drops** — box says *"payment pending"*, ring holds amber,
she does not hand over goods. It re-checks and announces the true result.
Her customer's payment was never affected; only her knowledge of it was late.

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
4. The detail page carries registration details, beneficial owners, connected
   devices and the full status history. Owners show whether an identity
   document is on file, never the number itself.
5. Every decision is appended to the log with the actor and timestamp.

### Toivo commissions a device

1. Records the unit on arrival. It starts `inactive` — a device that has
   never reported in must not appear healthy.
2. Assigns it to a business once the stall is known. Only businesses that
   have passed review are offered.
3. Marks it active on installation, with a note that stays on the record.
4. When the business closes, the device is released automatically rather than
   left pointing at somewhere that no longer trades.
5. Retiring it takes it out of every list. The row survives, so payments
   taken through it still resolve.

---

## 4. Capability matrix

Mirrors `Sidebar.tsx`'s `navigation` array and the `RoleRoute` guards in
`App.tsx`. Enforced at the router, not merely hidden from a menu.

| Capability | Seller | Oversight | Administrator |
|---|:---:|:---:|:---:|
| Dashboard | own business | national | full |
| Devices | own only | — | all |
| Transactions | own only | — | all |
| Flagged payments | own only | — | all + verdict |
| Merchants list | — | yes | yes |
| Merchant detail | own profile | read-only | full + review |
| Coverage map | — | yes | yes |
| Analytics | own only | national | full |
| Reports | — | yes | yes |
| Settings | own | own | own + organisation |
| Review thresholds | — | read + change | read + change |
| Register a business | — | yes | yes |
| Decide an application | — | yes | yes |
| Add or retire a device | — | — | yes |
| Assign a device | — | — | yes |
| Record an alert verdict | — | yes | yes |
| Oversight analytics | — | yes | yes |

Public and unauthenticated: landing, for-sellers, for-regulators,
how-it-works, privacy, and vacancies. The demo lives inside how-it-works
(`/demo` redirects there); trust content was folded into the privacy page
rather than kept as a separate page — see `changelog.md`.

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

## 6. Firmware-side experience

Specified here because there is no firmware harness in this repository to run
it against. The `/demo` page is its visual representation.

**LED ring**

| State | Ring | Meaning |
|---|---|---|
| Idle | Off / dim | Ready |
| Waiting | Amber, pulsing | Checking — do not hand over goods |
| Confirmed | Green | Money arrived |
| Failed | Red | Did not go through |

**Audio.** The amount is spoken in full ("N$45.50 received"). Distinct tones
for success and failure so the outcome is clear even if words are missed.
Announcements should be available in at least English, Afrikaans and
Oshiwambo — see the gap noted in §2 and `docs/architecture.md` §5.

**Zero-reading principle.** Every critical outcome is carried by sound and
colour. Text on the device is a convenience, never the only channel. A seller
who cannot read the display must still be able to run their business.
