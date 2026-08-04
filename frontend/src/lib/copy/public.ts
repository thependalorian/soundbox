/**
 * Public page copy, in one place.
 *
 * Hardcoded strings scattered across pages are how a product ends up saying
 * two different things about itself. That matters more than usual here:
 * much of this copy makes factual claims about how the national rails work
 * and about what this platform does and does not do, and when one of those
 * facts changes it has to change everywhere at once rather than wherever
 * someone remembers.
 *
 * Three rules the copy holds to:
 *
 * - **Observer language, always.** This platform reads data about payments
 *   that already happened. Nothing here may imply it initiates, holds,
 *   stops or reverses a payment, because it structurally cannot, and that
 *   is the single most important fact about it.
 * - **No scheme codes or strategy-document names on public pages.** No
 *   determination numbers, no acronyms outside the returns themselves.
 *   Those belong in `docs/regulatory.md` and in the filings, not the pitch.
 * - **Roadmap framing, never deficit framing** — and nothing marked `live`
 *   that is not actually running. What is coming, not what is missing.
 */

/**
 * Contact, as character codes.
 *
 * The address is never a plain string in source, in the bundle, or in the
 * DOM — see `components/ui/ObfuscatedEmail.tsx`. A published address on a
 * platform handling payment data is a credible pretexting target, not merely
 * a spam magnet, and this one is what an institution would use to reach the
 * team.
 */
export const CONTACT = {
  emailUser: [116, 101, 97, 109],
  emailDomain: [98, 117, 102, 102, 114, 97, 110, 97, 108, 121, 116, 105, 99, 115, 46, 99, 111, 109],
  emailSpoken: 'team at buffranalytics dot com',
} as const;

/**
 * Getting an account.
 *
 * **Request access, not sign up.** Accounts on this platform are issued by an
 * administrator and never self-created — see the Account lifecycle section of
 * the README. A sign-up form would contradict that, so the path is a mail to
 * the team with the purpose already stated.
 */
export const ACCESS = {
  regulator: {
    prompt: 'Need oversight access?',
    action: 'Request access',
    subject: 'Oversight access request',
  },
  general: {
    prompt: 'No account yet?',
    action: 'Request access',
    subject: 'Access request',
  },
  /** Said once, plainly, so nobody hunts for a sign-up form that will never
   *  exist. Accounts are issued deliberately. */
  note: 'Accounts are issued rather than self-created, so access is arranged with the team.',
} as const;

/**
 * The brand.
 *
 * **The platform is Buffr Intelligence. WayaMe is the infrastructure it
 * observes.** Never weld the two names together: WayaMe is the consumer-facing
 * name of Namibia's instant payment service, operated by Instant Payments
 * Namibia. Writing "WayaMe Buffr Intelligence" would claim a relationship that
 * is not ours to claim. Where the relationship is the point, say it in a
 * sentence — "Buffr Intelligence reads data from the WayaMe rails" — which is
 * also the accurate description.
 */
export const BRAND = {
  name: 'Buffr Intelligence',
  tagline: 'See the payment system clearly.',
  /** Named only where the relationship is being explained. */
  rails: 'WayaMe',
  railsOperator: 'Instant Payments Namibia',
} as const;

/**
 * What the platform is, and — just as load-bearing — what it is not.
 *
 * The second column is not a disclaimer. It is the architecture: there is no
 * code path in this system that could move money, because it is never in the
 * payment path. Stating both halves together is what makes the first half
 * credible.
 */
export const POSITION = {
  heading: 'An observer, not a participant',
  lead: 'The platform is told the outcome of payments made over the national rails, and analyses them. It is not in the payment path.',
  does: [
    'Receive transaction-pattern data under agreement',
    'Analyse it for pattern, concentration and reach',
    'Surface dashboards, anomalies and returns',
    'Flag unusual activity for a person to examine',
  ],
  cannot: [
    'Start a payment',
    'Stop, hold or reverse a payment',
    'Hold a balance or touch anyone’s money',
    'Change what the rails recorded',
  ],
} as const;

/** What the oversight side can answer. Each is a real, implemented view. */
export const OVERSIGHT_CAPABILITIES = [
  {
    title: 'Where the money is, and where it is not',
    detail:
      'Activity nationally, by region, and by constituency — the level at which a coverage gap is actually visible, rather than averaged away.',
  },
  {
    title: 'Reach measured against population',
    detail:
      'Acceptance points per ten thousand adults, read against how many people an area actually serves rather than against a national total.',
  },
  {
    title: 'Whether the market is concentrating',
    detail:
      'How much of the value depends on a handful of participants, a single constituency or one region, measured with the concentration index (HHI).',
  },
  {
    title: 'What kinds of participant are actually transacting',
    detail:
      'Groups found from behaviour rather than from a declared category — and individuals as well as businesses, since person-to-person is a live use case on the rails.',
  },
  {
    title: 'Who has stopped',
    detail:
      'Participants onboarded but never transacting, and those that have gone quiet. Both are counted in coverage figures elsewhere, which makes networks look larger than they are.',
  },
  {
    title: 'Whether interoperability is actually reducing cash',
    detail:
      'Moving value between a wallet at one institution and an account at another used to require a cash step. Whether that step is disappearing is measurable at the transaction level, rather than estimated from a survey.',
  },
] as const;

/** The "ask anything" analytics capability — a live query, not a canned
 *  report. The example Q/A is illustrative, matching how the other example
 *  figures on ForRegulatorsPage are representative rather than real. */
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

/**
 * The precedent, and why it is the strongest thing on the site.
 *
 * **The Bank of Namibia is not a naive buyer of this.** It has run an
 * automation programme since 2022, built a predictive model for
 * non-performing loans, automated sanctions screening and trade
 * verification, delivered Namibia's first automated regulatory reporting
 * system, and been recognised internationally for it.
 *
 * That matters twice over. It means the appetite and the internal capability
 * are proven rather than hypothetical — and it means any copy positioning
 * this platform as *introducing* data-driven supervision to the Bank would be
 * both wrong and slightly insulting to the people who already did it.
 *
 * The honest and much stronger claim is narrower: that posture has not been
 * applied to the payment rails themselves, because doing so needs data from
 * the rails operator and a method that works without labelled fraud. Both are
 * what this platform is.
 *
 * No document is named here, per the rule at the top of this file. The facts
 * stand on their own and a named strategy goes stale when it is revised.
 */
export const PRECEDENT = {
  heading: 'The capability is proven. The data is the missing half.',
  body: [
    'The Bank has run an automation and machine-learning programme for years — a predictive model for non-performing loans, automated sanctions screening and trade verification, and the country’s first automated regulatory reporting system. This is an institution that has already decided data-driven supervision is worth building, and then built it.',
    'What that programme has not reached is the payment rails themselves, and not for want of intent. Analysing them needs transaction-pattern data the Bank does not hold directly, and a detection method that works where no confirmed fraud has ever been catalogued to learn from. This platform is those two things and nothing else.',
  ],
} as const;

/** Landing page. The argument, stated once. */
export const LANDING = {
  heroLead: 'See the payment system',
  /** Rotating words in the home headline. Each is something the platform
   *  actually measures, so the headline never promises a view that does not
   *  exist behind it. */
  rotatingAudiences: [
    'clearly',
    'as it happens',
    'by constituency',
    'by use case',
    'end to end',
  ],
  heroSupport:
    'Real-time analysis of Namibia’s live instant payment rails: dashboards, explainable anomaly detection, market-structure and inclusion measures, and returns that reconcile against the same record.',
  visionHeading:
    'Namibia’s instant payment rails went live this year. The oversight view of them has not caught up.',
  visionBody: [
    'Instant payments raise transaction volume and velocity at the same time. That is precisely the condition under which an annual, retrospective reporting cadence stops being sufficient on its own — not because anything is out of control, but because the profile of what oversight has to catch changes.',
    'The rails now produce a record of activity that has never been observable before, including in the parts of the economy that have always dealt in cash. What is missing is the layer that turns that record into evidence a supervisor can act on and defend acting on: measured against real population, drilled to the level where a gap is visible rather than averaged away, and explained rather than asserted.',
  ],
} as const;

/** What a mistake actually costs, stated identically wherever it appears. */
export const SCORING_ERROR_COST =
  'A scoring error costs an analyst a few minutes — it never stops a payment, because nothing here can.';

/**
 * The business questions the models answer — the regulator page's whole
 * argument, and the reason that page exists.
 *
 * Kept here rather than inline in the page so the page and `docs/business-plan.md`
 * cannot drift: a single export makes that a one-file check.
 *
 * **Agent float is deliberately absent.** Whether individual cash agents are
 * running low cannot be assessed from payment-rail data alone — it needs
 * agent-level balance data from partner institutions, which is out of scope.
 * The business plan says so explicitly, so listing it here as a capability
 * would contradict our own filing. A capability that cannot be measured with
 * confidence is left out entirely rather than listed as a future promise.
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
  forecasting: {
    label: 'Forecasting',
    question:
      'How much volume should we plan capacity for next month — without pretending we can predict fraud?',
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
 * The answer to each question, in plain terms — what the capability actually
 * tells a reviewer, rather than the technical method behind it.
 *
 * Keyed to match `BUSINESS_QUESTIONS`: that names the model doing the work
 * and asks the question, this answers it. Each section on the regulator page
 * reads its lead paragraph from here, so the page and this file cannot drift
 * and the same wording is available to the docs.
 *
 * Two things this copy is careful about, and neither is stylistic:
 *
 * - **Participants, not only businesses.** Individuals transact on the rails
 *   too — person-to-person is a live use case, and the participant count
 *   grows as more institutions onboard. Copy that says "merchants" wherever
 *   it means "everyone transacting" would understate what is being measured.
 * - **Constituency, not only region.** The drill-down goes to constituency
 *   level, which is where a coverage gap is actually visible; a regional
 *   average hides a constituency with nothing in it.
 */
export const PLATFORM_ANSWERS = {
  alerts:
    'The system ranks unusual activity by how much money is at risk and how unusual it is for that specific participant, so a reviewer’s limited time goes to the highest-stakes cases first, not a fixed daily list.',
  concentration:
    'A concentration measure shows whether volume is spread across many participants, constituencies and regions or dangerously concentrated in a few — the same kind of measure competition regulators already use.',
  adoption:
    'The platform separates typical users from edge cases — someone who paid once and left, a seasonal worker dormant most of the year — so growth numbers are not misleading.',
  cash:
    'It also shows which constituencies, regions, participants and use cases are lagging in digital adoption, so effort can be targeted rather than spread evenly.',
  forecasting:
    'A forecast based on known weekly and seasonal patterns — paydays, month-end, market days — supports capacity and operational planning. Fraud itself is never forecast, because unlike volume, fraud adapts the moment it is caught, so a forecast of it would be describing behaviour designed to defeat the forecast.',
  returns:
    'Every report the platform generates is produced from, and checked against, the same underlying data the live dashboards use — so a filed number and a displayed number cannot silently drift apart.',
} as const;

/**
 * Why the questions matter to the institution reading them.
 *
 * Placed after the questions rather than before: the questions are the
 * evidence, this is what the evidence is for. A reader who has just seen
 * working measures is ready for the argument; one who has not is being asked
 * to take it on trust.
 *
 * The fraud argument is the one worth getting right. Not being able to publish
 * a fraud rate reads as a limitation until you notice that a *reduction*
 * cannot be shown without a baseline, and no baseline exists for this part of
 * the economy. Refusing to invent one is what makes the series credible when
 * it finally exists.
 */
export const WHY_THIS_MATTERS = {
  heading: 'Why this matters',
  lead: 'A national payment system is held to a plain standard: that it works safely, efficiently and effectively for everyone it is meant to serve. The hardest part of that to evidence is the last one — whether the move to digital is genuinely reaching the businesses and people who still deal mostly in cash.',
  points: [
    {
      title: 'Settlement records say what cleared, not who was reached.',
      detail:
        'They cannot say whether a business onboarded in March is still trading in June, whether growth in a region is many new users or one large one, or whether a rising average is broadening reach or concentrating it. Separating those is arithmetic on data the rails already produce — but only if someone is doing the arithmetic continuously, against each region’s own population rather than a national total.',
    },
    {
      title: 'A reduction needs a baseline nobody has yet.',
      detail:
        'Showing that payment fraud is falling requires a series to measure the fall against, and none exists for this part of the economy. Every verdict a reviewer records — confirmed, dismissed, sent back for more — is one entry in the first honest version of that series. That record is what a claim of falling fraud can eventually rest on, which is also why no rate is published here before it can be defended.',
    },
    {
      title: 'An unexplainable score cannot be acted on.',
      detail:
        'Every score the platform produces carries the reasons that produced it, and every score records the configuration it was computed under. A supervisor can interrogate a flag, disagree with it, and defend a decision made on it. A single opaque number supports none of those, which is why explainability is a design requirement here rather than a feature.',
    },
  ],
} as const;

/*
 * The phased data-access sequence used to live here as `OVERSIGHT_ROADMAP`.
 * It now lives in `components/illustration/PhaseLadder.tsx` as `DATA_PHASES`,
 * because the component draws the escalation rather than listing it and a
 * second prose copy of the same sequence is how the two drift apart.
 */

/**
 * Regulator page framing. No scheme codes and no named strategy documents:
 * those belong in the returns, not the pitch (`docs/regulatory.md` opens by
 * saying so).
 *
 * The credibility comes instead from checkable methodology, and that claim is
 * made inside the question it belongs to rather than in one general-purpose
 * block: reach against census population under the inclusion question,
 * concentration-measured-the-standard-way under the concentration question.
 * A methodology section floating free of any question is the kind of thing a
 * reader skips.
 */
export const REGULATOR = {
  heroHeading: 'Business questions our models answer',
  heroSupport:
    'Every measure below is implemented, runs against the same record, and states the denominator it was computed over.',
} as const;
