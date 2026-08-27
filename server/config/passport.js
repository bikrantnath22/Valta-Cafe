// config/passport.js — Passport configuration (Google OAuth 2.0 strategy).
// Stateless: we use JWTs, so no sessions (authenticate with { session: false }).
// Importing this module registers the strategy as a side effect.
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn(
    '⚠️  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google login will fail until configured in server/.env.'
  );
}

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID || 'missing-client-id',
      clientSecret: GOOGLE_CLIENT_SECRET || 'missing-client-secret',
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    // Verify callback. On first login we auto-create a customer.
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const googleId = profile.id;
        const name = profile.displayName || email || 'Customer';

        if (!email) {
          return done(new Error('Google account did not provide an email address.'));
        }

        // Match by googleId first, then by email (to link existing accounts,
        // e.g. a staff member created via local login who later uses Google).
        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (!user) {
          user = await User.create({ name, email, googleId, role: 'customer' });
        } else if (!user.googleId) {
          // Link Google to an existing account WITHOUT changing their role.
          user.googleId = googleId;
          await user.save();
        }

        if (!user.isActive) {
          return done(null, false, { message: 'This account has been deactivated.' });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

export default passport;
