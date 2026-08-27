// routes/user.routes.js — superadmin-only user & role management.
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listUsers, updateUserRole, updateUserActive } from '../controllers/user.controller.js';
import { validate } from '../middleware/validate.js';
import { roleUpdateSchema } from '../utils/schema.js';

const router = Router();

// User management is restricted to superadmins.
router.use(requireAuth, requireRole(['superadmin']));

router.get('/', listUsers);
router.patch('/:id/role', validate(roleUpdateSchema), updateUserRole);
router.patch('/:id/active', updateUserActive);

export default router;
