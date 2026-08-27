// utils/validation.js — small shared validators (server-side).
// The client mirrors isValidPhone in src/lib/validation.js; keep them in sync.

/**
 * Lenient phone validation: allows an optional leading "+", digits, spaces,
 * hyphens, and parentheses, and requires 7–15 actual digits (E.164 upper bound).
 * @param {unknown} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  if (!/^\+?[0-9\s\-()]{10,25}$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length === 10;
}

/** Coerce a value to a finite number, or return undefined. Used for lat/lng. */
export function toFiniteNumber(value) {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
