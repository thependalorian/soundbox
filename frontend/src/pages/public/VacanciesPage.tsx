import React from 'react';
import PageHero from '../../components/Public/PageHero';
import PublicShell from '../../components/Public/PublicShell';
import ButtonLink from '../../components/ui/ButtonLink';
import Roadmap from '../../components/Public/Roadmap';
import ObfuscatedEmail from '../../components/ui/ObfuscatedEmail';
import { CONTACT } from '../../lib/copy/public';

/**
 * Vacancies.
 *
 * There is no jobs board today — this states the plan and invites interest,
 * rather than listing openings that do not exist yet. From
 * docs/business-plan.md §5.2.2 (manufacturing timeline) and §5.4 (customer
 * support channels): local assembly is a later phase, not a current hire.
 * Nothing here is marked as open now.
 */

const WHY_ROADMAP = [
  {
    phase: 'building' as const,
    title: 'Import, while the market proves out',
    detail: 'The first units are sourced from an external manufacturing partner while the business establishes itself in Namibia.',
  },
  {
    phase: 'planned' as const,
    title: 'Local assembly',
    detail: 'An assembly facility in Namibia, with technicians trained here rather than work sent elsewhere — the first step toward a device that is genuinely built, not just sold, locally.',
  },
  {
    phase: 'planned' as const,
    title: 'Local manufacturing',
    detail: 'Component assembly and sourcing based in Namibia, working toward "Made in Namibia" — the point at which the plant can also export into the region.',
  },
] as const;

const VacanciesPage: React.FC = () => (
  <PublicShell>
    <PageHero
      tone="assurance"
      title="Built here, fixed here"
      lead="An assembly plant in Namibia means the people who build a box can also be the people who repair one."
    />

    {/* Why an assembly plant, and what it changes */}
    <section className="bg-paper py-96">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink max-w-[620px]">
          Why we&apos;re assembling in Namibia
        </h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-prose">
          A device sold into a country it is not built in has one weakness: when one breaks, the
          fix depends on a supply chain that runs somewhere else. Local assembly closes that gap —
          and it only works with people trained to do the work, based here.
        </p>
        <Roadmap className="mt-40" items={WHY_ROADMAP.map((r) => ({ ...r }))} />
      </div>
    </section>

    {/* What it means for support */}
    <section className="bg-blush py-96">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink max-w-[620px]">
          What that means for support
        </h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-prose">
          A seller whose box stops working needs it fixed in days, not weeks. A local plant is
          also a local service centre — the people who assemble a device are positioned to repair
          one too, which is the difference between a warranty claim that waits on a shipment and
          one that gets handled down the road.
        </p>
      </div>
    </section>

    {/* Register interest — the page's one emphasis band */}
    <section className="bg-brand-gradient-aa py-128 text-center">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-paper max-w-[560px] mx-auto">
          Nothing is open yet — tell us anyway
        </h2>
        <p className="text-body font-sohne text-paper opacity-90 mt-16 max-w-[560px] mx-auto">
          Assembly, repair, field support, and the engineering and compliance work behind the
          platform all grow from here. If any of that is the kind of work you want to be doing in
          Namibia, we&apos;d rather hear from you before a role is posted than after.
        </p>
        <div className="mt-32 flex items-center justify-center">
          <ObfuscatedEmail
            user={CONTACT.emailUser}
            domain={CONTACT.emailDomain}
            spoken={CONTACT.emailSpoken}
            colour="#FFFFFF"
            fontSize={18}
          />
        </div>
      </div>
    </section>

    {/* Closing — the page's one action */}
    <section className="bg-paper py-96 text-center">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink">See what the plan looks like</h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[480px] mx-auto">
          How the device works today, and what the box itself has to say about it.
        </p>
        <ButtonLink to="/how-it-works" className="mt-32">See how it works</ButtonLink>
      </div>
    </section>
  </PublicShell>
);

export default VacanciesPage;
