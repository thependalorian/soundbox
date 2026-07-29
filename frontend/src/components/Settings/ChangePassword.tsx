import React, { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { changePassword } from '../../api/api';
import { ACCOUNTS, MIN_PASSWORD_LENGTH } from '../../lib/copy/accounts';
import { logger } from '../../lib/logger';

/**
 * Change your own password.
 *
 * The current password is required. That is what stops an unattended browser
 * from becoming a permanent account takeover — without it, anyone who reaches
 * a signed-in screen could lock the owner out.
 *
 * Succeeding here ends every other session for this account, including the one
 * making the request on another device. The form says so before submission
 * rather than after, because being signed out of a second device is
 * surprising if it was not announced.
 */
const ChangePassword: React.FC = () => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (next !== confirm) {
      setError(ACCOUNTS.reset.mismatch);
      return;
    }
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await changePassword(current, next);
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err: any) {
      logger.warn('Password change failed', err);
      setError(
        err?.response?.data?.detail ??
          (err?.response?.status === 429
            ? 'Too many attempts. Wait a minute and try again.'
            : ACCOUNTS.errors.network),
      );
    } finally {
      setBusy(false);
    }
  };

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    autoComplete: string,
  ) => (
    <div>
      <label htmlFor={id} className="block text-caption font-sohne text-slate mb-4">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="block w-full max-w-[360px] border border-mist rounded-inputs px-16 py-12 text-body font-sohne focus:outline-none focus:ring-2 focus:ring-ink/20"
      />
    </div>
  );

  return (
    <Card variant="neutral" className="p-24">
      <p className="text-caption font-sohne text-slate max-w-[520px] mb-20">
        {ACCOUNTS.change.detail}
      </p>
      <form onSubmit={submit} className="space-y-16">
        {field('current-pw', ACCOUNTS.change.current, current, setCurrent, 'current-password')}
        {field('next-pw', ACCOUNTS.change.next, next, setNext, 'new-password')}
        {field('confirm-pw', ACCOUNTS.change.confirm, confirm, setConfirm, 'new-password')}
        <p className="text-caption font-sohne text-ash">
          At least {MIN_PASSWORD_LENGTH} characters.
        </p>
        {error && <p className="text-caption font-sohne text-status-danger">{error}</p>}
        {done && <p className="text-caption font-sohne text-status-success">{ACCOUNTS.change.done}</p>}
        <Button type="submit" variant="filled" disabled={busy}>
          {busy ? 'Changing...' : ACCOUNTS.change.submit}
        </Button>
      </form>
    </Card>
  );
};

export default ChangePassword;
