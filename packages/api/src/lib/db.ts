/**
 * Database Client (Prisma or Mock)
 * 
 * - REAL MODE: Uses Prisma with PostgreSQL via driver adapters
 * - MOCK MODE: Uses in-memory storage for development/demo
 * 
 * Supports graceful shutdown.
 * Uses driver adapters for Prisma 7+.
 */

import { logger } from './logger';
import { mockPrisma, seedMockData } from './mock-db';

// Check if we should use mock mode
// MOCK_MODE=true OR no DATABASE_URL = use mock
const useMockDb = process.env.MOCK_MODE === 'true' && !process.env.DATABASE_URL?.includes('@');

// Type that works for both real and mock Prisma
type PrismaLike = typeof mockPrisma | import('../generated/prisma').PrismaClient;

let prismaInstance: PrismaLike;
let poolInstance: any;

if (useMockDb) {
  // Use mock database
  logger.info('Using MOCK database (in-memory)');
  prismaInstance = mockPrisma;
} else {
  // Use real Prisma with PostgreSQL
  const { Pool } = require('pg');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../generated/prisma');
  
  // Global singleton for hot-reloading in development
  const globalForPrisma = globalThis as unknown as {
    prisma: any;
    pool: any;
  };

  // Create PostgreSQL connection pool
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sge_dev';
  poolInstance = globalForPrisma.pool ?? new Pool({ connectionString });

  // Create Prisma adapter
  const adapter = new PrismaPg(poolInstance);

  prismaInstance =
    globalForPrisma.prisma ??
    new PrismaClient({
      adapter,
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance;
    globalForPrisma.pool = poolInstance;
  }

  // Log slow queries in development
  if (process.env.NODE_ENV !== 'production') {
    (prismaInstance as any).$on?.('query', (e: any) => {
      if (e.duration > 100) {
        logger.warn({ duration: e.duration, query: e.query }, 'Slow query detected');
      }
    });
  }
}

export const prisma = prismaInstance;

/**
 * Connect to database
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    if (useMockDb) {
      await seedMockData();
    }
    logger.info('Database connected');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to database');
    throw error;
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

export const isMockDb = useMockDb;
export default prisma;
