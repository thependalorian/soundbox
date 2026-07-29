/**
 * Public page copy, in one place.
 *
 * Hardcoded strings scattered across pages are how a product ends up saying
 * two different things about itself. This matters more than usual here: much
 * of this copy makes factual claims about how the national rails work, and
 * when one of those facts changes — as the payment use-case naming just did
 * — it has to change everywhere at once, not wherever someone remembers.
 *
 * Two rules the copy holds to:
 *
 * - **No jargon on public pages.** No scheme codes, no acronyms a trader
 *   would not use. "Customer paying a business", not "P2B". The internal
 *   taxonomy is precise for regulators reading returns; the public site is
 *   read by someone standing at a stall.
 * - **Roadmap framing, never deficit framing.** What is coming, not what is
 *   missing. Both describe the same state; only one of them is useful to
 *   someone deciding whether to trust this.
 */

/**
 * The brand.
 *
 * **The product is SoundBox. WayaMe is the infrastructure it plugs into.**
 * The codebase previously wrote "WayaMe SoundBox" as though it were a single
 * name, which claims a relationship that is not ours to claim: WayaMe is the
 * consumer-facing name of Namibia's instant payment service, operated by
 * Instant Payments Namibia. SoundBox listens to those rails; it is not part
 * of them.
 *
 * Where the relationship is the point, say it in a sentence — "SoundBox
 * listens to the WayaMe rails" — rather than welding the two names together.
 *
 * One word, capital B. The generic product category stays two lowercase
 * words ("a cellular sound box", "Indian sound box deployments"), because
 * that is what the category is called, and the brand form there would read
 * as a claim about someone else's product.
 */
/**
 * Contact, as character codes.
 *
 * The address is never a plain string in source, in the bundle, or in the
 * DOM — see `components/ui/ObfuscatedEmail.tsx`. A published address on a
 * payments product is a credible pretexting target, not merely a spam
 * magnet, and this one is what a partner would use to reach the team.
 */
export const CONTACT = {
  emailUser: [116, 101, 97, 109],
  emailDomain: [106, 117, 115, 116, 97, 115, 111, 117, 110, 100, 98, 111, 120, 46, 99, 111, 109],
  emailSpoken: 'team at justasoundbox dot com',
} as const;

export const BRAND = {
  name: 'SoundBox',
  tagline: 'Payments made audible. Trust made instant.',
  /** Named only where the relationship is being explained. */
  rails: 'WayaMe',
  railsOperator: 'Instant Payments Namibia',
} as const;

/** The seven ways money reaches a business on the national rails.
 *
 * These mirror the use cases enabled at launch, in plain wording. The
 * internal codes (`p2b`, `cash_in_merchant` and so on) stay out of sight —
 * see `types/soundbox.ts` for the mapping and `docs/regulatory.md` for the
 * source.
 */
export const PAYMENT_KINDS = [
  {
    title: 'Customers paying you',
    detail: 'The everyday sale, scanned and paid at your stall or counter.',
  },
  {
    title: 'Money sent to you',
    detail: 'A relative, a friend, or anyone sending directly to your business.',
  },
  {
    title: 'Wages and payouts',
    detail: 'A business paying a salary, a reimbursement, or work you invoiced for.',
  },
  {
    title: 'Government payments',
    detail: 'Grants and disbursements landing in the account.',
  },
  {
    title: 'Cash taken in',
    detail: 'If you are an agent, someone handing you cash to load onto their phone.',
  },
  {
    title: 'Cash paid out',
    detail: 'And the reverse: someone drawing cash from their phone at your counter.',
  },
  {
    title: 'Paid from a wallet or a bank',
    detail:
      'It makes no difference which the customer used. Both reach you the same way, and the box says so either way.',
  },
] as const;

/**
 * Why the box is trusted. Stated once.
 *
 * The landing and sellers pages each carried their own version of this,
 * saying the same three things in different words — "It cannot be faked" and
 * "Cannot be faked" with different supporting sentences. Two pages drifting
 * apart on the central claim is worse than either wording.
 */
export const PROPOSITION = [
  {
    title: 'It only trusts the rails',
    detail:
      'The national payment rails tell the box directly when a payment lands. Nothing a customer shows you can do that.',
  },
  {
    title: 'You do not read anything',
    detail:
      'The amount is spoken out loud. If you cannot hear it, the ring turns green. Nothing to squint at, no app, no login.',
  },
  {
    title: 'Silence is never the answer',
    detail:
      'If the box loses signal it says pending rather than going quiet, then confirms once it can check again. The payment itself is never affected — only how quickly you learn about it.',
  },
  {
    title: 'The queue keeps moving',
    detail: 'No checking, no arguing, no waiting for a message to arrive.',
  },
  {
    title: 'It counts what was invisible',
    detail:
      'Every confirmation is a measurement of an economy that has never been properly measured.',
  },
] as const;

/** How a customer pays. The second one is the point most people miss. */
export const CUSTOMER_CHANNELS = [
  {
    title: 'From their banking app',
    detail: 'They scan the code on your counter and approve it on their phone. The money reaches you, and the box announces it.',
  },
  {
    title: 'From any phone at all',
    detail:
      'A customer dials a short code tied to a proxy payment number — the same number a banking app would scan as a QR code. The money reaches you the same way, and the box announces it.',
  },
] as const;

/**
 * Who this is for.
 *
 * Deliberately the segments that handle the most cash and are least served
 * by a notification on a screen.
 *
 * **Grant paymasters** is the largest segment in the business plan by a wide
 * margin — G2P recipients are sized at 100,000+ against 50,000 informal
 * vendors, the next largest (docs/business-plan.md §1.4). `g2p` is already a
 * live use case on the rails, defined as social grant disbursement
 * (docs/regulatory.md, "The seven use cases enabled at go-live").
 *
 * Today, grants are collected as cash at NamPost pay points — real,
 * documented problems there include multi-hour queues, system failures
 * that turn pensioners away mid-process, and separate trips required for
 * beneficiaries drawing more than one grant. The Bank of Namibia is already
 * piloting electronic G2P disbursement over the instant payment rails
 * (Bank Windhoek and Letshego Bank Namibia, starting with already-banked
 * recipients before extending to cash-only pensioners), and the reason
 * officials have stated publicly is protecting pensioners from robbery
 * after they collect cash — not queue logistics. That is the framing this
 * copy leads with. A fixed cash float running out mid-queue is a real
 * mechanical risk of the current model, but it is our inference, not a
 * reported incident, so it stays a secondary point, not the headline claim.
 * It still needs the same audible certainty a market trader needs — the
 * paymaster has to know a transfer cleared before waving the next person
 * through, and many beneficiaries are exactly the audience least likely to
 * read a confirmation off a screen.
 *
 * The mechanic, corrected twice from an earlier draft: a paymaster *or* a
 * cash agent — either can do this — scans the grant card's QR on a POS
 * terminal and verifies with biometrics plus ID. There are two real
 * settlement destinations from there, not one path plus an off-rails
 * exception, and not an even split either — most beneficiaries do not have
 * a store of value today and rely on cash. Cash is `cash_out_merchant` in
 * this system's own taxonomy ("Cash paid out" in `PAYMENT_KINDS`): WayaMe
 * settles to the *agent's* account, reimbursing the till, which is just as
 * observable a WayaMe transaction as the alternative — settling straight to
 * the beneficiary's own wallet or bank account, for those who have one. The
 * money itself moves from the outsourced disbursing institution's account
 * or till — NamPost, a bank — never directly from government, which funds
 * the programme but is not the payer of record on the rails.
 */
export const AUDIENCES = [
  { title: 'Market traders', detail: 'Selling in a crowd, where a phone chime is inaudible.' },
  { title: 'Taxi drivers', detail: 'Taking payment through a window, with the engine running.' },
  {
    title: 'Fuel attendants',
    detail: 'Taking payment at the pump, outdoors, with an engine running and the next car waiting.',
  },
  { title: 'Cash agents', detail: 'Handling deposits and withdrawals where the amount must be exact.' },
  { title: 'Small shops', detail: 'A counter where the queue does not wait for a screen to load.' },
  {
    title: 'Grant paymasters',
    detail:
      'Confirming a grant payment cleared — to the till for cash, or straight to someone’s own wallet where they have one.',
  },
] as const;

/**
 * The rotating words in the home headline, derived rather than duplicated.
 *
 * These were previously a second hand-maintained list of the same segments,
 * which is how the two drift: fuel attendants were added to the business
 * plan and the backend taxonomy and reached neither list.
 *
 * Note the wording. The public site says **fuel attendants** — a person,
 * matching "market traders" and "taxi drivers". The backend taxonomy says
 * `fuel_station`, because that is the business entity being onboarded. The
 * two are deliberately not synced.
 */
export const ROTATING_AUDIENCES = AUDIENCES.map((a) => a.title.toLowerCase());

/** Seller-facing roadmap. Sellers care about one thing here: my language. */
export const SELLER_ROADMAP = [
  {
    phase: 'live' as const,
    title: 'English announcements',
    detail: 'Every amount spoken aloud, with a distinct sound for a payment that did not go through.',
  },
  {
    phase: 'building' as const,
    title: 'Afrikaans and Oshiwambo',
    detail:
      'The box plays recorded phrases rather than reading text aloud, so adding a language means recording a person speaking it. That is the work, and it is underway.',
  },
  {
    phase: 'planned' as const,
    title: 'More languages',
    detail:
      'Oshiherero and others follow the same path. No text-to-speech service covers these languages, which is exactly why recording them properly is the only honest option.',
  },
] as const;

/** What the oversight side can answer. Each is a real, implemented view.
 *
 *  Only items 0-2 (LandingPage's "What the country gets") and 3-4
 *  (ForRegulatorsPage's inclusion/retention cards) are rendered anywhere.
 *  Settlement timing, agent float, and forecasting used to be single cards
 *  here too, but each now has its own full section on ForRegulatorsPage
 *  with its content rewritten as prose specific to that section — kept
 *  this array to exactly the entries something still reads, rather than
 *  carrying three cards nothing renders. */
export const OVERSIGHT_CAPABILITIES = [
  {
    title: 'Where the money is, and where it is not',
    detail:
      'Activity nationally, by region, and by constituency.',
  },
  {
    title: 'Reach measured against population',
    detail:
      'Acceptance points per ten thousand adults. Coverage is read against how many people a region actually serves.',
  },
  {
    title: 'Whether the market is concentrating',
    detail:
      'How much of the value depends on a handful of businesses or a single region, measured with the concentration index (HHI).',
  },
  {
    title: 'What kinds of business are actually trading',
    detail:
      'Groups found from behaviour.',
  },
  {
    title: 'Who has stopped',
    detail:
      'Businesses approved but never trading, and businesses that have gone quiet. Both are counted in coverage figures elsewhere, which makes networks look larger than they are.',
  },
] as const;

/** The "ask anything" analytics capability — a live query, not a canned
 *  report. The example Q/A is illustrative, matching how CONCENTRATION,
 *  ADOPTION, AGENT_FLOAT and the alert example on ForRegulatorsPage are
 *  already invented-but-representative numbers, not real figures. */
export const ASK_ANYTHING = {
  heading: 'Or ask it directly',
  body: [
    'Every figure above is also a live query. An analyst can ask a question in plain language and get an answer sourced the same way — nothing invented, nothing off the record.',
    'It can only call the same fixed set of views the dashboards use — it cannot write its own queries, and it cannot answer with a number the data does not actually contain.',
  ],
  example: {
    question: 'Which region has the highest share of wallet-funded payments this month?',
    answer:
      'Kavango East, at 78% — against a national average of 41%. Based on 1,240 payments recorded in the last 30 days.',
  },
} as const;

/** Landing page. The vision, stated once. */
export const LANDING = {
  rotatingAudiences: ROTATING_AUDIENCES,
  heroLead: 'Payment certainty for',
  heroSupport:
    'A small speaker that says every payment out loud, so the person selling knows the money arrived before they hand anything over.',
  visionHeading:
    'Namibia is going cash-lite. The people who still handle the most of it are being left out of that shift.',
  visionBody: [
    'Namibia’s instant payment rails now reach any phone in the country — through a banking app, or through a short code on a feature phone. But a market trader cannot hear a notification over a crowd, cannot tell a real payment screen from a screenshot, and cannot afford to hand over goods on a maybe. So they keep asking for cash, and the part of the economy that most needs to be counted stays invisible.',
    'A device that simply says the amount out loud removes that doubt. And once thousands of those confirmations exist, they become the clearest picture anyone has ever had of how money actually moves through the country.',
  ],
} as const;

/**
 * The two-audience split, shown once the home page has made its case.
 *
 * Deliberately not a third pitch — each card names the reader's own words
 * back to them (relief for a seller, evidence for a regulator) and sends
 * them to the page written for that reader, rather than repeating either
 * page's argument here.
 */
export const AUDIENCE_SPLIT = {
  heading: 'Two very different readers, two pages',
  sellers: {
    title: 'Selling something today',
    detail: 'Never wonder again whether the payment actually came through.',
    cta: 'For sellers',
    href: '/for-sellers',
  },
  regulators: {
    title: 'Overseeing the rails',
    detail: 'Evidence from the counter.',
    cta: 'For regulators',
    href: '/for-regulators',
  },
} as const;

/** What a mistake actually costs, stated identically wherever it appears. */
export const SCORING_ERROR_COST =
  'A scoring error costs an analyst a few minutes — never a seller their sale.';

/**
 * The seven business questions the models answer — the regulator page's
 * whole argument, and the reason that page exists.
 *
 * Copied verbatim from `docs/business-plan.md` §1.7, which is itself
 * sourced from `backend/app/services/*.py`. Kept here rather than inline
 * in the page for the reason this module exists: the page and the business
 * plan must not drift, and a single export makes that a one-file check.
 * Section order on the page follows this object's order, which follows
 * §1.7's numbering.
 *
 * `label` names the model doing the work; `question` is what a regulator
 * actually wants answered. The label is deliberately plain English —
 * "Anomaly scoring", not a scheme code — so it stays readable to someone
 * who does not already know the internals.
 */
export const BUSINESS_QUESTIONS = {
  alerts: {
    label: 'Anomaly scoring',
    question: 'Which alerts deserve a person’s time first, and why?',
  },
  concentration: {
    label: 'Market concentration',
    question:
      'Is the network becoming dangerously dependent on a few businesses or one region?',
  },
  adoption: {
    label: 'Distribution, inclusion, retention',
    question:
      'Is adoption actually reaching people, or is a rising average hiding who is still left out?',
  },
  agentFloat: {
    label: 'Agent float risk',
    question: 'Are cash agents running out of money to pay people with?',
  },
  forecasting: {
    label: 'Forecasting',
    question:
      'How much volume should we plan capacity and agent float for next month — without pretending we can predict fraud?',
  },
  returns: {
    label: 'Regulatory reporting',
    question:
      'Do the numbers we file with the regulator match the numbers the dashboards show?',
  },
  ask: {
    label: 'Natural-language analytics',
    question:
      'Can an operator get a correct answer to a question nobody built a report for in advance?',
  },
} as const;

/**
 * Why the seven questions matter to the institution reading them.
 *
 * Placed after the questions rather than before: the questions are the
 * evidence, this is what the evidence is for. A reader who has just seen
 * seven working measures is ready for the argument; one who has not is
 * being asked to take it on trust.
 *
 * The substance comes from what the Bank has publicly committed to
 * demonstrating by 2030 — growth across user segments, a sustained
 * reduction in payment fraud, shareable intelligence between parties. None
 * of that is cited by name here, per the rule above: a claim that rests on
 * a document goes stale when the document is revised, and the point lands
 * without it.
 *
 * The fraud argument is the one worth getting right. Not being able to
 * publish a fraud rate reads as a limitation until you notice that a
 * *reduction* cannot be shown without a baseline, and no baseline exists
 * for the informal economy. Refusing to invent one is what makes the
 * series credible when it finally exists.
 */
export const WHY_THIS_MATTERS = {
  heading: 'Why this matters',
  lead: 'A national payment system is held to a plain standard: that it works safely, efficiently and effectively for everyone it is meant to serve. The hardest part of that to evidence is the last one — whether the move to digital is genuinely reaching the businesses and the people who still deal mostly in cash.',
  points: [
    {
      title: 'The rails are visible. The counter is not.',
      detail:
        'Settlement records say what cleared. They cannot say whether a trader in a market will accept digital at all, whether an agent has run dry by Thursday, or whether a business onboarded in March is still trading in June. That is where inclusion is won or lost, and it is the hardest place in the economy to observe — nobody installs an instrument in an informal stall. This one is already there, because the seller needs it. Oversight gains sight of the acceptance edge: adoption evidenced by region, by constituency and by kind of business, rather than inferred from a national total.',
    },
    {
      title: 'A reduction needs a baseline nobody has yet.',
      detail:
        'Showing that payment fraud is falling requires a series to measure the fall against, and none exists for this part of the economy. Every verdict a reviewer records — confirmed, dismissed, sent back for more — is one entry in the first honest version of that series, and it accrues from the first day the queue is worked. That record is what a claim of falling fraud can eventually rest on, which is also why no rate is published here before it can be defended.',
    },
    {
      title: 'Acceptance and evidence grow together.',
      detail:
        'Every box on a counter is one more business willing to take digital payment, in the segment that has been hardest to reach — and the record it produces is a by-product of the seller’s own need to know the money arrived. One programme therefore serves two ends at once: acceptance deepened where it is thinnest, and the evidence of that deepening produced as it happens, without a separate survey to commission. No fee is taken on any payment announced, so what is counted carries no interest in its own result.',
    },
  ],
} as const;

/**
 * Where the evidence base goes next.
 *
 * Roadmap framing per the rule at the top of this file: what is coming,
 * not what is missing — and nothing marked `live` that is not actually
 * running. The distinction matters here more than usual.
 *
 * **Today the record covers payments a device announced.** A transaction
 * row is written in exactly one place (`backend/app/api/payments.py`,
 * inside the device-authenticated verify path), so the measures on this
 * page are built from SoundBox-observed activity. Reporting across every
 * payment the rails carry is a real and much larger capability — it turns
 * each measure from an indication into a national figure — but the ingest
 * for it is not written, so it is `building`, not `live`. Marking it
 * otherwise would be the same defect as the invented growth figures this
 * site removed earlier: a claim a technical reviewer can check and
 * disprove in one question.
 */
export const OVERSIGHT_ROADMAP = [
  {
    phase: 'live' as const,
    title: 'Evidence from every device',
    detail:
      'Each payment a box announces is recorded with where it happened, what kind it was and how it was funded. Every measure on this page is built from that record.',
  },
  {
    phase: 'building' as const,
    title: 'Reporting across the whole rail',
    detail:
      'The same reporting applied to every payment the national rails carry, not only those a device announced — which turns each measure here from an indication into a national figure. The measures are already written; the integration is the work.',
  },
  {
    phase: 'planned' as const,
    title: 'Published detection accuracy',
    detail:
      'Once enough alerts have been confirmed or dismissed by reviewers, how often the scoring is right becomes a measured number rather than an asserted one.',
  },
];

/**
 * Regulator page framing. No scheme codes and no named strategy documents:
 * those belong in the returns, not the pitch (`docs/regulatory.md` opens by
 * saying so — "the public site deliberately avoids this vocabulary").
 *
 * The credibility comes instead from checkable methodology, and that claim
 * is now made inside the question it belongs to rather than in one
 * general-purpose block: reach against census population sits under the
 * inclusion question, concentration-measured-the-standard-way under the
 * concentration question, and so on. A methodology section that floats free
 * of any question is the kind of thing a reader skips.
 */
export const REGULATOR = {
  heroHeading: 'Business questions our models answer',
  heroSupport:
    'Every confirmed payment adds a fact to a part of the economy nobody has been able to count until now.',
} as const;
