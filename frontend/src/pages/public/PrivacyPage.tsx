import React from 'react';
import PageHero from '../../components/Public/PageHero';
import ButtonLink from '../../components/ui/ButtonLink';
import PublicShell from '../../components/Public/PublicShell';
import Card from '../../components/ui/Card';
import TitleDetailCardGrid from '../../components/ui/TitleDetailCardGrid';
import Roadmap from '../../components/Public/Roadmap';
import TrustMark from '../../components/illustration/TrustMark';

/**
 * Public privacy position — and, since the trust page was folded in here,
 * the record-integrity and access-control promises that used to sit on a
 * separate page. Trust in the record and restraint on personal data turned
 * out to be one page's worth of argument, not two: a seller handing over
 * their livelihood to a device, and a regulator deciding whether to let it
 * near the rails, are asking the same underlying question either way.
 *
 * Namibia has no enacted data protection law yet, so there is no template to
 * copy and nothing forcing a statement at all. That is exactly why one
 * belongs here — the honest answer is a selling point.
 */

const RECORD_INTEGRITY = [
  { title: 'History is added to, never overwritten', detail: 'A correction is a new entry that sits alongside the original. Nothing is edited in place.' },
  { title: 'Nothing is truly deleted', detail: 'Records are marked as removed rather than erased, so the trail stays complete.' },
  { title: 'Money is stored exactly', detail: 'Amounts are held as exact figures with their currency, never as approximations that drift by a cent.' },
  { title: 'Rules live in one place', detail: 'Every decision happens in code that can be read and reviewed, not hidden inside the database.' },
];

const ACCESS_CONTROL = [
  { title: 'Access is enforced, not hidden', detail: 'Restricted pages are blocked outright, not merely left out of a menu.' },
  { title: 'A seller sees only their own business', detail: 'Their devices, their payments, their alerts. Nothing belonging to anyone else.' },
  { title: 'Identity documents are never sent back', detail: 'An owner’s national identity number is recorded once and never returned to any screen. A reviewer sees that the check was done, not the number.' },
  { title: 'Credentials stay out of the code', detail: 'Secrets are supplied by the environment; what is committed contains placeholders only.' },
];

const HOLDINGS = [
  {
    t: 'The amount, and when',
    d: 'What was paid, to which business, at what time. This is what makes announcements and reporting possible.',
    tone: 'held' as const,
  },
  {
    t: 'Where the business trades',
    d: 'The stall or shop location, so coverage can be measured by region and constituency.',
    tone: 'held' as const,
  },
  {
    t: 'Who owns the business',
    d: 'Names and identification for the people behind a registered business.',
    tone: 'held' as const,
  },
  {
    t: 'Who paid',
    d: 'A masked reference only. Not a full phone number, not an account number, not an identity document.',
    tone: 'minimal' as const,
  },
];

const NEVER = [
  'Sold, rented, or shared for anyone else’s marketing',
  'Used to decide whether a payment goes through',
  'Linked to a shopper’s identity for profiling',
  'Kept in a form that can be edited without leaving a trace',
];

/** From backend/ml/README.md's injection-validation test. Nothing here is
 *  trained on these cases — the detector is only asked whether it can tell
 *  a manipulated payment from a real one. */
const SENSITIVITY = [
  { label: 'Amount inflated 8x', score: 0.2, represents: 'a compromised terminal pushing value through', ordinary: false },
  { label: 'Volume burst', score: 0.8, represents: 'an account drained by rapid repeat payments', ordinary: false },
  { label: 'Outside trading hours', score: 0.1, represents: 'activity while the business is closed', ordinary: false },
  { label: 'Duplicate amount', score: 0.7, represents: 'the same payment submitted twice', ordinary: false },
  { label: 'Ordinary trading', score: 0, represents: 'eight probes across normal hours', ordinary: true },
] as const;

const ROADMAP = [
  {
    phase: 'live' as const,
    title: 'Minimal collection',
    detail: 'Payer detail is limited to a masked reference. Every record is append-only, so nothing can be altered without leaving a trace of who altered it.',
  },
  {
    phase: 'building' as const,
    title: 'Stronger protection at rest',
    detail: 'Separate encryption for identification numbers, with access to them logged apart from ordinary reads.',
  },
  {
    phase: 'building' as const,
    title: 'Security, hardened for production',
    detail: 'Annual penetration testing and an independent security review, both sequenced ahead of any live payment traffic.',
  },
  {
    phase: 'building' as const,
    title: 'Regulatory approvals',
    detail: 'Type approval for the device’s radio from Namibia’s telecoms regulator, and certification against the national QR payment standard, are both already underway.',
  },
  {
    phase: 'planned' as const,
    title: 'A published retention schedule',
    detail: 'Concrete durations for each kind of record, and a straightforward way for a person to ask what is held about them.',
  },
  {
    phase: 'planned' as const,
    title: 'Measured accuracy',
    detail: 'Published once enough alerts have been reviewed to earn a number that holds up.',
  },
];

const PrivacyPage: React.FC = () => (
  <PublicShell>
    <PageHero
      tone="restraint"
      title="What we keep, and what we do not"
      lead="A payment record says a great deal about a person. We hold the least of it that still lets a seller be paid and a regulator see the system working."
    />

    {/* The standard we hold ourselves to */}
    <section className="bg-blush">
      <div className="max-w-content mx-auto px-24 py-96">
        <TrustMark kind="minimal" className="mb-16" />
        <h2 className="text-heading font-signifier text-ink max-w-prose">
          We hold a standard nobody is making us meet
        </h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[600px]">
          Namibia has no data protection law in force yet, so nothing requires this of us. We
          collect only what a seller needs to get paid and a regulator needs to see the system
          working — the same test Europe&apos;s GDPR and South Africa&apos;s POPIA apply: collect
          only what a stated purpose requires, and never repurpose it. We chose that bar before
          anyone could hold us to it.
        </p>
      </div>
    </section>

    {/* The record cannot be quietly changed */}
    <section className="bg-paper">
      <div className="max-w-content mx-auto px-24 py-96">
        <TrustMark kind="record" className="mb-16" />
        <h2 className="text-heading font-signifier text-ink max-w-prose">
          The record cannot be quietly changed
        </h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[600px]">
          What happened stays as it happened, so a dispute can always be settled by looking.
        </p>
        <TitleDetailCardGrid
          items={RECORD_INTEGRITY}
          gridClassName="grid grid-cols-1 md:grid-cols-2 gap-16 mt-24"
          cardVariant="neutral"
          titleClassName="text-body font-sohne font-450 text-ink"
        />
      </div>
    </section>

    {/* What is held */}
    <section className="bg-blush">
      <div className="max-w-content mx-auto px-24 py-96">
        <h2 className="text-heading font-signifier text-ink">What the system holds</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-40">
          {HOLDINGS.map((h) => (
            <Card key={h.t} variant={h.tone === 'minimal' ? 'accent' : 'elevated'} className="p-24">
              <p className={`text-caption font-sohne ${h.tone === 'minimal' ? '' : 'text-ash'}`}>
                {h.tone === 'minimal' ? 'Deliberately minimal' : 'Held'}
              </p>
              <h3 className="text-subheading font-signifier mt-8">{h.t}</h3>
              <p className={`text-caption font-sohne mt-8 ${h.tone === 'minimal' ? '' : 'text-slate'}`}>
                {h.d}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>

    {/* People see only what they should */}
    <section className="bg-paper">
      <div className="max-w-content mx-auto px-24 py-96">
        <TrustMark kind="access" className="mb-16" />
        <h2 className="text-heading font-signifier text-ink max-w-prose">
          People see only what they should
        </h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[600px]">
          A seller, an analyst and an administrator are shown genuinely different systems.
        </p>
        <TitleDetailCardGrid
          items={ACCESS_CONTROL}
          gridClassName="grid grid-cols-1 md:grid-cols-2 gap-16 mt-24"
          cardVariant="neutral"
          titleClassName="text-body font-sohne font-450 text-ink"
        />
      </div>
    </section>

    {/* What never happens — the page's one emphasis band. */}
    <section className="bg-brand-gradient-aa py-128">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-paper">What never happens to your data</h2>
        <ul className="mt-40 space-y-16 max-w-[600px]">
          {NEVER.map((n) => (
            <li key={n} className="flex items-start gap-12">
              <span className="w-8 h-8 rounded-full bg-paper mt-8 shrink-0" aria-hidden="true" />
              <span className="text-body font-sohne text-paper">{n}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>

    {/* Nothing here decides anything about a person. From docs/privacy.md §4. */}
    <section className="bg-blush">
      <div className="max-w-content mx-auto px-24 py-96">
        <TrustMark kind="why" className="mb-16" />
        <h2 className="text-heading font-signifier text-ink max-w-prose">
          No model can act on its own
        </h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[600px]">
          Our models can flag a payment. They cannot decline, hold, or reverse one. When something
          looks unusual, a model raises an alert for a person to look at — nothing happens
          automatically, and no customer is ever refused by a model here.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mt-40">
          {[
            { t: 'Alerts state their reasons', d: 'Every alert shows what triggered it, in the business’s own numbers.' },
            { t: 'Every score can be traced', d: 'Each one is tied to the exact model and version that produced it.' },
            { t: 'A person makes the final call', d: 'Their decision is what gets written down — not the score.' },
          ].map((c) => (
            <Card key={c.t} variant="elevated" className="p-24">
              <h3 className="text-body font-sohne font-450 text-ink">{c.t}</h3>
              <p className="text-caption font-sohne text-slate mt-8">{c.d}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>

    {/* Sellers are consumers too */}
    <section className="bg-paper">
      <div className="max-w-content mx-auto px-24 py-96">
      <TrustMark kind="shield" className="mb-16" />
      <h2 className="text-heading font-signifier text-ink max-w-prose">
        Sellers have the most at stake
      </h2>
      <p className="text-body font-sohne text-slate mt-16 max-w-[600px]">
        Consumer protection usually focuses on the person paying. At a market stall, it&apos;s the
        seller working on the thinner margin — so we built three protections for them too.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mt-40">
        {[
          {
            t: 'Never a false confirmation',
            d: 'If the box isn’t sure, it says pending — never a false "paid." A wrong confirmation costs a trader their stock.',
          },
          {
            t: 'Never counted twice',
            d: 'A retrying device can’t double-charge a customer or inflate a seller’s takings — the same payment is recognised if it comes through twice.',
          },
          {
            t: 'Being flagged is not being punished',
            d: 'The alert goes to regulators, who decide what happens next. Our system sits outside the payment path. The seller keeps trading and keeps getting paid.',
          },
        ].map((c) => (
          <Card key={c.t} variant="neutral" className="p-24">
            <h3 className="text-body font-sohne font-450 text-ink">{c.t}</h3>
            <p className="text-caption font-sohne text-slate mt-8">{c.d}</p>
          </Card>
        ))}
      </div>
      </div>
    </section>

    {/* Tested against payments we altered on purpose, plus what's next —
        combined into one section so the alternating background lands on
        blush right before the fixed-paper closer, not paper-on-paper. */}
    <section className="bg-blush">
      <div className="max-w-content mx-auto px-24 py-96">
        <h2 className="text-heading font-signifier text-ink max-w-[620px]">
          Tested against payments we altered on purpose
        </h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
          With no confirmed fraud cases yet, there is no fraud rate to publish honestly. What can
          be measured today is sensitivity — whether the detector tells a manipulated payment
          apart from a real one. Following central-bank research on exactly this problem, five
          kinds of manipulated payment were generated and scored.
        </p>
        <div className="mt-32 max-w-[680px]">
          <Card variant="elevated" className="p-24">
            <div className="space-y-12">
              {SENSITIVITY.map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-16">
                  <div className="min-w-0">
                    <p className={`text-body font-sohne ${s.ordinary ? 'font-450 text-ink' : 'text-ink'}`}>
                      {s.label}
                    </p>
                    <p className="text-caption font-sohne text-slate">{s.represents}</p>
                  </div>
                  <span
                    className={`text-body font-sohne tabular-nums shrink-0 ${
                      s.ordinary ? 'text-status-success' : 'text-ink'
                    }`}
                  >
                    {s.score.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <p className="text-caption font-sohne text-ash mt-16 max-w-prose">
          Ordinary trading scores zero, so the separation is absolute rather than a ratio. This
          measures sensitivity, not a fraud rate — that needs confirmed cases, and we do not
          claim one.
        </p>

        <h3 className="text-subheading font-signifier text-ink mt-64">Where this goes next</h3>
        <Roadmap className="mt-24" items={ROADMAP} />
      </div>
    </section>

    <section className="max-w-content mx-auto px-24 py-96 text-center">
      <h2 className="text-heading font-signifier text-ink">See what it does with all this</h2>
      <p className="text-body font-sohne text-slate mt-16 max-w-[480px] mx-auto">
        Holding less is only useful if what remains still answers the questions oversight needs
        answered.
      </p>
      <ButtonLink to="/how-it-works" className="mt-32">See how it works</ButtonLink>
    </section>
  </PublicShell>
);

export default PrivacyPage;
