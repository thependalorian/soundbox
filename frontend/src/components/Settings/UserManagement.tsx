import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../ui/Button';
import Card from '../ui/Card';
import StatusPill from '../ui/StatusPill';
import Tag from '../ui/Tag';
import Skeleton from '../ui/Skeleton';
import { createUser, fetchAssignableRoles, fetchUsers, setUserActive } from '../../api/api';
import { ACCOUNTS, MIN_PASSWORD_LENGTH } from '../../lib/copy/accounts';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../lib/logger';

/**
 * Issue and withdraw accounts. Administrators only.
 *
 * There is no public sign-up, so this is the only way a regulator or a
 * business operator gets access. That is a deliberate product decision, not a
 * missing feature: on a platform whose purpose is oversight, an account
 * someone can create for themselves is a defect.
 *
 * Access is removed by deactivating, never deleting. The row is what makes a
 * name in a status log resolve months later — "who approved this business?"
 * has no answer if the approver's account was erased.
 *
 * The first password is shown to the administrator to pass on directly. It is
 * not emailed: the mail path exists only for resets, where the recipient is
 * already proven to control the address. Sending a working credential to an
 * address nobody has verified is how accounts get handed to the wrong person.
 */
const UserManagement: React.FC = () => {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    display_name: '',
    role: 'regulator',
    password: '',
  });

  const users = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const roles = useQuery({ queryKey: ['assignableRoles'], queryFn: fetchAssignableRoles });

  const reset = () => {
    setForm({ email: '', display_name: '', role: 'regulator', password: '' });
    setError(null);
  };

  const create = useMutation({
    mutationFn: () =>
      createUser({
        email: form.email.trim(),
        display_name: form.display_name.trim(),
        role: form.role,
        password: form.password,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setAdding(false);
      reset();
    },
    onError: (err: any) => {
      logger.warn('Could not create account', err);
      setError(err?.response?.data?.detail ?? ACCOUNTS.errors.generic);
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setUserActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => {
      logger.warn('Could not change account state', err);
      setError(err?.response?.data?.detail ?? ACCOUNTS.errors.generic);
    },
  });

  const roleLabel = (code: string) => ACCOUNTS.roleLabel[code] ?? code;

  return (
    <Card variant="neutral" className="p-24">
      <p className="text-caption font-sohne text-slate max-w-[520px] mb-20">
        {ACCOUNTS.users.detail}
      </p>

      {users.isLoading && <Skeleton className="h-[120px]" />}

      {users.data && (
        <div className="divide-y divide-mist mb-20">
          {users.data.map((u) => (
            <div key={u.id} className="flex flex-wrap items-start justify-between gap-16 py-16">
              <div className="min-w-0">
                <p className="text-body font-sohne text-ink">
                  {u.display_name}
                  {u.id === me?.id && <Tag className="ml-8">You</Tag>}
                </p>
                <p className="text-caption font-sohne text-slate mt-4 break-all">{u.email}</p>
                <p className="text-caption font-sohne text-ash mt-4">
                  {roleLabel(u.role)}
                  {' · '}
                  {u.last_login_at
                    ? `last signed in ${new Date(u.last_login_at).toLocaleDateString()}`
                    : ACCOUNTS.users.neverSignedIn}
                </p>
              </div>
              <div className="flex items-center gap-12 shrink-0">
                {!u.is_active && <StatusPill label={ACCOUNTS.users.inactive} tone="neutral" />}
                {/* Deactivating yourself would lock you out of the screen that
                    could undo it, so the server refuses and the button is not
                    offered either. */}
                {u.id !== me?.id && (
                  <Button
                    variant="ghost"
                    onClick={() => toggle.mutate({ id: u.id, isActive: !u.is_active })}
                    disabled={toggle.isPending}
                  >
                    {u.is_active ? ACCOUNTS.users.deactivate : ACCOUNTS.users.reactivate}
                  </Button>
                )}
              </div>
            </div>
          ))}
          {users.data.length === 0 && (
            <p className="text-caption font-sohne text-slate py-16">{ACCOUNTS.users.empty}</p>
          )}
        </div>
      )}

      {error && <p className="text-caption font-sohne text-status-danger mb-16">{error}</p>}

      {!adding ? (
        <Button variant="filled" onClick={() => { setAdding(true); reset(); }}>
          {ACCOUNTS.users.add}
        </Button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            create.mutate();
          }}
          className="space-y-16 border-t border-mist pt-20"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-16">
            <div>
              <label htmlFor="nu-name" className="block text-caption font-sohne text-slate mb-4">
                {ACCOUNTS.users.name}
              </label>
              <input
                id="nu-name"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                required
                className="block w-full border border-mist rounded-inputs px-16 py-12 text-body font-sohne focus:outline-none focus:ring-2 focus:ring-ink/20"
              />
            </div>
            <div>
              <label htmlFor="nu-email" className="block text-caption font-sohne text-slate mb-4">
                {ACCOUNTS.users.email}
              </label>
              <input
                id="nu-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="block w-full border border-mist rounded-inputs px-16 py-12 text-body font-sohne focus:outline-none focus:ring-2 focus:ring-ink/20"
              />
            </div>
            <div>
              <label htmlFor="nu-role" className="block text-caption font-sohne text-slate mb-4">
                {ACCOUNTS.users.role}
              </label>
              <select
                id="nu-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="block w-full border border-mist rounded-inputs px-16 py-12 text-body font-sohne bg-paper focus:outline-none focus:ring-2 focus:ring-ink/20"
              >
                {(roles.data ?? ['admin', 'regulator']).map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="nu-pw" className="block text-caption font-sohne text-slate mb-4">
                {ACCOUNTS.users.password}
              </label>
              <input
                id="nu-pw"
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={MIN_PASSWORD_LENGTH}
                className="block w-full border border-mist rounded-inputs px-16 py-12 text-body font-sohne focus:outline-none focus:ring-2 focus:ring-ink/20"
              />
              <p className="text-caption font-sohne text-ash mt-4">
                {ACCOUNTS.users.passwordHint} At least {MIN_PASSWORD_LENGTH} characters.
              </p>
            </div>
          </div>


          <div className="flex gap-12">
            <Button type="submit" variant="filled" disabled={create.isPending}>
              {create.isPending ? 'Creating...' : ACCOUNTS.users.create}
            </Button>
            <Button variant="ghost" onClick={() => { setAdding(false); reset(); }}>
              {ACCOUNTS.users.cancel}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
};

export default UserManagement;
