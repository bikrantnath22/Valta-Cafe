// utils/cloudinary.js — thin helpers around the configured Cloudinary client.
import cloudinary from '../config/cloudinary.js';

/** Cloudinary folder that all food-item images live under. */
export const FOOD_IMAGE_FOLDER = 'valta-cafe/food-items';

// Longest-edge cap applied on upload to keep stored masters reasonable.
const MAX_DIMENSION = 1600;

/**
 * Upload a file buffer to Cloudinary via an upload stream.
 * Resolves with the raw Cloudinary result (includes public_id, secure_url, …).
 * @param {Buffer} buffer
 * @param {import('cloudinary').UploadApiOptions} [options]
 * @returns {Promise<import('cloudinary').UploadApiResponse>}
 */
export function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: FOOD_IMAGE_FOLDER,
        resource_type: 'image',
        // Cap dimensions on the stored master; never upscale.
        transformation: [{ width: MAX_DIMENSION, height: MAX_DIMENSION, crop: 'limit' }],
        ...options,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

/**
 * Build an optimized delivery URL for a stored asset (auto format + quality).
 * @param {string} publicId
 */
export function optimizedUrl(publicId) {
  return cloudinary.url(publicId, { secure: true, fetch_format: 'auto', quality: 'auto' });
}

/**
 * Delete a single asset. Throws on failure (use for the DELETE endpoint).
 * @param {string} publicId
 */
export async function destroyAsset(publicId) {
  if (!publicId) throw new Error('A public_id is required to delete an asset.');
  return cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
}

/**
 * Best-effort deletion of many assets — never throws, logs failures.
 * Used for cascade cleanup so it can't block a food item's own deletion.
 * @param {string[]} publicIds
 */
export async function destroyAssetsSafe(publicIds = []) {
  const ids = publicIds.filter(Boolean);
  if (ids.length === 0) return;
  const results = await Promise.allSettled(ids.map((id) => destroyAsset(id)));
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`Cloudinary cleanup failed for "${ids[i]}":`, r.reason?.message || r.reason);
    }
  });
}
