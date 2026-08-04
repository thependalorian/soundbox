# Regulatory framework and compliance

> Namibian payment-system obligations, standards and contacts. Internal reference — the public site deliberately avoids this vocabulary.
>
> Part of the Buffr Intelligence documentation set — see [README.md](README.md).

---

## 2. Regulatory Framework & Compliance

### 2.1 Primary Regulatory Landscape

The regulatory framework for payment services in Namibia is governed by the **Payment System Management Act, 2023 (Act No. 14 of 2023)** . Key determinations relevant to the Buffr Intelligence business include:

| Determination | Relevance |
|---------------|-----------|
| **PSD-1 (2026)** | Licensing and Authorisation of Payment Service Providers |
| **PSD-3** | Issuing of Electronic Money in Namibia |
| **PSD-4** | Conduct of Card Transactions within the NPS |
| **PSD-6** | Authorisation of Payment System Operators and System Participants |
| **PSD-8** | Imposition of Administrative Penalties |
| **PSD-9** | Conduct of Electronic Funds Transfer Transactions |
| **PSD-11** | Interchange Rates and Off-Us ATM Withdrawal Fees |
| **PSD-12** | Operational and Cybersecurity Standards |
| **PSD-13** | Designation of Systemically Important Systems |
| **FinTech Innovation Regulatory Framework** | Structured pathway for testing new payment products |

### 2.2 Required Licenses and Authorizations

**2.2.1 Payment Service Provider License (PSD-1)**

Under section 10 of the PSM Act, any person offering payment services must be licensed as a Payment Service Provider (PSP). The Buffr Intelligence business must apply to the Bank of Namibia for licensing, which includes:

- **Capital Requirements**: Minimum capital as determined by the Bank
- **Governance Requirements**: Board composition, fitness and probity assessments
- **Risk Management Framework**: Cybersecurity, operational risk, fraud management
- **User Protection Framework**: Complaint handling, data privacy

**Key Application Documents Required** (PSD-1, Section 10):
1. Certified copies of memorandum and articles of association
2. Beneficial ownership information
3. Audited financial statements or 3-year pro forma financials
4. Fitness and probity forms (PSF-001, PSF-002-1, PSF-002-2)
5. Comprehensive CVs of directors and executives
6. Risk Management Framework
7. User Protection Policy
8. Third-party agreements

**2.2.2 FinTech Innovation Regulatory Framework**

The Buffr Intelligence qualifies as a FinTech innovation under the Bank's FinTech Innovation Regulatory Framework. The framework provides a structured pathway through two programmes:

1. **Allow-and-See Programme**: For lower-risk innovations
2. **Regulatory Sandbox Programme**: For testing in a controlled, live environment

**Application Process**:
- Submit Part A of the Application Form (Analytical Framework)
- Complete Part B (deployment strategy, intended users, partnerships)
- Undergo risk assessment (Stages 1-4 of the Analytical Framework)

**2.2.3 Standards that do not apply, and why saying so matters**

Two standards are commonly assumed to apply to anything touching the national
rails, and neither applies here. Stating that explicitly is more useful than
omitting them, because a reviewer who expects to find them will otherwise
assume they were overlooked.

- **NAMQR Code Standards.** This platform neither generates nor accepts QR
  codes. It is never presented to a payer, never scanned, and never part of a
  payment initiation. QR conformance is a matter for the institutions that
  issue the codes.
- **CRAN telecommunications type approval.** There is no radio, no hardware
  and no equipment of any kind. Type approval governs equipment placed on the
  telecommunications network; this is a hosted application reached over the
  public internet.

What does apply is PSD-12, in full, and the open question of classification —
see §2.1 and the Bank's determination requested there.

### 2.3 Compliance with PSD-12: Operational and Cybersecurity Standards

PSD-12 requires entities to implement robust cybersecurity measures:

| Requirement | Implementation |
|-------------|----------------|
| Two-Factor Authentication | For every payment transaction |
| Encryption/Tokenization | For data transmission across public networks |
| Vulnerability Management | Annual penetration testing for critical systems |
| Incident Reporting | Within 24 hours for cyber incidents |
| Recovery Point Objective | 5 minutes for critical systems |
| Recovery Time Objective | Within 2 hours |
| System Availability | 99.9% uptime |

### 2.3a Software supply chain

NIST CSF 2.0 carries supply-chain risk as its own category under Govern
(GV.SC), and PSD-12's vulnerability-management requirement does not stop at
code this team writes. A dependency compromised upstream is an incident in
the platform regardless of who published it, and the 2025–26 npm attacks —
where malicious versions were live for hours before being pulled — are the
concrete version of that risk.

Five controls, and the repository's own state against each:

| Control | Why | State |
|---|---|---|
| Exact dependency versions, no `^` or `~` | A range auto-upgrades into a poisoned patch the moment one is published | **Met.** No ranged dependencies |
| Lockfile committed, never ignored | Carries integrity hashes that verify a tarball has not been tampered with | **Met.** Tracked in git |
| `npm ci` in the image, with the lockfile copied by explicit path | `npm ci` refuses to build when lockfile and manifest disagree. `COPY package*.json` silently tolerates a missing lockfile, which defeats the point | **Met.** `COPY package.json package-lock.json` then `npm ci` |
| Seven-day cool-down on new versions | Malicious releases are typically caught and yanked within 24–72 hours | **Met by practice.** Applied to every dependency added here |
| Block install-time script execution (`npm config set ignore-scripts true`) | `preinstall`/`postinstall` hooks are the primary delivery channel for npm malware | **Not met.** This is a machine-global npm setting rather than a repository one |
| Pre-commit scan for known malware indicators | Blocks a poisoned file before it reaches the remote | **Not met.** No hooks path is configured |

The last two are deliberately listed as unmet rather than quietly omitted.
Both are developer-workstation settings rather than properties of this
repository, so a green tick here would describe one machine and imply
something about every machine. They belong in the onboarding checklist for
anyone working on the platform — see the repository README.

The first four are already standing rules in the workspace conventions, which
is why they were met before this was assessed rather than as a result of it.

### 2.4 Regulatory Engagement Strategy

| Stakeholder | Engagement Method | Timeline |
|-------------|-------------------|----------|
| Bank of Namibia (Innovation Hub) | Submit FinTech application | Month 1-2 |
| Bank of Namibia (NPS Department) | PSD-1 license application | Month 2-4 |
| NAMFISA | Regulatory Sandbox application | Month 2-3 |
| CRAN | Type Approval application | Month 3-4 |
| Instant Payment Namibia (IPN) | Technical integration discussions | Month 2-5 |

**These engagements are expected to shape the design, not merely certify
it.** The purpose is to establish standing relationships with the Bank,
IPN and the supply chain, and to build to their stated requirements rather
than present a finished product for approval. Where a requirement conflicts
with a decision already made in this repository, the requirement wins and
the decision changes — which is why fixed lists live in configuration, why
tenancy is carried on every operational record, and why the schema avoids
one-way doors. A requirement arriving late should be a change, not a
rebuild.

Two rules follow, and both are cheaper to honour now than to reverse:

- **Nothing is described as approved, certified, licensed or partnered
  until it is.** Designed-but-not-running capability is labelled as being
  built, including on the public oversight pages. In a process built on
  trust, a claim a technical reviewer disproves in one question is
  expensive.
- **The WayaMe name is used to say what the platform observes, never to
  imply endorsement, partnership or licence.** See
  [`../buffr-intelligence.md`](../buffr-intelligence.md) §1.

---


---

## Appendix A: Regulatory Contacts

| Authority | Contact | Purpose |
|-----------|---------|---------|
| Bank of Namibia - Innovation Hub | fintechinnovations@bon.com.na | FinTech Framework |
| Bank of Namibia - NPS Department | assessments.npsd@bon.com.na | PSD-1 licensing |
| NAMFISA | info@namfisa.na | Regulatory Sandbox |
| CRAN | info@cran.na | Type Approval |
| Instant Payment Namibia | info@ipn.na | Technical integration |
| Payments Association of Namibia | info@pan.org.na | Industry coordination |

---


---

## Appendix B: Key Technical Standards Reference

| Standard | Description |
|----------|-------------|
| NAMQR Code Standards (2025) | Namibia's national QR Code payment standard |
| Namibian Open Banking Standards v1.0 | API standards for financial services |
| PSD-12 (2022) | Operational and Cybersecurity Standards |
| EMVCo QR Code Specification | International QR Code standard |
| ISO 20022 | Financial messaging standard |
| OAuth 2.0 / FAPI | Authorization framework |
| mTLS (RFC 8705) | Mutual TLS for secure communications |
| NIST Cybersecurity Framework | Security and risk management |
| ISO/IEC 27001 | Information security management |

---

---

## Alignment with NPS Vision 2030

Source: *Namibia National Payment System Vision and Strategy 2026-2030*
("Inclusive Payments, Shared Prosperity"), Bank of Namibia. Five strategic
themes carry named success indicators; three of them this platform can
evidence directly.

| Theme | Named success indicator | What this platform contributes |
|---|---|---|
| **User-Centricity** | "Sustained growth in active digital payment usage across user segments" | Cohort retention by onboarding month, and acceptance rate — the share of approved businesses actually taking payment. Cumulative merchant counts cannot show churn; these can. |
| **User-Centricity** | "Sustained reduction in digital payment fraud incidences" | Reviewer verdicts on anomaly alerts are the only confirmed-outcome record in the stack, and the series that a reduction claim would have to rest on. |
| **Trust and Resilience** | "Streamline and always-on payment capabilities" | Availability reported with worst-day and worst-hour figures rather than a monthly average, which can hide a day on which nothing worked. |
| **Trust and Resilience** | "Coordinated platforms for data and information sharing" | Alerts carry the reasons that produced them and the configuration fingerprint, so a finding is portable to another party rather than an unexplainable score. |
| **Digital Enablement** | "Deepened digital payment adoption, evidenced by sustained year-on-year growth" | Payment volume and value by use case, region, constituency and instrument. |
| **Knowledge Communities** | "market competition indicators, interoperability coverage, and cost-to-serve efficiencies" | Herfindahl-Hirschman concentration by business and by region, Gini on value distribution, and share by participant instrument. |

Two themes this platform does **not** evidence, stated plainly so nobody
claims otherwise: *Strategic Foresight and Innovation* (policy positions on
AI, tokenisation and quantum readiness) and the capacity-building half of
*Knowledge Communities* are institutional programmes, not measurements.

The 2030 strategy also states that the NPS will act "by institutionalising
user impact assessments, leveraging anonymised ecosystem data". The privacy
posture in [privacy.md](privacy.md) — masked payer aliases, national
identifiers never returned by the API — is what makes this platform's data
usable in that way.

---

## The seven use cases enabled at go-live

Source: *Bank of Namibia Instant Payment Programme, Stakeholder
Introductory Pack*. Our `payment_type` taxonomy follows the programme's own
naming, so a return we produce needs no translation:

| Code | Use case | Example |
|---|---|---|
| `p2p` | Person-to-Person | one-time services, a plumber or spaza shop |
| `p2b` | Person-to-Business | point-of-sale at a checkout, utility bills |
| `b2p` | Business-to-Person | salaries, reimbursements, freelancer payments |
| `g2p` | Government-to-Person | social grant disbursement |
| `cash_in_merchant` | Cash-in at a merchant | depositing cash into a store of value |
| `cash_out_merchant` | Cash-out at a merchant | withdrawing from a store of value |
| `atm_withdrawal` | ATM withdrawal | withdrawing from a store of value at an ATM |

**Not enabled at go-live**: `p2g`, `b2g`, `b2b`. They exist in the taxonomy
because payments of those kinds will appear when the rails carry them, and a
category added later is a migration where a configured one is a row.

This corrected an earlier error. The platform used `p2m`
("Person-to-Merchant"), which is not the programme's term, and was missing
`b2p`, `cash_in_merchant` and `atm_withdrawal` entirely while carrying `b2b`
as though it were live.

### Channels

Payments are initiated through a **participant app** or **Universal USSD**.
The USSD channel is why the Buffr Intelligence matters: a customer on a feature phone
can pay without a smartphone, and the trader still needs to know it arrived.

### Participants

Banks: Bank Windhoek, First National Bank, Standard Bank, Nedbank, Bank BIC,
Letshego Bank, Banco Atlantico. Non-bank participants include NamPost, Vivo
Energy, Nam-mic, VTS, and several payment service providers.

The platform is operated as a **public good, not-for-profit**. That is the
context for any cost figure we report: the question is cost-to-serve, not
margin.

---

## What the Bank publishes today

> Informative only. This section exists so anyone working on the platform
> understands what payment-system data currently exists in Namibia and what
> shape it takes. **It is not marketing material and does not belong in
> public copy** — quoting a regulator's own statistics back at them reads as
> posturing, the same reason this file's other vocabulary stays off the
> public site.

Source: the National Payment System statistics workbook published by the
Bank of Namibia (NPS Department), kept alongside this file as
[`reference/bon-nps-statistics-2015-2026H1.xlsx`](reference/bon-nps-statistics-2015-2026H1.xlsx)
so every figure below can be checked rather than taken on trust (it was
downloaded with a GUID filename; renamed, not altered). Five sheets — disclaimer and
legend, InterBank, IntraBank, Domestic Settlement System (NISS), Regional
Settlement System (SADC-RTGS) — covering 2015 through H1 2026. Cheque was
phased out by the industry in June 2019 and its series ends there.

**The shape of it matters more than any single figure.** The workbook
carries exactly two measures — volume and value — broken down by
instrument, reported **monthly** and **nationally**. It answers how much
moved, through which pipe, in which month. Nothing in it is per
transaction, per merchant, per region, or per use case.

Average ticket size separates the instruments into what are effectively
three different economies:

| Instrument | Average ticket (H1 2026) | What it represents |
|---|---|---|
| EFT Credit | ~N$22,198 | Salaries, business payments |
| EFT Debit | ~N$2,401 | Debit orders |
| **Card** | **~N$494** | Payments at a counter |

Card is the only instrument operating at counter scale, and it is the one
this platform sits beside. Two observations from its series:

- **Volume grew from 16.6 million to 108.7 million transactions a year
  between 2015 and 2025** — roughly 6.5x in a decade.
- **Average ticket fell over the same period**: N$528 (2015) → N$508
  (2025) → N$494 (H1 2026). Volume rising while ticket size falls means
  digital payment is moving *down-market*, into progressively smaller
  everyday purchases. That is the cash frontier receding, and it is
  receding into precisely the segment this product serves.

Like-for-like H1 2025 → H1 2026: card +4.6% by volume, EFT debit +8.8%,
EFT credit +2.5%. Do not annualise these — December is seasonally high in
every card series in the workbook.

Two caveats that must travel with any figure taken from here:

1. **Interbank only.** These are transactions cleared through Namclear
   between two institutions. On-us card activity, where payer and payee
   bank with the same institution, is not included — so the card figures
   understate total card usage in the country.
2. **There is no instant-payment series in the workbook at all.** The
   sheets cover interbank EFT and card, intrabank EFT, NISS and SADC-RTGS.
   Nothing else. This is therefore the **pre-instant-payment baseline** —
   the series against which adoption on the new rails will eventually be
   measured.

### Why this matters for what we build

The contrast is dimensional, not a question of accuracy. Today the
published record is:

```
volume × value × instrument × month × national
```

Data observed on the rails carries, for the same payments:

```
per transaction × region / constituency × use case × payer instrument
              × merchant × time of day × outcome
```

Set against the seven business questions in
[`business-plan.md`](business-plan.md) §1.7, five cannot be answered from
the currently published data at all — which alerts to review first, whether
the market is concentrating, whether adoption is reaching people, whether
agents are running dry, and any ad hoc question. Forecasting is only partly
served: a national monthly series can be forecast in aggregate, but not by
region or segment. The reconciliation question is not a gap at all — that
published workbook *is* the filing, rather than a check on one.

---

## The indicator set

`GET /nps/dashboard` returns every measure below in one response, grouped by
the 2030 strategy's themes. Assembled server-side so the figures in one
return share a window — computing each separately lets the periods drift, and
two numbers in one report measured over different periods is the error nobody
catches until it is published.

| Theme | Measure | Endpoint |
|---|---|---|
| User-Centricity | Active businesses, repeat payers, payments per active business | `/nps/adoption`, `/nps/dashboard` |
| User-Centricity | Retention by onboarding cohort | `/market/retention` |
| User-Centricity | Activation lag and dormancy | `/market/activation` |
| Trust and Resilience | Success rate, straight-through processing, worst day | `/nps/resilience`, `/market/availability` |
| Trust and Resilience | Alert and confirmed-fraud incidence per 10,000 payments | `/nps/integrity` |
| Trust and Resilience | Confirmation lag and settlement lag | `/market/settlement-lag` |
| Digital Enablement | Volume and value growth by use case | `/nps/adoption` |
| Digital Enablement | Access points per 10,000 adults, by region | `/nps/access` |
| Digital Enablement | Wallet reliance, acceptance rate, regions unreached | `/market/inclusion` |
| Digital Enablement | Net cash position at agents | `/market/cash-flow` |
| Knowledge Communities | Concentration (HHI), value Gini | `/market/concentration` |
| Knowledge Communities | Interoperability and use-case coverage | `/nps/interoperability` |

### Conventions, and why each one

- **Per 10,000 adults aged 15 and over.** The Global Findex and IMF Financial
  Access Survey basis, so our figures are comparable with what Namibia already
  reports internationally. An 18+ denominator would require interpolating the
  15-17 band out of a published aggregate, and an interpolated denominator
  quietly changes every access figure built on it.
- **Every ratio carries its denominator.** A success rate over eleven
  payments is arithmetic; over eleven thousand it is evidence. Responses say
  which, and carry `belowEvidenceFloor` when the base is thin.
- **Absent is null, never zero.** A region with no recorded population yields
  no access figure rather than an infinite one. An unrecorded payer
  instrument is counted separately rather than assumed to be bank.
- **Nothing is annualised from a partial period.** Growth is stated against
  the preceding equal window and labelled as such. A platform that has not
  run a year cannot report year-on-year, and calling a 90-day comparison
  annual would be false.
- **The alert rate is not a fraud rate.** Alerts count payments a person was
  asked to examine. Only reviewer verdicts confirm a case. Both are returned
  separately, because reporting the first as the second is the easiest way to
  mislead a supervisor using true numbers.

### Population denominators

Region populations come from the *2023 Population and Housing Census*
(Namibia Statistics Agency, main report 30 October 2024), held in each region's
`type_definition` config so a correction is an UPDATE.

The fourteen regional figures sum to **3,022,401**, the published national
total, and `tests/test_census_figures.py` asserts that reconciliation. This
guard exists because an earlier revision of the table was written from memory
and nine of the fourteen figures were wrong — Zambezi was understated by 25%,
which would have inflated that region's access-per-adult by a third. A wrong
denominator does not fail loudly; it produces a plausible figure that is
quietly wrong and can reach a return.

Adult share is 62.9% (15-59 at 56.1% plus 60+ at 6.8%, 2023 census), applied
uniformly. Namibia's age structure varies by region, so this understates
adults in urban regions and overstates them in rural ones. One stated
approximation is more defensible than fourteen invented ones, and every
response reports the denominator it used.

### What this platform does not evidence

Stated plainly so nobody claims otherwise:

- **Strategic Foresight and Innovation** — policy positions on AI,
  tokenisation and quantum readiness are institutional outputs, not
  measurements.
- **Payments industry skills enablement** — training and certification
  programmes, likewise.
- **Cross-border corridor performance** — this platform observes domestic
  acceptance only.
- **Trust and confidence directly.** Repeat use is the closest honest signal
  from payment data and is what is reported. The Consumer Payments Choice and
  Behaviour Survey the strategy calls for is the instrument for the rest.

---

## Forecasting

`GET /forecast/activity` forecasts daily payment **volume and value** by
additive decomposition — level, linear trend, and a weekly seasonal index —
fitted on daily aggregates.

Decomposition rather than ARIMA, deliberately:

- The components are separately inspectable. An analyst can see that Saturday
  carries 1.8x an average day and disagree with it, which is not possible with
  fitted AR coefficients.
- It degrades honestly on short series. ARIMA on eight weeks produces
  parameters that look authoritative and are not.
- It needs no stationarity transformation, so nothing about the input is
  silently altered before the forecast is made.

Intervals come from the spread of in-sample residuals, not a distributional
assumption, and widen with the square root of horizon because uncertainty
compounds. Below 28 days of activity the endpoint returns `insufficient_data`
rather than a number: a forecast from three weeks of trading is
indistinguishable in presentation from one built on a year, and the reader
cannot tell them apart unless we say so.

**Fraud is deliberately not forecast.** A forecast extrapolates a pattern.
Fraud is adversarial — it changes *because* it is detected — so the pattern
being fitted is the one our own controls are already destroying. A fraud
forecast would be a confident number about the behaviour of someone actively
working to make it wrong. Individual merchant failure is likewise not
forecast: aggregate seasonality does not transfer to a single stall, and
presenting it as though it did would put a number on someone's livelihood
that the method cannot support.
