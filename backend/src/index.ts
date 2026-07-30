import dotenv from 'dotenv';
dotenv.config();

if (!process.env.INTERNAL_SERVICE_SECRET) {
  throw new Error('INTERNAL_SERVICE_SECRET environment variable must be set');
}


import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import authRoutes from './modules/auth/auth.routes';
import projectRoutes from './modules/projects/project.routes';
import campaignRoutes from './modules/campaigns/campaign.routes';
import constantsRoutes from './modules/constants/constants.routes';
import imagekitRoutes from './modules/imagekit/imagekit.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import focusGroupRoutes from './modules/focus-group/focus-group.routes';
import developerRoutes from './modules/developer/developer.routes';
import brandVaultRoutes from './modules/brand-vault/brand-vault.routes';
import { errorHandler } from './middlewares/error.middleware';
import prisma from './db';
import { notificationService } from './modules/notifications/notification.service';
import { initRedisSubscriber, shutdownRedisSubscriber } from './utils/redis-subscriber';
import { verifyToken } from './utils/jwt';
import { authenticateToken, AuthenticatedUser } from './middlewares/auth.middleware';
import { setSocketIO } from './modules/campaigns/campaign.controller';
import { globalRateLimiter } from './middlewares/rate-limit.middleware';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from './utils/redis';
import { mcpLoggerMiddleware } from './middlewares/mcp-logger.middleware';


export const app = express();
const PORT = process.env.PORT || 5003;

// Helmet secures Express by setting various HTTP headers
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
// Apply global rate limiting to all requests
app.use(globalRateLimiter);

// 1 MB limit — prevents oversized JSON payloads from OOM-ing the server.
app.use(express.json({ limit: '1mb' }));

app.use(mcpLoggerMiddleware);

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const { redis } = await import('./utils/redis');
    if (redis.status === 'wait') {
      try {
        await redis.connect();
      } catch (connErr) {
        // ignore connect rejection, let ping handle it or catch below
      }
    }
    await redis.ping();
    res.json({ status: 'ok', db: 'ok', redis: 'ok' });
  } catch (err: any) {
    res.status(503).json({ status: 'degraded', error: err.message || 'Service Degraded' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/constants', constantsRoutes);
app.use('/api/imagekit', imagekitRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/focus-group', focusGroupRoutes);
app.use('/api/developer', developerRoutes);
app.use('/api/brand-vault', brandVaultRoutes);

app.use(errorHandler);

// ── HTTP Server + Socket.io ───────────────────────────────────────────────────
// Wrap Express in a plain HTTP server so socket.io can share the same port.

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  connectTimeout: 10000,
  maxHttpBufferSize: 2e6, // 2MB safety buffer
  perMessageDeflate: {
    threshold: 1024, // Compress payloads larger than 1KB
    zlibDeflateOptions: {
      chunkSize: 8 * 1024,
    },
    zlibInflateOptions: {
      chunkSize: 16 * 1024,
    },
  },
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  httpCompression: true,
});

// Register io singleton so campaign.controller can emit socket events
// from the background AI runner without needing io passed through routes.
setSocketIO(io);

// Socket.io authentication middleware supporting dual auth (JWT + Developer API keys)
io.use(async (socket, next) => {
  try {
    const token = (socket.handshake.auth?.token ||
      socket.handshake.auth?.apiKey ||
      socket.handshake.headers?.authorization ||
      socket.handshake.query?.token) as string | undefined;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const authUser = await authenticateToken(token);
    if (!authUser) {
      return next(new Error('Unauthorized: invalid token or API key'));
    }

    socket.data.user = authUser;
    next();
  } catch (err: any) {
    next(new Error(`Authentication error: ${err?.message || err}`));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user as AuthenticatedUser;
  console.log(`[Socket.io] Client connected: ${socket.id} (user: ${user?.userId}, method: ${user?.authMethod})`);

  if (user?.userId) {
    const userRoom = `user:${user.userId}`;
    void socket.join(userRoom);
    console.log(`[Socket.io] Socket ${socket.id} securely joined user room: ${userRoom}`);
  }

  /**
   * join_campaign — client requests real-time updates for a specific campaign.
   *
   * Security: We verify campaign ownership against authenticated user ID before joining room.
   */
  socket.on('join_campaign', async (campaignId: string) => {
    try {
      const authUser = socket.data.user as AuthenticatedUser | undefined;
      if (!authUser?.userId) {
        socket.emit('auth_error', { message: 'Unauthorized: no valid auth context' });
        return;
      }

      // Confirm campaign belongs to this user
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: campaignId,
          project: { userId: authUser.userId },
        },
        select: { id: true },
      });

      if (!campaign) {
        socket.emit('auth_error', { message: 'Unauthorized: campaign not found' });
        return;
      }

      const room = `campaign:${campaign.id}`;
      void socket.join(room);
      console.log(`[Socket.io] ${socket.id} joined room: ${room} | user=${authUser.userId}`);
    } catch (err: any) {
      console.error(`[Socket.io] Error joining campaign room:`, err);
      socket.emit('auth_error', { message: 'Failed to join campaign room' });
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

  // Create duplicate Redis connections for Socket.io adapter pub/sub
  const pubClient = redis.duplicate({ lazyConnect: true });
  const subClient = redis.duplicate({ lazyConnect: true });

  pubClient.on('error', (err) => console.error('[Redis Socket.io Adapter Pub Client Error]', err));
  subClient.on('error', (err) => console.error('[Redis Socket.io Adapter Sub Client Error]', err));

  try {
    if (pubClient.status === 'wait') await pubClient.connect();
    if (subClient.status === 'wait') await subClient.connect();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[Redis PubSub] Successfully attached Redis adapter to Socket.io');
  } catch (err: any) {
    console.warn(`[Redis PubSub] Redis adapter initialization failed (non-fatal): ${err.message}`);
    console.warn('[Redis PubSub] Real-time multi-node synchronization will not function.');
  }

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

if (process.env.NODE_ENV !== 'test') {
  void startServer();
}

// ── Graceful Shutdown ─────────────────────────────────────────────────────────

const gracefulShutdown = async (signal: string) => {
  console.log(`\n[${signal}] Received. Starting graceful shutdown...`);
  
  // Close HTTP server first (stops accepting new connections)
  httpServer.close(async () => {
    console.log('[Server] HTTP server closed.');
    
    // Shut down Redis Subscriber
    await shutdownRedisSubscriber();
    
    // Disconnect Prisma
    await prisma.$disconnect();
    console.log('[Server] Prisma disconnected.');
    
    process.exit(0);
  });
  
  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    console.error('[Server] Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ── Global Process Safety Nets ────────────────────────────────────────────────

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason?.stack || reason);
});

process.on('uncaughtException', (error: Error) => {
  console.error('💥 Uncaught Exception:', error.stack || error.message);
  // In case of uncaught exception, try to exit gracefully
  void gracefulShutdown('UNCAUGHT_EXCEPTION');
});
