import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchGeoDistribution } from '../api/api';
import GeoDistributionMap from '../components/Map/GeoDistributionMap';
import Card from '../components/ui/Card';
import PageAction from '../components/ui/PageAction';
import Skeleton from '../components/ui/Skeleton';
import { GeoDistributionPoint } from '../types/soundbox';

const MapPage: React.FC = () => {
  const [view, setView] = useState<'markers' | 'heatmap'>('markers');

  const { data: points, isLoading } = useQuery({
    queryKey: ['geoDistribution'],
    queryFn: fetchGeoDistribution,
  });

  const located = (points ?? []).filter((p: GeoDistributionPoint) => p.lat !== null && p.lng !== null);
  const unlocated = (points ?? []).length - located.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-32">
        <h1 className="text-heading font-signifier text-ink">Coverage map</h1>
        <div className="flex gap-8">
          <button
            onClick={() => setView('markers')}
            className={`px-20 py-8 rounded-buttons text-body font-sohne transition-colors ${
              view === 'markers' ? 'bg-brand-gradient-aa text-paper' : 'bg-paper border border-ink text-ink hover:bg-mist'
            }`}
          >
            Markers
          </button>
          <button
            onClick={() => setView('heatmap')}
            className={`px-20 py-8 rounded-buttons text-body font-sohne transition-colors ${
              view === 'heatmap' ? 'bg-brand-gradient-aa text-paper' : 'bg-paper border border-ink text-ink hover:bg-mist'
            }`}
          >
            Heatmap
          </button>
        </div>
      </div>

      <Card variant="neutral" className="p-16 mb-16">
        <p className="text-caption font-sohne text-slate">
          {located.length} merchant location{located.length === 1 ? '' : 's'} plotted
          {unlocated > 0 ? `, ${unlocated} without coordinates on file` : ''}. Sized/weighted by
          transaction volume — backs docs/device.md's "Geographic Distribution" / "Merchant Activity
          Heatmaps" analytics.
        </p>
      </Card>

      <Card variant="elevated" className="overflow-hidden">
        {isLoading ? (
          <div className="h-[500px] p-24"><Skeleton rows={4} /></div>
        ) : (
          <GeoDistributionMap points={points ?? []} view={view} />
        )}
      </Card>
    </div>
  );
};

export default MapPage;
