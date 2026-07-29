# Business plan

> Market, operating model, financials, roadmap, risk and team.
>
> Part of the SoundBox documentation set — see [README.md](README.md).

---

## Executive Summary

**SoundBox** is a hardware-enabled payment confirmation device designed for Namibia's Instant Payment Programme (IPP), combined with a **predictive analytics platform** that provides real-time intelligence to regulators, banks, and merchants. The device provides loud, instant audio confirmations for merchants receiving payments via the WayaMe platform—Namibia's consumer-facing instant payment solution powered by the Unified Payments Interface (UPI) technology from India.

This business plan outlines the complete technical architecture, regulatory compliance strategy, operational model, financial projections, and **predictive analytics product suite** for establishing a SoundBox business in Namibia, with the long-term goal of local assembly and manufacturing, and the strategic objective of becoming a RegTech partner to the Bank of Namibia and NAMFISA.

---


---

## 1. Market Opportunity

### 1.1 The National Payment System Landscape

Namibia's National Payment System (NPS) is undergoing a significant transformation. The NPS Vision 2030, under the theme "Inclusive Payments, Shared Prosperity," sets out a bold roadmap for digital payments adoption. Key drivers include:

- **Instant Payment Programme (IPP)**: A national instant payment infrastructure positioned as a "public good"
- **WayaMe Brand**: The consumer-facing brand launched in June 2026, supporting Government-to-Person (G2P), person-to-person (P2P), merchant payments (P2M), business payments, and ATM withdrawals
- **UPI Technology**: Namibia is the first country to sign a licensing agreement to adopt India's UPI system for real-time digital payments
- **NAMQR Standards**: Namibia's national QR Code payment standard, finalized in May 2025, ensures interoperability across all payment streams

### 1.2 The SoundBox Opportunity

In the Indian market, the UPI SoundBox has become an essential merchant tool with over 20 million devices deployed. The device:
- Provides instant, loud audio confirmation of payments
- Builds merchant trust in digital payments
- Reduces disputes and fraud
- Enables merchants to continue serving customers while receiving payment confirmations audibly

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

### 1.6 Why Bank of Namibia Chooses SoundBox

The predictive analytics platform (§1.3) is the reason BoN would evaluate
SoundBox at all. These are the three reasons a regulator — not just a
merchant — would choose *this* vendor over an alternative device or over
building nothing.

**We grow the rails' own user base, not a competitor to them.** Every
SoundBox deployed to a market trader, taxi driver, or agent is one more
counter where digital payment is trusted enough to replace cash. The device
reads WayaMe/NAMQR confirmations and speaks them aloud; it does not
introduce a competing payment method or a second QR standard. Adoption in
the informal sector — the segment hardest to reach and the one the NPS's own
stated goals depend on — is exactly what a national payments programme needs
help with, and SoundBox is built to supply that help without asking anyone
to trust a second system.

**We do not take a cut of the payment.** SoundBox's revenue comes from the
device, the connectivity and maintenance subscription, and the analytics
platform — never a per-transaction fee (see §5.1.1). That is a deliberate
choice, not an oversight, for two reasons a regulator will recognize
immediately: it removes the standard conflict of interest a payments
intermediary carries (earning more as more money moves is misaligned with
consumer protection), and it keeps SoundBox unambiguously an *observer* of
the rails rather than a participant in them — the same architectural
boundary the platform enforces end-to-end (see
[docs/architecture.md](architecture.md)). A vendor that cannot profit from a
payment happening more, or more often, has nothing to gain from encouraging
a payment that shouldn't happen.

**The device is the entry point; the relationship is the asset.** A one-off
device sale ends the day it ships. A contract to supply, install, and
maintain SoundBox devices at scale — paired with the analytics layer BoN
already has a demonstrated appetite for (§1.3), and with local job creation
through Namibian assembly and field-service technicians (§5.2.2) — is a
different kind of engagement: a standing operational relationship with the
institution running the NPS, renewed every maintenance cycle and deepened
every time a new analytics capability ships. That is the actual prize on
offer here, not a hardware sale: becoming infrastructure the NPS depends on
and keeps re-contracting, with SoundBox's continued relevance measured by
how much it keeps contributing to outcomes BoN and IPN are already
accountable for — not by how many boxes were sold in year one.

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

## 5. Operational Model

### 5.1 Business Model

**5.1.1 Revenue Streams**

| Revenue Stream | Description | Projected Margin |
|----------------|-------------|------------------|
| Device Sales | One-time sale of SoundBox devices | 30-40% |
| Monthly Subscription | Ongoing service fee (connectivity, updates, maintenance) | 60-70% |
| Data Analytics | Merchant insights and reporting | 50-60% |
| RegTech Subscription | Regulatory reporting and analytics platform | 60-70% |
| Replacement Parts | Battery, charger, accessories | 40-50% |

**Deliberately excluded: a per-transaction fee.** An earlier draft of this
model listed one as optional. Dropped, not deferred — see §1.6 for why
taking a cut of the payment undermines the exact positioning (observer of
the rails, not a participant in them) that makes SoundBox worth contracting
in the first place.

**5.1.2 Pricing Strategy**

| Item | Price (NAD) | Notes |
|------|-------------|-------|
| SoundBox Device | 400-600 | Volume discounts for merchants |
| Monthly Service Fee | 30-50 | Includes 4G data and updates |
| Annual Service Package | 300-500 | Discounted annual rate |
| RegTech Platform (BoN) | 500,000-1,000,000/year | Enterprise subscription |
| RegTech Platform (NAMFISA) | 300,000-500,000/year | Enterprise subscription |
| Replacement Battery | 100-150 | User-replaceable |
| Bulk Order (50+) | 350/unit | 15-20% discount |

### 5.2 Supply Chain

**5.2.1 Manufacturing Partners**

| Partner | Product | Status |
|---------|---------|--------|
| CWD Limited | SoundBox OEM | Primary target |
| Oakter (Riot Labs) | SoundBox OEM | Secondary option |
| iServeU | SoundBox + PAX integration | Alternative |

**5.2.2 Manufacturing Timeline**

```
Phase 1: Import (Months 1-6)
├── Identify ODM partner
├── Finalize specifications
├── Place initial order (1,000 units)
└── CRAN Type Approval

Phase 2: Local Assembly (Months 7-12)
├── Set up assembly facility
├── Train local technicians
├── Import components
└── Begin "Box Build" assembly

Phase 3: Local Manufacturing (Years 2-3)
├── PCB assembly capability
├── SMT (Surface Mount Technology) line
├── Local sourcing of components
└── "Made in Namibia" certification
```

### 5.3 Device Distribution Channels

| Channel | Description | Target |
|---------|-------------|--------|
| Bank Partnerships | Distribution through partner banks | 40% |
| Direct Sales | Online and field sales team | 20% |
| Agent Network | Cash-in/cash-out agents | 25% |
| Retail Partners | Electronics and telecom retailers | 15% |

### 5.4 Customer Support

| Support Channel | Availability | SLA |
|-----------------|--------------|-----|
| Phone Support | 8am-8pm weekdays, 9am-5pm weekends | Response within 2 hours |
| WhatsApp Support | 24/7 | Response within 1 hour |
| Email Support | 24/7 | Response within 24 hours |
| In-Person Support | Physical service centers | Walk-in service |
| Self-Service | FAQ and troubleshooting portal | 24/7 access |

---


---

## 6. Financial Projections

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

### Phase 1: Foundation (Months 1-3)

| Milestone | Description | Responsible |
|-----------|-------------|-------------|
| 1.1 | Register company (Pty Ltd) | Legal Team |
| 1.2 | Submit FinTech Innovation Framework application | Regulatory Lead |
| 1.3 | Submit PSD-1 license application | Regulatory Lead |
| 1.4 | Engage potential ODM partners | Operations Lead |
| 1.5 | Secure initial funding | CEO |
| 1.6 | Establish office and infrastructure | Operations Lead |

### Phase 2: Regulatory Approval (Months 4-6)

| Milestone | Description | Responsible |
|-----------|-------------|-------------|
| 2.1 | Obtain FinTech Regulatory Framework approval | Regulatory Lead |
| 2.2 | Begin Regulatory Sandbox testing | Technical Lead |
| 2.3 | Obtain CRAN Type Approval | Operations Lead |
| 2.4 | Complete PSD-1 licensing | Regulatory Lead |
| 2.5 | Engage Instant Payment Namibia (IPN) | CEO |
| 2.6 | Finalize ODM partnership | Operations Lead |

### Phase 3: Development & Certification (Months 7-9)

| Milestone | Description | Responsible |
|-----------|-------------|-------------|
| 3.1 | Complete hardware design | Technical Lead |
| 3.2 | Complete firmware development | Technical Lead |
| 3.3 | Complete backend services | Technical Lead |
| 3.4 | IPN certification testing | Technical Lead |
| 3.5 | ODM production of first batch | Operations Lead |
| 3.6 | Develop predictive analytics MVP | Data Science Lead |

### Phase 4: Launch (Months 10-12)

| Milestone | Description | Responsible |
|-----------|-------------|-------------|
| 4.1 | Receive first inventory | Operations Lead |
| 4.2 | Launch marketing campaign | Marketing Lead |
| 4.3 | Onboard first merchant partners | Sales Lead |
| 4.4 | Deploy first 500 devices | Sales Lead |
| 4.5 | Launch RegTech pilot with BoN | CEO |
| 4.6 | Establish support infrastructure | Operations Lead |

### Phase 5: Scaling (Months 13-24)

| Milestone | Description | Responsible |
|-----------|-------------|-------------|
| 5.1 | Expand distribution channels | Sales Lead |
| 5.2 | Launch second product iteration | Technical Lead |
| 5.3 | Begin local assembly setup | Operations Lead |
| 5.4 | Expand team | CEO |
| 5.5 | Secure Series A funding | CEO |
| 5.6 | Deploy 5,000+ devices | Sales Lead |
| 5.7 | Expand RegTech product suite | Data Science Lead |
| 5.8 | Sign commercial agreements with BoN/NAMFISA | CEO |

### Phase 6: Assembly Plant (Months 25-36)

| Milestone | Description | Responsible |
|-----------|-------------|-------------|
| 6.1 | Establish assembly facility | Operations Lead |
| 6.2 | Train local technicians | Operations Lead |
| 6.3 | Import SMT equipment | Operations Lead |
| 6.4 | Begin "Made in Namibia" production | Operations Lead |
| 6.5 | Local component sourcing | Operations Lead |
| 6.6 | Export to SADC region | CEO |

---


---

## 8. Risk Management

### 8.1 Key Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Regulatory delays | Medium | High | Engage early, maintain relationships, use sandbox |
| Technical integration issues | Medium | High | Early IPN engagement, thorough testing |
| Supply chain disruption | Medium | Medium | Diversify suppliers, local assembly goal |
| Market adoption slow | Medium | High | Strong partnerships with banks, merchant education |
| Competition | Medium | Medium | First-mover advantage, strong branding |
| Cybersecurity breach | Low | High | Robust security architecture, regular audits |
| Currency fluctuation | Low | Medium | Local currency pricing, hedging |
| Data privacy concerns | Medium | High | Strong governance, anonymization, regulator collaboration |

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

| Position | Responsibilities | Qualifications Required |
|----------|------------------|------------------------|
| CEO | Overall strategy, regulatory, fundraising | MBA, fintech experience |
| CTO | Technical architecture, development | Engineering degree, embedded systems |
| COO | Operations, supply chain, assembly | Operations management |
| Head of Regulatory | Compliance, licensing | Legal background, financial services |
| Head of Sales | Distribution, partnerships | Sales experience, banking network |
| Head of Data Science | Predictive analytics, ML models | PhD/MSc in Data Science, AI experience |

### 9.2 Organization Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         CEO                                     │
└─────────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   CTO         │   │   COO         │   │   Head of     │
│   (Technical) │   │   (Ops)       │   │   Regulatory  │
└───────────────┘   └───────────────┘   └───────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│• Firmware Dev │   │• Supply Chain │   │• Licensing    │
│• Backend Dev  │   │• Assembly     │   │• Compliance   │
│• QA/Testing   │   │• Logistics    │   │• Reporting    │
│• Data Science │   │               │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
```

---


---

## 10. Conclusion & Call to Action

### 10.1 Key Success Factors

1. **Regulatory First**: Proactive engagement with BoN, NAMFISA, and CRAN
2. **Technical Excellence**: Reliable, secure, user-friendly device
3. **Strategic Partnerships**: Banks, IPN, and merchant networks
4. **Local Manufacturing**: "Made in Namibia" as a competitive advantage
5. **Affordable Pricing**: Accessible to informal sector merchants
6. **Data Monetization**: Predictive analytics platform for regulators
7. **First-Mover Advantage**: Establish market leadership early
8. **No Fee Conflict**: No per-transaction fee keeps SoundBox an observer of the rails, not a participant in them — see §1.6
9. **Contract, Not a Sale**: Supply + maintenance + analytics + local jobs, structured as a standing relationship BoN re-contracts, not a one-time device order

### 10.2 Immediate Next Steps

| Action | Timeline | Owner |
|--------|----------|-------|
| Register company | Week 1 | CEO |
| Submit FinTech application | Week 2 | Regulatory Lead |
| Engage BoN Innovation Hub | Week 2 | CEO |
| Engage IPN | Week 3 | CEO |
| Identify ODM partner | Week 4 | Operations Lead |
| Prepare full PSD-1 application | Month 2 | Regulatory Lead |
| Begin predictive analytics prototype | Month 2 | Data Science Lead |

### 10.3 Strategic Vision

The SoundBox is not just a hardware device—it is a catalyst for digital financial inclusion in Namibia and a foundation for a **data-driven regulatory intelligence platform**. By providing merchants with instant, audible confirmation of digital payments, the device builds trust in the digital economy, reduces fraud, and enables small businesses to participate fully in Namibia's modernizing payment ecosystem.

By pivoting to a predictive analytics startup, you become an essential partner in the modernization of Namibia's entire financial system. The regulators are ready, the technology is available, and your SoundBox network provides the perfect data foundation.

With the Bank of Namibia's commitment to the NPS Vision 2030 and the Instant Payment Programme positioned as a national public good, the SoundBox & Predictive Analytics Platform is uniquely positioned to drive adoption and contribute to **"Inclusive Payments, Shared Prosperity"** .

The device is what gets SoundBox in the room; it is not the reason the relationship lasts. What lasts is a supply, maintenance, and analytics contract renewed on its own merits year after year, growing local employment through Namibian assembly and field service (§5.2.2) as it does, with no per-transaction fee ever putting SoundBox's interests at odds with the payer's. That is the shape of a partner the NPS keeps, not a vendor it replaces at the next tender.

---
