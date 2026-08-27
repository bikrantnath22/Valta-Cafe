// routes/address.routes.js — a customer's saved delivery addresses (auth only).
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from '../controllers/address.controller.js';
import { validate } from '../middleware/validate.js';
import { addressSchema } from '../utils/schema.js';

const router = Router();

// All address routes require a signed-in user.
router.use(requireAuth);

router.get('/', listAddresses);
router.post('/', validate(addressSchema), addAddress);
router.patch('/:id', validate(addressSchema), updateAddress);
router.delete('/:id', deleteAddress);

export default router;
