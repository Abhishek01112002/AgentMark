import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';

// Dedicated Redis client for rate limiting (since subscriber client is subscribe-only)
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 1000, 5000), // Max 5s retry delay
});

let isRedisConnected = false;

// Connect to Redis and handle status
redisClient.connect()
  .then(() => {
    isRedisConnected = true;
    console.log('[RateLimiter] Connected to Redis successfully');
  })
  .catch((err) => {
    console.warn('[RateLimiter] Redis connection failed, falling back to MemoryStore:', err.message);
  });

redisClient.on('connect', () => {
  isRedisConnected = true;
  console.log('[RateLimiter] Redis connection established');
});

redisClient.on('error', (err) => {
  isRedisConnected = false;
  console.error('[RateLimiter] Redis client error:', err.message);
});

redisClient.on('close', () => {
  isRedisConnected = false;
  console.warn('[RateLimiter] Redis connection closed');
});

// A custom sendCommand wrapper that forwards commands to ioredis
const sendCommand = async (...args: string[]): Promise<any> => {
  return redisClient.call(args[0], ...args.slice(1));
};

// Helper to create a unique RedisStore instance with a custom prefix to prevent key collision
const createRedisStore = (name: string) => new RedisStore({
  sendCommand,
  prefix: `rl:${name}:`,
});

/**
 * Global Rate Limiter: 200 requests per 15 minutes per IP.
 * Gracefully falls back to MemoryStore if Redis is offline.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('global'),
  passOnStoreError: true, // If Redis fails, let requests pass instead of throwing 500
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

/**
 * Auth Rate Limiter: 10 requests per 15 minutes per IP (Login, Signup).
 * Prevents brute-force attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('auth'),
  passOnStoreError: true,
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

/**
 * Campaign Rate Limiter: 15 requests per 15 minutes per IP.
 * Prevents spamming the expensive AI generation service.
 */
export const campaignRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('campaign'),
  passOnStoreError: true,
  message: {
    error: 'Campaign generation rate limit exceeded. Please try again after 15 minutes.',
  },
});
