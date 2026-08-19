import Redis from 'ioredis';
import logger from './logger';

// Shared ioredis client instance for general commands (SET, GET, DEL, etc.)
//
// REDIS_URL takes priority over REDIS_HOST/REDIS_PORT when set.
// This enables managed Redis providers that require TLS (e.g. Upstash rediss://).
// For local Docker Compose, REDIS_URL is unset and the host/port fallback is used.
const sharedRedisOptions = {
  lazyConnect: false,       // Connect immediately on app startup
  enableOfflineQueue: true, // Queue commands safely during connection setup
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 500, 10000),
};

export const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, sharedRedisOptions)
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      ...sharedRedisOptions,
    });

redis.on('error', (err) => {
  logger.error('[Redis Client] Connection error:', err.message);
});

redis.on('connect', () => {
  logger.info('[Redis Client] Connection established');
});
