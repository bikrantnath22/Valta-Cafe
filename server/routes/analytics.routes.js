// routes/analytics.routes.js — dashboard analytics (staff only).
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getOverview } from '../controllers/analytics.controller.js';

const router = Router();

router.use(requireAuth, requireRole(['admin', 'superadmin']));

router.get('/overview', getOverview);

export default router;
