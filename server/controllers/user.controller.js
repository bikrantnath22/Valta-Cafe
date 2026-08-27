// controllers/user.controller.js — superadmin user & role management.
// Router gates all of these to the 'superadmin' role.
import mongoose from 'mongoose';
import User, { ROLES } from '../models/User.js';
import { logAudit } from '../utils/audit.js';

/** GET /api/users (superadmin) — all users, newest first. */
export async function listUsers(req, res, next) {
  try {
    // passwordHash is select:false so it never appears here.
    const users = await User.find().select('-__v').sort({ createdAt: -1 }).lean();
    res.json({ status: 'ok', users });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/users/:id/role (superadmin) — change a user's role.
 * A superadmin cannot change their own role (prevents self-lockout).
 */
export async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    const { role } = req.body || {};
    if (!ROLES.includes(role)) {
      return res.status(400).json({ status: 'error', message: 'Invalid role.' });
    }

    if (String(id) === String(req.user._id)) {
      return res.status(400).json({ status: 'error', message: 'You cannot change your own role.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    user.role = role;
    await user.save();
    res.json({ status: 'ok', user });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/users/:id/active (superadmin) — activate/deactivate an account.
 * A superadmin cannot deactivate their own account.
 */
export async function updateUserActive(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    const { isActive } = req.body || {};
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ status: 'error', message: 'isActive must be true or false.' });
    }

    if (String(id) === String(req.user._id) && isActive === false) {
      return res.status(400).json({ status: 'error', message: 'You cannot deactivate your own account.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    user.isActive = isActive;
    await user.save();
    res.json({ status: 'ok', user });
  } catch (err) {
    next(err);
  }
}
