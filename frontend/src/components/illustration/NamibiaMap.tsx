import React, { useId, useState } from 'react';
import { NAMIBIA_REGIONS, MAP_WIDTH, MAP_HEIGHT } from './namibiaRegions';
import RegionModal, { RegionStats } from './RegionModal';

/**
 * Namibia's fourteen regions, drawn from real boundary data and shaded by
 * activity.
 *
 * **The geometry is the point.** An earlier version of this used a tile grid
 * — squares standing in for regions — on the reasoning that a hand-traced
 * outline would be dishonest. That was the wrong conclusion from a right
 * premise: the answer to "do not invent geography" is to use real geography,
 * not to abandon it. These paths come from OCHA's current admin boundaries
 * (see `namibiaRegions.ts`), so the north-eastern panhandle, the Atlantic
 * coast and the Kavango split are all where they actually are.
 *
 * **Labels live in the legend, not on the map.** The four northern regions
 * are small and adjacent; text placed at their centroids collides into an
 * unreadable pile. A legend also carries something a label cannot — the value
 * behind each shade — and doubles as the accessible representation of the
 * same data.
 *
 * `null` is not zero. A region with no data is hatched rather than filled at
 * the lowest band, because "we have not measured here" and "there is nothing
 * here" are different findings, and collapsing them is the exact error the
 * platform exists to avoid.
 */

/** Extra figures shown when a region is selected. */
export interface RegionDetail {
  constituencies?: number;
  constituenciesReached?: number;
  share?: string;
  /** Volume by use case, largest first. */
  useCases?: { label: string; value: number }[];
  /** Daily payment counts, oldest first. */
  trend?: number[];
  note?: string;
}

export interface NamibiaMapProps {
  /** Region code (`khomas`, `kavango_east`, …) to 0–1, or null for no data. */
  values?: Record<string, number | null>;
  /** Per-region figures for the selection panel. */
  details?: Record<string, RegionDetail>;
  /** Rendered under the figure. */
  caption?: string;
  /** Hides the legend where space is tight and the shape alone is the point. */
  showLegend?: boolean;
  className?: string;
}

const fmt = (v: number | null) => (v === null ? 'no data' : `${Math.round(v * 100)}`);

const NamibiaMap: React.FC<NamibiaMapProps> = ({
  values = {},
  details = {},
  caption,
  showLegend = true,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const [active, setActive] = useState<string | null>(null);
  // Selection is separate from hover. Hover is a pointer affordance and dies
  // with the pointer; selection survives, which is what a reader comparing
  // two regions actually needs — and it is the only one a keyboard or a
  // touchscreen can reach at all.
  const [selected, setSelected] = useState<string | null>(null);

  const rows = NAMIBIA_REGIONS.map((r) => ({ ...r, v: values[r.code] ?? null }));
  const reached = rows.filter((r) => r.v !== null).length;
  const ranked = [...rows].sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
  const selectedRow = rows.find((r) => r.code === selected) ?? null;
  const selectedDetail = selected ? details[selected] : undefined;

  return (
    <figure className={className}>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] gap-40 items-center">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          role="img"
          aria-label={`Map of Namibia's fourteen regions shaded by recorded activity. ${reached} of 14 carry data.`}
          className="w-full h-auto max-h-[760px]"
        >
          <defs>
            {/* Hatching reads as "not measured" at any size. A pale fill would
                read as a low value, which is the one thing it must not. */}
            <pattern
              id={`${uid}-none`}
              width="8"
              height="8"
              patternTransform="rotate(45)"
              patternUnits="userSpaceOnUse"
            >
              <rect width="8" height="8" fill="#EDEBEC" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#C0B2B8" strokeWidth="2.5" />
            </pattern>
            <filter id={`${uid}-lift`} x="-6%" y="-6%" width="112%" height="112%">
              <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#3D1152" floodOpacity="0.13" />
            </filter>
          </defs>

          <g filter={`url(#${uid}-lift)`}>
            {rows.map((r) => {
              const on = active === r.code || selected === r.code;
              const isSelected = selected === r.code;
              return (
                <path
                  key={r.code}
                  d={r.d}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${r.name}, ${fmt(r.v)}`}
                  fill={r.v === null ? `url(#${uid}-none)` : '#E6136C'}
                  fillOpacity={r.v === null ? 1 : 0.16 + r.v * 0.84}
                  stroke={isSelected ? '#3D1152' : '#ffffff'}
                  strokeWidth={isSelected ? 6 : on ? 5 : 2.5}
                  strokeLinejoin="round"
                  className="cursor-pointer outline-none
                             transition-[stroke-width,fill-opacity,stroke] duration-300
                             ease-brand motion-reduce:transition-none
                             focus-visible:stroke-plum focus-visible:[stroke-width:6]"
                  onMouseEnter={() => setActive(r.code)}
                  onMouseLeave={() => setActive(null)}
                  onClick={() => setSelected((cur) => (cur === r.code ? null : r.code))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected((cur) => (cur === r.code ? null : r.code));
                    }
                    if (e.key === 'Escape') setSelected(null);
                  }}
                >
                  <title>{`${r.name}: ${fmt(r.v)}`}</title>
                </path>
              );
            })}
          </g>
        </svg>

        {showLegend && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-24 gap-y-10 self-center">
            {ranked.map((r) => (
              <li
                key={r.code}
                onMouseEnter={() => setActive(r.code)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setSelected((cur) => (cur === r.code ? null : r.code))}
                className={`flex items-center gap-8 text-caption font-sohne cursor-pointer
                            transition-opacity
                            duration-200 ease-brand motion-reduce:transition-none ${
                              active && active !== r.code ? 'opacity-45' : 'opacity-100'
                            }`}
              >
                <span
                  aria-hidden="true"
                  className="w-12 h-12 rounded-[3px] shrink-0"
                  style={
                    r.v === null
                      ? { background: '#EDEBEC', boxShadow: 'inset 0 0 0 1.5px #C0B2B8' }
                      : { background: '#E6136C', opacity: 0.16 + r.v * 0.84 }
                  }
                />
                <span className="text-ink">{r.name}</span>
                <span className="font-mono text-ash tabular-nums ml-auto">{fmt(r.v)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <RegionModal
        stats={
          selectedRow
            ? {
                name: selectedRow.name,
                activity: selectedRow.v === null ? null : Math.round(selectedRow.v * 100),
                share: selectedDetail?.share,
                constituencies: selectedDetail?.constituencies,
                constituenciesReached: selectedDetail?.constituenciesReached,
                rank:
                  selectedRow.v === null
                    ? undefined
                    : ranked.findIndex((r) => r.code === selectedRow.code) + 1,
                useCases: selectedDetail?.useCases,
                trend: selectedDetail?.trend,
                note: selectedDetail?.note,
              }
            : null
        }
        onClose={() => setSelected(null)}
      />

      {caption && (
        <figcaption className="text-caption font-sohne text-ash mt-24 max-w-prose">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

export default NamibiaMap;
