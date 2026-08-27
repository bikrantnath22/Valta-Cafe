// models/SiteSettings.js — global cafe configuration.
// Enforced as a singleton: only one document should ever exist. Use the
// static `SiteSettings.getSettings()` to read (and lazily create) it.
import mongoose from 'mongoose';

const { Schema } = mongoose;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/; // 24-hour "HH:mm"

const logoSchema = new Schema(
  {
    url: { type: String, trim: true },
    public_id: { type: String, trim: true }, // Cloudinary asset id
  },
  { _id: false }
);

const openingHoursSchema = new Schema(
  {
    start: {
      type: String,
      default: '09:00',
      match: [HHMM, 'openingHours.start must be in HH:mm (24h) format.'],
    },
    end: {
      type: String,
      default: '21:00',
      match: [HHMM, 'openingHours.end must be in HH:mm (24h) format.'],
    },
  },
  { _id: false }
);

const contactInfoSchema = new Schema(
  {
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
  },
  { _id: false }
);

const DEFAULT_CLOSED_MESSAGE =
  "We're currently closed. Please check back during our opening hours.";

const siteSettingsSchema = new Schema(
  {
    // Guarantees a single settings document (unique + immutable key).
    singletonKey: {
      type: String,
      default: 'SITE_SETTINGS',
      unique: true,
      immutable: true,
    },

    cafeName: { type: String, default: 'VALTA Cafe', trim: true },

    logo: { type: logoSchema, default: () => ({}) },

    openingHours: { type: openingHoursSchema, default: () => ({}) },

    // Admin's manual off switch — when true, the cafe is closed regardless
    // of openingHours.
    isManuallyClosed: { type: Boolean, default: false },

    // Editable message shown to customers when the cafe is closed.
    closedMessage: { type: String, default: DEFAULT_CLOSED_MESSAGE, trim: true },

    deliveryFee: { type: Number, default: 0, min: 0 },

    estimatedDeliveryTime: { type: String, default: '40-45 min', trim: true },
    estimatedPickupTime: { type: String, default: '10-15 min', trim: true },

    contactInfo: { type: contactInfoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

/** Fetch the singleton settings document, creating it with defaults if needed. */
siteSettingsSchema.statics.getSettings = async function getSettings() {
  const existing = await this.findOne();
  return existing || this.create({});
};

export default mongoose.models.SiteSettings ||
  mongoose.model('SiteSettings', siteSettingsSchema);
