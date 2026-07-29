import React from 'react';

interface EmptyStateProps {
  /** What the reader is looking at, stated as a fact rather than an absence. */
  title: string;
  /** Why it is empty, or what would fill it. */
  detail?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Empty state with a drawn mark.
 *
 * "No transactions yet" reports a void and leaves the reader nowhere. An
 * empty list usually means something specific — a device was never fitted,
 * a business was onboarded last week, a region has no coverage — and saying
 * *which* turns a dead end into information. The mark gives the space a
 * centre so it reads as a deliberate state rather than a failed render.
 */
const EmptyState: React.FC<EmptyStateProps> = ({ title, detail, action, className = '' }) => (
  <div className={`flex flex-col items-center text-center py-40 px-24 ${className}`}>
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" className="mb-16">
      <circle cx="28" cy="28" r="27" fill="none" stroke="#F6F1F2" strokeWidth="2" />
      {/* Three descending rules: the shape of a list that has nothing in it. */}
      <rect x="16" y="21" width="24" height="3" rx="1.5" fill="#F6F1F2" />
      <rect x="16" y="29" width="17" height="3" rx="1.5" fill="#F6F1F2" />
      <rect x="16" y="37" width="10" height="3" rx="1.5" fill="#F6F1F2" />
    </svg>
    <p className="text-body font-sohne text-ink">{title}</p>
    {detail && <p className="text-caption font-sohne text-slate mt-8 max-w-[320px]">{detail}</p>}
    {action && <div className="mt-16">{action}</div>}
  </div>
);

export default EmptyState;
