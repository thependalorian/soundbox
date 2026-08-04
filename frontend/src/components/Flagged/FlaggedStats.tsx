import React from 'react';
import Card from '../ui/Card';
import { AnomalyAlert } from '../../types/domain';

interface FlaggedStatsProps {
  data: AnomalyAlert[];
}

const FlaggedStats: React.FC<FlaggedStatsProps> = ({ data }) => {
  const total = data.length;
  const open = data.filter((a) => a.status === 'open').length;
  const highRisk = data.filter((a) => a.riskLevel === 'HIGH').length;
  const resolved = data.filter((a) => a.status === 'resolved').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-16 mb-24">
      <Card variant="neutral" className="p-20">
        <div className="text-caption font-sohne text-slate">Total alerts</div>
        <div className="text-heading-sm font-signifier text-ink">{total}</div>
      </Card>
      <Card variant="neutral" className="p-20">
        <div className="text-caption font-sohne text-slate">Open</div>
        <div className="text-heading-sm font-signifier text-status-warning">{open}</div>
      </Card>
      <Card variant="neutral" className="p-20">
        <div className="text-caption font-sohne text-slate">High risk</div>
        <div className="text-heading-sm font-signifier text-status-danger">{highRisk}</div>
      </Card>
      <Card variant="neutral" className="p-20">
        <div className="text-caption font-sohne text-slate">Resolved</div>
        <div className="text-heading-sm font-signifier text-status-success">{resolved}</div>
      </Card>
    </div>
  );
};

export default FlaggedStats;
