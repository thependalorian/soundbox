import React from 'react';
import PageHero from '../../components/Public/PageHero';
import ButtonLink from '../../components/ui/ButtonLink';
import PublicShell from '../../components/Public/PublicShell';
import Card from '../../components/ui/Card';
import Roadmap from '../../components/Public/Roadmap';
import TrustMark from '../../components/illustration/TrustMark';

/**
 * Public privacy position.
 *
 * Namibia has no enacted data protection law yet, so there is no template to
 * copy and nothing forcing a statement at all. That is exactly why one
 * belongs here: a seller handing over their livelihood to a device, and a
 * regulator deciding whether to let it near the rails, both need to know
 * what is kept — and the honest answer is a selling point.
 */

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

const PrivacyPage: React.FC = () => (
  <PublicShell>
    <PageHero title="What we keep, and what we do not" lead="A payment record says a great deal about a person. We hold the least of it that still lets a seller be paid and a regulator see the system working." />

    {/* The standard we hold ourselves to */}
    <section className="bg-blush">
      <div className="max-w-content mx-auto px-24 py-96">
        <TrustMark kind="minimal" className="mb-16" />
        <h2 className="text-heading font-signifier text-ink max-w-prose">
          Our approach to data privacy
        </h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[600px]">
          We collect as little personally identifiable information as possible — only what a
          seller needs to get paid and a regulator needs to see the system working. We hold
          ourselves to the same standards set out in Europe&apos;s General Data Protection
          Regulation and South Africa&apos;s Protection of Personal Information Act: collect only
          what a stated purpose requires, and never repurpose it.
        </p>
      </div>
    </section>

    {/* What is held */}
    <section className="max-w-content mx-auto px-24 py-96">
      <TrustMark kind="record" className="mb-16" />
      <h2 className="text-heading font-signifier text-ink">What the system holds</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-40">
        {HOLDINGS.map((h) => (
          <Card key={h.t} variant={h.tone === 'minimal' ? 'accent' : 'neutral'} className="p-24">
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
    </section>

    {/* What never happens — the page's one emphasis band. The other five
        pages each have one; this was the outlier without, and without it
        the six-section run before a fixed-paper closing section forced two
        white sections back to back (see the footer fix in PublicShell for
        the same class of bug). */}
    <section className="bg-brand-gradient-aa py-128">
      <div className="max-w-content mx-auto px-24">
        <TrustMark kind="access" className="mb-16" />
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

    {/* Roadmap */}
    <section className="bg-blush">
      <div className="max-w-content mx-auto px-24 py-96">
        <h2 className="text-heading font-signifier text-ink">Where this goes next</h2>
        <Roadmap
          className="mt-40"
          items={[
            {
              phase: 'live',
              title: 'Minimal collection',
              detail:
                'Payer detail is limited to a masked reference. Every record is append-only, so nothing can be altered without leaving a trace of who altered it.',
            },
            {
              phase: 'building',
              title: 'Stronger protection at rest',
              detail:
                'Separate encryption for identification numbers, with access to them logged apart from ordinary reads.',
            },
            {
              phase: 'planned',
              title: 'A published retention schedule',
              detail:
                'Concrete durations for each kind of record, and a straightforward way for a person to ask what is held about them.',
            },
          ]}
        />
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
