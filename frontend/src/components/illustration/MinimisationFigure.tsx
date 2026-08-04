import React from 'react';

/**
 * What a payment record carries, and how little of it is kept.
 *
 * **The argument is a subtraction, so the drawing should be one.** Prose has
 * to describe data minimisation as a policy; drawn as a full record with most
 * of it struck through, it becomes a quantity — a reader counts four kept
 * fields against seven discarded and understands the posture without reading
 * the paragraph.
 *
 * The struck fields are the ones a payment rail genuinely carries and this
 * platform genuinely does not need. Listing plausible-but-invented fields
 * would make the drawing decorative; these are the real ones.
 */

const KEPT = [
  { field: 'Timestamp', why: 'the target the models predict' },
  { field: 'Amount and currency', why: 'value, exactly' },
  { field: 'Use case', why: 'grant, counter sale, agent cash' },
  { field: 'Region and constituency', why: 'reach, at the level it is asked about' },
];

const DISCARDED = [
  'Full name',
  'Phone number',
  'National ID',
  'Account number',
  'Physical address',
  'Device identifier',
  'Message or reference text',
];

const MinimisationFigure: React.FC<{ className?: string }> = ({ className = '' }) => (
  <figure className={className}>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
      {/* Kept. */}
      <div className="rounded-shell bg-blush/60 p-6">
        <div className="rounded-shellInner bg-paper h-full p-24">
          <p className="inline-flex rounded-full bg-blush px-12 py-4 text-caption font-sohne
                        uppercase tracking-[0.1em] text-sienna">
            Kept
          </p>
          <ul className="mt-20 space-y-16">
            {KEPT.map((k) => (
              <li key={k.field} className="flex gap-12">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"
                  className="shrink-0 mt-2">
                  <circle cx="9" cy="9" r="9" fill="#E6136C" fillOpacity="0.12" />
                  <path d="M5 9.2 L7.8 12 L13 6.6" fill="none" stroke="#E6136C"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>
                  <span className="block text-body font-sohne text-ink">{k.field}</span>
                  <span className="block text-caption font-sohne text-ash">{k.why}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Discarded. */}
      <div className="rounded-shell bg-mist/70 p-6">
        <div className="rounded-shellInner bg-paper h-full p-24">
          <p className="inline-flex rounded-full bg-mist px-12 py-4 text-caption font-sohne
                        uppercase tracking-[0.1em] text-slate">
            Never requested
          </p>
          <ul className="mt-20 space-y-12">
            {DISCARDED.map((d) => (
              <li key={d} className="flex items-center gap-12">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"
                  className="shrink-0">
                  <circle cx="9" cy="9" r="9" fill="#C0B2B8" fillOpacity="0.22" />
                  <path d="M6 6 L12 12 M12 6 L6 12" fill="none" stroke="#705C67"
                    strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                {/* Struck through, not greyed out. Grey reads as "less
                    important"; a rule through it reads as removed. */}
                <span className="text-body font-sohne text-ash line-through decoration-ash/60">
                  {d}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
    <figcaption className="text-caption font-sohne text-ash mt-24 max-w-prose">
      Participants are linked across their own payments by a rotating token, which is enough for
      every measure the models compute and not enough to identify anyone.
    </figcaption>
  </figure>
);

export default MinimisationFigure;
