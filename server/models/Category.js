// models/Category.js — menu categories used to group food items.
import mongoose from 'mongoose';

const { Schema } = mongoose;

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
    // Lower `order` shows first. Used to sort categories for display.
    order: { type: Number, default: 0 },
  },
  { timestamps: true } // createdAt + updatedAt (added; not in spec but useful)
);

// Support fetching categories in display order efficiently.
categorySchema.index({ order: 1 });

export default mongoose.models.Category || mongoose.model('Category', categorySchema);
