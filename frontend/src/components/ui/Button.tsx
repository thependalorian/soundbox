import React from 'react';
import { BUTTON_BASE, BUTTON_VARIANTS, ButtonVariant } from './buttonStyles';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * Pill button: fully rounded, no shadow.
 *
 * `filled` carries the brand gradient, which is where it earns its place —
 * a primary action is a brand moment, and the gradient is the single most
 * recognisable element in the identity. It is deliberately *not* used on
 * charts or status, where a gradient would imply a scale that does not exist.
 *
 * It uses the **darkened** gradient. White on the display magenta measures
 * 4.49:1 and on the display coral 3.37:1, against the 4.5:1 WCAG AA requires
 * for text this size. The display hues are a display palette meeting body
 * copy; the darkened sweep is the same hues, readable.
 *
 * `ghost` is secondary: plum outline, meant to sit beside a filled button on
 * the same row rather than replace it. Two gradients in one row would leave
 * a reader unable to tell which action is the main one.
 */
const Button: React.FC<ButtonProps> = ({ variant = 'filled', className = '', children, ...rest }) => (
  <button className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...rest}>
    {variant === 'ghost' ? <span>{children}</span> : children}
  </button>
);

export default Button;
