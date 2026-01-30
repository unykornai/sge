/**
 * Payout Worker
 * 
 * Processes payout jobs from the queue.
 */

import { Job } from 'bullmq';
import { createWorker } from '../lib/queue';
import { logger } from '../lib/logger';
import { processPayout } from '../services/payout.service';

interface PayoutJobData {
  payoutId: string;
}

/**
 * Process a payout job
 */
async function processPayoutJob(job: Job<PayoutJobData>) {
  const { payoutId } = job.data;
  
  logger.info({ payoutId }, 'Processing payout');
  
  await processPayout(payoutId);
  
  return { success: true, payoutId };
}

/**
 * Start the payout worker
 */
export function startPayoutWorker(concurrency = 2) {
  // Lower concurrency for payouts (safety)
  const worker = createWorker<PayoutJobData>('payouts', processPayoutJob, concurrency);
  
  logger.info({ concurrency }, 'Payout worker started');
  
  return worker;
}
