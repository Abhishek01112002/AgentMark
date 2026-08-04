import Redis from 'ioredis';
import logger from './logger';

// Shared ioredis client instance for general commands (SET, GET, DEL, etc.)
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  lazyConnect: false, // Connect immediately on app startup
  enableOfflineQueue: true, // Queue commands safely during connection setup
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 500, 10000),
});

redis.on('error', (err) => {
  logger.error('[Redis Client] Connection error:', err.message);
});

redis.on('connect', () => {
  logger.info('[Redis Client] Connection established');
});
