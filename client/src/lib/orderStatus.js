// src/lib/orderStatus.js — shared order-status vocabulary for the customer UI.
// Mirrors ORDER_STATUSES in server/models/Order.js. The "flow" is the normal
// happy-path progression shown in the tracker; "cancelled" is a terminal state
// handled separately.

export const STATUS_FLOW = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];

export const STATUS_LABELS = {
  pending: 'Order placed',
  accepted: 'Accepted',
  preparing: 'Preparing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** Short helper text shown under each step in the tracker. */
export const STATUS_HINTS = {
  pending: 'We’ve received your order and will confirm shortly.',
  accepted: 'The cafe has accepted your order.',
  preparing: 'Your food is being prepared.',
  out_for_delivery: 'Your order is on its way.',
  delivered: 'Your order has been delivered. Enjoy!',
  cancelled: 'This order was cancelled.',
};

export function statusHint(status, method = 'delivery') {
  if (status === 'out_for_delivery' && method === 'pickup') {
    return 'Your order is ready to be picked up at the store.';
  }
  if (status === 'delivered' && method === 'pickup') {
    return 'Your order has been picked up. Enjoy!';
  }
  return STATUS_HINTS[status] || '';
}

/** Tailwind classes for a status badge/pill. */
export function statusBadgeClasses(status) {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 text-green-700';
    case 'cancelled':
      return 'bg-rose-100 text-rose-700';
    case 'out_for_delivery':
      return 'bg-blue-100 text-blue-700';
    case 'preparing':
    case 'accepted':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-stone-100 text-stone-600';
  }
}

export function statusLabel(status, method = 'delivery') {
  if (status === 'out_for_delivery' && method === 'pickup') {
    return 'Ready for pickup';
  }
  if (status === 'delivered' && method === 'pickup') {
    return 'Picked up';
  }
  return STATUS_LABELS[status] || status;
}

/** True once an order has reached a terminal state (no more live updates). */
export function isTerminalStatus(status) {
  return status === 'delivered' || status === 'cancelled';
}
