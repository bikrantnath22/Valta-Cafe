// src/pages/admin/AdminAnalyticsPage.jsx — dashboard overview metrics.
// Stat cards (orders + revenue for today / last 7 days / last 30 days),
// an order-status donut, and a top-selling-items bar list. All charts are
// dependency-free SVG/CSS — no external charting library.
import { useCallback, useEffect, useState } from 'react';
import { getAnalyticsOverview } from '../../lib/api.js';
import { STATUS_LABELS } from '../../lib/orderStatus.js';
import { formatCurrency } from '../../lib/validation.js';

// Hex colors (SVG fill/stroke needs real values, not Tailwind classes).
const STATUS_COLORS = {
  pending: '#a8a29e',
  accepted: '#fbbf24',
  preparing: '#f59e0b',
  out_for_delivery: '#3b82f6',
  delivered: '#22c55e',
  cancelled: '#f43f5e',
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { analytics } = await getAnalyticsOverview();
      setData(analytics);
    } catch (err) {
      setError(err.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Analytics</h1>
          <p className="text-sm text-stone-500">
            {loading
              ? 'Loading…'
              : data
                ? `Updated ${new Date(data.generatedAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        >
          Refresh
        </button>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
          {error}
        </div>
      ) : loading || !data ? (
        <div className="py-20 text-center text-stone-400">
          <span className="animate-pulse">Loading analytics…</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Today" window={data.today} />
            <StatCard label="Last 7 days" window={data.week} />
            <StatCard label="Last 30 days" window={data.month} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Status breakdown */}
            <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-stone-500">
                Order status
              </h2>
              <p className="mb-4 text-xs text-stone-400">Last 30 days</p>
              <StatusDonut breakdown={data.statusBreakdown} />
            </section>

            {/* Top items */}
            <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-stone-500">
                Top-selling items
              </h2>
              <p className="mb-4 text-xs text-stone-400">By quantity, last 30 days</p>
              <TopItems items={data.topItems} />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, window }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-stone-900">{window.orders}</p>
      <p className="text-sm text-stone-500">order{window.orders === 1 ? '' : 's'}</p>
      <p className="mt-3 border-t border-stone-100 pt-3 text-lg font-semibold text-amber-700">
        {formatCurrency(window.revenue)}
      </p>
      <p className="text-xs text-stone-400">revenue (excl. cancelled)</p>
    </div>
  );
}

function StatusDonut({ breakdown }) {
  const total = breakdown.reduce((sum, r) => sum + r.count, 0);

  if (total === 0) {
    return <p className="py-8 text-center text-sm text-stone-400">No orders in this period.</p>;
  }

  const r = 70;
  const cx = 90;
  const cy = 90;
  const circumference = 2 * Math.PI * r;

  // Build cumulative segments for the donut ring.
  let offsetAcc = 0;
  const segments = breakdown.map((row) => {
    const fraction = row.count / total;
    const dash = fraction * circumference;
    const seg = {
      status: row.status,
      count: row.count,
      color: STATUS_COLORS[row.status] || '#a8a29e',
      dash,
      offset: offsetAcc,
    };
    offsetAcc += dash;
    return seg;
  });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <svg width="180" height="180" viewBox="0 0 180 180" className="shrink-0">
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f5f5f4" strokeWidth="20" />
        {/* Segments (rotated so they start at 12 o'clock) */}
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {segments.map((s) => (
            <circle
              key={s.status}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="20"
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={-s.offset}
            />
          ))}
        </g>
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-stone-900 text-2xl font-bold">
          {total}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="fill-stone-400 text-xs">
          orders
        </text>
      </svg>

      {/* Legend */}
      <ul className="w-full space-y-1.5">
        {segments.map((s) => (
          <li key={s.status} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-stone-600">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: s.color }} />
              {STATUS_LABELS[s.status] || s.status}
            </span>
            <span className="font-medium text-stone-800">
              {s.count}
              <span className="ml-1 text-xs text-stone-400">
                ({Math.round((s.count / total) * 100)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopItems({ items }) {
  if (!items || items.length === 0) {
    return <p className="py-8 text-center text-sm text-stone-400">No sales in this period.</p>;
  }

  const max = Math.max(...items.map((i) => i.quantity), 1);

  return (
    <ul className="space-y-3">
      {items.map((item, idx) => (
        <li key={`${item.name}-${idx}`}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="truncate font-medium text-stone-700">
              <span className="mr-1.5 text-stone-400">{idx + 1}.</span>
              {item.name}
            </span>
            <span className="ml-2 shrink-0 text-stone-500">
              {item.quantity} sold
              <span className="ml-2 text-xs text-stone-400">{formatCurrency(item.revenue)}</span>
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{ width: `${(item.quantity / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
