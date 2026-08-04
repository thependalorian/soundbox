import React from 'react';

/**
 * The data path, drawn: a payment settles between institutions, and only
 * afterwards does anything reach this platform.
 *
 * **The boundary is the whole point of the drawing.** Said in prose, "we are
 * an observer" is a claim a reader has to take on trust. Drawn, the platform
 * is visibly downstream of a completed payment with a one-way arrow into it —
 * the reader can see there is no return path, which is the same thing the
 * architecture guarantees.
 *
 * Scales by `viewBox` rather than fixed dimensions, so it is legible from a
 * 320px phone to a wide desktop without a second asset. Labels drop out below
 * `sm` via a CSS class rather than a second SVG, because two drawings of the
 * same diagram drift.
 */
const ObserverDiagram: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 720 260"
    role="img"
    aria-label="A payment clears and settles between institutions on the national rails. Afterwards, transaction-pattern data is shared under agreement with Buffr Intelligence, which analyses it. No path runs back from the platform to the payment."
    className={`w-full h-auto ${className}`}
  >
    <defs>
      <linearGradient id="obs-brand" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#F15A29" />
        <stop offset="55%" stopColor="#E91673" />
        <stop offset="100%" stopColor="#E6136C" />
      </linearGradient>
      <marker id="obs-arrow" viewBox="0 0 10 10" refX="9" refY="5"
        markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="#C0B2B8" />
      </marker>
    </defs>

    {/* The payment, complete before anything here is involved. */}
    <rect x="8" y="52" width="300" height="120" rx="14" fill="#FDEEF2" />
    <text x="28" y="84" className="fill-plum" fontSize="15" fontWeight="600">
      On the rails
    </text>
    <text x="28" y="110" className="fill-slate" fontSize="13">
      A payment is cleared and
    </text>
    <text x="28" y="130" className="fill-slate" fontSize="13">
      settled between institutions.
    </text>
    <text x="28" y="154" className="fill-ash" fontSize="12">
      Final before we hear of it.
    </text>

    {/* The one-way hand-off. */}
    <line x1="316" y1="112" x2="404" y2="112" stroke="#C0B2B8" strokeWidth="2"
      markerEnd="url(#obs-arrow)" />
    <text x="360" y="100" textAnchor="middle" className="fill-ash" fontSize="11">
      under
    </text>
    <text x="360" y="134" textAnchor="middle" className="fill-ash" fontSize="11">
      agreement
    </text>

    {/* The platform. */}
    <rect x="412" y="52" width="300" height="120" rx="14" fill="url(#obs-brand)" />
    <text x="432" y="84" fill="#ffffff" fontSize="15" fontWeight="600">
      Buffr Intelligence
    </text>
    <text x="432" y="110" fill="#ffffff" fontSize="13" opacity="0.92">
      Scores, measures and reports
    </text>
    <text x="432" y="130" fill="#ffffff" fontSize="13" opacity="0.92">
      on what already happened.
    </text>
    <text x="432" y="154" fill="#ffffff" fontSize="12" opacity="0.78">
      Holds no funds.
    </text>

    {/* The absent return path. Drawn as a crossed, dashed line because an
        absence shown is more convincing than an absence asserted — a reader
        looks for the arrow back, and finds it explicitly ruled out. */}
    <line x1="404" y1="206" x2="316" y2="206" stroke="#C0B2B8" strokeWidth="2"
      strokeDasharray="5 5" />
    <line x1="352" y1="194" x2="368" y2="218" stroke="#F15A29" strokeWidth="2.5"
      strokeLinecap="round" />
    <line x1="368" y1="194" x2="352" y2="218" stroke="#F15A29" strokeWidth="2.5"
      strokeLinecap="round" />
    <text x="360" y="240" textAnchor="middle" className="fill-ash" fontSize="11">
      no path back
    </text>
  </svg>
);

export default ObserverDiagram;
