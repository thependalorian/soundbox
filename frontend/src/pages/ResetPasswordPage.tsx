import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { resetPassword } from '../api/api';
import { ACCOUNTS, MIN_PASSWORD_LENGTH } from '../lib/copy/accounts';
import { logger } from '../lib/logger';

/**
 * Set a new password from an emailed link.
 *
 * The token and its id arrive as query parameters, which is what a link in an
 * email can carry. Two consequences are handled deliberately:
 *
 * - The token is a bearer credential. It is read from the URL and never
 *   written anywhere else — not to localStorage, not into a log line.
 * - On success the URL is replaced rather than pushed, so the back button
 *   cannot return to a page holding a spent credential in its address bar.
 *
 * The confirm field is checked here only as a courtesy against typos. The
 * server enforces the actual policy; a client-side length check that
 * disagreed with the backend would be worse than none.
 */
const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = params.get('id') || '';
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const linkPresent = Boolean(id && token);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      setError(ACCOUNTS.reset.mismatch);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resetPassword(id, token, password);
      setDone(true);
      // Drop the spent token out of the address bar and out of history.
      navigate('/reset-password', { replace: true });
    } catch (err: any) {
      logger.warn('Password reset could not be completed', err);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-blush-tint px-16">
      <Card variant="elevated" className="p-40 w-full max-w-md">
        <h1 className="text-heading-sm font-signifier text-ink">{ACCOUNTS.reset.title}</h1>

        {done ? (
          <>
            <p className="text-body font-sohne text-slate mt-12">{ACCOUNTS.reset.done}</p>
            <Link to="/login" className="inline-block mt-24">
              <Button variant="filled">Sign in</Button>
            </Link>
          </>
        ) : !linkPresent ? (
          <>
            <p className="text-body font-sohne text-slate mt-12">{ACCOUNTS.reset.invalidLink}</p>
            <Link
              to="/forgot-password"
              className="inline-block mt-24 text-body font-sohne text-sienna underline"
            >
              Request a new link
            </Link>
          </>
        ) : (
          <>
            <p className="text-body font-sohne text-slate mt-8">{ACCOUNTS.reset.intro}</p>
            <form onSubmit={submit} className="space-y-20 mt-24">
              <div>
                <label htmlFor="pw" className="block text-caption font-sohne text-slate mb-4">
                  {ACCOUNTS.reset.newPassword}
                </label>
                <input
                  id="pw"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  className="mt-1 block w-full border border-mist rounded-inputs px-16 py-12 text-body font-sohne focus:outline-none focus:ring-2 focus:ring-ink/20"
                />
                <p className="text-caption font-sohne text-ash mt-4">
                  At least {MIN_PASSWORD_LENGTH} characters. A phrase is easier to remember and
                  harder to guess than a short password with symbols in it.
                </p>
              </div>
              <div>
                <label htmlFor="pw2" className="block text-caption font-sohne text-slate mb-4">
                  {ACCOUNTS.reset.confirmPassword}
                </label>
                <input
                  id="pw2"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="mt-1 block w-full border border-mist rounded-inputs px-16 py-12 text-body font-sohne focus:outline-none focus:ring-2 focus:ring-ink/20"
                />
              </div>
              {error && <p className="text-status-danger text-caption font-sohne">{error}</p>}
              <Button type="submit" variant="filled" className="w-full" disabled={busy}>
                {busy ? 'Setting...' : ACCOUNTS.reset.submit}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
