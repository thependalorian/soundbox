import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'neutral' | 'accent' | 'elevated' | 'brand';
}

/**
 * Surfaces.
 *
 * - `neutral` — the workhorse. A soft warm grey, not a cool one.
 * - `elevated` — white with a subtle shadow, for floating artifacts: charts,
 *   tables, the map.
 * - `brand` — the blush card the brand actually leads with. In every brand
 *   asset the largest single shape is a pale pink panel, and its square
 *   bottom-right corner is the shape signature. This is what gives the
 *   identity its area; without it an interface reads as plum text on white,
 *   which is faithful in colour and wrong in proportion.
 * - `accent` — a lighter blush tint, for a callout inside a neutral page.
 *
 * `brand` is meant to carry a whole section, not to be sprinkled. Two
 * competing pink panels on one screen cancel each other out.
 */
const Card: React.FC<CardProps> = ({ variant = 'neutral', className = '', children, ...rest }) => {
  const variants: Record<string, string> = {
    neutral: 'bg-mist rounded-cards',
    accent: 'bg-blush-tint rounded-cards',
    brand: 'bg-blush rounded-cards rounded-br-none',
    elevated: 'bg-paper rounded-elevatedCards shadow-subtle-3',
  };

  return (
    <div className={`${variants[variant]} ${className}`} {...rest}>
      {children}
    </div>
  );
};

export default Card;
