// controllers/auth.controller.js — Google OAuth callback, logout, me.
import { signToken, cookieOptions, COOKIE_NAME } from '../utils/jwt.js';

/** Allowed client origin (used for post-OAuth redirect). */
function clientOrigin(req) {
  const allowed = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(u => u.trim());
  const defaultOrigin = allowed[0];
  
  if (req && req.cookies && req.cookies.oauth_origin) {
    if (allowed.includes(req.cookies.oauth_origin)) {
      return req.cookies.oauth_origin;
    }
  }
  return defaultOrigin;
}

/** Sign a JWT for the user and set it as an httpOnly cookie. */
function issueTokenCookie(res, user) {
  const token = signToken({ id: user._id.toString(), role: user.role });
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return token;
}

/**
 * GET /api/auth/google/callback
 * Passport has authenticated and attached req.user. Issue the JWT cookie and
 * redirect back to the React app, which then reads the user via /api/auth/me.
 */
export function googleCallback(req, res) {
  issueTokenCookie(res, req.user);
  const redirectOrigin = clientOrigin(req);
  res.clearCookie('oauth_origin');
  
  if (req.user.role === 'admin' || req.user.role === 'superadmin') {
    return res.redirect(`${redirectOrigin}/admin/`);
  }
  return res.redirect(redirectOrigin);
}

/** POST /api/auth/logout — clear the auth cookie. */
export function logout(req, res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  return res.json({ status: 'ok', message: 'Logged out.' });
}

/** GET /api/auth/me — return the currently authenticated user (requireAuth). */
export function me(req, res) {
  return res.json({ status: 'ok', user: req.user.toJSON() });
}
