# SoundBox

A payment-confirmation speaker for Namibian sellers, and the oversight
platform built from what it hears.

A market trader cannot hear a phone over a crowd, cannot tell a real payment
screen from a screenshot, and cannot afford to hand over goods on a maybe. So
they keep asking for cash — and the part of the economy that most needs to be
counted stays invisible. A device that says the amount out loud removes that
doubt. Once thousands of those confirmations exist, they become the clearest
picture anyone has had of how money actually moves through the country.

**This system never touches money.** It is told the outcome of payments made
over Namibia's instant payment rails and announces them. It cannot start,
stop, hold or reverse a payment — structurally, not as a matter of policy.

**What SoundBox connects to.** SoundBox listens to the WayaMe rails. WayaMe
is the consumer-facing name of Namibia's instant payment service, operated
by Instant Payments Namibia (IPN); it is named here to say what SoundBox
connects to, **not to imply endorsement, partnership or approval that has
not been granted**. Establishing that relationship properly — technical
integration, branding terms, and the approvals attached to both — is work
being taken to the Bank of Namibia and IPN, not something already held.

---

## Documentation

This file is the brief. The detail lives in [`docs/`](docs/README.md):

| Document | Covers |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | What WayaMe is, our position beside it, payment flow, data rules, gaps, scale path |
| [`docs/hardware-and-approvals.md`](docs/hardware-and-approvals.md) | CRAN type approval, suppliers, approval sequence |
| [`docs/ux.md`](docs/ux.md) | Personas, journeys, role capabilities, trust patterns |
| [`docs/business-plan.md`](docs/business-plan.md) | Market, operating model, financials, roadmap, risk, team |
| [`docs/privacy.md`](docs/privacy.md) | Personal data, GDPR/POPIA posture, consumer protection |
| [`docs/regulatory.md`](docs/regulatory.md) | Namibian payment-system obligations, standards, contacts |
| [`docs/device.md`](docs/device.md) | Device specification and analytics sequence |
| [`backend/ml/README.md`](backend/ml/README.md) | Anomaly scoring approach and why it is unsupervised |
| [`changelog.md`](changelog.md) | What has been built, dated |

---

## 0. Brand & Positioning

**Current state: no independent consumer brand exists for this device yet.**
Everything in this document — device, backend, firmware — has been built
under the working name "SoundBox," but that name belongs to the
WayaMe/IPN platform, not to this company. A branding decision is still
open, and needs to be resolved before go-to-market (it affects device
silkscreening/enclosure branding, app/dashboard visual identity, marketing
copy, and the FinTech Innovation Regulatory Framework application, which
asks applicants to describe their branding and market-facing identity).

**We are open to WayaMe co-branding.** Two realistic paths:

| Option | Description | Precedent | Trade-off |
|---|---|---|---|
| **Independent brand, WayaMe-certified** | Launch under this company's own name/mark, with a "Works with WayaMe" / "WayaMe-certified" badge — the model most Indian UPI sound boxes actually use (Paytm Soundbox, PhonePe Soundbox: PSP-branded hardware riding the shared UPI rail). | CWD/Oakter-manufactured sound boxes for PhonePe, Paytm | Full control over brand equity and future product line extensions; more marketing spend needed to build recognition from zero. |
| **Full WayaMe co-branding / white-label** | Device and app ship as an official "SoundBox," this company positioned primarily as the manufacturing/operations partner rather than the consumer-facing brand. | Analogous to NIPL/NPCI white-label hardware programs | Immediate trust transfer from the WayaMe/BoN brand (useful for informal-sector adoption, per §1.3 Target Market); less differentiation if IPN later licenses other manufacturers under the same mark. |

**Next step**: raise branding/trademark terms directly with Instant Payment
Namibia (IPN) during the Phase 1 technical-integration engagement (§2.4
Regulatory Engagement Strategy) — co-branding use of the WayaMe mark is
IPN's call, not a unilateral choice. Until that's settled, all
documentation, firmware strings (`payment_handler.h`'s `PaymentNotification`
device labels), and dashboard copy should stay genericized (e.g. "SoundBox"
rather than a committed brand name) so nothing has to be re-labeled mid-build.

**We are open to co-branding, and to being told what it should look like.**
Both paths in the table above are acceptable outcomes. The mark belongs to
IPN, so the terms are theirs to set; our position is that we would rather
agree them early than build an identity that has to be unwound.

---

## 0a. Regulatory posture

**The risk boundary is the design, not a policy.** SoundBox sits outside
the payment path: it is told outcomes and announces them. It cannot
initiate, authorise, hold, reverse or settle a payment, and it holds no
customer balance. That is a property of where the system sits rather than a
control that could be switched off — which is the honest answer to the
first question any risk assessment asks of a new participant.

**We are engaging the regulators to confirm that, not asserting it at
them.** The Bank of Namibia (Innovation Hub, and the NPS department),
Instant Payments Namibia, and CRAN each define requirements this product
has to meet — licensing and authorisation, operational and cybersecurity
standards, the national QR standard, and radio type approval. Those
engagements are underway or being opened, and their output is expected to
**shape the design and architecture**, not merely to certify what has
already been built. Where a requirement conflicts with a decision made
here, the requirement wins and the decision changes.

Two consequences worth stating plainly, because they cost more to reverse
later than to honour now:

- **Nothing is claimed as approved, certified or partnered until it is.**
  Capability that is designed but not running is labelled as being built —
  see the roadmap treatment on the oversight pages. An overclaim that a
  technical reviewer can disprove is expensive in a process built on trust.
- **Architecture stays movable where a requirement is still open.** Fixed
  lists live in configuration rather than in code, tenancy is carried on
  every operational record, and the schema avoids one-way doors, so a
  requirement arriving late is a change rather than a rebuild.

---

---

## Status

Backend schema, scoring, analytics and reporting are built and deployed
against a live database. The operator interface and public site are built.
The anomaly scorer runs on transparent rules; the anomaly model is written and
waiting on real transaction history. No device has been manufactured, and
CRAN type approval has not been filed — see
[`docs/hardware-and-approvals.md`](docs/hardware-and-approvals.md) for the
sequence that has to happen before a pilot.
