import React from 'react';

export type TrustMarkKind = 'record' | 'why' | 'access' | 'minimal' | 'shield';

/**
 * Small drawn marks anchoring assurance sections.
 *
 * Extracted from `TrustPage`, where these were inline, because the privacy
 * page needs the same visual language — two pages making related promises
 * should not look like different products.
 *
 * Peach ground with sienna figure: the system's one warm pairing, used here
 * because these sections are the editorial heart of the trust argument.
 */
const TrustMark: React.FC<{ kind: TrustMarkKind; className?: string }> = ({
  kind,
  className = '',
}) => (
  <svg
    width="44"
    height="44"
    viewBox="0 0 44 44"
    aria-hidden="true"
    className={className}
  >
    <circle cx="22" cy="22" r="21" fill="#FDEEF2" />

    {/* An unbroken record: three rules, none of them erased */}
    {kind === 'record' && (
      <>
        <rect x="13" y="12" width="18" height="3" rx="1.5" fill="#E6136C" />
        <rect x="13" y="20" width="18" height="3" rx="1.5" fill="#E6136C" />
        <rect x="13" y="28" width="11" height="3" rx="1.5" fill="#E6136C" />
      </>
    )}

    {/* A question mark: you can always ask why */}
    {kind === 'why' && (
      <>
        <path d="M18 17a4 4 0 1 1 5 4v3" fill="none" stroke="#E6136C" strokeWidth="3" strokeLinecap="round" />
        <circle cx="22" cy="31" r="2" fill="#E6136C" />
      </>
    )}

    {/* A lock: people see only what they should */}
    {kind === 'access' && (
      <>
        <rect x="14" y="21" width="16" height="12" rx="2.5" fill="#E6136C" />
        <path d="M18 21v-4a4 4 0 0 1 8 0v4" fill="none" stroke="#E6136C" strokeWidth="3" />
      </>
    )}

    {/* Most of the circle empty: we hold the least we can */}
    {kind === 'minimal' && (
      <>
        <circle cx="22" cy="22" r="11" fill="none" stroke="#E6136C" strokeWidth="2.5" strokeDasharray="3 4" />
        <circle cx="22" cy="22" r="4" fill="#E6136C" />
      </>
    )}

    {/* A shield: protection for the seller */}
    {kind === 'shield' && (
      <path d="M22 11l9 4v7c0 6-4 9.5-9 11-5-1.5-9-5-9-11v-7z" fill="#E6136C" />
    )}
  </svg>
);

export default TrustMark;
