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
}

const ButtonLink: React.FC<ButtonLinkProps> = ({
  to,
  variant = 'filled',
  className = '',
  children,
}) => (
  <Link to={to} className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`}>
    {variant === 'ghost' ? <span>{children}</span> : children}
  </Link>
);

export default ButtonLink;
