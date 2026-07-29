import React from 'react';
import PageHero from '../../components/Public/PageHero';
import PublicShell from '../../components/Public/PublicShell';
import BrowserFrame from '../../components/Public/BrowserFrame';
import MerchantQrCard from '../../components/Public/MerchantQrCard';
import PaymentDemo from '../../components/Public/PaymentDemo';
import Card from '../../components/ui/Card';
import Meter from '../../components/ui/Meter';
import ButtonLink from '../../components/ui/ButtonLink';

/**
 * How it works, and the demo that used to live on its own thin page.
 *
 * Explanation before demonstration: a reader has to know what they are
 * looking at — a printed code, a rail with two lanes, a device that only
 * listens — before the interactive piece means anything. The scoring
 * explanation that used to be this whole page now closes it, once the
 * reader has seen a payment actually run.
 *
 * Nine sections, one action: this page does not ask for a sign-in at all —
 * it hands the reader to Trust, which is the next honest question to ask.
 */

const REASONS = [
  { label: 'Short-term transaction velocity', detail: '14 transactions in the last hour, above the threshold of 10', weight: 0.3 },
  { label: 'Daily transaction velocity', detail: '96 transactions in the last 24 hours, above the threshold of 50', weight: 0.3 },
  { label: 'Unusual transaction amount', detail: 'N$2,583.17 is 4.1x this business’s average of N$630.04', weight: 0.2 },
  { label: 'Outside normal trading hours', detail: 'Transaction at 03:00, outside the 06:00-22:00 window', weight: 0.1 },
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
      'Comparing each business against others nearby, so a small rural seller is never flagged simply for being small. Built and ready; it starts learning as soon as real payments flow through.',
  },
  {
    phase: 'planned' as const,
    title: 'Measured accuracy',
    detail:
      'Every time someone reviews an alert and says whether it was right, the system gains a real example. Enough of those, and we can publish how often it is right — a number worth trusting because it was earned.',
  },
];

const HowItWorksPage: React.FC = () => {
  const total = REASONS.reduce((s, r) => s + r.weight, 0);

  return (
    <PublicShell>
      <PageHero
        tone="mechanism"
        title="See the whole payment, start to finish"
        lead="From the scan at your counter to the reasoning behind an alert — the full journey a payment takes, shown rather than described."
      />

      {/* It starts with a printed code. */}
      <section className="bg-paper py-96">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink max-w-[560px] mb-24">
            One printed code, forever
          </h2>
          <MerchantQrCard />
        </div>
      </section>

      {/* Rail diagram, the live device, sequence diagram, and ledger — one
          shared demo, extracted so this section is not a 200-line inline
          block in a nine-section marketing page. */}
      <PaymentDemo />

      {/* Why the device has to exist at all, not just the app on a phone.
          From docs/device.md. */}
      <section className="bg-paper py-96">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink max-w-[620px]">
            Why a box, when a phone already has a screen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-40">
            <Card variant="elevated" className="p-24">
              <h3 className="text-subheading font-signifier text-ink">A notification cannot be heard</h3>
              <p className="text-caption font-sohne text-slate mt-8">
                In a market, beside a road, or through a taxi window, a chime does not arrive.
                Sound that is designed to carry does.
              </p>
            </Card>
            <Card variant="elevated" className="p-24">
              <h3 className="text-subheading font-signifier text-ink">Many customers have no screen to show</h3>
              <p className="text-caption font-sohne text-slate mt-8">
                A customer can also pay by dialling a short code from a basic handset — no app,
                no data. That path exists to reach people without smartphones, and on it there is
                no confirmation screen for them to hold up.
              </p>
            </Card>
          </div>
          <p className="text-body font-sohne text-slate mt-32 max-w-prose">
            For a significant share of payments, the seller&apos;s own device is not a
            convenience over the customer&apos;s phone. It is the only evidence available at the
            moment they must decide whether to hand over goods — which is also why the box says
            <em> pending</em> rather than staying silent when it cannot check.
          </p>
        </div>
      </section>

      {/* Why every score explains itself — the explanation, the ranking
          logic, and how it gets sharper, folded into one section now that
          it is not the whole page. */}
      <section className="bg-blush py-96">
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
                own numbers. The score is simply the sum of what triggered — never a figure with
                no reason attached.
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
                  This score reads trading patterns only. How the business was verified, device
                  condition and customer identity are each assessed on their own terms.
                </p>
              </div>
            </BrowserFrame>
          </div>

          <div className="mt-64 pt-64 border-t border-mist">
            <h3 className="text-subheading font-signifier text-ink max-w-prose">
              The most likely alert is rarely the most important one
            </h3>
            <p className="text-body font-sohne text-slate mt-16 max-w-[600px]">
              A queue sorted by probability puts a near-certain N$500 alert above a likely
              N$50,000 one. Sorting by exposure — probability multiplied by amount — puts the
              money first, which is the question that actually matters.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-32 max-w-[720px]">
              <Card variant="neutral" className="p-24">
                <p className="text-caption font-sohne text-slate">Sorted by probability</p>
                <p className="text-heading-sm font-signifier text-ink mt-8 tabular-nums">95%</p>
                <p className="text-caption font-sohne text-ash mt-4">on N$500 — N$475 at risk</p>
              </Card>
              <Card variant="accent" className="p-24">
                <p className="text-caption font-sohne">Sorted by exposure</p>
                <p className="text-heading-sm font-signifier mt-8 tabular-nums">40%</p>
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
            <p className="text-caption font-sohne text-ash mt-24 max-w-prose">
              We report what the system flagged, and will publish an accuracy figure once it has
              been earned. Because the system only ever reads what already happened, a scoring
              error costs a reviewer a few minutes — never a seller their sale.
            </p>
          </div>
        </div>
      </section>

      {/* Closing — no sign-in. This page has made its case; Trust is the
          next honest question a reader who is not yet ready to sign in
          would ask. */}
      <section className="bg-paper py-96 text-center">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink">This is how it stays honest</h2>
          <p className="text-body font-sohne text-slate mt-16 max-w-[480px] mx-auto">
            What is tested, what is safeguarded by design, and what is still being built —
            stated plainly rather than assumed.
          </p>
          <ButtonLink to="/trust" className="mt-32">See how trust is built in</ButtonLink>
        </div>
      </section>
    </PublicShell>
  );
};

export default HowItWorksPage;
