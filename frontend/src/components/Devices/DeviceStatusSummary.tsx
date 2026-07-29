import React from 'react';
import Card from '../ui/Card';
import { Device } from '../../types/soundbox';

interface DeviceStatusSummaryProps {
  devices: Device[];
}

const DeviceStatusSummary: React.FC<DeviceStatusSummaryProps> = ({ devices }) => {
  const total = devices.length;
  const active = devices.filter((d) => d.status === 'active').length;
  const offline = devices.filter((d) => d.status === 'offline').length;
  const inactive = devices.filter((d) => d.status === 'inactive').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-16 mb-24">
      <Card variant="neutral" className="p-20">
        <div className="text-caption font-sohne text-slate">Total devices</div>
        <div className="text-heading-sm font-signifier text-ink">{total}</div>
      </Card>
      <Card variant="neutral" className="p-20">
        <div className="text-caption font-sohne text-slate">Active</div>
        <div className="text-heading-sm font-signifier text-status-success">{active}</div>
      </Card>
      <Card variant="neutral" className="p-20">
        <div className="text-caption font-sohne text-slate">Offline / Inactive</div>
        <div className="text-heading-sm font-signifier text-status-danger">{offline + inactive}</div>
      </Card>
    </div>
  );
};

export default DeviceStatusSummary;
