/**
 * Reconciler Worker
 * 
 * Runs periodic reconciliation and cleanup jobs.
 */

import { Job } from 'bullmq';
import { createWorker, reconcilerQueue, scheduleRecurring } from '../lib/queue';
import { logger } from '../lib/logger';
import { runReconciliation, resetStuckIntents } from '../services/reconciliation.service';
import { getRetryableIntents } from '../services/intent.service';
import { intentsQueue } from '../lib/queue';

interface ReconcilerJobData {
  type: 'full' | 'stuck-intents' | 'retry-intents';
  programId?: string;
}

/**
 * Process a reconciliation job
 */
async function processReconcilerJob(job: Job<ReconcilerJobData>) {
  const { type, programId } = job.data;
  
  switch (type) {
    case 'full':
      logger.info({ programId }, 'Running full reconciliation');
      const result = await runReconciliation(programId);
      return {
        checksCount: result.checks.length,
        mismatchesCount: result.mismatches.length,
        mismatches: result.mismatches,
      };
    
    case 'stuck-intents':
      logger.info('Resetting stuck intents');
      const resetCount = await resetStuckIntents(programId);
      return { resetCount };
    
    case 'retry-intents':
      logger.info('Re-queuing retryable intents');
      const retryable = await getRetryableIntents(100);
      for (const intent of retryable) {
        await intentsQueue.add(
          intent.type,
          { intentId: intent.id },
          { jobId: `retry-${intent.id}-${Date.now()}` }
        );
      }
      return { requeuedCount: retryable.length };
    
    default:
      throw new Error(`Unknown reconciler job type: ${type}`);
  }
}

/**
 * Start the reconciler worker and schedule recurring jobs
 */
export async function startReconcilerWorker() {
  const worker = createWorker<ReconcilerJobData>('reconciler', processReconcilerJob, 1);
  
  // Schedule nightly full reconciliation (2 AM)
  await scheduleRecurring(
    reconcilerQueue,
    'nightly-reconciliation',
    { type: 'full' },
    '0 2 * * *'
  );
  
  // Reset stuck intents every 15 minutes
  await scheduleRecurring(
    reconcilerQueue,
    'reset-stuck-intents',
    { type: 'stuck-intents' },
    '*/15 * * * *'
  );
  
  // Retry failed intents every 5 minutes
  await scheduleRecurring(
    reconcilerQueue,
    'retry-intents',
    { type: 'retry-intents' },
    '*/5 * * * *'
  );
  
  logger.info('Reconciler worker started with scheduled jobs');
  
  return worker;
}
