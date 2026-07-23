import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';

const isTest = process.env.NODE_ENV === 'test';

const redisClient = isTest ? null : new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => Math.min(times * 1000, 5000),
});

redisClient?.on('connect', () => console.log('[RateLimiter] Redis connected'));
redisClient?.on('error', (err) => console.error('[RateLimiter] Redis error:', err.message));

const sendCommand = async (...args: string[]): Promise<any> => {
  if (!redisClient) {
    throw new Error('Redis rate limit store is disabled in test');
  }
  
  // If connection is in progress, wait for the ready event instead of throwing immediately
  if (redisClient.status === 'connecting') {
    await new Promise<void>((resolve) => {
      redisClient.once('ready', () => resolve());
    });
  }

  if (redisClient.status !== 'ready') {
    throw new Error(`Redis not ready (status: ${redisClient.status})`);
  }
  return redisClient.call(args[0], ...args.slice(1));
};

const createRedisStore = (name: string) => new RedisStore({
  sendCommand,
  prefix: `rl:${name}:`,
});

const rateLimitStore = (name: string) => isTest ? undefined : createRedisStore(name);

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore('global'),
  passOnStoreError: true,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore('auth'),
  passOnStoreError: false,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
});

export const campaignRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 150,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore('campaign'),
  passOnStoreError: true,
  message: { error: 'Campaign generation rate limit exceeded. Please try again after 15 minutes.' },
});

export const developerConnectionRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore('dev-connect'),
  passOnStoreError: true,
  message: { error: 'Too many connection attempts. Please try again after 1 minute.' },
});

