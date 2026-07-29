import React from 'react';

interface TagProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Ghost category label — intentionally weightless (no background, no
 * border). A typographic tag, not a badge.
 */
const Tag: React.FC<TagProps> = ({ children, className = '' }) => (
  <span className={`text-caption font-sohne text-ash ${className}`}>{children}</span>
);

export default Tag;
