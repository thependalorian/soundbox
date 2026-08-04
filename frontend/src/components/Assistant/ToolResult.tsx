import React from 'react';
import { TransactionTrendPoint } from '../../types/domain';
import TransactionChart from '../Dashboard/TransactionChart';
import Card from '../ui/Card';
import Meter from '../ui/Meter';
import StatCard from '../ui/StatCard';
import Tag from '../ui/Tag';
import { SERIES } from '../../lib/chartTokens';

/**
 * Generative UI: a tool result rendered as the artifact it actually is.
 *
 * When the agent calls `get_transaction_trends`, reading twelve dates and
 * counts back as a sentence is worse than useless — a trend is a shape, and
 * prose destroys the shape. So each tool the interface knows how to draw gets
 * a renderer here, and everything else falls back to a readable table.
 *
 * Two rules this file holds to:
 *
 * 1. **Reuse, do not rebuild.** `TransactionChart`, `StatCard` and `Meter`
 *    already exist, are already on the brand palette, and are already what a
 *    reader recognises from the dashboards. A second chart component that
 *    looks nearly the same is how a product starts to feel assembled.
 * 2. **A gap is shown, not smoothed.** Tools return `no_data` /
 *    `insufficient_data` deliberately, and that answer is rendered as an
 *    explicit note. Drawing an empty chart instead would imply a measurement
 *    of zero where there was in fact no measurement.
 *
 * Colours come from lib/chartTokens — never literals, and never the brand
 * gradient on data (that file explains why).
 */

/** Tool payloads are JSON, but the shapes vary per tool by design. */
type Payload = Record<string, any>;

const NAD = (v: unknown) =>
  `N$${Number(v ?? 0).toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const num = (v: unknown) => Number(v ?? 0).toLocaleString('en-NA');

const pct = (v: unknown, digits = 1) => `${(Number(v ?? 0) * 100).toFixed(digits)}%`;

/** Turns `merchantCount` / `total_value` into "Merchant count" / "Total value". */
const humanize = (key: string) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

/**
 * The honest empty state. `status: 'no_data'` from a tool means the query ran
 * and found nothing — which is a finding, not a failure, and reads very
 * differently from a chart of zeroes.
 */
const NoData: React.FC<{ detail?: string }> = ({ detail }) => (
  <Card className="p-16">
    <p className="text-caption font-sohne text-slate">
      {detail || 'The query ran and returned no data for this period.'}
    </p>
  </Card>
);

/** Fallback: any payload, legibly. Nested objects and arrays are shown as a
 * count plus their own rows rather than dumped as JSON. */
const GenericTable: React.FC<{ data: Payload }> = ({ data }) => {
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return <NoData />;

  return (
    <Card className="p-16 overflow-x-auto">
      <table className="w-full text-caption font-sohne">
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b border-mist last:border-0">
              <td className="py-8 pr-16 text-ash align-top whitespace-nowrap">{humanize(key)}</td>
              <td className="py-8 text-ink tabular-nums">
                {Array.isArray(value)
                  ? `${value.length} ${value.length === 1 ? 'row' : 'rows'}`
                  : typeof value === 'object'
                    ? Object.entries(value)
                        .map(([k, v]) => `${humanize(k)}: ${String(v)}`)
                        .join(' · ')
                    : String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

/** Headline activity. The figures the dashboard leads with. */
const TransactionSummary: React.FC<{ data: Payload }> = ({ data }) => (
  <div className="grid grid-cols-2 lg:grid-cols-3 gap-12">
    <StatCard title="Payments" value={num(data.totalTransactions)} />
    <StatCard title="Total value" value={NAD(data.totalVolume)} />
    {/* "Flagged" never says "fraud": an alert is a payment a person was asked
        to look at, not a confirmed case. The label carries that distinction
        because the number cannot. */}
    <StatCard title="Flagged for review" value={pct(data.flagRate)} />
  </div>
);

const TrendChart: React.FC<{ data: Payload }> = ({ data }) => {
  const trends = (data.trends || []) as TransactionTrendPoint[];
  if (trends.length === 0) return <NoData detail="No payments recorded in this period." />;
  return (
    <Card variant="elevated" className="p-16">
      <TransactionChart data={trends} />
    </Card>
  );
};

const SystemHealth: React.FC<{ data: Payload }> = ({ data }) => {
  const score = Number(data.healthScore ?? 0);
  const status = String(data.status ?? '');
  // Bands mirror the backend's own thresholds so the bar and the word agree.
  const tone = score >= 0.8 ? 'success' : score >= 0.5 ? 'warning' : 'danger';
  const metrics = (data.metrics || {}) as Record<string, number>;

  return (
    <Card className="p-20">
      <div className="flex items-baseline justify-between mb-12">
        <span className="text-heading-sm font-signifier text-ink tabular-nums">{(score * 100).toFixed(0)}</span>
        <Tag>{status}</Tag>
      </div>
      <Meter value={score * 100} tone={tone as any} size="lg" />
      <div className="mt-20 space-y-12">
        {Object.entries(metrics).map(([key, value]) => (
          <div key={key}>
            <div className="flex justify-between text-caption font-sohne mb-4">
              <span className="text-ash">{humanize(key)}</span>
              <span className="text-ink tabular-nums">{pct(value)}</span>
            </div>
            <Meter value={Number(value) * 100} size="sm" />
          </div>
        ))}
      </div>
    </Card>
  );
};

/**
 * Geography as a ranked bar list rather than a map.
 *
 * A map is the better artifact for "where are the businesses", and the
 * Coverage page draws one. Here the question is almost always comparative —
 * which places lead, which have nothing — and a sorted bar answers that
 * faster than colour on a shape. Rows with zero activity are kept and shown
 * at zero: the empty regions are usually the point of the question.
 */
const GeoBreakdown: React.FC<{ data: Payload }> = ({ data }) => {
  const rows = (data.rows || []) as Payload[];
  if (rows.length === 0) return <NoData />;

  const sorted = [...rows].sort(
    (a, b) => Number(b.transactionCount ?? 0) - Number(a.transactionCount ?? 0),
  );
  const max = Math.max(...sorted.map((r) => Number(r.transactionCount ?? 0)), 1);

  return (
    <Card className="p-16">
      <div className="space-y-10">
        {sorted.map((row, i) => (
          <div key={`${row.code ?? row.label}-${i}`}>
            <div className="flex justify-between text-caption font-sohne mb-4">
              <span className="text-ink">{row.label}</span>
              <span className="text-ash tabular-nums">
                {num(row.transactionCount)} · {NAD(row.volume)}
              </span>
            </div>
            <div className="h-8 bg-mist rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(Number(row.transactionCount ?? 0) / max) * 100}%`,
                  backgroundColor: SERIES[0],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

/**
 * Concentration: whether the network leans on too few businesses.
 *
 * The HHI is reported with its band spelled out, because "1,847" means
 * nothing to most readers and "moderately concentrated" means something to
 * all of them.
 */
const Concentration: React.FC<{ data: Payload }> = ({ data }) => {
  if (data.status !== 'ok') return <NoData detail={data.detail} />;
  return (
    <Card className="p-20">
      <div className="grid grid-cols-2 gap-16 mb-20">
        <div>
          <p className="text-caption font-sohne text-ash mb-4">Merchant HHI</p>
          <p className="text-heading-sm font-signifier text-ink tabular-nums">{num(data.merchantHhi)}</p>
          <Tag className="mt-8">{data.merchantConcentrationBand}</Tag>
        </div>
        <div>
          <p className="text-caption font-sohne text-ash mb-4">Businesses</p>
          <p className="text-heading-sm font-signifier text-ink tabular-nums">{num(data.merchants)}</p>
          <p className="text-caption font-sohne text-ash mt-8">
            over {num(data.observationDays)} days
          </p>
        </div>
      </div>
      <div className="space-y-12">
        <div>
          <div className="flex justify-between text-caption font-sohne mb-4">
            <span className="text-ash">Top 3 share of value</span>
            <span className="text-ink tabular-nums">{Number(data.top3MerchantShare).toFixed(1)}%</span>
          </div>
          <Meter value={Number(data.top3MerchantShare ?? 0)} size="sm" />
        </div>
        <div>
          <div className="flex justify-between text-caption font-sohne mb-4">
            <span className="text-ash">Top 10 share of value</span>
            <span className="text-ink tabular-nums">{Number(data.top10MerchantShare).toFixed(1)}%</span>
          </div>
          <Meter value={Number(data.top10MerchantShare ?? 0)} size="sm" />
        </div>
      </div>
    </Card>
  );
};

/** Alerts, worst money-at-risk first — the order the backend already returns. */
const AnomalyAlerts: React.FC<{ data: Payload }> = ({ data }) => {
  const alerts = (data.alerts || []) as Payload[];
  if (alerts.length === 0) return <NoData detail="No payments were flagged in this period." />;

  return (
    <Card className="p-16 overflow-x-auto">
      <table className="w-full text-caption font-sohne">
        <thead>
          <tr className="text-ash text-left">
            <th className="py-8 pr-12 font-normal">Business</th>
            <th className="py-8 pr-12 font-normal">Amount</th>
            <th className="py-8 pr-12 font-normal">Risk</th>
            <th className="py-8 font-normal">Score</th>
          </tr>
        </thead>
        <tbody>
          {alerts.slice(0, 10).map((a, i) => (
            <tr key={a.id ?? i} className="border-t border-mist">
              <td className="py-8 pr-12 text-ink">{a.merchantName ?? a.merchant_name ?? '—'}</td>
              <td className="py-8 pr-12 text-ink tabular-nums">{NAD(a.amount)}</td>
              <td className="py-8 pr-12">
                <Tag>{a.riskLevel ?? a.risk_level ?? '—'}</Tag>
              </td>
              <td className="py-8 text-ink tabular-nums">
                {Number(a.anomalyScore ?? a.anomaly_score ?? 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {alerts.length > 10 && (
        <p className="text-caption font-sohne text-ash mt-12">
          Showing 10 of {num(alerts.length)}.
        </p>
      )}
    </Card>
  );
};

/**
 * A forecast, with its fit quality shown next to it.
 *
 * The backend returns `insufficient_data` rather than a number when there is
 * too little history, and reports how well the model fits what it has. Both
 * are surfaced: a projection presented without its uncertainty is the single
 * easiest way for this product to mislead someone.
 */
const Forecast: React.FC<{ data: Payload }> = ({ data }) => {
  if (data.status && data.status !== 'ok') {
    return <NoData detail={data.detail || 'Not enough history to forecast on.'} />;
  }
  return <GenericTable data={data} />;
};

/** tool name -> renderer. Anything absent falls through to GenericTable. */
const RENDERERS: Record<string, React.FC<{ data: Payload }>> = {
  get_transaction_summary: TransactionSummary,
  get_transaction_trends: TrendChart,
  get_system_health: SystemHealth,
  get_geo_breakdown: GeoBreakdown,
  get_concentration: Concentration,
  get_anomaly_alerts: AnomalyAlerts,
  forecast_activity: Forecast,
};

interface ToolResultProps {
  toolName: string;
  /** The raw JSON string from the AG-UI TOOL_CALL_RESULT event. */
  content: string;
}

const ToolResult: React.FC<ToolResultProps> = ({ toolName, content }) => {
  let data: Payload;
  try {
    data = JSON.parse(content);
  } catch {
    // A tool result that will not parse is a backend bug, not something to
    // paper over with a friendly message — show what actually came back.
    return (
      <Card className="p-16">
        <p className="text-caption font-sohne text-slate whitespace-pre-wrap break-words">{content}</p>
      </Card>
    );
  }

  if (data && typeof data === 'object' && data.status === 'no_data') {
    return <NoData detail={data.detail} />;
  }

  const Renderer = RENDERERS[toolName] ?? GenericTable;
  return <Renderer data={data} />;
};

export default ToolResult;
