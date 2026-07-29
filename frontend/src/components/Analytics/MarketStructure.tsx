import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Card from '../ui/Card';
import Meter from '../ui/Meter';
import Skeleton from '../ui/Skeleton';
import StatusPill from '../ui/StatusPill';
import EmptyState from '../ui/EmptyState';
import {
  fetchAvailability,
  fetchConcentration,
  fetchInclusionMetrics,
  fetchValueDistribution,
} from '../../api/api';

/**
 * The measures a payment system department actually asks for.
 *
 * The operational dashboard answers how many payments there were and whether
 * they worked. A supervisor's questions are different in kind: is the system
 * dependent on a few participants, is it reaching the people it was built
 * for, and does it hold up on its worst day rather than on average.
 *
 * Two presentation rules run through this, both of them about not
 * overclaiming:
 *
 * - **Every ratio shows its denominator.** A wallet share of 60% computed
 *   over eleven payments is arithmetic, not evidence, and the reader is told
 *   which they are looking at.
 * - **Averages are shown next to medians, never alone.** On these rails the
 *   mean sits between market stalls and fuel stations and describes neither.
 */

const Figure: React.FC<{
  label: string;
  value: string;
  detail?: string;
  tone?: 'default' | 'muted';
}> = ({ label, value, detail, tone = 'default' }) => (
  <div>
    <p className="text-caption font-sohne text-ash">{label}</p>
    <p
      className={`text-heading font-signifier tabular-nums ${
        tone === 'muted' ? 'text-slate' : 'text-ink'
      }`}
    >
      {value}
    </p>
    {detail && <p className="text-caption font-sohne text-slate mt-4">{detail}</p>}
  </div>
);

const Thin: React.FC = () => (
  <StatusPill label="early figures" tone="warning" className="ml-8" />
);

const MarketStructure: React.FC = () => {
  const concentration = useQuery({ queryKey: ['concentration'], queryFn: () => fetchConcentration() });
  const distribution = useQuery({ queryKey: ['valueDistribution'], queryFn: () => fetchValueDistribution() });
  const inclusion = useQuery({ queryKey: ['inclusion'], queryFn: () => fetchInclusionMetrics() });
  const availability = useQuery({ queryKey: ['availability'], queryFn: () => fetchAvailability() });

  const loading =
    concentration.isLoading || distribution.isLoading || inclusion.isLoading || availability.isLoading;

  if (loading) {
    return (
      <div className="space-y-16">
        <Skeleton className="h-[140px]" />
        <Skeleton className="h-[140px]" />
      </div>
    );
  }

  const c = concentration.data;
  const d = distribution.data;
  const i = inclusion.data;
  const a = availability.data;

  return (
    <div className="space-y-16">
      {/* Concentration */}
      <Card variant="elevated" className="p-24">
        <h3 className="text-subheading font-signifier text-ink">Market structure</h3>
        <p className="text-caption font-sohne text-slate mt-4 mb-20 max-w-[560px]">
          Whether the value flowing through the network depends on a handful of businesses, or
          on one part of the country. The score below is the Herfindahl-Hirschman Index (HHI) —
          the same concentration measure competition regulators use — so it can be compared
          directly with figures held elsewhere.
        </p>

        {c?.status !== 'ok' ? (
          <EmptyState
            title="No payments in this window"
            detail={c?.detail ?? 'Structure appears once payments are flowing.'}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-24">
              <Figure
                label="How much depends on the largest businesses"
                value={c.merchantHhi?.toLocaleString() ?? 'not available'}
                detail={c.merchantConcentrationBand}
              />
              <Figure
                label="Largest three businesses"
                value={`${c.top3MerchantShare.toFixed(1)}%`}
                detail="share of value"
              />
              <Figure
                label="Value spread"
                value={c.valueGini !== null ? c.valueGini.toFixed(2) : 'not available'}
                detail="0 means every business takes a similar share; 1 means one takes almost everything"
              />
            </div>
            {c.belowEvidenceFloor && (
              <p className="text-caption font-sohne text-sienna mt-16">
                Computed over {c.transactions ?? 0} payments across {c.merchants} businesses.
                Treat as indicative until the network carries more traffic.
              </p>
            )}
            <div className="mt-24">
              <p className="text-caption font-sohne text-ash mb-12">Share of value by region</p>
              <div className="space-y-12">
                {c.regionShares.slice(0, 8).map((r) => (
                  <div key={r.region}>
                    <div className="flex justify-between text-caption font-sohne">
                      <span className="text-ink">{r.region}</span>
                      <span className="text-slate tabular-nums">{r.sharePct.toFixed(1)}%</span>
                    </div>
                    <Meter className="mt-4" value={r.sharePct} tone="accent" />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Value distribution */}
      <Card variant="elevated" className="p-24">
        <h3 className="text-subheading font-signifier text-ink">What a payment is worth</h3>
        <p className="text-caption font-sohne text-slate mt-4 mb-20 max-w-[560px]">
          Shown as a spread rather than a single average. An average here sits between the
          market stall and the fuel station, and describes neither of them.
        </p>

        {d?.status !== 'ok' ? (
          <EmptyState title="No payments in this window" detail={d?.detail} />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-24">
              <Figure label="Typical payment" value={`N$${d.median.toLocaleString()}`} detail="the middle of every payment taken" />
              <Figure label="Larger payments" value={`N$${d.p75.toLocaleString()}`} />
              <Figure label="Top tenth" value={`N$${d.p90.toLocaleString()}`} />
              <Figure
                label="Average"
                value={`N$${d.mean.toLocaleString()}`}
                detail={`N$${d.meanExceedsMedianBy.toLocaleString()} above the typical payment`}
                tone="muted"
              />
            </div>
            <div className="mt-24 space-y-12">
              {d.histogram.map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-caption font-sohne">
                    <span className="text-ink">{b.label}</span>
                    <span className="text-slate tabular-nums">
                      {b.count.toLocaleString()} ({b.sharePct.toFixed(1)}%)
                    </span>
                  </div>
                  <Meter className="mt-4" value={b.sharePct} tone="neutral" />
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Inclusion */}
      <Card variant="elevated" className="p-24">
        <h3 className="text-subheading font-signifier text-ink">
          Reach
          {i?.belowEvidenceFloor && <Thin />}
        </h3>
        <p className="text-caption font-sohne text-slate mt-4 mb-20 max-w-[560px]">
          Progress against the reason the programme exists. Where we were not told how someone
          paid, that is counted on its own rather than guessed either way.
        </p>

        {i?.status !== 'ok' ? (
          <EmptyState title="No payments in this window" detail={i?.detail} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-24">
              <Figure
                label="Paid from a wallet"
                value={i.walletSharePct !== null ? `${i.walletSharePct.toFixed(1)}%` : 'not available'}
                detail={`of ${i.walletShareBasis.toLocaleString()} payments where we know how they paid`}
              />
              <Figure
                label="Businesses actually accepting"
                value={
                  i.acceptanceRatePct !== null ? `${i.acceptanceRatePct.toFixed(0)}%` : 'not available'
                }
                detail={`${i.businessesAccepting} of ${i.businessesRegistered} approved`}
              />
              <Figure
                label="Regions reached"
                value={`${i.regionsCovered}/${i.regionsTotal}`}
                detail={
                  i.regionsWithNoBusiness.length
                    ? `not yet: ${i.regionsWithNoBusiness.slice(0, 3).join(', ')}${
                        i.regionsWithNoBusiness.length > 3 ? '...' : ''
                      }`
                    : 'every region has at least one business'
                }
              />
            </div>
            {i.instrumentNotRecorded > 0 && (
              <p className="text-caption font-sohne text-ash mt-16">
                For {i.instrumentNotRecorded.toLocaleString()} payments we were not told how the
                customer paid. Those are left out of the figure above rather than guessed.
              </p>
            )}
          </>
        )}
      </Card>

      {/* Availability */}
      <Card variant="elevated" className="p-24">
        <h3 className="text-subheading font-signifier text-ink">Reliability</h3>
        <p className="text-caption font-sohne text-slate mt-4 mb-20 max-w-[560px]">
          The overall figure alongside the worst day and worst hour. A monthly average can hide
          a day on which nothing worked, and that is the day a trader remembers.
        </p>

        {a?.status !== 'ok' ? (
          <EmptyState title="No payments in this window" detail={a?.detail} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-24">
              <Figure
                label="Succeeded"
                value={`${a.successRatePct.toFixed(2)}%`}
                detail={`over ${a.transactions.toLocaleString()} payments`}
              />
              <Figure
                label="Worst day"
                value={a.worstDay ? `${a.worstDay.successRatePct.toFixed(1)}%` : 'not enough traffic'}
                detail={a.worstDay ? a.worstDay.date : 'no day had enough payments to judge'}
              />
              <Figure
                label="Slowest responses"
                value={a.p95ResponseMs !== null ? `${Math.round(a.p95ResponseMs)} ms` : 'not recorded'}
                detail={a.medianResponseMs !== null ? `usually ${Math.round(a.medianResponseMs)} ms` : undefined}
              />
            </div>
            {a.failuresByStatus.length > 0 && (
              <div className="mt-24">
                <p className="text-caption font-sohne text-ash mb-8">Why payments did not go through</p>
                <div className="flex flex-wrap gap-8">
                  {a.failuresByStatus.map((f) => (
                    <StatusPill
                      key={f.status}
                      label={`${f.status.replace(/_/g, ' ')}: ${f.count}`}
                      tone="neutral"
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default MarketStructure;
