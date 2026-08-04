import React from 'react';

/**
 * Who can reach what, as a grid.
 *
 * **A capability list in prose invites the reader to assume the gaps.** A grid
 * forces every cell to be answered: for each role and each capability there is
 * a mark, a partial mark, or a blank, and a blank is a statement rather than
 * an omission. That is the difference between describing access control and
 * showing it.
 *
 * The rows are the two roles that exist. There is deliberately no third
 * column for a business or an individual, because no such account type
 * exists — the people in the data are subjects of the analysis, never callers
 * of the API, and a grid is the clearest place to make that visible.
 */

type Level = 'full' | 'read' | 'none';

const CAPABILITIES: { label: string; regulator: Level; admin: Level }[] = [
  { label: 'National dashboards', regulator: 'full', admin: 'full' },
  { label: 'Payment record', regulator: 'read', admin: 'read' },
  { label: 'Review queue', regulator: 'full', admin: 'full' },
  { label: 'Record a verdict', regulator: 'full', admin: 'full' },
  { label: 'Coverage and inclusion', regulator: 'full', admin: 'full' },
  { label: 'Regulatory returns', regulator: 'full', admin: 'full' },
  { label: 'Scoring thresholds', regulator: 'read', admin: 'full' },
  { label: 'Manage accounts', regulator: 'none', admin: 'full' },
  { label: 'A payer’s identity', regulator: 'none', admin: 'none' },
  { label: 'Move or hold money', regulator: 'none', admin: 'none' },
];

const Mark: React.FC<{ level: Level }> = ({ level }) => {
  if (level === 'none') {
    return (
      <span className="inline-flex items-center justify-center w-24 h-24" title="No access">
        <span aria-hidden="true" className="w-12 h-[2px] rounded-full bg-ash/50" />
        <span className="sr-only">No access</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center w-24 h-24 rounded-full"
      style={{ background: level === 'full' ? '#E6136C' : 'rgba(230,19,108,0.16)' }}
      title={level === 'full' ? 'Full access' : 'Read only'}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path
          d="M2 6.2 L4.8 9 L10 3.4"
          fill="none"
          stroke={level === 'full' ? '#ffffff' : '#E6136C'}
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="sr-only">{level === 'full' ? 'Full access' : 'Read only'}</span>
    </span>
  );
};

const AccessMatrix: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`min-w-0 ${className}`}>
    {/* Fits rather than scrolls. A minimum width plus an overflow container
        looked right but pushed the page itself sideways, because every
        ancestor would have needed `min-w-0` to permit the shrink. Two mark
        columns and a wrapping label column fit 320px directly, which removes
        the whole class of problem. */}
    <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">
          Capabilities by role. A blank cell means no access.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="text-left pb-16 pr-8 w-auto" />
            <th scope="col" className="pb-16 px-4 w-[68px] sm:w-[96px]">
              <code className="text-caption font-mono uppercase tracking-[0.08em] text-slate">
                regulator
              </code>
            </th>
            <th scope="col" className="pb-16 px-4 w-[68px] sm:w-[96px]">
              <code className="text-caption font-mono uppercase tracking-[0.08em] text-slate">
                admin
              </code>
            </th>
          </tr>
        </thead>
        <tbody>
          {CAPABILITIES.map((c, i) => (
            <tr key={c.label} className={i % 2 ? 'bg-mist/40' : ''}>
              <th
                scope="row"
                className="text-left text-caption font-sohne text-ink font-400 py-12 pr-8 pl-12
                           first:rounded-l-inputs"
              >
                {c.label}
              </th>
              <td className="text-center py-12 px-4">
                <Mark level={c.regulator} />
              </td>
              <td className="text-center py-12 px-4 last:rounded-r-inputs">
                <Mark level={c.admin} />
              </td>
            </tr>
          ))}
        </tbody>
    </table>

    <div className="flex flex-wrap gap-x-24 gap-y-8 mt-20">
      {[
        { l: 'Full', level: 'full' as Level },
        { l: 'Read only', level: 'read' as Level },
        { l: 'No access', level: 'none' as Level },
      ].map((k) => (
        <span key={k.l} className="inline-flex items-center gap-8 text-caption font-sohne text-slate">
          <Mark level={k.level} />
          {k.l}
        </span>
      ))}
    </div>

    <p className="text-caption font-sohne text-ash mt-20 max-w-prose">
      The last two rows are the ones worth reading. No role can reach a payer&rsquo;s identity,
      and no role can move money — those are not permissions that happen to be switched off, they
      are capabilities the system does not have.
    </p>
  </div>
);

export default AccessMatrix;
