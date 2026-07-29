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
    d: 'Names and identification for the people behind a registered business, because ownership transparency requires identifying a person rather than a name that could match thousands.',
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
          Built to a standard Namibia has not yet legislated
        </h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[600px]">
          Namibia&apos;s data protection law is drafted but not yet in force. Rather than wait, the
          system is built to the principles that Bill is modelled on — the same ones used across
          Europe and South Africa. Deciding not to collect something costs nothing today; removing
          it from years of records costs a great deal.
        </p>
        <p className="text-body font-sohne text-slate mt-16 max-w-[600px]">
          When the law does arrive, the work should be an audit rather than a rebuild.
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
        <h2 className="text-heading font-signifier text-paper">What never happens to it</h2>
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
          Nothing here decides anything about a person
        </h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[600px]">
          Data protection law restricts decisions made solely by automated means where they carry a
          real effect on someone. The system sits structurally clear of that: it cannot decline,
          hold or reverse a payment. Scoring only ever raises an alert for a person to review
          afterwards, and no customer is refused anything by software here.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mt-40">
          {[
            { t: 'Alerts state their reasons', d: 'What triggered a score, in the business’s own numbers — never a figure with nothing behind it.' },
            { t: 'Every score is attributable', d: 'Traceable to a named model and version, so a decision made under one policy is never confused with another.' },
            { t: 'A reviewer’s verdict is the record', d: 'A human decision is always the one that counts, and it is what gets written down.' },
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
        The seller is the one with most at stake
      </h2>
      <p className="text-body font-sohne text-slate mt-16 max-w-[600px]">
        Consumer protection is usually written around the person paying. At a market stall the
        thinner margin belongs to the person selling, so three protections are built for them.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mt-40">
        {[
          {
            t: 'Never a false confirmation',
            d: 'If the box is unsure, it says pending. A wrong "paid" costs a trader their stock, so uncertainty is always spoken aloud.',
          },
          {
            t: 'Never counted twice',
            d: 'The same payment reported again is recognised, so a retrying device cannot double-charge a customer or overstate a seller’s takings.',
          },
          {
            t: 'Being flagged is not being punished',
            d: 'An alert reaches an analyst, nothing else. A seller keeps trading and keeps being paid; no score can cut anyone off.',
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
