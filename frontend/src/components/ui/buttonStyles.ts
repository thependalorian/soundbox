/**
 * Shared button styling, so `Button` and `ButtonLink` cannot drift apart.
 *
 * Every call to action in the product carries the brand gradient. It is the
 * most recognisable element in the identity, and an action is the moment the
 * brand should be most present.
 *
 * The **darkened** sweep is used throughout, not the display one. White on
 * the display magenta measures 4.49:1 and on the display coral 3.37:1,
 * against the 4.5:1 WCAG AA requires at this size. Darkened, the whole sweep
 * clears it — 4.54 at the coral end, 5.38 at the magenta end.
 *
 * `ghost` is the secondary action and is gradient-*bordered* rather than
 * gradient-filled: two filled gradients side by side leave a reader unable to
 * tell which action is the main one. It still reads as brand, at lower
 * weight, which is what a secondary action should do.
 */

export type ButtonVariant = 'filled' | 'ghost';

export const BUTTON_BASE =
  'inline-flex items-center justify-center rounded-buttons px-20 py-8 ' +
  'text-body font-sohne transition-opacity';

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  filled:
    'bg-brand-gradient-aa text-paper border-0 hover:opacity-90 ' +
    'disabled:opacity-40 disabled:hover:opacity-40',

  // The border is the gradient, achieved with a padded gradient background
  // and an inset paper fill. `text-sienna` is the text-safe brand pink
  // (6.48:1 on white), not the display magenta, which would fail.
  ghost:
    'bg-brand-gradient-aa text-sienna p-[1.5px] hover:opacity-80 ' +
    'disabled:opacity-40 [&>span]:bg-paper [&>span]:rounded-buttons ' +
    '[&>span]:px-20 [&>span]:py-8 [&>span]:w-full [&>span]:text-center',
};
