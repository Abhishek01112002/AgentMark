import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';
import logger from '../utils/logger';

const isTest = process.env.NODE_ENV === 'test';

const isTls = Boolean(
  process.env.REDIS_URL &&
  (process.env.REDIS_URL.startsWith('rediss://') || process.env.REDIS_URL.includes('upstash.io'))
);

const redisOptions = {
  enableOfflineQueue: false,
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => Math.min(times * 1000, 5000),
  ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
};

const redisClient = isTest
  ? null
  : process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, redisOptions)
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      ...redisOptions,
    });

redisClient?.on('connect', () => logger.info('[RateLimiter] Redis connected'));
redisClient?.on('error', (err) => logger.error('[RateLimiter] Redis error:', err.message));

const sendCommand = async (...args: string[]): Promise<any> => {
  if (!redisClient) {
    throw new Error('Redis rate limit store is disabled in test');
  }
  
  // If connection is in progress, wait for the ready event instead of throwing immediately.
  // Race with a 5-second timeout so a permanently-stuck Redis never blocks every request forever.
  if (redisClient.status === 'connecting') {
    await Promise.race([
      new Promise<void>((resolve) => { redisClient.once('ready', resolve); }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis not ready after 5s timeout')), 5000)
      ),
    ]);
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
  passOnStoreError: true,
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

