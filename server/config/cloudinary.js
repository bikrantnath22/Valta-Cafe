// config/cloudinary.js — configure the Cloudinary SDK once at startup.
// Supports either the three discrete vars or a single CLOUDINARY_URL.
// Importing this module configures the shared v2 client as a side effect.
import { v2 as cloudinary } from 'cloudinary';

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_URL } =
  process.env;

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
} else if (CLOUDINARY_URL) {
  // The SDK auto-parses credentials from CLOUDINARY_URL; just force https delivery.
  cloudinary.config({ secure: true });
} else {
  console.warn(
    '⚠️  Cloudinary is not configured — set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / ' +
      'CLOUDINARY_API_SECRET (or CLOUDINARY_URL) in server/.env. Image uploads will fail until then.'
  );
}

/** True when the SDK has the credentials it needs to talk to Cloudinary. */
export function isCloudinaryConfigured() {
  const c = cloudinary.config();
  return Boolean(c.cloud_name && c.api_key && c.api_secret);
}

export default cloudinary;
