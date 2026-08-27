// routes/menu.routes.js — public menu (categories + items in one call).
import { Router } from 'express';
import { getMenu } from '../controllers/menu.controller.js';

const router = Router();

// GET /api/menu — public.
router.get('/', getMenu);

export default router;
