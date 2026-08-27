// routes/health.routes.js — health-check endpoint(s).
import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

// GET /api/health
router.get('/', getHealth);

export default router;
