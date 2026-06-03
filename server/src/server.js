'use strict';

const http = require('http');
const { Server } = require('socket.io');

const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { createApp } = require('./app');
const { initSockets } = require('./sockets');

async function start() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: env.corsOrigins.includes('*') ? true : env.corsOrigins,
      credentials: true,
    },
  });
  initSockets(io);

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] Da3wa API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  // إيقاف نظيف
  const shutdown = async (signal) => {
    // eslint-disable-next-line no-console
    console.log(`\n[server] ${signal} received, shutting down...`);
    server.close();
    io.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});
