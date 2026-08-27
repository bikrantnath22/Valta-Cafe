// models/Order.js — a customer's COD order and its lifecycle.
import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ORDER_STATUSES = [
  'pending',
  'accepted',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export const PAYMENT_STATUSES = ['pending', 'collected'];

/** Line item — food details are snapshotted so historical orders stay accurate
 *  even if the menu item is later edited or deleted. */
const orderItemSchema = new Schema(
  {
    foodItemId: { type: Schema.Types.ObjectId, ref: 'FoodItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

/** Delivery address snapshot — copied from the saved address chosen at
 *  checkout, so later edits to the profile don't change past orders. */
const deliveryAddressSchema = new Schema(
  {
    address: { 
      type: String, 
      trim: true,
      required: function() {
        // 'this' refers to the parent document when used in a subdocument schema,
        // but only if it's a single nested subdoc. For safety, we handle validation
        // manually in the controller as well, but this is a good first line of defense.
        return this.ownerDocument ? this.ownerDocument().fulfillmentMethod === 'delivery' : false;
      }
    },
    phone: { type: String, required: true, trim: true },
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false }
);

const statusHistorySchema = new Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

/** Human-friendly, reasonably-unique order reference (unique index guards it). */
function generateOrderId() {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${time}-${rand}`;
}

const orderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true },

    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'An order must contain at least one item.',
      },
    },

    totalAmount: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, min: 0, default: 0 },

    fulfillmentMethod: {
      type: String,
      enum: ['delivery', 'pickup'],
      default: 'delivery',
    },

    pickupTime: { type: String },

    deliveryAddress: { type: deliveryAddressSchema, required: true },

    notes: { type: String, trim: true, maxlength: 300 },

    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'pending',
    },

    paymentMethod: { type: String, default: 'cod' },

    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'pending',
    },

    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  {
    // Spec requests createdAt only.
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Generate orderId before validation so the `required` check passes.
orderSchema.pre('validate', function assignOrderId(next) {
  if (!this.orderId) this.orderId = generateOrderId();
  next();
});

// Seed the status history with the initial status on creation.
orderSchema.pre('save', function seedStatusHistory(next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({ status: this.status, timestamp: new Date() });
  }
  next();
});

// Requested indexes.
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

export default mongoose.models.Order || mongoose.model('Order', orderSchema);
