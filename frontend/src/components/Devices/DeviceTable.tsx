import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import StatusPill from '../ui/StatusPill';
import { Device, Merchant } from '../../types/soundbox';

interface DeviceTableProps {
  devices: Device[];
  merchants: Merchant[];
  loading: boolean;
}

const TONE: Record<Device['status'], 'success' | 'danger' | 'neutral'> = {
  active: 'success',
  offline: 'danger',
  faulty: 'danger',
  inactive: 'neutral',
  retired: 'neutral',
};

const DeviceTable: React.FC<DeviceTableProps> = ({ devices, merchants, loading }) => {
  if (loading) return <Card variant="elevated" className="p-24"><Skeleton rows={6} /></Card>;

  const merchantName = (id: string) => merchants.find((m) => m.id === id)?.legalName ?? id;

  return (
    <Card variant="elevated" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-mist">
            <tr>
              {['Device', 'Merchant', 'Status', 'Battery', 'Last Heartbeat'].map((h) => (
                <th key={h} className="px-20 py-12 text-left text-caption font-sohne text-ash">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {devices.map((device) => (
              <tr key={device.id} className="hover:bg-blush-tint">
                <td className="px-20 py-16 text-body font-sohne text-ink">
                  <Link to={`/devices/${device.id}`} className="hover:underline">{device.deviceCode}</Link>
                </td>
                <td className="px-20 py-16 text-body font-sohne text-slate">{merchantName(device.merchantId)}</td>
                <td className="px-20 py-16"><StatusPill label={device.status} tone={TONE[device.status]} /></td>
                <td className="px-20 py-16 text-body font-sohne text-ink">{device.batteryLevel}%</td>
                <td className="px-20 py-16 text-caption font-sohne text-slate">{new Date(device.lastHeartbeatAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default DeviceTable;
