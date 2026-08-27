import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['customer', 'admin', 'superadmin'],
      required: true,
    },
    subscription: {
      type: Object, // The raw PushSubscription object from the browser
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate subscriptions for the exact same endpoint per user
pushSubscriptionSchema.index({ userId: 1, 'subscription.endpoint': 1 }, { unique: true });

export default mongoose.model('PushSubscription', pushSubscriptionSchema);
