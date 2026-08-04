import React from 'react';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusPillProps {
  label: string;
  tone: Tone;
  className?: string;
}

const TONES: Record<Tone, string> = {
  success: 'bg-status-success/10 text-status-success',
  warning: 'bg-status-warning/10 text-status-warning',
  danger: 'bg-status-danger/10 text-status-danger',
  info: 'bg-status-info/10 text-status-info',
  neutral: 'bg-mist text-slate',
};

/**
 * The one place operational status color is used — business/transaction/
 * anomaly-risk pips. Never used for brand chrome (headlines, nav, buttons).
 */
const StatusPill: React.FC<StatusPillProps> = ({ label, tone, className = '' }) => (
  <span
    className={`inline-flex items-center rounded-buttons px-12 py-4 text-caption font-sohne font-450 capitalize ${TONES[tone]} ${className}`}
  >
    {label}
  </span>
);

export default StatusPill;
