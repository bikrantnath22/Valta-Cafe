// models/Notification.js — in-app notifications targeted at a role
// (e.g. admins get notified when a new order comes in).
import mongoose from 'mongoose';

const { Schema } = mongoose;

export const RECIPIENT_ROLES = ['superadmin', 'admin', 'customer'];

const notificationSchema = new Schema(
  {
    recipientRole: { type: String, enum: RECIPIENT_ROLES, required: true },

    // The related order, if any (references Order._id).
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },

    // The targeted customer, if role is 'customer'.
    customerId: { type: Schema.Types.ObjectId, ref: 'User' },

    message: { type: String, required: true, trim: true },

    isRead: { type: Boolean, default: false },
  },
  {
    // Spec requests createdAt only.
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Fetch a role's unread notifications, newest first.
notificationSchema.index({ recipientRole: 1, isRead: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
