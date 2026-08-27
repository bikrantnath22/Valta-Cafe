// server.js — application entry point
// Loads environment variables, connects to MongoDB, then starts the HTTP server.
import 'dotenv/config';
import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import { initSocket } from './socket.js';
import { startKeepAlive } from './scripts/keepAlive.js';

const PORT = process.env.PORT || 5000;

async function start() {
  // Attempt the DB connection. It is intentionally non-fatal in development:
  // the API (including the health check) should still boot if Mongo is down,
  // so the frontend can be developed against it. See config/db.js.
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`\n🍽️  VALTA Cafe API listening on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
    
    // Start the keep-alive ping for Render free tier
    startKeepAlive();
  });
}

start();

// Surface unexpected async failures instead of crashing silently.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
