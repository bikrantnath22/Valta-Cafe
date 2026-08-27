import { Server } from 'socket.io';

let io;

export function initSocket(server) {
  const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    const { role, userId } = socket.handshake.query;

    if (role === 'admin' || role === 'superadmin') {
      socket.join('admins');
    }
    
    if (userId) {
      socket.join(userId);
    }
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}
