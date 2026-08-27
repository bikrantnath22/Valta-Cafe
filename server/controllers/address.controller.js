// controllers/address.controller.js — a customer's saved delivery addresses.
// All routes require auth; addresses live as subdocuments on the User.
import { isValidPhone, toFiniteNumber } from '../utils/validation.js';

/** Ensure exactly one address is marked default (the one with id === keepId). */
function markSingleDefault(user, keepId) {
  user.savedAddresses.forEach((addr) => {
    addr.isDefault = String(addr._id) === String(keepId);
  });
}

/** GET /api/addresses — list the current user's saved addresses. */
export async function listAddresses(req, res) {
  res.json({ status: 'ok', addresses: req.user.savedAddresses });
}

/** POST /api/addresses — add a new address. */
export async function addAddress(req, res, next) {
  try {
    const { label, address, phone, lat, lng, isDefault } = req.body || {};

    if (!address || !String(address).trim()) {
      return res.status(400).json({ status: 'error', message: 'Address is required.' });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ status: 'error', message: 'A valid phone number is required.' });
    }

    const user = req.user;
    const makeDefault = Boolean(isDefault) || user.savedAddresses.length === 0;

    const newAddress = {
      label: label ? String(label).trim() : undefined,
      address: String(address).trim(),
      phone: String(phone).trim(),
      lat: toFiniteNumber(lat),
      lng: toFiniteNumber(lng),
      isDefault: makeDefault,
    };

    user.savedAddresses.push(newAddress);
    if (makeDefault) {
      const added = user.savedAddresses[user.savedAddresses.length - 1];
      markSingleDefault(user, added._id);
    }

    await user.save();
    res.status(201).json({ status: 'ok', addresses: user.savedAddresses });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/addresses/:id — update fields and/or set as default. */
export async function updateAddress(req, res, next) {
  try {
    const user = req.user;
    const addr = user.savedAddresses.id(req.params.id);
    if (!addr) {
      return res.status(404).json({ status: 'error', message: 'Address not found.' });
    }

    const { label, address, phone, lat, lng, isDefault } = req.body || {};

    if (address !== undefined) {
      if (!String(address).trim()) {
        return res.status(400).json({ status: 'error', message: 'Address cannot be empty.' });
      }
      addr.address = String(address).trim();
    }
    if (phone !== undefined) {
      if (!isValidPhone(phone)) {
        return res.status(400).json({ status: 'error', message: 'A valid phone number is required.' });
      }
      addr.phone = String(phone).trim();
    }
    if (label !== undefined) addr.label = String(label).trim();
    if (lat !== undefined) addr.lat = toFiniteNumber(lat);
    if (lng !== undefined) addr.lng = toFiniteNumber(lng);

    if (isDefault === true) {
      markSingleDefault(user, addr._id);
    }

    await user.save();
    res.json({ status: 'ok', addresses: user.savedAddresses });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/addresses/:id — remove an address (promotes a new default). */
export async function deleteAddress(req, res, next) {
  try {
    const user = req.user;
    const addr = user.savedAddresses.id(req.params.id);
    if (!addr) {
      return res.status(404).json({ status: 'error', message: 'Address not found.' });
    }

    const wasDefault = addr.isDefault;
    addr.deleteOne(); // remove subdocument

    // If we removed the default and others remain, promote the first one.
    if (wasDefault && user.savedAddresses.length > 0) {
      markSingleDefault(user, user.savedAddresses[0]._id);
    }

    await user.save();
    res.json({ status: 'ok', addresses: user.savedAddresses });
  } catch (err) {
    next(err);
  }
}
