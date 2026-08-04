import React from 'react';
import PageHero from '../../components/Public/PageHero';
import ButtonLink from '../../components/ui/ButtonLink';
import PublicShell from '../../components/Public/PublicShell';
import RequestAccess from '../../components/Public/RequestAccess';
import BrowserFrame from '../../components/Public/BrowserFrame';
import QuestionHeading from '../../components/Public/QuestionHeading';
import TitleDetailCardGrid from '../../components/ui/TitleDetailCardGrid';
import {
  ASK_ANYTHING,
  BUSINESS_QUESTIONS,
  PLATFORM_ANSWERS,
  PRECEDENT,
  OVERSIGHT_CAPABILITIES,
  REGULATOR,
  WHY_THIS_MATTERS,
} from '../../lib/copy/public';
import NamibiaMap from '../../components/illustration/NamibiaMap';
import FeatureImportance from '../../components/illustration/FeatureImportance';
import AssistantExchange from '../../components/illustration/AssistantExchange';
import {
  ConcentrationCurve, ReconciliationBars, ScoreScatter, ShareBars, TrendChart,
} from '../../components/charts/primitives';
import Figure from '../../components/charts/Figure';
import PhaseLadder from '../../components/illustration/PhaseLadder';
import Reveal from '../../components/ui/Reveal';
import StatusPill from '../../components/ui/StatusPill';

/**
 * The oversight-facing page: the business questions the models answer,
 * and nothing else.
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
          <Reveal>
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
          </Reveal>
          <div className="lg:order-1">
            <QuestionHeading
              tone="onGradient"
              label={BUSINESS_QUESTIONS.alerts.label}
              question={BUSINESS_QUESTIONS.alerts.question}
            />
        {/* Where the flagged payments actually sit. A queue described in
            prose is a list; plotted against value, the reason for ranking by
            exposure rather than score becomes visible in one look. */}
        <div className="mt-40 rounded-shell bg-paper/10 p-6">
          <div className="rounded-shellInner bg-paper/[0.06] p-8">
            <Figure label="anomaly_score × value" source="generated data, n=219">
            <ScoreScatter points={[{ x: 339.9, y: 0.195 }, { x: 565.0, y: 0.185 }, { x: 104.0, y: 0.334 }, { x: 116.6, y: 0.247 }, { x: 436.2, y: 0.276 }, { x: 702.6, y: 0.275 }, { x: 622.2, y: 0.254 }, { x: 186.0, y: 0.215 }, { x: 326.3, y: 0.281 }, { x: 722.9, y: 0.352 }, { x: 580.8, y: 0.29 }, { x: 804.4, y: 0.247 }, { x: 331.3, y: 0.131 }, { x: 1134.7, y: 0.247 }, { x: 270.8, y: 0.01 }, { x: 921.9, y: 0.185 }, { x: 429.7, y: 0.294 }, { x: 82.0, y: 0.324 }, { x: 1026.5, y: 0.288 }, { x: 837.3, y: 0.153 }, { x: 626.4, y: 0.362 }, { x: 489.8, y: 0.01 }, { x: 106.9, y: 0.011 }, { x: 397.6, y: 0.01 }, { x: 59.0, y: 0.247 }, { x: 105.1, y: 0.268 }, { x: 172.9, y: 0.047 }, { x: 127.5, y: 0.361 }, { x: 583.1, y: 0.313 }, { x: 300.1, y: 0.021 }, { x: 371.9, y: 0.281 }, { x: 213.5, y: 0.203 }, { x: 261.7, y: 0.147 }, { x: 21.8, y: 0.174 }, { x: 381.7, y: 0.381 }, { x: 538.9, y: 0.171 }, { x: 1595.2, y: 0.133 }, { x: 149.5, y: 0.289 }, { x: 240.9, y: 0.201 }, { x: 147.6, y: 0.251 }, { x: 63.5, y: 0.173 }, { x: 277.7, y: 0.179 }, { x: 376.9, y: 0.422 }, { x: 480.7, y: 0.01 }, { x: 132.7, y: 0.173 }, { x: 59.8, y: 0.292 }, { x: 555.1, y: 0.195 }, { x: 554.9, y: 0.213 }, { x: 1507.2, y: 0.213 }, { x: 205.7, y: 0.325 }, { x: 560.7, y: 0.182 }, { x: 1207.9, y: 0.289 }, { x: 1432.7, y: 0.295 }, { x: 256.1, y: 0.056 }, { x: 368.9, y: 0.308 }, { x: 283.6, y: 0.236 }, { x: 2471.6, y: 0.321 }, { x: 250.8, y: 0.191 }, { x: 230.8, y: 0.052 }, { x: 749.0, y: 0.054 }, { x: 131.7, y: 0.382 }, { x: 981.0, y: 0.117 }, { x: 215.4, y: 0.122 }, { x: 412.8, y: 0.392 }, { x: 909.5, y: 0.264 }, { x: 187.7, y: 0.265 }, { x: 364.1, y: 0.233 }, { x: 553.0, y: 0.234 }, { x: 445.9, y: 0.255 }, { x: 277.3, y: 0.153 }, { x: 267.7, y: 0.213 }, { x: 174.5, y: 0.334 }, { x: 367.2, y: 0.014 }, { x: 432.2, y: 0.101 }, { x: 522.0, y: 0.199 }, { x: 452.5, y: 0.217 }, { x: 21.3, y: 0.278 }, { x: 910.6, y: 0.33 }, { x: 341.9, y: 0.039 }, { x: 151.9, y: 0.154 }, { x: 274.5, y: 0.238 }, { x: 600.1, y: 0.09 }, { x: 677.4, y: 0.052 }, { x: 465.7, y: 0.207 }, { x: 494.3, y: 0.149 }, { x: 597.0, y: 0.01 }, { x: 166.1, y: 0.293 }, { x: 120.0, y: 0.256 }, { x: 1094.3, y: 0.319 }, { x: 763.1, y: 0.364 }, { x: 1668.7, y: 0.272 }, { x: 409.7, y: 0.487 }, { x: 200.9, y: 0.12 }, { x: 230.0, y: 0.21 }, { x: 589.4, y: 0.318 }, { x: 696.5, y: 0.231 }, { x: 110.8, y: 0.29 }, { x: 150.7, y: 0.01 }, { x: 82.5, y: 0.213 }, { x: 433.9, y: 0.277 }, { x: 190.5, y: 0.066 }, { x: 821.3, y: 0.147 }, { x: 119.3, y: 0.089 }, { x: 130.6, y: 0.072 }, { x: 113.3, y: 0.124 }, { x: 588.1, y: 0.249 }, { x: 291.0, y: 0.14 }, { x: 155.0, y: 0.206 }, { x: 95.4, y: 0.184 }, { x: 1010.0, y: 0.307 }, { x: 520.1, y: 0.208 }, { x: 931.8, y: 0.237 }, { x: 224.7, y: 0.268 }, { x: 1242.7, y: 0.199 }, { x: 514.0, y: 0.118 }, { x: 820.3, y: 0.301 }, { x: 357.0, y: 0.178 }, { x: 416.1, y: 0.069 }, { x: 100.0, y: 0.383 }, { x: 280.5, y: 0.298 }, { x: 131.4, y: 0.333 }, { x: 303.1, y: 0.101 }, { x: 312.8, y: 0.286 }, { x: 287.0, y: 0.32 }, { x: 271.1, y: 0.182 }, { x: 490.4, y: 0.316 }, { x: 234.4, y: 0.306 }, { x: 136.5, y: 0.223 }, { x: 322.6, y: 0.104 }, { x: 982.2, y: 0.151 }, { x: 886.9, y: 0.145 }, { x: 907.8, y: 0.283 }, { x: 87.7, y: 0.34 }, { x: 933.9, y: 0.123 }, { x: 181.7, y: 0.011 }, { x: 1177.6, y: 0.214 }, { x: 632.6, y: 0.151 }, { x: 176.3, y: 0.066 }, { x: 150.8, y: 0.076 }, { x: 700.5, y: 0.164 }, { x: 507.3, y: 0.274 }, { x: 523.6, y: 0.045 }, { x: 761.3, y: 0.213 }, { x: 121.4, y: 0.136 }, { x: 921.6, y: 0.201 }, { x: 512.8, y: 0.01 }, { x: 495.4, y: 0.236 }, { x: 729.9, y: 0.068 }, { x: 188.8, y: 0.216 }, { x: 608.7, y: 0.126 }, { x: 106.9, y: 0.141 }, { x: 794.5, y: 0.071 }, { x: 540.2, y: 0.166 }, { x: 50.8, y: 0.232 }, { x: 1247.5, y: 0.137 }, { x: 241.8, y: 0.247 }, { x: 242.6, y: 0.304 }, { x: 1249.1, y: 0.324 }, { x: 260.0, y: 0.195 }, { x: 20.2, y: 0.222 }, { x: 463.9, y: 0.284 }, { x: 333.0, y: 0.298 }, { x: 13.3, y: 0.25 }, { x: 384.5, y: 0.173 }, { x: 373.7, y: 0.215 }, { x: 147.8, y: 0.254 }, { x: 306.3, y: 0.22 }, { x: 533.3, y: 0.306 }, { x: 385.6, y: 0.37 }, { x: 708.6, y: 0.086 }, { x: 929.8, y: 0.223 }, { x: 306.8, y: 0.062 }, { x: 487.6, y: 0.167 }, { x: 754.8, y: 0.392 }, { x: 593.9, y: 0.252 }, { x: 240.2, y: 0.277 }, { x: 516.5, y: 0.527 }, { x: 463.1, y: 0.015 }, { x: 227.2, y: 0.194 }, { x: 266.5, y: 0.26 }, { x: 611.3, y: 0.22 }, { x: 425.4, y: 0.106 }, { x: 389.0, y: 0.302 }, { x: 524.1, y: 0.254 }, { x: 293.7, y: 0.123 }, { x: 73.0, y: 0.29 }, { x: 403.1, y: 0.319 }, { x: 154.6, y: 0.028 }, { x: 547.6, y: 0.384 }, { x: 738.4, y: 0.157 }, { x: 471.1, y: 0.406 }, { x: 261.0, y: 0.267 }, { x: 735.0, y: 0.278 }, { x: 718.2, y: 0.28 }, { x: 550.2, y: 0.16 }, { x: 320.2, y: 0.271 }, { x: 262.9, y: 0.387 }, { x: 518.0, y: 0.178 }, { x: 431.6, y: 0.096 }, { x: 352.8, y: 0.01 }, { x: 809.0, y: 0.273 }, { x: 525.9, y: 0.047 }, { x: 251.6, y: 0.144 }, { x: 514.9, y: 0.48 }, { x: 253.2, y: 0.084 }, { x: 187.9, y: 0.01 }, { x: 244.5, y: 0.243 }, { x: 106.3, y: 0.248 }, { x: 1827.6, y: 0.179 }, { x: 221.3, y: 0.01 }, { x: 7173.4, y: 0.63, flagged: true }, { x: 6583.9, y: 0.737, flagged: true }, { x: 4492.0, y: 0.723, flagged: true }, { x: 3018.7, y: 0.621, flagged: true }, { x: 3814.6, y: 0.729, flagged: true }, { x: 8679.7, y: 0.658, flagged: true }, { x: 8742.8, y: 0.684, flagged: true }, { x: 4367.7, y: 0.875, flagged: true }, { x: 7718.5, y: 0.754, flagged: true }]} threshold={0.6} />
            </Figure>
          </div>
        </div>
            <p className="text-body font-sohne text-paper opacity-90 mt-16">
              {PLATFORM_ANSWERS.alerts}
            </p>
            <p className="text-body font-sohne text-paper opacity-90 mt-16">
              Every alert states what triggered it, in that participant&apos;s own numbers. Nobody
              has to take a score on faith, and an analyst can disagree with it on the spot.
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

    {/* What the model leans on. The ranking is the evidence behind the data
        request: counterparty timing beats amount, and counterparty timing
        needs an identifier on both sides of a payment. */}
    <section className="bg-paper py-96">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink max-w-[620px]">
          What the model actually leans on
        </h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-prose">
          Every score resolves into the features that produced it. Ranked across a whole run,
          those features say something a supervisor can act on — and something we can be held to
          when asking for data.
        </p>
        <Reveal>
          <FeatureImportance className="mt-40" />
        </Reveal>
      </div>
    </section>

    {/* 2 — Market concentration. */}
    <section className="bg-blush py-96">
      <div className="max-w-content mx-auto px-24">
        <QuestionHeading
          label={BUSINESS_QUESTIONS.concentration.label}
          question={BUSINESS_QUESTIONS.concentration.question}
        />
        <Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-40 items-center mt-40">
            <Figure label="cumulative_value_share" source="generated data, 120 days">
              <ConcentrationCurve cumulative={[0, 24, 39, 51, 61, 70, 78, 85, 91, 96, 100]} />
            </Figure>
            <div>
              <p className="text-body font-sohne text-slate max-w-prose">
                The dashed diagonal is what a perfectly even network would draw. The gap between
                it and the curve is the concentration — and it is the same measure a competition
                authority already uses, which is why it needs no explaining in a meeting.
              </p>
              <ShareBars
                className="mt-24"
                data={[
                  { label: 'Top 3 participants', value: 24 },
                  { label: 'Top 10 participants', value: 39 },
                  { label: 'Everyone else', value: 61 },
                ]}
              />
            </div>
          </div>
        </Reveal>
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
          {PLATFORM_ANSWERS.concentration}
        </p>
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
          A network that depends on three participants for half its volume is a systemic risk the
          moment one of them has a bad month. It is split by participant, by constituency and by
          region — a network can look healthy nationally while depending dangerously on a single
          town.
        </p>
        <div className="mt-40 max-w-[480px]">
          <Reveal>
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
          </Reveal>
        </div>
      </div>
    </section>

    {/* 3 — Distribution, inclusion, retention. The frame carries all three
        measures the question names: median against mean (distribution),
        wallet share and reach per population (inclusion), and whether a
        business is still trading months later (retention). */}
    <section className="bg-paper py-96">
      <div className="max-w-content mx-auto px-24">
        <QuestionHeading
          label={BUSINESS_QUESTIONS.adoption.label}
          question={BUSINESS_QUESTIONS.adoption.question}
        />
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
          {PLATFORM_ANSWERS.adoption}
        </p>
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
          {PLATFORM_ANSWERS.cash}
        </p>
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
          An average transaction size across a market stall and a fuel station describes neither.
          Reach is counted against real census population rather than a number we chose, and a
          participant onboarded three months ago only counts if it is still transacting — a
          network that signs up fast and loses people just as fast is not growing.
        </p>
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
          Growth is reported by region, by constituency and by kind of participant, never as one
          national figure. A country-wide total can climb while the people this exists to reach
          stay exactly where they were — an average is where exclusion goes to hide.
        </p>
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
          Every ratio arrives with the count behind it. A rate over eleven payments is arithmetic
          and a rate over eleven thousand is evidence, so the figure says which it is — and where
          the base is too thin to carry a ratio at all, that is the answer rather than a number
          that looks like every other number.
        </p>
        <div className="grid grid-cols-1 gap-64 items-start mt-40">
          <Reveal>
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
          </Reveal>
          <NamibiaMap
            values={{
              khomas: 0.95, erongo: 0.72, oshana: 0.68, otjozondjupa: 0.5,
              omusati: 0.42, ohangwena: 0.4, oshikoto: 0.32, kavango_east: 0.3,
              hardap: 0.2, karas: 0.18, zambezi: 0.16, kunene: 0.14,
              omaheke: 0.08, kavango_west: null,
            }}
              details={{
                khomas: { constituencies: 10, constituenciesReached: 7, share: '31%',
                  useCases: [{ label: 'Person to business', value: 46 }, { label: 'Person to person', value: 19 }, { label: 'Business to business', value: 12 }, { label: 'Cash out at an agent', value: 10 }, { label: 'Government to person', value: 7 }, { label: 'Other', value: 6 }],
                  trend: [188, 191, 195, 203, 286, 294, 126, 206, 215, 216, 218, 286, 283, 124, 204, 202, 204, 208, 275, 265, 115, 195, 196, 205, 207, 289, 296, 133] },
                erongo: { constituencies: 7, constituenciesReached: 5, share: '14%',
                  useCases: [{ label: 'Person to business', value: 44 }, { label: 'Cash out at an agent', value: 17 }, { label: 'Person to person', value: 16 }, { label: 'Business to person', value: 11 }, { label: 'Government to person', value: 7 }, { label: 'Other', value: 5 }],
                  trend: [143, 139, 143, 142, 201, 197, 89, 149, 157, 163, 160, 209, 211, 91, 155, 162, 169, 167, 221, 219, 97, 156, 153, 148, 155, 204, 212, 96] },
                oshana: { constituencies: 10, constituenciesReached: 6, share: '11%',
                  useCases: [{ label: 'Person to business', value: 41 }, { label: 'Cash out at an agent', value: 21 }, { label: 'Person to person', value: 17 }, { label: 'Government to person', value: 12 }, { label: 'Other', value: 9 }],
                  trend: [157, 161, 169, 177, 232, 242, 108, 179, 187, 195, 191, 256, 263, 114, 198, 204, 202, 208, 272, 276, 123, 203, 206, 205, 201, 275, 265, 123] },
                otjozondjupa: { constituencies: 7, constituenciesReached: 4, share: '8%',
                  useCases: [{ label: 'Person to business', value: 39 }, { label: 'Person to person', value: 22 }, { label: 'Cash out at an agent', value: 18 }, { label: 'Government to person', value: 12 }, { label: 'Other', value: 9 }],
                  trend: [116, 113, 119, 124, 160, 157, 69, 111, 117, 116, 120, 159, 160, 73, 118, 121, 127, 123, 173, 174, 75, 125, 128, 132, 136, 178, 179, 78] },
                omusati: { constituencies: 12, constituenciesReached: 4, share: '7%',
                  useCases: [{ label: 'Government to person', value: 31 }, { label: 'Cash out at an agent', value: 26 }, { label: 'Person to business', value: 24 }, { label: 'Person to person', value: 13 }, { label: 'Other', value: 6 }],
                  trend: [115, 115, 120, 118, 164, 159, 70, 116, 116, 117, 121, 166, 172, 76, 126, 123, 122, 120, 163, 165, 71, 114, 116, 114, 114, 152, 155, 66] },
                ohangwena: { constituencies: 11, constituenciesReached: 4, share: '6%',
                  useCases: [{ label: 'Government to person', value: 33 }, { label: 'Cash out at an agent', value: 27 }, { label: 'Person to business', value: 22 }, { label: 'Person to person', value: 12 }, { label: 'Other', value: 6 }],
                  trend: [116, 111, 108, 107, 144, 138, 64, 112, 108, 112, 107, 142, 145, 65, 105, 100, 95, 96, 134, 142, 66, 112, 115, 111, 113, 151, 150, 68] },
                oshikoto: { constituencies: 10, constituenciesReached: 3, share: '5%',
                  useCases: [{ label: 'Cash out at an agent', value: 29 }, { label: 'Government to person', value: 27 }, { label: 'Person to business', value: 24 }, { label: 'Person to person', value: 13 }, { label: 'Other', value: 7 }],
                  trend: [95, 92, 94, 91, 118, 116, 50, 84, 82, 80, 81, 115, 116, 52, 87, 90, 90, 92, 130, 128, 59, 96, 94, 98, 98, 132, 139, 62] },
                kavango_east: { constituencies: 6, constituenciesReached: 2, share: '4%',
                  useCases: [{ label: 'Government to person', value: 36 }, { label: 'Cash out at an agent', value: 28 }, { label: 'Person to business', value: 20 }, { label: 'Person to person', value: 11 }, { label: 'Other', value: 5 }],
                  trend: [75, 73, 76, 73, 96, 97, 42, 69, 72, 70, 67, 95, 92, 40, 67, 70, 71, 68, 92, 90, 39, 64, 68, 68, 69, 99, 102, 44] },
                hardap: { constituencies: 6, constituenciesReached: 2, share: '3%',
                  useCases: [{ label: 'Person to business', value: 38 }, { label: 'Person to person', value: 21 }, { label: 'Cash out at an agent', value: 19 }, { label: 'Government to person', value: 14 }, { label: 'Other', value: 8 }],
                  trend: [74, 71, 71, 73, 95, 93, 42, 72, 71, 69, 69, 94, 92, 40, 69, 66, 66, 68, 93, 93, 43, 75, 73, 73, 75, 101, 105, 48] },
                karas: { constituencies: 6, constituenciesReached: 2, share: '3%',
                  useCases: [{ label: 'Person to business', value: 37 }, { label: 'Person to person', value: 22 }, { label: 'Cash out at an agent', value: 18 }, { label: 'Government to person', value: 15 }, { label: 'Other', value: 8 }],
                  trend: [72, 75, 75, 75, 102, 107, 47, 77, 79, 79, 82, 111, 108, 50, 84, 86, 86, 87, 115, 119, 54, 90, 94, 96, 97, 134, 133, 59] },
                zambezi: { constituencies: 6, constituenciesReached: 2, share: '3%',
                  useCases: [{ label: 'Government to person', value: 34 }, { label: 'Cash out at an agent', value: 26 }, { label: 'Person to business', value: 22 }, { label: 'Person to person', value: 12 }, { label: 'Other', value: 6 }],
                  trend: [74, 77, 80, 81, 109, 110, 50, 87, 87, 85, 87, 120, 118, 54, 89, 89, 92, 94, 125, 130, 59, 96, 98, 98, 98, 131, 135, 62] },
                kunene: { constituencies: 6, constituenciesReached: 2, share: '2%',
                  useCases: [{ label: 'Cash out at an agent', value: 32 }, { label: 'Government to person', value: 30 }, { label: 'Person to business', value: 21 }, { label: 'Person to person', value: 11 }, { label: 'Other', value: 6 }],
                  trend: [78, 77, 80, 80, 114, 114, 51, 84, 83, 81, 84, 112, 116, 50, 83, 85, 89, 89, 119, 118, 54, 89, 87, 87, 90, 125, 130, 57] },
                omaheke: { constituencies: 7, constituenciesReached: 1, share: '1%',
                  useCases: [{ label: 'Person to business', value: 34 }, { label: 'Government to person', value: 26 }, { label: 'Cash out at an agent', value: 24 }, { label: 'Person to person', value: 11 }, { label: 'Other', value: 5 }],
                  trend: [52, 54, 54, 54, 76, 75, 32, 55, 57, 58, 58, 82, 80, 34, 56, 57, 59, 61, 82, 81, 37, 63, 64, 64, 66, 89, 92, 43] },
                kavango_west: { constituencies: 3, constituenciesReached: 0 },
              }}
            caption="A quiet region with one active business and a region never reached are different findings. Shading separates them; a national average does not. Illustrative figures from generated data."
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

    {/* 5 — Forecasting, with the fraud-exclusion reasoning stated directly
        rather than left implied. */}
    <section className="bg-blush py-96">
      <div className="max-w-content mx-auto px-24">
        <QuestionHeading
          label={BUSINESS_QUESTIONS.forecasting.label}
          question={BUSINESS_QUESTIONS.forecasting.question}
        />
        <Reveal>
          <div className="mt-40">
            <Figure label="forecast_activity · volume" source="additive decomposition, fit 0.73">
            <TrendChart
              history={[212, 198, 241, 266, 289, 331, 176, 205, 214, 252, 271, 302, 349, 188,
                        219, 231, 248, 277, 296, 338, 181, 226, 238, 259, 284, 311, 356, 193]}
              forecast={[228, 241, 259, 287, 318, 361, 199, 233]}
              band={[14, 20, 26, 33, 41, 50, 58, 67]}
              label="Daily payment volume, observed then forecast"
            />
            </Figure>
            <p className="text-caption font-sohne text-ash mt-16 max-w-prose">
              Grey is measured, magenta is projected, and the dashed rule is the moment one
              becomes the other. The band widens with distance because the uncertainty does —
              a forecast drawn as a single confident line is the one thing this must not be.
            </p>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-64 items-center mt-40">
          <div>
            <p className="text-body font-sohne text-slate">{PLATFORM_ANSWERS.forecasting}</p>
            <p className="text-body font-sohne text-slate mt-16">
              Expected volume and value, with the weekly pattern shown separately so it can be
              argued with. The range widens the further out it looks, because uncertainty does
              too.
            </p>
            <p className="text-body font-sohne text-slate mt-16">
              Under four weeks of trading it returns no forecast at all. A projection built on
              three weeks looks exactly like one built on three years, and the reader cannot tell
              them apart unless we refuse to draw it.
            </p>
          </div>
          <Reveal>
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
          </Reveal>
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
        <Reveal>
          <div className="mt-40 max-w-[620px]">
            <Figure label="psd6.total_value ⟷ dashboard" source="same query, same record">
              <ReconciliationBars filed={1852691.03} dashboard={1852691.03} />
            </Figure>
          </div>
        </Reveal>
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
          {PLATFORM_ANSWERS.returns}
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-64 items-center mt-40">
          <p className="text-body font-sohne text-slate">
            Each pack runs its own checks before it is issued, and says plainly if one fails.
          </p>
          <Reveal>
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
          </Reveal>
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
        <Reveal>
          <AssistantExchange className="mt-40" />
        </Reveal>
        <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">{ASK_ANYTHING.body[0]}</p>
        <div className="mt-40 max-w-[560px]">
          <Reveal>
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
          </Reveal>
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

        {/* What the record covers today, stated as plainly as possible.
            Every figure on this page comes from data we generate. Letting a
            reader assume otherwise would be the one overclaim that costs
            most, because it is the one a technical reviewer can disprove in
            a single question. */}
        <div className="mt-64 pt-64 border-t border-mist">
          <h3 className="text-subheading font-signifier text-ink max-w-[620px]">
            How far the record reaches
          </h3>
          <p className="text-body font-sohne text-slate mt-16 max-w-[620px]">
            Every measure above is implemented and runs end to end — against activity this
            platform generates itself, including anomalies introduced deliberately so that
            detection is measured rather than asserted. No shared data has been requested to
            reach this point, and none of these figures describes real Namibian activity.
            Widening the record to the payments the rails actually carry is the next step, and
            it is stated here as work rather than as something already done.
          </p>
          <Reveal>
            <PhaseLadder className="mt-32" />
          </Reveal>
        </div>
      </div>
    </section>

    {/* The precedent, last. A reader who has just seen the measures is in a
        position to judge whether this extends something the institution
        already does — which it does — rather than proposing it start. */}
    <section className="bg-blush py-96">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink max-w-[680px]">
          {PRECEDENT.heading}
        </h2>
        {PRECEDENT.body.map((para, idx) => (
          <p
            key={para.slice(0, 24)}
            className={`text-body font-sohne text-slate max-w-prose ${idx === 0 ? 'mt-24' : 'mt-16'}`}
          >
            {para}
          </p>
        ))}
        <Reveal>
          <Figure
            className="mt-40"
            label="already_in_production · Bank of Namibia"
            source="publicly reported, 2022 onward"
          >
            <ShareBars
              data={[
                { label: 'Processes automated', value: 28, hint: 'of 36 reviewed' },
                { label: 'Streamlined processes implemented', value: 69, hint: 'of 96' },
              ]}
              format={(v) => String(v)}
            />
            <ul className="mt-24 space-y-12">
              {[
                'Predictive model for non-performing loans',
                'Automated sanctions screening',
                'Trade verification',
                'First automated regulatory reporting system in the country',
              ].map((t) => (
                <li key={t} className="flex gap-12 text-caption font-sohne text-slate">
                  <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"
                    className="shrink-0 mt-2">
                    <circle cx="9" cy="9" r="9" fill="#E6136C" fillOpacity="0.12" />
                    <path d="M5 9.2 L7.8 12 L13 6.6" fill="none" stroke="#E6136C"
                      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t}
                </li>
              ))}
            </ul>
          </Figure>
        </Reveal>
      </div>
    </section>

    {/* Closing — the page's one action. The list mirrors the questions
        above, in the same order. */}
    <section className="bg-paper py-96 text-center">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink">Open the oversight view</h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[560px] mx-auto">
          Which alerts to review first, where the risk concentrates, who adoption still misses,
          where cash is still winning, what next month looks like, and whether the returns
          reconcile — with a direct line to ask anything else. All from the same record the
          dashboards read.
        </p>
        <ButtonLink to="/login?as=regulator" className="mt-32" arrow>Sign in for oversight</ButtonLink>
        {/* A supervisor reading this page has no account. Sign in alone was a
            dead end for the one reader it is written for. */}
        <RequestAccess audience="regulator" className="mt-20" />
      </div>
    </section>
  </PublicShell>
);

export default ForRegulatorsPage;
