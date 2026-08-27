// src/pages/admin/AdminUsersPage.jsx — superadmin user & role management.
// List every user, change roles (customer / admin / superadmin), and
// activate/deactivate accounts. Self-actions are disabled in the UI to match
// the server rules (a superadmin can't change their own role or deactivate
// their own account). All writes are still gated server-side by role.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listUsers, updateUserRole, updateUserActive } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const ROLE_OPTIONS = ['customer', 'admin', 'superadmin'];

const ROLE_BADGE = {
  superadmin: 'bg-purple-100 text-purple-700',
  admin: 'bg-amber-100 text-amber-700',
  customer: 'bg-stone-100 text-stone-600',
};

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const myId = me?._id;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { users: data } = await listUsers();
      setUsers(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  async function changeRole(user, role) {
    if (role === user.role) return;
    setBusyId(user._id);
    setActionError('');
    try {
      const { user: updated } = await updateUserRole(user._id, role);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, role: updated.role } : u)));
    } catch (err) {
      setActionError(err.message || 'Could not update role.');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(user) {
    setBusyId(user._id);
    setActionError('');
    try {
      const { user: updated } = await updateUserActive(user._id, !user.isActive);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, isActive: updated.isActive } : u)));
    } catch (err) {
      setActionError(err.message || 'Could not update account status.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Admins &amp; Users</h1>
          <p className="text-sm text-stone-500">
            {loading ? 'Loading…' : `${filtered.length} of ${users.length} user(s)`}
          </p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 sm:w-64"
        />
      </header>

      {actionError && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {actionError}
        </p>
      )}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
          {error}
        </div>
      ) : loading ? (
        <div className="py-20 text-center text-stone-400">
          <span className="animate-pulse">Loading users…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-10 text-center text-stone-500">
          No users match your search.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((u) => {
                  const isSelf = String(u._id) === String(myId);
                  const busy = busyId === u._id;
                  return (
                    <tr key={u._id} className="align-middle">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-stone-900">{u.name || 'Unnamed'}</span>
                          {isSelf && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 text-stone-500">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          disabled={busy || isSelf}
                          onChange={(e) => changeRole(u, e.target.value)}
                          title={isSelf ? "You can't change your own role" : 'Change role'}
                          className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm capitalize focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            u.isActive ? 'bg-green-100 text-green-700' : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={busy || isSelf}
                          onClick={() => toggleActive(u)}
                          title={isSelf ? "You can't deactivate your own account" : ''}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            u.isActive
                              ? 'border-stone-300 text-rose-600 hover:border-rose-300 hover:bg-rose-50'
                              : 'border-stone-300 text-green-700 hover:border-green-300 hover:bg-green-50'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {filtered.map((u) => {
              const isSelf = String(u._id) === String(myId);
              const busy = busyId === u._id;
              return (
                <li key={u._id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-stone-900">{u.name || 'Unnamed'}</span>
                        {isSelf && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                            You
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-stone-500">{u.email}</p>
                      <p className="mt-0.5 text-xs text-stone-400">Joined {formatDate(u.createdAt)}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        u.isActive ? 'bg-green-100 text-green-700' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {u.isActive ? 'Active' : 'Off'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-3">
                    <select
                      value={u.role}
                      disabled={busy || isSelf}
                      onChange={(e) => changeRole(u, e.target.value)}
                      className="flex-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm capitalize focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy || isSelf}
                      onClick={() => toggleActive(u)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        u.isActive
                          ? 'border-stone-300 text-rose-600 hover:border-rose-300 hover:bg-rose-50'
                          : 'border-stone-300 text-green-700 hover:border-green-300 hover:bg-green-50'
                      }`}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
