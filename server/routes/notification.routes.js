import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getNotifications, markAllRead } from '../controllers/notification.controller.js';

const router = Router();

const requireStaff = [requireAuth, requireRole(['admin', 'superadmin'])];

// All authenticated users can fetch and mark their own notifications read
router.get('/', requireAuth, getNotifications);
router.patch('/read-all', requireAuth, markAllRead);

export default router;
