import React from 'react';
import PageHero from '../../components/Public/PageHero';
import PublicShell from '../../components/Public/PublicShell';
import BrowserFrame from '../../components/Public/BrowserFrame';
import Card from '../../components/ui/Card';
import Panel from '../../components/ui/Panel';
import Reveal from '../../components/ui/Reveal';
import Meter from '../../components/ui/Meter';
import ButtonLink from '../../components/ui/ButtonLink';
import TwoLayerDiagram from '../../components/illustration/TwoLayerDiagram';
import ObserverDiagram from '../../components/illustration/ObserverDiagram';
import ModelComparison from '../../components/illustration/ModelComparison';
import Figure from '../../components/charts/Figure';
import { ShareBars } from '../../components/charts/primitives';
import { SCORING_ERROR_COST, POSITION } from '../../lib/copy/public';

/**
 * How the platform works: where the data comes from, how a payment gets
 * scored, and why every score has to be able to explain itself.
 *
 * Explanation before demonstration — a reader has to know the platform is
 * never in the payment path before an anomaly score means anything to them.
 * Read the wrong way round, "we flagged this payment" sounds like "we stopped
 * this payment", which is the one misreading that would matter.
 *
 * This page does not ask for a sign-in. It hands the reader to Privacy, which
 * is the next honest question to ask.
 */

/** The weights shown here mirror the shipped defaults in
 *  `backend/app/services/anomaly_rule_config.py` (DEFAULT_RULES). If those
 *  change, this changes — a public example that no longer matches the scorer
 *  is worse than no example. */
const REASONS = [
  { label: 'Short-term transaction velocity', detail: '14 payments in the last hour, above the threshold of 3x this business’s own hourly median', weight: 0.3 },
  { label: 'Daily transaction velocity', detail: '96 payments in the last 24 hours, above 3x its own median for this weekday', weight: 0.3 },
  { label: 'Unusual transaction amount', detail: 'N$2,583.17 is 4.1x this business’s average of N$630.04', weight: 0.2 },
  { label: 'Outside normal trading hours', detail: 'Payment at 03:00, outside the hours this business normally trades', weight: 0.1 },
];

/** Not the `Roadmap` card grid here — a fourth page rendering it would make
 *  every page answer "what's coming" with the same block. Ordered prose
 *  instead: the sequence is the point, and a numbered list states it. */
const PHASE_LABEL: Record<'live' | 'building' | 'planned', string> = {
  live: 'Live now',
  building: 'Building',
  planned: 'Planned',
};

const SCORING_ROADMAP = [
  {
    phase: 'live' as const,
    title: 'Clear rules',
    detail:
      'Every alert comes from a short list of plain checks, and every score traces back to the exact conditions that caused it. That is what lets anyone argue with it.',
  },
  {
    phase: 'building' as const,
    title: 'Learning from patterns',
    detail:
      'A two-layer model that separates ordinary activity from unusual activity, then ranks severity within the unusual set — five candidate models compared on the same measures, and the choice made on which one actually distinguishes a manipulated payment rather than which one is simply wrong more often. Built and validated against anomalies introduced deliberately; it learns from real structure as soon as shared data exists.',
  },
  {
    phase: 'planned' as const,
    title: 'Measured accuracy',
    detail:
      'Every time a reviewer records whether an alert was right, the system gains a real example. Enough of those, and how often it is right becomes a published number rather than an asserted one.',
  },
];

/** How a payment becomes a measure. Every step is observation. */
const FLOW = [
  {
    step: '1',
    title: 'The payment happens without us',
    detail:
      'Cleared and settled between the institutions on the national rails. The platform is not consulted, cannot intervene, and learns nothing until afterwards.',
  },
  {
    step: '2',
    title: 'Pattern data arrives under agreement',
    detail:
      'Scoped and minimised to the analytical purpose agreed — masked or tokenised identifiers, never a full phone number and never a national ID.',
  },
  {
    step: '3',
    title: 'It is scored and measured',
    detail:
      'Rules and models score it against that business’s own history. Volume, reach and concentration measures update from the same record.',
  },
  {
    step: '4',
    title: 'A person decides',
    detail:
      'An alert ranks a payment for review. Only a reviewer’s recorded verdict decides anything, and that verdict is logged against a named person.',
  },
] as const;

const HowItWorksPage: React.FC = () => {
  const total = REASONS.reduce((s, r) => s + r.weight, 0);

  return (
    <PublicShell>
      <PageHero
        tone="mechanism"
        title="From a settled payment to a measure"
        lead="Where the data comes from, how it is scored, and why every score has to be able to explain itself."
      />

      {/* The path, and the boundary. First, because everything after it is
          read differently once the reader knows we are never in the path. */}
      <section className="bg-paper py-96">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink max-w-[560px]">
            The platform is told what happened
          </h2>
          <p className="text-body font-sohne text-slate mt-16 max-w-prose">{POSITION.lead}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-24 mt-40">
            {FLOW.map((j, i) => (
              <Reveal key={j.step} delay={i * 90}>
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center w-32 h-32 rounded-full
                             bg-blush text-sienna text-caption font-mono font-500"
                >
                  {j.step}
                </span>
                <h3 className="text-body font-sohne font-450 text-ink mt-16">{j.title}</h3>
                <p className="text-caption font-sohne text-slate mt-8">{j.detail}</p>
              </Reveal>
            ))}
          </div>

          {/* The same claim as a drawing. The steps say the payment completes
              without us; the diagram shows there is no arrow back. */}
          <Reveal>
            <ObserverDiagram className="mt-48 w-full" />
          </Reveal>
        </div>
      </section>

      {/* Why the question interface cannot write its own queries. */}
      <section className="bg-blush py-96">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink max-w-[620px]">
            Questions run against reviewed calculations, never invented queries
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mt-40">
            <Reveal delay={0}>
              <Panel className="h-full">
                <div className="p-24">
                  <h3 className="text-subheading font-signifier text-ink">Security</h3>
                  <p className="text-caption font-sohne text-slate mt-8">
                    A system that generates its own database queries against shared payment data is
                an attack surface. A fixed set of reviewed functions closes it off entirely.
                  </p>
                </div>
              </Panel>
            </Reveal>
            <Reveal delay={90}>
              <Panel className="h-full">
                <div className="p-24">
                  <h3 className="text-subheading font-signifier text-ink">Auditability</h3>
                  <p className="text-caption font-sohne text-slate mt-8">
                    Each function was reviewed once and behaves identically every time it is called,
                so any figure can be traced back to exactly how it was computed.
                  </p>
                </div>
              </Panel>
            </Reveal>
            <Reveal delay={180}>
              <Panel className="h-full">
                <div className="p-24">
                  <h3 className="text-subheading font-signifier text-ink">Reconciliation</h3>
                  <p className="text-caption font-sohne text-slate mt-8">
                    A filed number and a displayed number cannot silently drift apart, because both
                come from the same versioned calculation path.
                  </p>
                </div>
              </Panel>
            </Reveal>
          </div>
          <p className="text-body font-sohne text-slate mt-32 max-w-prose">
            The consequence is deliberate: the assistant can decline to answer. A question the
            reviewed functions cannot compute gets no number at all, rather than a plausible one.
          </p>
        </div>
      </section>

      {/* Why every score explains itself. */}
      <section className="bg-paper py-96">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink max-w-prose">
            Why every score explains itself
          </h2>
          <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
            An alert nobody can question is an alert everybody eventually ignores. So the system
            shows what triggered it, the numbers behind it, and what it did not look at.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-64 items-start mt-40">
            <div>
              <h3 className="text-subheading font-signifier text-ink">Why this was flagged</h3>
              <p className="text-body font-sohne text-slate mt-8">
                Each check carries a fixed weight and states its evidence in the business&apos;s
                own numbers — never against a national average, which would flag a large business
                permanently for being large. The score is the sum of what triggered.
              </p>
              <p className="text-caption font-sohne text-ash mt-16">
                Every score also records the configuration it was computed under. Two alerts
                scored under different thresholds are not directly comparable, and the platform
                says so rather than letting them be read side by side.
              </p>
            </div>
            <BrowserFrame label="Alert — Oshakati Cash Agent">
              <div className="space-y-16">
                {REASONS.map((r) => (
                  <div key={r.label}>
                    <div className="flex items-baseline justify-between gap-16">
                      <span className="text-caption font-sohne text-ink">{r.label}</span>
                      <span className="text-caption font-sohne text-ash tabular-nums shrink-0">
                        +{r.weight.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-caption font-sohne text-slate mt-4">{r.detail}</p>
                    <Meter className="mt-8" value={(r.weight / total) * 100} label={`${r.label} contribution`} />
                  </div>
                ))}
                <p className="text-caption font-sohne text-ash pt-12 border-t border-mist">
                  This score reads trading patterns only. How the business was verified and how
                  a customer was identified are each assessed on their own terms.
                </p>
              </div>
            </BrowserFrame>
          </div>

          <div className="mt-64 pt-64 border-t border-mist">
            <h3 className="text-subheading font-signifier text-ink max-w-prose">
              The most likely alert is rarely the most important one
            </h3>
            <p className="text-body font-sohne text-slate mt-16 max-w-[600px]">
              A queue sorted by score puts a near-certain N$500 alert above a likely N$50,000
              one. Sorting by exposure — score multiplied by amount — puts the money first,
              which is the question a reviewer with limited time actually has.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-32 max-w-[720px]">
              <Card variant="neutral" className="p-24">
                <p className="text-caption font-sohne text-slate">Sorted by score</p>
                <p className="text-heading-sm font-signifier text-ink mt-8 tabular-nums">0.95</p>
                <p className="text-caption font-sohne text-ash mt-4">on N$500 — N$475 at risk</p>
              </Card>
              <Card variant="accent" className="p-24">
                <p className="text-caption font-sohne">Sorted by exposure</p>
                <p className="text-heading-sm font-signifier mt-8 tabular-nums">0.40</p>
                <p className="text-caption font-sohne mt-4">on N$50,000 — N$20,000 at risk</p>
              </Card>
            </div>
          </div>

          <div className="mt-64 pt-64 border-t border-mist">
            <h3 className="text-subheading font-signifier text-ink max-w-prose">
              How the scoring gets sharper
            </h3>
            <p className="text-body font-sohne text-slate mt-16 max-w-[600px]">
              Each stage builds on the one before it, and each needs the stage before it to have
              run for a while. Nothing here is switched on before it has something real to work
              with.
            </p>
            <ol className="mt-32 space-y-20 max-w-[640px]">
              {SCORING_ROADMAP.map((r, i) => (
                <li key={r.title} className="flex gap-16">
                  <span className="text-caption font-sohne text-sienna font-500 shrink-0">
                    {i + 1}. {PHASE_LABEL[r.phase]}
                  </span>
                  <div>
                    <p className="text-body font-sohne font-450 text-ink">{r.title}</p>
                    <p className="text-caption font-sohne text-slate mt-4">{r.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            {/* The method, drawn. The hard idea in the prose above is that
                the first layer sorts rather than decides; a funnel with the
                wide branch leaving makes that obvious in a glance. */}
            <Reveal>
              <TwoLayerDiagram className="mt-48 w-full" />
            </Reveal>

            <p className="text-caption font-sohne text-ash mt-24 max-w-prose">
              We report what the system flagged, and will publish an accuracy figure once it has
              been earned. The system only ever reads what already happened. {SCORING_ERROR_COST}
            </p>
          </div>
        </div>
      </section>

      {/* Five models, and the fact that they disagree. A reader who can sort
          the table and watch the ranking flip has learned more about the
          method than any single accuracy figure could tell them. */}
      <section className="bg-blush py-96">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink max-w-[620px]">
            Five models, and the one that wins depends on the question
          </h2>
          <p className="text-body font-sohne text-slate mt-16 max-w-prose">
            The published method compares a handful of classifiers rather than asserting one. So
            does this. The interesting part is that they disagree: the most accurate model is not
            the best detector, and the best raw detector is the least accurate.
          </p>
          <Reveal>
            <ModelComparison className="mt-40" />
          </Reveal>
        </div>
      </section>

      {/* What it runs on. Placed before the close because a reader who has
          just been walked through the scoring will reasonably assume it is
          running on real payments, and it is not. Letting that assumption
          stand would be the single most damaging thing on this site. */}
      <section className="bg-paper py-96">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink max-w-[620px]">
            What all of this runs on today
          </h2>
          <p className="text-body font-sohne text-slate mt-16 max-w-prose">
            Generated activity, not real payments. No transaction data has been requested from
            anyone, and nothing on this site describes real Namibian payment behaviour.
          </p>
          <p className="text-body font-sohne text-slate mt-16 max-w-prose">
            That is deliberate rather than a limitation being glossed. A method that can only be
            judged after someone hands over their data is a method nobody can evaluate before
            deciding whether to hand it over. Building it against activity we generate — with
            anomalies planted so detection is measured rather than claimed — means the whole
            thing can be inspected first, and the request that follows is smaller because of it.
          </p>
          <Reveal>
            <Figure
              className="mt-40 max-w-[720px]"
              label="seed_synthetic.py · use-case mix"
              source="29,022 payments, 11 use cases, 35 planted anomalies"
            >
              <ShareBars
                data={[
                  { label: 'Person to business', value: 39.4 },
                  { label: 'Person to person', value: 17.7 },
                  { label: 'Cash out at an agent', value: 9.0 },
                  { label: 'Cash in at an agent', value: 6.4 },
                  { label: 'Business to person', value: 6.4 },
                  { label: 'Business to business', value: 6.0 },
                  { label: 'Government to person', value: 5.2 },
                  { label: 'Other use cases', value: 9.9 },
                ]}
                format={(v) => `${v.toFixed(1)}%`}
              />
            </Figure>
          </Reveal>

          <p className="text-caption font-sohne text-ash mt-24 max-w-prose">
            Every figure quoted anywhere on this site is measured against anomalies we
            introduced. Detection rates and thresholds would be derived again on real activity;
            they are not predictions of how the models will perform on it.
          </p>
        </div>
      </section>

      {/* Closing — no sign-in. This page has made its case; Privacy is the
          next honest question a reader who is not yet ready to sign in
          would ask. */}
      <section className="bg-blush py-96 text-center">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink">This is how it stays honest</h2>
          <p className="text-body font-sohne text-slate mt-16 max-w-[480px] mx-auto">
            What is tested, what is safeguarded by design, and what is still being built —
            stated plainly rather than assumed.
          </p>
          <ButtonLink to="/privacy" className="mt-32" arrow>See how trust is built in</ButtonLink>
        </div>
      </section>
    </PublicShell>
  );
};

export default HowItWorksPage;
