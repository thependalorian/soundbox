import React from 'react';

type Band = 'low' | 'medium' | 'high';

interface ConfidenceBadgeProps {
  band: Band;
  /** 0-1. Shown as secondary detail, never as the primary signal. */
  probability?: number;
  className?: string;
}

const BAND_LABEL: Record<Band, string> = {
  low: 'Low confidence',
  medium: 'Medium confidence',
  high: 'High confidence',
};

const BAND_TONE: Record<Band, string> = {
  low: 'bg-mist text-slate',
  medium: 'bg-status-warning/10 text-status-warning',
  high: 'bg-status-danger/10 text-status-danger',
};

/**
 * Confidence display, categorical first.
 *
 * Operators cannot reliably act on "0.72" — they can act on "high". Kore
 * (Designing Human-Centric AI Experiences, p157) is explicit that friendly
 * bands beat raw percentages, and that excess granularity actively confuses:
 * nobody can say whether 84.3% and 85% differ meaningfully. So the band is
 * the headline and the number is de-emphasised supporting detail, present
 * for the analyst who wants to audit it but never the thing read first.
 */
const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ band, probability, className = '' }) => (
  <span className={`inline-flex items-baseline gap-8 ${className}`}>
    <span
      className={`inline-flex items-center rounded-buttons px-12 py-4 text-caption font-sohne font-450 ${BAND_TONE[band]}`}
    >
      {BAND_LABEL[band]}
    </span>
    {probability !== undefined && (
      <span className="text-caption font-sohne text-ash tabular-nums">
        {(probability * 100).toFixed(0)}% score
      </span>
    )}
  </span>
);

export default ConfidenceBadge;
