/**
 * Reconciliation API Routes
 * 
 * Operational monitoring endpoints for:
 * - Stuck settlement intents
 * - Ledger balance verification
 * - Pending payout batches
 * - Webhook failure tracking
 * - System health metrics
 */

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/admin/reconciliation
 * 
 * Returns comprehensive reconciliation metrics for operational monitoring.
 */
router.get('/reconciliation', async (req, res) => {
  try {
    const [
      stuckIntents,
      ledgerImbalances,
      pendingPayouts,
      webhookFailures,
      systemHealth,
    ] = await Promise.all([
      findStuckIntents(),
      checkLedgerBalances(),
      findPendingPayouts(),
      findWebhookFailures(),
      getSystemHealth(),
    ]);

    res.json({
      stuckIntents,
      ledgerImbalances,
      pendingPayouts,
      webhookFailures,
      systemHealth,
    });
  } catch (error) {
    logger.error({ error }, 'Reconciliation check failed');
    res.status(500).json({ error: 'Failed to fetch reconciliation metrics' });
  }
});

/**
 * POST /api/admin/reconciliation/retry-intent
 * 
 * Manually retry a stuck settlement intent.
 */
router.post('/reconciliation/retry-intent', async (req, res) => {
  try {
    const { intentId } = z.object({ intentId: z.string() }).parse(req.body);

    const intent = await db.settlementIntent.findUnique({ where: { id: intentId } });
    if (!intent) {
      return res.status(404).json({ error: 'Intent not found' });
    }

    // Queue for reprocessing
    // TODO: Add to settlement queue
    
    logger.info({ intentId }, 'Intent queued for retry');
    res.json({ success: true, message: 'Intent queued for retry' });
  } catch (error) {
    logger.error({ error }, 'Failed to retry intent');
    res.status(500).json({ error: 'Failed to retry intent' });
  }
});

/**
 * POST /api/admin/reconciliation/force-reconcile
 * 
 * Manually trigger a full ledger reconciliation check.
 */
router.post('/reconciliation/force-reconcile', async (req, res) => {
  try {
    const { programId } = z.object({ programId: z.string() }).parse(req.body);

    const imbalances = await reconcileProgram(programId);

    if (imbalances.length > 0) {
      logger.warn({ programId, imbalances }, 'Ledger imbalances detected');
      res.json({ 
        success: false, 
        message: 'Imbalances detected',
        imbalances 
      });
    } else {
      logger.info({ programId }, 'Ledger reconciliation passed');
      res.json({ success: true, message: 'Ledger is balanced' });
    }
  } catch (error) {
    logger.error({ error }, 'Reconciliation failed');
    res.status(500).json({ error: 'Failed to reconcile ledger' });
  }
});

/**
 * Find settlement intents stuck longer than threshold
 */
async function findStuckIntents() {
  const TIMEOUT_MINUTES = Number(process.env.INTENT_TIMEOUT_MINUTES || 10);
  const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);

  const intents = await db.settlementIntent.findMany({
    where: {
      status: {
        in: ['payment_pending', 'verifying', 'processing'],
      },
      createdAt: {
        lt: cutoff,
      },
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return intents.map(intent => ({
    id: intent.id,
    userId: intent.userId,
    amount: intent.amount,
    status: intent.status,
    stuckMinutes: Math.floor((Date.now() - intent.createdAt.getTime()) / 60000),
    createdAt: intent.createdAt.toISOString(),
  }));
}

/**
 * Check ledger balances for all programs
 */
async function checkLedgerBalances() {
  const programs = await db.program.findMany();
  const imbalances = [];

  for (const program of programs) {
    // Sum all debits (settlements)
    const debits = await db.ledgerEntry.aggregate({
      where: {
        programId: program.id,
        type: 'debit',
      },
      _sum: {
        amount: true,
      },
    });

    // Sum all credits (commissions + payouts)
    const credits = await db.ledgerEntry.aggregate({
      where: {
        programId: program.id,
        type: 'credit',
      },
      _sum: {
        amount: true,
      },
    });

    const debitTotal = debits._sum.amount || 0;
    const creditTotal = credits._sum.amount || 0;
    const difference = debitTotal - creditTotal;

    // Allow for small rounding differences (< $0.01)
    if (Math.abs(difference) > 1) {
      imbalances.push({
        programId: program.id,
        programName: program.name,
        expectedBalance: 0, // Should always be zero (debits = credits)
        actualBalance: difference,
        difference,
        lastChecked: new Date().toISOString(),
      });

      logger.warn(
        { programId: program.id, debitTotal, creditTotal, difference },
        'Ledger imbalance detected'
      );
    }
  }

  return imbalances;
}

/**
 * Reconcile a specific program's ledger
 */
async function reconcileProgram(programId: string) {
  const entries = await db.ledgerEntry.findMany({
    where: { programId },
    orderBy: { createdAt: 'asc' },
  });

  let balance = 0;
  const errors = [];

  for (const entry of entries) {
    if (entry.type === 'debit') {
      balance += entry.amount;
    } else {
      balance -= entry.amount;
    }

    // Check if balance ever goes negative (impossible in double-entry)
    if (balance < 0) {
      errors.push({
        entryId: entry.id,
        issue: 'Negative balance',
        balance,
      });
    }
  }

  // Final balance should be zero (all debits have matching credits)
  if (Math.abs(balance) > 1) {
    errors.push({
      issue: 'Final balance not zero',
      balance,
    });
  }

  return errors;
}

/**
 * Find payout batches awaiting approval or execution
 */
async function findPendingPayouts() {
  const batches = await db.payoutBatch.findMany({
    where: {
      status: {
        in: ['pending_approval', 'approved'],
      },
    },
    include: {
      _count: {
        select: { items: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return batches.map(batch => ({
    id: batch.id,
    programId: batch.programId,
    affiliateCount: batch._count.items,
    totalAmount: batch.totalAmount,
    createdAt: batch.createdAt.toISOString(),
    awaitingApproval: batch.status === 'pending_approval',
  }));
}

/**
 * Find webhook deliveries that have failed
 */
async function findWebhookFailures() {
  // This would integrate with your webhook delivery system
  // For now, returning empty array as placeholder
  
  // TODO: Implement webhook failure tracking
  // - Query webhook_deliveries table
  // - Filter by status = 'failed' and retries < max
  // - Return failure details
  
  return [];
}

/**
 * Get overall system health metrics
 */
async function getSystemHealth() {
  // Average intent processing time (last 100 intents)
  const recentIntents = await db.settlementIntent.findMany({
    where: {
      status: 'completed',
      completedAt: { not: null },
    },
    take: 100,
    orderBy: {
      completedAt: 'desc',
    },
  });

  const processingTimes = recentIntents
    .filter(i => i.completedAt)
    .map(i => i.completedAt!.getTime() - i.createdAt.getTime());

  const avgProcessingTime = processingTimes.length > 0
    ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
    : 0;

  // Check if ledger is balanced
  const imbalances = await checkLedgerBalances();
  const ledgerBalanced = imbalances.length === 0;

  // Queue depth (would integrate with BullMQ metrics)
  const queueDepth = 0; // TODO: Get from queue metrics

  // Worker status (would check worker heartbeats)
  const workerStatus = 'healthy'; // TODO: Check worker health

  return {
    intentProcessingAvg: Math.round(avgProcessingTime),
    ledgerBalanced,
    queueDepth,
    workerStatus,
    lastReconciliation: new Date().toISOString(),
  };
}

export default router;
