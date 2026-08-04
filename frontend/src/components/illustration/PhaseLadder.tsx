import React from 'react';

/**
 * The phased data-access path, drawn as a ladder rather than a list.
 *
 * **The shape carries the argument.** Each phase asks for more than the last
 * and is justified by the one before it, so the rungs widen as they rise and
 * the completed one is filled solid. A reader sees "this starts small" before
 * reading a word — which is the entire point of proposing it in phases.
 *
 * Used on both the roles page (hires are pinned to these phases) and wherever
 * the ask itself is set out, so the two cannot describe different sequences.
 */

export interface Phase {
  label: string;
  title: string;
  detail: string;
  state: 'done' | 'now' | 'later';
}

export const DATA_PHASES: Phase[] = [
  {
    label: 'Phase 0',
    title: 'Nothing requested',
    detail:
      'The framework is built and validated on activity we generate, including anomalies planted so detection is measured rather than claimed.',
    state: 'done',
  },
  {
    label: 'Phase 1',
    title: 'Schema and a bounded sample',
    detail:
      'An anonymised historical extract and the data schema. No live feed, no ongoing dependency, and bounded in time and scope.',
    state: 'now',
  },
  {
    label: 'Phase 2',
    title: 'Periodic extracts',
    detail:
      'Regular but not continuous, with cadence and content controlled entirely by the data provider. Nothing is always on.',
    state: 'later',
  },
  {
    label: 'Phase 3',
    title: 'Observer status',
    detail:
      'Live or near-live access, justified by the track record from the phases before it rather than by an application.',
    state: 'later',
  },
];

const TONE: Record<Phase['state'], { bar: string; pill: string; label: string }> = {
  done: {
    bar: 'bg-brand-gradient-aa',
    pill: 'bg-blush text-sienna',
    label: 'Complete',
  },
  now: {
    bar: 'bg-brand-gradient-aa opacity-60',
    pill: 'bg-peach text-sienna',
    label: 'The ask',
  },
  later: {
    bar: 'bg-mist',
    pill: 'bg-mist text-slate',
    label: 'Later',
  },
};

const PhaseLadder: React.FC<{ phases?: Phase[]; className?: string }> = ({
  phases = DATA_PHASES,
  className = '',
}) => (
  <ol className={`space-y-16 ${className}`}>
    {phases.map((p, i) => {
      const tone = TONE[p.state];
      return (
        <li key={p.label} className="rounded-shell bg-mist/50 p-6">
          <div className="rounded-shellInner bg-paper p-24">
            <div className="flex flex-wrap items-center gap-12">
              <span className="text-caption font-sohne font-500 text-ash tabular-nums">
                {p.label}
              </span>
              <span
                className={`inline-flex rounded-full px-12 py-4 text-caption font-sohne
                            uppercase tracking-[0.1em] ${tone.pill}`}
              >
                {tone.label}
              </span>
            </div>
            <h3 className="text-subheading font-signifier text-ink mt-12">{p.title}</h3>
            <p className="text-body font-sohne text-slate mt-8 max-w-prose">{p.detail}</p>
            {/* The rung. Width grows with the phase, so the escalation is
                visible before it is read. */}
            <div
              aria-hidden="true"
              className="mt-20 h-6 rounded-full bg-mist/70 overflow-hidden"
            >
              <div
                className={`h-full rounded-full ${tone.bar}`}
                style={{ width: `${25 + i * 25}%` }}
              />
            </div>
          </div>
        </li>
      );
    })}
  </ol>
);

export default PhaseLadder;
