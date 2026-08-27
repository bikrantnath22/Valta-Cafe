// src/pages/customer/OrdersPage.jsx — the customer's order history. Each row
// links to the detailed tracker. Polls lightly while any order is still active
// (interim until Socket.io provides live pushes).
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listOrders } from '../../lib/api.js';
import { formatCurrency } from '../../lib/validation.js';
import { statusLabel, statusBadgeClasses, isTerminalStatus } from '../../lib/orderStatus.js';

const POLL_MS = 20000;

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await listOrders();
      setOrders(data.orders || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the list fresh while at least one order is still in progress.
  useEffect(() => {
    const hasActive = orders.some((o) => !isTerminalStatus(o.status));
    if (!hasActive) return undefined;
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [orders, load]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-32 animate-pulse rounded bg-stone-200" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-stone-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 text-3xl">
          🧾
        </div>
        <p className="text-lg font-semibold text-stone-800">No orders yet</p>
        <p className="mt-1 text-sm text-stone-500">Your past orders will show up here.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
        >
          Browse the menu
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold text-stone-900">Your orders</h1>

      <div className="space-y-3">
        {orders.map((order) => {
          const count = order.items.reduce((n, i) => n + i.quantity, 0);
          const preview =
            order.items.length === 1
              ? order.items[0].name
              : `${order.items[0].name} + ${order.items.length - 1} more`;

          return (
            <Link
              key={order._id}
              to={`/orders/${order._id}`}
              className="block rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-stone-900">{order.orderId}</span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusBadgeClasses(order.status)}`}
                >
                  {statusLabel(order.status, order.fulfillmentMethod)}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-stone-600">{preview}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                <span>
                  {count} item{count === 1 ? '' : 's'} · {new Date(order.createdAt).toLocaleDateString()}
                </span>
                <span className="text-sm font-bold text-stone-900">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
