// routes/settings.routes.js — public read + staff edit of site settings.
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getPublicSettings, updateSettings } from '../controllers/settings.controller.js';

const router = Router();

// GET /api/settings — public (menu can be browsed without signing in).
router.get('/', getPublicSettings);

// PATCH /api/settings — staff only.
router.patch('/', requireAuth, requireRole(['admin', 'superadmin']), updateSettings);

export default router;
