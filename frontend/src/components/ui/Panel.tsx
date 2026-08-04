import React from 'react';

/**
 * A nested surface: an inner core seated inside an outer shell.
 *
 * **Why two elements rather than one card with a border.** A single panel with
 * a 1px rule sits *on* the page. A core inset into a shell sits *in* it — the
 * shell's visible margin reads as a physical tray, and the concentric radii
 * (shell 32px, core 26px, with 6px of padding between) keep the two curves
 * parallel instead of fighting. It is the difference between a shape and an
 * object.
 *
 * The radii are tokens rather than arbitrary values precisely because they
 * have to stay in that relationship: change the padding and both must move.
 *
 * Used for the surfaces that carry an argument — the position table, the
 * capability set — and not for every card on a page. Nesting everything
 * flattens the effect back to nothing.
 */
const Panel: React.FC<{
  children: React.ReactNode;
  /** `brand` fills the core with the gradient, for the one panel per page
   *  that should dominate. */
  tone?: 'paper' | 'blush' | 'brand';
  className?: string;
}> = ({ children, tone = 'paper', className = '' }) => {
  const shell: Record<string, string> = {
    paper: 'bg-mist/70',
    blush: 'bg-blush/60',
    brand: 'bg-blush/70',
  };
  const core: Record<string, string> = {
    paper: 'bg-paper',
    blush: 'bg-blush-tint',
    brand: 'bg-brand-gradient-aa text-paper',
  };

  return (
    <div className={`rounded-shell ${shell[tone]} p-6 ${className}`}>
      <div
        className={`rounded-shellInner ${core[tone]} h-full ${
          // An inner highlight along the top edge, at an opacity that reads as
          // light catching an edge rather than as a visible white line.
          tone === 'brand' ? '' : 'shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default Panel;
