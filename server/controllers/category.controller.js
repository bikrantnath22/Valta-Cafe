// controllers/category.controller.js — admin CRUD + reordering for menu
// categories. All routes are staff-gated (admin or superadmin) in the router.
import mongoose from 'mongoose';
import Category from '../models/Category.js';
import FoodItem from '../models/FoodItem.js';

/** Map of categoryId -> number of food items, for the admin list view. */
async function itemCountsByCategory() {
  const rows = await FoodItem.aggregate([
    { $group: { _id: '$categoryId', count: { $sum: 1 } } },
  ]);
  const map = new Map();
  for (const r of rows) map.set(String(r._id), r.count);
  return map;
}

/** GET /api/categories (staff) — all categories in display order, with item counts. */
export async function listCategories(req, res, next) {
  try {
    const [categories, counts] = await Promise.all([
      Category.find().sort({ order: 1, name: 1 }).lean(),
      itemCountsByCategory(),
    ]);
    const withCounts = categories.map((c) => ({
      ...c,
      itemCount: counts.get(String(c._id)) || 0,
    }));
    res.json({ status: 'ok', categories: withCounts });
  } catch (err) {
    next(err);
  }
}

/** POST /api/categories (staff) — create a category. */
export async function createCategory(req, res, next) {
  try {
    const { name, description, order } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ status: 'error', message: 'A category name is required.' });
    }

    // Default new categories to the end of the list.
    const resolvedOrder =
      order === undefined || order === null || order === ''
        ? await Category.countDocuments()
        : Number(order);

    if (!Number.isFinite(resolvedOrder)) {
      return res.status(400).json({ status: 'error', message: 'Order must be a number.' });
    }

    const category = await Category.create({
      name: String(name).trim(),
      description: description ? String(description).trim() : undefined,
      order: resolvedOrder,
    });

    res.status(201).json({ status: 'ok', category });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'A category with that name already exists.' });
    }
    next(err);
  }
}

/** PATCH /api/categories/:id (staff) — update name/description/order. */
export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ status: 'error', message: 'Category not found.' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ status: 'error', message: 'Category not found.' });
    }

    const { name, description, order } = req.body || {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ status: 'error', message: 'Category name cannot be empty.' });
      }
      category.name = String(name).trim();
    }
    if (description !== undefined) {
      category.description = String(description).trim();
    }
    if (order !== undefined) {
      const n = Number(order);
      if (!Number.isFinite(n)) {
        return res.status(400).json({ status: 'error', message: 'Order must be a number.' });
      }
      category.order = n;
    }

    await category.save();
    res.json({ status: 'ok', category });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'A category with that name already exists.' });
    }
    next(err);
  }
}

/**
 * DELETE /api/categories/:id (staff)
 * Refuses to delete a category that still has food items, so items are never
 * orphaned — the client is told how many items to move/remove first.
 */
export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ status: 'error', message: 'Category not found.' });
    }

    const itemCount = await FoodItem.countDocuments({ categoryId: id });
    if (itemCount > 0) {
      return res.status(409).json({
        status: 'error',
        message: `This category has ${itemCount} item(s). Move or delete them before deleting the category.`,
      });
    }

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Category not found.' });
    }

    res.json({ status: 'ok', message: 'Category deleted.' });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/categories/reorder (staff)
 * Body: { ids: [categoryId, ...] } in the desired display order. Each category's
 * `order` is set to its index in the array.
 */
export async function reorderCategories(req, res, next) {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Provide an ordered array of category ids.' });
    }
    for (const id of ids) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ status: 'error', message: 'The ids list contains an invalid id.' });
      }
    }

    await Category.bulkWrite(
      ids.map((id, index) => ({
        updateOne: { filter: { _id: id }, update: { $set: { order: index } } },
      }))
    );

    const categories = await Category.find().sort({ order: 1, name: 1 }).lean();
    res.json({ status: 'ok', categories });
  } catch (err) {
    next(err);
  }
}
