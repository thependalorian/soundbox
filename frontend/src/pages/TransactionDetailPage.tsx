import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactionById, fetchTransactionStatusLog, fetchMerchantById, fetchDeviceById } from '../api/api';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Timeline from '../components/ui/Timeline';
import StatusPill from '../components/ui/StatusPill';
import TextLink from '../components/ui/TextLink';
import { Transaction, StatusLogEntry} from '../types/soundbox';
import { useAuth } from '../context/AuthContext';

const TONE: Record<Transaction['status'], 'success' | 'warning' | 'danger' | 'neutral'> = {
  success: 'success',
  pending: 'warning',
  verified: 'warning',
  failed: 'danger',
  reversed: 'neutral',
};


const TONE_MAP: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {success: 'success', failed: 'danger', reversed: 'danger', pending: 'warning'};
const TONE_FOR = (s: string) => TONE_MAP[s] ?? 'default';

/** Newest first, and a tone that reflects what the transition means. */
const toTimelineEntries = (log: StatusLogEntry[] = []) =>
  [...log]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((entry) => ({
      id: entry.id,
      title: entry.fromStatus
        ? `${entry.fromStatus.replace(/_/g, ' ')} \u2192 ${entry.toStatus.replace(/_/g, ' ')}`
        : entry.toStatus.replace(/_/g, ' '),
      detail: entry.note ?? undefined,
      meta:
        new Date(entry.createdAt).toLocaleString() +
        (entry.actorName ? ` \u00b7 ${entry.actorName}` : ''),
      tone: TONE_FOR(entry.toStatus),
    }));

const TransactionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: txn, isLoading } = useQuery({ queryKey: ['transaction', id], queryFn: () => fetchTransactionById(id as string), enabled: !!id });
  const { data: merchant } = useQuery({ queryKey: ['merchant', txn?.merchantId], queryFn: () => fetchMerchantById(txn!.merchantId), enabled: !!txn });
  const { data: device } = useQuery({ queryKey: ['device', txn?.deviceId], queryFn: () => fetchDeviceById(txn!.deviceId as string), enabled: !!txn?.deviceId });
  const { data: statusLog } = useQuery({ queryKey: ['transactionStatusLog', id], queryFn: () => fetchTransactionStatusLog(id as string), enabled: !!id });

  if (!isLoading && !txn) return <Navigate to="/transactions" replace />;
  if (txn && user?.role === 'merchant' && merchant && merchant.merchantCode !== user.merchantId) {
    return <Navigate to="/transactions" replace />;
  }
  if (isLoading || !txn) return <Skeleton rows={4} />;

  return (
    <div>
      <TextLink to="/transactions" arrow={false} className="!py-0 mb-16 inline-block">&larr; Transactions</TextLink>
      <div className="flex items-start justify-between mb-32">
        <div>
          <h1 className="text-heading font-signifier text-ink">{txn.transactionRef}</h1>
          {merchant && <p className="text-body font-sohne text-slate mt-4">{merchant.legalName}</p>}
        </div>
        <StatusPill label={txn.status} tone={TONE[txn.status]} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-16 mb-24">
        <Card variant="neutral" className="p-20">
          <p className="text-caption font-sohne text-slate">Amount</p>
          <p className="text-heading-sm font-signifier text-ink">N${txn.amount.toFixed(2)}</p>
        </Card>
        <Card variant="neutral" className="p-20">
          <p className="text-caption font-sohne text-slate">Payment type</p>
          <p className="text-heading-sm font-signifier text-ink uppercase">{txn.paymentType}</p>
        </Card>
        <Card variant="neutral" className="p-20">
          <p className="text-caption font-sohne text-slate">Fraud score</p>
          <p className={`text-heading-sm font-signifier ${(txn.anomalyScore ?? 0) > 0.7 ? 'text-status-danger' : 'text-ink'}`}>
            {((txn.anomalyScore ?? 0) * 100).toFixed(0)}%
          </p>
        </Card>
        <Card variant="neutral" className="p-20">
          <p className="text-caption font-sohne text-slate">Device</p>
          <p className="text-heading-sm font-signifier text-ink">{device?.deviceCode ?? '—'}</p>
        </Card>
      </div>

      <Card variant="elevated" className="p-24">
        <h2 className="text-subheading font-signifier text-ink mb-16">What has happened</h2>
        {(statusLog ?? []).length === 0 ? (
          <p className="text-body font-sohne text-slate">
            Created {new Date(txn.createdAt).toLocaleString()} — no intermediate status changes recorded.
          </p>
        ) : (
          <Timeline entries={toTimelineEntries(statusLog)} />
        )}
      </Card>
    </div>
  );
};

export default TransactionDetailPage;
