# Business plan

> Market, operating model, financials, roadmap, risk and team.
>
> Part of the Buffr Intelligence documentation set — see [README.md](README.md).

---

## Executive Summary

**Buffr Intelligence** is a RegTech and SupTech analytics platform built for the
Bank of Namibia. It reads transaction-pattern data from Namibia's instant
payment rails and turns it into real-time dashboards, explainable anomaly
detection, market-structure and financial-inclusion metrics, and automated
regulatory reporting.

**It holds no funds, moves no money, and has no consumer product.** It is told
the outcome of payments that have already settled, and analyses them. That is
structural rather than a policy, and it is the single most important fact
about the venture: an observer relationship is a materially smaller question
for a rails operator to grant than a participant relationship.

This is a single institutional relationship, built on a published and
peer-reviewed anomaly-detection method, seeking a data-sharing arrangement
with Instant Payments Namibia that begins with a lower-risk, lower-burden
data-discovery phase and scales toward continuous access as trust and value
are demonstrated.

> **Sections still under revision.** The commercial sections below — revenue
> model, distribution, unit economics and the financial projections — are
> being rewritten and should not be read as current. They describe an earlier
> hardware-led model. The market, positioning, regulatory and roadmap sections
> are current.

> **Naming and status note.** Buffr Intelligence reads data from the WayaMe rails. WayaMe is
> the consumer-facing name of Namibia's instant payment service, operated by
> Instant Payments Namibia; it is named throughout this plan to say what
> Buffr Intelligence connects to, **not to imply endorsement, partnership or approval
> that has not been granted**. No licence, certification, integration
> agreement or partnership described here should be read as already held —
> the engagements to obtain them are set out in
> [`regulatory.md`](regulatory.md) §2.4, and their output is expected to
> shape the design rather than merely certify it.

---


---

## 1. Market Opportunity

### 1.1 The National Payment System Landscape

Namibia's National Payment System (NPS) is undergoing a significant transformation. The NPS Vision 2030, under the theme "Inclusive Payments, Shared Prosperity," sets out a bold roadmap for digital payments adoption. Key drivers include:

- **Instant Payment Programme (IPP)**: A national instant payment infrastructure positioned as a "public good"
- **WayaMe Brand**: The consumer-facing brand launched in June 2026, supporting Government-to-Person (G2P), person-to-person (P2P), merchant payments (P2M), business payments, and ATM withdrawals
- **UPI Technology**: Namibia is the first country to sign a licensing agreement to adopt India's UPI system for real-time digital payments
- **NAMQR Standards**: Namibia's national QR Code payment standard, finalized in May 2025, ensures interoperability across all payment streams

### 1.2 The Oversight Opportunity

Instant payments raise transaction volume and velocity at the same time. That
is precisely the condition under which an annual, retrospective reporting
cadence stops being sufficient on its own — not because anything is currently
out of control, but because the profile of what oversight has to catch
changes.

What a supervisor gains from this platform:
- Real-time visibility into volume, value and reach, reported at constituency
  level rather than as a national average
- Explainable anomaly detection, where every score resolves into the features
  that produced it and carries the configuration it was computed under
- Market-structure measures — concentration and value distribution — of the
  kind competition regulators already use
- Returns that reconcile against the same record the dashboards read, so a
  filed number and a displayed number cannot silently drift apart

### 1.3 The Predictive Analytics Opportunity

The Bank of Namibia has demonstrated a clear appetite for data-driven insights, winning international awards for its use of Artificial Intelligence and Machine Learning, including:
- **Non-Performing Loans (NPL) predictive analytics model**
- **Inflation nowcasting system**

NAMFISA is also adopting **Supervisory Technology (SupTech)** with automated reporting and dashboards. This creates a direct opportunity to become a **RegTech partner** to both regulators.

### 1.4 Target Market

| Segment | Description | Estimated Size |
|---------|-------------|----------------|
| Informal Vendors | Street vendors, market traders, small kiosks | 50,000+ |
| Taxi Drivers | Public transport operators | 10,000+ |
| Small Retailers | Spaza shops, convenience stores | 15,000+ |
| Fuel Stations | Petrol stations accepting digital payments | 500+ |
| Agents | Cash-in/cash-out agents | 2,000+ |
| Government Services | G2P payment recipients | 100,000+ |
| **Regulators** | BoN, NAMFISA | 2 |

### 1.5 G2P, specifically

The largest segment in the table above by a wide margin, and worth grounding
in how grant disbursement actually works today rather than treating "100,000+"
as an abstract number.

**Who runs it today.** The Ministry of Gender Equality, Poverty Eradication
and Social Welfare (MGEPESW) sets policy; NamPost holds the disbursement
contract, having won it from a prior provider (Epupa) in a move reported to
save roughly N$51 million.

**How it works today.** Beneficiaries collect cash in person at NamPost pay
points. Documented problems with this model, reported in Namibian media:
multi-hour queues (pensioners arriving at 6am, served only by 11am); system
failures that turn beneficiaries away mid-process; rigid payout rules that
force a beneficiary drawing more than one grant (for example old-age plus a
child grant) into separate trips, adding transport cost; roughly 15,825
grants suspended over a national-registry verification mismatch; a
double-payout issue among pensioners registered in both Namibia and South
Africa. Many pensioners also distrust banks and prefer cash in hand, which is
an adoption headwind for any electronic alternative, not just a reason to
build one.

**What is already changing.** The Bank of Namibia is piloting electronic G2P
disbursement over the Instant Payment Programme rails, with social grant
beneficiaries as the *first* G2P use case — starting with recipients who are
already banked (partners reported: Bank Windhoek, Letshego Bank Namibia,
NamPost), before extending to cash-only pensioners. Bank Windhoek has been
reported piloting instant social grant payments specifically. Target timing
has moved (an earlier February 2026 date slipped to a Q3 2026 target).

**Why, in the government's own stated terms.** Officials have publicly cited
protecting pensioners from robbery after they collect cash as the reason for
moving to electronic disbursement — not queue length or disbursement
logistics. That is the framing product copy should lead with. A fixed cash
float running out partway down a queue is a real mechanical risk of the
pay-point model, but it is our own inference from how the model works, not a
reported incident — copy should keep it a secondary point, not present it as
a documented failure.

### 1.6 Why the Bank of Namibia would contract this

Three reasons a supervisor would choose this over an alternative vendor or
over building nothing.

**It serves the rails' own stated goals rather than competing with them.**
Every measure the platform surfaces about where digital payment is and is not
reaching directly serves the informal-sector adoption goal the national
payments strategy already states. It introduces no competing payment method,
no second standard and no consumer product. The segment hardest to reach is
exactly the one a national payments programme needs evidence about, and
evidence is the whole of what this supplies.

**No per-transaction fee, ever.** Revenue comes from a single institutional
subscription and from bounded engagement work — never a cut of payment volume
(§5.1.1). That is deliberate, for a reason a supervisor recognises
immediately: a vendor earning more as more money moves has an interest in the
number it reports on. Excluding that fee keeps the platform unambiguously an
*observer* of the rails rather than a participant in them, which is the same
boundary the architecture enforces end to end (see
[docs/architecture.md](architecture.md)). Nothing counted here carries an
interest in its own result.

**The relationship is the asset, not a sale.** A one-off report ends the day
it is filed. A subscription renewed each cycle as capability grows is
infrastructure the institution keeps re-contracting — deepened every time a
new measure ships, and measured by how much it keeps contributing to outcomes
the Bank and IPN are already accountable for. The reviewer verdicts
accumulating inside it are also the only path to something that does not
exist today: a defensible fraud baseline for this part of the economy.

### 1.7 The Business Questions Our Models Actually Answer

§1.3 says regulators want data-driven tooling; this is what the models
underneath the platform actually do, stated as the specific question each
one answers for a specific stakeholder — not a features list of what the
technology can do in the abstract.

**1. "Which alerts deserve a person's time first, and why?"** *(Anomaly
scoring)* A regional office cannot review every transaction. This does not
ask "is this fraud" — there are no confirmed fraud cases yet to learn that
from, and claiming otherwise would be a number nobody could defend. It asks
a narrower, answerable question instead: is this unusual *for this specific
business*, on *this specific day of the week*, against its own history — not
against one national threshold that would flag every busy Saturday at a
market stall as if it were an ordinary Tuesday. Every flagged transaction
states the actual numbers behind it ("27 payments today; this business
normally takes 8 on a Saturday") and is queued by money actually at risk,
not by how confident the model feels — a likely problem on a large amount is
reviewed before a near-certain one on pocket change.

**2. "Is the network becoming dangerously dependent on a few businesses or
one region?"** *(Market concentration)* A national payments network that
quietly depends on three merchants for half its volume is a systemic risk
the moment one of them has a bad month. Measured with the same concentration
index competition regulators already use elsewhere, split by both merchant
and region — a network can look healthy nationally while depending
dangerously on a single town.

**3. "Is adoption actually reaching people, or is a rising average hiding
who is still left out?"** *(Distribution, inclusion, retention)* An average
transaction size across a market stall and a fuel station describes neither;
median and percentile figures, plus a Gini coefficient, say how value is
actually spread. Separately: what share of payments are wallet-funded — the
clearest available signal of reaching someone without a bank account —
counted per ten thousand adults against real census population, not an
invented denominator. And whether a business onboarded three months ago is
still trading, because a cumulative merchant count hides churn completely; a
network that onboards fast and loses businesses just as fast is not actually
growing.

**4. "Are cash agents running out of money to pay people with?"** *(Agent
float risk)* An agent paying out more cash than they take in eventually has
nothing left to pay with — and on a coverage map, that looks identical to a
place that was never reached at all. Oversight needs a separate signal for
that failure mode, not a symptom hidden inside "coverage looks fine."

**5. "How much volume should we plan capacity and agent float for next
month — without pretending we can predict fraud"** *(Forecasting)* Payment
volume has real, stable weekly seasonality (market days, month-end) that a
decomposition model captures honestly, with every component — trend,
seasonal effect — inspectable and arguable rather than buried inside fitted
coefficients an analyst has to take on faith. Fraud is deliberately excluded
from what gets forecast: fraud is adversarial, it changes the moment it is
detected, so a forecast of it would be a confident number about someone
actively trying to make that number wrong. That is question 1's problem, not
a forecasting one, and the platform draws that line rather than blur it to
look more capable than it is.

**6. "Do the numbers we file with the regulator match the numbers the
dashboards show?"** *(Regulatory reporting)* Every generated return is
produced from, and persisted alongside, the same record the live dashboards
read, so a filed figure and a screen figure cannot quietly drift apart
months later. Each report runs its own reconciliation check before it is
issued and says plainly if one fails, rather than shipping a number that
merely looks right.

**7. "Can an operator get a correct answer to a question nobody built a
report for in advance?"** *(Natural-language analytics)* A fixed set of
report views cannot anticipate every question an analyst asks mid-review.
This answers ad hoc questions against live data through the same fixed set
of query functions the dashboards already use — it cannot write or run
arbitrary SQL, and it cannot invent a number the underlying data does not
actually contain.

---


---

## 5. Operating Model

### 5.1 The shape of the relationship

One supplier of data (Instant Payments Namibia), one buyer of the analytics
(the Bank of Namibia). That bilateral structure determines everything below,
and it is unusual enough to state plainly rather than describe as a market.

**5.1.1 Revenue**

| Stream | Description |
|---|---|
| Data-discovery and model-validation engagement | A paid, bounded piece of work against Phase 1 access: validating the models on real structure and deriving thresholds that currently do not exist |
| Institutional subscription | A standing subscription for the platform, renewed each cycle as capability grows |

**Deliberately excluded: a per-transaction fee.** Not deferred — excluded.
Taking a cut of payment volume would give the platform a financial interest in
the number it reports on, which destroys the exact positioning (observer of
the rails, not a participant in them) that makes the relationship grantable at
all. Nothing measured here carries an interest in its own result.

**Deliberately excluded: any consumer product.** There is no second revenue
line aimed at the businesses or individuals whose payments are analysed. They
are subjects of the analysis, never customers, and monetising them would
introduce a conflict the platform could not answer for.

> **Pricing is under revision** and is deliberately not stated here. It
> depends on which phase of data access is granted and what is contracted with
> it, and a number published ahead of that would be invented rather than
> derived.

### 5.2 Delivery model

No hardware, no inventory, no supply chain, no field estate. The platform is a
hosted application; delivery is an account, and the constraints are
operational rather than logistical.

| Concern | How it is handled |
|---|---|
| Availability | Hosted, with the append-only data store backed up and recoverable. There is no payment path to take down — an outage costs visibility, never a payment |
| Access | Accounts are issued by an administrator and never self-created; there is no sign-up form and no self-service tier |
| Change control | Every scoring-policy change is append-only with a named actor, and every score carries the configuration fingerprint that produced it |
| Data handling | Purpose limitation, storage limitation, tokenised identifiers. Terms are set by the data-sharing agreement, and the platform is built so that a term set later is a configuration change rather than a rebuild |

### 5.3 Support

A two-person team supporting one institution. The honest version of a support
model at this size is a named contact and a response commitment, not a tiered
service desk:

| Channel | Availability |
|---|---|
| Named contact for the institution | Business hours, direct |
| Email | Monitored daily |
| Incident response | Documented process, scaled to current team size and designed to be extensible as the team grows (§9.2) |

---

## 6. Financial Projections

> **This entire section is under revision and should not be relied on.** The
> figures below were built for a hardware-led model — unit sales, cost of
> goods, inventory, type approval — none of which apply to a platform with no
> device. They are retained only so the revision has a diff to work against.
> Every line will change.

### 6.1 Startup Costs

| Item | Amount (NAD) | Notes |
|------|--------------|-------|
| Company Registration & Legal | 50,000 | Registration, legal fees |
| Licensing & Regulatory Fees | 150,000 | PSD-1, FinTech application |
| CRAN Type Approval | 80,000 | Telecommunications certification |
| Initial Inventory (1,000 units) | 500,000 | First production run |
| Infrastructure Setup | 200,000 | Office, equipment, systems |
| Website & Marketing | 100,000 | Branding, launch campaign |
| Working Capital | 200,000 | First 6 months operations |
| **Total** | **1,280,000** | |

### 6.2 Revenue Projections (Year 1-3)

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Units Sold | 2,000 | 8,000 | 20,000 |
| Device Revenue | 1,000,000 | 4,000,000 | 10,000,000 |
| Subscription Revenue | 360,000 | 1,440,000 | 3,600,000 |
| RegTech Revenue | 500,000 | 1,200,000 | 2,500,000 |
| **Total Revenue** | **1,860,000** | **6,640,000** | **16,100,000** |
| COGS | 600,000 | 2,400,000 | 6,000,000 |
| Gross Profit | 1,260,000 | 4,240,000 | 10,100,000 |
| Operating Expenses | 1,000,000 | 2,200,000 | 4,500,000 |
| **Net Profit** | **260,000** | **2,040,000** | **5,600,000** |

### 6.3 Key Financial Metrics

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Gross Margin | 67.7% | 63.9% | 62.7% |
| Net Margin | 14.0% | 30.7% | 34.8% |
| Break-even Units | 1,200 | - | - |
| Payback Period | 14 months | - | - |

---


---

## 7. Implementation Roadmap

Sequenced to **data access**, because nothing else can move until that does.
Each phase is a smaller, independently justifiable request than the one after
it, and each builds the evidence for the next. Full field-by-field detail of
what is requested at Phase 1, and what is lost if a field is withheld, is in
`backend/notebooks/anomaly_detection.ipynb` §11.

### Phase 0 — Synthetic validation (complete)

| Milestone | Status |
|---|---|
| Two-layer framework implemented end to end | Done |
| Five classifiers compared on the same measures the published method uses | Done |
| Severity scoring validated by paired comparison against manipulated payments | Done |
| Every score attributable to features, globally and individually | Done |
| Market-structure, inclusion, constituency coverage and forecasting computed | Done |
| Regulatory returns reconciling against the same record | Done |

**No data was requested to reach this point.** That is the argument: the
method is demonstrable before anyone commits anything.

### Phase 1 — Schema and a bounded historical sample

| Milestone | Description |
|---|---|
| 1.1 | Amend the founding statement to reflect software and analytics |
| 1.2 | Submit the FinTech Innovation Framework application |
| 1.3 | Request the Bank's determination on classification (§10.2 of the application) |
| 1.4 | Open engagement with IPN on a bounded, anonymised historical extract |
| 1.5 | Validate models against real structure; derive thresholds that do not exist today |
| 1.6 | Deliver a paid data-discovery and model-validation engagement |
| 1.7 | First hire: Data Scientist / ML Engineer |

### Phase 2 — Periodic aggregate access

| Milestone | Description |
|---|---|
| 2.1 | Regular aggregated extracts, with cadence and content controlled by IPN |
| 2.2 | Dashboards, market-structure and inclusion measures running on a lag |
| 2.3 | Returns generated and reconciled against the shared record |
| 2.4 | Paid pilot subscription |
| 2.5 | Hire: Regulatory & Compliance Officer |
| 2.6 | Begin advisory-board formation |

### Phase 3 — Observer status

| Milestone | Description |
|---|---|
| 3.1 | Live or near-live access, justified by the Phase 1–2 track record |
| 3.2 | Review queue worked daily; reviewer verdicts accumulate |
| 3.3 | The first defensible fraud baseline for this part of the economy |
| 3.4 | Published detection accuracy — measured, not asserted |
| 3.5 | Hire: Security Engineer |
| 3.6 | Model retraining on a schedule, as the participant population grows |

### Beyond

| Milestone | Description |
|---|---|
| 4.1 | Standing subscription relationship |
| 4.2 | Cross-border corridor analytics, contingent on that infrastructure existing |
| 4.3 | Hire: Business Development / Partnerships, as institution count grows |

---

## 8. Risk Management

### 8.1 Key Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **IPN declines even Phase 1 access** | Medium | High | The phased ask is designed to make Phase 1 a smaller, more easily evaluated yes than a full agreement. A decline at Phase 1 is decision-relevant early rather than after a year of building against an assumption |
| Classification requires full licensing | Medium | High | The Bank's determination is requested explicitly rather than assumed favourably |
| Two-person team, key-person risk | High | High | Hires sequenced to capability triggers (§7), not to a timeline the funding does not support |
| Revenue depends on institution count on the rails, outside our control | High | Medium | Reflected directly in the projections rather than assumed away |
| Model drift as participants onboard | Medium | Medium | Retraining cadence before Phase 3; the participant population grows with every institution added |
| Cybersecurity breach | Low | High | NIST CSF 2.0-aligned process, fixed query surface, no funds and no payment path to compromise |
| Data privacy concerns | Medium | High | Tokenised identifiers, purpose and storage limitation, POPIA/GDPR principles adopted by choice ahead of any Namibian requirement |
| Overstating capability | Medium | High | Nothing is marked live that is not running; capabilities that cannot be measured with confidence are omitted rather than promised |

### 8.2 Fraud Prevention (PSD-8 Compliance)

PSD-8 provides the framework for administrative penalties. To avoid penalties:

- **Two-Factor Authentication**: Required for every payment transaction
- **Transaction Monitoring**: Real-time anomaly detection
- **Incident Reporting**: Within 24 hours for cyber incidents
- **Audit Trails**: Complete transaction logs
- **Customer Protection**: Clear dispute resolution process

### 8.3 Cybersecurity Compliance (PSD-12)

| Control | Implementation |
|---------|----------------|
| Encryption | AES-256 for data at rest, TLS 1.3 for data in motion |
| Authentication | mTLS with QWAC certificates |
| Monitoring | 24/7 security monitoring, SIEM |
| Incident Response | Documented response plan, tested twice yearly |
| Penetration Testing | Annual third-party testing |
| RPO/RTO | RPO 5 minutes, RTO 2 hours |

---


---

## 9. Team & Organizational Structure

### 9.1 Leadership Team

**Current team: two people.** Everything below the first two rows is a role
sequenced to a trigger in §7, not a position that exists today.

**We are open to conversations now, ahead of any of those triggers.** A role
that becomes fundable in nine months is still worth talking about in month
one — the right person for a two-person team is rarely available on the week
the budget clears. Enquiries go to the founders directly; there is no
recruitment process to enter and no vacancy to apply against.

| Position | Responsibilities | Status |
|---|---|---|
| Founder / CEO | Strategy, regulatory engagement, business development, data science direction | Current |
| Technical Operations & Infrastructure Lead | Network infrastructure, database and data-asset management, access control, the Protect and Detect functions | Current |
| Data Scientist / ML Engineer | Model validation on real data, feature engineering, the ensemble methodology in practice | Once Phase 1 access is secured |
| Regulatory & Compliance Officer | Classification, data governance as a formal function, Bank and IPN liaison | Once a subscription or paid engagement exists |
| Security Engineer | A dedicated Detect and Respond function as access scope grows | Once Phase 2–3 access begins |
| Business Development / Partnerships | Relationship management as institution count grows | As institutions onboard |

### 9.2 Organization Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    Founder / CEO                                │
│      Strategy · regulatory engagement · data science direction   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
┌───────────────────────┐              ┌───────────────────────┐
│ Technical Operations  │              │  Roles that follow    │
│ & Infrastructure Lead │              │  the data phases      │
├───────────────────────┤              ├───────────────────────┤
│• Network & infra      │              │• Data Scientist /     │
│• Database & data      │              │  ML Engineer  (P1)    │
│  asset management     │              │• Regulatory &         │
│• Access control       │              │  Compliance   (P1-2)  │
│• Protect / Detect     │              │• Security Engineer    │
│                       │              │               (P2-3)  │
│                       │              │• Business Development │
│                       │              │      (as institutions │
│                       │              │       onboard)        │
└───────────────────────┘              └───────────────────────┘

Two people today. Everything in the right-hand column is sequenced to a
data-access phase in §7, not to a date.
```

---


---

## 10. Conclusion & Call to Action

### 10.1 Key Success Factors

1. **Data access, phased.** Nothing else moves until Phase 1 is granted, and the ask is deliberately shaped to be the smallest defensible one.
2. **Observer position, structurally.** No funds, no payment path, no consumer product. It is what makes the relationship a smaller question to grant.
3. **No fee conflict.** No per-transaction fee, so nothing measured carries an interest in its own result — see §1.6.
4. **A published, checkable method.** The methodology is peer-reviewed and the implementation is inspectable end to end, rather than asserted.
5. **Explainability as a requirement.** A score a supervisor cannot interrogate is one they cannot defend acting on.
6. **Honest absence.** Capabilities that cannot be measured with confidence are left out entirely rather than listed as future promises.
7. **The relationship, not a sale.** A subscription renewed as capability grows, rather than a report filed once.

### 10.2 Immediate Next Steps

| Action | Timeline | Owner |
|--------|----------|-------|
| Amend the founding statement to software and analytics | Week 1 | CEO |
| Submit FinTech application | Week 2 | Regulatory Lead |
| Engage BoN Innovation Hub | Week 2 | CEO |
| Engage IPN | Week 3 | CEO |
| Request the Bank's determination on classification | Month 1 | CEO |
| Open IPN engagement on a bounded historical extract | Month 2 | CEO |

### 10.3 Strategic Vision

The constraint this venture exists to address is not policy intent — it is
information asymmetry. A supervisor cannot act on what it cannot see, and the
part of the economy that most needs to be measured is the part that has never
been measurable.

Instant payments change that, because for the first time the activity leaves a
record. What is missing is the layer that turns that record into evidence a
supervisor can act on and defend acting on: measured against real population
denominators, drilled to the level where a gap is visible rather than
averaged away, and explained rather than asserted.

That is the whole offer. It holds no funds, moves no money, and has nothing to
sell to the people in the data. Its value is that a regulator can look at a
number it produces, ask where the number came from, and get an answer.

---
