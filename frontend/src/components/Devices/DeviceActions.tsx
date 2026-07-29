import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Card from '../ui/Card';
import Button from '../ui/Button';
import StatusPill from '../ui/StatusPill';
import {
  assignDevice,
  fetchMerchants,
  fetchTypeDefinitions,
  retireDevice,
  setDeviceStatus,
  updateDevice,
} from '../../api/api';
import { Device } from '../../types/soundbox';
import { logger } from '../../lib/logger';

/**
 * What an administrator can actually do to a device.
 *
 * The page above this showed a device's state in detail and offered no way
 * to change any of it, so a silent unit could be diagnosed and not acted on.
 *
 * Two decisions worth stating:
 *
 * - **Retiring asks for confirmation; nothing else does.** Reassignment and
 *   status changes are reversible and logged. Retirement takes the device
 *   out of every list, and while the row survives, an operator should not
 *   discover that by clicking.
 * - **Every action writes a note by default.** The reason ends up in the
 *   status log whether or not anyone types one, because "why is this device
 *   inactive" is asked months later, by someone else.
 */

interface Props {
  device: Device;
  actor: { role: string; name: string };
}

// What each configured status means, for the control's tooltip. Codes the
// deployment has configured but this map does not know still appear — they
// simply carry no hint, which is better than hiding a valid option.
const STATUS_HINT: Record<string, string> = {
  active: 'In service and expected to report in.',
  inactive: 'Not in service. Silence is expected.',
  offline: 'Should be reporting in and is not.',
  faulty: 'Known hardware problem, awaiting repair.',
};

const DeviceActions: React.FC<Props> = ({ device, actor }) => {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirmRetire, setConfirmRetire] = useState(false);
  const [firmware, setFirmware] = useState(device.firmwareVersion);

  const { data: merchants } = useQuery({
    queryKey: ['merchants', 'active'],
    queryFn: () => fetchMerchants({ status: 'active' }),
  });

  // Read from configuration, never hardcoded: offering a status the backend
  // has not configured produces a rejection the operator cannot act on.
  const { data: statusOptions } = useQuery({
    queryKey: ['typeDefinitions', 'device_status'],
    queryFn: () => fetchTypeDefinitions('device_status'),
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['device', device.id] }),
      queryClient.invalidateQueries({ queryKey: ['deviceStatusLog', device.id] }),
      queryClient.invalidateQueries({ queryKey: ['devices'] }),
    ]);
  };

  const run = async (label: string, action: () => Promise<unknown>) => {
    setBusy(label);
    setError(null);
    try {
      await action();
      await refresh();
      setNote('');
      setConfirmRetire(false);
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      logger.error(`Device action failed: ${label}`, e);
      setError(detail ?? 'That did not go through. The device is unchanged.');
    } finally {
      setBusy(null);
    }
  };

  const retired = device.status === 'retired';

  return (
    <Card variant="elevated" className="p-24 mb-24">
      <h2 className="text-subheading font-signifier text-ink mb-4">Actions</h2>
      <p className="text-caption font-sohne text-slate mb-20 max-w-[520px]">
        Every change here is kept on this device&rsquo;s history with your name against it.
      </p>

      {error && (
        <div className="bg-peach rounded-cards p-16 mb-20">
          <p className="text-caption font-sohne text-sienna">{error}</p>
        </div>
      )}

      {retired ? (
        <div className="flex items-center gap-12">
          <StatusPill label="retired" tone="neutral" />
          <p className="text-caption font-sohne text-slate">
            This device is out of service. Its payment history is kept and still resolves here.
          </p>
        </div>
      ) : (
        <>
          <label className="block text-caption font-sohne text-slate mb-4">
            Reason, kept on the record
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Optional. Kept on this device&rsquo;s record either way."
            className="w-full border border-mist rounded-inputs px-12 py-8 text-caption font-sohne bg-paper text-ink placeholder:text-smoke mb-20"
          />

          <div className="mb-20">
            <p className="text-caption font-sohne text-ash mb-8">Assign to a business</p>
            <div className="flex flex-wrap gap-8">
              <select
                defaultValue={device.merchantId ?? ''}
                disabled={busy !== null}
                onChange={(e) => {
                  const merchantId = e.target.value;
                  if (merchantId && merchantId !== device.merchantId) {
                    run('assign', () => assignDevice(device.id, merchantId, actor, note || undefined));
                  }
                }}
                className="flex-1 min-w-[220px] border border-mist rounded-inputs px-12 py-8 text-caption font-sohne bg-paper text-ink"
                aria-label="Assign device to a business"
              >
                <option value="">Not assigned</option>
                {(merchants ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.tradingName || m.legalName} ({m.merchantCode})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-caption font-sohne text-ash mt-4">
              Only businesses that have passed review appear here.
            </p>
          </div>

          <div className="mb-20">
            <p className="text-caption font-sohne text-ash mb-8">Service state</p>
            <div className="flex flex-wrap gap-8">
              {(statusOptions ?? []).map((s) => (
                <Button
                  key={s.code}
                  variant={device.status === s.code ? 'filled' : 'ghost'}
                  title={STATUS_HINT[s.code]}
                  disabled={busy !== null || device.status === s.code}
                  onClick={() => run('status', () => setDeviceStatus(device.id, s.code, actor, note || undefined))}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="mb-20">
            <p className="text-caption font-sohne text-ash mb-8">Recorded firmware version</p>
            <div className="flex flex-wrap gap-8">
              <input
                value={firmware}
                onChange={(e) => setFirmware(e.target.value)}
                className="flex-1 min-w-[160px] border border-mist rounded-inputs px-12 py-8 text-caption font-sohne bg-paper text-ink"
                aria-label="Firmware version"
              />
              <Button
                variant="ghost"
                disabled={busy !== null || firmware === device.firmwareVersion}
                onClick={() => run('firmware', () => updateDevice(device.id, { firmwareVersion: firmware, note: note || undefined }, actor))}
              >
                Record
              </Button>
            </div>
            <p className="text-caption font-sohne text-ash mt-4">
              What this device is believed to be running. It does not push an update.
            </p>
          </div>

          <div className="pt-20 border-t border-mist">
            {confirmRetire ? (
              <div className="flex flex-wrap items-center gap-12">
                <p className="text-caption font-sohne text-ink flex-1 min-w-[240px]">
                  Retire {device.deviceCode}? It leaves every list. Its payment history is kept.
                </p>
                <Button
                  variant="filled"
                  disabled={busy !== null}
                  onClick={() => run('retire', () => retireDevice(device.id, actor, note || undefined))}
                >
                  Retire it
                </Button>
                <Button variant="ghost" disabled={busy !== null} onClick={() => setConfirmRetire(false)}>
                  Keep it
                </Button>
              </div>
            ) : (
              <Button variant="ghost" disabled={busy !== null} onClick={() => setConfirmRetire(true)}>
                Retire this device
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
};

export default DeviceActions;
