import React from 'react';
import Card from '../ui/Card';
import ButtonLink from '../ui/ButtonLink';
import { AUDIENCE_SPLIT } from '../../lib/copy/public';

/**
 * The home page's two-audience fork.
 *
 * The home page argues for the device in general; a seller and a regulator
 * arrive wanting different proof of that argument. Rather than repeat either
 * page's case here, this names the reader back to themselves and sends them
 * on — one card each, no third option.
 *
 * Both cards carry equal weight on purpose: an earlier version gave sellers
 * a filled brand card and button while regulators got a plain card and an
 * outline button, which reads as "sellers are the real audience, regulators
 * are an afterthought" — not true, and not the point of a fork.
 */
const AudienceSplit: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={className}>
    <h2 className="text-subheading font-signifier text-ink mb-24 text-center">
      {AUDIENCE_SPLIT.heading}
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
      <Card variant="elevated" className="p-32 flex flex-col">
        <h3 className="text-body font-sohne font-450 text-ink">{AUDIENCE_SPLIT.sellers.title}</h3>
        <p className="text-caption font-sohne text-slate mt-8 flex-1">
          {AUDIENCE_SPLIT.sellers.detail}
        </p>
        <ButtonLink to={AUDIENCE_SPLIT.sellers.href} variant="filled" className="mt-24 self-start">
          {AUDIENCE_SPLIT.sellers.cta}
        </ButtonLink>
      </Card>
      <Card variant="elevated" className="p-32 flex flex-col">
        <h3 className="text-body font-sohne font-450 text-ink">{AUDIENCE_SPLIT.regulators.title}</h3>
        <p className="text-caption font-sohne text-slate mt-8 flex-1">
          {AUDIENCE_SPLIT.regulators.detail}
        </p>
        <ButtonLink to={AUDIENCE_SPLIT.regulators.href} variant="filled" className="mt-24 self-start">
          {AUDIENCE_SPLIT.regulators.cta}
        </ButtonLink>
      </Card>
    </div>
  </div>
);

export default AudienceSplit;
