import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchGeoBreakdown,
  GeoFilters,
  GeoLevel,
} from '../../api/api';
import {
  PAYER_INSTRUMENT_LABEL,
  PAYMENT_TYPE_LABEL,
  PayerInstrument,
  PaymentType,
} from '../../types/domain';
import Card from '../ui/Card';
import Meter from '../ui/Meter';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';

/**
 * Geography, all the way down.
 *
 * Namibia is 14 regions, 121 constituencies and 57 local authorities.
 * A national figure is the least useful number available — it is an average
 * across a country where one region holds the capital and another has no
 * activity at all. This lets someone start at the top and keep going until
 * the number means something: region, then constituency, then local
 * authority, filtered by payment type, funding instrument and period.
 *
 * The breadcrumb is the whole interaction. Clicking a row descends; clicking
 * a crumb returns. Nothing else changes, so it stays obvious where you are.
 */

const LEVEL_LABEL: Record<GeoLevel, string> = {
  region: 'Region',
  constituency: 'Constituency',
  local_authority: 'Local authority',
};

const PERIODS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 0, label: 'All time' },
];

const nad = (n: number) => `N$${n.toLocaleString('en-NA', { maximumFractionDigits: 0 })}`;

const GeoDrilldown: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [level, setLevel] = useState<GeoLevel>('region');
  const [parent, setParent] = useState<string | undefined>();
  const [filters, setFilters] = useState<GeoFilters>({ paymentType: '', payerInstrument: '', days: 30 });

  const { data: rows, isLoading } = useQuery({
    queryKey: ['geoBreakdown', level, parent ?? 'all', filters],
    queryFn: () => fetchGeoBreakdown(level, parent, filters),
  });

  const descend = (label: string) => {
    if (level === 'region') {
      setParent(label);
      setLevel('constituency');
    } else if (level === 'constituency') {
      setLevel('local_authority');
    }
  };

  const maxVolume = Math.max(...(rows ?? []).map((r) => r.volume), 1);
  const totals = (rows ?? []).reduce(
    (a, r) => ({
      merchants: a.merchants + r.merchantCount,
      txns: a.txns + r.transactionCount,
      volume: a.volume + r.volume,
      flagged: a.flagged + r.flagged,
    }),
    { merchants: 0, txns: 0, volume: 0, flagged: 0 }
  );
  const empty = (rows ?? []).filter((r) => r.transactionCount === 0);

  return (
    <Card variant="elevated" className={`p-24 ${className}`}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-8 mb-4" aria-label="Geographic level">
        <button
          onClick={() => {
            setLevel('region');
            setParent(undefined);
          }}
          className={`text-caption font-sohne ${level === 'region' ? 'text-ink' : 'text-slate hover:text-ink underline'}`}
        >
          Namibia
        </button>
        {parent && (
          <>
            <span className="text-caption text-ash">/</span>
            <button
              onClick={() => setLevel('constituency')}
              className={`text-caption font-sohne ${level === 'constituency' ? 'text-ink' : 'text-slate hover:text-ink underline'}`}
            >
              {parent}
            </button>
          </>
        )}
        {level === 'local_authority' && (
          <>
            <span className="text-caption text-ash">/</span>
            <span className="text-caption font-sohne text-ink">Local authorities</span>
          </>
        )}
      </nav>

      <h3 className="text-subheading font-signifier text-ink">
        {parent ? `${LEVEL_LABEL[level]}s in ${parent}` : 'By region'}
      </h3>
      <p className="text-caption font-sohne text-slate mt-4">
        {level === 'local_authority'
          ? 'The smallest level recorded.'
          : 'Select a row to go a level deeper.'}
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-12 mt-20 pb-20 border-b border-mist">
        <label className="flex flex-col gap-4">
          <span className="text-caption font-sohne text-ash">Payment type</span>
          <select
            value={filters.paymentType}
            onChange={(e) => setFilters((f) => ({ ...f, paymentType: e.target.value as PaymentType | '' }))}
            className="border border-mist rounded-inputs px-12 py-8 text-caption font-sohne bg-paper text-ink"
          >
            <option value="">All types</option>
            {(Object.keys(PAYMENT_TYPE_LABEL) as PaymentType[]).map((t) => (
              <option key={t} value={t}>
                {PAYMENT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-4">
          <span className="text-caption font-sohne text-ash">Funded from</span>
          <select
            value={filters.payerInstrument}
            onChange={(e) =>
              setFilters((f) => ({ ...f, payerInstrument: e.target.value as PayerInstrument | '' }))
            }
            className="border border-mist rounded-inputs px-12 py-8 text-caption font-sohne bg-paper text-ink"
          >
            <option value="">Either</option>
            {(Object.keys(PAYER_INSTRUMENT_LABEL) as PayerInstrument[]).map((i) => (
              <option key={i} value={i}>
                {PAYER_INSTRUMENT_LABEL[i]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-4">
          <span className="text-caption font-sohne text-ash">Period</span>
          <select
            value={filters.days}
            onChange={(e) => setFilters((f) => ({ ...f, days: Number(e.target.value) }))}
            className="border border-mist rounded-inputs px-12 py-8 text-caption font-sohne bg-paper text-ink"
          >
            {PERIODS.map((p) => (
              <option key={p.days} value={p.days}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Totals for the current slice */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-16 py-20 border-b border-mist">
        {[
          { l: 'Businesses', v: totals.merchants.toLocaleString() },
          { l: 'Payments', v: totals.txns.toLocaleString() },
          { l: 'Volume', v: nad(totals.volume) },
          { l: 'Flagged', v: totals.flagged.toLocaleString() },
        ].map((s) => (
          <div key={s.l}>
            <p className="text-caption font-sohne text-ash">{s.l}</p>
            <p className="text-body font-sohne font-450 text-ink tabular-nums">{s.v}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <Skeleton rows={5} className="mt-8" />
      ) : (rows ?? []).length === 0 ? (
        <EmptyState
          title="Nothing recorded at this level"
          detail="No business here has taken a payment matching these filters."
        />
      ) : (
        <ul className="divide-y divide-mist">
          {(rows ?? []).map((r) => {
            const clickable = level !== 'local_authority';
            const Row = (
              <>
                <div className="flex items-baseline justify-between gap-16">
                  <span className="text-body font-sohne text-ink">{r.label}</span>
                  <span className="text-caption font-sohne text-slate tabular-nums shrink-0">
                    {r.transactionCount.toLocaleString()} payments &middot; {nad(r.volume)}
                  </span>
                </div>
                <Meter className="mt-8" value={(r.volume / maxVolume) * 100} />
                <div className="flex flex-wrap gap-16 mt-8">
                  <span className="text-caption font-sohne text-ash">
                    {r.merchantCount} {r.merchantCount === 1 ? 'business' : 'businesses'}
                  </span>
                  <span className="text-caption font-sohne text-ash">
                    {r.walletShare.toFixed(0)}% wallet-funded
                  </span>
                  {r.flagged > 0 && (
                    <span className="text-caption font-sohne text-status-warning">
                      {r.flagged} flagged
                    </span>
                  )}
                  {r.transactionCount === 0 && (
                    <span className="text-caption font-sohne text-status-warning">no activity</span>
                  )}
                </div>
              </>
            );
            return (
              <li key={r.label}>
                {clickable ? (
                  <button
                    onClick={() => descend(r.label)}
                    className="w-full text-left py-16 hover:bg-blush-tint -mx-8 px-8 rounded-inputs"
                  >
                    {Row}
                  </button>
                ) : (
                  <div className="py-16">{Row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {empty.length > 0 && (
        <p className="text-caption font-sohne text-ash mt-16 pt-16 border-t border-mist">
          {empty.length} {empty.length === 1 ? 'area has' : 'areas have'} no activity in this
          period — {empty.map((e) => e.label).join(', ')}.
        </p>
      )}
    </Card>
  );
};

export default GeoDrilldown;
