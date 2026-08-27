// middleware/auth.js — JWT authentication and role authorization.
import { verifyToken, COOKIE_NAME } from '../utils/jwt.js';
import User from '../models/User.js';

/** Read the JWT from the httpOnly cookie, or an "Authorization: Bearer" header. */
function extractToken(req) {
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/**
 * requireAuth — verifies the token, loads the user, attaches req.user.
 * Rejects if the token is missing/invalid, the user no longer exists, or the
 * account has been deactivated.
 */
export async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ status: 'error', message: 'Not authenticated.' });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired session.' });
    }

    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'User no longer exists.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ status: 'error', message: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * requireRole(['admin','superadmin']) — must run after requireAuth.
 * Returns 403 if the authenticated user's role isn't allowed.
 */
export function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Not authenticated.' });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Insufficient permissions.' });
    }
    next();
  };
}
