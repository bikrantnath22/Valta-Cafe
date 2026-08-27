// app.js — Express application setup (middleware, CORS, routes, error handling).
// Kept separate from server.js so the app can be imported for testing without
// binding to a port.
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';

import passport from './config/passport.js';
import routes from './routes/index.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Core middleware ---------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// --- Security Middleware -----------------------------------------------------
app.use(helmet({ contentSecurityPolicy: false }));
app.use(mongoSanitize());
app.use(hpp());

// --- CORS --------------------------------------------------------------------
// Allow the Vite dev server (and any additional origins listed in CLIENT_URL,
// comma-separated) to call the API. credentials:true so cookie-based auth can
// be added later without revisiting this config.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, '')) // strip trailing slash just in case
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (like same-origin requests when Express serves the React app,
      // or tools like Postman).
      const isDev = process.env.NODE_ENV !== 'production';
      if (!origin || allowedOrigins.includes(origin) || origin === 'http://localhost:5000' || (isDev && origin === 'http://localhost:5173')) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

// --- Passport (stateless — JWT, no sessions) ---------------------------------
app.use(passport.initialize());

// --- API Routes --------------------------------------------------------------
app.use('/api', routes);

// --- Static Frontend Serving (Production) ------------------------------------
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientBuildPath));

  // For any route not matched by the API or static files, send the React index.html
  // so React Router can handle client-side routing.
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  // --- 404 handler for development (API only) -------------------------------
  app.use(notFound);
}
app.use(errorHandler);

export default app;
