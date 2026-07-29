import React from 'react';
import PageHero from '../../components/Public/PageHero';
import ButtonLink from '../../components/ui/ButtonLink';
import PublicShell from '../../components/Public/PublicShell';
import { TRUST_GROUPS, TRUST_ROADMAP, OBSERVER_BOUNDARIES } from '../../lib/copy/public';
import Card from '../../components/ui/Card';
import TitleDetailCardGrid from '../../components/ui/TitleDetailCardGrid';
import TrustMark from '../../components/illustration/TrustMark';

/**
 * Trust page.
 *
 * Everything here describes something that exists in the code today. The
 * "not yet in place" list is deliberate: anyone serious will establish
 * these facts during due diligence, and finding them undisclosed is far
 * more damaging than finding them stated plainly.
 *
 * Eight sections, one action: the closing section leads to Privacy, which
 * is the next honest question — trust in the record and restraint on
 * personal data are two separate promises.
 */

const GROUPS = TRUST_GROUPS;
const ROADMAP = TRUST_ROADMAP;

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

const TrustPage: React.FC = () => (
  <PublicShell>
    <PageHero
      tone="assurance"
      title="Trust"
      lead="What the system guarantees today, and what we are building next. Both matter to anyone deciding whether to put real money through it."
    />

    {GROUPS.map((g, i) => (
      <section key={g.title} className={`py-96 ${i % 2 === 0 ? 'bg-paper' : 'bg-blush'}`}>
        <div className="max-w-content mx-auto px-24">
          <TrustMark kind={g.mark} className="mb-16" />
          <h2 className="text-heading font-signifier text-ink max-w-prose">{g.title}</h2>
          <p className="text-body font-sohne text-slate mt-12 max-w-[560px]">{g.blurb}</p>
          <TitleDetailCardGrid
            items={g.items.map((it) => ({ title: it.t, detail: it.d }))}
            gridClassName="grid grid-cols-1 md:grid-cols-2 gap-16 mt-24"
            cardVariant="neutral"
            titleClassName="text-body font-sohne font-450 text-ink"
          />
        </div>
      </section>
    ))}

    {/* It watches; it cannot touch — the page's one emphasis band */}
    <section className="bg-brand-gradient-aa py-128">
      <div className="max-w-content mx-auto px-24">
        <TrustMark kind="shield" className="mb-16" />
        <h2 className="text-heading font-signifier text-paper max-w-prose">
          It watches; it cannot touch
        </h2>
        <p className="text-body font-sohne text-paper opacity-90 mt-16 max-w-[620px]">
          An observer, not a participant. The platform is told the outcome of a payment and
          announces it — it is never in the path the payment itself takes.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-40">
          <Card variant="elevated" className="p-24">
            <p className="text-caption font-sohne text-ash">What it does</p>
            <ul className="mt-12 space-y-8">
              {OBSERVER_BOUNDARIES.does.map((x) => (
                <li key={x} className="text-body font-sohne text-ink">{x}</li>
              ))}
            </ul>
          </Card>
          <Card variant="elevated" className="p-24">
            <p className="text-caption font-sohne text-ash">What it cannot do</p>
            <ul className="mt-12 space-y-8">
              {OBSERVER_BOUNDARIES.neverTouches.map((x) => (
                <li key={x} className="text-body font-sohne text-ink">{x}</li>
              ))}
            </ul>
          </Card>
        </div>
        <p className="text-caption font-sohne text-paper opacity-80 mt-24 max-w-prose">
          Verifiable in the code, not just asserted: the only outbound calls to the payment rails
          are a status check, a device registration and a heartbeat. There is no initiate,
          authorise, debit, decline or block anywhere in the codebase.
        </p>
      </div>
    </section>

    {/* Tested against payments we altered on purpose */}
    <section className="bg-paper py-96">
      <div className="max-w-content mx-auto px-24">
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
      </div>
    </section>

    {/* What we are building next */}
    <section className="bg-blush py-96">
      <div className="max-w-content mx-auto px-24">
        <Card variant="accent" className="p-32">
          <h2 className="text-subheading font-signifier mb-8">What we are building next</h2>
          <ul className="space-y-12">
            {ROADMAP.map((o) => (
              <li key={o.t}>
                <p className="text-body font-sohne font-450">{o.t}</p>
                <p className="text-caption font-sohne leading-relaxed opacity-80">{o.d}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>

    {/* Closing — the page's one action */}
    <section className="bg-paper py-96 text-center">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink">What we hold about people</h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[480px] mx-auto">
          Integrity of the record is one half. The other is how little personal data sits in it.
        </p>
        <ButtonLink to="/privacy" className="mt-32">Read what we keep</ButtonLink>
      </div>
    </section>
  </PublicShell>
);

export default TrustPage;
