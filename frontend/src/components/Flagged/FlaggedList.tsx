import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import StatusPill from '../ui/StatusPill';
import { AnomalyAlert, Merchant } from '../../types/soundbox';

interface FlaggedListProps {
  alerts: AnomalyAlert[];
  merchants: Merchant[];
  loading: boolean;
}

const RISK_TONE: Record<AnomalyAlert['riskLevel'], 'danger' | 'warning' | 'success'> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'success',
};

const nad = (n: number) => `N$${n.toLocaleString('en-NA', { minimumFractionDigits: 2 })}`;

/**
 * Triage queue, ordered by exposure (see fetchAnomalyAlerts). Exposure is the
 * lead number rather than probability: it is what decides which alert an
 * analyst should open first, and ordering by probability alone would push a
 * near-certain N$500 alert above a likely N$50,000 one.
 */
const FlaggedList: React.FC<FlaggedListProps> = ({ alerts, merchants, loading }) => {
  if (loading) return <Card variant="elevated" className="p-24"><Skeleton rows={6} /></Card>;

  if (!alerts.length) {
    return (
      <Card variant="elevated" className="p-24">
        <p className="text-body font-sohne text-slate">No alerts match these filters.</p>
      </Card>
    );
  }

  const merchantName = (id: string) => merchants.find((m) => m.id === id)?.legalName ?? id;

  return (
    <Card variant="elevated" className="overflow-hidden">
      <div className="flex items-center justify-between px-20 py-12 border-b border-mist">
        <span className="text-caption font-sohne text-ash">Merchant</span>
        <span className="text-caption font-sohne text-ash">Exposure &middot; Risk</span>
      </div>
      <ul className="divide-y divide-mist">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <Link to={`/flagged/${alert.id}`} className="flex items-center justify-between gap-16 px-20 py-16 hover:bg-blush-tint">
              <div className="min-w-0">
                <p className="text-body font-sohne font-450 text-ink truncate">{merchantName(alert.merchantId)}</p>
                <p className="text-caption font-sohne text-slate truncate">
                  {nad(alert.amount)} &middot; {alert.signalType?.replace(/_/g, ' ')} &middot;{' '}
                  {alert.reasons.length} {alert.reasons.length === 1 ? 'signal' : 'signals'} &middot;{' '}
                  {alert.status.replace(/_/g, ' ')}
                </p>
              </div>
              <div className="flex items-center gap-16 shrink-0">
                <div className="text-right">
                  <p className="text-body font-sohne font-450 text-ink tabular-nums">{nad(alert.expectedLoss)}</p>
                  <p className="text-caption font-sohne text-ash">
                    {new Date(alert.detectedAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusPill label={alert.riskLevel} tone={RISK_TONE[alert.riskLevel]} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default FlaggedList;
