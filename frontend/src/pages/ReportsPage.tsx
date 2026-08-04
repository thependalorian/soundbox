import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { fetchPSD6Report, fetchPSD3Report, fetchFlagTrendReport, fetchGeoDistribution } from '../api/api';
import Card from '../components/ui/Card';
import PageAction from '../components/ui/PageAction';
import Meter from '../components/ui/Meter';
import Tag from '../components/ui/Tag';

// Namibia has 14 regions (see backend/app/db/namibia_geography.py); used
// here purely for the regional-coverage report's completeness check.
const NAMIBIA_REGION_COUNT = 14;

type ReportKey = 'psd6' | 'psd3' | 'flag-trend' | 'coverage';

const REPORT_TABS: { key: ReportKey; label: string }[] = [
  { key: 'psd6', label: 'PSD-6 · Payment System Operator Return' },
  { key: 'psd3', label: 'PSD-3 · E-Money Issuer Report' },
  { key: 'flag-trend', label: 'Flag trend report' },
  { key: 'coverage', label: 'Regional Coverage' },
];

interface ValidationCheck {
  label: string;
  passed: boolean;
}

/**
 * Pass ratio as a bar, so a reviewer sees whether a pack is clean before
 * reading a single line of it. Counting green ticks is work; a full bar is
 * not.
 */
const ValidationSummary: React.FC<{ checks: ValidationCheck[] }> = ({ checks }) => {
  const passed = checks.filter((c) => c.passed).length;
  const clean = passed === checks.length;
  return (
    <div className="flex items-center gap-12">
      <Meter className="flex-1" size="lg" tone={clean ? 'success' : 'warning'} value={(passed / Math.max(checks.length, 1)) * 100} label={`${passed} of ${checks.length} checks passed`} />
      <span className={`text-caption font-sohne tabular-nums shrink-0 ${clean ? 'text-status-success' : 'text-status-warning'}`}>
        {passed} of {checks.length} checks passed
      </span>
    </div>
  );
};

const ValidationList: React.FC<{ checks: ValidationCheck[] }> = ({ checks }) => (
  <div className="mt-20 pt-20 border-t border-mist">
    <Tag className="mb-8 block">Validation</Tag>
    <ValidationSummary checks={checks} />
    <div className="h-12" />
    <ul className="space-y-8">
      {checks.map((c) => (
        <li key={c.label} className="flex items-center gap-8 text-caption font-sohne">
          {c.passed ? (
            <CheckCircleIcon className="w-16 h-16 text-status-success shrink-0" />
          ) : (
            <ExclamationTriangleIcon className="w-16 h-16 text-status-warning shrink-0" />
          )}
          <span className={c.passed ? 'text-slate' : 'text-status-warning'}>{c.label}</span>
        </li>
      ))}
    </ul>
  </div>
);

const ReportsPage: React.FC = () => {
  const [active, setActive] = useState<ReportKey>('psd6');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: psd6 } = useQuery({ queryKey: ['psd6Report', month, year], queryFn: () => fetchPSD6Report(month, year), enabled: active === 'psd6' });
  const { data: psd3 } = useQuery({ queryKey: ['psd3Report'], queryFn: fetchPSD3Report, enabled: active === 'psd3' });
  const { data: flagTrend } = useQuery({ queryKey: ['flagTrendReport'], queryFn: fetchFlagTrendReport, enabled: active === 'flag-trend' });
  const { data: geo } = useQuery({ queryKey: ['geoDistribution'], queryFn: fetchGeoDistribution, enabled: active === 'coverage' });

  return (
    <div>
      <h1 className="text-heading font-signifier text-ink mb-8">Reports</h1>
      <p className="text-body font-sohne text-slate mb-32">
        The submissions required each month, ready to send. Each one shows the checks it has
        already passed, so nothing has to be taken on trust.
      </p>

      <div className="flex flex-wrap gap-8 border-b border-mist mb-24">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-16 py-12 text-body font-sohne border-b-2 -mb-px transition-colors ${
              active === tab.key ? 'border-ink text-ink' : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'psd6' && (
        <Card variant="elevated" className="p-24">
          <div className="flex flex-wrap gap-16 mb-24">
            <div className="w-[128px]">
              <label className="block text-caption font-sohne text-slate mb-4">Month</label>
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="w-full border border-mist rounded-inputs px-16 py-8 text-body font-sohne">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="w-[128px]">
              <label className="block text-caption font-sohne text-slate mb-4">Year</label>
              <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full border border-mist rounded-inputs px-16 py-8 text-body font-sohne">
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          {psd6 && (
            <>
              <h2 className="text-subheading font-signifier text-ink mb-4">
                Payment system operator return
              </h2>
              <p className="text-caption font-sohne text-ash mb-16">PSD-6 &middot; {psd6.period}</p>
              {/* Settled value is the headline; attempts and failures are
                  stated beside it rather than folded in. A return whose total
                  value includes payments that never moved overstates what the
                  system carried, and does it invisibly — the number still
                  looks plausible. */}
              <p className="text-body font-sohne text-ink">
                Settled: {psd6.transaction_summary.successful_count.toLocaleString()} payments
                {' '}&middot; N${psd6.transaction_summary.total_value.toLocaleString()}
              </p>
              <p className="text-caption font-sohne text-slate mb-16">
                {psd6.transaction_summary.total_count.toLocaleString()} attempted,
                {' '}{psd6.transaction_summary.failed_count.toLocaleString()} failed
                {' '}(N${psd6.transaction_summary.failed_value.toLocaleString()} not settled)
              </p>
              {/* Share-of-value bars alongside the figures. The table is the
                  record; the bars are how a reviewer sees the mix without
                  doing arithmetic across three rows. */}
              <div className="space-y-12 mb-16">
                {psd6.transaction_summary.by_type.map((t) => {
                  const share = psd6.transaction_summary.total_value
                    ? (t.value / psd6.transaction_summary.total_value) * 100
                    : 0;
                  return (
                    <div key={t.payment_type}>
                      <div className="flex items-baseline justify-between gap-16">
                        <span className="text-caption font-sohne text-ink uppercase">{t.payment_type}</span>
                        <span className="text-caption font-sohne text-slate tabular-nums">
                          {t.count.toLocaleString()} payments &middot; N${t.value.toLocaleString()} &middot; {share.toFixed(0)}%
                        </span>
                      </div>
                      <Meter className="mt-4" size="lg" value={share} label={`${t.payment_type}: ${share.toFixed(0)} percent of value`} />
                    </div>
                  );
                })}
              </div>
              <ValidationList
                checks={[
                  {
                    label: 'Sum of by-type counts equals total attempted',
                    passed: psd6.transaction_summary.by_type.reduce((s, t) => s + t.count, 0) === psd6.transaction_summary.total_count,
                  },
                  {
                    label: 'Sum of by-type settled values equals settled total',
                    passed: Math.abs(psd6.transaction_summary.by_type.reduce((s, t) => s + t.value, 0) - psd6.transaction_summary.total_value) < 1,
                  },
                  {
                    label: 'Settled plus failed equals attempted',
                    passed: psd6.transaction_summary.successful_count + psd6.transaction_summary.failed_count === psd6.transaction_summary.total_count,
                  },
                  {
                    // Not a fixed count: the taxonomy is configuration, so
                    // asserting a specific number here would fail the day a
                    // use case is added. What matters is that the return
                    // carries a breakdown at all.
                    label: 'Return carries a use-case breakdown',
                    passed: psd6.transaction_summary.by_type.length > 0,
                  },
                ]}
              />
            </>
          )}
        </Card>
      )}

      {active === 'psd3' && psd3 && (
        <Card variant="elevated" className="p-24">
          <h2 className="text-subheading font-signifier text-ink mb-4">E-money issuer report</h2>
          <p className="text-caption font-sohne text-ash mb-16">PSD-3</p>
          <p className="text-body font-sohne text-ink">Total wallets: {psd3.wallet_summary.total_wallets}</p>
          <p className="text-body font-sohne text-ink">Active wallets: {psd3.wallet_summary.active_wallets}</p>
          <p className="text-body font-sohne text-ink">Dormant wallets: {psd3.wallet_summary.dormant_wallets}</p>
          <p className="text-body font-sohne text-ink">Total balance: N${psd3.wallet_summary.total_balance.toLocaleString()}</p>
          <ValidationList
            checks={[
              {
                label: 'Active + dormant wallets does not exceed total',
                passed: psd3.wallet_summary.active_wallets + psd3.wallet_summary.dormant_wallets <= psd3.wallet_summary.total_wallets,
              },
              { label: 'Total balance is non-negative', passed: psd3.wallet_summary.total_balance >= 0 },
            ]}
          />
        </Card>
      )}

      {active === 'flag-trend' && flagTrend && (
        <Card variant="elevated" className="p-24">
          <h2 className="text-subheading font-signifier text-ink mb-16">What is being flagged, by month</h2>
          <div className="overflow-x-auto">
          <table className="w-full text-body font-sohne mb-24">
            <thead><tr className="text-caption text-ash text-left"><th className="py-8">Month</th><th className="py-8">Total alerts</th><th className="py-8">High risk</th><th className="py-8">Typical score</th></tr></thead>
            <tbody className="divide-y divide-mist">
              {flagTrend.monthly_trends.map((m) => (
                <tr key={m.month}><td className="py-8">{m.month}</td><td className="py-8">{m.totalAlerts}</td><td className="py-8 text-status-danger">{m.highRiskAlerts}</td><td className="py-8">{m.avgProbability}</td></tr>
              ))}
            </tbody>
          </table>
          </div>
          <h3 className="text-body font-sohne font-500 text-ink mb-8">By signal</h3>
          <div className="overflow-x-auto">
          <table className="w-full text-body font-sohne">
            <tbody className="divide-y divide-mist">
              {flagTrend.by_type.map((t) => (
                <tr key={t.type}><td className="py-8 text-ash text-caption capitalize">{t.type.replace(/_/g, ' ')}</td><td className="py-8">{t.count}</td><td className="py-8">N${t.value.toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
          </div>
          <ValidationList
            checks={[
              {
                label: 'Monthly totals sum to the by-type total alert count',
                passed:
                  flagTrend.monthly_trends.reduce((s, m) => s + m.totalAlerts, 0) ===
                  flagTrend.by_type.reduce((s, t) => s + t.count, 0),
              },
            ]}
          />
        </Card>
      )}

      {active === 'coverage' && geo && (
        <Card variant="elevated" className="p-24">
          <h2 className="text-subheading font-signifier text-ink mb-16">Regional coverage</h2>
          <p className="text-body font-sohne text-ink mb-16">
            {geo.length} businesses across {new Set(geo.map((g) => g.regionCode)).size} of {NAMIBIA_REGION_COUNT} regions.
          </p>
          <div className="overflow-x-auto">
          <table className="w-full text-body font-sohne">
            <thead><tr className="text-caption text-ash text-left"><th className="py-8">Region</th><th className="py-8">Businesses</th><th className="py-8">Payments</th></tr></thead>
            <tbody className="divide-y divide-mist">
              {Array.from(new Set(geo.map((g) => g.regionLabel))).map((region) => {
                const rows = geo.filter((g) => g.regionLabel === region);
                return (
                  <tr key={region}>
                    <td className="py-8">{region}</td>
                    <td className="py-8">{rows.length}</td>
                    <td className="py-8">{rows.reduce((s, r) => s + r.transactionCount, 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <ValidationList
            checks={[
              {
                label: `Full 14-region coverage`,
                passed: new Set(geo.map((g) => g.regionCode)).size === NAMIBIA_REGION_COUNT,
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
};

export default ReportsPage;
