/**
 * Worker Entry Point
 * 
 * Starts all workers when run as a separate process.
 * Can also be imported to start workers in-process.
 * 
 * IMPORTANT: Workers must NOT run in MOCK_MODE.
 * In mock mode, the queue processes jobs inline (in-memory).
 */

import { env } from '../env';
import { logger } from '../lib/logger';
import { scheduleRecurring, reconcilerQueue, intentsQueue } from '../lib/queue';
import { startIntentWorker } from './intent.worker';
import { startPayoutWorker } from './payout.worker';
import { startReconcilerWorker } from './reconciler.worker';

const workers: any[] = [];

/**
 * Start all workers
 * 
 * Belt + suspenders + steel-toe-boots: hard exit if MOCK_MODE=true
 */
export async function startWorkers() {
  // Runtime guard: prevent workers in mock mode
  if (env.MOCK_MODE) {
    logger.info('[workers] MOCK_MODE=true -> workers disabled (mock queue processes inline)');
    process.exit(0); // Hard kill switch - prevents zombie terminal processes
  }
  
  logger.info('Starting all workers...');
  
  workers.push(startIntentWorker(5));
  workers.push(startPayoutWorker(2));
  workers.push(await startReconcilerWorker());
  
  logger.info({ workerCount: workers.length }, 'All workers started');
}

/**
 * Schedule recurring jobs (called after workers start)
 */
export async function scheduleRecurringJobs() {
  logger.info('Scheduling recurring jobs...');
  
  // Schedule nightly reconciliation at 2 AM
  await scheduleRecurring(
    reconcilerQueue,
    'nightly-reconciliation',
    { action: 'FULL_RECONCILE' },
    '0 2 * * *' // 2 AM daily
  );
  
  // Schedule stuck intent cleanup every 15 minutes
  await scheduleRecurring(
    reconcilerQueue,
    'stuck-intent-reset',
    { action: 'RESET_STUCK_INTENTS' },
    '*/15 * * * *'
  );
  
  // Schedule intent retry every 5 minutes
  await scheduleRecurring(
    intentsQueue,
    'retry-failed-intents',
    { action: 'RETRY_FAILED' },
    '*/5 * * * *'
  );
  
  logger.info('Recurring jobs scheduled');
}

/**
 * Stop all workers gracefully
 */
export async function stopWorkers() {
  logger.info('Stopping all workers...');
  
  await Promise.all(workers.map((w) => w.close()));
  
  logger.info('All workers stopped');
}

// Run as standalone process
if (require.main === module) {
  (async () => {
    try {
      await startWorkers();
      await scheduleRecurringJobs();
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to start workers');
      process.exit(1);
    }
  })();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await stopWorkers();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await stopWorkers();
    process.exit(0);
  });
}
