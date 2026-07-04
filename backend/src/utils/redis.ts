import Redis from 'ioredis';

// Shared ioredis client instance for general commands (SET, GET, DEL, etc.)
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  lazyConnect: true,
  enableOfflineQueue: false, // Prevent hanging if Redis is offline
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 500, 10000),
});

redis.on('error', (err) => {
  console.error('[Redis Client] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis Client] Connection established');
});
