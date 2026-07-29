# SoundBox — documentation

A payment-confirmation speaker for Namibian sellers, and the oversight
platform built from what it hears.

**Start here if you are new:** [`architecture.md`](architecture.md) §1
explains what WayaMe is and, more importantly, what this system deliberately
cannot do to a payment. Everything else assumes that.

> **Naming note, applying to this whole set.** SoundBox listens to the
> WayaMe rails. WayaMe is the consumer-facing name of Namibia's instant
> payment service, operated by Instant Payments Namibia; it is named
> throughout these documents to say what SoundBox connects to, **not to
> imply endorsement, partnership or approval that has not been granted**.
> Integration and branding terms are being taken to the Bank of Namibia and
> IPN — see [`../soundbox.md`](../soundbox.md) §0 and §0a.

---

## The set

| Document | What it covers | Read it when |
|---|---|---|
| [`architecture.md`](architecture.md) | What WayaMe is, our position beside it, the payment flow hop by hop, data model rules, known gaps, and the scale path | Building anything, or explaining the system to a technical partner |
| [`hardware-and-approvals.md`](hardware-and-approvals.md) | CRAN type approval, the proven reference implementation, candidate suppliers, and the approval sequence | Ordering hardware, or planning a pilot date |
| [`ux.md`](ux.md) | Personas, journeys, the role capability matrix, and the trust patterns behind the interface | Designing or changing any screen |
| [`business-plan.md`](business-plan.md) | Market, operating model, financials, roadmap, risk, team | Commercial conversations |
| [`privacy.md`](privacy.md) | Personal data held, the GDPR/POPIA standard we hold ourselves to, and consumer protection for sellers | Touching payer data, or answering a regulator on privacy |
| [`regulatory.md`](regulatory.md) | Namibian payment-system obligations, standards, contacts | Compliance work. Internal vocabulary — the public site deliberately avoids it |
| [`device.md`](device.md) | Device specification summary and analytics capability sequence | Hardware or roadmap detail |
| [`../backend/ml/README.md`](../backend/ml/README.md) | Why the anomaly model is unsupervised, why IsolationForest, why geography is a feature | Touching scoring |
| [`../changelog.md`](../changelog.md) | What has actually been built, dated | Catching up |

---

## Three things that are easy to get wrong

**1. WayaMe is not an app.** It is the consumer-facing brand of Namibia's
national Instant Payment Solution — the rails themselves, administered by
Instant Payments Namibia, a Bank of Namibia subsidiary. Customers pay
through *their own bank's app*. Nobody installs anything called WayaMe.

**2. We never touch money.** This system is told the outcome of payments and
announces them. There is no code path here that can start, stop, hold or
reverse a payment. That is structural, not a policy, and it is the first
thing to say in any regulatory conversation.

**3. The seller cannot read the screen.** Announcements are the product;
the display is a convenience. Any change that assumes reading has missed the
point — see [`ux.md`](ux.md) §6.

---

## Repository layout

```
backend/     FastAPI + SQLAlchemy over Postgres. Scoring, reporting, analytics.
  ml/        Offline model training. Not imported at request time.
frontend/    React + TypeScript. Operator portals under src/pages/,
             public marketing and the demo under src/pages/public/.
firmware/    Device C sources.
demo/        Standalone backend/firmware demo harness.
docs/        This set.
```

The canonical project brief lives at [`../soundbox.md`](../soundbox.md).
- [design-system.md](design-system.md) — the visual language, where it comes from, and the rules that keep it honest.
