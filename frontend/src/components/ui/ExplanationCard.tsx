import Meter from './Meter';
import React, { useState } from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { AnomalyReason } from '../../types/soundbox';

interface ExplanationCardProps {
  reasons: AnomalyReason[];
  modelName?: string;
  modelVersion?: string;
  /** Whether a trained anomaly model contributed, vs rules alone. */
  modelAssisted?: boolean;
  className?: string;
}

/**
 * "Why this was flagged" — the reasons that actually fired, with their real
 * numbers.
 *
 * Two deliberate choices, both from Kore (Designing Human-Centric AI
 * Experiences, ch 4):
 *
 * - **Collapsed by default.** "Don't explain everything" (p137): a wall of
 *   reasoning on every row is noise. The disclosure mirrors the pattern on
 *   steep.app/ai, where model reasoning sits behind an expandable line.
 * - **States its scope.** "Make clear what the system can do" (p126) cuts
 *   both ways: a reviewer who assumes the score already accounts for
 *   onboarding checks or device tampering will overtrust it. Naming what
 *   the score covers is what keeps trust calibrated.
 */
const ExplanationCard: React.FC<ExplanationCardProps> = ({
  reasons,
  modelName,
  modelVersion,
  modelAssisted = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);

  if (!reasons.length) {
    return (
      <div className={`bg-mist rounded-cards p-20 ${className}`}>
        <p className="text-body font-sohne text-slate">
          No explanation was recorded for this alert. It predates explanation capture, and the
          reasoning cannot be reconstructed after the fact.
        </p>
      </div>
    );
  }

  const total = reasons.reduce((sum, r) => sum + r.contribution, 0);

  return (
    <div className={`bg-mist rounded-cards p-20 ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-4 text-body font-sohne text-ink"
      >
        <ChevronRightIcon
          className={`w-16 h-16 transition-transform ${open ? 'rotate-90' : ''}`}
        />
        Why this was flagged
        <span className="text-caption text-ash ml-4">
          ({reasons.length} {reasons.length === 1 ? 'signal' : 'signals'})
        </span>
      </button>

      {open && (
        <div className="mt-16 space-y-16">
          {reasons.map((reason) => (
            <div key={reason.code}>
              <div className="flex items-baseline justify-between gap-16">
                <span className="text-body font-sohne text-ink">{reason.label}</span>
                <span className="text-caption font-sohne text-ash tabular-nums shrink-0">
                  +{reason.contribution.toFixed(2)}
                </span>
              </div>
              <p className="text-caption font-sohne text-slate mt-4">{reason.detail}</p>
              {/* Contribution bar, scaled against the total so the relative
                  weight of each signal is legible at a glance. */}
              <Meter className="mt-8" value={total ? (reason.contribution / total) * 100 : 0} label={`${reason.label} contribution`} />
            </div>
          ))}

          <div className="pt-12 border-t border-paper space-y-4">
            <p className="text-caption font-sohne text-ash">
              Scored by {modelName ?? 'rule-based scorer'}
              {modelVersion ? ` v${modelVersion}` : ''}
              {modelAssisted ? ', with an anomaly model contributing' : ' (rules only)'}.
            </p>
            <p className="text-caption font-sohne text-ash">
              This score reads trading patterns only. Onboarding checks, device condition and
              counterparty history are each assessed on their own terms.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplanationCard;
