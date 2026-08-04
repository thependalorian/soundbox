import React, { useEffect, useRef, useState } from 'react';

/**
 * Scroll-entry motion: a heavy, slightly damped fade-up as an element enters.
 *
 * Three constraints shape the implementation, and each rules out the obvious
 * approach:
 *
 * - **`IntersectionObserver`, never a scroll listener.** A scroll handler
 *   fires continuously and forces layout on every frame; on a mid-range
 *   Android that alone costs more than the animation is worth.
 * - **`transform` and `opacity` only.** Animating height or margin re-runs
 *   layout each frame. These two are composited on the GPU and cost nothing.
 * - **Reduced motion is honoured, not approximated.** Someone who has asked
 *   the system for less motion gets the element outright, already in place —
 *   not a faster version of the same movement.
 *
 * It also reveals once and disconnects. Re-animating on every scroll past is
 * the tell of a site that mistakes motion for polish; on a page a supervisor
 * is reading carefully, content that keeps moving is content that keeps
 * interrupting.
 */
const Reveal: React.FC<{
  children: React.ReactNode;
  /** Stagger within a group, in milliseconds. */
  delay?: number;
  className?: string;
  /** `as` keeps the semantic element right — a reveal is not always a div. */
  as?: 'div' | 'section' | 'li' | 'figure';
}> = ({ children, delay = 0, className = '', as: Tag = 'div' }) => {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      // Fires a little before the element reaches the fold, so the movement
      // has finished by the time it is actually being read.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`transition-[opacity,transform] duration-700 ease-brand motion-reduce:transition-none ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-24'
      } ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
