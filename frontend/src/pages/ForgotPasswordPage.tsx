import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { requestPasswordReset } from '../api/api';
import { ACCOUNTS } from '../lib/copy/accounts';
import { BRAND } from '../lib/copy/public';
import { logger } from '../lib/logger';

/**
 * Request a password reset link.
 *
 * The confirmation is shown for **every** outcome — address found, not found,
 * account deactivated, mail undeliverable. That is not vagueness for its own
 * sake: a message that distinguished those cases would turn this form into a
 * way to discover who holds an account here, and on an oversight platform the
 * account holders are named regulators and businesses.
 *
 * The same reasoning applies to the failure branch below. A network error is
 * reported, because that is about the browser rather than the account; a
 * rejected request is not, because the server's answer is already the
 * deliberately uniform one.
 */
const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err: any) {
      logger.warn('Password reset request could not be submitted', err);
      // Rate limiting is the one case worth naming — otherwise a second
      // attempt looks like it succeeded when it never reached the server.
      setError(
        err?.response?.status === 429
          ? 'Too many attempts. Wait a minute and try again.'
          : ACCOUNTS.errors.network,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blush-tint px-16">
      <Card variant="elevated" className="p-40 w-full max-w-md">
        <h1 className="text-heading-sm font-signifier text-ink">{ACCOUNTS.forgot.title}</h1>

        {sent ? (
          <>
            <p className="text-body font-sohne text-slate mt-12">{ACCOUNTS.forgot.sent}</p>
            <Link
              to="/login"
              className="inline-block mt-24 text-body font-sohne text-sienna underline"
            >
              {ACCOUNTS.forgot.backToLogin}
            </Link>
          </>
        ) : (
          <>
            <p className="text-body font-sohne text-slate mt-8">{ACCOUNTS.forgot.intro}</p>
            <form onSubmit={submit} className="space-y-20 mt-24">
              <div>
                <label htmlFor="email" className="block text-caption font-sohne text-slate mb-4">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full border border-mist rounded-inputs px-16 py-12 text-body font-sohne focus:outline-none focus:ring-2 focus:ring-ink/20"
                />
              </div>
              {error && <p className="text-status-danger text-caption font-sohne">{error}</p>}
              <Button type="submit" variant="filled" className="w-full" disabled={busy}>
                {busy ? 'Sending...' : ACCOUNTS.forgot.submit}
              </Button>
            </form>
            <Link
              to="/login"
              className="inline-block mt-20 text-caption font-sohne text-slate underline"
            >
              {ACCOUNTS.forgot.backToLogin}
            </Link>
          </>
        )}

        <p className="text-caption font-sohne text-ash mt-32">
          {BRAND.name} accounts are issued by an administrator — there is no public sign-up.
        </p>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
