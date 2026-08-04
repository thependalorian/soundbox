import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMerchants, reviewMerchantKyc } from '../api/api';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { logger } from '../lib/logger';
import { Merchant, MERCHANT_TYPE_LABEL } from '../types/domain';
import Card from '../components/ui/Card';
import PageAction from '../components/ui/PageAction';
import Skeleton from '../components/ui/Skeleton';
import StatusPill from '../components/ui/StatusPill';

const STATUS_TONE: Record<Merchant['status'], 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  pending_kyc: 'warning',
  suspended: 'danger',
  closed: 'neutral',
};

const MerchantsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Decisions can be taken from the list because the alternative — open each
  // application, decide, go back, lose your place — is how a review queue
  // stops being worked. A rejection still routes through the detail page,
  // where the required reason belongs.
  const canReview = user?.role === 'admin' || user?.role === 'regulator';
  const [deciding, setDeciding] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const approve = async (merchantId: string, name: string) => {
    setDeciding(merchantId);
    setDecisionError(null);
    try {
      await reviewMerchantKyc(merchantId, 'approve', `Approved from the review queue: ${name}.`, {
        role: user?.role ?? 'unknown',
        name: user?.name ?? 'unknown',
      });
      await queryClient.invalidateQueries({ queryKey: ['merchants'] });
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      logger.error('Could not approve application', e);
      setDecisionError(detail ?? 'That decision was not recorded. The application is unchanged.');
    } finally {
      setDeciding(null);
    }
  };

  const { data: merchants, isLoading } = useQuery({
    queryKey: ['merchants', search, status],
    queryFn: () => fetchMerchants({ search, status }),
  });

  // Applications waiting on a decision — computed unfiltered, so the count
  // does not vanish the moment someone filters the table.
  const { data: allMerchants } = useQuery({ queryKey: ['merchants'], queryFn: () => fetchMerchants() });
  const pendingCount = (allMerchants ?? []).filter((m) => m.status === 'pending_kyc').length;

  return (
    <div>
      <h1 className="text-heading font-signifier text-ink mb-8">Businesses</h1>
      <p className="text-body font-sohne text-slate mb-24">
        Every business on the network, and where each one stands.
      </p>
      {pendingCount > 0 ? (
        <PageAction
          className="mb-24"
          urgent
          onClick={() => setStatus('pending_kyc')}
          label="Review pending applications"
          context={`${pendingCount} waiting`}
        />
      ) : (
        <PageAction className="mb-24" to="/map" label="See coverage by region" />
      )}

      <Card variant="neutral" className="p-16 mb-24">
        <div className="flex flex-wrap gap-16">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-caption font-sohne text-slate mb-4">Search</label>
            <input
              type="text"
              placeholder="Search by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-mist rounded-inputs px-16 py-8 text-body font-sohne focus:outline-none focus:ring-2 focus:ring-ink/20"
            />
          </div>
          <div className="w-[192px]">
            <label className="block text-caption font-sohne text-slate mb-4">KYC status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-mist rounded-inputs px-16 py-8 text-body font-sohne focus:outline-none focus:ring-2 focus:ring-ink/20"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="pending_kyc">Pending KYC</option>
              <option value="suspended">Suspended</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </Card>

      {decisionError && (
        <Card className="p-16 mb-24 bg-peach">
          <p className="text-caption font-sohne text-sienna">{decisionError}</p>
        </Card>
      )}

      <Card variant="elevated" className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-mist">
            <tr>
              {['Business', 'Code', 'Segment', 'Region', 'KYC status'].map((h) => (
                <th key={h} className="px-20 py-12 text-left text-caption font-sohne text-ash">{h}</th>
              ))}
              {canReview && <th className="px-20 py-12 text-right text-caption font-sohne text-ash">Decision</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {isLoading && <tr><td colSpan={canReview ? 6 : 5} className="px-20 py-8"><Skeleton rows={5} /></td></tr>}
            {!isLoading && merchants?.length === 0 && (
              <tr>
                <td colSpan={canReview ? 6 : 5} className="px-20 py-32 text-center">
                  <p className="text-body font-sohne text-slate">No businesses match this view.</p>
                  <p className="text-caption font-sohne text-ash mt-4">
                    {status || search
                      ? 'Clear the filters to see everything on the network.'
                      : 'Businesses appear here once they are registered.'}
                  </p>
                </td>
              </tr>
            )}
            {merchants?.map((m) => (
              <tr key={m.id} className="hover:bg-blush-tint">
                <td className="px-20 py-16 text-body font-sohne text-ink">
                  <Link to={`/merchants/${m.id}`} className="hover:underline">{m.tradingName || m.legalName}</Link>
                </td>
                <td className="px-20 py-16 text-caption font-sohne text-slate">{m.merchantCode}</td>
                <td className="px-20 py-16 text-caption font-sohne text-slate">{MERCHANT_TYPE_LABEL[m.merchantType]}</td>
                <td className="px-20 py-16 text-caption font-sohne text-slate">{m.regionLabel ?? '—'}</td>
                <td className="px-20 py-16"><StatusPill label={m.status.replace('_', ' ')} tone={STATUS_TONE[m.status]} /></td>
                {canReview && (
                  <td className="px-20 py-16 text-right whitespace-nowrap">
                    {m.status === 'pending_kyc' ? (
                      <div className="inline-flex gap-8">
                        <Button
                          variant="filled"
                          disabled={deciding !== null}
                          onClick={() => approve(m.id, m.tradingName || m.legalName)}
                        >
                          Approve
                        </Button>
                        {/* Rejection needs a stated reason, so it goes
                            through the detail page where one is asked for. */}
                        <Link to={`/merchants/${m.id}`}>
                          <Button variant="ghost">Review</Button>
                        </Link>
                      </div>
                    ) : (
                      <Link to={`/merchants/${m.id}`} className="text-caption font-sohne text-slate hover:text-ink">
                        Open
                      </Link>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
};

export default MerchantsPage;
