/**
 * Reconciliation Service
 * 
 * Verifies on-chain/off-chain data consistency.
 * Runs nightly to catch any discrepancies.
 */

import { prisma } from '../lib/db';
import { logger } from '../lib/logger';
import { audit } from './audit.service';
import { verifyLedgerBalance } from './ledger.service';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ETH_RPC_HTTPS || 'https://eth.llamarpc.com'),
});

export interface ReconciliationResult {
  startedAt: Date;
  completedAt: Date;
  checks: {
    name: string;
    passed: boolean;
    details?: any;
  }[];
  mismatches: {
    type: string;
    entityId: string;
    expected: any;
    actual: any;
  }[];
}

/**
 * Run full reconciliation
 */
export async function runReconciliation(programId?: string): Promise<ReconciliationResult> {
  const startedAt = new Date();
  const checks: ReconciliationResult['checks'] = [];
  const mismatches: ReconciliationResult['mismatches'] = [];

  logger.info({ programId }, 'Starting reconciliation run');

  // 1. Verify ledger balance
  const ledgerCheck = await verifyLedgerBalance(programId);
  checks.push({
    name: 'ledger_balance',
    passed: ledgerCheck.isBalanced,
    details: { balance: ledgerCheck.balance },
  });

  if (!ledgerCheck.isBalanced) {
    mismatches.push({
      type: 'LEDGER_IMBALANCE',
      entityId: programId || 'all',
      expected: 0,
      actual: ledgerCheck.balance,
    });
  }

  // 2. Verify confirmed settlements have valid tx receipts
  const unverifiedSettlements = await prisma.settlement.findMany({
    where: {
      status: 'CONFIRMED',
      verified: false,
      ...(programId && { programId }),
    },
    take: 100,
  });

  for (const settlement of unverifiedSettlements) {
    try {
      const receipt = await publicClient.getTransactionReceipt({
        hash: settlement.txHash as `0x${string}`,
      });

      if (receipt.status === 'success') {
        await prisma.settlement.update({
          where: { id: settlement.id },
          data: { verified: true, verifiedAt: new Date() },
        });
      } else {
        mismatches.push({
          type: 'SETTLEMENT_TX_FAILED',
          entityId: settlement.id,
          expected: 'success',
          actual: receipt.status,
        });
      }
    } catch (error: any) {
      // TX not found or RPC error
      mismatches.push({
        type: 'SETTLEMENT_TX_NOT_FOUND',
        entityId: settlement.id,
        expected: 'valid receipt',
        actual: error.message,
      });
    }
  }

  checks.push({
    name: 'settlement_verification',
    passed: mismatches.filter((m) => m.type.startsWith('SETTLEMENT_')).length === 0,
    details: { checked: unverifiedSettlements.length },
  });

  // 3. Verify commission totals match settlement revenue
  if (programId) {
    const [totalSettlements, totalCommissions] = await Promise.all([
      prisma.settlement.aggregate({
        where: { programId, status: 'CONFIRMED' },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        where: { programId },
        _sum: { amount: true },
      }),
    ]);

    const program = await prisma.program.findUnique({
      where: { id: programId },
    });

    if (program) {
      const expectedCommissions =
        Number(totalSettlements._sum.amount || 0) *
        (Number(program.directCommissionPct) + Number(program.overrideCommissionPct)) /
        100;

      const actualCommissions = Number(totalCommissions._sum.amount || 0);
      const variance = Math.abs(expectedCommissions - actualCommissions);

      if (variance > 0.01) {
        mismatches.push({
          type: 'COMMISSION_TOTAL_VARIANCE',
          entityId: programId,
          expected: expectedCommissions,
          actual: actualCommissions,
        });
      }

      checks.push({
        name: 'commission_totals',
        passed: variance <= 0.01,
        details: { expected: expectedCommissions, actual: actualCommissions, variance },
      });
    }
  }

  // 4. Verify payout totals match paid commissions
  const [paidPayouts, paidCommissions] = await Promise.all([
    prisma.payout.aggregate({
      where: { status: 'COMPLETED', ...(programId && { programId }) },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { status: 'PAID', ...(programId && { programId }) },
      _sum: { amount: true },
    }),
  ]);

  const payoutTotal = Number(paidPayouts._sum.amount || 0);
  const commissionTotal = Number(paidCommissions._sum.amount || 0);
  const payoutVariance = Math.abs(payoutTotal - commissionTotal);

  if (payoutVariance > 0.01) {
    mismatches.push({
      type: 'PAYOUT_COMMISSION_MISMATCH',
      entityId: programId || 'all',
      expected: commissionTotal,
      actual: payoutTotal,
    });
  }

  checks.push({
    name: 'payout_commission_match',
    passed: payoutVariance <= 0.01,
    details: { payouts: payoutTotal, commissions: commissionTotal },
  });

  // 5. Check for stuck intents
  const stuckIntents = await prisma.intent.count({
    where: {
      status: 'PROCESSING',
      updatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) }, // Stuck for 30+ minutes
      ...(programId && { programId }),
    },
  });

  checks.push({
    name: 'stuck_intents',
    passed: stuckIntents === 0,
    details: { count: stuckIntents },
  });

  if (stuckIntents > 0) {
    mismatches.push({
      type: 'STUCK_INTENTS',
      entityId: programId || 'all',
      expected: 0,
      actual: stuckIntents,
    });
  }

  const completedAt = new Date();
  const result: ReconciliationResult = {
    startedAt,
    completedAt,
    checks,
    mismatches,
  };

  // Log audit entry
  await audit.log({
    programId,
    action: mismatches.length > 0 ? 'RECONCILIATION_MISMATCH' : 'RECONCILIATION_RUN',
    actorType: 'SYSTEM',
    metadata: {
      duration: completedAt.getTime() - startedAt.getTime(),
      checksCount: checks.length,
      mismatchesCount: mismatches.length,
    },
  });

  logger.info(
    { programId, duration: completedAt.getTime() - startedAt.getTime(), mismatches: mismatches.length },
    'Reconciliation completed'
  );

  return result;
}

/**
 * Fix stuck intents by resetting them
 */
export async function resetStuckIntents(programId?: string): Promise<number> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const result = await prisma.intent.updateMany({
    where: {
      status: 'PROCESSING',
      updatedAt: { lt: thirtyMinutesAgo },
      ...(programId && { programId }),
    },
    data: {
      status: 'PENDING',
      lockedBy: null,
      lockedUntil: null,
    },
  });

  if (result.count > 0) {
    logger.warn({ count: result.count }, 'Reset stuck intents');
  }

  return result.count;
}

/**
 * Get reconciliation summary for dashboard
 */
export async function getReconciliationSummary(programId?: string) {
  const [
    pendingIntents,
    processingIntents,
    failedIntents,
    unverifiedSettlements,
    pendingPayouts,
  ] = await Promise.all([
    prisma.intent.count({
      where: { status: 'PENDING', ...(programId && { programId }) },
    }),
    prisma.intent.count({
      where: { status: 'PROCESSING', ...(programId && { programId }) },
    }),
    prisma.intent.count({
      where: { status: 'FAILED', ...(programId && { programId }) },
    }),
    prisma.settlement.count({
      where: { verified: false, status: 'CONFIRMED', ...(programId && { programId }) },
    }),
    prisma.payout.count({
      where: { status: 'PENDING', ...(programId && { programId }) },
    }),
  ]);

  return {
    intents: {
      pending: pendingIntents,
      processing: processingIntents,
      failed: failedIntents,
    },
    settlements: {
      unverified: unverifiedSettlements,
    },
    payouts: {
      pending: pendingPayouts,
    },
  };
}
