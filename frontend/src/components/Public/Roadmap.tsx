import React from 'react';
import Card from '../ui/Card';

export type Phase = 'live' | 'building' | 'planned';

export interface RoadmapItem {
  phase: Phase;
  title: string;
  detail: string;
}

const PHASE_LABEL: Record<Phase, string> = {
  live: 'Live now',
  building: 'Building',
  planned: 'Planned',
};

const PHASE_STYLE: Record<Phase, string> = {
  live: 'bg-status-success/10 text-status-success',
  building: 'bg-peach text-sienna',
  planned: 'bg-mist text-slate',
};

/**
 * Capability shown as a sequence rather than a list of gaps.
 *
 * The same facts framed as "what we cannot do yet" read as an apology and
 * invite the reader to discount everything above them. Framed as a
 * sequence, they read as a plan — and a team that can name what comes next,
 * in order, is more credible than one that implies it is already finished.
 *
 * The honesty is unchanged: nothing is marked `live` that is not, and
 * nothing is quietly omitted.
 */
const Roadmap: React.FC<{ items: RoadmapItem[]; className?: string }> = ({
  items,
  className = '',
}) => (
  <div className={`grid grid-cols-1 md:grid-cols-3 gap-16 ${className}`}>
    {items.map((item) => (
      <Card key={item.title} variant={item.phase === 'building' ? 'accent' : 'neutral'} className="p-24">
        <span
          className={`inline-flex items-center rounded-buttons px-12 py-4 text-caption font-sohne font-450 ${PHASE_STYLE[item.phase]}`}
        >
          {PHASE_LABEL[item.phase]}
        </span>
        <h3 className="text-subheading font-signifier mt-12">{item.title}</h3>
        <p
          className={`text-caption font-sohne mt-8 ${
            item.phase === 'building' ? '' : 'text-slate'
          }`}
        >
          {item.detail}
        </p>
      </Card>
    ))}
  </div>
);

export default Roadmap;
