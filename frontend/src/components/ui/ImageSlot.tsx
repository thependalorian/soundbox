import React from 'react';
import mark from '../../assets/brand/buffr-mark.png';

interface ImageSlotProps {
  /** What the finished image must show. This is the brief, not a caption. */
  brief: string;
  /** Framing, treatment, or what to avoid. */
  direction?: string;
  /** e.g. "3:2", "16:9", "1:1". Reserves the right space so layout is final. */
  ratio?: string;
  /** Where it will be used, for whoever fills it. */
  slot?: string;
  className?: string;
}

const RATIOS: Record<string, string> = {
  '1:1': 'aspect-square',
  '3:2': 'aspect-[3/2]',
  '4:3': 'aspect-[4/3]',
  '16:9': 'aspect-video',
};

/**
 * A reserved image slot carrying its own art direction.
 *
 * Hand-drawn scenes of people and places were tried here and were not good
 * enough to ship — a weak illustration reads as amateur in a way that empty
 * space does not, and it quietly lowers the perceived quality of everything
 * around it.
 *
 * So the space is reserved honestly instead. Each slot states what belongs
 * there and how it should be framed, which means the layout is already final
 * and a photographer or illustrator can work straight from the page. The
 * `media_assets` table exists to receive the results.
 */
const ImageSlot: React.FC<ImageSlotProps> = ({
  brief,
  direction,
  ratio = '3:2',
  slot,
  className = '',
}) => (
  <figure
    // The brief stays in the DOM, on the element, so the art direction is
    // never lost — it simply is not printed on a page a customer reads.
    title={direction ? `${brief} — ${direction}` : brief}
    aria-label={brief}
    role="img"
    className={`${RATIOS[ratio] ?? RATIOS['3:2']} w-full rounded-cards rounded-br-none overflow-hidden bg-brand-gradient-soft relative flex items-center justify-center ${className}`}
  >
    {/* A brand panel, not a wireframe. Nine of these were rendering on the
        public site with "3:2 · Landing hero" and full production notes
        visible to visitors — the page looked unfinished in a way the work
        behind it is not. */}
    <img
      src={mark}
      alt=""
      aria-hidden="true"
      className="w-[26%] max-w-[130px] opacity-[0.34]"
    />
    <span className="sr-only">{slot ?? brief}</span>
  </figure>
);

export default ImageSlot;
