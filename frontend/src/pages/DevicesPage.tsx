import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDevices, fetchMerchants } from '../api/api';
import DeviceTable from '../components/Devices/DeviceTable';
import PageAction from '../components/ui/PageAction';
import DeviceFilters from '../components/Devices/DeviceFilters';
import DeviceStatusSummary from '../components/Devices/DeviceStatusSummary';
import { useAuth } from '../context/AuthContext';

const DevicesPage: React.FC = () => {
  const { user } = useAuth();
  const merchantId = user?.role === 'merchant' ? user.merchantId : undefined;
  const [filters, setFilters] = useState({ status: '', search: '' });

  const { data: devices, isLoading } = useQuery({
    queryKey: ['devices', filters, merchantId ?? 'all'],
    queryFn: () => fetchDevices({ ...filters, merchantId }),
  });

  const { data: merchants } = useQuery({ queryKey: ['merchants'], queryFn: () => fetchMerchants() });

  // A device that stopped reporting is the one worth chasing: the seller
  // may not know yet, and coverage figures quietly overstate reach.
  const silent = (devices ?? []).filter((d) => d.status !== 'active');

  return (
    <div>
      <h1 className="text-heading font-signifier text-ink mb-8">
        {merchantId ? 'My devices' : 'Devices'}
      </h1>
      <p className="text-body font-sohne text-slate mb-24">
        Every box reports its battery and signal. One that goes quiet shows up here first.
      </p>
      {silent.length > 0 ? (
        <PageAction
          className="mb-24"
          urgent
          onClick={() => setFilters((f) => ({ ...f, status: 'offline' }))}
          label="Investigate silent devices"
          context={`${silent.length} not reporting`}
        />
      ) : (
        <PageAction className="mb-24" to="/map" label="See device coverage" context="All reporting" />
      )}

      <DeviceStatusSummary devices={devices || []} />
      <DeviceFilters filters={filters} setFilters={setFilters} />
      <DeviceTable devices={devices || []} merchants={merchants || []} loading={isLoading} />
    </div>
  );
};

export default DevicesPage;
