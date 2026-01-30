/**
 * Job Queue Infrastructure (BullMQ or Mock)
 * 
 * - REAL MODE: Uses BullMQ with Redis
 * - MOCK MODE: Uses in-memory queues for development/demo
 * 
 * Queues for intent processing, settlements, payouts, and reconciliation.
 * Supports retries with exponential backoff.
 */

import { redis, isMockRedis } from './redis';
import { logger } from './logger';
import type { Queue } from 'bullmq';
import { MockQueue, MockWorker } from './mock-queue';

// Queue names
export const QUEUE_NAMES = {
  INTENTS: 'intents',
  SETTLEMENTS: 'settlements',
  PAYOUTS: 'payouts',
  RECONCILER: 'reconciler',
  NOTIFICATIONS: 'notifications',
} as const;

// Default job options (Phase 2: Hardened for production)
const DEFAULT_JOB_OPTIONS = {
  attempts: 8, // Increased from 5 for better reliability
  backoff: {
    type: 'exponential' as const,
    delay: 2000, // 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s
  },
  removeOnComplete: { count: 5000 }, // Keep more completed for analysis
  removeOnFail: { count: 5000 },
};

// Type for queue (works with both real and mock)
type QueueLike = any;
type WorkerLike = any;
type JobLike = any;

// Create queues - real or mock based on mode
let intentsQueue: QueueLike;
let settlementsQueue: QueueLike;
let payoutsQueue: QueueLike;
let reconcilerQueue: QueueLike;
let notificationsQueue: QueueLike;

if (isMockRedis) {
  // Use mock queues
  intentsQueue = new MockQueue(QUEUE_NAMES.INTENTS);
  settlementsQueue = new MockQueue(QUEUE_NAMES.SETTLEMENTS);
  payoutsQueue = new MockQueue(QUEUE_NAMES.PAYOUTS);
  reconcilerQueue = new MockQueue(QUEUE_NAMES.RECONCILER);
  notificationsQueue = new MockQueue(QUEUE_NAMES.NOTIFICATIONS);
} else {
  // Use real BullMQ queues
  const { Queue } = require('bullmq');
  
  intentsQueue = new Queue(QUEUE_NAMES.INTENTS, {
    connection: redis,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  settlementsQueue = new Queue(QUEUE_NAMES.SETTLEMENTS, {
    connection: redis,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  payoutsQueue = new Queue(QUEUE_NAMES.PAYOUTS, {
    connection: redis,
    defaultJobOptions: {
      ...DEFAULT_JOB_OPTIONS,
      attempts: 3, // Fewer retries for payouts (safety)
    },
  });

  reconcilerQueue = new Queue(QUEUE_NAMES.RECONCILER, {
    connection: redis,
    defaultJobOptions: {
      ...DEFAULT_JOB_OPTIONS,
      attempts: 1, // Reconciliation jobs don't retry
    },
  });

  notificationsQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
    connection: redis,
    defaultJobOptions: {
      ...DEFAULT_JOB_OPTIONS,
      attempts: 3,
    },
  });
}

export { intentsQueue, settlementsQueue, payoutsQueue, reconcilerQueue, notificationsQueue };

// Track all workers for graceful shutdown
const workers: WorkerLike[] = [];

/**
 * Create a worker for a queue
 */
export function createWorker<T>(
  queueName: string,
  processor: (job: JobLike) => Promise<any>,
  concurrency = 5
): WorkerLike {
  if (isMockRedis) {
    // Use mock worker
    const worker = new MockWorker(queueName, processor);
    workers.push(worker);
    return worker;
  }

  // Use real BullMQ worker
  const { Worker } = require('bullmq');
  
  const worker = new Worker(
    queueName,
    async (job: any) => {
      const jobLogger = logger.child({
        queue: queueName,
        jobId: job.id,
        jobName: job.name,
        attempt: job.attemptsMade + 1,
      });

      jobLogger.info('Processing job');
      const start = Date.now();

      try {
        const result = await processor(job);
        jobLogger.info({ duration: Date.now() - start }, 'Job completed');
        return result;
      } catch (error: any) {
        jobLogger.error({ error: error.message, duration: Date.now() - start }, 'Job failed');
        throw error;
      }
    },
    {
      connection: redis,
      concurrency,
    }
  );

  worker.on('failed', (job: any, error: any) => {
    logger.error(
      { queue: queueName, jobId: job?.id, error: error.message },
      'Job permanently failed'
    );
  });

  workers.push(worker);
  return worker;
}

/**
 * Schedule a recurring job
 */
export async function scheduleRecurring(
  queue: Queue,
  name: string,
  data: any,
  pattern: string // cron pattern
): Promise<void> {
  await queue.upsertJobScheduler(
    name,
    { pattern },
    { name, data }
  );
  logger.info({ queue: queue.name, name, pattern }, 'Scheduled recurring job');
}

/**
 * Gracefully shutdown all workers
 */
export async function shutdownQueues(): Promise<void> {
  logger.info('Shutting down job queues...');
  
  // Close all workers
  await Promise.all(workers.map((w) => w.close()));
  
  // Close all queues
  await Promise.all([
    intentsQueue.close(),
    settlementsQueue.close(),
    payoutsQueue.close(),
    reconcilerQueue.close(),
    notificationsQueue.close(),
  ]);

  logger.info('Job queues shutdown complete');
}

/**
 * Get queue health stats
 */
export async function getQueueStats() {
  const [intents, settlements, payouts, reconciler] = await Promise.all([
    intentsQueue.getJobCounts(),
    settlementsQueue.getJobCounts(),
    payoutsQueue.getJobCounts(),
    reconcilerQueue.getJobCounts(),
  ]);

  return {
    intents,
    settlements,
    payouts,
    reconciler,
  };
}
