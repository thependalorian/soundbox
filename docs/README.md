# Buffr Intelligence — documentation

A RegTech and SupTech analytics platform for the Bank of Namibia. It reads
transaction-pattern data from Namibia's instant payment rails and turns it into
real-time dashboards, explainable anomaly detection, market-structure and
financial-inclusion measures, and automated regulatory reporting.

**Start here if you are new:** [`architecture.md`](architecture.md) §1 explains
what WayaMe is and, more importantly, what this system deliberately cannot do
to a payment. Everything else assumes that.

> **Naming note, applying to this whole set.** Buffr Intelligence reads data
> about payments carried on the WayaMe rails. WayaMe is the consumer-facing
> name of Namibia's instant payment service, operated by Instant Payments
> Namibia; it is named throughout these documents to say what this platform
> observes, **not to imply endorsement, partnership, licence or approval that
> has not been granted**.

---

## The set

| Document | What it covers | Read it when |
|---|---|---|
| [`architecture.md`](architecture.md) | What WayaMe is, our position beside it, the data flow, data-model rules, known gaps, and the scale path | Building anything, or explaining the system to a technical partner |
| [`ux.md`](ux.md) | Personas, journeys, the role capability matrix, and the trust patterns behind the interface | Designing or changing any screen |
| [`business-plan.md`](business-plan.md) | Market, operating model, roadmap, risk, team | Commercial conversations |
| [`privacy.md`](privacy.md) | Personal data held, the GDPR/POPIA standard we hold ourselves to, and data minimisation | Touching payer data, or answering a regulator on privacy |
| [`regulatory.md`](regulatory.md) | Namibian payment-system obligations, standards, contacts | Compliance work. Internal vocabulary — the public site deliberately avoids it |
| [`analytics-chat.md`](analytics-chat.md) | Design for the natural-language analytics page: Pydantic AI over AG-UI, generative UI, conversation persistence | Building or changing the assistant, or wiring a new tool into it |
| [`design-system.md`](design-system.md) | The visual language, where it comes from, and the rules that keep it honest | Any interface work |
| [`../backend/ml/README.md`](../backend/ml/README.md) | Why the anomaly model is unsupervised, why Isolation Forest, why geography is a feature | Touching scoring |
| [`../backend/notebooks/anomaly_detection.ipynb`](../backend/notebooks/anomaly_detection.ipynb) | The published anomaly-detection framework end to end: EDA, five classifiers compared, severity scoring, SHAP, clustering, and the phased data ask for IPN | Reviewing or extending the models |
| [`../changelog.md`](../changelog.md) | What has actually been built, dated | Catching up |

---

## Four things that are easy to get wrong

**1. WayaMe is not an app.** It is the consumer-facing brand of Namibia's
national instant payment service — the rails themselves, administered by
Instant Payments Namibia, a Bank of Namibia subsidiary. Customers pay through
*their own bank's app*. Nobody installs anything called WayaMe.

**2. We never touch money.** This platform is told the outcome of payments and
analyses them. There is no code path here that can start, stop, hold or reverse
a payment, and it holds no funds at any point. That is structural, not a
policy, and it is the first thing to say in any regulatory conversation.

**3. A participant is not always a business.** Individuals transact in their
own right — person-to-person is a live use case, and the participant count
grows as institutions onboard. Copy, schema and metrics say *participant*
where they mean everyone transacting, and *business* only where a business is
specifically meant.

**4. Region, constituency and town are three different things.** Namibia has
14 regions, subdivided into 121 electoral constituencies. Local authorities —
cities, towns and villages — are a **separate classification** under the Local
Authorities Act, not a subdivision of a constituency. Coverage is reported at
constituency level because that is where a gap is visible; a regional average
hides it. See `backend/app/db/namibia_geography.py`.

---

## Repository layout

```
backend/       FastAPI + SQLAlchemy over Postgres. Scoring, reporting, analytics.
  ml/          Offline model training and segmentation. Not imported at request time.
  notebooks/   The anomaly-detection framework, end to end and runnable.
  scripts/     Synthetic data generation for Phase 0 validation.
frontend/      React + TypeScript. Operator console under src/pages/,
               public site under src/pages/public/.
  components/illustration/   Figures that make an argument, plus the
               generated Namibia region geometry.
  components/charts/         Reusable chart primitives, one shared scale.
  scripts/     Brand asset derivation — run it, do not hand-edit the outputs.
docs/          This set.
```
