import React from 'react';

type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

interface MeterProps {
  /** 0-100. Clamped, so a bad computation cannot overflow the track. */
  value: number;
  tone?: Tone;
  size?: 'sm' | 'lg';
  /** Fills the remainder in a second tone, for share-of-total bars. */
  remainder?: boolean;
  label?: string;
  className?: string;
}

const FILL: Record<Tone, string> = {
  accent: 'bg-sienna',
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  danger: 'bg-status-danger',
  neutral: 'bg-slate',
};

/**
 * Horizontal proportion bar.
 *
 * This markup had been hand-written in six places — validation pass rates,
 * wallet share, battery level, rule contributions, regional coverage — each
 * with slightly different heights and rounding. One component keeps them
 * consistent and makes the tone carry meaning: accent for a neutral
 * proportion, warning/danger only where the value is itself a problem.
 *
 * Heights come from the `meter` spacing tokens rather than raw utilities so
 * a bar's weight is a system decision, not a per-call-site one.
 */
const Meter: React.FC<MeterProps> = ({
  value,
  tone = 'accent',
  size = 'sm',
  remainder = false,
  label,
  className = '',
}) => {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const track = size === 'lg' ? 'h-meter-lg' : 'h-meter';

  return (
    <div
      className={`${track} bg-mist rounded-full overflow-hidden flex ${className}`}
      role="img"
      aria-label={label ?? `${pct.toFixed(0)} percent`}
    >
      <div className={`h-full ${FILL[tone]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      {remainder && <div className="h-full bg-smoke/40" style={{ width: `${100 - pct}%` }} />}
    </div>
  );
};

export default Meter;
