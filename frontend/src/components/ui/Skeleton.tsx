import React from 'react';

/**
 * Loading placeholder shaped like the content it replaces.
 *
 * "Loading merchants..." tells someone the page is busy and nothing else.
 * A skeleton tells them what is coming and roughly how much of it, so the
 * layout does not jump when it arrives. It also removes a whole class of
 * flat grey text from the interface.
 */

export const SkeletonLine: React.FC<{ w?: string; className?: string }> = ({
  w = '100%',
  className = '',
}) => (
  <span
    className={`block h-12 rounded-full bg-mist animate-shimmer ${className}`}
    style={{ width: w }}
    aria-hidden="true"
  />
);

interface SkeletonProps {
  /** How many rows of content to suggest. */
  rows?: number;
  /** Reserve space for a leading circle, e.g. an avatar or status dot. */
  avatar?: boolean;
  className?: string;
  label?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({
  rows = 3,
  avatar = false,
  className = '',
  label = 'Loading',
}) => (
  <div className={className} role="status" aria-busy="true" aria-label={label}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-16 py-16 border-b border-mist last:border-0">
        {avatar && <span className="w-40 h-40 rounded-full bg-mist animate-shimmer shrink-0" aria-hidden="true" />}
        <div className="flex-1 space-y-8">
          {/* Varying widths so it reads as content rather than a loading bar. */}
          <SkeletonLine w={`${68 - (i % 3) * 12}%`} />
          <SkeletonLine w={`${44 - (i % 2) * 10}%`} className="h-8 opacity-60" />
        </div>
        <SkeletonLine w="64px" className="shrink-0 opacity-60" />
      </div>
    ))}
  </div>
);

export default Skeleton;
