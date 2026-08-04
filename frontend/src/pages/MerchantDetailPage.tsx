import React, { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchMerchantById,
  fetchMerchantStatusLog,
  fetchTransactions,
  fetchAnomalyAlerts,
  reviewMerchantKyc,
} from '../api/api';
import { MERCHANT_TYPE_LABEL, StatusLogEntry} from '../types/domain';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Timeline from '../components/ui/Timeline';
import Sparkline from '../components/ui/Sparkline';
import StatusPill from '../components/ui/StatusPill';
import Button from '../components/ui/Button';
import TextLink from '../components/ui/TextLink';
import Avatar from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  pending_kyc: 'warning',
  suspended: 'danger',
  closed: 'neutral',
};


const TONE_MAP: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {active: 'success', suspended: 'danger', pending_kyc: 'warning', rejected: 'danger'};
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

const MerchantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: merchant, isLoading } = useQuery({
    queryKey: ['merchant', id],
    queryFn: () => fetchMerchantById(id as string),
    enabled: !!id,
  });

  const { data: statusLog } = useQuery({
    queryKey: ['merchantStatusLog', id],
    queryFn: () => fetchMerchantStatusLog(id as string),
    enabled: !!id,
  });
  const { data: transactions } = useQuery({ queryKey: ['transactions', id], queryFn: () => fetchTransactions({ merchantId: id }), enabled: !!id });
  const { data: anomalyAlerts } = useQuery({ queryKey: ['anomalyAlerts', id], queryFn: () => fetchAnomalyAlerts({ merchantId: id }), enabled: !!id });

  // Bucket the last 30 days so the sparklines show shape rather than noise.
  const { dailyCounts, dailyVolume, totalVolume, openAlerts } = React.useMemo(() => {
    const days = 30;
    const counts = new Array(days).fill(0);
    const volume = new Array(days).fill(0);
    const now = Date.now();
    let total = 0;
    for (const t of transactions ?? []) {
      total += t.amount;
      const age = Math.floor((now - new Date(t.createdAt).getTime()) / 86_400_000);
      const idx = days - 1 - age;
      if (idx >= 0 && idx < days) {
        counts[idx] += 1;
        volume[idx] += t.amount;
      }
    }
    return {
      dailyCounts: counts,
      dailyVolume: volume,
      totalVolume: total,
      openAlerts: (anomalyAlerts ?? []).filter((f) => f.status === 'open' || f.status === 'under_review').length,
    };
  }, [transactions, anomalyAlerts]);

  if (!isLoading && !merchant) return <Navigate to="/merchants" replace />;

  const handleReview = async (decision: 'approve' | 'reject') => {
    if (!merchant) return;
    setSubmitting(true);
    try {
      await reviewMerchantKyc(merchant.id, decision, reviewNote || (decision === 'approve' ? 'Documents verified.' : 'Documents insufficient.'), { role: user?.role ?? 'unknown', name: user?.name ?? 'unknown' });
      await queryClient.invalidateQueries({ queryKey: ['merchant', id] });
      await queryClient.invalidateQueries({ queryKey: ['merchantStatusLog', id] });
      setReviewNote('');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !merchant) return <Skeleton rows={5} avatar />;

  return (
    <div>
      <TextLink to="/merchants" arrow={false} className="!py-0 mb-16 inline-block">&larr; Merchants</TextLink>
      <div className="flex items-start justify-between mb-32">
        <div>
          <h1 className="text-heading font-signifier text-ink">{merchant.legalName}</h1>
          <p className="text-body font-sohne text-slate mt-4">{merchant.merchantCode} &middot; {MERCHANT_TYPE_LABEL[merchant.merchantType]}</p>
        </div>
        <StatusPill label={merchant.status.replace('_', ' ')} tone={STATUS_TONE[merchant.status]} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 mb-24">
        <Card variant="elevated" className="p-24 lg:col-span-2">
          <h2 className="text-subheading font-signifier text-ink mb-16">Profile</h2>
          <div className="grid grid-cols-2 gap-y-12 text-body font-sohne">
            <span className="text-slate">Trading name</span><span className="text-ink">{merchant.tradingName ?? '—'}</span>
            <span className="text-slate">Registration number</span><span className="text-ink">{merchant.registrationNumber ?? '—'}</span>
            <span className="text-slate">ID verification</span><span className="text-ink capitalize">{merchant.idVerificationStatus}</span>
            <span className="text-slate">Contact</span><span className="text-ink">{merchant.contactPhone}</span>
            <span className="text-slate">Region</span><span className="text-ink">{merchant.regionLabel ?? '—'}</span>
            <span className="text-slate">Local authority</span><span className="text-ink">{merchant.localAuthorityLabel ?? '—'}</span>
            <span className="text-slate">Onboarded</span><span className="text-ink">{new Date(merchant.createdAt).toLocaleDateString()}</span>
          </div>
        </Card>

        <Card variant="accent" className="p-24">
          <h2 className="text-body font-sohne font-500 mb-8">Identity and ownership review</h2>
          {merchant.status === 'pending_kyc' && user?.role === 'admin' ? (
            <>
              <p className="text-caption font-sohne mb-12">This merchant is awaiting document review.</p>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Review note (optional)"
                className="w-full border border-sienna/30 rounded-inputs px-12 py-8 text-caption font-sohne bg-paper mb-12"
                rows={2}
              />
              <div className="flex gap-8">
                <Button variant="filled" disabled={submitting} onClick={() => handleReview('approve')}>Approve</Button>
                <Button variant="ghost" disabled={submitting} onClick={() => handleReview('reject')}>Reject</Button>
              </div>
            </>
          ) : (
            <p className="text-caption font-sohne">
              {merchant.status === 'suspended'
                ? 'Suspended — see status timeline below.'
                : 'Verified. No action required.'}
            </p>
          )}
        </Card>
      </div>

      {merchant.beneficialOwners.length > 0 && (
        <Card variant="elevated" className="p-24 mb-24">
          <h2 className="text-subheading font-signifier text-ink mb-16">People behind the business</h2>
          <p className="text-caption font-sohne text-slate mb-16">
            Who ultimately owns this business. Recorded because the rules on money laundering
            require a named person, not just a registered company.
          </p>
          <div className="space-y-12">
            {merchant.beneficialOwners.map((bo) => (
              <div key={bo.id} className="flex items-center gap-16">
                <Avatar name={bo.fullName} />
                <div className="flex-1">
                  <p className="text-body font-sohne text-ink">{bo.fullName}</p>
                  <p className="text-caption font-sohne text-slate">
                    {bo.ownershipPercent}% ownership
                    {bo.isPep && ' \u00b7 politically exposed'}
                  </p>
                </div>
                {/* Whether an identifier is on file, never the identifier
                    itself. A reviewer needs to know the check was done. */}
                <StatusPill
                  label={bo.hasIdOnFile ? 'Identity on file' : 'No identity on file'}
                  tone={bo.hasIdOnFile ? 'success' : 'warning'}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-16 mb-24">
        <Card variant="neutral" className="p-20">
          <p className="text-caption font-sohne text-slate">Status</p>
          <p className="text-heading-sm font-signifier text-ink capitalize">
            {merchant.status.replace(/_/g, ' ')}
          </p>
          <p className="text-caption font-sohne text-ash mt-4">
            Registered {new Date(merchant.createdAt).toLocaleDateString('en-NA')}
          </p>
        </Card>
        <Card variant="neutral" className="p-20">
          <p className="text-caption font-sohne text-slate">Transactions (30d)</p>
          <p className="text-heading-sm font-signifier text-ink tabular-nums">{transactions?.length ?? 0}</p>
          {/* Daily counts, so trading rhythm is visible at a glance — a
              merchant that stopped trading a week ago looks nothing like one
              that is growing, and the total alone hides both. */}
          <Sparkline
            className="mt-8"
            values={dailyCounts}
            label="Daily transaction count over the last 30 days"
          />
        </Card>
        <Card variant="neutral" className="p-20">
          <p className="text-caption font-sohne text-slate">Volume (30d)</p>
          <p className="text-heading-sm font-signifier text-ink tabular-nums">
            N${Math.round(totalVolume).toLocaleString('en-NA')}
          </p>
          <Sparkline
            className="mt-8"
            values={dailyVolume}
            label="Daily transaction volume over the last 30 days"
          />
        </Card>
        <Card variant="neutral" className="p-20">
          <p className="text-caption font-sohne text-slate">Flagged</p>
          <p
            className={`text-heading-sm font-signifier tabular-nums ${
              openAlerts > 0 ? 'text-status-danger' : 'text-ink'
            }`}
          >
            {anomalyAlerts?.length ?? 0}
          </p>
          <p className="text-caption font-sohne text-ash mt-4">
            {openAlerts > 0 ? `${openAlerts} still open` : 'none open'}
          </p>
        </Card>
      </div>

      <Card variant="elevated" className="p-24 mb-24">
        <h2 className="text-subheading font-signifier text-ink mb-16">Recent payments</h2>
        <div className="divide-y divide-mist">
          {(transactions ?? []).slice(0, 8).map((t) => (
            <Link key={t.id} to={`/transactions/${t.id}`} className="flex justify-between py-12 hover:bg-blush-tint -mx-8 px-8 rounded-inputs">
              <span className="text-body font-sohne text-ink">{t.transactionRef}</span>
              <span className="text-caption font-sohne text-slate">N${t.amount.toFixed(2)} &middot; {t.status}</span>
            </Link>
          ))}
          {(transactions ?? []).length === 0 && <p className="text-caption font-sohne text-slate py-12">Nothing has come through this business yet.</p>}
        </div>
      </Card>

      <Card variant="elevated" className="p-24">
        <h2 className="text-subheading font-signifier text-ink mb-16">What has happened</h2>
        <Timeline entries={toTimelineEntries(statusLog)} />
      </Card>
    </div>
  );
};

export default MerchantDetailPage;
