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

/** What the oversight side can answer. Each is a real, implemented view. */
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
  {
    title: 'How long money takes to arrive',
    detail:
      'The wait at the counter and the settlement cycle that follows are reported separately, because a seller is only ever waiting on the first.',
  },
  {
    title: 'Whether agents are running out of cash',
    detail:
      'An agent paying out more than they take in eventually has nothing left to pay with. On a map that looks identical to a place that was never reached.',
  },
  {
    title: 'What next month looks like',
    detail:
      'Expected volume and value, with the weekly pattern shown separately so it can be argued with. Nothing is forecast that cannot honestly be forecast.',
  },
] as const;

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

/** Questions the oversight side actually asks. Centralized so the claim
 *  about cash-lite adoption exists in exactly one place. */
export const REGULATOR_QUESTIONS = [
  'Which regions are being left behind as the country goes cash-lite?',
  'Where is unusual activity concentrating, and in which kind of business?',
  'Is a single operator carrying too much of one region’s volume?',
  'Did last month’s totals reconcile, and can we show our working?',
] as const;

/**
 * The observer boundary: what the platform does, and what it never touches.
 * Previously declared independently on the trust page and the regulators
 * page, in near-identical wording that could drift apart. One list.
 */
export const OBSERVER_BOUNDARIES = {
  does: [
    'Listens for payments already completed on the national payment rails',
    'Announces the outcome on the device',
    'Records what it observed, and where',
    'Flags unusual patterns for a person to review afterwards',
  ],
  neverTouches: [
    'Start a payment',
    'Stop, hold or reverse a payment',
    'Touch anyone’s money or hold a balance',
    'Change what the rails recorded',
  ],
} as const;

/** What a mistake actually costs, stated identically wherever it appears. */
export const SCORING_ERROR_COST =
  'A scoring error costs an analyst a few minutes — never a seller their sale.';

/**
 * Regulator page framing. No scheme codes and no named strategy documents:
 * those belong in the returns, not the pitch. The credibility comes from
 * specific, checkable methodology (per-10,000-adults against census,
 * denominators shown alongside every ratio, concentration measured the way
 * competition regulators measure it elsewhere) — not from citing a document,
 * which goes stale the moment that document is revised or renamed.
 */
export const REGULATOR = {
  heroHeading: 'Evidence from the counter',
  heroSupport:
    'Every confirmed payment is a data point about the part of the economy that has always been hardest to see.',
  alignmentHeading: 'Measured the way a regulator would measure it',
  alignmentBody:
    'Reach is counted per ten thousand adults against the census, not against a number we chose ourselves. Concentration is scored the same way competition authorities score it anywhere. Every ratio here carries the count it was built from, so a figure from eleven transactions is never shown the same way as one from eleven thousand — and where there is not yet enough to say something, the answer is that plainly, not a guess dressed up as a number.',
} as const;
