import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAnomalyAlertById,
  fetchAnomalyAlertStatusLog,
  fetchMerchantById,
  recordAnomalyFeedback,
  setAnomalyAlertStatus,
} from '../api/api';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Timeline from '../components/ui/Timeline';
import StatusPill from '../components/ui/StatusPill';
import TextLink from '../components/ui/TextLink';
import Button from '../components/ui/Button';
import ConfidenceBadge from '../components/ui/ConfidenceBadge';
import ExplanationCard from '../components/ui/ExplanationCard';
import FeedbackControl, { FeedbackVerdict } from '../components/ui/FeedbackControl';
import { AnomalyAlert, StatusLogEntry} from '../types/soundbox';
import { useAuth } from '../context/AuthContext';

const RISK_TONE: Record<AnomalyAlert['riskLevel'], 'danger' | 'warning' | 'success'> = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'success' };
const STATUS_TONE: Record<AnomalyAlert['status'], 'warning' | 'neutral' | 'success' | 'danger'> = {
  open: 'warning',
  under_review: 'neutral',
  resolved: 'success',
  escalated: 'danger',
};


const TONE_MAP: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {resolved: 'success', escalated: 'danger', under_review: 'warning', open: 'warning'};
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

const AnomalyAlertDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: alert, isLoading } = useQuery({ queryKey: ['anomalyAlert', id], queryFn: () => fetchAnomalyAlertById(id as string), enabled: !!id });
  const { data: merchant } = useQuery({ queryKey: ['merchant', alert?.merchantId], queryFn: () => fetchMerchantById(alert!.merchantId), enabled: !!alert });
  const { data: statusLog } = useQuery({ queryKey: ['anomalyAlertStatusLog', id], queryFn: () => fetchAnomalyAlertStatusLog(id as string), enabled: !!id });

  if (!isLoading && !alert) return <Navigate to="/flagged" replace />;
  if (alert && user?.role === 'merchant' && merchant && merchant.merchantCode !== user.merchantId) {
    return <Navigate to="/flagged" replace />;
  }
  if (isLoading || !alert) return <Skeleton rows={5} />;

  const canTriage = user?.role === 'admin' && (alert.status === 'open' || alert.status === 'under_review');

  const handleTransition = async (newStatus: AnomalyAlert['status']) => {
    setSubmitting(true);
    try {
      await setAnomalyAlertStatus(alert.id, newStatus, note || `Marked ${newStatus.replace('_', ' ')}.`, { role: user?.role ?? 'unknown', name: user?.name ?? 'unknown' });
      await queryClient.invalidateQueries({ queryKey: ['anomalyAlert', id] });
      await queryClient.invalidateQueries({ queryKey: ['anomalyAlertStatusLog', id] });
      setNote('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <TextLink to="/flagged" arrow={false} className="!py-0 mb-16 inline-block">&larr; Flagged</TextLink>
      <div className="flex items-start justify-between mb-32">
        <div>
          <h1 className="text-heading font-signifier text-ink">{merchant?.legalName ?? alert.merchantId}</h1>
          <p className="text-body font-sohne text-slate mt-4">{alert.signalType?.replace(/_/g, ' ')}</p>
        </div>
        <div className="flex gap-8">
          <StatusPill label={alert.riskLevel} tone={RISK_TONE[alert.riskLevel]} />
          <StatusPill label={alert.status.replace('_', ' ')} tone={STATUS_TONE[alert.status]} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-16 mb-24">
        <Card variant="neutral" className="p-20">
          <p className="text-caption font-sohne text-slate">Amount</p>
          <p className="text-heading-sm font-signifier text-ink tabular-nums">
            N${alert.amount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
          </p>
        </Card>
        <Card variant="neutral" className="p-20">
          <p className="text-caption font-sohne text-slate">Exposure</p>
          <p className="text-heading-sm font-signifier text-ink tabular-nums">
            N${alert.expectedLoss.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-caption font-sohne text-ash mt-4">Amount at risk if genuine</p>
        </Card>
        <Card variant="neutral" className="p-20 lg:col-span-2">
          <p className="text-caption font-sohne text-slate">Assessment</p>
          <div className="mt-8">
            <ConfidenceBadge band={alert.confidenceBand} probability={alert.anomalyScore} />
          </div>
        </Card>
      </div>

      <ExplanationCard
        reasons={alert.reasons}
        modelName={alert.modelName}
        modelVersion={alert.modelVersion}
        className="mb-24"
      />

      {user?.role === 'admin' && (alert.status === 'open' || alert.status === 'under_review') && (
        <FeedbackControl
          className="mb-24"
          onSubmit={async (verdict: FeedbackVerdict, feedbackNote: string) => {
            await recordAnomalyFeedback(alert.id, verdict, feedbackNote, {
              role: user?.role ?? 'unknown',
              name: user?.name ?? 'unknown',
            });
            await queryClient.invalidateQueries({ queryKey: ['anomalyAlert', id] });
            await queryClient.invalidateQueries({ queryKey: ['anomalyAlertStatusLog', id] });
          }}
        />
      )}

      {canTriage && (
        <Card variant="accent" className="p-24 mb-24">
          <h2 className="text-body font-sohne font-500 mb-8">Triage</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Resolution note (optional)"
            rows={2}
            className="w-full border border-sienna/30 rounded-inputs px-12 py-8 text-caption font-sohne bg-paper mb-12"
          />
          <div className="flex gap-8">
            <Button variant="filled" disabled={submitting} onClick={() => handleTransition('resolved')}>Resolve</Button>
            <Button variant="ghost" disabled={submitting} onClick={() => handleTransition('escalated')}>Escalate</Button>
            {alert.status === 'open' && (
              <Button variant="ghost" disabled={submitting} onClick={() => handleTransition('under_review')}>Mark under review</Button>
            )}
          </div>
        </Card>
      )}

      <Card variant="elevated" className="p-24">
        <h2 className="text-subheading font-signifier text-ink mb-16">How this was handled</h2>
        <Timeline entries={toTimelineEntries(statusLog)} />
      </Card>
    </div>
  );
};

export default AnomalyAlertDetailPage;
