import React from 'react';
import mark from '../../assets/brand/buffr-mark.png';

/**
 * The opening section of a public page.
 *
 * Every page previously opened with a centred `h1` on a short blush band,
 * visually identical to the sections beneath it, so nothing announced that a
 * page had started. A hero has to be distinguishable from body content or it
 * is not a hero — it is the first paragraph in a larger typeface.
 *
 * **Heroes have a height floor, not just padding.** `min-h-hero` (440px), or
 * `min-h-hero-lg` (620px) on the home page. Padding alone let a one-word
 * headline like "Trust" produce a hero shorter than the section under it.
 *
 * **Each hero must look different from the others.** Until photography
 * lands, every backdrop would otherwise render the same gradient panel with
 * the same mark in the same place — six identical heroes, which defeats
 * the point of having one. So the placeholder varies by `tone`: the gradient
 * angle, the mark's position and scale, and the surface all shift per
 * page. When a real photograph is supplied to `backdrop`, it replaces the
 * placeholder entirely and the variation stops mattering.
 *
 * **The scrim is not optional once a photo lands.** White type over an
 * unscrimmed photograph would break the guarantee in docs/design-system.md
 * that the worst text pair in the system is 4.54:1. Copy is full white,
 * never a reduced opacity — 90% white over the coral end measures 3.64:1.
 */

export type HeroTone = 'trader' | 'oversight' | 'mechanism' | 'assurance' | 'restraint' | 'origin';

interface PageHeroProps {
  /** A string for most pages. The home page passes a fragment so the
   *  rotating audience word can sit inside the headline without breaking
   *  the "full white, never reduced opacity" contrast rule — it is styled
   *  with `italic`, never a lighter colour. */
  title: React.ReactNode;
  lead?: string;
  /** Small label above the headline. Also what makes each hero legible as a
   *  distinct place when the backdrops are still placeholders. */
  eyebrow?: string;
  /** A real photograph. When absent the tone-specific placeholder renders. */
  backdrop?: string;
  size?: 'medium' | 'large';
  tone?: HeroTone;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Per-page placeholder treatment. Surface and sheen are named tokens in
 * `tailwind.config.js` (`bg-hero-*`, `bg-hero-sheen-*`) rather than literals
 * here — the same rule the rest of the palette follows, and the one this
 * component broke on a first pass. Mark placement stays as layout classes:
 * position is structural, not a colour, so it belongs with the component
 * that uses it rather than in the token file.
 *
 * **The mark has to stay mostly on-screen.** The first pass pushed several
 * marks off the visible box with large negative offsets (`-bottom-[220px]`
 * on a 640px mark, for one), which cropped them down to a sliver at typical
 * hero heights — those pages read as having no watermark at all beside the
 * oversight tone, where the mark sat fully in frame. Positions below keep
 * each tone's personality (size, corner, how close it sits) but pull every
 * mark back inside the box, and opacity is normalised to a band (0.10–0.16)
 * narrow enough that no tone reads as noticeably fainter than another.
 */
const TONES: Record<HeroTone, { surface: string; sheen: string; mark: string }> = {
  // Home: the mark large and low, the gradient rising.
  origin: {
    surface: 'bg-hero-origin',
    sheen: 'bg-hero-sheen-origin',
    mark: 'w-[380px] bottom-[4%] right-[2%] opacity-[0.16]',
  },
  // Trader tone: warm, the mark close and to the left. Unused by the current
  // page set, kept because the token family is referenced by the design system.
  trader: {
    surface: 'bg-hero-trader',
    sheen: 'bg-hero-sheen-trader',
    mark: 'w-[300px] top-[6%] left-[2%] opacity-[0.14]',
  },
  // Oversight: cooler and deeper, the mark small and high — institutional.
  oversight: {
    surface: 'bg-hero-oversight',
    sheen: 'bg-hero-sheen-oversight',
    mark: 'w-[300px] top-[24px] right-[6%] opacity-[0.12]',
  },
  // How it works: the mark centred and wide, like a diagram behind the type.
  mechanism: {
    surface: 'bg-hero-mechanism',
    sheen: 'bg-hero-sheen-mechanism',
    mark: 'w-[420px] bottom-[2%] left-1/2 -translate-x-1/2 opacity-[0.12]',
  },
  // Assurance: plum-led and still, the mark barely there.
  assurance: {
    surface: 'bg-hero-assurance',
    sheen: 'bg-hero-sheen-assurance',
    mark: 'w-[260px] bottom-[8%] right-[8%] opacity-[0.12]',
  },
  // Privacy: the quietest of the six, deliberately — smaller and lower
  // opacity than the others, but still fully in frame.
  restraint: {
    surface: 'bg-hero-restraint',
    sheen: 'bg-hero-sheen-restraint',
    mark: 'w-[220px] top-1/2 -translate-y-1/2 right-[4%] opacity-[0.10]',
  },
};

const PageHero: React.FC<PageHeroProps> = ({
  title,
  lead,
  eyebrow,
  backdrop,
  size = 'medium',
  tone = 'origin',
  children,
  className = '',
}) => {
  const t = TONES[tone];
  const large = size === 'large';

  return (
    <section
      className={`relative isolate overflow-hidden ${
        large ? 'min-h-hero-lg' : 'min-h-hero'
      } flex items-center ${backdrop ? 'bg-plum-deep' : t.surface} ${className}`}
    >
      {backdrop ? (
        <>
          <img
            src={backdrop}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-10 w-full h-full object-cover"
          />
          {/* Without this the headline sits on whatever the photograph
              happens to be, and contrast becomes luck. */}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-plum-deep/75" />
        </>
      ) : (
        <>
          <div aria-hidden="true" className={`absolute inset-0 -z-10 ${t.sheen}`} />
          <img
            src={mark}
            alt=""
            aria-hidden="true"
            className={`pointer-events-none absolute -z-10 max-w-none ${t.mark}`}
          />
        </>
      )}

      <div
        className={`relative max-w-content mx-auto px-24 w-full text-center ${
          large ? 'py-128' : 'py-96'
        }`}
      >
        {eyebrow && (
          // A pill rather than bare tracked caps. Floating text above a
          // headline reads as a stray line; enclosed, it reads as a label
          // belonging to the thing beneath it.
          <p className="inline-flex items-center rounded-full border border-paper/25
                        bg-paper/10 px-16 py-4 mb-20
                        text-caption font-sohne font-500 text-paper/90
                        uppercase tracking-[0.18em]">
            {eyebrow}
          </p>
        )}
        {/* The display size steps up at `xl`, not at `md`.
            `md:text-display` put 90px type on any viewport from 768px, and a
            headline of ordinary length at 90px is about 1,050px wide — wider
            than the 1,200px content column has room for once padding is taken
            off, on every laptop screen. The result was a clipped first line,
            which is the one thing a hero cannot survive.
            `break-words` is the backstop for a long word at a narrow width. */}
        <h1
          className={`font-signifier text-paper break-words ${
            large
              ? 'text-heading md:text-heading-lg xl:text-display'
              : 'text-heading md:text-heading-lg'
          }`}
        >
          {title}
        </h1>
        {lead && (
          <p
            className={`font-sohne text-paper mt-24 mx-auto ${
              large ? 'text-body-lg max-w-[640px]' : 'text-body-lg max-w-[600px]'
            }`}
          >
            {lead}
          </p>
        )}
        {children}
      </div>
    </section>
  );
};

export default PageHero;
