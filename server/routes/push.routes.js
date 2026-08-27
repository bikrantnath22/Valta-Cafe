import { Router } from 'express';
import { subscribe, unsubscribe } from '../controllers/push.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All push subscription routes require authentication
router.use(requireAuth);

router.post('/subscribe', subscribe);
router.delete('/subscribe', unsubscribe);

export default router;
