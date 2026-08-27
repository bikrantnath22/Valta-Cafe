// routes/upload.routes.js — Cloudinary image upload endpoints (admin only).
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadImages as multerUpload } from '../middleware/upload.js';
import { uploadImages, deleteImage } from '../controllers/upload.controller.js';

const router = Router();

// Everything here is staff-only.
const staffOnly = [requireAuth, requireRole(['admin', 'superadmin'])];

// POST /api/upload — upload one or more images (field name: "images").
router.post('/', staffOnly, multerUpload, uploadImages);

// DELETE /api/upload/:publicId — remove an asset (public_id must be URL-encoded).
router.delete('/:publicId', staffOnly, deleteImage);

export default router;
