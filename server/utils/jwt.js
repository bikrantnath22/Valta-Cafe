// utils/jwt.js — JWT signing/verification and the auth cookie name.
import jwt from 'jsonwebtoken';

// Name of the httpOnly cookie that carries the JWT.
export const COOKIE_NAME = 'valta_token';

const SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!process.env.JWT_SECRET) {
  console.warn(
    '⚠️  JWT_SECRET is not set — using an insecure dev fallback. Set it in server/.env.'
  );
}

/** Sign a JWT for the given payload (e.g. { id, role }). */
export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

/** Verify a JWT and return its decoded payload. Throws if invalid/expired. */
export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

/** Cookie options for the auth cookie. Secure only in production (so http
 *  localhost works in dev); Lax is fine because the client and API are
 *  same-site (both localhost). */
export function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}
