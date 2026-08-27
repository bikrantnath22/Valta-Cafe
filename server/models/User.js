// models/User.js — application users: superadmin, admin, and customers.
import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ROLES = ['superadmin', 'admin', 'customer'];

/**
 * A saved delivery address on a customer's profile.
 * Keeps its own _id so individual addresses can be edited/removed by id.
 * `address` (text) and `phone` are required; lat/lng are optional.
 */
const savedAddressSchema = new Schema(
  {
    label: { type: String, trim: true }, // e.g. "Home", "Work"
    address: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    lat: { type: Number },
    lng: { type: Number },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true, // creates a unique index
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },

    // Present for customers (and staff) who sign in with Google.
    googleId: { type: String, unique: true, sparse: true },

    role: { type: String, enum: ROLES, default: 'customer', required: true },

    // Only set for admin/superadmin accounts that log in with a password.
    // Never returned by default (select:false); explicitly select it for auth.
    passwordHash: { type: String, select: false },

    savedAddresses: { type: [savedAddressSchema], default: [] },

    // Used to deactivate admin accounts without deleting them.
    isActive: { type: Boolean, default: true },
  },
  {
    // Spec requests createdAt only.
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Defense-in-depth: strip sensitive/internal fields from JSON output.
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.models.User || mongoose.model('User', userSchema);
