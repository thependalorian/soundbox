import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAnomalyAlerts, fetchMerchants } from '../api/api';
import FlaggedList from '../components/Flagged/FlaggedList';
import PageAction from '../components/ui/PageAction';
import FlaggedStats from '../components/Flagged/FlaggedStats';
import FlaggedFilters from '../components/Flagged/FlaggedFilters';
import { useAuth } from '../context/AuthContext';

const FlaggedPage: React.FC = () => {
  const { user } = useAuth();
  const merchantId = user?.role === 'merchant' ? user.merchantId : undefined;
  const [filters, setFilters] = useState({ riskLevel: '', dateRange: '30d' });

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['anomalyAlerts', merchantId ?? 'all'],
    queryFn: () => fetchAnomalyAlerts(merchantId ? { merchantId } : undefined),
  });

  const { data: merchants } = useQuery({ queryKey: ['merchants'], queryFn: () => fetchMerchants() });

  const filtered = (alerts ?? []).filter((a) => !filters.riskLevel || a.riskLevel === filters.riskLevel);

  // The queue is already exposure-ordered, so the first open alert is the
  // one carrying the most money at risk.
  const topOpen = filtered.find((a) => a.status === 'open' || a.status === 'under_review');
  const openCount = filtered.filter((a) => a.status === 'open' || a.status === 'under_review').length;

  return (
    <div>
      <h1 className="text-heading font-signifier text-ink mb-8">
        {merchantId ? 'My flagged payments' : 'Flagged for review'}
      </h1>
      <p className="text-body font-sohne text-slate mb-24">
        Payments the system found unusual, ordered by how much money is at risk. Unusual is not
        the same as fraudulent — that judgement is yours, and recording it is what will eventually
        let us measure how often the system is right.
      </p>
      {topOpen ? (
        <PageAction
          className="mb-24"
          urgent
          to={`/flagged/${topOpen.id}`}
          label="Open highest exposure"
          context={`${openCount} open · N$${topOpen.expectedLoss.toLocaleString('en-NA', { minimumFractionDigits: 2 })} at risk`}
        />
      ) : (
        <PageAction className="mb-24" to="/analytics" label="Review flag trend" context="Nothing open" />
      )}
      <FlaggedStats data={alerts || []} />
      <FlaggedFilters filters={filters} setFilters={setFilters} />
      <FlaggedList alerts={filtered} merchants={merchants || []} loading={isLoading} />
    </div>
  );
};

export default FlaggedPage;
