import React from 'react';
import Card from '../ui/Card';
import TextLink from '../ui/TextLink';
import { AnomalyAlert } from '../../types/soundbox';

interface AnomalyAlertsCardProps {
  data?: AnomalyAlert[];
  loading: boolean;
}

const AnomalyAlertsCard: React.FC<AnomalyAlertsCardProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <Card variant="elevated" className="p-24 text-caption text-slate">
        Loading
      </Card>
    );
  }

  const highRisk = (data ?? []).filter((a) => a.riskLevel === 'HIGH' && a.status !== 'resolved');

  return (
    <Card variant="elevated" className="p-24">
      <div className="flex justify-between items-center">
        <h3 className="text-subheading font-signifier text-ink">Flagged</h3>
        <TextLink to="/flagged" className="!py-0 text-caption">View all</TextLink>
      </div>
      <div className="mt-16">
        {highRisk.length > 0 ? (
          <div className="divide-y divide-mist">
            {highRisk.slice(0, 3).map((alert) => (
              <div key={alert.id} className="flex justify-between items-center py-12">
                <span className="text-body font-sohne text-ink">{alert.merchantId}</span>
                <span className="text-body font-sohne text-status-danger">N${alert.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-caption text-slate">No open high-risk alerts</p>
        )}
      </div>
    </Card>
  );
};

export default AnomalyAlertsCard;
