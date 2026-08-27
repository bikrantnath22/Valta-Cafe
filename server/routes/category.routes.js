// routes/category.routes.js — admin category management (staff only).
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '../controllers/category.controller.js';

const router = Router();

// Every category management route requires a signed-in staff member.
router.use(requireAuth, requireRole(['admin', 'superadmin']));

router.get('/', listCategories);
router.post('/', createCategory);

// Declared before '/:id' so "reorder" is not read as an id.
router.patch('/reorder', reorderCategories);

router.patch('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
