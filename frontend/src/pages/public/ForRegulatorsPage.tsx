import React from 'react';
import PageHero from '../../components/Public/PageHero';
import ButtonLink from '../../components/ui/ButtonLink';
import PublicShell from '../../components/Public/PublicShell';
import BrowserFrame from '../../components/Public/BrowserFrame';
import Card from '../../components/ui/Card';
import Meter from '../../components/ui/Meter';
import Roadmap from '../../components/Public/Roadmap';
import { OVERSIGHT_CAPABILITIES, REGULATOR } from '../../lib/copy/public';
import ImageSlot from '../../components/ui/ImageSlot';
import StatusPill from '../../components/ui/StatusPill';

/**
 * The oversight-facing page.
 *
 * Same substance as the internal compliance work, but stated in plain
 * terms. Regulation clause numbers are deliberately absent: the reader
 * knows their own rulebook better than we do, and quoting section numbers
 * back at them reads as posturing. Describe what the system can answer;
 * let them map it to their obligations.
 *
 * Nine sections, one action: sign in, in the closing section only.
 */

const COVERAGE = [
  { region: 'Khomas', merchants: 5, share: 100 },
  { region: 'Oshana', merchants: 3, share: 62 },
  { region: 'Erongo', merchants: 3, share: 55 },
  { region: 'Kavango East', merchants: 2, share: 38 },
  { region: 'Kavango West', merchants: 0, share: 0 },
];

const QUESTIONS = [
  'Which regions are being left behind as the country moves off cash?',
  'Where is unusual activity concentrating, and in which kind of business?',
  'Is a single operator carrying too much of one region’s volume?',
  'Did last month’s totals reconcile, and can we show our working?',
];

const DEVICE_FLEET = [
  { code: 'SB-0142', site: 'Katutura Fresh Market', state: 'Online', tone: 'success' as const, battery: 87, seen: '2 min ago' },
  { code: 'SB-0198', site: 'Oshakati Cash Agent', state: 'Online', tone: 'success' as const, battery: 64, seen: '5 min ago' },
  { code: 'SB-0211', site: 'Rundu Mobile Agent', state: 'Silent', tone: 'warning' as const, battery: 12, seen: '4 hours ago' },
];

const NEXT_STAGES = [
  {
    phase: 'live' as const,
    title: 'Coverage and explainable alerts',
    detail:
      'Activity down to constituency level, alerts that state their reasons, and returns produced from the same record the dashboards read.',
  },
  {
    phase: 'live' as const,
    title: 'Market structure and behavioural segments',
    detail:
      'Concentration by business and by region, reach measured against census population, and businesses grouped by how they actually trade rather than by a category entered at sign-up.',
  },
  {
    phase: 'building' as const,
    title: 'Comparison against the right peers',
    detail:
      'Feeding those behavioural groups back into the scoring, so a market stall is judged against other market stalls rather than against every business in the region.',
  },
  {
    phase: 'planned' as const,
    title: 'Published detection accuracy',
    detail:
      'Once enough alerts have been confirmed or dismissed by reviewers, we can report how often the system is right — measured, not asserted.',
  },
];

const ForRegulatorsPage: React.FC = () => (
  <PublicShell>
    <PageHero tone="oversight" title={REGULATOR.heroHeading} lead={REGULATOR.heroSupport} />

    {/* What this is, and is not. Placed before anything else a regulator
        reads: the first question oversight asks of a new participant is
        what it can do to the money, and the answer here is nothing. */}
    <section className="bg-paper py-96">
      <div className="max-w-content mx-auto px-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-24 max-w-[900px] mx-auto">
          <Card variant="neutral" className="p-32">
            <p className="text-caption font-sohne text-ash">What it does</p>
            <ul className="mt-16 space-y-12">
              {[
                'Listens for payments already completed on the national instant payment rails',
                'Announces them out loud so the seller knows the money arrived',
                'Keeps a record of what it heard, and where',
                'Flags unusual patterns for a person to review afterwards',
              ].map((x) => (
                <li key={x} className="text-body font-sohne text-ink">
                  {x}
                </li>
              ))}
            </ul>
          </Card>
          <Card variant="accent" className="p-32">
            <p className="text-caption font-sohne">What it never touches</p>
            <ul className="mt-16 space-y-12">
              {[
                'Start a payment',
                'Stop, hold or reverse a payment',
                'Touch anyone’s money or hold a balance',
                'Change what WayaMe recorded',
              ].map((x) => (
                <li key={x} className="text-body font-sohne">
                  {x}
                </li>
              ))}
            </ul>
            <p className="text-caption font-sohne mt-16 opacity-80">
              None of these are policies we chose. The system sits beside WayaMe and listens to it.
              There is no path through this software by which money moves.
            </p>
          </Card>
        </div>
      </div>
    </section>

    {/* Coverage, and where the risk concentrates — one argument: a map is
        only useful once you can see both what is empty and what is busy. */}
    <section className="bg-blush py-96">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink max-w-[620px]">
          A region at zero is a finding
        </h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
          National totals hide the places where nothing is happening. Because every device is
          tied to a real location, the map shows activity down to constituency level — and an
          empty region stands out as a result rather than disappearing into an average. That is
          the difference between knowing adoption is growing and knowing where it is not.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-64 items-start mt-40">
          <BrowserFrame label="Coverage by region">
            <div className="space-y-8 mt-20 pt-20 border-t border-mist">
              {COVERAGE.map((r) => (
                <div key={r.region} className="flex items-baseline justify-between gap-16">
                  <span className="text-caption font-sohne text-ink">{r.region}</span>
                  <span
                    className={`text-caption font-sohne tabular-nums ${
                      r.merchants === 0 ? 'text-status-warning' : 'text-ash'
                    }`}
                  >
                    {r.merchants === 0 ? 'no activity' : `${r.merchants} businesses`}
                  </span>
                </div>
              ))}
            </div>
          </BrowserFrame>
          <div>
            <ImageSlot
              ratio="4:3"
              slot="Cash agent counter"
              brief="A cash agent counting notes across a counter after a wallet withdrawal."
              direction="A real agent kiosk in a town, not a bank branch. Hands and cash in focus; faces optional and only with consent."
            />
            <h3 className="text-subheading font-signifier text-ink mt-24">
              Where the risk concentrates
            </h3>
            <p className="text-body font-sohne text-slate mt-8">
              Cash agents turn wallet balances into notes across a counter, with no branch and no
              card. It is the most useful service in a rural town and the easiest to misuse, which
              is why most alerts in this system come from that one segment. Seeing it as a counter
              rather than a category is the difference between a policy discussion and an
              enforcement one.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* Alerts that explain themselves — the page's one emphasis band */}
    <section className="bg-brand-gradient-aa py-128">
      <div className="max-w-content mx-auto px-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-64 items-center">
          <BrowserFrame label="Alert — why it was raised" className="lg:order-2">
            <div className="space-y-16">
              <div className="flex items-baseline justify-between">
                <span className="text-body font-sohne text-ink">Outapi Cash Agent</span>
                <StatusPill label="HIGH" tone="danger" />
              </div>
              {[
                { l: 'Trading pace', d: '27 payments in one hour. This business normally does 3.' },
                { l: 'Payment size', d: 'N$2,583 against a usual average of N$630.' },
                { l: 'Time of day', d: 'Taken at 03:00, outside normal trading hours.' },
              ].map((r) => (
                <div key={r.l}>
                  <p className="text-caption font-sohne text-ink">{r.l}</p>
                  <p className="text-caption font-sohne text-slate mt-4">{r.d}</p>
                </div>
              ))}
              <p className="text-caption font-sohne text-ash pt-12 border-t border-mist">
                Amount at risk: N$2,324.85
              </p>
            </div>
          </BrowserFrame>
          <div className="lg:order-1">
            <h2 className="text-heading font-signifier text-paper">Alerts you can question</h2>
            <p className="text-body font-sohne text-paper opacity-90 mt-16">
              Every alert states what triggered it, in the business&apos;s own numbers. Nobody has
              to take a score on faith, and an analyst can disagree with it on the spot.
            </p>
            <p className="text-body font-sohne text-paper opacity-90 mt-16">
              Alerts are ordered by how much money is actually exposed, not by how confident the
              system feels. A likely problem on a large amount matters more than a near-certain
              one on a small amount.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* Questions it can answer — a single section: what oversight asks, and
        the views that answer it. Two sections previously asked the same
        question in different words; this is the one place that drift
        matters least to leave standing. */}
    <section className="bg-paper py-96">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink max-w-[620px]">
          Questions it can answer
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-40 gap-y-8 mt-24 max-w-[820px]">
          {QUESTIONS.map((q) => (
            <p key={q} className="text-body font-sohne text-ink">
              {q}
            </p>
          ))}
        </div>
        <p className="text-body font-sohne text-slate mt-24 max-w-[620px]">
          Answered from views like these — each a fresh query against the live record, not a
          projection or a survey.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-32">
          {OVERSIGHT_CAPABILITIES.map((c) => (
            <Card key={c.title} variant="neutral" className="p-24">
              <h3 className="text-body font-sohne font-450 text-ink">{c.title}</h3>
              <p className="text-caption font-sohne text-slate mt-8">{c.detail}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>

    {/* Businesses and devices that report on themselves. The former
        "Business record" panel here showed invented beneficial-owner names
        and an identity-verified date on a public page, while the product's
        own promise is that identity documents are never returned to any
        screen — a public page is exactly where that promise has to hold, so
        the panel is cut and its argument kept in prose instead. */}
    <section className="bg-blush py-96">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink max-w-[680px]">
          Businesses and devices that report on themselves
        </h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[680px]">
          A device that goes quiet shows up before the seller has to phone anyone, and an
          ownership question has an answer that can be queried rather than one that has to be
          read from a file.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-64 items-start mt-40">
          <BrowserFrame label="Device fleet">
            <div className="space-y-16">
              {DEVICE_FLEET.map((d) => (
                <div key={d.code}>
                  <div className="flex items-baseline justify-between gap-16">
                    <div className="min-w-0">
                      <p className="text-caption font-sohne text-ink">{d.code}</p>
                      <p className="text-caption font-sohne text-ash truncate">{d.site}</p>
                    </div>
                    <div className="flex items-center gap-8 shrink-0">
                      <span className="text-caption font-sohne text-ash tabular-nums">{d.seen}</span>
                      <StatusPill label={d.state} tone={d.tone} />
                    </div>
                  </div>
                  <Meter className="mt-8" tone={d.battery < 20 ? 'warning' : 'accent'} value={d.battery} label={`${d.code} battery ${d.battery} percent`} />
                </div>
              ))}
            </div>
          </BrowserFrame>
          <div>
            <h3 className="text-subheading font-signifier text-ink">
              Who is actually behind each business
            </h3>
            <p className="text-body font-sohne text-slate mt-8">
              Ownership is captured as structured records against the business, not free text in
              a notes field — so a question about who benefits from an account has an answer that
              can be queried, not one that has to be read.
            </p>
            <p className="text-body font-sohne text-slate mt-16">
              Every review decision is appended to the business&apos;s history with who made it
              and when, so an approval remains reconstructable years later. An owner&apos;s
              identity documents are checked once and never returned to any screen — a reviewer
              sees that the check was done, not the number.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* Returns, alignment with the national strategy, and what comes next —
        one argument: the numbers you already require, why they map to the
        strategy, and the order in which the rest is being built. */}
    <section className="bg-paper py-96">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink max-w-[620px]">
          Returns that show their working
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-64 items-center mt-24">
          <p className="text-body font-sohne text-slate">
            The monthly submissions you already require are produced from the same record the
            dashboards read, so the figure in a report and the figure on a screen cannot
            disagree. Each pack runs its own checks before it is issued, and says plainly if one
            fails.
          </p>
          <BrowserFrame label="Monthly return — March 2026">
            <div className="space-y-12">
              {[
                { l: 'Payments to businesses', v: '18,442' },
                { l: 'Value', v: 'N$4,118,203.55' },
                { l: 'Difference against settlement', v: 'N$0.00' },
              ].map((r) => (
                <div key={r.l} className="flex items-baseline justify-between">
                  <span className="text-caption font-sohne text-slate">{r.l}</span>
                  <span className="text-caption font-sohne text-ink tabular-nums">{r.v}</span>
                </div>
              ))}
              <p className="text-caption font-sohne text-status-success pt-12 border-t border-mist">
                All checks passed
              </p>
            </div>
          </BrowserFrame>
        </div>

        <div className="mt-64 pt-64 border-t border-mist">
          <h3 className="text-subheading font-signifier text-ink max-w-[620px]">
            {REGULATOR.alignmentHeading}
          </h3>
          <p className="text-body font-sohne text-slate mt-16 max-w-prose">
            {REGULATOR.alignmentBody}
          </p>
          <div className="mt-32 max-w-[760px]">
            <ImageSlot
              ratio="16:9"
              slot="Strategy alignment diagram"
              brief="A simple mapping of national payment strategy outcomes to the measures this platform produces, with the gaps shown as gaps."
              direction="Two columns, strategy outcomes on the left and measures on the right, connected only where a real link exists. Outcomes with no line are left visibly unconnected rather than omitted — the honesty of the diagram is the point."
            />
          </div>
        </div>

        <div className="mt-64 pt-64 border-t border-mist">
          <h3 className="text-subheading font-signifier text-ink max-w-[560px]">What comes next</h3>
          <p className="text-body font-sohne text-slate mt-16 max-w-[600px]">
            The sequence matters: each stage needs the one before it to have been running long
            enough to be worth trusting.
          </p>
          <Roadmap className="mt-32" items={NEXT_STAGES.map((r) => ({ ...r }))} />
        </div>
      </div>
    </section>

    {/* Safeguards — these are strengths, not caveats, so they read as such. */}
    <section className="bg-blush py-96">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink max-w-[560px]">Safeguards by design</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mt-40">
          {[
            {
              t: 'It cannot deny anyone their money',
              d: 'Because it sits outside the payment path, no fault here can hold or refuse a payment. A scoring error costs an analyst five minutes, never a seller their sale.',
            },
            {
              t: 'Rural sellers are judged fairly',
              d: 'Each business is compared with others nearby rather than with the capital, so a small trader is never flagged simply for being small.',
            },
            {
              t: 'A person always decides',
              d: 'Alerts are raised for review after the fact. Nothing acts on a business automatically.',
            },
          ].map((c) => (
            <Card key={c.t} variant="elevated" className="p-24">
              <h3 className="text-body font-sohne font-450 text-ink">{c.t}</h3>
              <p className="text-caption font-sohne text-slate mt-8">{c.d}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>

    {/* Closing — the page's one action */}
    <section className="bg-paper py-96 text-center">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink">Open the oversight view</h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[500px] mx-auto">
          Coverage down to constituency level, market structure, and the monthly returns —
          produced from the same record the dashboards read.
        </p>
        <ButtonLink to="/login?as=regulator" className="mt-32">Sign in for oversight</ButtonLink>
      </div>
    </section>
  </PublicShell>
);

export default ForRegulatorsPage;
