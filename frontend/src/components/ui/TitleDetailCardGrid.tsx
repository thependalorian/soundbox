import React from 'react';
import Card from './Card';

interface Item {
  title: string;
  detail: string;
}

interface TitleDetailCardGridProps {
  items: readonly Item[];
  /** The grid wrapper's own classes — column count and gap differ per call site. */
  gridClassName: string;
  cardVariant?: 'neutral' | 'accent' | 'elevated' | 'brand';
  cardClassName?: string;
  titleClassName?: string;
  detailClassName?: string;
}

/**
 * The title-and-detail card, previously pasted at eight call sites across
 * the public pages with the same two variants (elevated/subheading and
 * neutral/body). One component, so a change to either variant lands
 * everywhere at once.
 */
const TitleDetailCardGrid: React.FC<TitleDetailCardGridProps> = ({
  items,
  gridClassName,
  cardVariant = 'elevated',
  cardClassName = 'p-24',
  titleClassName = 'text-subheading font-signifier text-ink',
  detailClassName = 'text-caption font-sohne text-slate mt-8',
}) => (
  <div className={gridClassName}>
    {items.map((item) => (
      <Card key={item.title} variant={cardVariant} className={cardClassName}>
        <h3 className={titleClassName}>{item.title}</h3>
        <p className={detailClassName}>{item.detail}</p>
      </Card>
    ))}
  </div>
);

export default TitleDetailCardGrid;
