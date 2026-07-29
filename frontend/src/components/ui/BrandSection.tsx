import React from 'react';

/**
 * A section presented the way the brand presents one: a gradient bar across
 * the top of a blush panel.
 *
 * This is the single most characteristic layout in the brand assets — every
 * FAQ card is built this way — and reproducing it is what gives the identity
 * area rather than accents. An interface that uses only plum text and a
 * gradient button is faithful in colour and wrong in proportion: in the
 * source material the pale pink panel is the largest shape on the page.
 *
 * The bar carries the darkened gradient because its heading is white text at
 * reading size. The display gradient is for hairlines and large type, where
 * contrast is not the constraint.
 *
 * `eyebrow` renders the small numbered badge the brand uses to sequence
 * cards. It is optional — a badge with nothing to count is noise.
 */

interface BrandSectionProps {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}

const BrandSection: React.FC<BrandSectionProps> = ({
  title,
  eyebrow,
  children,
  className = '',
}) => (
  <section className={`rounded-cards rounded-br-none overflow-hidden bg-blush ${className}`}>
    <div className="bg-brand-gradient-aa flex items-center gap-16 px-24 py-16">
      {eyebrow && (
        <span className="shrink-0 rounded-images bg-plum-badge text-paper text-body font-sohne font-500 px-12 py-4 tabular-nums">
          {eyebrow}
        </span>
      )}
      <h2 className="text-subheading font-sohne font-500 text-paper">{title}</h2>
    </div>
    <div className="px-24 py-24">{children}</div>
  </section>
);

export default BrandSection;
