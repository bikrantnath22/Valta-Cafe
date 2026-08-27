// controllers/menu.controller.js — public menu (categories + food items).
import Category from '../models/Category.js';
import FoodItem from '../models/FoodItem.js';
import { logAudit } from '../utils/audit.js';

/**
 * GET /api/menu (public)
 * Returns all categories (in display order) and all food items. Unavailable
 * items are still included (with isAvailable:false) so the client can show them
 * greyed-out as "Currently unavailable" rather than hiding them.
 */
export async function getMenu(req, res, next) {
  try {
    const [categories, items] = await Promise.all([
      Category.find().sort({ order: 1, name: 1 }).lean(),
      FoodItem.find().sort({ name: 1 }).lean(),
    ]);

    res.json({ status: 'ok', categories, items });
  } catch (err) {
    next(err);
  }
}
