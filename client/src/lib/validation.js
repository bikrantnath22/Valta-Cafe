// src/lib/validation.js — small client-side validators.
// isValidPhone mirrors the server (server/utils/validation.js); keep in sync.

/**
 * Lenient phone validation: optional leading "+", digits, spaces, hyphens,
 * parentheses, and 7–15 actual digits.
 * @param {string} phone
 */
export function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  if (!/^\+?[0-9\s\-()]{10,25}$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length === 10;
}

/** Format a number as Indian Rupees, e.g. 180 → "₹180". */
export function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString('en-IN')}`;
}

/** Formats a 24h time string (e.g. "13:15") to 12h format (e.g. "1:15 PM") */
export function formatPickupTime(timeStr) {
  if (!timeStr || timeStr === 'immediate') return 'Immediate';
  const parts = timeStr.split(':');
  if (parts.length !== 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  const min = parts[1];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${min} ${ampm}`;
}
