// routes/order.routes.js — customer order placement + history (auth only),
// plus staff-only admin listing and status updates.
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { orderCreateSchema } from '../utils/schema.js';
import {
  createOrder,
  listOrders,
  getOrder,
  listAllOrders,
  updateOrderStatus,
} from '../controllers/order.controller.js';

const router = Router();

// All order routes require a signed-in user.
router.use(requireAuth);

const staffOnly = requireRole(['admin', 'superadmin']);

router.post('/', validate(orderCreateSchema), createOrder);
router.get('/', listOrders);

// Staff-only admin routes — declared before '/:id' so "admin" is not read as an id.
router.get('/admin/all', staffOnly, listAllOrders);
router.patch('/:id/status', staffOnly, updateOrderStatus);

router.get('/:id', getOrder);

export default router;
