# SoundBox - Project Changelog

This changelog tracks the implementation progress of the SoundBox project. The brief lives in `soundbox.md`; the detail in [`docs/`](docs/README.md).

---

## [1.18.0] - 2026-07-29 - Frontend Copy Audit, Trust/Privacy Merge, Vacancies

A documentation-driven audit against every `.md` file in the repo surfaced
duplicated JSX/copy, hardcoded chart colours bypassing `chartTokens.ts`,
fraud/anomaly naming drift, and public-page wording that overstated or
under-explained claims the docs didn't back. Fixed in place rather than
flagged for later.

#### Fixed — duplication
- `components/ui/TitleDetailCardGrid.tsx` (new) replaces eight identical
  Card-block copies across the public pages.
- `StatCard`, `Sparkline`, `TransactionChart`, `PaymentSequenceDiagram`,
  `GeoDistributionMap` now import `DATA`/`AXIS`/`GRID`/`STATUS`/`PLUM` from
  `lib/chartTokens.ts` instead of pasting hex literals per call site — the
  exact anti-pattern the token file's own header warns already happened once.
- `OBSERVER_BOUNDARIES` and `SCORING_ERROR_COST` (new, `lib/copy/public.ts`)
  centralise the "what it does / never touches" list and the scoring-error
  cost line, previously restated independently on two or three pages each.
- `ForRegulatorsPage`'s local `QUESTIONS` array (which duplicated a claim
  already in `lib/copy/public.ts`) is now `REGULATOR_QUESTIONS`, sourced
  from the shared copy module.

#### Fixed — naming and claims
- `TransactionDetailPage` and `AnomalyAlertDetailPage`: "Fraud score" /
  "Fraud Alerts" → "Anomaly score" / "Flagged", matching the fraud→anomaly
  rename everywhere else (`docs/architecture.md` §5).
- Dropped the unsupported "a device a trader wants anyway" claim (three
  places) in favour of the seller's actual, statable need — knowing a
  payment landed.
- "Namibia is moving off cash" → "going cash-lite" (cash isn't going away).
- "Your customer does not need a smartphone" reframed around the actual
  mechanism (a short code tied to a proxy payment number) instead of
  defining the channel by what the customer's phone lacks.
- "The standard measure competition authorities already use" now names the
  measure (the Herfindahl-Hirschman Index) instead of gesturing at it.
- Public privacy copy states data-protection standards (GDPR, POPIA) in
  full rather than as abbreviations, and no longer frames the commitment
  around Namibia's data protection law not yet being in force.

#### Changed — Trust page folded into Privacy
`/trust` is gone. Its "it cannot touch a payment" section duplicated
Privacy's own automated-decisions section, so that was dropped rather than
merged; the record-integrity and access-control sections, the
detector-sensitivity table, and the security/regulatory roadmap moved onto
`/privacy`, which now carries both promises — restraint on personal data and
integrity of the record — as one argument instead of two pages making
related claims separately. Every inbound link (`PublicShell` nav and
footer, `HowItWorksPage`'s closing CTA) updated; dead `TRUST_GROUPS` /
`TRUST_ROADMAP` exports removed from `lib/copy/public.ts`.

#### Added — `/vacancies`
States the assembly-plant plan from `docs/business-plan.md` §5.2.2 (import →
local assembly → local manufacturing) and ties it to faster local repairs.
No fabricated job listings — nothing is marked as a live opening, since none
exist yet; the page asks for interest ahead of a role being posted instead.
Added to the header nav and footer, replacing Trust's slot.

#### Also
- Four data tables (`DeviceTable`, `TransactionsPage`, `MerchantsPage`,
  three tables in `ReportsPage`) had no horizontal-scroll wrapper and would
  overflow the layout on a narrow screen; wrapped in `overflow-x-auto`.
- Public nav logo: 24px → 28px.
- `PublicShell` footer no longer links to a "Live demo" (folded into
  How It Works); the unused `CONTACT.site` field and its footer reference
  were removed together.

---

## [1.17.4] - 2026-07-28 - Browser Audit of the Public Site

Ran the built site in a browser rather than reasoning about the source, and
it surfaced things a code read would not have.

#### Fixed — nine art placeholders were rendering publicly
`ImageSlot` was drawing dashed wireframe boxes with the production notes
printed inside them — "3:2 · Landing hero", plus full art direction — visible
to any visitor. Six on the sellers page, two on regulators, one on the
landing page.

The slots have to stay, because the layouts are built around them. They now
render as a brand panel: the gradient tint with the monogram ghosted into it.
The brief and direction move to `title` and `aria-label`, so the art
direction is never lost and the media pipeline can still read it — it is just
not printed on a page a customer is looking at.

#### Fixed — the landing headline read as one word to a screen reader
`"Payment certainty for"` and the rotating word were separated by a `<br />`
and nothing else, so the accessible name was **"Payment certainty
formarket traders"**. Visually correct, audibly wrong. A code review would
not catch this; reading the DOM did.

#### Fixed — `.sr-only` was being used but never generated
Applied in markup while the utility did not exist in the stylesheet, so
screen-reader-only text was rendering on screen. Added to `globals.css`.

#### Fixed — the device looked like a bullseye
Three attempts, and the browser was what settled it:

1. A thick gradient frame around a plum square read as a crude app icon.
2. A white case with a several-hundred-dot perforated grille looked like a
   render that had not come off.
3. Concentric rings on white read as a **target**, and the signal arc was
   clipped by the viewbox.

It is now a speaker: gradient body, one white driver with a gradient dome,
two sound arcs leaving it, and the status light as a bar on the top edge
rather than a ring around the driver — a ring around a circle is a bullseye,
which is exactly what it looked like.

#### Also
- Every remaining plum-filled control now carries the gradient: the ask
  composer's send button, rail diagram stages, demo language and network
  toggles, settings language chips, map view switches, and the public nav's
  active item. Nine call sites; `bg-ink` no longer appears on any
  interactive element.
- The wordmark is now a transparent PNG. As a JPG it carried an opaque white
  box, clearly visible against the footer's tinted surface. Keyed on
  luminance rather than saturation — the lettering is dark and only
  moderately saturated, so a saturation key would have erased the wordmark
  and left the arc floating.
- Footer mark at 28px, header at 24px. An intermediate attempt at 48px was
  far too large.
- `Home` added to the public nav. The wordmark linked home, but a mark is not
  a labelled control and nothing told a visitor how to get back.
- `PageHero` gives every public page the same opening treatment — a blush
  field closing on a gradient rule. Previously each page opened with a
  centred `h1` on white, visually identical to the sections beneath it, so
  nothing announced that a page had begun.

#### Checked and found sound
Horizontal overflow measured at zero across every page — an apparent
right-edge crop in screenshots was a device-pixel-ratio artefact, not a
layout fault. No image lacks an `alt`. No empty links.

---

## [1.17.3] - 2026-07-28 - One Button, a Real QR Code, and a Branded Device

### Seven pages had their own button

`Button` only ever rendered a `<button>`, so every call to action that was a
router link had its classes pasted in by hand. That is why the gradient
rebrand reached the buttons and missed **every CTA on the public site**.

- `buttonStyles.ts` holds the styling; `Button` and `ButtonLink` both source
  from it and cannot drift.
- All seven ad-hoc CTAs converted. None remain.
- `ghost` is now gradient-*bordered* rather than filled. Two filled gradients
  side by side leave a reader unable to tell which action is the main one; a
  bordered secondary still reads as brand, at lower weight.

### The QR code was a drawing

`MerchantQrCard` rendered a hand-drawn pattern with randomised modules — fine
as marketing illustration, useless on a demo whose whole point is that a
customer can raise their phone to it.

`BrandQrCode` now renders a real code via `qr-code-styling@1.9.2` (pinned;
published April 2025, well past the cool-down), in the brand gradient with
the monogram at its centre. Two constraints that decide whether it works at
all:

- **Error correction forced to H (30%).** A logo destroys modules. At the
  default level a code with a logo scans *intermittently* — worse than one
  that plainly fails, because nobody trusts it afterwards.
- **The logo covers 22% and no more.** Past roughly a quarter even H cannot
  recover, and it fails on cheaper phone cameras first — precisely the
  segment this product serves. A code that only scans on a flagship has
  inverted its own purpose.

Corner markers stay solid and high-contrast; a gradient across a finder
pattern is where stylised codes usually become unreliable. The drawing code
was deleted rather than left behind.

Bundle grew 14.6 kB for a working, branded, scannable code.

### The device

`SoundBoxDevice` carries the brand on its body edge, grille and waveform.

**The LED ring deliberately keeps status colours.** That ring is the one part
a seller reads at arm's length, in a hurry, to decide whether to hand over
goods. Green means paid. Recolouring it to magenta would make the device look
more on-brand and less able to do its only job — and the cost of that lands
on the person least able to absorb it.

### Two closing sections that did not belong

How-it-works ended on "Ask it a question" and the demo on "This is the
merchant's half" — both describing a feature and sending the reader nowhere
they had a reason to go. Both pages serve both audiences, so both now close
with `AudienceSplit`: which side are you on, leading to the page written for
them, which in turn closes with their own sign-in.

Every path from any entry point now ends somewhere a person can act.

---

## [1.17.2] - 2026-07-28 - Role-Specific Entry Points, and Nothing Fails AA

### Each audience's page now ends where they act

- **Sellers** end on "Sign in to your business" (`/login?as=merchant`).
- **Regulators** end on "Sign in for oversight" (`/login?as=regulator`).
- **Administrator sign-in sits in the public footer**, where the handful of
  people who run the deployment expect to find it, rather than in the nav.

The demo did not disappear — it moved to a secondary link beside each. Someone
who has not bought a box yet still needs it.

The login page reads the arrival and says which account is expected. It is
copy only: **the credentials decide the role**, so a wrong or forged hint
cannot grant access to anything.

### Every text pair now clears AA

Making blush a primary surface meant re-measuring the whole ramp against it,
and it caught two failures that had been present before the rebrand:

- **`ash` measured 2.98 on white** — below even the 3.0 large-text bar, while
  carrying captions and metadata across the product. Now `#675C62` (6.39 on
  white, 4.76 on blush).
- **`sienna` measured 4.49 on white and 3.34 on blush**, and is used as a
  text colour in ten files. Now `#B80F56` (6.48 / 4.82). The display magenta
  remains as `brand-magenta` for fills and marks, where contrast is not the
  constraint.

| | paper | blush | blush-tint | mist | silver |
|---|---|---|---|---|---|
| `plum` | 15.00 | 11.16 | 13.34 | 13.41 | 12.64 |
| `slate` | 6.15 | 4.57 | 5.47 | 5.50 | 5.18 |
| `ash` | 6.39 | 4.76 | 5.69 | 5.72 | 5.39 |
| `sienna` | 6.48 | 4.82 | 5.77 | 5.80 | 5.46 |

White on the gradient button is 4.54 at its worst point. **The worst text
pair anywhere is 4.54.**

A rule was added to the design system: measure any new colour against every
surface it can land on, not just white. Blush is the one that catches
failures, because it is the darkest thing text sits on.

### Contact

One mailbox, `team@justasoundbox.com`, so the footer carries a single address
rather than implying a routing that does not exist.

---

## [1.17.1] - 2026-07-28 - Giving the Brand Area, and a Contact Address

### The colours were right and the proportion was wrong

The first rebrand pass produced plum text on white with the gradient on a
button and a hairline. Faithful in hue, wrong in weight: in the brand assets
the largest single shape on the page is a pale pink panel. The identity comes
from **area**, not accents.

- Public page bands are now `blush` where a near-white grey was.
- The landing vision section is a **gradient panel with the copy reversed out
  of it**, mirroring the launch asset's composition — light hero above,
  gradient panel below.
- The operator app field is `blush-tint`: the brand at low intensity.
  Deliberately softer than the marketing pages, because an analyst reads
  those screens for hours and a saturated field behind a working dashboard is
  fatiguing rather than on-brand.
- Selected nav items and urgent page actions carry the gradient. Row hovers
  use the blush tint — the old `fog` at `#FCFAFA` was invisible as a hover on
  a white card.

Six surfaces, 29 blush uses, 10 gradient uses, where there were two.

#### Fixed
- **Neutrals were tinted purple**, which made plum text sit on purple-grey and
  left the whole screen leaning one way. Warmed toward the coral end instead,
  so the pink reads as pink rather than as more of the same.
- **Secondary text failed AA on the new blush card.** `slate` measured 4.02:1
  on blush once blush became a primary surface rather than a rare callout.
  Darkened to `#705C67` — 4.57 on blush, 6.15 on white.
- **Body copy on the gradient panel was set at 90% white**, which measures
  3.64:1 at the coral end. Full white, at 4.54.

### Contact

`justasoundbox.com`, `team@` — in the public footer, and rendered through a
new `ObfuscatedEmail` component. The address is stored as character codes and
painted to a canvas at runtime: it is not a plain string in the source, the
bundle, or the DOM. Verified against the built bundle — the arrays survive
minification and the assembled address appears nowhere.

A published address on a payments product is a credible pretexting target,
not only a spam magnet. Accessibility is preserved with a spoken-form
`aria-label` ("team at justasoundbox dot com") — an obfuscation that locks out
assistive technology has made the page worse, not safer.

#### Fixed
- A second `eslint-disable` for a rule this config does not register, same
  class as the one in 1.15.1. Removed by restructuring the effect so the rule
  never applies, rather than silencing it another way.

### Supply-chain audit

Checked against the hardening standard supplied:

| Check | State |
|---|---|
| Exact version pinning, no `^` or `~` | Clean, both frontend and backend |
| Lockfile committed, not ignored | Tracked |
| `npm ci` in Docker, not `npm install` | Already correct |
| Lockfile copied by required path, not glob | Already correct (`COPY package.json package-lock.json ./`) |
| 7-day cool-down on new versions | Followed for the `pika` addition in 1.14.0 |
| No Next.js / React Server Components | Client-rendered throughout |
| Credentials in environment only | Confirmed; `.env` gitignored and untracked |
| Public contact address obfuscated | Now implemented |

`npm audit --omit=dev` reports 72 vulnerabilities (62 high), effectively all
in `react-scripts` transitive dependencies. This is the known cost of Create
React App, which is no longer maintained. It is **not** fixable with `npm
audit fix` without breaking the build, and it is worth naming as a real
finding rather than leaving in a log: migrating the build to Vite would clear
most of it, and is a contained change since nothing here depends on CRA
beyond `react-scripts build`.

---

## [1.17.0] - 2026-07-28 - The WayaMe Visual Language

The design system was a Steep-derived near-monochrome: near-black text, one
warm accent, a serif for headlines. The brand assets are none of those
things. Rebuilt from them.

SoundBox listens to the WayaMe rails and its own mark is drawn from the same
family — plum lettering, coral signal arc — so the interface now speaks that
language rather than a second one.

### Palette, sampled rather than guessed

Colours were pulled from the assets pixel by pixel: `brand-magenta` `#E6136C`
through `brand-coral` `#F15A29`, `plum` `#3D1152` for all text, `blush`
`#FAD5DD` for cards, `silver` `#EDEBEC` for the field behind them.

The legacy names are kept and remapped — `ink` now resolves to plum rather
than near-black — so several hundred existing class names picked up the brand
without every file being edited.

### The accessibility problem the brand hues create, and the fix

Measured against white text: `#E6136C` is **4.49:1** and `#F15A29` is
**3.37:1**, against the 4.5:1 WCAG AA requires for body text. The primary
button would have failed.

That is not a flaw in the palette — it is what happens when a display palette
meets body copy. So the system now carries both:

- **Display hues**, unchanged, for marks, large type, hairlines and brand
  surfaces, where they are correct as drawn.
- **`brand-magenta-aa` `#CF1161`, `brand-coral-aa` `#CC4C22` and
  `bg-brand-gradient-aa`** — the same hues darkened until white body text
  clears AA across the whole sweep: 4.54 at the coral end, 5.38 at the
  magenta end. Filled buttons use these.

Verified across the rest: plum on white 15.0, on blush 11.2, on silver 12.6;
`slate` 6.2. `ash` remains large-text-only, as it was before.

### Typography

The brand sets everything in a geometric sans; the system was running a serif
for headlines, which reads as a different product beside the marks. Poppins
now carries the interface, with large type set **light (300)** because the
brand lets size carry emphasis rather than weight. Tracking tightened at
display sizes — a geometric sans reads larger than the serif it replaced at
the same nominal size.

The licensed face should be confirmed against IPN's guidelines; Poppins is a
considered match, not a specified one, and it is one line to change.

### Shape

`.card-brand` reproduces the brand's card: generous radius with one square
corner. That asymmetry is the shape signature across every asset, and it is
what makes a panel read as WayaMe rather than a generic rounded box.

### Chart colours were about to be missed entirely

Recharts and inline SVG take literal colour values, so Tailwind cannot reach
them. Those literals had been pasted at a dozen call sites, and the rebrand
missed **every chart in the product** until they were found by hand.

`src/lib/chartTokens.ts` now owns them. Thirteen files updated. Series
colours are ordered by how distinguishable they are from each other rather
than by brand hierarchy — a reader has to tell series three from series four,
which matters more than which is more on-brand — and teal is included
deliberately so a fifth series does not read as another shade of pink.

**The gradient never appears in a chart.** It is the most recognisable
element in the identity and it encodes nothing; on data it would imply a
scale that does not exist.

### Also

- The eight brand reference images are in `docs/brand/`, deliberately **not**
  in `src/`. They are 6.7 MB of source material, and anything under `src/` is
  a candidate for the bundle.
- `docs/design-system.md` records the palette, the contrast measurements, the
  rules and what is still outstanding.
- The brand material confirms USSD support directly — validating the customer
  channel copy added in 1.15.0 from the stakeholder pack.

Verified: build compiles, ESLint clean, `tsc` clean.

---

## [1.16.0] - 2026-07-28 - Brand: SoundBox

A wordmark arrived, and it settled two things the codebase had been guessing at.

### The product is SoundBox. WayaMe is the infrastructure it plugs into.

The codebase wrote **"WayaMe SoundBox"** as though it were a single name, in
the API title, the database organisation row, page headers, and across every
document. That claims a relationship which is not ours to claim: WayaMe is
the consumer-facing name of Namibia's instant payment service, operated by
Instant Payments Namibia. SoundBox listens to those rails. It is not part of
them, and a name that fuses the two implies otherwise.

Corrected throughout. WayaMe still appears in 124 places — as the rails,
which is where it belongs. Where the relationship is the point it is now a
sentence ("SoundBox listens to the WayaMe rails"), not a compound noun.

### One word, capital B

The codebase carried "Sound Box" and "SoundBox" in almost exactly equal
measure — 73 against 75 — with no rule distinguishing them. The wordmark
settles it.

The generic product category deliberately stays two lowercase words: "a
cellular sound box", "Indian sound box deployments". That is what the
category is called, and using the brand form there would read as a claim
about someone else's product.

#### Added
- `src/assets/brand/soundbox-wordmark.jpg` — the primary mark, now in the
  page header and on sign-in.
- `soundbox-wayame-lockup.jpg` — the lockup showing both names, kept for
  places where the relationship to the rails is being explained.
- `BRAND` in the copy module: name, tagline, and the rails and their operator
  as separate fields, so the relationship can be stated without the names
  being concatenated by accident.
- The tagline, which the product did not previously carry anywhere:
  **Payments made audible. Trust made instant.** Now on the sign-in screen
  and in the public footer.

#### Fixed
- **Two screens claimed the name was provisional.** The public footer and
  settings both said it "is a working name" and "the final name will be
  agreed with the national payment operator". A registered wordmark makes
  that false. Both now state the accurate position: SoundBox listens to the
  WayaMe rails, WayaMe is named to say what this connects to, and naming it
  does not imply endorsement.
- **`react-app-env.d.ts` was missing entirely.** Create React App normally
  generates it; without it, no image, font or SVG import typechecks. Nothing
  had imported an asset until the wordmark did, so the gap had gone
  unnoticed. Any future asset import would have hit the same error.
- The database organisation row read "WayaMe Sound Box" and is now
  "SoundBox". Its slug is left as `wayame-soundbox`: a slug is a stable
  identifier, and changing it would orphan every row referencing this
  organisation.

Verified: `tsc` clean, `ruff` clean, build compiles with ESLint clean.

---

## [1.15.2] - 2026-07-28 - Production Copy: Specification Language Out of the Interface

Swept every rendered string in the frontend — JSX text and user-visible props,
excluding comments — for three things: technical jargon, developer
abbreviations, and specification language that had leaked from planning
documents into the product.

### Specification language describing the reader back to themselves

Two screens told the person using them what kind of person they were:

- Reports opened with *"The reporting pack a Bank of Namibia NPS analyst
  would pull for oversight"*. Someone reading that page **is** that analyst;
  being described in the third person is the tell that the sentence was
  written for a proposal. Now: "The submissions required each month, ready to
  send. Each one shows the checks it has already passed."
- Analytics carried *"The measures a payment system department reports on,
  rather than the ones an operations desk watches"* — a distinction that
  matters when arguing for a feature and means nothing to someone already
  looking at it. Now: "How the network is shaped, how far it reaches, and
  whether it holds up."

### Jargon that had gone straight from the implementation into the interface

Every one of these was correct and unhelpful:

| Was | Now |
|---|---|
| "the Herfindahl-Hirschman measure competition and payment authorities already use" | "The score below is the standard measure used for this" |
| "silhouette 0.62 · 4 segments" | "4 groups · 128 businesses measured" |
| "Configuration 7fdce6c715d5" | "Settings version 7fdce6c715d5" |
| "Idempotency is enforced on the transaction reference" | "Each payment carries its own reference, so a device retrying cannot charge twice" |
| "Written to the status log either way" | "Kept on this device's record either way" |
| "Typical payment (log)" on a chart axis | "Typical payment" |
| "thin data" | "early figures" |
| "Median" / "Mean" / "Upper quarter" | "Typical payment" / "Average" / "Larger payments" |
| "Avg latency" / "Avg probability" | "Typical response" / "Typical score" |
| "Rule configuration unavailable" | "Settings could not be loaded" |
| "Fires above 3" | "Applies above 3" |

Dashboard labels followed: "Transaction success rate" became "Payments that
went through", "Device availability" became "Boxes reporting in", "Merchant
coverage" became "Businesses taking payments", "Volume by payment type"
became "How people are paying".

Also removed the last scheme codes from an operator screen. The beneficial
owners section read *"Required under PSD-1 §8.4 and the FIA (AML/CFT)"*. A
compliance reviewer genuinely benefits from knowing an obligation exists —
the acronym stack helps nobody. Now: "Who ultimately owns this business.
Recorded because the rules on money laundering require a named person, not
just a registered company."

### What was deliberately left

Code comments still use precise terms — append-only, idempotency, silhouette
score. That is where the precision belongs: the next person to change the
scoring needs to know it is a silhouette score, and the person reading the
screen needs to know whether the groups are distinct. Same fact, two
audiences, two registers.

Verified: the sweep now reports no jargon, no developer abbreviations and no
specification framing in rendered copy. `tsc` clean, build compiles with
ESLint clean.

---

## [1.15.1] - 2026-07-28 - Build and Lint Clean

Ran the production build and both linters across the codebase. Three
categories of finding, and one of them was a real defect rather than tidiness.

#### Fixed — a parameter that did nothing
`get_activation_and_dormancy(days=...)` accepted a window, echoed it back as
`observationDays`, and **ignored it**. A caller could change it and watch
nothing move, which is worse than not offering the option: the response
looked windowed and was not.

Removing the parameter is the honest fix rather than making it work, because
both measures are all-time by nature. A business's *first* payment is not the
first one inside an arbitrary window, and clipping the history would report a
long-established business as newly activated. The endpoint and the dashboard
registry were updated to match, and the response now states its basis
explicitly.

Ruff found it as an unused local (`since`), which is the useful kind of lint
finding: the dead variable was the symptom, not the problem.

#### Fixed — ESLint could not resolve a rule being disabled
`api.ts` carried `/* eslint-disable @typescript-eslint/no-explicit-any */`
comments for a rule this project's config does not register, which ESLint
reports as an error in its own right. Rather than silence it differently, the
three `any` casts were replaced with explicit `RuleWire`, `PolicyWire` and
`RuleChangeWire` interfaces describing the snake_case API boundary.

That is the better fix on its own merits: a mapper typed `any` silently
accepts a field renamed on the backend, which is exactly the break it exists
to catch.

#### Removed — dead code
Eleven unused imports and two computed-then-discarded locals in
`namqr_processor.py`. One of those built a signature payload for a
verification routine that is not implemented; it is now a comment describing
what a real implementation would verify, because building a value nothing
consumes reads like working code and is not.

#### Verified
- `npm run build` compiles successfully with no ESLint errors.
  295 kB JS, 12 kB CSS, gzipped.
- `ruff check app ml tests` — all checks passed.
- `python -m py_compile` across backend, `tsc --noEmit` clean, census test
  passes, 62 API routes with no method+path collisions.

---

## [1.15.0] - 2026-07-28 - Marketing Pages Corrected, Copy Centralised

### The public site was quietly out of date

Three things were wrong, and one of them was a factual claim about how the
national rails work.

#### Fixed
- **The site never mentioned that a customer can pay from a basic phone.**
  Payments are initiated through a participant app *or* through Universal
  USSD — a short code, no app, no data. That channel exists precisely to
  reach people without smartphones, which is most of the population this
  programme is built for. Omitting it understated who can buy from a seller,
  and understated why the box is necessary: on the USSD path there is **no
  confirmation screen for the customer to show**, so the seller's own device
  is the only evidence available at the moment they decide whether to hand
  over goods. Now a section on the sellers page, and reasoned through in
  `docs/device.md` and `docs/ux.md`.
- **Two of the seven payment kinds were missing** and one conflated two
  distinct cases. Added cash taken in at an agent and wages/payouts;
  separated cash paid out at a counter from an ATM withdrawal. The public
  wording stays plain — "customers paying you", never "P2B". Scheme codes
  belong in returns, not on a page read by someone at a stall.
- **The regulator page described coverage and alerts** while the platform had
  grown market structure, reach measured against census population,
  behavioural segmentation, retention, settlement lag, agent cash position
  and forecasting. A site that undersells what exists is as inaccurate as one
  that oversells. Added a capabilities section and a strategy-alignment
  section, both without scheme codes.
- The regulator roadmap listed "pattern detection across regions" as
  *building* when it had shipped. Moved to live, with the genuine next step
  named: feeding behavioural groups back into scoring so a market stall is
  judged against other market stalls rather than every business in its region.

### Copy centralised

`src/lib/copy/public.ts` now holds public page copy, per the standing
convention that was not being followed. This matters more than tidiness here:
much of this copy makes factual claims about the rails, and when one changes —
as the use-case naming just did — it has to change everywhere at once rather
than wherever someone remembers.

Two consolidations found along the way, both instances of the problem the
module exists to prevent:

- A flat `TRUST_MARKS` list briefly existed alongside the trust page's own
  richer grouped copy. The page's structure moved in; the duplicate went.
- **The landing and sellers pages each carried their own wording of the
  central claim** — "Cannot be faked" and "It cannot be faked", with
  different supporting sentences. Two pages drifting apart on the single
  thing this product asserts about itself is worse than either wording.
  Consolidated into one `PROPOSITION` set that both draw from.

No public page now carries inline copy blocks.

#### Added while consolidating
- A trust item stating that an owner's national identity number is recorded
  once and never returned to any screen. That became true when the API
  started withholding it; the page had not caught up.
- A trust roadmap item for measured detector sensitivity, stated with its
  limit: it shows the detector separates deliberately altered payments from
  ordinary trading, which is not a fraud rate and is not claimed as one.

### Documented
- `docs/ux.md` — the capability matrix predated every write path added since;
  registering a business, deciding an application, adding and assigning
  devices, recording verdicts and changing review thresholds were all absent.
  Maria's journey now shows both customer channels.
- `README.md` — frontend conventions: copy in `lib/copy/`, diagnostics
  through the logger, no scheme codes on public pages.

---

## [1.14.0] - 2026-07-28 - RabbitMQ Event Stream and Redis-Cached Assemblies

Supersedes the position recorded in 1.13.0, which recommended deferring a
broker. That argument — MQTT for devices, Redis for background compute — was
right about both and underweighted the third thing: the event stream is an
interface, and interfaces are cheap to establish before there are consumers
and expensive afterwards.

### Added — the event stream
- `app/events/contracts.py`. Every event defined in one place, because an
  event is an interface: once a second consumer exists, renaming a field
  breaks a system nobody was thinking about. Events describe what happened
  (`payment.verified`), never what to do (`announce.payment`) — a publisher
  that names an action has decided what the consumer is for.
- `app/events/publisher.py`. Durable topic exchange, persistent messages,
  publisher confirms.
- `app/events/consumer.py`. A worker with the discipline that is easy to get
  wrong: explicit acks, prefetch limit, duplicate suppression, dead-lettering.
- Published from the committed write paths: payment verified and failed,
  alert raised and decided, device and business status changes.
- `docker-compose.yml` runs `rabbitmq:3.13-management`, pinned exactly. A
  floating major tag means a broker upgrade arrives whenever someone rebuilds.

### The properties that matter, and how each was verified

- **Postgres remains the system of record.** Publishing happens *after* the
  commit, never before. An event describing a payment that did not persist
  would have a consumer announcing money that is not there.
- **A broker outage cannot fail a payment.** Measured with the broker
  stopped: first publish returns `False` after 56ms, subsequent ones after
  2ms — a degraded flag prevents paying a timeout on every payment. Nothing
  raises. `EVENTS_ENABLED=false` is a supported production posture.
- **Duplicates are discarded.** `event_id` is generated before publishing, so
  a retry carries the same id. Verified: publishing one event twice produced
  exactly one `payment.verified` at the consumer. Announcing a payment twice
  is a defect a seller notices.
- **Failures dead-letter, never requeue.** A deterministically failing
  message that is requeued loops forever and saturates the broker.
- **Messages survive a broker restart.** Verified by bouncing it mid-session:
  a message published while the consumer was down was drained on reconnect,
  queue back to 0, dead-letter queue empty.

#### Fixed
- **The consumer died when the broker restarted.** Found by testing it rather
  than assuming. That is an outage in disguise — the queue grows silently
  while a supervisor waits to notice. It now reconnects with backoff to a
  60-second ceiling, and heartbeats let both ends detect a half-open
  connection instead of waiting on TCP.

### Added — Redis, finally used for what it was declared for

`redis==5.0.1` sat declared and running, imported by nothing. `app/data/cache.py`
now caches the NPS dashboard assembly. The numbers justify it: **9,618ms cold,
335ms warm — 29x.** Fourteen indicators over a quarter of payments is the
slowest read in the platform and the one a person refreshes.

- **Derived, read-only aggregates only.** Never a payment, balance or alert
  status. A cached payment status is a stale payment status, and the whole
  argument for this product is that a seller can trust what it says.
- Every cached response carries `cachedAt` and `ageSeconds`. A reader who
  cannot distinguish a cached figure from a live one treats both as live.
- **A rule change invalidates it.** A cached alert rate computed under
  superseded thresholds describes a policy no longer in force.
- Errors are never cached — that would serve a transient blip for five
  minutes. Cache failure is soft: unreachable Redis means every request
  computes normally.
- `GET /cache/health` reports whether it is actually working. A silently
  unavailable cache is indistinguishable from a working one apart from
  latency, which is what nobody notices until it matters.

### Configuration
- `RABBITMQ_URL`, `EVENTS_ENABLED`, `REDIS_URL` added to config and
  `.env.example`. **Values live in `.env` only**, which is gitignored and
  confirmed untracked.
- `pika==1.3.2` pinned rather than the current 1.4.2: the newer release is
  recent enough that the house seven-day cool-down applies, and nothing here
  needs what it added.

Homebrew installation was blocked by an unrelated tap-trust policy on this
machine. Docker was used instead, which matches how the service actually runs
and avoids broadening Homebrew trust to third-party taps as a side effect.

---

## [1.13.0] - 2026-07-28 - Decoupling: a Read Layer, an Inverted Dependency, Routers Split by Reader

### Three couplings, all introduced in the previous two releases

#### Fixed
- **Three services had each grown their own `_transactions(days)`,
  `_regions()` and `_merchants()`.** They looked identical and were not: one
  filtered `deleted_at`, another did not; one anchored the window on
  `utcnow()`, another on midnight. Metrics computed over subtly different
  populations then appeared side by side in one return — the kind of
  inconsistency that survives review precisely because every individual
  number looks right.

  `app/data/payment_repository.py` now owns those reads. Every caller gets
  the same window, tenancy clause and soft-delete filter, or the difference
  is a parameter someone passed deliberately. Windows anchor on midnight:
  a "last 30 days" figure that shifts by the hour cannot be reproduced, and
  running the same report twice in an afternoon returning two answers —
  neither wrong — makes the discrepancy impossible to explain.

  It is read-only, so no caller can acquire write access to payments by
  depending on it.

- **`NpsMetricsService.dashboard()` reached into `MarketAnalyticsService`.**
  A service computing one theme's indicators had to know which other module
  held the rest, so adding a metric meant editing an unrelated service and
  neither could be exercised without the other.

  The dependency is inverted in `app/services/nps_dashboard.py`. Both
  services are now unaware of each other; the composer depends on both. The
  theme-to-metric mapping is a declarative `INDICATORS` registry rather than
  a hardcoded tree — the claim that a given measure evidences a given
  strategy theme is one a reader should be able to challenge without reading
  Python. A failing metric now records the failure and the rest of the return
  still renders: a partial report that names the missing part beats a 500,
  and beats a silently absent section by more.

- **`analytics.py` had grown to 25 endpoints across four concerns.** Split
  into `analytics.py` (operational console) and `oversight.py` (market
  structure, NPS indicators, forecasting). The split is by *reader*, not by
  table: an operations desk asks what happened today; a payment system
  department asks whether the system is concentrated and what next month
  looks like. Those have different windows, different evidence floors and
  different consequences for being wrong.

Verified: all 14 indicators still assemble through the decoupled path, 61
endpoints, no method+path collisions.

### Documented: architecture decisions, with reasons

`docs/architecture.md` now records two decisions rather than leaving them
implicit:

- **Modular monolith, not microservices.** One relational database with
  cross-cutting tenancy, no production load to relieve, one team. Splitting
  means distributed transactions on payment data or eventual consistency in a
  regulatory return. The seams are now exactly where a split would go, so a
  later extraction is mechanical rather than archaeological. The failure mode
  of deciding otherwise is a distributed system whose parts share one schema —
  a monolith with network calls in it, worse than either option.
- **No message broker adopted; the need is real in two places and RabbitMQ
  fits neither well.** Device delivery is MQTT territory (constrained devices
  on unreliable mobile links, QoS and last-will semantics). Background compute
  — the fourteen-metric dashboard, a year-spanning PSD-6 return, model
  training — wants scheduling and caching, not routing. **`redis==5.0.1` is
  already declared and already running in `docker-compose.yml`, and is
  imported by nothing**: using what is already being paid for comes before
  adding a broker. RabbitMQ earns its place when many consumers need
  guaranteed delivery of one stream with different interests — a plausible
  future once IPN delivers an event feed, not today. The conditions that would
  change the decision are written down.

Also named: `verify_payment` awaits an external call inside the request the
seller is waiting on. No queue fixes that, because a confirmation cannot be
deferred — deferring it is the uncertainty the box exists to remove. Timeout
discipline and the firmware's pending state are the answer there.

---

## [1.12.0] - 2026-07-28 - The NPS Indicator Set, Forecasting, and Verified Census Denominators

### Forecasting did not exist. Now it does, for the two things that can be forecast.

#### Added
- `app/services/forecasting.py` and `GET /forecast/activity`. Daily payment
  volume and value by additive decomposition — level, linear trend, weekly
  seasonal index. Chosen over ARIMA because the components are separately
  inspectable (an analyst can see Saturday carries 1.8x an average day and
  disagree), it degrades honestly on short series, and it needs no
  stationarity transformation that silently alters the input.
  - Intervals from in-sample residual spread, widening with the square root
    of horizon. A flat band would claim day 28 is as knowable as tomorrow.
  - Returns `insufficient_data` below 28 days of activity. A forecast from
    three weeks looks identical in presentation to one from a year.
  - The trend is fitted on the **deseasonalised** series in a second pass.
    Fitting through raw daily counts lets whichever weekday the window starts
    and ends on tilt the slope — on a short series, enough to invert its sign.
- **Fraud is deliberately not forecast**, and the response says so. A
  forecast extrapolates a pattern; fraud changes *because* it is detected, so
  the pattern being fitted is the one our own controls are destroying.

### The full NPS indicator set

#### Added
`app/services/nps_metrics.py` and ten endpoints, organised around the 2030
strategy's five themes rather than around our tables, so a figure maps onto
something the Bank of Namibia already committed to measuring:
- `/nps/dashboard` — every indicator in one response, assembled server-side
  so the figures share a window. Computing each separately lets the periods
  drift, and two numbers in one report from different windows is the error
  nobody catches until publication.
- `/nps/access` — **access points per 10,000 adults aged 15 and over**, by
  region. The Global Findex and IMF Financial Access Survey basis, so our
  figures are comparable with what Namibia already reports internationally.
  An access point is an *active device*: a registered business with no working
  device is not a place anyone can be paid, and counting it as one is how
  coverage overstates reach.
- `/nps/adoption`, `/nps/resilience` (including straight-through processing,
  named in the strategy), `/nps/integrity`, `/nps/interoperability`.

#### Added — measures derived from fields nothing was reading
- `/market/settlement-lag`. **`settled_at` was written on every row and read
  by nothing**, so the figure a payee actually cares about was uncollected.
  Confirmation lag (what the seller waits at the counter) and settlement lag
  (the interbank cycle that follows) are returned separately, because the
  payee is credited before settlement completes and conflating them misstates
  the experience.
- `/market/cash-flow` — net cash position at agent points. Cash-in and
  cash-out are two of the seven go-live use cases and together say what
  neither says alone: whether an agent is accumulating cash or running out.
  An agent that runs dry stops serving, which looks in a coverage map exactly
  like a region that was never reached.
- `/market/activation` — activation lag and dormancy. A long lag means
  onboarding completes and adoption does not, which is a different problem
  from never signing up. Dormant businesses are still counted in every
  coverage figure, so without this the network looks larger than it is.

### Census denominators were wrong, and are now verified

#### Fixed
Region populations were written from memory. **Nine of fourteen were wrong.**
Zambezi was recorded as 106,633 against an actual 142,373 — a 25%
understatement that would have inflated that region's access-per-adult by a
third, in a figure intended for a central bank.

Verified against the *2023 Population and Housing Census* (Namibia Statistics
Agency, main report 30 October 2024). The corrected fourteen sum to
**3,022,401**, the published national total.

- `tests/test_census_figures.py` asserts that reconciliation, plus spot checks
  on the most and least populous regions and a units check on the adult
  share. A wrong denominator does not fail loudly — it produces a plausible
  figure that is quietly wrong and can reach a return.
- Populations live in each region's `type_definition` config, so a correction
  is an UPDATE.
- Adult share is 62.9% (15-59 at 56.1% plus 60+ at 6.8%), applied uniformly
  and stated as an approximation. Age structure varies by region, so this
  understates adults in urban regions; one stated approximation is more
  defensible than fourteen invented ones, and every response reports the
  denominator it used.

#### Documented
- `docs/regulatory.md` — the indicator set mapped to endpoints, the
  conventions and the reason for each, the population denominators with their
  source, the forecasting method, and **what this platform does not
  evidence**: Strategic Foresight and Innovation, skills enablement,
  cross-border corridors, and trust measured directly. Repeat use is the
  closest honest signal from payment data; the Consumer Payments Choice and
  Behaviour Survey the strategy calls for is the instrument for the rest.

---

## [1.11.0] - 2026-07-28 - Clustering, Oversight Metrics, and the Official Use Cases

### The analytics were operational, not supervisory

They answered how many payments there were and whether they worked. A payment
system department asks different questions, and none of them had an answer
here. Reading the *NPS Vision and Strategy 2030* and the *Instant Payment
Programme Stakeholder Pack* made the gap specific rather than a guess.

#### Added — segmentation, which did not exist
- `ml/segmentation.py`. There was no clustering anywhere in the platform.
  IsolationForest finds outliers; it does not produce groups, and the two are
  not interchangeable. K-means over seven behavioural features, with **k
  chosen by silhouette score** rather than fixed in advance — declaring "there
  are four merchant types" before looking is the prior assumption the whole
  approach exists to avoid.
  - Features are scale-free where possible (shares, coefficients of
    variation) so a segment reflects *how* a business trades rather than
    merely how big it is.
  - Refuses below 30 merchants with 20+ payments each, the same discipline as
    the anomaly trainer. Fabricated segments shown to a central bank would be
    worse than none.
  - Cluster centres are returned in original units. A centre in standardised
    space is uninterpretable, and an uninterpretable segment cannot be acted on.
- `components/Analytics/SegmentScatter.tsx` — plotted, not tabulated, because
  the point of segmentation is that you can *see* whether groups separate.
  Value on a log axis: on a linear one every market trader collapses onto the
  origin, which is the segment this platform exists for. The silhouette score
  is displayed rather than hidden.

#### Added — the measures a supervisor asks for
`app/services/market_analytics.py` and six endpoints under `/market/`:
- **Concentration** — Herfindahl-Hirschman by business and by region, plus a
  Gini on value. HHI because it is what competition and payment authorities
  already use, so our number is comparable to figures they hold. The 2030
  strategy names "market competition indicators" as a success indicator.
- **Value distribution** — percentiles and a histogram. The mean on these
  rails sits between market stalls and fuel stations and describes neither,
  so it is shown next to the median with the gap stated.
- **Inclusion** — wallet reliance, acceptance rate, and regions with no
  business yet. Payments whose instrument was not recorded are counted
  separately and never folded into either side; a gap in the data must not
  read as a finding.
- **Cohort retention** — by onboarding month. A cumulative merchant count
  only rises and cannot show churn, so adoption claims should rest on this.
- **Availability** — worst day and worst hour alongside the aggregate,
  because a monthly success rate can hide a day on which nothing worked.
  Periods with under ten payments are excluded: one failure in an hour that
  saw two is not an outage.

Every metric returns the population it was computed over and flags when it
falls below an evidence floor. A ratio without a denominator is not
reportable.

#### Fixed — the payment taxonomy did not match the programme
The stakeholder pack lists **seven use cases enabled for go-live**. Ours was
wrong in three ways:
- `p2m` ("Person-to-Merchant") is not the programme's term. It is **`p2b`**,
  Person-to-Business. A regulator reading our returns should not have to
  translate our vocabulary into theirs.
- **`b2p`** (salaries, reimbursements, freelancer payments),
  **`cash_in_merchant`** and **`atm_withdrawal`** were missing entirely.
  `cash_out` conflated cash-out at a merchant with an ATM withdrawal, which
  the programme treats as separate use cases.
- `b2b` was carried as though live. It is listed as **not enabled at
  go-live**, along with `p2g` and `b2g`. They stay in the taxonomy because
  those payments will appear when the rails carry them — a configured
  category is a row, an unconfigured one is a migration.

#### Fixed — fixture debris in the live database
120 payments from a broken test run were orphaned when a bug changed the
merchant between seeding and teardown; nothing pointed at them, so every
subsequent cleanup missed them. They were inflating the concentration and
availability figures during endpoint testing. Removed, and both tests now
also clean by reference prefix so an orphan cannot survive again.

#### Documented
- `docs/regulatory.md` — the NPS Vision 2030 themes with their named success
  indicators, mapped to what this platform can and cannot evidence. Two
  themes it does not evidence are stated plainly rather than left implied.
- The seven go-live use cases, the two initiation channels (participant app
  and Universal USSD), and the participant list. USSD is why the SoundBox
  matters: a customer on a feature phone can pay, and the trader still needs
  to know it arrived.

---

## [1.10.0] - 2026-07-28 - Full CRUD, and the Console Stops Pretending

### Every write path now exists, and every read is live

1.9.0 gave the console somewhere to read from. It could not yet create,
update or retire anything, and thirteen read functions were still returning
fixtures.

#### Added — create, update, retire
- `POST /devices` — record a unit before it ships. Starts `inactive`,
  because a device that has never reported in must not look healthy.
  Distinct from `POST /devices/register`, which is the device introducing
  itself over the air.
- `PUT /devices/{id}` (recorded firmware), `DELETE /devices/{id}` (retire).
- `POST /merchants`, `PUT /merchants/{id}`, `DELETE /merchants/{id}`.
  Applications always start `pending_kyc`: there is no path that creates an
  approved business directly, because approval is a decision someone is
  accountable for and has to appear in the log as one. Status is not settable
  through the profile update for the same reason.
- `POST/DELETE /merchants/{id}/beneficial-owners`. Combined ownership above
  100% is rejected with the arithmetic — an ownership record that does not
  add up is not a record. The identifier is written and never read back.
- `GET /settlements` — a payee is credited in real time while interbank net
  settlement happens later in cycles. The console shows both rather than
  conflating them.
- `PUT /anomaly-alerts/{id}/status` — triage movement, deliberately separate
  from `/verdict`. Picking an alert up is a workflow step; saying whether it
  was fraud is a judgement that becomes training data.
- `GET /type-definitions/{domain}` — the console reads its status options
  from configuration instead of holding its own copy.

Deletes are soft throughout. A payment taken through a device retired last
year must still resolve that device; `deleted_at` removes it from every list
without removing it from the history.

#### Added — the missing interface
- `components/Devices/DeviceActions.tsx` — assign, change service state,
  record firmware, retire. The device page previously described a unit in
  detail and offered no way to act on any of it, so a silent box could be
  diagnosed and not fixed.
- Inline approve on the businesses list, with rejection routed through the
  detail page where the required reason is asked for. Opening each
  application, deciding, and navigating back is how a review queue stops
  being worked.
- Pending-review badge in the navigation. The failure this queue exists to
  prevent is an application sitting unseen, which is what happens when the
  only way to learn the count is to visit the page.

#### Fixed
- **The reviewer verdict was never persisted.** `recordAnomalyFeedback`
  mutated an in-memory fixture array, so the product's only source of ground
  truth was lost on page reload. It now posts to the API and lands in the
  alert's immutable log. This was the most expensive silent failure in the
  app: those verdicts are the labelled dataset a supervised model needs.
- **Verdicts wrote a status vocabulary nothing else used.** The first version
  of the endpoint produced `confirmed`/`dismissed`/`investigating` while the
  rest of the system filters on `open`/`under_review`/`resolved`/`escalated`.
  A reviewer's decision has to land in the state machine the queue actually
  reads.
- **`devices.merchant_id` was NOT NULL** (migration `f0a4c72e51b8`). That
  asserted every device belongs to a business at every moment, which breaks
  in two ordinary situations: a unit in the warehouse before anyone knows
  which stall it goes to, and a device recovered when a business closes.
  Forcing an assignment means inventing one, and an invented assignment
  inflates that business's device count and the coverage figures a regulator
  reads. Closing a business now releases its devices, which the constraint
  had made impossible.
- **`DeviceStatus` was missing `faulty` and `retired`**, so two states the
  backend can produce had no representation in the console.
- **A hardcoded "faulty" status option** in the new device actions was
  rejected by the API, because it was never a configured value. The control
  now reads `device_status` from configuration — the point of keeping
  taxonomies as data is defeated by a UI that keeps its own copy.
- All thirteen remaining mock reads replaced: settlements, transaction
  summary and trends, wallet share, period deltas, geographic breakdown and
  distribution, system health, PSD-6, PSD-3, flagged trends, and both status
  logs. `resolveMerchantId` no longer consults the fixture list — the backend
  accepts a merchant code or a UUID and resolves it where the merchant list
  actually lives.

---

## [1.9.0] - 2026-07-28 - Configurable Rules, and the Console Talks to the Database

### Thresholds belong to the person accountable for the queue

The scorer's weights and thresholds were constants in Python. They encode a
policy judgement — how much unexamined activity is acceptable, and how much
analyst time a marginal alert is worth — which belongs to whoever answers for
the queue, not to whoever wrote the scorer. Nomentia's payment anomaly product
treats configurability as the core of the offering for the same reason: one
rule set cannot serve a market stall and a corporate treasury.

#### Added
- `app/services/anomaly_rule_config.py` — every rule is now a
  `type_definitions` row under the `anomaly_rule` domain, with `enabled`,
  `contribution`, and a bounded `threshold` carrying its own unit. Changing a
  threshold is an UPDATE, not a migration and not a deploy. Defaults stay in
  code as the shipped position, so a deleted row falls back rather than
  leaving the scorer without a rule.
- `anomaly_rule_config_log` table (migration `d3e7b5a91f42`) — append-only
  record of every change: who, which field, from what, to what. The current
  value is fast to read and the history cannot be rewritten. Without it,
  "the queue went quiet last month" has no answer.
- **Configuration fingerprint** on every score and every stored alert. Two
  scores with different fingerprints were produced under different policy and
  are not directly comparable; the change log says what moved between them.
- `GET/PUT /settings/anomaly-rules`, `/settings/anomaly-policy/{code}`,
  `/settings/anomaly-rules/history`, `/settings/anomaly-rules/preview`.
  The preview counts existing alerts against the current threshold, because
  a threshold is abstract until it is a number of alerts someone must work.
- `components/Settings/AnomalyRulesSection.tsx` — the Settings threshold
  control now writes to the scorer. It previously moved and saved nothing.

#### Changed
- Scorer version 1.1.0 to **1.2.0**. The logic is unchanged; what changed is
  who decides the numbers. Stored alerts must stay attributable to the exact
  basis that produced them, so the version moves with the mechanism.
- Bounds are **enforced, not clamped**. A contribution of 5.0 is rejected
  with the reason, rather than silently stored as 1.0 — accepting a change
  and quietly altering it would leave an operator believing they had
  configured something they had not.

### The console had no endpoints to call

An audit against the full file tree found the actual gap, and it was not the
one on the list: the detail pages all existed. What did not exist was
anywhere for them to read from. The backend exposed only the paths the
*device* needs — register, heartbeat, verify — plus aggregate analytics.
There was no `GET /devices`, no `/merchants`, no `/transactions`. That is why
the console was reading fixtures.

#### Added
- `app/api/resources.py` — devices (list, detail with heartbeat series and
  status log, assign, status change), merchants (list with pending-review
  count, detail with beneficial owners and connected devices, status
  decision), transactions (list with filters on every dimension the console
  shows, detail), and alerts (detail with persisted reasoning, reviewer
  verdict). Tenancy on every query, `deleted_at IS NULL` on every list, and
  the append-only companion row written in the same request as any status
  change.
- Valid statuses are read from `type_definitions` rather than a literal list,
  so adding one stays a configuration row.
- `frontend/src/lib/logger.ts` — the one place the app writes diagnostics.
  This console can hold payment references and merchant identifiers; scattered
  `console.*` leaves no single place to decide what is safe to emit.

#### Fixed
- **National ID numbers were rendered on the merchant page.** The API now
  returns `hasIdOnFile` and never the identifier, and the type system
  enforces it — a reviewer needs to know the check was done, not to read the
  number again. It is the most sensitive field in the schema
  (`docs/privacy.md`), and the cheapest place to protect it is by not
  sending it.
- **`/system-health` was registered twice.** The analytics index shadowed the
  regulatory return, which was therefore unreachable. The filing now lives at
  `/system-health-report`.
- A note is now required when suspending or closing a business. An earlier
  version of this check named statuses that are not in the configured
  taxonomy and so never fired.
- Frontend reads hit the real API and **do not fall back to fixtures** when
  the database is empty. An empty deployment must look empty; a console that
  quietly shows sample rows is the same defect as the invented growth figures
  removed in 1.6.0, only harder to notice. The fixtures remain for the demo
  page, which says what it is.

#### Removed
- The mock `setDeviceStatus` that mutated a fixture array in place, and the
  fake national-ID generator that fed the field now withheld.

#### Also fixed
- Both scorer tests left their `TEST-*` business row in the live database on
  every run, so fixtures accumulated in `/merchants` and in the counts a
  regulator reads. Teardown now purges the row. Two rows already there were
  removed.
- Splitting that teardown initially broke the tests: purging the business
  before seeding orphaned every row that followed, and three of the four
  injected manipulations stopped being detected. `_clear_transactions`
  (between cases, keeps the business) is now distinct from `_purge`
  (teardown only). The test caught the regression, which is the argument for
  having it.

---

## [1.8.0] - 2026-07-28 - Validating the Detector Without a Single Confirmed Case

### The correction

An earlier note in this project said accuracy could not be measured at all
until confirmed fraud outcomes existed. That was too strong. **BIS Working
Paper 1188** — Desai, Kosse & Sharples, *Finding a Needle in a Haystack: A
Machine Learning Framework for Anomaly Detection in Payment Systems* (May
2024) — addresses exactly this position, naming "the scarcity of anomalies
and the absence of pre-identified examples" as the primary obstacle for
payment system operators, and resolves it by testing against **artificially
manipulated transactions**.

Nothing is *trained* on synthetic labels, which would be circular. Real
behaviour is generated, copies are deliberately manipulated, and the detector
is asked whether it can tell them apart. That measures **sensitivity** — a
different and answerable question from "how much fraud is there".

#### Added
- `backend/tests/test_injection_validation.py` — the BIS method, adapted.
  Seeds twelve weeks of steady trading, then injects four manipulations that
  mirror ways payments actually go wrong rather than random noise.

  | Manipulation | Score | Represents |
  |---|---|---|
  | Amount inflated 8x | 0.20 | a compromised terminal pushing value through |
  | Volume burst | 0.80 | an account drained by rapid repeat payments |
  | Outside trading hours | 0.10 | activity while the business is closed |
  | Duplicate amount | 0.70 | the same payment submitted twice |
  | **Ordinary trading** | **0.00** | eight probes across normal hours |

  Ordinary trading scores zero, so separation is absolute rather than a ratio.
  BIS reported roughly 2x separation on Canadian HVPS data.

- Two rules in `anomaly_scoring.py`, from Nomentia's payment anomaly product,
  which ranks erroneous and duplicate payments *ahead of* fraud by loss
  volume — recovering money afterwards costs more than catching it:
  - **`possible_duplicate`** (contribution 0.2) — same amount to the same
    business within ten minutes. Distinct from protocol idempotency, which
    catches the same reference reported twice; this catches a genuine double
    payment.
  - **`new_counterparty`** (contribution 0.1) — first payment from a payer.
    Ordinary at a market stall, notable at a business trading with a settled
    set of suppliers, so it is weighted lightly on its own.

#### Documented
- `backend/ml/README.md` — the validation method with citation, the current
  result table, and the rules the scorer applies.
- BIS also names the limit of any rule set, this one included: rules "require
  prior assumptions about how anomalous payments would look", which "may not
  cover all forms of anomalies". That is the argument for the unsupervised
  layer already on the roadmap, and the reason the rules stay transparent.
- Two independent confirmations of the existing architecture: BIS notes that
  participant-run tools "only capture transactions to and from that
  particular participant, which limits their utility for system-wide
  monitoring" — our position is the system-wide one; and Vyntra's monitoring
  guidance recommends operating "alongside existing systems ... without
  intercepting live payments", which is our observer architecture exactly.

---

## [1.7.0] - 2026-07-28 - Seasonal Fairness, and Anomaly Naming Throughout

### The velocity rules were biased against the businesses this exists to serve

#### Fixed
- Velocity fired on **absolute** thresholds — 10 payments an hour, 50 a day.
  Payment activity is strongly seasonal by weekday, so an absolute bar flags
  *busy trading* rather than *unusual trading*, hardest for the segments with
  the sharpest weekly cycle: market vendors, taxi drivers, cash agents.
- `_weekday_baseline` now takes the **median** daily count for that merchant
  on that weekday over 12 weeks; `_weekday_hourly_baseline` takes the **90th
  percentile** hourly count, because the question is what a normal *peak*
  looks like — most trading hours are quiet, and comparing a rush against
  them would flag every rush.
- Below four observations of a weekday there is no baseline. That returns
  `None`, treated as **no opinion** rather than *normal*.
- Scorer version 1.0.0 → **1.1.0**: scores genuinely change, so a stored
  alert stays attributable to the logic that produced it.

#### Verified
- `tests/test_weekday_baseline.py` seeds a merchant with a real weekly cycle
  (40 payments on Saturdays, 10 on weekdays) and asserts that **the same 60
  payments are ordinary on a Saturday and anomalous on a Tuesday**. The old
  rule flagged both identically.

#### Fixed — found by writing that test
- Velocity was measured from `utcnow()` rather than the timestamp of the
  transaction being scored, so every replay, backfill or batch rescore
  measured the wrong window.
- The velocity query filtered by merchant but **not by organisation** — the
  only query in the file that was not tenancy-scoped.
- `baseline / 4` had been used as the hourly bar, silently assuming every
  business concentrates trade into four hours. A stall open dawn-to-dusk and
  a taxi rank with two rush hours have the same daily total and completely
  different hourly shapes. Now learned from history.

#### Changed
- ML features `velocity_1h` / `velocity_24h` became
  `velocity_1h_vs_weekday_peak` / `velocity_24h_vs_weekday_norm`. Raw counts
  would teach a model the same bias, except baked into weights where nobody
  can read it rather than a threshold anyone can. No trained artifact exists,
  so the contract change was free now and would not have been later.

### Nothing is called "fraud" any more

#### Changed
- The system detects anomalies. It has no confirmed outcomes and no way to
  measure whether one was fraudulent. Migration `c8f1a26d90b3` renames
  `fraud_alerts` → `anomaly_alerts`, `fraud_alert_status_log` →
  `anomaly_alert_status_log`, `fraud_probability` → `anomaly_score`,
  `fraud_type` → `signal_type`, and `transactions.fraud_score` →
  `transactions.anomaly_score`.
- `fraud_probability` was the worst of them: the value is
  `min(sum(rule_contributions), 1.0)` — neither a probability nor about
  fraud.
- `FraudDetectionEngine` → `AnomalyScoringEngine`; `fraud_detection.py` →
  `anomaly_scoring.py`; `/fraud-alerts` → `/flagged`; `FraudAlertsPage` →
  `FlaggedPage`; `components/Fraud/` → `components/Flagged/`.
- Done while both tables held **zero rows**. It would never have been
  cheaper, and the misleading names would have shaped everyone's thinking in
  the meantime.

#### Kept deliberately
- The reviewer verdict remains `confirmed_fraud` / `not_fraud`. That *is* a
  statement about fraud — the one moment a person decides whether unusual
  meant fraudulent. Softening it would erase the distinction the design rests
  on.

### Documentation

#### Added
- `docs/architecture.md` §5 records the naming rationale, and §6 answers
  where forecasting belongs: **device battery first** (a physical signal, a
  short horizon, an action attached, and no claim about money), then payment
  volume, then regional coverage. Fraud is not forecastable at any point,
  because it is not measurable.
- All seven markdown files updated across frontend and backend.

### Verified
- `py_compile` across `app/`, `ml/` and `tests/`; `npx tsc --noEmit` clean.
- Migration applied to the live database; `anomaly_alerts` (16 columns),
  `anomaly_alert_status_log` (8) and `transactions.anomaly_score` confirmed.
- Seasonality test passes after the rename.
- Zero `fraud` references remain in frontend or backend code except the
  reviewer verdict.

---

## [1.6.0] - 2026-07-28 - Page Purpose, Operator Actions, Image Slots, and Two Integrity Fixes

### Integrity

#### Fixed
- **The dashboard displayed invented growth figures.** `DashboardPage`
  hardcoded `"+12% vs last period"`, `"+8%"` and `"+5%"` with nothing
  computing them. In a product whose argument is that its numbers are real,
  a fabricated metric on the first screen an operator sees undermines
  everything else on it. Replaced with `fetchPeriodDeltas`, which compares
  the last 7 days against the 7 before and **returns null when there is no
  prior period** — no baseline, no claim. Device count has no historical
  series, so it now shows no delta rather than an invented one.
- **`payer_instrument` was written but never read.** The column and
  migration existed and fixtures populated it, but no API path set or
  returned it. Now persisted in `api/payments.py`, aggregated by
  `AnalyticsService.get_wallet_share()`, exposed at
  `GET /api/v1/wallet-share`, and available to the assistant as a tool so it
  can answer who is paying without a bank account.

### Payment coverage

#### Added
- `media_assets` + `media_asset_status_log` (migration `9b4d02f7c115`).
  `alt_text` is NOT NULL by design: an image with no text alternative is
  unusable to anyone on a screen reader, so the schema refuses to store one.
  No upload endpoint yet — the table exists so photography can arrive
  without a schema change.

### Every page now has a purpose and one action

#### Added
- `PageAction` — the single most useful thing to do on a page, with the
  reason attached. Every operator page previously displayed data and
  stopped. Now: Dashboard opens the highest-exposure alert; Businesses
  clears the onboarding queue; Devices chases silent boxes; Payments
  surfaces failures; Flagged payments opens the largest exposure. Each shows a
  count, and each falls back to a calm alternative when the queue is empty.
- Trust and Privacy gained closing actions, so neither is a dead end.

#### Changed
- Headings across the app now say what a thing *is* rather than name its
  form: "Status Timeline" became "What has happened", "Resolution Timeline"
  became "How this was handled", "Beneficial Owners" became "People behind
  the business". Reports lead with "Payment system operator return" and
  carry `PSD-6` as a secondary label — a regulator does ask for the code,
  but the code is not what the page is about.
- Settings' brand note reduced to a pointer; it was an internal document
  living in an operator screen.

### Visuals

#### Added
- `ImageSlot` — reserved, art-directed image frames. Hand-drawn scene
  illustrations were built first and were not good enough to ship: a weak
  illustration reads as amateur in a way that empty space does not, and
  lowers the perceived quality of everything near it. Each slot now states
  what belongs there and how it should be framed, so the layout is final and
  a photographer can work straight from the page.
- `NamibiaMap` — schematic of all 14 regions, kept because it renders real
  data. A region with no activity draws as a dashed outline with no fill, so
  a coverage gap reads as absence rather than a low value.
- `TrustMark` — the marks previously inline in Trust, extracted so Privacy
  shares the same visual language.
- `Meter` — the same proportion bar had been hand-written in seven places
  with inconsistent heights. One component, with tone carrying meaning.
- `Skeleton` and `EmptyState` — replacing eight "Loading x..." strings and
  the negative empty states. An empty list usually means something specific;
  saying which turns a dead end into information.

#### Removed
- `MarketStallScene`, `AgentCounterScene`, `DeviceAnatomy`, `NetworkStates` —
  the scene illustrations, deleted rather than left in place.

### Design system

#### Changed
- `tailwind.config.js` extended rather than accumulating one-offs:
  `maxWidth.content` / `prose`, `height.meter` / `meter-lg`, and an
  `animate-shimmer` keyframe replacing Tailwind's default pulse, which dips
  far enough to read as a flashing element rather than loading content.
- `Avatar` used Tailwind's stock `green-100` / `blue-800` — the only
  saturated colour in a near-monochrome system. Now design tokens.

### Verified
- `npx tsc --noEmit` and `python -m py_compile` clean.
- Migrations `7a3c91e04b28` and `9b4d02f7c115` applied to the live database;
  `media_assets` (11 columns) and `media_asset_status_log` (8) confirmed
  present, and `get_wallet_share()` runs against the real schema.
- All seven operator pages carry exactly one primary action.
- `grep -n 'delta="'` on the dashboard returns nothing hardcoded.
- Landing renders the reserved hero slot with its brief; no orphaned imports
  or unreferenced components after the illustration deletions.

---

## [1.5.0] - 2026-07-28 - Observer Positioning, Explainable Scoring, Public Site, Docs Restructure

### Positioning corrected — the system is an observer

#### Changed
- Established and documented that this platform is **not in the payment
  path**. It is told the outcome of payments made over WayaMe and announces
  them. Verified against the code: the only outbound calls in
  `wayame_api_client.py` are `verify_payment` (a GET on payment *status*),
  `register_device` and `send_heartbeat`. No initiate, authorise, debit,
  decline or block exists anywhere in `backend/app/`.
- Copy across the public site previously framed this as a policy ("it never
  refuses a payment"), which understated it. It is structural — there is no
  code path by which money moves — and is now stated that way. A
  "What it does / What it never touches" panel leads the oversight page.

#### Fixed — WayaMe understanding
- **WayaMe is not an app.** It is the consumer-facing brand of Namibia's
  national Instant Payment Solution. Customers pay through their own bank's
  app. Copy implying a "WayaMe app" has been removed.
- **Instant Payments Namibia (IPN) is a Bank of Namibia subsidiary**, not
  merely an operator — the integration partner and the regulator are closely
  related, which raises the value of the observer position.
- **NamClear** added: the authorised payment system operator integrating the
  IPS with existing clearing infrastructure, previously unmentioned.
- Recorded that the programme's own stated target market — small businesses,
  street vendors, farmers, township traders — is precisely this product's.

### Explainable anomaly scoring

#### Added
- `AnomalyScoringEngine.predict()` now returns the rules that actually fired
  with their real numbers, a categorical confidence band, and `expected_loss`
  (probability x amount). The scores are unchanged; the reasoning was
  previously computed and discarded.
- `anomaly_alerts.explanation` (JSONB) and `anomaly_alerts.expected_loss`
  (NUMERIC) — migration `50599d6c5d6a`, applied to the live database, with a
  backfill so historical rows sort correctly. Hand-written rather than
  autogenerated, which would have swept in unrelated index drift.
- Triage queues order by **exposure, not probability**. Verified against the
  fixtures: the highest-probability alert does not reach the top five, while
  a 0.6-probability alert on N$2,943 ranks fourth.
- `recordFraudFeedback` — analyst verdicts append to the alert's immutable
  log. This is the only source of ground truth the system will ever have.

#### Fixed
- `extract_named_features` replaces positional array indexing, which made it
  impossible to quote real values back to a reviewer.

### Anomaly detection — built, not trained

#### Added
- `backend/ml/` — `features.py` (12 features, three of them peer-relative to
  the merchant's region), `train_anomaly.py`, and a README documenting why
  **IsolationForest** and not an LSTM: the temporal signal is already
  engineered into the velocity features, so a sequence model would need far
  more data and a ~600 MB runtime to reach the same place.
- `app/services/anomaly_detection.py` — loads a trained artifact if present,
  returns `None` otherwise. Scoring never fails because a model file is
  missing.
- Geography is a *feature*, not just a report dimension: a model trained on
  absolute values learns the Khomas distribution and flags ordinary rural
  activity as anomalous. Peer-relative features prevent that.

#### Verified
- The database holds **zero transactions**, so training is impossible today.
  `train_anomaly.py` runs and correctly refuses below its 2,000-row floor.

### Public site

#### Added
- Marketing surface for two audiences with opposite needs: `/for-merchants`
  (sellers) and `/for-regulators` (oversight), plus `/how-it-works`,
  `/trust`, and a landing page. All jargon removed — no regulation clause
  numbers, verified by sweeping the rendered text.
- `/demo` moved **outside** the auth wall and made self-contained. It
  previously required a FastAPI process and Redis, which made it unusable as
  a shared link.
- Illustrations: `PaymentSequenceDiagram` (11 hops, five lifelines, our lane
  the only dashed one), `PaymentRailDiagram` (two lanes, money above,
  observation below), `MerchantQrCard`, `SoundBoxDevice` (animated LED ring,
  waveform, spoken caption), `Roadmap`.
- Announcement language and 2G/4G controls in the demo.

#### Changed
- Capability framed as a **roadmap** (Live now / Building / Planned) rather
  than a list of things not yet done.

### Visual density

#### Added
- `Timeline` — status history was a flat list of sentences on four detail
  pages. A history is a shape, and a list discards it.
- `Sparkline` — merchant detail now shows daily count and volume, so a
  merchant who stopped trading a week ago no longer looks like one that is
  growing.
- Device fleet health and business-ownership sections, recovered after an
  earlier page consolidation dropped them.

### Documentation

#### Changed
- `soundbox.md` reduced from 4,286 lines to a 74-line brief plus an index.
  Two overlapping generations of the business plan shared 57% of their
  substantive lines; the obsolete frontend specification described the
  pre-redesign UI.
- Split into `docs/`: `architecture.md`, `hardware-and-approvals.md`,
  `ux.md`, `business-plan.md`, `regulatory.md`, `device.md`, `README.md`.
  `§0 Brand & Positioning` stays at the root because `SettingsPage.tsx`
  renders that reference to the user.
- Code references updated to their new locations.

#### Added
- **CRAN type approval** documented as a hard gate: the certificate must be
  obtained *before importation*, takes 40 days, is valid 3 years, and
  attaches to a device configuration — so the 2G/4G decision must be settled
  first or the approval must be repeated.
- Supplier evaluation (CWD, Oakter, iServeU, EazyPay) and the questions to
  put to each.
- **No major TTS platform supports Oshiwambo, Oshindonga or Khoekhoegowab.**
  Oshiwambo is spoken in roughly 49% of Namibian households and
  Khoekhoegowab in 11%, so for around 60% of the country synthesised speech
  does not exist at any price. Pre-recorded clip concatenation is therefore
  not the cheaper option but the only one — and a competitor built on cloud
  speech cannot serve half the market.

#### Removed
- `docs/soundbox.md` (a stale copy), `frontend/src/index.css` (never
  imported), `demo/frontend/DemoDashboard.tsx` (a comment pointing
  elsewhere), and `pandas`/`scikit-learn`/`joblib` from requirements —
  scikit-learn and joblib were later restored, now genuinely imported by the
  anomaly detector.

### Verified
- `npx tsc --noEmit` clean; `python -m py_compile` clean across
  `backend/app/` and `backend/ml/`.
- Migration applied to the live database; both columns confirmed present.
- Browser walkthrough: landing, seller, oversight, how-it-works and trust
  pages render; `/demo` completes all three scenarios **logged out with no
  backend**; fraud detail shows exposure, confidence band and expanded
  reasoning; merchant detail renders sparklines.
- Fixture coherence: 65 alerts, **zero** where the score disagrees with the
  sum of its reasons.

---

## [1.4.0] - 2026-07-27 - Steep Design System, Three-Portal RBAC, Drill-Down Depth, Functional AI Composer

### Design system

#### Added
- `tailwind.config.js`, `src/styles/globals.css`, `public/index.html` —
  full token replacement per a supplied "Steep" design spec: near-
  monochrome palette (`ink #17191c`, `paper #ffffff`, `mist #f2f2f3`,
  `fog #fafafb`, `slate #777b86`, `ash #979799`, `smoke #a3a6af`, plus a
  single accent pair `peach #fbe1d1`/`sienna #5d2a1a`), Source Serif 4
  headlines (`font-signifier`) over Inter body (`font-sohne`), an 8-step
  type scale, a named spacing scale, pill buttons, 24px card radius, and a
  `shadow-subtle-3` reserved for floating artifacts only. The old navy/
  indigo admin-dashboard palette (`#0D253D`, `#533AFD`) and its emoji stat-
  card icons are fully removed — including two chart-color leftovers
  (`AnalyticsPage.tsx`, `GeoDistributionMap.tsx`) caught in this release's
  verification grep, not the initial pass.
- `src/components/ui/{Button,TextLink,Card,Tag,Avatar,StatCard,StatusPill,AskComposer}.tsx`
  — shared component library; every page now composes from these instead
  of ad hoc className soup. `Card variant="accent"` (the peach card) is
  used exactly once in the whole app (Settings), by convention.

### Three real portals (RBAC)

#### Added
- `src/components/Auth/RoleRoute.tsx` — route-level guard
  (`<Navigate to="/" />` if the logged-in role isn't in the route's
  `allow` list), not just hidden nav links. `App.tsx` rewritten so
  merchant/regulator/admin see genuinely different route sets: Devices/
  Transactions/Flagged are merchant+admin; Merchants/Coverage Map/
  Reports are regulator+admin; Demo is admin-only.
- `Sidebar.tsx`'s `navigation` array now carries `roles: UserRole[]` per
  item, mirroring the route guards (documented as two views of one rule
  set, kept in sync deliberately).

#### Fixed
- Prior state showed one shared dashboard shell with a couple of
  conditionally-hidden cards for every role — not real portal separation.
  Flagged directly by the user ("right now i only see one portal for all
  users"); replaced with the route-level guards above.

### Drill-down depth (previously flat/missing)

#### Added
- `pages/MerchantsPage.tsx` + `MerchantDetailPage.tsx` — `Merchant` had
  zero frontend presence before this release despite a full backend model
  (KYC, beneficial owners, region/constituency/local authority) built in
  1.1.0–1.3.0. Detail page shows profile, KYC status log, beneficial
  owners, and this merchant's devices/transactions/flagged payments.
  KYC/KYB review (approve/reject with note) is a real state mutation
  against the mock store, not decorative.
- `pages/{DeviceDetail,TransactionDetail,FraudAlertDetail}Page.tsx` — each
  a profile card + status/resolution timeline sourced from the
  `*_status_log` table shape already on the backend. Fraud alert triage
  (resolve/escalate/mark under review, admin-only) is a real mutation.
- `pages/SettingsPage.tsx` — was a dead sidebar link (no route existed).
  Now real: account/org profile, and the `soundbox.md` §0 brand-
  positioning note as the one accent-card callout.
- `src/api/mockData.ts` — realistic, internally-consistent seed data
  (16 merchants across 13/14 regions, deliberately one financial-inclusion
  gap — Kavango West has no merchant — and fraud concentrated on
  cash-agent-type merchants) so numbers agree across list/detail/
  analytics/reports pages instead of being independently randomized per
  page.

### Analytics & reporting depth

#### Added
- `AnalyticsPage`/`ReportsPage` rebuilt around a "reporting pack" concept
  grounded in BIS/CPMI central-bank payment-oversight practice: generated
  PSD-6/PSD-3-style reports carry inline validation checks, not just raw
  numbers.

### Functional "Ask anything" AI composer

#### Added
- `backend/app/services/ask_service.py` — real Claude tool-calling loop
  (Anthropic Python SDK `client.beta.messages.tool_runner`, model
  `claude-sonnet-5` per this workspace's cost-routing default) over the
  existing, already-tested `AnalyticsService`/`RegulatoryReportingEngine`
  methods as tools (`get_transaction_summary`, `get_transaction_trends`,
  `get_system_health`, `get_anomaly_alerts`, `get_geo_distribution`,
  `generate_psd6_report`, `generate_psd3_report`). Claude never generates
  or executes SQL — it only selects from this fixed tool set; results are
  fetched from the real DB and synthesized into a grounded prose answer.
  Each question is logged via the existing
  `AnalyticsService.queue_analytics_event` (`event_type='ai_query_asked'`,
  `event_data={question, tools_used}`) — no new table.
- `POST /api/v1/analytics/ask` (`app/api/analytics.py`) — `{question}` →
  `{answer, toolsUsed}`. Returns a clean `503` (not a raw crash) when
  `ANTHROPIC_API_KEY` is unset or still the `.env.example` placeholder.
- `requirements.txt`: `anthropic==0.117.0` (exact-pinned; 10 days old at
  time of pinning, past this workspace's 7-day new-package cool-down).
  `backend/.env` / `.env.example`: `ANTHROPIC_API_KEY` placeholder, same
  treatment as the existing `WAYAME_CLIENT_ID`/`SECRET` placeholders.
- `src/components/ui/AskComposer.tsx` — the one real (non-mocked) network
  call in the frontend; placed once, on `DashboardPage`, under the
  headline. Surfaces the honest "AI composer needs an API key configured"
  state on a 500/503 rather than a fake answer — this is disclosed as the
  correct current state, not a bug: the feature is fully wired but inert
  until a real `ANTHROPIC_API_KEY` is set.

### Demo dashboard

#### Fixed
- `demo/frontend/DemoDashboard.tsx` lived outside `frontend/src/` and was
  never built or served by CRA — an unreachable dead file. Real
  implementation moved to `frontend/src/pages/DemoDashboardPage.tsx`
  (admin-only route, `/demo`), restyled onto the same design system as
  every other page. `demo/frontend/DemoDashboard.tsx` replaced with a
  pointer comment; `demo/README.md` Step 4 updated to match.

### Dependency fix

#### Fixed
- `@tanstack/react-query` was pinned `5.59.0` in `package.json` but a
  floating transitive resolution had pulled `5.101.4` (published 6 days
  before this session — violates this workspace's 7-day cool-down) into
  `package-lock.json`, breaking `useQuery`'s `data` type inference
  project-wide (~40 `tsc` errors, all `unknown`). Root-caused via `npm ls
  @tanstack/react-query`; fixed by reinstalling clean against the pinned
  version rather than annotating around it file-by-file.

### Verified
- `npx tsc --noEmit` clean (with the environment's pre-existing broken
  `@types/node/ffi.d.ts` temporarily moved aside, per the established
  workaround — unrelated to this change).
- `python -m py_compile` clean across every file in `backend/app/`.
- `POST /api/v1/analytics/ask` smoke-tested against a live local server:
  returns `503 {"detail":"AI composer is not configured"}` with the
  placeholder key in `.env` (the correct, honest failure mode — not a
  crash) and resolves to the right route (`/api/v1/analytics/ask`,
  matching the frontend's real call, not the router's other unprefixed
  `/api/v1/*` analytics paths).
- `grep -rn` across `frontend/src` for old tokens (`533AFD`,
  `bg-action-primary`, `background-primary`, `0D253D`) returns nothing;
  emoji/dingbat sweep returns nothing (the only non-ASCII glyph hits are
  the intentional `→` status-transition arrows on the four detail-page
  timelines).

---

## [1.3.0] - 2026-07-27 - Constituency/Local-Authority Geography & Leaflet Map

### Geography data

#### Added
- `app/db/namibia_geography.py` — Namibia's 119 (of the officially-cited
  121) electoral constituencies and 57 local authorities (13 cities, 26
  towns, 18 villages), each linked to a parent region. Sourced from
  Wikipedia's NSA/ECN-derived constituency table, Wikipedia's MURD-derived
  cities/towns/villages tables, and cross-checked against ALAN
  (Association of Local Authorities Namibia). Full provenance and the
  known 2-constituency gap are documented in the module docstring.
- `type_definitions` domains `constituency` (config: `region_code`, `seat`)
  and `local_authority` (config: `region_code`, `authority_type`) — 176
  new rows, seeded and verified on the live Neon `soundbox` project.
- `merchants.constituency_id`, `merchants.local_authority_id` — migration
  `e45a65c684d5`, applied to Neon.
- `type_definitions_seed.py`: `seed_type_definitions()` now accepts
  `(code, label, config)` entries in addition to `(code, label)`, so
  region-linked config isn't bolted on separately from the seed mechanism.

### Coverage map (Leaflet)

#### Added
- `leaflet` (1.9.4), `react-leaflet` (4.2.1, the React-18-compatible major),
  `leaflet.heat` (0.2.0), `@types/leaflet` (1.9.8) — exact-pinned per this
  workspace's dependency rule. `src/types/leaflet-heat.d.ts` — ambient
  types for `leaflet.heat`, which ships none.
- `frontend/src/components/Map/GeoDistributionMap.tsx` — renders merchant
  locations from `GET /analytics/geo-distribution` as either colored
  circle markers (radius/color by transaction volume, with a popup) or a
  `leaflet.heat` heat layer (weighted by transaction count), toggled by
  the caller.
- `frontend/src/pages/MapPage.tsx` — the "Coverage Map" page: markers/
  heatmap toggle, plotted-vs-unlocated merchant count. Wired into
  `App.tsx` (`/map` route) and `Sidebar.tsx` nav (between Analytics and
  Flagged).

#### Fixed
- Deleted `frontend/src/index.js`, `src/App.js`, `src/App.css` — leftover
  `create-react-app` scaffold files that were never removed when the real
  TypeScript app (`index.tsx`/`App.tsx`, with routing and
  `QueryClientProvider`) was built. Because webpack's default resolve
  order tries `.js` before `.tsx`, these dead files were silently shadowing
  the real entry point — `npm start` was loading the "Coming Soon"
  placeholder app, not the actual dashboard, and calling `reportWebVitals()`
  from a file that doesn't exist (a hard crash). This affected the whole
  app, not just this change — the dev server likely never ran clean before.
- `frontend/node_modules` was a stale/partial install (missing `typescript`
  entirely; a broken `es-abstract`/`string.prototype.matchall` mismatch
  crashed `react-scripts start`). Fixed with a clean
  `rm -rf node_modules && npm ci`.

#### Verified
- `npx tsc --noEmit` clean.
- Dev server (`npm start`) compiles and serves; logged in with the demo
  admin account and navigated to Coverage Map in a real browser (Chrome,
  via claude-in-chrome). Confirmed: Markers view renders 3 mock merchant
  locations on a Namibia-centered map; clicking a marker opens a popup
  with merchant name/code/region/device count/transaction count; Heatmap
  view renders a `leaflet.heat` layer. No app-level console errors (one
  unrelated Chrome-extension console message, not from this app).

---

## [1.2.0] - 2026-07-27 - Production Infrastructure & Geo-Analytics

### Infrastructure

#### Added
- **Real hosted Postgres**: created Neon project `soundbox`
  (`fragrant-wildflower-30608206`, org `smartpay`). Both migrations
  (`1c22b2586d66` initial schema, `57d4b2fca630` merchant geo location)
  applied with `alembic upgrade head` and verified against
  `information_schema.tables` (22 application tables + `alembic_version`).
  Default `organizations` row and all 62 `type_definitions` seed rows
  (48 initial + 14 `region`) inserted via `type_definitions_seed.py`.
- `backend/Dockerfile`, `backend/docker-entrypoint.sh` (runs
  `alembic upgrade head` before starting `uvicorn`), `backend/.dockerignore`.
- `frontend/Dockerfile` (multi-stage: Node build → nginx), `frontend/nginx.conf`
  (SPA fallback routing), `frontend/.dockerignore`.
- `docker-compose.yml` — backend + redis + frontend (no local `postgres`
  service; `DATABASE_URL` points at the hosted Neon instance, matching how
  this stack actually runs in production).
- `backend/.env.example`, `frontend/.env.example` — safe templates (no real
  values, committable).
- `soundbox/.gitignore` — excludes `.env`, `venv/`, `__pycache__/`,
  `node_modules/`, `build/`.
- `backend/app/core/config.py` now calls `load_dotenv()` and reads a real
  `.env` (previously `python-dotenv` was a listed dependency that nothing
  ever called — `.env` files were silently ignored). `DATABASE_URL` set
  directly in `.env` now takes precedence over the `DB_*` component fields,
  needed for Neon's `sslmode=require` connection string. Added `SECRET_KEY`
  for the JWT auth work already flagged in "Next Steps".

#### Verified
- `docker build` on both `backend/` and `frontend/` succeeds.
- A live container run of the backend image, pointed at the real Neon
  `.env`, ran its migration, started `uvicorn`, and returned
  `{"status":"healthy",...}` from `GET /health` — confirmed with `curl` from
  both the host and inside the container. Container and image removed after
  verification.

#### Generated secrets (local `backend/.env`, gitignored — not committed)
- `SECRET_KEY`: `openssl rand -hex 32`.
- `DATABASE_URL` / `DB_*`: from Neon project creation (see above).
- `WAYAME_CLIENT_ID` / `WAYAME_CLIENT_SECRET`: left as placeholders —
  these are third-party credentials issued by Instant Payment Namibia (IPN)
  during partner onboarding (soundbox.md §2.4), not something to generate.

### Geo-location / maps analytics

#### Added
- `merchants.lat`, `merchants.lng` (`NUMERIC(9,6)`), `merchants.region_id`
  (→ `type_definitions(domain='region')`) — migration `57d4b2fca630`.
  Location lives on the merchant (the device's install site), not the
  device itself, to avoid duplicating coordinates per device.
- `type_definitions` domain `region`: Namibia's 14 administrative regions.
- `AnalyticsService.get_geo_distribution()` and
  `GET /api/v1/analytics/geo-distribution` — merchant lat/lng/region plus
  device and transaction counts per merchant, the data layer behind
  soundbox.md's "Geographic Distribution" / "Merchant Activity Heatmaps"
  analytics pitch (§5, §2.2). Actually rendering a map/heatmap is a
  frontend follow-up (Leaflet/Mapbox choice) — not built here.
- `frontend/src/types/soundbox.ts`: `GeoDistributionPoint`, `Merchant.lat`/
  `lng`/`regionCode`/`regionLabel`. `frontend/src/api/api.ts`:
  `fetchGeoDistribution()` (mocked, same pattern as the other fetchers).

### Brand & positioning

#### Added
- `soundbox.md` §0 "Brand & Positioning" — documents that no independent
  consumer brand exists yet, and that WayaMe co-branding/white-labeling is
  an open, welcome option (two paths compared: independent brand with a
  "WayaMe-certified" badge vs. full WayaMe white-label), pending a
  trademark/branding conversation with IPN during Phase 1 engagement.

---

## [1.1.0] - 2026-07-27 - Wiebe-Aligned Database Redesign

Full redesign of `backend/app/db/models.py` against this workspace's Wiebe
schema rules, closing gaps found by reading `soundbox.md` (business/
regulatory spec) against the original implementation. Grounded in the
Namibia regulatory corpus (PSD-1/3/6/8/12, FIA/AML, NAMQR standards) and
`NIST SP 1308` (CSF 2.0) / the EU AI Act for the fraud-scoring governance
tables.

### Database schema (`backend/app/db/models.py` — full rewrite)

#### Added
- **Tenancy**: `organizations` (operating PSP tenant), `merchants` (the
  business receiving payments — previously only a bare `merchant_id` string
  referenced everywhere, with no backing table), `merchant_beneficial_owners`
  (PSD-1 §8.4 beneficial-ownership / FIA AML-CFT compliance, as a proper
  child table rather than a JSON list), `merchant_status_log`.
- **Config**: `type_definitions` (organization + domain + code config table)
  replacing every hardcoded status/type string that previously carried a
  `# active, inactive, offline`-style comment. Seeded via
  `backend/app/db/type_definitions_seed.py` for `device_type`,
  `device_status`, `merchant_type`, `merchant_status`, `transaction_status`,
  `payment_type`, `fraud_risk_level`, `fraud_type`, `wallet_status`,
  `settlement_status`, `incident_type`, `event_type`.
- **Status-log companions** for every stateful entity: `device_status_log`,
  `merchant_status_log`, `transaction_status_log`, `settlement_status_log`,
  `e_money_wallet_status_log`, `anomaly_alert_status_log`,
  `security_incident_status_log` — none of these existed before, so there
  was no audit trail for any status transition.
- `device_heartbeat_log` — persists telemetry that was previously Redis-only
  (TTL'd and lost), backing the device/network-health analytics product
  `soundbox.md` itself pitches.
- `settlement_transactions` — junction table linking a settlement batch to
  the transactions it covers, replacing the old bare `transaction_count`
  integer that had no traceable link (the reconciliation artifact the
  fintech domain rule requires per money movement).
- `ai_model_versions` — governance record for the fraud-scoring model;
  every `anomaly_alerts` row now references the model/version that produced
  it, closing the traceability gap for automated risk-scoring decisions.
- `regulatory_reports` — persists every generated PSD-6/PSD-3/fraud-trend/
  system-health report (previously returned as ephemeral JSON with no audit
  trail).
- `security_incidents` — backs PSD-12's 24-hour incident reporting and
  RPO(5 min)/RTO(2 hr) tracking requirements, which had no table at all
  before this redesign.
- `backend/app/db/helpers.py` — org/merchant resolution and status-log
  logging helpers shared across the API/service layer (relationships are
  enforced here, not via DB foreign keys — see the module docstring in
  `models.py`).

#### Changed
- Every monetary column (`Transaction.amount`, `Settlement.amount`,
  `EMoneyWallet.balance`, `TrustAccountReconciliation.*`) moved from
  `Float` to `Numeric(15, 2)` with a `currency_code CHAR(3)` alongside —
  Float/Double on money is a critical defect under this workspace's rules.
- All primary keys moved from bare `String` (no default — every INSERT
  either omitted `id` or invented one ad hoc) to UUID, generated app-side
  (`default=uuid.uuid4`) so idempotent retries can reuse the same id.
- `organization_id` added as the leading tenancy column on every
  operational table; `deleted_at` soft delete added throughout (no hard
  deletes).
- `AnalyticsEvent.event_data` moved from `Text` (stringified dict) to
  native `JSONB`.

### Backend services / API — bug fixes and persistence

#### Fixed
- `regulatory_reporting.py` was calling `pd.func.count(...)`,
  `pd.func.sum(...)`, `pd.func.date_trunc(...)` etc. — pandas has no
  `.func` namespace; these were meant to be SQLAlchemy `func` calls that
  were never imported. Every report endpoint would have raised
  `AttributeError` at runtime. Fixed to `from sqlalchemy import func`.
- `anomaly_scoring.py`'s `create_fraud_alert` constructed `FraudAlert(...)`
  without ever setting `id` — would have violated the NOT NULL primary key
  constraint on every anomaly alert insert. Fixed by the UUID default plus
  explicit `id=uuid.uuid4()`.
- `config.py`'s `DATABASE_URL` built a bare `postgresql://` URL while
  `requirements.txt` only had `asyncpg` (async-only) and `session.py` used
  a sync `create_engine` — the app could not connect to Postgres as wired.
  Fixed: `postgresql+psycopg2://`, `psycopg2-binary` added to
  `requirements.txt`, unused `asyncpg` removed.
- `devices.py::register_device` had a literal `# In a real scenario, you
  would also save the device to your own database` comment — devices were
  never persisted. Now creates/updates a `Device` row (with
  `device_status_log`) before forwarding to WayaMe.
- `devices.py::device_heartbeat` only cached to Redis (TTL, then lost).
  Now updates the `Device` fast-read columns and appends a
  `device_heartbeat_log` row.
- `payments.py::verify_payment` never persisted anything. Now upserts a
  `Transaction` row by `transaction_ref` and appends a
  `transaction_status_log` entry.

#### Added
- `backend/alembic.ini`, `backend/alembic/env.py` (wired to
  `app.core.config.settings.DATABASE_URL` and `app.db.models.Base.metadata`),
  `backend/alembic/versions/1c22b2586d66_initial_schema.py` — the
  previously-outstanding "Add database migration scripts (Alembic)" item.
  Verified with an offline `alembic upgrade head --sql` dry run (no live DB
  touched); all 22 tables render and commit cleanly.
- `regulatory_reporting.py` now persists every generated report as a
  `RegulatoryReport` row via `_persist_report(...)`.
- `anomaly_scoring.py` now resolves/creates an `AIModelVersion` row and
  links every `FraudAlert` to it; amounts and probabilities use `Decimal`.
- `analytics_service.py` and `regulatory_reporting.py` now scope every
  query by `organization_id` (tenancy).

### Frontend (TypeScript)

#### Added
- `frontend/src/types/soundbox.ts` — interfaces (`Device`, `Merchant`,
  `Transaction`, `Settlement`, `FraudAlert`, `EMoneyWallet`, report/health
  shapes) mirroring the redesigned backend entities.

#### Changed
- `frontend/src/api/api.ts` — replaced `any[]`/`any` typing on every
  exported `fetchX` function and mock array with the new interfaces from
  `types/soundbox.ts`.

---

## [1.0.0] - 2026-07-27 - Initial Implementation

### Backend Services (FastAPI)

#### Added
- **Database Models** (`backend/app/db/models.py`):
  - `Device` - SoundBox device registration and status tracking
  - `Transaction` - Payment transaction records with anomaly scoring
  - `FraudAlert` - Real-time anomaly detection alerts
  - `Settlement` - Settlement records for PSD-6 compliance
  - `EMoneyWallet` - E-money wallet tracking for PSD-3 compliance
  - `TrustAccountReconciliation` - Trust account records for PSD-3
  - `AnalyticsEvent` - Event tracking for data pipeline

- **Database Session** (`backend/app/db/session.py`):
  - SQLAlchemy engine and session configuration
  - Database connection management

- **Analytics Service** (`backend/app/services/analytics_service.py`):
  - Transaction summary generation
  - Transaction trends by day
  - Flagged payments retrieval
  - System health index calculation
  - Analytics event queuing

- **Fraud Detection Engine** (`backend/app/services/anomaly_scoring.py`):
  - Feature extraction for transactions
  - Real-time fraud probability prediction
  - Fraud alert creation
  - Transaction velocity tracking
  - Merchant and device age calculation

- **Regulatory Reporting Engine** (`backend/app/services/regulatory_reporting.py`):
  - PSD-6 Payment System Operator Return generation
  - PSD-3 E-Money Issuer Report generation
  - Flag trend reporting
  - Payment system health reporting

- **API Routers**:
  - `devices.py` - Device registration and heartbeat endpoints
  - `payments.py` - Payment verification and NAMQR processing
  - `analytics.py` - System health, transaction summary, flagged payments, anomaly scoring
  - `reports.py` - PSD-6, PSD-3, flag trends, system health reports

- **Updated `main.py`**:
  - Integrated all API routers
  - Database table creation on startup
  - Health check endpoint
  - Enhanced logging

- **Updated `requirements.txt`**:
  - Added SQLAlchemy, pandas, numpy, scikit-learn, joblib
  - Pinned versions for stability

### Firmware (Embedded C)

#### Added
- **NAMQR Processor** (`firmware/src/namqr.c`, `namqr.h`):
  - TLV payload parsing for NAMQR codes
  - CRC-16-CCITT validation
  - Token Vault ID extraction (Tag 65)
  - Digital signature verification (Tag 66)
  - Full NAMQR standard compliance

- **OTA Manager** (`firmware/src/ota_manager.c`, `ota_manager.h`):
  - Firmware version management
  - Update checking
  - Download simulation
  - Firmware verification
  - Installation and rollback support

- **Updated `main.c`**:
  - Integrated NAMQR processor
  - Integrated OTA manager
  - Added OTA check task
  - Enhanced task simulation
  - Improved logging

- **Updated `Makefile`**:
  - Added debug build target
  - Added static analysis target
  - Added help target
  - Improved dependency tracking

### Frontend (React + TypeScript + Tailwind CSS)

#### Added
- **Project Configuration**:
  - `package.json` - Updated with all dependencies
  - `tailwind.config.js` - Brand colors and design tokens
  - `tsconfig.json` - TypeScript configuration
  - `postcss.config.js` - PostCSS configuration

- **Global Styles** (`src/styles/globals.css`):
  - Tailwind CSS imports
  - Custom scrollbar styling
  - Base styles

- **Authentication**:
  - `AuthContext.tsx` - Authentication state management
  - `ProtectedRoute.tsx` - Route protection

- **Layout Components**:
  - `Layout.tsx` - Main layout with sidebar and header
  - `Sidebar.tsx` - Navigation sidebar with role-based items
  - `Header.tsx` - Top header with user info and logout

- **API Client** (`src/api/api.ts`):
  - Axios configuration with interceptors
  - Mock data for development
  - API functions for all endpoints

- **Pages**:
  - `LoginPage.tsx` - Login with demo credentials
  - `DashboardPage.tsx` - Main dashboard with stats, health, alerts, charts
  - `DevicesPage.tsx` - Device management with filters and table
  - `TransactionsPage.tsx` - Transaction listing with filters
  - `AnalyticsPage.tsx` - Analytics with charts and health metrics
  - `FlaggedPage.tsx` - Flagged payments with stats and filters
  - `ReportsPage.tsx` - Regulatory reports (PSD-6, PSD-3)

- **Dashboard Components**:
  - `StatCard.tsx` - Reusable stat card
  - `SystemHealthCard.tsx` - System health display
  - `FraudAlertsCard.tsx` - Flagged payments summary
  - `TransactionChart.tsx` - Transaction trend chart

- **Device Components**:
  - `DeviceTable.tsx` - Device listing table
  - `DeviceFilters.tsx` - Search and status filters
  - `DeviceStatusSummary.tsx` - Device status summary cards

- **Fraud Components**:
  - `FraudAlertList.tsx` - Fraud alert listing
  - `FraudStats.tsx` - Fraud statistics cards
  - `FraudFilters.tsx` - Risk level and date filters

### Documentation

#### Added
- `changelog.md` - This file, tracking all project changes

### Demo Implementation

#### Added
- **Demo Backend** (`demo/backend/demo_backend.py`):
  - FastAPI server with idempotency and retry logic
  - Redis-backed transaction state management
  - Simulated WayaMe API webhook
  - Metrics endpoint for demo dashboard

- **Demo Firmware** (`demo/firmware/soundbox_demo.c`):
  - Embedded C payment processing simulation
  - HTTP client with libcurl
  - Idempotency check and retry logic
  - Audio and display feedback simulation

- **Demo Frontend** (`demo/frontend/DemoDashboard.tsx`):
  - React dashboard with live payment flow
  - Visual step-by-step flow diagram
  - Retry counter and idempotency badge
  - Transaction history with real-time updates

- **Demo Documentation** (`demo/README.md`):
  - Demo architecture diagram
  - Running instructions
  - Demo script with key messages
  - Next steps for investor pitch

---

## Validation Status

### Backend Implementation
- [x] FastAPI server with all required endpoints
- [x] Database models for all entities
- [x] Analytics service with transaction summary and trends
- [x] Anomaly detection engine with real-time scoring
- [x] Regulatory reporting (PSD-6, PSD-3)
- [x] NAMQR processing integration
- [x] WayaMe API client
- [x] Health check endpoint

### Firmware Implementation
- [x] NAMQR code processing (TLV parsing, CRC validation)
- [x] OTA update manager
- [x] Payment handling task
- [x] Heartbeat task
- [x] OTA check task
- [x] Security module (signature verification)
- [x] Audio, display, modem abstractions
- [x] RTOS task simulation

### Frontend Implementation
- [x] React + TypeScript + Tailwind CSS setup
- [x] Authentication flow with role-based access
- [x] Dashboard with stats, health, alerts, charts
- [x] Device management page
- [x] Transactions page
- [x] Analytics page with charts
- [x] Flagged payments page
- [x] Reports page (PSD-6, PSD-3)
- [x] Responsive layout with sidebar navigation

### Compliance with soundbox.md
- [x] WayaMe API integration (OAuth 2.0, mTLS)
- [x] NAMQR Code Standards compliance
- [x] PSD-6 Payment System Operator Return
- [x] PSD-3 E-Money Issuer Report
- [x] Anomaly detection and AML monitoring
- [x] Real-time analytics and health index
- [x] Device registration and heartbeat
- [x] OTA firmware updates
- [x] Regulatory reporting automation
- [x] Demo implementation with idempotency and retry logic

---

## Next Steps

1. **Backend**:
   - ~~Add database migration scripts (Alembic)~~ — done in 1.1.0
   - ~~Run `alembic upgrade head` against a real Postgres instance~~ — done
     in 1.2.0 (Neon project `soundbox`, `fragrant-wildflower-30608206`)
   - Implement JWT authentication (`SECRET_KEY` already generated in
     `backend/.env` — see 1.2.0)
   - Add WebSocket support for real-time updates
   - Implement actual WayaMe API integration (`WAYAME_CLIENT_ID`/
     `WAYAME_CLIENT_SECRET` still placeholders — needs real credentials
     from IPN)
   - Add rate limiting and security middleware
   - ~~Render `GET /analytics/geo-distribution` as an actual map/heatmap~~
     — done in 1.3.0 (Leaflet + leaflet.heat, "Coverage Map" page)
   - Resolve the remaining 2 constituencies (119/121 seeded — see
     `namibia_geography.py` docstring) and give merchants an actual
     constituency/local_authority assignment UI (columns exist, unused)

2. **Firmware**:
   - Implement actual HTTP client for modem
   - Add secure element integration
   - Implement actual ECDSA signature verification
   - Add power management
   - Implement actual OTA download and flash writing

3. **Frontend**:
   - Replace mock API calls with real endpoints
   - Add form validation
   - Implement real-time updates with WebSockets
   - Add accessibility (WCAG 2.1)
   - Add unit and integration tests

4. **DevOps**:
   - Add Docker configuration
   - Add CI/CD pipeline
   - Add monitoring and logging
   - Add deployment scripts

---

*Last updated: 2026-07-28*
