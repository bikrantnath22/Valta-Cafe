// routes/index.js — mounts all API sub-routers under /api.
import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import uploadRoutes from './upload.routes.js';
import settingsRoutes from './settings.routes.js';
import pushRoutes from './push.routes.js';
import menuRoutes from './menu.routes.js';
import addressRoutes from './address.routes.js';
import orderRoutes from './order.routes.js';
import categoryRoutes from './category.routes.js';
import foodItemRoutes from './fooditem.routes.js';
import analyticsRoutes from './analytics.routes.js';
import userRoutes from './user.routes.js';
import notificationRoutes from './notification.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);
router.use('/settings', settingsRoutes);
router.use('/push', pushRoutes);
router.use('/menu', menuRoutes);
router.use('/addresses', addressRoutes);
router.use('/orders', orderRoutes);
router.use('/notifications', notificationRoutes);

// Admin / staff management routers (write actions are role-gated inside each).
router.use('/categories', categoryRoutes);
router.use('/food-items', foodItemRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/users', userRoutes);

export default router;
