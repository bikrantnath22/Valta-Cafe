// controllers/health.controller.js — reports API + database health.
import mongoose from 'mongoose';

// mongoose.connection.readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

export function getHealth(req, res) {
  const dbState = DB_STATES[mongoose.connection.readyState] || 'unknown';

  res.status(200).json({
    status: 'ok',
    service: 'VALTA Cafe API',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: dbState,
  });
}
