import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import authRoutes from './modules/auth/auth.routes';
import projectRoutes from './modules/projects/project.routes';
import campaignRoutes from './modules/campaigns/campaign.routes';
import constantsRoutes from './modules/constants/constants.routes';
import imagekitRoutes from './modules/imagekit/imagekit.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import { errorHandler } from './middlewares/error.middleware';
import prisma from './db';
import { notificationService } from './modules/notifications/notification.service';
import { initRedisSubscriber } from './utils/redis-subscriber';
import { verifyToken } from './utils/jwt';
import { setSocketIO } from './modules/campaigns/campaign.controller';


const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
// 1 MB limit — prevents oversized JSON payloads from OOM-ing the server.
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AgentMark API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/constants', constantsRoutes);
app.use('/api/imagekit', imagekitRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

// ── HTTP Server + Socket.io ───────────────────────────────────────────────────
// Wrap Express in a plain HTTP server so socket.io can share the same port.

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// Register io singleton so campaign.controller can emit socket events
// from the background AI runner without needing io passed through routes.
setSocketIO(io);

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  /**
   * join_campaign — client requests real-time updates for a specific campaign.
   *
   * Security: We verify the JWT from socket.handshake.auth.token and confirm
   * the campaign belongs to the authenticated user before joining the room.
   * This prevents any user from snooping on another user's agent events.
   */
  socket.on('join_campaign', async (campaignId: string) => {
    try {
      // 1. Verify JWT
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        socket.emit('error', { message: 'Unauthorized: no token' });
        return;
      }
      const decoded = verifyToken(token);

      // 2. Confirm campaign belongs to this user
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId },
        include: { project: { select: { userId: true } } },
      });

      if (!campaign || campaign.project.userId !== decoded.userId) {
        socket.emit('error', { message: 'Unauthorized: campaign not found' });
        return;
      }

      // 3. Join the room
      const room = `campaign:${campaignId}`;
      void socket.join(room);
      console.log(`[Socket.io] ${socket.id} joined room: ${room} | user=${decoded.userId}`);
    } catch (err: any) {
      // Invalid/expired token
      socket.emit('error', { message: 'Unauthorized: invalid token' });
    }
  });

  // Client leaves when navigating away from the live page.
  socket.on('leave_campaign', (campaignId: string) => {
    const room = `campaign:${campaignId}`;
    void socket.leave(room);
    console.log(`[Socket.io] ${socket.id} left room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// ── Startup ───────────────────────────────────────────────────────────────────

const ensureAvatarColumn = async () => {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT');
  } catch (error) {
    console.warn('Unable to ensure users.avatarUrl column exists:', error);
  }
};

const startServer = async () => {
  await ensureAvatarColumn();
  await notificationService.ensureTable();

  // Initialize Redis Pub/Sub subscriber (passes the socket.io instance).
  // Any Redis connection errors are handled gracefully inside initRedisSubscriber.
  try {
    await initRedisSubscriber(io);
  } catch (err: any) {
    console.warn(`[Redis Subscriber] Failed to connect (non-fatal) | err=${err.message}`);
    console.warn('[Redis Subscriber] Campaign live updates will not work until Redis is available.');
  }

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

void startServer();
