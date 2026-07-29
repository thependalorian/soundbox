import React from 'react';
import PageHero from '../../components/Public/PageHero';
import ButtonLink from '../../components/ui/ButtonLink';
import PublicShell from '../../components/Public/PublicShell';
import BrowserFrame from '../../components/Public/BrowserFrame';
import QuestionHeading from '../../components/Public/QuestionHeading';
import TitleDetailCardGrid from '../../components/ui/TitleDetailCardGrid';
import {
  ASK_ANYTHING,
  BUSINESS_QUESTIONS,
  OVERSIGHT_CAPABILITIES,
  REGULATOR,
  WHY_THIS_MATTERS,
} from '../../lib/copy/public';
import ImageSlot from '../../components/ui/ImageSlot';
import StatusPill from '../../components/ui/StatusPill';

/**
 * The oversight-facing page: the seven business questions the models
 * answer, and nothing else.
 *
 * Order and wording follow `docs/business-plan.md` §1.7 (itself sourced
 * from `backend/app/services/*.py`), with the copy held in
 * `BUSINESS_QUESTIONS` so page and business plan cannot drift.
 *
 * Regulation clause numbers are deliberately absent: the reader knows
 * their own rulebook better than we do, and quoting section numbers back
 * at them reads as posturing. Describe what the system can answer; let
 * them map it to their obligations.
 *
 * **Every section carries a visual that illustrates its own question** —
 * a product artifact showing that measure, not a generic screenshot. A
 * frame of coverage data under a question about value distribution would
 * be decoration; the whole argument of this page is that the numbers
 * exist, so each one has to show the number it claims.
 *
 * One action: sign in, in the closing section only.
 */

const CONCENTRATION = [
  { l: 'Top 3 businesses', v: '58% of value' },
  { l: 'Top 10 businesses', v: '81% of value' },
  { l: 'Concentration index (merchant)', v: '1,840' },
];

/** Q3. Median against mean is the point: an average alone hides the shape. */
const ADOPTION = [
  { l: 'Median payment', v: 'N$85' },
  { l: 'Mean payment', v: 'N$210' },
  { l: 'Wallet-funded share', v: '63%' },
  { l: 'Acceptance points per 10,000 adults', v: '4.2' },
  { l: 'Still trading after three months', v: '71%' },
];

/** Q4. Paying out far more than is taken in is the failure mode — the
 *  agent runs dry, and the map still shows a covered town. */
const AGENT_FLOAT = [
  { site: 'Rundu Mobile Agent', flow: 'N$18,400 out · N$4,200 in', state: 'Draining', tone: 'danger' as const },
  { site: 'Katima Mulilo Agent', flow: 'N$12,600 out · N$11,900 in', state: 'Watch', tone: 'warning' as const },
  { site: 'Oshakati Cash Agent', flow: 'N$9,100 out · N$8,700 in', state: 'Balanced', tone: 'success' as const },
];

const FORECAST = [
  { l: 'This week', v: '2,180 – 2,340 payments' },
  { l: 'Next week', v: '2,260 – 2,430 payments' },
  { l: 'Month-end week', v: '2,890 – 3,120 payments' },
];

const ForRegulatorsPage: React.FC = () => (
  <PublicShell>
    <PageHero tone="oversight" title={REGULATOR.heroHeading} lead={REGULATOR.heroSupport} />

    {/* 1 — Anomaly scoring. The page's one emphasis band, and it leads:
        the most concrete thing the platform does for oversight. */}
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
            <QuestionHeading
              tone="onGradient"
              label={BUSINESS_QUESTIONS.alerts.label}
              question={BUSINESS_QUESTIONS.alerts.question}
            />
            <p className="text-body font-sohne text-paper opacity-90 mt-16">
              Every alert states what triggered it, in the business&apos;s own numbers. Nobody has
              to take a score on faith, and an analyst can disagree with it on the spot.
            </p>
            <p className="text-body font-sohne text-paper opacity-90 mt-16">
              Alerts are ordered by how much money is actually exposed, not by how confident the
              system feels. A likely problem on a large amount matters more than a near-certain
              one on a small amount.
            </p>
            <p className="text-body font-sohne text-paper opacity-90 mt-16">
              Every score carries the exact settings that produced it, so a score from before a
              threshold changed is never quietly compared against one from after.
            </p>
            <p className="text-body font-sohne text-paper opacity-90 mt-16">
              An alert counts a payment someone was asked to examine — never a confirmed case,
              and the two are never reported as one number. Only a reviewer&apos;s verdict makes
              it a finding, and those verdicts accumulate into something that does not exist yet:
              a record of what was actually fraud, rather than what merely looked unusual.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* 2 — Market concentration. */}
    <section className="bg-paper py-96">
      <div className="max-w-content mx-auto px-24">
        <QuestionHeading
          label={BUSINESS_QUESTIONS.concentration.label}
          question={BUSINESS_QUESTIONS.concentration.question}
        />
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
          A network that depends on three merchants for half its volume is a systemic risk the
          moment one of them has a bad month. Concentration is measured with the same index
          competition regulators already use elsewhere, split by both merchant and region — a
          network can look healthy nationally while depending dangerously on a single town.
        </p>
        <div className="mt-40 max-w-[480px]">
          <BrowserFrame label="Market concentration">
            <div className="space-y-8 mt-20 pt-20 border-t border-mist">
              {CONCENTRATION.map((r) => (
                <div key={r.l} className="flex items-baseline justify-between gap-16">
                  <span className="text-caption font-sohne text-ink">{r.l}</span>
                  <span className="text-caption font-sohne text-ash tabular-nums">{r.v}</span>
                </div>
              ))}
              <p className="text-caption font-sohne text-ash pt-12 border-t border-mist">
                Under 1,500 is unconcentrated; over 2,500 is highly concentrated.
              </p>
            </div>
          </BrowserFrame>
        </div>
      </div>
    </section>

    {/* 3 — Distribution, inclusion, retention. The frame carries all three
        measures the question names: median against mean (distribution),
        wallet share and reach per population (inclusion), and whether a
        business is still trading months later (retention). */}
    <section className="bg-blush py-96">
      <div className="max-w-content mx-auto px-24">
        <QuestionHeading
          label={BUSINESS_QUESTIONS.adoption.label}
          question={BUSINESS_QUESTIONS.adoption.question}
        />
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
          An average transaction size across a market stall and a fuel station describes neither.
          Reach is counted against real census population rather than a number we chose, and a
          business onboarded three months ago only counts if it is still trading — a network that
          signs up fast and loses businesses just as fast is not growing.
        </p>
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
          Growth is reported by region, by constituency and by kind of business, never as one
          national figure. A country-wide total can climb while the businesses this exists to
          reach stay exactly where they were — an average is where exclusion goes to hide.
        </p>
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
          Every ratio arrives with the count behind it. A rate over eleven payments is arithmetic
          and a rate over eleven thousand is evidence, so the figure says which it is — and where
          the base is too thin to carry a ratio at all, that is the answer rather than a number
          that looks like every other number.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-64 items-start mt-40">
          <BrowserFrame label="Value, inclusion and retention">
            <div className="space-y-8 mt-20 pt-20 border-t border-mist">
              {ADOPTION.map((r) => (
                <div key={r.l} className="flex items-baseline justify-between gap-16">
                  <span className="text-caption font-sohne text-ink">{r.l}</span>
                  <span className="text-caption font-sohne text-ash tabular-nums">{r.v}</span>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-16 pt-12 border-t border-mist">
                <span className="text-caption font-sohne text-ink">Regions with no activity</span>
                <span className="text-caption font-sohne text-status-warning tabular-nums">
                  1 of 14
                </span>
              </div>
              <p className="text-caption font-sohne text-ash pt-12">
                The mean sits well above the median: a few large payments, many small ones.
              </p>
            </div>
          </BrowserFrame>
          <ImageSlot
            ratio="4:3"
            slot="Coverage gap"
            brief="A quiet rural constituency with a single active device — a place being reached, not one that's empty."
            direction="A real small-town street or stall, not a stock photo of 'rural Africa'. The point is under-served, not undeveloped."
          />
        </div>
        <TitleDetailCardGrid
          items={[OVERSIGHT_CAPABILITIES[3], OVERSIGHT_CAPABILITIES[4]]}
          gridClassName="grid grid-cols-1 md:grid-cols-2 gap-16 mt-40"
          cardVariant="neutral"
          titleClassName="text-body font-sohne font-450 text-ink"
        />
      </div>
    </section>

    {/* 4 — Agent float risk. Previously carried only a photograph, which
        showed an agent but not the failure. The frame is the point: cash
        out against cash in, per agent, with the one running dry marked. */}
    <section className="bg-paper py-96">
      <div className="max-w-content mx-auto px-24">
        <QuestionHeading
          label={BUSINESS_QUESTIONS.agentFloat.label}
          question={BUSINESS_QUESTIONS.agentFloat.question}
        />
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
          An agent paying out more than they take in eventually has nothing left to pay with —
          and on a coverage map, that looks identical to a place that was never reached at all.
          Cash agents are the most useful service in a rural town and the easiest to misuse,
          which is why most alerts come from that one segment.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-64 items-start mt-40">
          <BrowserFrame label="Net cash position at agents — last 7 days">
            <div className="space-y-16">
              {AGENT_FLOAT.map((a) => (
                <div key={a.site} className="flex items-baseline justify-between gap-16">
                  <div className="min-w-0">
                    <p className="text-caption font-sohne text-ink">{a.site}</p>
                    <p className="text-caption font-sohne text-ash tabular-nums mt-4">{a.flow}</p>
                  </div>
                  <StatusPill label={a.state} tone={a.tone} />
                </div>
              ))}
              <p className="text-caption font-sohne text-ash pt-12 border-t border-mist">
                Draining means the till is being emptied faster than it is refilled.
              </p>
            </div>
          </BrowserFrame>
          <ImageSlot
            ratio="4:3"
            slot="Cash agent counter"
            brief="A cash agent counting notes across a counter after a wallet withdrawal."
            direction="A real agent kiosk in a town, not a bank branch. Hands and cash in focus; faces optional and only with consent."
          />
        </div>
      </div>
    </section>

    {/* 5 — Forecasting, with the fraud-exclusion reasoning stated directly
        rather than left implied. */}
    <section className="bg-blush py-96">
      <div className="max-w-content mx-auto px-24">
        <QuestionHeading
          label={BUSINESS_QUESTIONS.forecasting.label}
          question={BUSINESS_QUESTIONS.forecasting.question}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-64 items-center mt-40">
          <div>
            <p className="text-body font-sohne text-slate">
              Expected volume and value, with the weekly pattern shown separately so it can be
              argued with. The range widens the further out it looks, because uncertainty does
              too.
            </p>
            <p className="text-body font-sohne text-slate mt-16">
              Fraud is deliberately left out: a pattern can be forecast, but someone actively
              trying to beat detection cannot — a number for that would only measure how well
              they are succeeding.
            </p>
            <p className="text-body font-sohne text-slate mt-16">
              Under four weeks of trading it returns no forecast at all. A projection built on
              three weeks looks exactly like one built on three years, and the reader cannot tell
              them apart unless we refuse to draw it.
            </p>
          </div>
          <BrowserFrame label="Expected — next 4 weeks">
            <div className="space-y-8 mt-20 pt-20 border-t border-mist">
              {FORECAST.map((r) => (
                <div key={r.l} className="flex items-baseline justify-between gap-16">
                  <span className="text-caption font-sohne text-ink">{r.l}</span>
                  <span className="text-caption font-sohne text-ash tabular-nums">{r.v}</span>
                </div>
              ))}
            </div>
          </BrowserFrame>
        </div>
      </div>
    </section>

    {/* 6 — Regulatory reporting. */}
    <section className="bg-paper py-96">
      <div className="max-w-content mx-auto px-24">
        <QuestionHeading
          label={BUSINESS_QUESTIONS.returns.label}
          question={BUSINESS_QUESTIONS.returns.question}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-64 items-center mt-40">
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
      </div>
    </section>

    {/* 7 — Natural-language analytics. */}
    <section className="bg-blush py-96">
      <div className="max-w-content mx-auto px-24">
        <QuestionHeading
          label={BUSINESS_QUESTIONS.ask.label}
          question={BUSINESS_QUESTIONS.ask.question}
        />
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">{ASK_ANYTHING.body[0]}</p>
        <div className="mt-40 max-w-[560px]">
          <BrowserFrame label="Ask — live query">
            <div className="space-y-16">
              <div>
                <p className="text-caption font-sohne text-ash">Question</p>
                <p className="text-body font-sohne text-ink mt-4">{ASK_ANYTHING.example.question}</p>
              </div>
              <div className="pt-12 border-t border-mist">
                <p className="text-caption font-sohne text-ash">Answer</p>
                <p className="text-body font-sohne text-ink mt-4">{ASK_ANYTHING.example.answer}</p>
              </div>
            </div>
          </BrowserFrame>
        </div>
        <p className="text-body font-sohne text-slate mt-40 max-w-[620px]">{ASK_ANYTHING.body[1]}</p>
      </div>
    </section>

    {/* Why this matters — the synthesis. Placed after the seven questions,
        not before: a reader who has just seen seven working measures is
        ready for the argument about what they are for. */}
    <section className="bg-paper py-96">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink max-w-[680px]">
          {WHY_THIS_MATTERS.heading}
        </h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[680px]">
          {WHY_THIS_MATTERS.lead}
        </p>
        <TitleDetailCardGrid
          items={WHY_THIS_MATTERS.points}
          gridClassName="grid grid-cols-1 md:grid-cols-3 gap-16 mt-40"
          cardVariant="elevated"
          titleClassName="text-body font-sohne font-450 text-ink"
        />
      </div>
    </section>

    {/* Closing — the page's one action. The list mirrors the seven
        questions above, in the same order. */}
    <section className="bg-blush py-96 text-center">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink">Open the oversight view</h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[560px] mx-auto">
          Which alerts to review first, where the risk concentrates, who adoption still misses,
          whether agents are running dry, what next month looks like, whether the returns
          reconcile — and a direct line to ask anything else. All from the same record the
          dashboards read.
        </p>
        <ButtonLink to="/login?as=regulator" className="mt-32">Sign in for oversight</ButtonLink>
      </div>
    </section>
  </PublicShell>
);

export default ForRegulatorsPage;
