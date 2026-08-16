import dotenv from 'dotenv';
dotenv.config();
import logger from './utils/logger';

// Sentry MUST be initialised before any other imports that could throw.
// No-op when SENTRY_DSN env var is not set (safe for local dev).
import { initSentry, sentryErrorHandler } from './utils/sentry';
initSentry();

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

const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_URL;

export const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // Allow non-browser requests or same-origin
  if (frontendUrl && (origin === frontendUrl || origin === frontendUrl.replace(/\/$/, ''))) {
    return true;
  }
  // In development/test, allow all localhost variants
  if (!isProduction) {
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return true;
    }
  }
  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
// Apply global rate limiting to all requests
app.use(globalRateLimiter);

// 1 MB limit — prevents oversized JSON payloads from OOM-ing the server.
app.use(express.json({ limit: '1mb' }));

app.use(mcpLoggerMiddleware);

const handleHealthCheck = async (req: express.Request, res: express.Response) => {
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
};

app.get('/health', handleHealthCheck);
app.get('/api/health', handleHealthCheck);

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/constants', constantsRoutes);
app.use('/api/imagekit', imagekitRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/focus-group', focusGroupRoutes);
app.use('/api/developer', developerRoutes);
app.use('/api/brand-vault', brandVaultRoutes);

// Sentry error handler MUST come before custom errorHandler to capture 5xx errors
// @ts-ignore
app.use(sentryErrorHandler);
app.use(errorHandler);

// ── HTTP Server + Socket.io ───────────────────────────────────────────────────
// Wrap Express in a plain HTTP server so socket.io can share the same port.

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by Socket.io CORS'));
      }
    },
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
  logger.info(`[Socket.io] Client connected: ${socket.id} (user: ${user?.userId}, method: ${user?.authMethod})`);

  if (user?.userId) {
    const userRoom = `user:${user.userId}`;
    void socket.join(userRoom);
    logger.info(`[Socket.io] Socket ${socket.id} securely joined user room: ${userRoom}`);
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
      logger.info(`[Socket.io] ${socket.id} joined room: ${room} | user=${authUser.userId}`);
    } catch (err: any) {
      logger.error(`[Socket.io] Error joining campaign room:`, err);
      socket.emit('auth_error', { message: 'Failed to join campaign room' });
    }
  });

  // Client leaves when navigating away from the live page.
  socket.on('leave_campaign', (campaignId: string) => {
    const room = `campaign:${campaignId}`;
    void socket.leave(room);
    logger.info(`[Socket.io] ${socket.id} left room: ${room}`);
  });

  socket.on('disconnect', () => {
    logger.info(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// ── Startup ───────────────────────────────────────────────────────────────────

const ensureAvatarColumn = async () => {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT');
  } catch (error) {
    logger.warn('Unable to ensure users.avatarUrl column exists:', error);
  }
};

// ── Database startup readiness ─────────────────────────────────────────────
// Prisma connects lazily but startServer() immediately runs DDL via
// ensureAvatarColumn(). We probe the database first so failures are
// surfaced with clear retry logs rather than a cryptic Prisma error.

const DB_STARTUP_MAX_RETRIES = parseInt(
  process.env.DB_STARTUP_MAX_RETRIES ?? '10',
  10
);
const DB_STARTUP_RETRY_DELAY_MS = parseInt(
  process.env.DB_STARTUP_RETRY_DELAY_MS ?? '2000',
  10
);

const waitForDatabase = async (): Promise<void> => {
  for (let attempt = 1; attempt <= DB_STARTUP_MAX_RETRIES; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.info(`[DB] PostgreSQL ready (attempt ${attempt}/${DB_STARTUP_MAX_RETRIES})`);
      return;
    } catch (err: any) {
      if (attempt === DB_STARTUP_MAX_RETRIES) {
        logger.error(
          `[DB] PostgreSQL unavailable after ${DB_STARTUP_MAX_RETRIES} attempts. ` +
          `Last error: ${err.message}. Exiting.`
        );
        process.exit(1);
      }
      logger.warn(
        `[DB] PostgreSQL not ready (attempt ${attempt}/${DB_STARTUP_MAX_RETRIES}): ` +
        `${err.message}. Retrying in ${DB_STARTUP_RETRY_DELAY_MS}ms…`
      );
      await new Promise((resolve) => setTimeout(resolve, DB_STARTUP_RETRY_DELAY_MS));
    }
  }
};

const startServer = async () => {
  await waitForDatabase();
  await ensureAvatarColumn();


  // Create duplicate Redis connections for Socket.io adapter pub/sub
  const pubClient = redis.duplicate({ lazyConnect: true });
  const subClient = redis.duplicate({ lazyConnect: true });

  pubClient.on('error', (err) => logger.error('[Redis Socket.io Adapter Pub Client Error]', err));
  subClient.on('error', (err) => logger.error('[Redis Socket.io Adapter Sub Client Error]', err));

  try {
    if (pubClient.status === 'wait') await pubClient.connect();
    if (subClient.status === 'wait') await subClient.connect();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('[Redis PubSub] Successfully attached Redis adapter to Socket.io');
  } catch (err: any) {
    logger.warn(`[Redis PubSub] Redis adapter initialization failed (non-fatal): ${err.message}`);
    logger.warn('[Redis PubSub] Real-time multi-node synchronization will not function.');
  }

  // Initialize Redis Pub/Sub subscriber (passes the socket.io instance).
  // Any Redis connection errors are handled gracefully inside initRedisSubscriber.
  try {
    await initRedisSubscriber(io);
  } catch (err: any) {
    logger.warn(`[Redis Subscriber] Failed to connect (non-fatal) | err=${err.message}`);
    logger.warn('[Redis Subscriber] Campaign live updates will not work until Redis is available.');
  }

  httpServer.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  void startServer();
}

// ── Graceful Shutdown ─────────────────────────────────────────────────────────

const gracefulShutdown = async (signal: string) => {
  logger.info(`\n[${signal}] Received. Starting graceful shutdown...`);
  
  // Close HTTP server first (stops accepting new connections)
  httpServer.close(async () => {
    logger.info('[Server] HTTP server closed.');
    
    // Shut down Redis Subscriber
    await shutdownRedisSubscriber();
    
    // Disconnect Prisma
    await prisma.$disconnect();
    logger.info('[Server] Prisma disconnected.');
    
    process.exit(0);
  });
  
  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('[Server] Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ── Global Process Safety Nets ────────────────────────────────────────────────

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason?.stack || reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('💥 Uncaught Exception:', error.stack || error.message);
  // In case of uncaught exception, try to exit gracefully
  void gracefulShutdown('UNCAUGHT_EXCEPTION');
});
