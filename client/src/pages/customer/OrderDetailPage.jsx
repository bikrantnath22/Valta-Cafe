// src/pages/customer/OrderDetailPage.jsx — track a single order. Doubles as the
// post-checkout confirmation screen (via location.state.justPlaced).
//
// Live updates: for now we poll every 15s until the order reaches a terminal
// state. This is deliberately isolated in one effect so it can be swapped for a
// Socket.io subscription later without touching the rest of the page.
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { getOrder } from '../../lib/api.js';
import { formatCurrency, formatPickupTime } from '../../lib/validation.js';
import { statusLabel, statusHint, statusBadgeClasses, isTerminalStatus } from '../../lib/orderStatus.js';
import OrderStatusStepper from '../../components/customer/OrderStatusStepper.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const justPlaced = Boolean(location.state?.justPlaced);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getOrder(orderId);
      setOrder(data.order);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Listen for live updates via WebSocket
  const { subscribe } = useNotifications();
  
  useEffect(() => {
    if (!order) return undefined;
    
    const unsubStatus = subscribe('order_status_updated', (data) => {
      if (data._id === order._id) {
        // Re-fetch to get full updated state including history
        load();
      }
    });
    
    const unsubPayment = subscribe('order_payment_updated', (data) => {
      if (data._id === order._id) {
        load();
      }
    });

    return () => {
      unsubStatus();
      unsubPayment();
    };
  }, [order, load, subscribe]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-stone-200" />
        <div className="h-64 animate-pulse rounded-xl bg-stone-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
        <Link to="/orders" className="mt-4 inline-block text-sm font-semibold text-amber-700">
          ← Back to orders
        </Link>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div>
      {justPlaced && (
        <div className="mb-6 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-green-400 bg-gradient-to-b from-green-50 to-green-100 p-6 text-center shadow-sm animate-in zoom-in fade-in duration-500">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-3xl text-white shadow-lg ring-4 ring-green-200">
            🎉
          </div>
          <div>
            <p className="text-xl font-black tracking-tight text-green-900">Order Confirmed!</p>
            <p className="mt-1.5 text-sm font-medium text-green-700">
              Your order has been successfully placed. We'll keep this page updated as it progresses.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-stone-900">Order {order.orderId}</h1>
          <p className="mt-0.5 text-xs text-stone-500">
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClasses(order.status)}`}
        >
          {statusLabel(order.status, order.fulfillmentMethod)}
        </span>
      </div>

      {/* Tracker */}
      <section className="mt-5 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <OrderStatusStepper status={order.status} statusHistory={order.statusHistory} fulfillmentMethod={order.fulfillmentMethod} />
      </section>

      {/* Contact Restaurant */}
      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">Need Help?</h2>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-stone-900">ValTA Cafe</p>
            <p className="mt-0.5 text-xs text-stone-500">Call us to modify your order.</p>
          </div>
          <a
            href="tel:+919876543210"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-bold text-green-700 shadow-sm transition hover:bg-green-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            Call Us
          </a>
        </div>
      </section>

      {/* Items */}
      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">Items</h2>
        <ul className="space-y-1.5">
          {order.items.map((i, idx) => (
            <li key={`${i.foodItemId}-${idx}`} className="flex justify-between text-sm text-stone-600">
              <span className="min-w-0 truncate">
                {i.name} <span className="text-stone-400">× {i.quantity}</span>
              </span>
              <span className="ml-2 shrink-0">{formatCurrency(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>

        {order.fulfillmentMethod === 'delivery' && (
          <div className="mt-3 flex justify-between border-t border-stone-100 pt-3 text-sm text-stone-500">
            <span>Delivery Fee</span>
            <span>{formatCurrency(order.deliveryFee !== undefined ? order.deliveryFee : (order.totalAmount - order.items.reduce((s, i) => s + (i.price * i.quantity), 0)))}</span>
          </div>
        )}

        <div className="mt-3 flex justify-between border-t border-stone-100 pt-3 text-base font-bold text-stone-900">
          <span>Total</span>
          <span>{formatCurrency(order.totalAmount)}</span>
        </div>
      </section>

      {/* Delivery + payment */}
      <section className="mt-4 grid gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        {order.notes && (
          <div className="border-b border-stone-100 pb-3">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-stone-500">Cooking Instructions</h2>
            <p className="text-sm font-medium text-amber-700 bg-amber-50 rounded-lg p-2.5 border border-amber-100 italic">
              "{order.notes}"
            </p>
          </div>
        )}
        <div>
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-stone-500">
            {order.fulfillmentMethod === 'pickup' ? 'Pickup Details' : 'Delivering to'}
          </h2>
          {order.fulfillmentMethod === 'pickup' ? (
            <>
              <p className="whitespace-pre-line text-sm font-semibold text-amber-700">ValTA Cafe</p>
              <p className="text-sm text-stone-700">Time: {formatPickupTime(order.pickupTime)}</p>
              <p className="text-xs text-stone-500">Phone: {order.deliveryAddress?.phone}</p>
            </>
          ) : (
            <>
              <p className="whitespace-pre-line text-sm text-stone-700">{order.deliveryAddress.address}</p>
              <p className="text-xs text-stone-500">{order.deliveryAddress.phone}</p>
            </>
          )}
          <p className="mt-3 text-sm text-amber-700 font-medium bg-amber-50 rounded-lg p-2 border border-amber-100">
            {statusHint(order.status, order.fulfillmentMethod)}
          </p>
        </div>
        <div className="border-t border-stone-100 pt-3">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-stone-500">Payment</h2>
          <p className="text-sm text-stone-700">
            {order.paymentMethod === 'cod' ? 'Cash on Delivery / UPI' : order.paymentMethod}
          </p>
          <span
            className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
               order.status === 'cancelled'
                ? 'bg-rose-100 text-rose-700'
                : order.paymentStatus === 'collected'
                ? 'bg-green-100 text-green-700'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
             {order.status === 'cancelled' ? 'Payment cancelled' : order.paymentStatus === 'collected' ? 'Collected' : 'Payment pending'}
          </span>
        </div>
      </section>

      <Link
        to="/orders"
        className="mt-5 inline-block text-sm font-semibold text-amber-700 transition hover:text-amber-800"
      >
        ← All orders
      </Link>
    </div>
  );
}
