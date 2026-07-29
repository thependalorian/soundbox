import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchDeviceById, fetchDeviceHeartbeats, fetchDeviceStatusLog, fetchMerchantById } from '../api/api';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Timeline from '../components/ui/Timeline';
import { StatusLogEntry } from '../types/soundbox';
import StatusPill from '../components/ui/StatusPill';
import TextLink from '../components/ui/TextLink';
import { useAuth } from '../context/AuthContext';
import DeviceActions from '../components/Devices/DeviceActions';

const TONE: Record<string, 'success' | 'danger' | 'neutral'> = { active: 'success', offline: 'danger', inactive: 'neutral' };


const TONE_MAP: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {active: 'success', faulty: 'danger', offline: 'warning', retired: 'default'};
const TONE_FOR = (s: string) => TONE_MAP[s] ?? 'default';

/** Newest first, and a tone that reflects what the transition means. */
const toTimelineEntries = (log: StatusLogEntry[] = []) =>
  [...log]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((entry) => ({
      id: entry.id,
      title: entry.fromStatus
        ? `${entry.fromStatus.replace(/_/g, ' ')} \u2192 ${entry.toStatus.replace(/_/g, ' ')}`
        : entry.toStatus.replace(/_/g, ' '),
      detail: entry.note ?? undefined,
      meta:
        new Date(entry.createdAt).toLocaleString() +
        (entry.actorName ? ` \u00b7 ${entry.actorName}` : ''),
      tone: TONE_FOR(entry.toStatus),
    }));

const DeviceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: device, isLoading } = useQuery({ queryKey: ['device', id], queryFn: () => fetchDeviceById(id as string), enabled: !!id });
  const { data: merchant } = useQuery({ queryKey: ['merchant', device?.merchantId], queryFn: () => fetchMerchantById(device!.merchantId), enabled: !!device });
  const { data: heartbeats } = useQuery({ queryKey: ['deviceHeartbeats', id], queryFn: () => fetchDeviceHeartbeats(id as string), enabled: !!id });
  const { data: statusLog } = useQuery({ queryKey: ['deviceStatusLog', id], queryFn: () => fetchDeviceStatusLog(id as string), enabled: !!id });

  if (!isLoading && !device) return <Navigate to="/devices" replace />;
  if (device && user?.role === 'merchant' && merchant && merchant.merchantCode !== user.merchantId) {
    return <Navigate to="/devices" replace />;
  }
  if (isLoading || !device) return <Skeleton rows={4} />;

  const chartData = (heartbeats ?? []).map((h) => ({
    date: new Date(h.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    battery: h.batteryLevel,
  }));

  return (
    <div>
      <TextLink to="/devices" arrow={false} className="!py-0 mb-16 inline-block">&larr; Devices</TextLink>
      <div className="flex items-start justify-between mb-32">
        <div>
          <h1 className="text-heading font-signifier text-ink">{device.deviceCode}</h1>
          {merchant && <p className="text-body font-sohne text-slate mt-4">{merchant.legalName}</p>}
        </div>
        <StatusPill label={device.status} tone={TONE[device.status]} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 mb-24">
        <Card variant="neutral" className="p-20">
          <p className="text-caption font-sohne text-slate">Battery</p>
          <p className="text-heading-sm font-signifier text-ink">{device.batteryLevel}%</p>
        </Card>
        <Card variant="neutral" className="p-20">
          <p className="text-caption font-sohne text-slate">Signal</p>
          <p className="text-heading-sm font-signifier text-ink">{device.signalStrength}/5</p>
        </Card>
        <Card variant="neutral" className="p-20">
          <p className="text-caption font-sohne text-slate">Firmware</p>
          <p className="text-heading-sm font-signifier text-ink">{device.firmwareVersion}</p>
        </Card>
      </div>

      {user?.role === 'admin' && <DeviceActions device={device} actor={{ role: user.role, name: user.name }} />}

      <Card variant="elevated" className="p-24 mb-24">
        <h2 className="text-subheading font-signifier text-ink mb-16">Battery and signal, last 14 days</h2>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" stroke="#675C62" fontSize={12} />
              <YAxis stroke="#675C62" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #F6F1F2' }} />
              <Line type="monotone" dataKey="battery" stroke="#E6136C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-body text-slate">This device has not reported in yet. Battery and signal appear here once it does.</p>
        )}
      </Card>

      <Card variant="elevated" className="p-24">
        <h2 className="text-subheading font-signifier text-ink mb-16">What has happened</h2>
        <Timeline entries={toTimelineEntries(statusLog)} />
      </Card>
    </div>
  );
};

export default DeviceDetailPage;
