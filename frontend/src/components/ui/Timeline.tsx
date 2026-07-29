import React from 'react';

export interface TimelineEntry {
  id: string;
  title: string;
  detail?: string;
  meta?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const DOT: Record<NonNullable<TimelineEntry['tone']>, string> = {
  default: 'bg-slate',
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  danger: 'bg-status-danger',
};

/**
 * Vertical event timeline.
 *
 * Status history was previously rendered as a flat list of sentences on
 * four separate detail pages. A history is fundamentally a shape — things
 * happened in an order, with gaps — and a list throws that shape away. The
 * rail and dots restore it, so an operator can see at a glance whether an
 * alert sat untouched for a week or was resolved in a minute.
 *
 * The newest entry is emphasised because it is the current state; older
 * entries recede without being hidden.
 */
const Timeline: React.FC<{ entries: TimelineEntry[]; className?: string }> = ({
  entries,
  className = '',
}) => {
  if (!entries.length) {
    return <p className={`text-body font-sohne text-slate ${className}`}>No history recorded.</p>;
  }

  return (
    <ol className={`relative ${className}`}>
      {/* Continuous rail behind the dots */}
      <span
        className="absolute left-[5px] top-8 bottom-8 w-px bg-mist"
        aria-hidden="true"
      />
      {entries.map((e, i) => {
        const latest = i === 0;
        return (
          <li key={e.id} className="relative pl-28 pb-20 last:pb-0">
            <span
              className={`absolute left-0 top-4 w-12 h-12 rounded-full ring-4 ring-paper ${
                DOT[e.tone ?? 'default']
              } ${latest ? '' : 'opacity-50'}`}
              aria-hidden="true"
            />
            <p
              className={`text-body font-sohne ${
                latest ? 'text-ink font-450' : 'text-slate'
              }`}
            >
              {e.title}
            </p>
            {e.detail && <p className="text-caption font-sohne text-slate mt-4">{e.detail}</p>}
            {e.meta && <p className="text-caption font-sohne text-ash mt-4">{e.meta}</p>}
          </li>
        );
      })}
    </ol>
  );
};

export default Timeline;
