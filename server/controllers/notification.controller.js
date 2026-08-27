import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

/** GET /api/notifications (auth) — get notifications for the user's role */
export async function getNotifications(req, res, next) {
  try {
    // If the user is superadmin or admin, fetch those notifications
    // Note: We use $in if they can see multiple, but typically we map superadmin to admin notifications as well.
    const roles = req.user.role === 'superadmin' ? ['admin', 'superadmin'] : [req.user.role];
    
    const query = { recipientRole: { $in: roles } };
    if (req.user.role === 'customer') {
      query.customerId = req.user._id;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ status: 'ok', notifications });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/notifications/read-all (auth) — mark all notifications as read for this role */
export async function markAllRead(req, res, next) {
  try {
    const roles = req.user.role === 'superadmin' ? ['admin', 'superadmin'] : [req.user.role];
    
    const query = { recipientRole: { $in: roles }, isRead: false };
    if (req.user.role === 'customer') {
      query.customerId = req.user._id;
    }
    
    await Notification.updateMany(
      query,
      { $set: { isRead: true } }
    );

    res.json({ status: 'ok', message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
}
