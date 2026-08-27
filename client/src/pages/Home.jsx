import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHealth, API_BASE_URL } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const CAFE_NAME = 'VALTA Cafe';

// Connection states for the live API badge.
const STATUS = {
  loading: { label: 'Checking API…', dot: 'bg-amber-400', text: 'text-amber-700' },
  ok: { label: 'API connected', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  error: { label: 'API unreachable', dot: 'bg-rose-500', text: 'text-rose-700' },
};

export default function Home() {
  const [state, setState] = useState('loading');
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  async function ping() {
    setState('loading');
    setError(null);
    try {
      const data = await getHealth();
      setHealth(data);
      setState('ok');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  }

  useEffect(() => {
    ping();
  }, []);

  const status = STATUS[state];
  const { user, loading: authLoading, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-stone-100 text-stone-800 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl ring-1 ring-stone-200 p-8 sm:p-10">
        {/* Auth bar */}
        <div className="mb-6 flex items-center justify-end gap-3 text-sm">
          {authLoading ? (
            <span className="text-stone-400">…</span>
          ) : user ? (
            <>
              <span className="text-stone-600">
                {user.name} <span className="text-stone-400">· {user.role}</span>
              </span>
              <button
                onClick={signOut}
                className="rounded-lg border border-stone-300 px-3 py-1.5 font-medium text-stone-700 transition hover:bg-stone-50"
              >
                Log out
              </button>
            </>
          ) : (
            <Link to="/login" className="font-medium text-amber-700 hover:underline">
              Sign in
            </Link>
          )}
        </div>

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-600 text-white text-2xl shadow">
            ☕
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">{CAFE_NAME}</h1>
            <p className="text-sm text-stone-500">Online food ordering</p>
          </div>
        </div>

        {/* Live status badge */}
        <div className="mt-8 flex items-center gap-2">
          <span className={`relative flex h-2.5 w-2.5`}>
            {state === 'loading' && (
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${status.dot} opacity-75`} />
            )}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${status.dot}`} />
          </span>
          <span className={`text-sm font-medium ${status.text}`}>{status.label}</span>
        </div>

        {/* Health details / error */}
        <div className="mt-4 rounded-xl bg-stone-50 ring-1 ring-stone-200 p-4">
          {state === 'ok' && health && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-stone-500">Service</dt>
              <dd className="font-medium text-stone-800">{health.service}</dd>
              <dt className="text-stone-500">Status</dt>
              <dd className="font-medium text-stone-800">{health.status}</dd>
              <dt className="text-stone-500">Database</dt>
              <dd className="font-medium text-stone-800">{health.database}</dd>
              <dt className="text-stone-500">Environment</dt>
              <dd className="font-medium text-stone-800">{health.environment}</dd>
              <dt className="text-stone-500">Uptime</dt>
              <dd className="font-medium text-stone-800">{health.uptimeSeconds}s</dd>
            </dl>
          )}
          {state === 'error' && (
            <p className="text-sm text-rose-700">
              Couldn&apos;t reach the API at <code className="font-mono">{API_BASE_URL}</code>.
              <br />
              <span className="text-stone-500">{error}</span>
              <br />
              <span className="text-stone-500">Is the server running? Try <code className="font-mono">npm run dev</code> in <code className="font-mono">/server</code>.</span>
            </p>
          )}
          {state === 'loading' && <p className="text-sm text-stone-500">Contacting {API_BASE_URL}…</p>}
        </div>

        <button
          onClick={ping}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        >
          Re-check API
        </button>

        <p className="mt-8 text-xs text-stone-400">
          Foundation build — menu, ordering, and admin features come next.
        </p>
      </div>
    </div>
  );
}
