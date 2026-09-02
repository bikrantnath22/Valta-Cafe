// routes/auth.routes.js — authentication endpoints.
import { Router } from 'express';
import passport from '../config/passport.js';
import { googleCallback, logout, me, adminLogin } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();

// GET /api/auth/google — kick off Google OAuth.
router.get(
  '/google',
  (req, res, next) => {
    const referer = req.get('Referer');
    if (referer) {
      try {
        const origin = new URL(referer).origin;
        res.cookie('oauth_origin', origin, { maxAge: 5 * 60 * 1000, httpOnly: true });
      } catch (err) {}
    }
    next();
  },
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// GET /api/auth/google/callback — Passport callback; issues JWT + redirects.
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${CLIENT_URL}/login?error=oauth`,
  }),
  googleCallback
);

// POST /api/auth/admin-login — email/password login for admin.
router.post('/admin-login', adminLogin);

// POST /api/auth/logout — clear the auth cookie.
router.post('/logout', logout);

// GET /api/auth/me — current authenticated user.
router.get('/me', requireAuth, me);

export default router;
