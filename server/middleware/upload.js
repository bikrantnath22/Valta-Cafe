// middleware/upload.js — multer setup for in-memory image uploads.
// Files are held in memory (req.files[].buffer) and streamed to Cloudinary
// by the controller, so nothing is ever written to disk.
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';

// "Minimal" limits (see README): up to 4 images, 3 MB each.
export const MAX_FILES = 4;
export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB
const FIELD_NAME = 'images';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const storage = multer.memoryStorage();

const multerInstance = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter(req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    const err = new Error('Only JPEG, PNG, WebP, or GIF images are allowed.');
    err.statusCode = 400;
    cb(err);
  },
});

/**
 * Middleware that accepts up to MAX_FILES files under the "images" field and
 * translates multer's errors into clean 400s for the central error handler.
 */
export function uploadImages(req, res, next) {
  const handler = multerInstance.array(FIELD_NAME, MAX_FILES);
  handler(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      err.statusCode = 400;
      if (err.code === 'LIMIT_FILE_SIZE') err.message = 'Each image must be 3 MB or smaller.';
      else if (err.code === 'LIMIT_FILE_COUNT') err.message = `You can upload at most ${MAX_FILES} images.`;
      else if (err.code === 'LIMIT_UNEXPECTED_FILE') err.message = `Unexpected upload field — use "${FIELD_NAME}".`;
      return next(err);
    } else if (err) {
      if (!err.statusCode) err.statusCode = 400;
      return next(err);
    }

    // Secondary validation: check magic bytes using file-type
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const type = await fileTypeFromBuffer(file.buffer);
        if (!type || !ALLOWED_MIME.has(type.mime)) {
          const typeErr = new Error('Invalid file type detected. Only JPEG, PNG, WebP, or GIF allowed.');
          typeErr.statusCode = 400;
          return next(typeErr);
        }
      }
    }

    next();
  });
}
