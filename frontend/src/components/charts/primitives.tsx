import React, { useId } from 'react';

/**
 * Chart primitives for the public pages.
 *
 * Kept together rather than one-per-file because they share a single scale,
 * palette and set of conventions, and a chart that quietly diverges from its
 * siblings is worse than one that does not exist. Everything here:
 *
 * - scales by `viewBox`, so one component serves a 320px phone and a 1920px
 *   display without a second asset;
 * - animates only `transform`, `opacity` and `width`, and stops entirely
 *   under `prefers-reduced-motion`;
 * - draws its own axis or baseline, because a bar without a scale behind it
 *   is a shape rather than a measurement.
 *
 * Every figure passed in comes from a run of
 * `backend/notebooks/anomaly_detection.ipynb` on generated data. Where a
 * component invents nothing, the page around it still has to say the data is
 * generated — a chart that looks real is exactly the thing that needs the
 * caveat most.
 */

export const BRAND = '#E6136C';
export const CORAL = '#F15A29';
export const PLUM = '#3D1152';
export const MUTED = '#C0B2B8';
export const MIST = '#EDEBEC';

const money = (n: number) =>
  n >= 1_000_000 ? `N$${(n / 1_000_000).toFixed(1)}m` : `N$${Math.round(n / 1000)}k`;

/* ------------------------------------------------------------------ *
 * Share bars — a ranked breakdown where the categories are the point.
 * ------------------------------------------------------------------ */

export const ShareBars: React.FC<{
  data: { label: string; value: number; hint?: string }[];
  /** Formats the value shown at the end of each row. */
  format?: (v: number) => string;
  colour?: string;
  className?: string;
}> = ({ data, format = (v) => `${v}%`, colour = BRAND, className = '' }) => {
  const max = Math.max(...data.map((d) => d.value)) || 1;
  return (
    <ul className={`space-y-14 ${className}`}>
      {data.map((d) => (
        <li key={d.label}>
          <div className="flex items-baseline justify-between gap-16">
            <span className="text-caption font-sohne text-ink">{d.label}</span>
            <span className="text-caption font-mono text-ash tabular-nums shrink-0">
              {format(d.value)}
            </span>
          </div>
          <div className="mt-6 h-10 rounded-full bg-mist/70 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-brand
                         motion-reduce:transition-none"
              style={{ width: `${(d.value / max) * 100}%`, background: colour }}
            />
          </div>
          {d.hint && <p className="text-caption font-sohne text-ash mt-4">{d.hint}</p>}
        </li>
      ))}
    </ul>
  );
};

/* ------------------------------------------------------------------ *
 * Trend — observed history, then a forecast with its interval.
 * ------------------------------------------------------------------ */

export const TrendChart: React.FC<{
  history: number[];
  forecast?: number[];
  /** Symmetric band around the forecast, same length. */
  band?: number[];
  className?: string;
  label?: string;
}> = ({ history, forecast = [], band = [], className = '', label = 'Daily volume' }) => {
  const uid = useId().replace(/:/g, '');
  const W = 720;
  const H = 220;
  const P = 8;
  const all = [...history, ...forecast, ...forecast.map((f, i) => f + (band[i] ?? 0))];
  const lo = Math.min(...all) * 0.92;
  const hi = Math.max(...all) * 1.04;
  const n = history.length + forecast.length - 1;
  const x = (i: number) => P + (i / n) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);

  const line = (vals: number[], off = 0) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i + off).toFixed(1)} ${y(v).toFixed(1)}`).join('');

  const bandPath = forecast.length && band.length
    ? [
        ...forecast.map((v, i) =>
          `${i === 0 ? 'M' : 'L'}${x(i + history.length - 1).toFixed(1)} ${y(v + band[i]).toFixed(1)}`),
        ...[...forecast].reverse().map((v, i) => {
          const j = forecast.length - 1 - i;
          return `L${x(j + history.length - 1).toFixed(1)} ${y(v - band[j]).toFixed(1)}`;
        }),
        'Z',
      ].join('')
    : '';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}
      className={`w-full h-auto ${className}`}>
      {/* Gridlines first, so the data sits on a scale rather than in space. */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={P} x2={W - P} y1={P + f * (H - 2 * P)} y2={P + f * (H - 2 * P)}
          stroke={MIST} strokeWidth="1" />
      ))}
      {bandPath && <path d={bandPath} fill={BRAND} fillOpacity="0.13" />}
      <path d={line(history)} fill="none" stroke={MUTED} strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round" />
      {forecast.length > 0 && (
        <path d={line(forecast, history.length - 1)} fill="none" stroke={BRAND}
          strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {/* Where measurement stops and projection starts. Without this mark a
          reader cannot tell which half of the line is evidence. */}
      {forecast.length > 0 && (
        <>
          <line x1={x(history.length - 1)} x2={x(history.length - 1)} y1={P} y2={H - P}
            stroke={PLUM} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
          <circle cx={x(history.length - 1)} cy={y(history[history.length - 1])} r="4.5"
            fill={BRAND} />
        </>
      )}
      <defs><clipPath id={`${uid}-c`}><rect width={W} height={H} /></clipPath></defs>
    </svg>
  );
};

/* ------------------------------------------------------------------ *
 * Concentration curve — cumulative share, against perfect equality.
 * ------------------------------------------------------------------ */

export const ConcentrationCurve: React.FC<{
  /** Cumulative share of value, 0–100, one point per decile. */
  cumulative: number[];
  className?: string;
}> = ({ cumulative, className = '' }) => {
  const W = 320;
  const H = 320;
  const P = 26;
  const x = (i: number) => P + (i / (cumulative.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - (v / 100) * (H - 2 * P);
  const d = cumulative.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const area = `${d}L${x(cumulative.length - 1)} ${H - P}L${x(0)} ${H - P}Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label="Cumulative share of value against an equal distribution. The gap between the two is the concentration."
      className={`w-full h-auto ${className}`}>
      <rect x={P} y={P} width={W - 2 * P} height={H - 2 * P} fill={MIST} fillOpacity="0.4" rx="6" />
      {/* Equality. The diagonal is what a perfectly even network would draw,
          and the gap to the curve is the entire finding. */}
      <line x1={x(0)} y1={y(0)} x2={x(cumulative.length - 1)} y2={y(100)}
        stroke={PLUM} strokeWidth="1.5" strokeDasharray="5 5" opacity="0.55" />
      <path d={area} fill={BRAND} fillOpacity="0.14" />
      <path d={d} fill="none" stroke={BRAND} strokeWidth="3" strokeLinejoin="round" />
      <text x={P} y={H - 8} fontSize="11" fill="#675C62">participants, largest first</text>
      <text x={P - 6} y={P - 8} fontSize="11" fill="#675C62">% of value</text>
    </svg>
  );
};

/* ------------------------------------------------------------------ *
 * Score scatter — where the flagged payments actually sit.
 * ------------------------------------------------------------------ */

export const ScoreScatter: React.FC<{
  points: { x: number; y: number; flagged?: boolean }[];
  threshold?: number;
  className?: string;
}> = ({ points, threshold, className = '' }) => {
  const W = 520;
  const H = 300;
  const P = 34;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = (v: number) => P + ((v - Math.min(...xs)) / (Math.max(...xs) - Math.min(...xs) || 1)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - Math.min(...ys)) / (Math.max(...ys) - Math.min(...ys) || 1)) * (H - 2 * P);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label="Anomaly score against payment value. Points above the review threshold are the ones a person is asked to examine."
      className={`w-full h-auto ${className}`}>
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke={MUTED} strokeWidth="1.5" />
      <line x1={P} y1={P} x2={P} y2={H - P} stroke={MUTED} strokeWidth="1.5" />
      {threshold !== undefined && (
        <>
          <line x1={P} x2={W - P} y1={y(threshold)} y2={y(threshold)} stroke={PLUM}
            strokeWidth="1.5" strokeDasharray="5 4" opacity="0.6" />
          <text x={W - P} y={y(threshold) - 8} fontSize="11" fill="#3D1152" textAnchor="end">
            review threshold
          </text>
        </>
      )}
      {points.map((p, i) => (
        <circle key={i} cx={x(p.x)} cy={y(p.y)} r={p.flagged ? 5.5 : 3}
          fill={p.flagged ? BRAND : MUTED} fillOpacity={p.flagged ? 0.95 : 0.5} />
      ))}
      <text x={W / 2} y={H - 6} fontSize="11" fill="#675C62" textAnchor="middle">payment value</text>
      <text x={10} y={P - 12} fontSize="11" fill="#675C62">anomaly score</text>
    </svg>
  );
};

/* ------------------------------------------------------------------ *
 * Reconciliation — two totals that must agree, and their difference.
 * ------------------------------------------------------------------ */

export const ReconciliationBars: React.FC<{
  filed: number;
  dashboard: number;
  className?: string;
}> = ({ filed, dashboard, className = '' }) => {
  const max = Math.max(filed, dashboard) || 1;
  const diff = Math.abs(filed - dashboard);
  return (
    <div className={className}>
      {[
        { label: 'Filed in the return', v: filed, c: BRAND },
        { label: 'Shown on the dashboard', v: dashboard, c: CORAL },
      ].map((r) => (
        <div key={r.label} className="mb-16">
          <div className="flex items-baseline justify-between gap-16">
            <span className="text-caption font-sohne text-ink">{r.label}</span>
            <span className="text-caption font-sohne text-ash tabular-nums">{money(r.v)}</span>
          </div>
          <div className="mt-6 h-14 rounded-full bg-mist/70 overflow-hidden">
            <div className="h-full rounded-full transition-[width] duration-700 ease-brand
                            motion-reduce:transition-none"
              style={{ width: `${(r.v / max) * 100}%`, background: r.c }} />
          </div>
        </div>
      ))}
      <p className={`text-caption font-sohne mt-16 pt-12 border-t border-mist ${
        diff < 0.01 ? 'text-status-success' : 'text-status-danger'}`}>
        {diff < 0.01
          ? 'Difference: N$0.00 — the return and the dashboard read the same record.'
          : `Difference: ${money(diff)} — the return would not be issued.`}
      </p>
    </div>
  );
};
