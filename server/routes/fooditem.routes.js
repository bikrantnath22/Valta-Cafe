// routes/fooditem.routes.js — admin menu-item management (staff only).
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  listFoodItems,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
} from '../controllers/fooditem.controller.js';

const router = Router();

// Every menu-item management route requires a signed-in staff member.
router.use(requireAuth, requireRole(['admin', 'superadmin']));

router.get('/', listFoodItems);
router.post('/', createFoodItem);
router.patch('/:id', updateFoodItem);
router.delete('/:id', deleteFoodItem);

export default router;
