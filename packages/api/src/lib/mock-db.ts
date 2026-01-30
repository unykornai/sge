/**
 * Mock Database Client
 * 
 * In-memory storage for MOCK_MODE when no database is available.
 * Implements a subset of Prisma client methods for demo/development.
 */

import { logger } from './logger';

// In-memory storage
const storage = {
  programs: new Map<string, any>(),
  affiliates: new Map<string, any>(),
  users: new Map<string, any>(),
  intents: new Map<string, any>(),
  settlements: new Map<string, any>(),
  ledgerEntries: new Map<string, any>(),
  commissions: new Map<string, any>(),
  payoutBatches: new Map<string, any>(),
  payoutItems: new Map<string, any>(),
  auditLogs: new Map<string, any>(),
};

// Counter for auto-increment IDs
let idCounter = 1;
const nextId = () => String(idCounter++);

// Helper to create mock model
function createMockModel<T>(storeName: keyof typeof storage) {
  const store = storage[storeName] as Map<string, T>;
  
  return {
    findUnique: async ({ where }: { where: any }): Promise<T | null> => {
      const key = where.id || where.wallet || where.idempotencyKey || Object.values(where)[0];
      return store.get(String(key)) || null;
    },
    findFirst: async ({ where }: { where?: any } = {}): Promise<T | null> => {
      if (!where) return store.values().next().value || null;
      for (const item of store.values()) {
        let matches = true;
        for (const [key, value] of Object.entries(where)) {
          if ((item as any)[key] !== value) matches = false;
        }
        if (matches) return item;
      }
      return null;
    },
    findMany: async ({ where, take, skip, orderBy }: any = {}): Promise<T[]> => {
      let items = Array.from(store.values());
      if (where) {
        items = items.filter((item: any) => {
          for (const [key, value] of Object.entries(where)) {
            if (typeof value === 'object' && value !== null) {
              // Handle operators like { gte, lte, in, etc }
              continue;
            }
            if (item[key] !== value) return false;
          }
          return true;
        });
      }
      if (skip) items = items.slice(skip);
      if (take) items = items.slice(0, take);
      return items;
    },
    create: async ({ data }: { data: any }): Promise<T> => {
      const id = data.id || nextId();
      const item = { 
        ...data, 
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.set(id, item as T);
      return item as T;
    },
    update: async ({ where, data }: { where: any; data: any }): Promise<T> => {
      const key = where.id || Object.values(where)[0];
      const existing = store.get(String(key));
      if (!existing) throw new Error(`Record not found: ${key}`);
      const updated = { ...existing, ...data, updatedAt: new Date() };
      store.set(String(key), updated);
      return updated;
    },
    upsert: async ({ where, create, update: updateData }: any): Promise<T> => {
      const key = where.id || Object.values(where)[0];
      const existing = store.get(String(key));
      if (existing) {
        const updated = { ...existing, ...updateData, updatedAt: new Date() };
        store.set(String(key), updated);
        return updated;
      }
      const item = { 
        ...create, 
        id: key || nextId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.set(item.id, item as T);
      return item as T;
    },
    delete: async ({ where }: { where: any }): Promise<T> => {
      const key = where.id || Object.values(where)[0];
      const item = store.get(String(key));
      if (!item) throw new Error(`Record not found: ${key}`);
      store.delete(String(key));
      return item;
    },
    count: async ({ where }: any = {}): Promise<number> => {
      if (!where) return store.size;
      let count = 0;
      for (const item of store.values()) {
        let matches = true;
        for (const [key, value] of Object.entries(where)) {
          if ((item as any)[key] !== value) matches = false;
        }
        if (matches) count++;
      }
      return count;
    },
    aggregate: async (_args: any): Promise<any> => {
      return { _sum: { amount: 0 }, _count: { _all: store.size } };
    },
  };
}

// Mock Prisma client
export const mockPrisma = {
  program: createMockModel<any>('programs'),
  affiliate: createMockModel<any>('affiliates'),
  user: createMockModel<any>('users'),
  intent: createMockModel<any>('intents'),
  settlement: createMockModel<any>('settlements'),
  ledgerEntry: createMockModel<any>('ledgerEntries'),
  commission: createMockModel<any>('commissions'),
  payoutBatch: createMockModel<any>('payoutBatches'),
  payoutItem: createMockModel<any>('payoutItems'),
  auditLog: createMockModel<any>('auditLogs'),
  
  $connect: async () => {
    logger.info('Mock database connected (in-memory)');
  },
  $disconnect: async () => {
    logger.info('Mock database disconnected');
  },
  $transaction: async (operations: any[]) => {
    // Execute all operations in sequence
    const results: any[] = [];
    for (const op of operations) {
      if (typeof op === 'function') {
        results.push(await op(mockPrisma));
      } else {
        results.push(await op);
      }
    }
    return results;
  },
  $on: (_event: string, _callback: any) => {
    // No-op for mock
  },
};

// Seed some demo data
export async function seedMockData() {
  logger.info('Seeding mock data...');
  
  // Create demo program
  await mockPrisma.program.create({
    data: {
      id: 'demo-program',
      name: 'SGE Demo Program',
      description: 'Demo affiliate program',
      isActive: true,
      directCommissionBps: 1000,
      overrideCommissionBps: 300,
      maxTierDepth: 5,
    },
  });
  
  // Create demo affiliate
  await mockPrisma.affiliate.create({
    data: {
      id: 'demo-affiliate',
      wallet: '0xDemoAffiliate0000000000000000000000000001',
      programId: 'demo-program',
      referralCode: 'DEMO2024',
      tier: 1,
      isActive: true,
    },
  });
  
  logger.info('Mock data seeded');
}

export type MockPrismaClient = typeof mockPrisma;
