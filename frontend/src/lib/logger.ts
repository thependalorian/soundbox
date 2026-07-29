/**
 * The one place this app writes diagnostics.
 *
 * Raw `console.*` in committed code is a standing prohibition here, and the
 * reason is specific to this product rather than stylistic. This console can
 * hold payment references, merchant identifiers and payer aliases; once a
 * `console.log` is scattered through components there is no single place to
 * decide what is safe to emit, no way to raise the level in production, and
 * no way to route anything to an aggregator later without touching every
 * call site.
 *
 * Levels are gated by environment. In production only `warn` and `error`
 * survive: an operator's console should carry things that need attention,
 * not a running commentary.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const minimum: number =
  process.env.NODE_ENV === 'production' ? LEVEL_ORDER.warn : LEVEL_ORDER.debug;

/* eslint-disable no-console */
const SINK: Record<Level, (...args: unknown[]) => void> = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};
/* eslint-enable no-console */

const emit = (level: Level, message: string, detail?: unknown): void => {
  if (LEVEL_ORDER[level] < minimum) return;
  if (detail === undefined) {
    SINK[level](message);
    return;
  }
  SINK[level](message, detail);
};

export const logger = {
  debug: (message: string, detail?: unknown) => emit('debug', message, detail),
  info: (message: string, detail?: unknown) => emit('info', message, detail),
  warn: (message: string, detail?: unknown) => emit('warn', message, detail),
  error: (message: string, detail?: unknown) => emit('error', message, detail),
};

export default logger;
