import React from 'react';
import Card from '../ui/Card';

interface Filters {
  status: string;
  search: string;
}

interface DeviceFiltersProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
}

const inputClass =
  'w-full border border-mist rounded-inputs px-16 py-8 text-body font-sohne text-ink focus:outline-none focus:ring-2 focus:ring-ink/20';

const DeviceFilters: React.FC<DeviceFiltersProps> = ({ filters, setFilters }) => {
  return (
    <Card variant="neutral" className="p-16 mb-24">
      <div className="flex flex-wrap gap-16">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-caption font-sohne text-slate mb-4">Search</label>
          <input
            type="text"
            placeholder="Search devices..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="w-[192px]">
          <label className="block text-caption font-sohne text-slate mb-4">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className={inputClass}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>
    </Card>
  );
};

export default DeviceFilters;
