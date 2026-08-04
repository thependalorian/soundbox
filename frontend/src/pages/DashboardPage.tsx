import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BuildingStorefrontIcon,
  BanknotesIcon,
  CreditCardIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import {
  fetchSystemHealth,
  fetchAnomalyAlerts,
  fetchTransactionSummary,
  fetchTransactionTrends,
  fetchMerchants,
  fetchPeriodDeltas,
} from '../api/api';
import StatCard from '../components/ui/StatCard';
import PageAction from '../components/ui/PageAction';
import Card from '../components/ui/Card';
import SystemHealthCard from '../components/Dashboard/SystemHealthCard';
import AnomalyAlertsCard from '../components/Dashboard/AnomalyAlertsCard';
import TransactionChart from '../components/Dashboard/TransactionChart';
import { useAuth } from '../context/AuthContext';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const isRegulator = user?.role === 'regulator';
  const isAdmin = user?.role === 'admin';

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: fetchSystemHealth,
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['anomalyAlerts'],
    queryFn: () => fetchAnomalyAlerts(),
  });

  const { data: txnSummary } = useQuery({
    queryKey: ['transactionSummary'],
    queryFn: () => fetchTransactionSummary(),
  });

  const { data: trends } = useQuery({
    queryKey: ['transactionTrends'],
    queryFn: () => fetchTransactionTrends(),
  });

  const { data: merchants } = useQuery({
    queryKey: ['merchants'],
    queryFn: () => fetchMerchants(),
  });

  const { data: deltas } = useQuery({
    queryKey: ['periodDeltas'],
    queryFn: () => fetchPeriodDeltas(),
  });

  const activeMerchants = (merchants ?? []).filter((m) => m.status === 'active').length;

  // Highest exposure still open — the single most useful thing to act on.
  const topAlert = (alerts ?? [])
    .filter((a) => a.status === 'open' || a.status === 'under_review')
    .sort((a, b) => b.expectedLoss - a.expectedLoss)[0];

  const trend = (trends ?? []).map((t) => t.count);

  /** Renders a real change, or nothing at all. Never a placeholder. */
  const delta = (v: number | null | undefined) =>
    v === null || v === undefined || !Number.isFinite(v)
      ? undefined
      : `${v >= 0 ? '+' : ''}${v.toFixed(0)}% vs previous 7 days`;
  const tone = (v: number | null | undefined): 'up' | 'down' | 'neutral' =>
    v === null || v === undefined ? 'neutral' : v > 0 ? 'up' : v < 0 ? 'down' : 'neutral';
  const headline = isRegulator ? 'National Payment System overview' : 'Operations overview';

  return (
    <div>
      <h1 className="text-heading font-signifier text-ink mb-8">{headline}</h1>
      <p className="text-body font-sohne text-slate mb-32">
        {isRegulator && 'System-wide health, flag trends, and coverage across every business on the record.'}
        {isAdmin && `${(merchants ?? []).length} businesses on the record, ${activeMerchants} of them active.`}
      </p>

      {/* One action, chosen by what is actually waiting. An operator opening
          this page should not have to work out where to start. */}
      {topAlert ? (
        <PageAction
          className="mb-32"
          urgent
          to={`/flagged/${topAlert.id}`}
          label="Review highest-exposure alert"
          context={`N$${topAlert.expectedLoss.toLocaleString('en-NA', { minimumFractionDigits: 2 })} at risk`}
        />
      ) : (
        <PageAction className="mb-32" to="/analytics" label="Review this week's trend" />
      )}

      {/* The single-turn composer that used to sit here moved to its own page.
          A conversation that answers with charts needs room and a scroll of
          its own, and this one was squeezed above the stat cards. Kept as an
          entry point rather than simply deleted, so the way in is not lost. */}
      <PageAction className="mb-32" to="/ask" label="Ask the data a question" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
        {/* Acceptance points, not a hardware count: an active business is
            somewhere a payment can actually be made, which is what coverage
            means. No delta — this is a stock with no prior-period snapshot
            to difference against, and an invented one would be worse than
            none. */}
        <StatCard
          title="Active businesses"
          value={String(activeMerchants)}
          icon={BuildingStorefrontIcon}
          trend={trend}
        />
        <StatCard
          title="Payments today"
          value={String(txnSummary?.todayCount ?? 0)}
          delta={delta(deltas?.transactions)}
          deltaTone={tone(deltas?.transactions)}
          icon={CreditCardIcon}
          trend={trend}
        />
        <StatCard
          title="Total volume"
          value={`N$${(txnSummary?.totalVolume ?? 0).toLocaleString()}`}
          delta={delta(deltas?.volume)}
          deltaTone={tone(deltas?.volume)}
          icon={BanknotesIcon}
          trend={trend}
        />
        <StatCard
          title="Flagged for review"
          value={`${txnSummary?.flagRate ?? 0}%`}
          delta={`${(txnSummary?.flagRate ?? 0).toFixed(1)}% of payments raised an alert`}
          deltaTone={(txnSummary?.flagRate ?? 0) < 3 ? 'up' : 'down'}
          icon={ShieldExclamationIcon}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24">
        <SystemHealthCard data={health} loading={healthLoading} />
        <AnomalyAlertsCard data={alerts} loading={alertsLoading} />
      </div>

      <Card variant="elevated" className="p-24">
        <h2 className="text-subheading font-signifier text-ink mb-16">Payment volume, last 14 days</h2>
        <TransactionChart data={trends} />
      </Card>
    </div>
  );
};

export default DashboardPage;
