# Buffr Intelligence

A RegTech and SupTech analytics platform for the Bank of Namibia. It reads
transaction-pattern data from Namibia's instant payment rails and turns it into
real-time dashboards, explainable anomaly detection, market-structure and
financial-inclusion metrics, and automated regulatory reporting.

Instant payments raise transaction volume and velocity at the same time. That
is the condition under which an annual, retrospective reporting cadence stops
being sufficient on its own — not because anything is out of control, but
because the profile of what oversight has to catch changes. This platform is
the layer that turns a payment record into evidence a supervisor can act on
and defend acting on.

**This system never touches money.** It is told the outcome of payments that
have already settled, and analyses them. It cannot start, stop, hold or
reverse a payment, and it holds no funds at any point — structurally, not as a
matter of policy. There is no code path that could do otherwise.

**What it observes.** Buffr Intelligence reads data about payments carried on
the WayaMe rails. WayaMe is the consumer-facing name of Namibia's instant
payment service, operated by Instant Payments Namibia (IPN); it is named here
to say what this platform observes, **not to imply endorsement, partnership,
licence or approval that has not been granted**.

---

## Documentation

This file is the brief. The detail lives in [`docs/`](docs/README.md) and is
not duplicated here.

| Document | Covers |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | What WayaMe is, our position beside it, the data flow, data-model rules, known gaps, scale path |
| [`docs/ux.md`](docs/ux.md) | Personas, journeys, role capabilities, trust patterns |
| [`docs/business-plan.md`](docs/business-plan.md) | Market, operating model, roadmap, risk, team |
| [`docs/privacy.md`](docs/privacy.md) | Personal data, GDPR/POPIA posture, data minimisation |
| [`docs/regulatory.md`](docs/regulatory.md) | Namibian payment-system obligations, standards, contacts |
| [`docs/analytics-chat.md`](docs/analytics-chat.md) | The natural-language analytics surface |
| [`docs/design-system.md`](docs/design-system.md) | Visual language and the rules that keep it honest |
| [`backend/notebooks/anomaly_detection.ipynb`](backend/notebooks/anomaly_detection.ipynb) | The anomaly-detection framework end to end, runnable, with the field-by-field data ask for IPN |
| [`backend/ml/README.md`](backend/ml/README.md) | Why the anomaly model is unsupervised, and why segmentation refuses to segment thin data |
| [`changelog.md`](changelog.md) | What has been built, dated |

---

## 1. Position

**An observer, not a participant.** Stating both halves together is what makes
the first half credible.

| It does | It cannot do |
|---|---|
| Receive transaction-pattern data under agreement | Start a payment |
| Analyse it for pattern, concentration and reach | Stop, hold or reverse a payment |
| Surface dashboards, anomalies and returns | Hold a balance or touch anyone's money |
| Flag unusual activity for a person to examine | Change what the rails recorded |

This is the single most important fact about the venture. An observer
relationship is a materially smaller question for a rails operator to grant
than a participant relationship, and the architecture is what makes the claim
checkable rather than asserted.

**One institutional customer, one data supplier.** The Bank of Namibia buys
the analytics; IPN supplies the data. That bilateral structure shapes every
decision here, including the ones that look like restraint.

**No per-transaction fee, ever.** A vendor earning more as more money moves
has an interest in the number it reports on. Excluding that fee is what keeps
the platform unambiguously an observer.

**No consumer product.** The businesses and individuals whose payments are
analysed are subjects of the analysis, never customers. There is no account
type that represents one, and monetising them would introduce a conflict the
platform could not answer for.

---

## 2. Method

The two-layer anomaly-detection framework published by the Bank of Canada and
the Bank for International Settlements — Desai, Kosse & Sharples, *Finding a
Needle in a Haystack*, BIS Working Papers No. 1188, May 2024 — implemented in
full and runnable at
[`backend/notebooks/anomaly_detection.ipynb`](backend/notebooks/anomaly_detection.ipynb).

**Layer 1 does not predict fraud.** It predicts when a payment was submitted
from its other attributes; payments it gets wrong go to Layer 2, where an
Isolation Forest ranks severity. That is what makes the method work with no
labelled fraud — the target is knowable for every row, and no confirmed case
is ever required.

Three things stated precisely, because a reviewer will check the source:

1. The paper names LightGBM, and compares it against logistic regression,
   decision tree, random forest and gradient boosting. All five are run here.
2. **The best model depends on what is being optimised.** The paper's own
   results have LightGBM leading on accuracy and random forest leading on
   detection. On our data the selection is made on *detection lift* — detection
   rate divided by the model's own error rate — because a less accurate model
   otherwise "wins" by being wrong more often.
3. Their setting is a high-value system; Namibia's rails are retail. The
   method transfers, their numbers do not. Every figure we publish is ours.

**No confirmed-fraud ground truth exists in Namibia**, so detection is measured
the way the paper measures it: take real payments, deliberately alter them, and
check whether the models catch the alteration — as a paired comparison against
the very payment each was made from.

**Every score is explainable.** SHAP resolves each into the features that
produced it, and every score carries the configuration fingerprint it was
computed under, so two alerts scored under different policy are never compared
as though they were one measurement.

---

## 3. Data access

Phased deliberately, so each request is a smaller and more easily evaluated
yes than the one after it, and so IPN's exposure at every stage is bounded.

| Phase | Requested | Status |
|---|---|---|
| **0 — Synthetic validation** | Nothing. The framework is built and demonstrated on data we generate, including deliberately manipulated payments | **Complete** |
| **1 — Schema and historical sample** | A bounded, anonymised historical extract and the data schema. Not a live feed, no ongoing dependency | The ask |
| **2 — Periodic aggregate access** | Regular extracts, with cadence and content controlled entirely by IPN | Later |
| **3 — Observer status** | Live or near-live access, justified by the Phase 0–2 track record rather than by an application | Later |

**Identifiers are requested as tokens, never raw.** A stable pseudonym per
participant is sufficient for every feature the models use — enough to link one
participant's payments to each other, and not enough to identify a person. No
phone number and no national ID is requested at any phase. The field-by-field
ask, and what is lost if each field is withheld, is in the notebook §11.

---

## 4. Regulatory posture

**The risk boundary is the design, not a policy.** The platform sits outside
the payment path: it is told outcomes and analyses them. It cannot initiate,
authorise, hold, reverse or settle a payment, and it holds no balance. That is
a property of where the system sits rather than a control that could be
switched off — which is the honest answer to the first question any risk
assessment asks.

**We are asking the regulator to confirm the classification, not asserting it
at them.** Whether an observer-only, non-custodial data relationship requires
payment-system authorisation, or is a RegTech vendor relationship outside it,
is a determination requested explicitly rather than assumed favourably.
PSD-12 is treated as applying in full; no exemption is sought.

Two consequences, stated plainly because they cost more to reverse later than
to honour now:

- **Nothing is claimed as approved, certified or partnered until it is.**
  Capability that is designed but not running is labelled as being built. An
  overclaim a technical reviewer can disprove in one question is expensive in a
  process built on trust.
- **Architecture stays movable where a requirement is still open.** Fixed lists
  live in configuration rather than code, tenancy is carried on every
  operational record, and the schema avoids one-way doors — so a requirement
  arriving late is a change rather than a rebuild.

---

## 5. Status

**Built and running:** the backend schema, rule scorer, analytics, market
structure, inclusion measures, constituency-level coverage, forecasting,
regulatory returns, the natural-language assistant, the operator console and
the public site. The anomaly framework runs end to end with five models
compared and every score explained.

**Running on generated data.** `backend/scripts/seed_synthetic.py` produces the
population every figure is computed from — all eleven use cases, individuals
and businesses on both sides of a payment, constituency spread, and planted
anomalies of known shape. Every row it writes is marked synthetic, so a figure
from seeded data can never be mistaken for one from real activity.

**Not established, and not claimed:** anything about real Namibian payment
behaviour. Detection rates here measure the pipeline against anomalies we
introduced. Thresholds would be re-derived on real data.

**Deployment:** the frontend is on Vercel; the backend is not deployed yet.

Keep this section and the public pages in step. The public site describes
capability as live, building or planned, and an internal status that
contradicts a public one is the version of this that causes trouble —
whichever of the two is right.
