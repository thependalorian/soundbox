import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions, fetchMerchants } from '../api/api';
import { Transaction, Merchant } from '../types/soundbox';
import Card from '../components/ui/Card';
import PageAction from '../components/ui/PageAction';
import Skeleton from '../components/ui/Skeleton';
import StatusPill from '../components/ui/StatusPill';
import { useAuth } from '../context/AuthContext';

const STATUS_TONE: Record<Transaction['status'], 'success' | 'warning' | 'danger' | 'neutral'> = {
  success: 'success',
  pending: 'warning',
  verified: 'warning',
  failed: 'danger',
  reversed: 'neutral',
};

const TransactionsPage: React.FC = () => {
  const { user } = useAuth();
  const merchantId = user?.role === 'merchant' ? user.merchantId : undefined;
  const [filters, setFilters] = useState({ status: '', search: '' });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', filters, merchantId ?? 'all'],
    queryFn: () => fetchTransactions({ ...filters, merchantId }),
  });

  // A payment that did not complete is the only row here anyone must act on.
  const failed = (transactions ?? []).filter((t) => t.status === 'failed' || t.status === 'reversed').length;

  const { data: merchants } = useQuery({ queryKey: ['merchants'], queryFn: () => fetchMerchants() });
  const merchantName = (id: string) => (merchants as Merchant[] | undefined)?.find((m) => m.id === id)?.legalName ?? id;

  return (
    <div>
      <h1 className="text-heading font-signifier text-ink mb-8">
        {merchantId ? 'My payments' : 'Payments'}
      </h1>
      <p className="text-body font-sohne text-slate mb-24">
        Every payment the boxes heard, newest first.
      </p>
      {failed > 0 ? (
        <PageAction
          className="mb-24"
          urgent
          onClick={() => setFilters((f) => ({ ...f, status: 'failed' }))}
          label="Review failed payments"
          context={`${failed} did not complete`}
        />
      ) : (
        <PageAction className="mb-24" to="/analytics" label="See payment trend" context="None failed" />
      )}

      <Card variant="neutral" className="p-16 mb-24">
        <div className="flex flex-wrap gap-16">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-caption font-sohne text-slate mb-4">Search</label>
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full border border-mist rounded-inputs px-16 py-8 text-body font-sohne focus:outline-none focus:ring-2 focus:ring-ink/20"
            />
          </div>
          <div className="w-[192px]">
            <label className="block text-caption font-sohne text-slate mb-4">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-mist rounded-inputs px-16 py-8 text-body font-sohne focus:outline-none focus:ring-2 focus:ring-ink/20"
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="reversed">Reversed</option>
            </select>
          </div>
        </div>
      </Card>

      <Card variant="elevated" className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-mist">
            <tr>
              {['Reference', 'Merchant', 'Amount', 'Type', 'Status', 'Date'].map((h) => (
                <th key={h} className="px-20 py-12 text-left text-caption font-sohne text-ash">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {isLoading && (
              <tr><td colSpan={6} className="px-20 py-8"><Skeleton rows={6} /></td></tr>
            )}
            {transactions?.map((txn: Transaction) => (
              <tr key={txn.id} className="hover:bg-blush-tint">
                <td className="px-20 py-16 text-body font-sohne text-ink">
                  <Link to={`/transactions/${txn.id}`} className="hover:underline">{txn.transactionRef}</Link>
                </td>
                <td className="px-20 py-16 text-body font-sohne text-slate">{merchantName(txn.merchantId)}</td>
                <td className="px-20 py-16 text-body font-sohne text-ink">N${txn.amount.toFixed(2)}</td>
                <td className="px-20 py-16 text-caption font-sohne text-ash uppercase">{txn.paymentType}</td>
                <td className="px-20 py-16"><StatusPill label={txn.status} tone={STATUS_TONE[txn.status]} /></td>
                <td className="px-20 py-16 text-caption font-sohne text-slate">{new Date(txn.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
};

export default TransactionsPage;
