// controllers/fooditem.controller.js — admin CRUD for menu items.
// All routes are staff-gated (admin or superadmin) in the router. Deletes use
// findByIdAndDelete so the FoodItem model's post-delete hook can clean up the
// item's Cloudinary images.
import mongoose from 'mongoose';
import FoodItem from '../models/FoodItem.js';
import Category from '../models/Category.js';
import { getIO } from '../socket.js';
import { logAudit } from '../utils/audit.js';

/** Validate + normalize an images array into [{url, public_id}] (>= 1 entry). */
function normalizeImages(images) {
  if (!Array.isArray(images) || images.length === 0) {
    return { error: 'At least one image is required.' };
  }
  const cleaned = [];
  for (const img of images) {
    const url = img && typeof img.url === 'string' ? img.url.trim() : '';
    const publicId = img && typeof img.public_id === 'string' ? img.public_id.trim() : '';
    if (!url || !publicId) {
      return { error: 'Each image needs a url and public_id.' };
    }
    cleaned.push({ url, public_id: publicId });
  }
  return { value: cleaned };
}

/** Parse a price into a non-negative finite number. */
function parsePrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n) || n < 0) return { error: 'Price must be a number of 0 or more.' };
  return { value: n };
}

/** GET /api/food-items (staff) — every item (incl. unavailable), category populated. */
export async function listFoodItems(req, res, next) {
  try {
    const items = await FoodItem.find()
      .sort({ createdAt: -1 })
      .populate('categoryId', 'name')
      .lean();
    res.json({ status: 'ok', items });
  } catch (err) {
    next(err);
  }
}

/** POST /api/food-items (staff) — create a menu item. */
export async function createFoodItem(req, res, next) {
  try {
    const { name, description, price, categoryId, isVeg, isAvailable, isBestSeller, images } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ status: 'error', message: 'An item name is required.' });
    }

    const priceResult = parsePrice(price);
    if (priceResult.error) {
      return res.status(400).json({ status: 'error', message: priceResult.error });
    }

    if (!mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({ status: 'error', message: 'A valid category is required.' });
    }
    const categoryExists = await Category.exists({ _id: categoryId });
    if (!categoryExists) {
      return res.status(400).json({ status: 'error', message: 'Selected category does not exist.' });
    }

    const imagesResult = normalizeImages(images);
    if (imagesResult.error) {
      return res.status(400).json({ status: 'error', message: imagesResult.error });
    }

    const item = await FoodItem.create({
      name: String(name).trim(),
      description: description ? String(description).trim() : undefined,
      price: priceResult.value,
      categoryId,
      images: imagesResult.value,
      isVeg: Boolean(isVeg),
      isAvailable: isAvailable === undefined ? true : Boolean(isAvailable),
      isBestSeller: Boolean(isBestSeller),
      createdBy: req.user._id,
    });

    getIO().emit('menu_updated');
    logAudit(req, 'CREATE_FOOD_ITEM', { itemId: item._id, name: item.name });
    res.status(201).json({ status: 'ok', item });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/food-items/:id (staff) — update any field, incl. availability. */
export async function updateFoodItem(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ status: 'error', message: 'Item not found.' });
    }

    const item = await FoodItem.findById(id);
    if (!item) {
      return res.status(404).json({ status: 'error', message: 'Item not found.' });
    }

    const { name, description, price, categoryId, isVeg, isAvailable, isBestSeller, images } = req.body || {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ status: 'error', message: 'Item name cannot be empty.' });
      }
      item.name = String(name).trim();
    }
    if (description !== undefined) {
      item.description = String(description).trim();
    }
    if (price !== undefined) {
      const priceResult = parsePrice(price);
      if (priceResult.error) {
        return res.status(400).json({ status: 'error', message: priceResult.error });
      }
      item.price = priceResult.value;
    }
    if (categoryId !== undefined) {
      if (!mongoose.isValidObjectId(categoryId)) {
        return res.status(400).json({ status: 'error', message: 'A valid category is required.' });
      }
      const categoryExists = await Category.exists({ _id: categoryId });
      if (!categoryExists) {
        return res.status(400).json({ status: 'error', message: 'Selected category does not exist.' });
      }
      item.categoryId = categoryId;
    }
    if (images !== undefined) {
      const imagesResult = normalizeImages(images);
      if (imagesResult.error) {
        return res.status(400).json({ status: 'error', message: imagesResult.error });
      }
      item.images = imagesResult.value;
    }
    if (isVeg !== undefined) item.isVeg = Boolean(isVeg);
    if (isAvailable !== undefined) item.isAvailable = Boolean(isAvailable);
    if (isBestSeller !== undefined) item.isBestSeller = Boolean(isBestSeller);

    await item.save();
    
    getIO().emit('menu_updated');
    logAudit(req, 'UPDATE_FOOD_ITEM', { itemId: item._id, name: item.name });
    res.json({ status: 'ok', item });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/food-items/:id (staff)
 * Uses findByIdAndDelete so the model's post('findOneAndDelete') hook fires and
 * removes the item's Cloudinary images.
 */
export async function deleteFoodItem(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ status: 'error', message: 'Item not found.' });
    }

    const deleted = await FoodItem.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Item not found.' });
    }

    getIO().emit('menu_updated');
    logAudit(req, 'DELETE_FOOD_ITEM', { itemId: deleted._id, name: deleted.name });
    res.json({ status: 'ok', message: 'Item deleted.' });
  } catch (err) {
    next(err);
  }
}
