// models/FoodItem.js — a menu item belonging to a category.
import mongoose from 'mongoose';
import { destroyAssetsSafe } from '../utils/cloudinary.js';

const { Schema } = mongoose;

/**
 * A Cloudinary image reference. Both the delivery URL and the public_id
 * (needed to delete/transform the asset later) are stored.
 */
const imageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    public_id: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const foodItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },

    // At least one image is required.
    images: {
      type: [imageSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'A food item must have at least one image.',
      },
    },

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },

    // Admin-toggleable availability (e.g. "sold out for today").
    isAvailable: { type: Boolean, default: true },

    isVeg: { type: Boolean, default: false },

    isBestSeller: { type: Boolean, default: false },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true } // createdAt + updatedAt (updatedAt requested in spec)
);

// --- Cascade: remove Cloudinary assets when a food item is deleted ----------
// Best-effort cleanup so we never orphan images. These fire for the two common
// delete paths: `Model.findByIdAndDelete(id)` / `findOneAndDelete(query)` and a
// loaded document's `doc.deleteOne()`. (A raw query `Model.deleteOne(filter)`
// has no document to read images from, so prefer the two paths above.)
function imagePublicIds(doc) {
  return Array.isArray(doc?.images) ? doc.images.map((img) => img.public_id) : [];
}

foodItemSchema.post('findOneAndDelete', async function (doc) {
  if (doc) await destroyAssetsSafe(imagePublicIds(doc));
});

foodItemSchema.post('deleteOne', { document: true, query: false }, async function () {
  await destroyAssetsSafe(imagePublicIds(this));
});

export default mongoose.models.FoodItem || mongoose.model('FoodItem', foodItemSchema);
