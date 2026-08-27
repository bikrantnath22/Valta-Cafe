// controllers/upload.controller.js — Cloudinary image upload + delete.
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import { uploadBuffer, optimizedUrl, destroyAsset } from '../utils/cloudinary.js';

/**
 * POST /api/upload  (admin/superadmin)
 * Accepts one or more images (multipart field "images") and uploads each to
 * Cloudinary. Responds with { images: [{ url, public_id }, …] }.
 */
export async function uploadImages(req, res, next) {
  try {
    if (!isCloudinaryConfigured()) {
      return res
        .status(503)
        .json({ status: 'error', message: 'Image uploads are unavailable — Cloudinary is not configured.' });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No images were provided.' });
    }

    const images = await Promise.all(
      files.map(async (file) => {
        const result = await uploadBuffer(file.buffer);
        return { url: optimizedUrl(result.public_id), public_id: result.public_id };
      })
    );

    return res.status(201).json({ status: 'ok', images });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/upload/:publicId  (admin/superadmin)
 * Removes an asset from Cloudinary. The public_id contains slashes (folder
 * path), so the client must URL-encode it (encodeURIComponent).
 * Idempotent: deleting an already-gone asset still returns ok.
 */
export async function deleteImage(req, res, next) {
  try {
    let publicId = req.params.publicId || '';
    try {
      publicId = decodeURIComponent(publicId);
    } catch {
      /* already decoded — keep as-is */
    }

    if (!publicId) {
      return res.status(400).json({ status: 'error', message: 'A public_id is required.' });
    }

    if (!isCloudinaryConfigured()) {
      return res
        .status(503)
        .json({ status: 'error', message: 'Image deletion is unavailable — Cloudinary is not configured.' });
    }

    const result = await destroyAsset(publicId);
    // result.result is 'ok' or 'not found'; treat both as success (idempotent).
    return res.json({ status: 'ok', result: result.result, public_id: publicId });
  } catch (err) {
    next(err);
  }
}
