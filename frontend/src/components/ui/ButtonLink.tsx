import React from 'react';
import { Link } from 'react-router-dom';
import { BUTTON_BASE, BUTTON_VARIANTS, ButtonVariant } from './buttonStyles';

/**
 * A router link that looks and behaves exactly like a `Button`.
 *
 * Seven pages had pasted their own CTA classes onto a `Link` because the
 * `Button` component only rendered a `<button>`. Every one of them missed
 * the brand gradient when it landed, which is the argument for this
 * existing: a call to action should not look different because of which
 * element happens to carry it.
 *
 * Styling is shared with `Button` through `buttonStyles`, so the two cannot
 * drift.
 */

interface ButtonLinkProps {
  to: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
  /** Renders the nested arrow. Off by default: an arrow on every action makes
   *  none of them read as the forward one. */
  arrow?: boolean;
}

/**
 * The trailing arrow sits inside its own disc rather than beside the label.
 *
 * A naked arrow next to text reads as punctuation. Enclosed, it becomes a
 * second object inside the first, and moving it a couple of pixels on hover
 * gives the button internal tension — the label holds still while the arrow
 * leans in the direction it is promising to go.
 */
const Arrow: React.FC = () => (
  <span
    aria-hidden="true"
    className="inline-flex items-center justify-center w-24 h-24 -mr-8 rounded-full
               bg-paper/20 transition-transform duration-300 ease-brand
               group-hover:translate-x-2 group-hover:-translate-y-[1px]
               motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
  >
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 9.5 L9.5 2.5 M4.5 2.5 h5 v5" stroke="currentColor"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

const ButtonLink: React.FC<ButtonLinkProps> = ({
  to,
  variant = 'filled',
  className = '',
  children,
  arrow = false,
}) => (
  <Link to={to} className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`}>
    {variant === 'ghost' ? (
      <span>{children}</span>
    ) : (
      <>
        {children}
        {arrow && <Arrow />}
      </>
    )}
  </Link>
);

export default ButtonLink;
