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

/**
 * Pressure feedback, not just a colour change.
 *
 * A button that only shifts opacity on hover feels like an image of a button.
 * Scaling fractionally down on press is the cheapest possible simulation of
 * something physically yielding, and it is the difference most people feel
 * without being able to name.
 *
 * `group` is declared here so a nested trailing icon can respond to the
 * parent's hover. `ease-brand` is the system's one curve — see the note on
 * it in tailwind.config.js.
 */
export const BUTTON_BASE =
  'group inline-flex items-center justify-center gap-8 rounded-buttons pl-20 pr-20 py-8 ' +
  'text-body font-sohne select-none ' +
  'transition-[opacity,transform] duration-300 ease-brand ' +
  'active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100';

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
