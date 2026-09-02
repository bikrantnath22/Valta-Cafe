// controllers/settings.controller.js — public site settings + staff editing.
import SiteSettings from '../models/SiteSettings.js';
import { computeIsOpen } from '../utils/cafe.js';
import { getIO } from '../socket.js';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/; // 24-hour "HH:mm"

/** The customer-facing settings shape (kept identical for read + write responses). */
function serializeSettings(settings) {
  return {
    cafeName: settings.cafeName,
    logo: settings.logo,
    openingHours: settings.openingHours,
    isManuallyClosed: settings.isManuallyClosed,
    closedMessage: settings.closedMessage,
    deliveryFee: settings.deliveryFee,
    deliveryRadius: settings.deliveryRadius,
    contactInfo: settings.contactInfo,
  };
}

/**
 * GET /api/settings (public)
 * Returns the customer-facing settings plus a server-computed `isOpen` boolean,
 * so the client never has to redo the time math.
 */
export async function getPublicSettings(req, res, next) {
  try {
    const settings = await SiteSettings.getSettings();
    res.json({ status: 'ok', isOpen: computeIsOpen(settings), settings: serializeSettings(settings) });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/settings (staff)
 * Edits the singleton SiteSettings document. Only the fields present in the body
 * are changed. Returns the same shape as the public GET (incl. recomputed isOpen).
 */
export async function updateSettings(req, res, next) {
  try {
    const settings = await SiteSettings.getSettings();
    const body = req.body || {};

    if (body.cafeName !== undefined) {
      if (!String(body.cafeName).trim()) {
        return res.status(400).json({ status: 'error', message: 'Cafe name cannot be empty.' });
      }
      settings.cafeName = String(body.cafeName).trim();
    }

    if (body.logo !== undefined) {
      const logo = body.logo || {};
      settings.logo = {
        url: logo.url ? String(logo.url).trim() : '',
        public_id: logo.public_id ? String(logo.public_id).trim() : '',
      };
    }

    if (body.openingHours !== undefined) {
      const { start, end } = body.openingHours || {};
      if (start !== undefined) {
        if (!HHMM.test(String(start))) {
          return res.status(400).json({ status: 'error', message: 'Opening time must be in HH:mm (24h) format.' });
        }
        settings.openingHours.start = String(start);
      }
      if (end !== undefined) {
        if (!HHMM.test(String(end))) {
          return res.status(400).json({ status: 'error', message: 'Closing time must be in HH:mm (24h) format.' });
        }
        settings.openingHours.end = String(end);
      }
    }

    if (body.isManuallyClosed !== undefined) {
      settings.isManuallyClosed = Boolean(body.isManuallyClosed);
    }

    if (body.closedMessage !== undefined) {
      settings.closedMessage = String(body.closedMessage).trim();
    }

    if (body.deliveryFee !== undefined) {
      const n = Number(body.deliveryFee);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ status: 'error', message: 'Delivery fee must be 0 or more.' });
      }
      settings.deliveryFee = n;
    }

    if (body.deliveryRadius !== undefined) {
      const n = Number(body.deliveryRadius);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ status: 'error', message: 'Delivery radius must be 0 or more.' });
      }
      settings.deliveryRadius = n;
    }

    if (body.contactInfo !== undefined) {
      const c = body.contactInfo || {};
      if (c.phone !== undefined) settings.contactInfo.phone = String(c.phone).trim();
      if (c.email !== undefined) settings.contactInfo.email = String(c.email).trim();
      if (c.address !== undefined) settings.contactInfo.address = String(c.address).trim();
    }

    await settings.save();
    getIO().emit('settings_updated', serializeSettings(settings));
    res.json({ status: 'ok', isOpen: computeIsOpen(settings), settings: serializeSettings(settings) });
  } catch (err) {
    next(err);
  }
}
