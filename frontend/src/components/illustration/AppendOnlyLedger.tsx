import React from 'react';

/**
 * A status log, drawn: rows are appended, never edited, and a correction is a
 * new row that supersedes rather than replaces.
 *
 * **Append-only is the hardest privacy claim to make in prose and the easiest
 * to draw.** "Nothing can be altered without leaving a trace" is a sentence a
 * reader has to trust. A stack of rows where the superseded one is still
 * visible, struck through but present, with the correction beneath it, is the
 * property itself — and anyone can see there is nowhere for the old value to
 * have gone.
 *
 * The row that matters is the correction. A ledger that only ever shows
 * agreeable entries proves nothing; showing a verdict being reversed, with
 * both the original and the reversal intact and attributed, is what a dispute
 * six months later would actually rest on.
 */

interface Entry {
  at: string;
  actor: string;
  from: string | null;
  to: string;
  note?: string;
  superseded?: boolean;
}

const ENTRIES: Entry[] = [
  { at: '2026-06-14 09:12', actor: 'system', from: null, to: 'open',
    note: 'Scored 0.71 under configuration 7fdce6c715d5' },
  { at: '2026-06-14 11:40', actor: 'reviewer 4', from: 'open', to: 'under_review' },
  { at: '2026-06-15 08:03', actor: 'reviewer 4', from: 'under_review', to: 'confirmed_fraud',
    note: 'Pattern consistent with account takeover', superseded: true },
  { at: '2026-06-18 15:27', actor: 'reviewer 9', from: 'confirmed_fraud', to: 'not_fraud',
    note: 'Corrected: business confirmed the payments were its own' },
];

const AppendOnlyLedger: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={className}>
    <ol className="relative space-y-4">
      {/* The spine. A ledger is a sequence before it is a set of rows. */}
      <span
        aria-hidden="true"
        className="absolute left-[7px] top-8 bottom-8 w-[2px] bg-mist"
      />
      {ENTRIES.map((e, i) => (
        <li key={e.at} className="relative pl-32">
          <span
            aria-hidden="true"
            className={`absolute left-0 top-14 w-16 h-16 rounded-full border-[3px] border-paper ${
              e.superseded ? 'bg-ash' : i === ENTRIES.length - 1 ? 'bg-status-success' : 'bg-brand-magenta'
            }`}
          />
          <div
            className={`rounded-inputs px-16 py-12 ${
              e.superseded ? 'bg-mist/60' : 'bg-blush-tint'
            }`}
          >
            <div className="flex flex-wrap items-baseline gap-x-12 gap-y-2">
              <code className="text-caption font-mono text-ash">{e.at}</code>
              <code className="text-caption font-mono text-slate">{e.actor}</code>
            </div>
            <p
              className={`text-body font-sohne mt-4 ${
                e.superseded ? 'text-ash line-through decoration-ash/50' : 'text-ink'
              }`}
            >
              <code className="font-mono text-caption">
                {e.from ?? '—'} → {e.to}
              </code>
            </p>
            {e.note && (
              <p className={`text-caption font-sohne mt-4 ${e.superseded ? 'text-ash' : 'text-slate'}`}>
                {e.note}
              </p>
            )}
            {e.superseded && (
              <p className="text-caption font-mono text-ash mt-8">
                superseded — retained, never deleted
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
    <p className="text-caption font-sohne text-ash mt-24 max-w-prose">
      A verdict was recorded, then corrected three days later. Both rows survive, each attributed
      to a named reviewer. There is no operation in the system that edits a log row or removes
      one — which is what makes a decision defensible months after the person who made it has
      forgotten it.
    </p>
  </div>
);

export default AppendOnlyLedger;
