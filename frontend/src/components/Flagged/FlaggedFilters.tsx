import React from 'react';
import Card from '../ui/Card';

interface Filters {
  riskLevel: string;
  dateRange: string;
}

interface FlaggedFiltersProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
}

const inputClass =
  'w-full border border-mist rounded-inputs px-16 py-8 text-body font-sohne text-ink focus:outline-none focus:ring-2 focus:ring-ink/20';

const FlaggedFilters: React.FC<FlaggedFiltersProps> = ({ filters, setFilters }) => {
  return (
    <Card variant="neutral" className="p-16 mb-24">
      <div className="flex flex-wrap gap-16">
        <div className="w-[192px]">
          <label className="block text-caption font-sohne text-slate mb-4">Risk level</label>
          <select
            value={filters.riskLevel}
            onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
            className={inputClass}
          >
            <option value="">All</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
        <div className="w-[192px]">
          <label className="block text-caption font-sohne text-slate mb-4">Date range</label>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            className={inputClass}
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      </div>
    </Card>
  );
};

export default FlaggedFilters;
