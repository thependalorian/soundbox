import React from 'react';

/**
 * The frame every chart on the public site sits in.
 *
 * Drawn from how data-tooling companies signal "this is a real measurement"
 * rather than how fraud vendors signal "trust us":
 *
 * - **Corner crop marks.** A technical-drawing convention. They cost four
 *   hairlines and they change how the contents read — a chart inside crop
 *   marks is a plate from a report, the same chart floating on a page is
 *   decoration.
 * - **A faint measuring grid.** The surface a chart is drawn on should look
 *   like a surface for drawing charts on. It is at 3% opacity, so it reads
 *   as texture rather than as gridlines competing with the data's own.
 * - **A monospace label and source line.** Monospace is the strongest single
 *   signal that a number came from a computation rather than a copywriter,
 *   and it is nearly free.
 *
 * **The source line is required, not optional.** Every figure on this site is
 * computed from generated data, and a chart that looks real is exactly the
 * one that needs to say where it came from. Making it a required prop means
 * a figure cannot ship without an answer.
 */
const Figure: React.FC<{
  /** Short technical label, rendered monospace. */
  label: string;
  /** Where the number came from. Required — see above. */
  source: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, source, children, className = '' }) => (
  <figure className={`relative min-w-0 ${className}`}>
    {/* Crop marks. Absolutely positioned and inert, so they never affect
        layout or intercept a pointer. */}
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      {[
        'top-0 left-0 border-t border-l',
        'top-0 right-0 border-t border-r',
        'bottom-0 left-0 border-b border-l',
        'bottom-0 right-0 border-b border-r',
      ].map((pos) => (
        <span key={pos} className={`absolute w-16 h-16 border-ash/40 ${pos}`} />
      ))}
    </span>

    <div
      className="rounded-images px-24 py-24 sm:px-32 min-w-0 overflow-hidden"
      style={{
        // A 20px measuring grid. Inline rather than a Tailwind utility
        // because it is one gradient used in one place, and a token for it
        // would imply it is part of the palette.
        backgroundImage:
          'linear-gradient(to right, rgba(61,17,82,0.05) 1px, transparent 1px),' +
          'linear-gradient(to bottom, rgba(61,17,82,0.05) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-24 gap-y-4 mb-20">
        <code className="text-caption font-mono uppercase tracking-[0.08em] text-slate">
          {label}
        </code>
        <code className="text-caption font-mono text-ash">{source}</code>
      </div>
      {children}
    </div>
  </figure>
);

export default Figure;
