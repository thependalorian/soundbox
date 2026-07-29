import React, { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import Card from '../ui/Card';
import Meter from '../ui/Meter';
import EmptyState from '../ui/EmptyState';
import StatusPill from '../ui/StatusPill';
import { MerchantSegmentation } from '../../api/api';

/**
 * Behavioural segmentation, plotted.
 *
 * A cluster table is a list of numbers nobody checks. The point of
 * segmentation is that groups are *visible* — you can see whether they
 * separate, whether one is a thin smear rather than a cluster, and where a
 * particular business sits relative to its peers. That judgement is the
 * reason to plot it rather than tabulate it.
 *
 * Axes are the two features that separate merchant behaviour most legibly:
 * how often a business takes payment, and how large a typical payment is.
 * Value uses a log scale because it spans orders of magnitude between a
 * vegetable stall and a fuel station — on a linear axis every market trader
 * collapses onto the origin, which is the segment this platform exists for.
 *
 * The silhouette score is shown rather than hidden. It is the honest measure
 * of whether these groups are real, and a reader entitled to the segments is
 * entitled to know how well-separated they are.
 */

interface Props {
  data: MerchantSegmentation;
}

// Drawn from the design tokens rather than a rainbow: these are categories,
// not a scale, so the palette must not imply an ordering.
const SEGMENT_COLOUR = ['#E6136C', '#705C67', '#F15A29', '#3D1152', '#675C62', '#D97706', '#705C67'];

const SegmentScatter: React.FC<Props> = ({ data }) => {
  const [focused, setFocused] = useState<number | null>(null);

  if (data.status !== 'ok') {
    return (
      <EmptyState
        title="Not enough trading yet to group businesses"
        detail={
          data.detail ??
          'Groups appear once enough businesses have been trading long enough to compare.'
        }
      />
    );
  }

  const byMerchants = [...data.segments].sort((a, b) => a.segment - b.segment);

  const separation =
    data.silhouette >= 0.5
      ? { label: 'clearly distinct', tone: 'success' as const }
      : data.silhouette >= 0.25
      ? { label: 'fairly distinct', tone: 'warning' as const }
      : { label: 'overlapping', tone: 'neutral' as const };

  return (
    <div className="space-y-16">
      <Card variant="elevated" className="p-24">
        <div className="flex flex-wrap items-start justify-between gap-16 mb-20">
          <div>
            <h3 className="text-subheading font-signifier text-ink">
              How businesses trade, grouped by behaviour
            </h3>
            <p className="text-caption font-sohne text-slate mt-4 max-w-[560px]">
              Each point is one business over the last {data.observationDays} days. The groups
              come from how each one actually trades, not from the category someone chose when
              they signed up. The label above says how clearly the groups separate.
            </p>
          </div>
          <div className="text-right">
            <StatusPill label={separation.label} tone={separation.tone} />
            <p className="text-caption font-sohne text-ash mt-4 tabular-nums">
              {data.k} groups &middot; {data.merchantsConsidered} businesses measured
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={380}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid stroke="#F6F1F2" />
            <XAxis
              type="number"
              dataKey="paymentsPerActiveDay"
              name="Payments per trading day"
              stroke="#675C62"
              fontSize={12}
              label={{
                value: 'Payments per trading day',
                position: 'insideBottom',
                offset: -12,
                fill: '#705C67',
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="medianAmount"
              name="Typical payment"
              scale="log"
              domain={['auto', 'auto']}
              stroke="#675C62"
              fontSize={12}
              tickFormatter={(v: number) => `N$${v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)}`}
              label={{
                value: 'Typical payment',
                angle: -90,
                position: 'insideLeft',
                fill: '#705C67',
                fontSize: 12,
              }}
            />
            <ZAxis type="number" dataKey="transactions" range={[40, 400]} name="Payments" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #F6F1F2', fontSize: 12 }}
              formatter={(value: number | string, name: string) =>
                name === 'Typical payment'
                  ? [`N$${Number(value).toLocaleString()}`, name]
                  : [value, name]
              }
              labelFormatter={() => ''}
            />
            <Legend
              verticalAlign="top"
              height={32}
              onClick={(e) => {
                const idx = byMerchants.findIndex((s) => s.label === e.value);
                setFocused((current) => (current === idx ? null : idx));
              }}
              wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
            />
            {byMerchants.map((segment, i) => (
              <Scatter
                key={segment.segment}
                name={segment.label}
                data={data.assignments.filter((a) => a.segment === segment.segment)}
                fill={SEGMENT_COLOUR[i % SEGMENT_COLOUR.length]}
                fillOpacity={focused === null || focused === i ? 0.75 : 0.12}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-caption font-sohne text-ash mt-12">
          Bigger dots take more payments. Select a group above to show only that one.
        </p>
      </Card>

      <Card variant="elevated" className="p-24">
        <h3 className="text-body font-sohne font-450 text-ink mb-4">What each group looks like</h3>
        <p className="text-caption font-sohne text-slate mb-20 max-w-[560px]">
          Names describe how a group trades. This is not a ranking, and no group is better than
          another.
        </p>
        <div className="divide-y divide-mist">
          {byMerchants.map((segment, i) => (
            <div key={segment.segment} className="py-16 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-12">
                <div className="flex items-center gap-8 min-w-0">
                  <span
                    className="w-12 h-12 rounded-full shrink-0"
                    style={{ backgroundColor: SEGMENT_COLOUR[i % SEGMENT_COLOUR.length] }}
                    aria-hidden
                  />
                  <p className="text-body font-sohne text-ink">{segment.label}</p>
                </div>
                <p className="text-caption font-sohne text-slate tabular-nums">
                  {segment.merchants} businesses &middot; typical payment N$
                  {segment.medianAmount.toLocaleString()}
                </p>
              </div>
              <Meter
                className="mt-8"
                value={segment.share * 100}
                tone={i === 0 ? 'accent' : 'neutral'}
                label={`${Math.round(segment.share * 100)}% of businesses measured`}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default SegmentScatter;
