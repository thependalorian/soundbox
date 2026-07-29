import React, { useEffect, useState } from 'react';
import ButtonLink from '../../components/ui/ButtonLink';
import PublicShell from '../../components/Public/PublicShell';
import PageHero from '../../components/Public/PageHero';
import AudienceSplit from '../../components/Public/AudienceSplit';
import ImageSlot from '../../components/ui/ImageSlot';
import Card from '../../components/ui/Card';
import TitleDetailCardGrid from '../../components/ui/TitleDetailCardGrid';
import { BRAND, LANDING, PROPOSITION, AUDIENCES, CUSTOMER_CHANNELS, OVERSIGHT_CAPABILITIES } from '../../lib/copy/public';

/**
 * The landing page has one job: state the vision, then send each of the two
 * audiences to the page written for them. Sellers and regulators want
 * opposite things from this product — certainty at the counter, and
 * visibility across the country — so trying to serve both in one page of
 * copy would serve neither.
 *
 * Nine sections, one action: the hero links deeper into the site, the
 * closing section is the only place that asks for a sign-in.
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

const JOURNEY = [
  { step: '1', title: 'They scan and approve', detail: 'The customer scans your printed code and approves the amount in their own banking app.' },
  { step: '2', title: 'The banks settle it', detail: 'Their bank sends it onto the WayaMe rails, which route it to yours — bank to bank, with SoundBox nowhere in that path.' },
  { step: '3', title: 'You hear it land', detail: 'The moment WayaMe tells us the outcome, the box says the amount out loud. Nothing to read, nothing to check.' },
] as const;

const LandingPage: React.FC = () => {
  const word = useRotatingWord(ROTATING);

  return (
    <PublicShell>
      <PageHero
        size="large"
        tone="origin"
        eyebrow="SoundBox, on the WayaMe rails"
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
          <ButtonLink to="/how-it-works">See how it works</ButtonLink>
        </div>
      </PageHero>

      {/* The vision, as the brand states one: a gradient panel with the
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
          {LANDING.visionBody.map((para, idx) => (
            <p
              key={para.slice(0, 24)}
              className={`text-body font-sohne text-paper max-w-prose ${idx === 0 ? 'mt-24' : 'mt-16'}`}
            >
              {para}
            </p>
          ))}
        </div>
      </section>

      {/* Why a sound and not a screen */}
      <section className="bg-paper py-96">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink max-w-[560px]">
            Why a sound, and not a screen
          </h2>
          <TitleDetailCardGrid
            items={PROPOSITION}
            gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-16 mt-40"
          />
        </div>
      </section>

      {/* Who it is for */}
      <section className="bg-blush py-96">
        <div className="max-w-content mx-auto px-24">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-40 items-start">
            <div>
              <h2 className="text-heading font-signifier text-ink">Who it is for</h2>
              <p className="text-body font-sohne text-slate mt-16 max-w-prose">
                The segments that handle the most cash, and are least served by a notification
                on a screen.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-16 mt-32">
                {AUDIENCES.map((a) => (
                  <Card key={a.title} variant="elevated" className="p-20">
                    <h3 className="text-body font-sohne font-450 text-ink">{a.title}</h3>
                    <p className="text-caption font-sohne text-slate mt-4">{a.detail}</p>
                  </Card>
                ))}
              </div>
            </div>
            <ImageSlot
              ratio="3:2"
              slot="Who it is for"
              brief="A Namibian market trader at their stall, hearing a payment confirm."
              direction="Real stall, real produce. The box visible on the counter but not the subject — the subject is the trader's face at the moment they know they have been paid. Natural light, no studio setup."
            />
          </div>
        </div>
      </section>

      {/* How a payment reaches you */}
      <section className="bg-paper py-80">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink max-w-[560px]">
            How a payment reaches you
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-24 mt-40">
            {JOURNEY.map((j) => (
              <div key={j.step}>
                <span className="text-caption font-sohne text-sienna font-500">{j.step}</span>
                <h3 className="text-body font-sohne font-450 text-ink mt-4">{j.title}</h3>
                <p className="text-caption font-sohne text-slate mt-8">{j.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* A short code reaches any phone */}
      <section className="bg-blush py-96">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink max-w-[560px]">
            A short code reaches any phone
          </h2>
          <TitleDetailCardGrid
            items={CUSTOMER_CHANNELS}
            gridClassName="grid grid-cols-1 md:grid-cols-2 gap-16 mt-40"
          />
        </div>
      </section>

      {/* What the country gets */}
      <section className="bg-paper py-96">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink max-w-[560px]">
            What the country gets
          </h2>
          <p className="text-body font-sohne text-slate mt-16 max-w-prose">
            Every confirmed payment is also a measurement, collected as a by-product of a device
            sellers use to know a payment actually landed.
          </p>
          <TitleDetailCardGrid
            items={[OVERSIGHT_CAPABILITIES[0], OVERSIGHT_CAPABILITIES[1], OVERSIGHT_CAPABILITIES[2]]}
            gridClassName="grid grid-cols-1 md:grid-cols-3 gap-16 mt-40"
          />
        </div>
      </section>

      {/* Two audiences */}
      <section className="bg-blush py-96">
        <div className="max-w-content mx-auto px-24">
          <AudienceSplit />
        </div>
      </section>

      {/* Closing — the page's one action */}
      <section className="bg-paper py-96 text-center">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-heading font-signifier text-ink">{BRAND.tagline}</h2>
          <p className="text-body font-sohne text-slate mt-16 max-w-[480px] mx-auto">
            Sign in to see your devices, your businesses, and your part of the picture.
          </p>
          <ButtonLink to="/login" className="mt-32">Sign in</ButtonLink>
        </div>
      </section>
    </PublicShell>
  );
};

export default LandingPage;
