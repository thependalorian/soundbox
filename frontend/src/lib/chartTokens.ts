/**
 * Colours for charts and inline SVG.
 *
 * Recharts and raw `<svg>` take literal colour values, so Tailwind classes
 * cannot reach them. Those literals had been pasted at a dozen call sites,
 * which meant the brand change missed every chart in the product until they
 * were hunted down by hand. Once, here, so the next palette change is one
 * file.
 *
 * **The brand gradient never appears in a chart.** It is the identity's most
 * recognisable element and it encodes nothing — using it on data would imply
 * a scale or a direction that does not exist. Charts get flat, deliberate
 * colours.
 *
 * The categorical series below are ordered by how distinguishable they are
 * from each other, not by brand hierarchy: a reader has to tell series three
 * from series four, and that matters more than which is more on-brand.
 */

/** The single data colour, for charts showing one measure. */
export const DATA = '#E6136C';

/** A muted companion, for a baseline or a comparison series. */
export const DATA_MUTED = '#C0B2B8';

/** Fill under a line, at low opacity. */
export const DATA_FILL = '#E6136C';
export const DATA_FILL_OPACITY = 0.08;

/**
 * Categorical series. Magenta and coral come from the brand; plum, teal and
 * slate are added because five brand-adjacent pinks would be indistinguishable
 * in a stacked bar. Teal is deliberately far from the brand hues so the fifth
 * series does not read as a shade of the first.
 */
export const SERIES = [
  '#E6136C', // brand magenta
  '#F15A29', // brand coral
  '#3D1152', // plum
  '#0E9F6E', // teal
  '#705C67', // slate
  '#D97706', // amber
] as const;

/** Chart chrome: axes, gridlines, tooltip borders. */
export const AXIS = '#675C62';
export const GRID = '#F6F1F2';
export const TOOLTIP_BORDER = '#F6F1F2';

/** Reused so tooltips do not drift apart between charts. */
export const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: `1px solid ${TOOLTIP_BORDER}`,
  fontSize: 13,
} as const;

/** Placeholder and empty-state line work. */
export const PLACEHOLDER = '#C0B2B8';
export const PLACEHOLDER_FILL = '#F6F1F2';

/**
 * Status. Kept outside the brand palette on purpose: these must be
 * distinguishable at a glance and must never be mistaken for brand emphasis.
 * A coral "danger" beside a coral button says nothing.
 */
export const STATUS = {
  success: '#0E9F6E',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#2563EB',
} as const;
