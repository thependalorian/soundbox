import React from 'react';
import { Link, LinkProps } from 'react-router-dom';

interface TextLinkProps extends LinkProps {
  arrow?: boolean;
}

/**
 * Lowest-emphasis interactive element per the style reference: no
 * background/border, underline only on hover. The arrow suffix is part of
 * the label, not a separate icon glyph.
 */
const TextLink: React.FC<TextLinkProps> = ({ arrow = true, className = '', children, ...rest }) => {
  return (
    <Link
      className={`inline-flex items-center gap-4 text-body font-sohne text-ink py-20 hover:underline ${className}`}
      {...rest}
    >
      {children}
      {arrow && <span aria-hidden="true">&rarr;</span>}
    </Link>
  );
};

export default TextLink;
