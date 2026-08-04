import React from 'react';

/**
 * The two-layer method, drawn: a screen that splits ordinary from unusual,
 * then a second pass that ranks severity within the unusual set only.
 *
 * **The split is the idea, and it is much easier to see than to read.** The
 * hard part of the method in prose is that the first layer is not a fraud
 * detector — it sorts, and the sorting is what makes the rare thing findable.
 * Drawn as a funnel with the wide branch discarded, that lands immediately.
 *
 * Proportions are indicative, not measured: the narrow branch is drawn
 * narrow because the point is that most activity leaves at the first step.
 * The figures beside it come from the notebook and are labelled as coming
 * from generated data wherever this is used.
 */
const TwoLayerDiagram: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 720 300"
    role="img"
    aria-label="All payments enter a first layer, a classifier that predicts submission time. Payments it classifies correctly are set aside as ordinary. The smaller set it gets wrong passes to a second layer, an isolation forest that ranks severity, and only the top of that ranking reaches a reviewer."
    className={`w-full h-auto ${className}`}
  >
    <defs>
      <linearGradient id="tl-brand" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#F15A29" />
        <stop offset="100%" stopColor="#E6136C" />
      </linearGradient>
      <marker id="tl-arrow" viewBox="0 0 10 10" refX="9" refY="5"
        markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="#C0B2B8" />
      </marker>
    </defs>

    {/* Everything arrives. */}
    <rect x="4" y="112" width="132" height="76" rx="12" fill="#FDEEF2" />
    <text x="70" y="142" textAnchor="middle" className="fill-plum" fontSize="14" fontWeight="600">
      Every
    </text>
    <text x="70" y="162" textAnchor="middle" className="fill-plum" fontSize="14" fontWeight="600">
      payment
    </text>

    <line x1="144" y1="150" x2="188" y2="150" stroke="#C0B2B8" strokeWidth="2" markerEnd="url(#tl-arrow)" />

    {/* Layer 1 — the screen. */}
    <rect x="196" y="100" width="150" height="100" rx="12" fill="url(#tl-brand)" />
    <text x="271" y="132" textAnchor="middle" fill="#ffffff" fontSize="12" opacity="0.85">
      LAYER 1
    </text>
    <text x="271" y="156" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="600">
      Screen
    </text>
    <text x="271" y="178" textAnchor="middle" fill="#ffffff" fontSize="11.5" opacity="0.9">
      predicts the time
    </text>

    {/* The wide branch: correctly classified, set aside. */}
    <path d="M354 132 C 392 132, 400 74, 438 74" fill="none" stroke="#C0B2B8"
      strokeWidth="12" strokeLinecap="round" opacity="0.5" />
    <rect x="446" y="44" width="264" height="60" rx="12" fill="#EDEBEC" />
    <text x="466" y="70" className="fill-slate" fontSize="13" fontWeight="600">
      Classified correctly — ordinary
    </text>
    <text x="466" y="90" className="fill-ash" fontSize="12">
      Sets the picture of what normal is.
    </text>

    {/* The narrow branch: misclassified, and the only thing that continues. */}
    <path d="M354 170 C 392 170, 400 218, 438 218" fill="none" stroke="#E6136C"
      strokeWidth="4" strokeLinecap="round" />
    <rect x="446" y="188" width="150" height="60" rx="12" fill="#3D1152" />
    <text x="521" y="212" textAnchor="middle" fill="#ffffff" fontSize="12" opacity="0.8">
      LAYER 2
    </text>
    <text x="521" y="234" textAnchor="middle" fill="#ffffff" fontSize="13.5" fontWeight="600">
      Rank severity
    </text>

    <line x1="604" y1="218" x2="642" y2="218" stroke="#C0B2B8" strokeWidth="2" markerEnd="url(#tl-arrow)" />
    <rect x="650" y="188" width="66" height="60" rx="12" fill="#FDEEF2" />
    <text x="683" y="212" textAnchor="middle" className="fill-plum" fontSize="12" fontWeight="600">
      A
    </text>
    <text x="683" y="230" textAnchor="middle" className="fill-plum" fontSize="12" fontWeight="600">
      person
    </text>

    <text x="400" y="284" textAnchor="middle" className="fill-ash" fontSize="11.5">
      The first layer never decides anything. It decides what is worth a second look.
    </text>
  </svg>
);

export default TwoLayerDiagram;
