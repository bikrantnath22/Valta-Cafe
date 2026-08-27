// utils/cafe.js — server-side "is the cafe open right now?" computation.
//
// The open/closed decision is made on the SERVER so it never depends on the
// customer's device clock or timezone. The comparison timezone is configurable
// via CAFE_TIMEZONE (an IANA zone name), defaulting to Asia/Kolkata.

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Current wall-clock time as "HH:mm" (24-hour) in the given IANA timezone.
 * Uses hourCycle 'h23' so midnight is "00:00" rather than "24:00".
 * @param {string} timeZone
 * @param {Date}   [now]
 * @returns {string} e.g. "14:05"
 */
export function currentHHMM(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hh}:${mm}`;
}

/**
 * Whether "HH:mm" now falls within [start, end). Handles:
 *   - normal ranges  (09:00–21:00)
 *   - overnight ranges (18:00–02:00)
 *   - start === end  → treated as open 24 hours
 */
export function isWithinHours(now, start, end) {
  if (start === end) return true; // 24-hour operation
  if (start < end) return now >= start && now < end; // same-day window
  return now >= start || now < end; // overnight window
}

/**
 * Compute whether the cafe is currently open.
 * Closed if manually closed; otherwise open only within opening hours.
 * @param {object} settings - a SiteSettings document (or plain object)
 * @param {Date}   [now]
 * @returns {boolean}
 */
export function computeIsOpen(settings, now = new Date()) {
  if (!settings || settings.isManuallyClosed) return false;

  const timeZone = process.env.CAFE_TIMEZONE || DEFAULT_TIMEZONE;
  const start = settings.openingHours?.start || '09:00';
  const end = settings.openingHours?.end || '21:00';

  let nowHHMM;
  try {
    nowHHMM = currentHHMM(timeZone, now);
  } catch {
    // Bad/unknown timezone string — fall back to the default zone.
    nowHHMM = currentHHMM(DEFAULT_TIMEZONE, now);
  }

  return isWithinHours(nowHHMM, start, end);
}
