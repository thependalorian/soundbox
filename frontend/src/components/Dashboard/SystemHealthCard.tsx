import React from 'react';
import Card from '../ui/Card';
import StatusPill from '../ui/StatusPill';
import { SystemHealth } from '../../types/domain';

interface SystemHealthCardProps {
  data?: SystemHealth;
  loading: boolean;
}

const TONE: Record<SystemHealth['status'], 'success' | 'warning' | 'danger'> = {
  HEALTHY: 'success',
  MONITOR: 'warning',
  ATTENTION: 'warning',
  CRITICAL: 'danger',
};

const SystemHealthCard: React.FC<SystemHealthCardProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <Card variant="elevated" className="p-24 text-caption text-slate">
        Loading system health...
      </Card>
    );
  }
  if (!data) return null;

  return (
    <Card variant="elevated" className="p-24">
      <h3 className="text-subheading font-signifier text-ink mb-16">System health</h3>
      <div className="flex items-center gap-16">
        <div className="text-heading-sm font-signifier text-ink">{(data.healthScore * 100).toFixed(0)}%</div>
        <StatusPill label={data.status} tone={TONE[data.status]} />
      </div>
      <div className="mt-20 space-y-8 text-body font-sohne">
        {/* Exactly the three components the index is computed from — see
            the weights in analytics_service.get_system_health(). Showing a
            measure the score does not use invites the reader to reconcile a
            figure against a total it was never part of. */}
        <div className="flex justify-between"><span className="text-slate">Success rate</span><span className="text-ink">{data.metrics.transaction_success_rate.toFixed(1)}%</span></div>
        <div className="flex justify-between"><span className="text-slate">Typical response</span><span className="text-ink">{data.metrics.response_latency}ms</span></div>
        <div className="flex justify-between"><span className="text-slate">Flagged for review</span><span className="text-ink">{data.metrics.flag_rate.toFixed(2)}%</span></div>
      </div>
    </Card>
  );
};

export default SystemHealthCard;
