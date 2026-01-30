/**
 * Redis Client (Real or Mock)
 * 
 * Provides Redis connection for caching, rate limiting, and queue backing.
 * - REAL MODE: Uses ioredis for real Redis connection
 * - MOCK MODE: Uses in-memory Map for development/demo
 * Supports graceful shutdown.
 */

import { logger } from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const useMockRedis = process.env.MOCK_MODE === 'true' && !process.env.REDIS_URL?.includes('@');

// In-memory cache for mock mode
const mockStore = new Map<string, { value: string; expiresAt?: number }>();

// Mock Redis client
const mockRedis = {
  get: async (key: string): Promise<string | null> => {
    const item = mockStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      mockStore.delete(key);
      return null;
    }
    return item.value;
  },
  set: async (key: string, value: string): Promise<'OK'> => {
    mockStore.set(key, { value });
    return 'OK';
  },
  setex: async (key: string, ttl: number, value: string): Promise<'OK'> => {
    mockStore.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
    return 'OK';
  },
  incr: async (key: string): Promise<number> => {
    const item = mockStore.get(key);
    const current = item ? parseInt(item.value, 10) : 0;
    const next = current + 1;
    mockStore.set(key, { value: String(next), expiresAt: item?.expiresAt });
    return next;
  },
  expire: async (_key: string, _ttl: number): Promise<number> => 1,
  del: async (key: string): Promise<number> => {
    return mockStore.delete(key) ? 1 : 0;
  },
  ping: async (): Promise<'PONG'> => 'PONG',
  quit: async (): Promise<'OK'> => 'OK',
  on: (_event: string, _handler: any) => mockRedis,
  duplicate: () => mockRedis,
};

let redisInstance: any;

if (useMockRedis) {
  logger.info('Using MOCK Redis (in-memory)');
  redisInstance = mockRedis;
} else {
  const Redis = require('ioredis').default;
  
  redisInstance = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      if (times > 10) {
        logger.error('Redis connection failed after 10 retries');
        return null; // Stop retrying
      }
      return Math.min(times * 100, 3000);
    },
  });

  redisInstance.on('connect', () => {
    logger.info('Redis connected');
  });

  redisInstance.on('error', (err: any) => {
    logger.error({ error: err.message }, 'Redis error');
  });

  redisInstance.on('close', () => {
    logger.info('Redis connection closed');
  });
}

export const redis = redisInstance;
export const isMockRedis = useMockRedis;

/**
 * Gracefully disconnect Redis
 */
export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Cache helper - get or set with TTL
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  factory: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  const value = await factory();
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
  return value;
}

/**
 * Rate limiting helper
 * Returns remaining requests and reset time
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / (windowSeconds * 1000))}`;
  
  const current = await redis.incr(windowKey);
  if (current === 1) {
    await redis.expire(windowKey, windowSeconds);
  }

  const remaining = Math.max(0, limit - current);
  const resetAt = Math.ceil(now / (windowSeconds * 1000)) * windowSeconds * 1000;

  return {
    allowed: current <= limit,
    remaining,
    resetAt,
  };
}

export default redis;
