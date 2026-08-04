import React, { useEffect, useState } from 'react';
import ButtonLink from '../../components/ui/ButtonLink';
import PublicShell from '../../components/Public/PublicShell';
import RequestAccess from '../../components/Public/RequestAccess';
import PageHero from '../../components/Public/PageHero';
import ObserverDiagram from '../../components/illustration/ObserverDiagram';
import PhaseLadder from '../../components/illustration/PhaseLadder';
import FeatureImportance from '../../components/illustration/FeatureImportance';
import { TrendChart, ShareBars } from '../../components/charts/primitives';
import NamibiaMap from '../../components/illustration/NamibiaMap';
import Card from '../../components/ui/Card';
import Panel from '../../components/ui/Panel';
import Reveal from '../../components/ui/Reveal';
import TitleDetailCardGrid from '../../components/ui/TitleDetailCardGrid';
import { BRAND, LANDING, POSITION, PRECEDENT, OVERSIGHT_CAPABILITIES } from '../../lib/copy/public';

/**
 * The landing page has one job: say what this platform is, say plainly what
 * it cannot do, and send the reader to the page written for them.
 *
 * The "what it cannot do" section is not a disclaimer bolted on at the end —
 * it appears second, directly under the vision, because it is the single fact
 * that makes everything after it credible to the institution reading.
 */

const ROTATING = LANDING.rotatingAudiences;

const useRotatingWord = (words: readonly string[], intervalMs = 2400) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % words.length), intervalMs);
    return () => clearInterval(t);
  }, [words.length, intervalMs]);
  return words[i];
};

/** The data path, end to end. Every step is observation, never action. */
const FLOW = [
  {
    step: '1',
    title: 'The rails record a payment',
    detail:
      'A payment is made, cleared and settled entirely between the institutions on the national rails. Nothing here is involved in that.',
  },
  {
    step: '2',
    title: 'Pattern data is shared under agreement',
    detail:
      'Details of what happened are shared on terms set by the data provider — scoped, minimised, and limited to the analytical purpose agreed.',
  },
  {
    step: '3',
    title: 'It becomes a measure',
    detail:
      'Volume, reach, concentration, anomaly scores and the returns are computed from that record, and reconcile against it.',
  },
] as const;

const LandingPage: React.FC = () => {
  const word = useRotatingWord(ROTATING);

  return (
    <PublicShell>
      <PageHero
        size="large"
        tone="origin"
        eyebrow={`${BRAND.name}, on the ${BRAND.rails} rails`}
        title={
          <>
            {LANDING.heroLead}
            <br />
            <span className="italic">{word}</span>
          </>
        }
        lead={LANDING.heroSupport}
      >
        <div className="mt-32">
          <ButtonLink to="/for-regulators" arrow>What it answers</ButtonLink>
        </div>
      </PageHero>

      {/* The argument, as the brand states one: a gradient panel with the
          headline reversed out of it — the page's one emphasis band.
          Plum-forward rather than the hero's coral-forward sweep: the hero
          directly above already fills the viewport with the same coral
          gradient family, and stacking a second coral/magenta block under
          it read as one continuous panel rather than two sections. */}
      <section className="bg-hero-oversight">
        <div className="max-w-content mx-auto px-24 py-128">
          <h2 className="text-heading font-signifier text-paper max-w-[720px]">
            {LANDING.visionHeading}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] gap-56 items-center">
            <div>
              {LANDING.visionBody.map((para, idx) => (
                <p
                  key={para.slice(0, 24)}
                  className={`text-body font-sohne text-paper max-w-prose ${idx === 0 ? 'mt-24' : 'mt-16'}`}
                >
                  {para}
                </p>
              ))}
            </div>
            {/* Volume and velocity rising together is the whole premise of the
                paragraph beside it. Drawn, it takes a second rather than a
                paragraph. */}
            <div className="rounded-shell bg-paper/10 p-6 mt-24 lg:mt-0">
              <div className="rounded-shellInner bg-paper/[0.07] p-24">
                <p className="text-caption font-sohne text-paper/80 uppercase tracking-[0.1em]">
                  Payments per day, as a rail scales
                </p>
                <TrendChart
                  className="mt-16"
                  history={[46, 52, 61, 58, 74, 88, 71, 96, 112, 131, 124, 158, 181, 176,
                            208, 236, 259, 244, 291, 322, 356, 341, 398, 437]}
                  label="Daily payment volume rising as adoption grows"
                />
                <p className="text-caption font-sohne text-paper/70 mt-12">
                  Illustrative. The shape is what changes what oversight has to catch.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What it is, and what it cannot do. Second on the page deliberately. */}
      <section className="bg-paper py-96">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink max-w-[560px]">
            {POSITION.heading}
          </h2>
          <p className="text-body font-sohne text-slate mt-16 max-w-prose">{POSITION.lead}</p>

          {/* The diagram before the lists. "We are an observer" is a claim a
              reader takes on trust; a one-way arrow into a box, with the
              return path explicitly crossed out, is something they can see. */}
          <Reveal>
            <ObserverDiagram className="mt-48 w-full" />
          </Reveal>

          {/* Two nested panels rather than two flat cards. The pairing is
              the argument — what it does beside what it cannot — so the two
              have to read as a matched set of objects, not as two boxes that
              happen to be adjacent. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-24 mt-40">
            {([
              { title: 'It does', items: POSITION.does, tone: 'paper' as const },
              { title: 'It cannot', items: POSITION.cannot, tone: 'blush' as const },
            ]).map((col, i) => (
              <Reveal key={col.title} delay={i * 90}>
                <Panel tone={col.tone} className="h-full">
                  <div className="p-24">
                    <h3 className="text-body font-sohne font-450 text-ink">{col.title}</h3>
                    <ul className="mt-16 space-y-12">
                      {col.items.map((item) => (
                        <li key={item} className="text-caption font-sohne text-slate">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Panel>
              </Reveal>
            ))}
          </div>
          <p className="text-caption font-sohne text-slate mt-24 max-w-prose">
            This is structural rather than a policy we apply. There is no code path in the
            platform that could move money, because it is never in the payment path.
          </p>
        </div>
      </section>

      {/* The precedent. Placed after the boundary and before the mechanics,
          because it is what makes the rest read as an extension of something
          the institution already does rather than a proposal to start it. */}
      <section className="bg-blush py-96">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink max-w-[680px]">
            {PRECEDENT.heading}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-56 items-start">
            <div>
              {PRECEDENT.body.map((para, idx) => (
                <p
                  key={para.slice(0, 24)}
                  className={`text-body font-sohne text-slate max-w-prose ${idx === 0 ? 'mt-24' : 'mt-16'}`}
                >
                  {para}
                </p>
              ))}
            </div>
            {/* Named, because the claim is checkable and a reader who works
                there will recognise every line. */}
            <div className="rounded-shell bg-paper/70 p-6 mt-24 lg:mt-0">
              <div className="rounded-shellInner bg-paper p-24">
                <p className="text-caption font-sohne text-ash uppercase tracking-[0.1em]">
                  Already built in-house
                </p>
                <ul className="mt-20 space-y-16">
                  {[
                    ['Predictive model for non-performing loans', 'supervisory ML, in production'],
                    ['Automated sanctions screening', 'a detection pipeline, already trusted'],
                    ['Trade verification', 'automated checking at scale'],
                    ['First automated regulatory reporting system', 'returns without manual assembly'],
                  ].map(([t, d]) => (
                    <li key={t} className="flex gap-12">
                      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"
                        className="shrink-0 mt-2">
                        <circle cx="9" cy="9" r="9" fill="#E6136C" fillOpacity="0.12" />
                        <path d="M5 9.2 L7.8 12 L13 6.6" fill="none" stroke="#E6136C"
                          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>
                        <span className="block text-body font-sohne text-ink">{t}</span>
                        <span className="block text-caption font-sohne text-ash">{d}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-caption font-sohne text-ash mt-20 pt-16 border-t border-mist">
                  None of it reaches the payment rails, because that needs data the Bank does not
                  hold directly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How data reaches the platform */}
      <section className="bg-paper py-96">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink max-w-[560px]">
            How the data reaches us
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-24 mt-40">
            {FLOW.map((j, i) => (
              <Reveal key={j.step} delay={i * 110}>
                {/* The step number sits in its own disc: a numeral alone in a
                    column reads as a list marker, enclosed it reads as a
                    stage in a process. */}
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center w-32 h-32 rounded-full
                             bg-blush text-sienna text-caption font-sohne font-500"
                >
                  {j.step}
                </span>
                <h3 className="text-body font-sohne font-450 text-ink mt-16">{j.title}</h3>
                <p className="text-caption font-sohne text-slate mt-8">{j.detail}</p>
              </Reveal>
            ))}
          </div>

          {/* The steps above describe the path. This is the ask that follows
              from it, and putting the two together is the point: a reader who
              has just understood the flow is exactly the reader for the
              request. */}
          <h3 className="text-subheading font-signifier text-ink mt-64">
            And what we are asking for, in order
          </h3>
          <Reveal>
            <PhaseLadder className="mt-24" />
          </Reveal>
        </div>
      </section>

      {/* What oversight gets */}
      <section className="bg-blush py-96">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink max-w-[560px]">
            What oversight gets
          </h2>
          <p className="text-body font-sohne text-slate mt-16 max-w-prose">
            Every measure states the denominator it was computed over, and every score carries
            the reasons that produced it.
          </p>
          <TitleDetailCardGrid
            items={[
              OVERSIGHT_CAPABILITIES[0],
              OVERSIGHT_CAPABILITIES[1],
              OVERSIGHT_CAPABILITIES[2],
            ]}
            gridClassName="grid grid-cols-1 md:grid-cols-3 gap-16 mt-32"
          />

          {/* Full width. Coverage is the argument this section makes, and a
              map of a country shown at thumbnail size makes it badly. */}
          <Reveal>
            <NamibiaMap
              className="mt-56"
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
              caption="Fourteen regions, shaded by recorded activity. The hatched region has no data at all — a distinction a national average erases. Illustrative figures from generated data."
            />
          </Reveal>
        </div>
      </section>

      {/* Closing — the page's one action */}
      <section className="bg-paper py-96 text-center">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink">{BRAND.tagline}</h2>
          <p className="text-body font-sohne text-slate mt-16 max-w-[480px] mx-auto">
            Sign in to the oversight console, or read what the platform answers.
          </p>
          <ButtonLink to="/login" className="mt-32" arrow>Sign in</ButtonLink>
          <RequestAccess className="mt-20" />
        </div>
      </section>
    </PublicShell>
  );
};

export default LandingPage;
