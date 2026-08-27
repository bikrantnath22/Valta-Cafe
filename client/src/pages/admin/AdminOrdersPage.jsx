// src/pages/admin/AdminOrdersPage.jsx — live orders + status management.
// Shows every order (newest first) with customer, items, total, address, and
// status. Staff can advance the status, cancel, and mark COD as collected.
// Filter by status and search by order id / customer name (client-side).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listAllOrders, updateOrderStatus } from '../../lib/api.js';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { usePushNotifications } from '../../hooks/usePushNotifications.js';
import { STATUS_FLOW, STATUS_LABELS, statusBadgeClasses, statusLabel } from '../../lib/orderStatus.js';
import { formatCurrency, formatPickupTime } from '../../lib/validation.js';

const ALL_STATUSES = [...STATUS_FLOW, 'cancelled'];

function formatDateTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { orders: data } = await listAllOrders();
      setOrders(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Listen for live new orders and payment updates
  const { notifications, subscribe, markAllRead } = useNotifications();
  const pushObj = usePushNotifications();

  useEffect(() => {
    // Automatically mark all read when they visit the orders page
    markAllRead();
  }, [markAllRead]);

  useEffect(() => {
    const unsubOrder = subscribe('new_order', (data) => {
      load();
      if (data && data.order && data.order._id) {
        const idStr = data.order._id.toString();
        setNavHighlights((prev) => [...prev, idStr]);
        setTimeout(() => {
          setNavHighlights((prev) => prev.filter((id) => id !== idStr));
        }, 15000);
      }
      // Also automatically mark read if they are currently on this page
      markAllRead();
    });
    const unsubPayment = subscribe('order_payment_updated', (data) => {
      setOrders((prev) => prev.map((o) => (o._id === data._id ? { ...o, paymentStatus: data.paymentStatus } : o)));
    });
    return () => {
      unsubOrder();
      unsubPayment();
    };
  }, [load, subscribe]);

  const unreadOrderIds = useMemo(() => {
    return notifications
      .filter((n) => !n.isRead)
      .map((n) => n.orderId?.toString());
  }, [notifications]);

  // Handle temporary highlights passed via router state or query param (from push notifications)
  const location = useLocation();
  const navigate = useNavigate();
  
  const [navHighlights, setNavHighlights] = useState([]);

  useEffect(() => {
    const highlightIdsFromNav = location.state?.highlightIds || [];
    const searchParams = new URLSearchParams(location.search);
    const highlightFromQuery = searchParams.get('highlight');
    
    let highlights = [...highlightIdsFromNav];
    if (highlightFromQuery && !highlights.includes(highlightFromQuery)) {
      highlights.push(highlightFromQuery);
    }

    if (highlights.length > 0) {
      setNavHighlights(highlights);
      const timer = setTimeout(() => {
        setNavHighlights([]);
        // clear the router state & query params so refreshing doesn't trigger it again
        navigate(location.pathname, { replace: true, state: {} });
      }, 15000); // Highlight lasts 15 seconds
      return () => clearTimeout(timer);
    }
  }, [location.state?.highlightIds, location.search, navigate, location.pathname]);

  const allHighlightedIds = useMemo(() => {
    return new Set([...unreadOrderIds, ...navHighlights]);
  }, [unreadOrderIds, navHighlights]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (fulfillmentFilter !== 'all' && o.fulfillmentMethod !== fulfillmentFilter) return false;
      if (!q) return true;
      const name = (o.customerId?.name || '').toLowerCase();
      const id = (o.orderId || '').toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [orders, statusFilter, search]);

  // Patch a single order in place, preserving the populated customer object.
  function applyUpdate(id, patch) {
    setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, ...patch } : o)));
  }

  async function changeStatus(order, nextStatus) {
    if (nextStatus === order.status) return;
    setBusyId(order._id);
    setActionError('');
    try {
      const { order: updated } = await updateOrderStatus(order._id, { status: nextStatus });
      applyUpdate(order._id, {
        status: updated.status,
        statusHistory: updated.statusHistory,
      });
    } catch (err) {
      setActionError(err.message || 'Could not update the order.');
    } finally {
      setBusyId(null);
    }
  }

  async function markCollected(order) {
    setBusyId(order._id);
    setActionError('');
    try {
      const { order: updated } = await updateOrderStatus(order._id, { paymentStatus: 'collected' });
      applyUpdate(order._id, { paymentStatus: updated.paymentStatus });
    } catch (err) {
      setActionError(err.message || 'Could not update payment.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Orders</h1>
          <p className="text-sm text-stone-500">
            {loading ? 'Loading…' : `${filtered.length} of ${orders.length} order(s)`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm" title="Receive alerts even if app is closed">
            <span className="text-sm font-medium text-stone-700">Alerts</span>
            <button
              type="button"
              onClick={() => pushObj.isSubscribed ? pushObj.unsubscribe() : pushObj.subscribe()}
              disabled={!pushObj.isSupported || pushObj.isLoading || (pushObj.isIOS && !pushObj.isStandalone)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                pushObj.isSubscribed ? 'bg-amber-500' : 'bg-stone-300'
              } ${(pushObj.isLoading || !pushObj.isSupported) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                pushObj.isSubscribed ? 'translate-x-4' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order ID or customer name…"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-1.5">
            <FilterChip label="All Statuses" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
            {ALL_STATUSES.map((s) => (
              <FilterChip
                key={s}
                label={STATUS_LABELS[s]}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 border-l border-stone-300 pl-4">
            <FilterChip label="All Types" active={fulfillmentFilter === 'all'} onClick={() => setFulfillmentFilter('all')} />
            <FilterChip label="Delivery" active={fulfillmentFilter === 'delivery'} onClick={() => setFulfillmentFilter('delivery')} />
            <FilterChip label="Pickup" active={fulfillmentFilter === 'pickup'} onClick={() => setFulfillmentFilter('pickup')} />
          </div>
        </div>
      </div>

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
          <span className="animate-pulse">Loading orders…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-10 text-center text-stone-500">
          No orders match your filters.
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              isHighlighted={allHighlightedIds.has(order._id?.toString())}
              busy={busyId === order._id}
              onChangeStatus={changeStatus}
              onMarkCollected={markCollected}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full px-3 py-1.5 text-xs font-semibold transition',
        active ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function OrderCard({ order, isHighlighted, busy, onChangeStatus, onMarkCollected }) {
  const customer = order.customerId || {};
  const phone = customer.phone || order.deliveryAddress?.phone || '—';
  const isCancelled = order.status === 'cancelled';
  const isCod = (order.paymentMethod || 'cod') === 'cod';
  const isPaid = order.paymentStatus === 'collected';

  return (
    <li className={`rounded-xl border bg-white p-4 shadow-sm sm:p-5 ${isHighlighted ? 'border-amber-500 ring-1 ring-amber-500' : 'border-stone-200'}`}>
      {isHighlighted && (
        <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 animate-pulse">
          ✨ New Order!
        </span>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-stone-400">{order.orderId}</p>
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-stone-900">{customer.name || 'Unknown customer'}</p>
            {order.fulfillmentMethod === 'pickup' ? (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-800 ring-1 ring-blue-300">
                Pickup
              </span>
            ) : (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-800 ring-1 ring-green-300">
                Delivery
              </span>
            )}
          </div>
          <p className="text-sm text-stone-500">{phone}</p>
        </div>
        <div className="text-right">
          <span
            className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(order.status)}`}
          >
            {statusLabel(order.status, order.fulfillmentMethod)}
          </span>
          <p className="mt-1 text-xs text-stone-400">{formatDateTime(order.createdAt)}</p>
        </div>
      </div>

      {/* Items */}
      <ul className="mt-3 divide-y divide-stone-100 border-y border-stone-100">
        {order.items.map((it, idx) => (
          <li key={idx} className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-stone-700">
              <span className="font-medium text-stone-900">{it.quantity}×</span> {it.name}
            </span>
            <span className="text-stone-500">{formatCurrency(it.price * it.quantity)}</span>
          </li>
        ))}
      </ul>

      {order.fulfillmentMethod === 'delivery' && (
        <div className="flex items-center justify-between border-b border-stone-100 py-1.5 text-sm text-stone-500">
          <span>Delivery Fee</span>
          <span>{formatCurrency(order.deliveryFee !== undefined ? order.deliveryFee : (order.totalAmount - order.items.reduce((s, i) => s + (i.price * i.quantity), 0)))}</span>
        </div>
      )}

      {order.notes && (
        <div className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-800 border border-amber-100">
          <span className="font-bold">Instructions:</span> {order.notes}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-stone-600">
          <span className="font-semibold text-stone-900">Total {formatCurrency(order.totalAmount)}</span>
          <span className="mx-2 text-stone-300">·</span>
          <span className="uppercase">{order.paymentMethod || 'cod'}</span>
          <span
            className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
              isCancelled
                ? 'bg-rose-100 text-rose-700'
                : isPaid
                ? 'bg-green-100 text-green-700'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            {isCancelled ? 'Payment cancelled' : isPaid ? 'Collected' : 'Payment pending'}
          </span>
        </div>
      </div>

      {/* Fulfillment Details */}
      <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">
        {order.fulfillmentMethod === 'pickup' ? (
          <>
            <span className="font-medium text-blue-700">Pickup Time: </span>
            {formatPickupTime(order.pickupTime)}
          </>
        ) : (
          <>
            <span className="font-medium text-stone-700">Deliver to: </span>
            {order.deliveryAddress?.address || '—'}
          </>
        )}
      </p>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
        <label className="text-xs font-medium text-stone-500" htmlFor={`status-${order._id}`}>
          Status
        </label>
        <select
          id={`status-${order._id}`}
          value={order.status}
          disabled={busy}
          onChange={(e) => onChangeStatus(order, e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s, order.fulfillmentMethod)}
            </option>
          ))}
        </select>

        {isCod && !isPaid && !isCancelled && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMarkCollected(order)}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            Mark COD collected
          </button>
        )}

        {busy && <span className="text-xs text-stone-400">Saving…</span>}
      </div>
    </li>
  );
}
