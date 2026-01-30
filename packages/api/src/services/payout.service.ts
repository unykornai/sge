/**
 * Payout Service
 * 
 * Handles payout batch creation, approval workflow, and execution.
 * Supports on-chain USDC payouts with 2-person approval control.
 */

import { prisma } from '../lib/db';
import { logger } from '../lib/logger';
import { payoutsQueue } from '../lib/queue';
import * as ledger from './ledger.service';
import { PayoutStatus, PayoutMethod, Prisma } from '../generated/prisma';

export interface CreatePayoutBatchInput {
  programId: string;
  period: string; // e.g., "2026-01-W4" or "2026-01"
  createdById: string;
  minAmount?: number;
}

export interface PayoutBatchResult {
  batchId: string;
  period: string;
  totalAmount: number;
  affiliateCount: number;
  payouts: Array<{
    affiliateId: string;
    amount: number;
  }>;
}

/**
 * Create a payout batch from payable commissions
 */
export async function createPayoutBatch(
  input: CreatePayoutBatchInput
): Promise<PayoutBatchResult | null> {
  const { programId, period, createdById, minAmount = 10 } = input;

  // Check for existing batch for this period
  const existingBatch = await prisma.payoutBatch.findUnique({
    where: {
      programId_period: { programId, period },
    },
  });

  if (existingBatch) {
    logger.warn({ programId, period }, 'Payout batch already exists for period');
    throw new Error(`Payout batch already exists for period ${period}`);
  }

  // Get all affiliates with payable commissions
  const payableByAffiliate = await prisma.commission.groupBy({
    by: ['affiliateId'],
    where: {
      programId,
      status: 'PAYABLE',
    },
    _sum: { amount: true },
    having: {
      amount: { _sum: { gte: minAmount } },
    },
  });

  if (payableByAffiliate.length === 0) {
    logger.info({ programId, period }, 'No affiliates with payable commissions');
    return null;
  }

  // Create batch and payouts in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Calculate totals
    const totalAmount = payableByAffiliate.reduce(
      (sum, a) => sum + Number(a._sum.amount || 0),
      0
    );

    // Create batch
    const batch = await tx.payoutBatch.create({
      data: {
        programId,
        period,
        totalAmount,
        affiliateCount: payableByAffiliate.length,
        status: 'PENDING',
        createdById,
      },
    });

    // Create individual payouts
    const payouts = await Promise.all(
      payableByAffiliate.map(async (a) => {
        const amount = Number(a._sum.amount || 0);
        
        // Get affiliate's wallet for destination
        const affiliate = await tx.affiliate.findUnique({
          where: { id: a.affiliateId },
          select: { wallet: true },
        });

        const payout = await tx.payout.create({
          data: {
            programId,
            affiliateId: a.affiliateId,
            batchId: batch.id,
            idempotencyKey: `payout:${programId}:${a.affiliateId}:${period}`,
            amount,
            method: 'ONCHAIN_USDC',
            destination: affiliate?.wallet || '',
            status: 'PENDING',
          },
        });

        return payout;
      })
    );

    return {
      batch,
      payouts,
    };
  });

  logger.info(
    { batchId: result.batch.id, totalAmount: result.batch.totalAmount, affiliateCount: result.batch.affiliateCount },
    'Payout batch created'
  );

  return {
    batchId: result.batch.id,
    period,
    totalAmount: Number(result.batch.totalAmount),
    affiliateCount: result.batch.affiliateCount,
    payouts: result.payouts.map((p) => ({
      affiliateId: p.affiliateId,
      amount: Number(p.amount),
    })),
  };
}

/**
 * Approve a payout batch (requires different approver than creator)
 */
export async function approvePayoutBatch(
  batchId: string,
  approvedById: string
): Promise<boolean> {
  const batch = await prisma.payoutBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    throw new Error('Payout batch not found');
  }

  if (batch.status !== 'PENDING') {
    throw new Error(`Batch is not pending (status: ${batch.status})`);
  }

  // Enforce 2-person control
  if (batch.createdById === approvedById) {
    throw new Error('Approver must be different from creator (2-person control)');
  }

  await prisma.payoutBatch.update({
    where: { id: batchId },
    data: {
      status: 'APPROVED',
      approvedById,
      approvedAt: new Date(),
    },
  });

  logger.info({ batchId, approvedById }, 'Payout batch approved');
  return true;
}

/**
 * Execute approved payout batch
 * Queues individual payouts for processing
 */
export async function executePayoutBatch(batchId: string): Promise<void> {
  const batch = await prisma.payoutBatch.findUnique({
    where: { id: batchId },
    include: {
      payouts: true,
    },
  });

  if (!batch) {
    throw new Error('Payout batch not found');
  }

  if (batch.status !== 'APPROVED') {
    throw new Error(`Batch is not approved (status: ${batch.status})`);
  }

  // Update batch status
  await prisma.payoutBatch.update({
    where: { id: batchId },
    data: { status: 'PROCESSING' },
  });

  // Queue each payout for processing
  for (const payout of batch.payouts) {
    await payoutsQueue.add(
      'execute-payout',
      { payoutId: payout.id },
      { jobId: payout.id }
    );
  }

  logger.info({ batchId, payoutCount: batch.payouts.length }, 'Payout batch execution started');
}

/**
 * Process a single payout (called by worker)
 */
export async function processPayout(payoutId: string): Promise<void> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: {
      affiliate: true,
      batch: true,
    },
  });

  if (!payout) {
    throw new Error('Payout not found');
  }

  if (payout.status !== 'PENDING') {
    logger.info({ payoutId, status: payout.status }, 'Payout not pending, skipping');
    return;
  }

  try {
    // TODO: Implement actual on-chain USDC transfer
    // For now, simulate the transfer
    const txHash = await executeOnChainPayout(
      payout.destination,
      Number(payout.amount),
      payout.method
    );

    // Update payout as completed
    await prisma.$transaction(async (tx) => {
      await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: 'COMPLETED',
          txHash,
          executedAt: new Date(),
        },
      });

      // Mark related commissions as paid
      await tx.commission.updateMany({
        where: {
          payoutId,
          status: 'PAYABLE',
        },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      // Update affiliate earnings
      await tx.affiliate.update({
        where: { id: payout.affiliateId },
        data: {
          totalEarnings: { increment: Number(payout.amount) },
          pendingEarnings: { decrement: Number(payout.amount) },
        },
      });

      // Record ledger entry
      await ledger.recordCommissionPayout(
        payout.programId,
        payout.affiliateId,
        payoutId,
        Number(payout.amount),
        `Payout ${payoutId} - ${txHash}`
      );
    });

    logger.info({ payoutId, txHash, amount: payout.amount }, 'Payout completed');
  } catch (error: any) {
    await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
      },
    });

    logger.error({ payoutId, error: error.message }, 'Payout failed');
    throw error;
  }
}

/**
 * Execute on-chain USDC transfer
 * TODO: Replace with actual implementation
 */
async function executeOnChainPayout(
  destination: string,
  amount: number,
  method: PayoutMethod
): Promise<string> {
  if (process.env.MOCK_MODE === 'true') {
    // Return mock tx hash
    return `0x${Buffer.from(`mock-payout-${Date.now()}`).toString('hex').slice(0, 64).padEnd(64, '0')}`;
  }

  // TODO: Implement actual USDC transfer using relayer
  // This would use viem/ethers to send USDC from treasury to destination
  throw new Error('On-chain payouts not yet implemented');
}

/**
 * Get payout batch details
 */
export async function getPayoutBatch(batchId: string) {
  return prisma.payoutBatch.findUnique({
    where: { id: batchId },
    include: {
      payouts: {
        include: {
          affiliate: {
            select: {
              id: true,
              wallet: true,
              displayName: true,
              referralCode: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get affiliate's payout history
 */
export async function getAffiliatePayouts(
  affiliateId: string,
  options: {
    status?: PayoutStatus;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, limit = 50, offset = 0 } = options;

  const where: Prisma.PayoutWhereInput = { affiliateId };
  if (status) where.status = status;

  const [payouts, total] = await Promise.all([
    prisma.payout.findMany({
      where,
      include: {
        batch: {
          select: {
            id: true,
            period: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.payout.count({ where }),
  ]);

  return { payouts, total };
}

/**
 * Get program payout summary
 */
export async function getProgramPayoutSummary(programId: string) {
  const [total, pending, completed, failed] = await Promise.all([
    prisma.payout.aggregate({
      where: { programId },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payout.aggregate({
      where: { programId, status: 'PENDING' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payout.aggregate({
      where: { programId, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payout.aggregate({
      where: { programId, status: 'FAILED' },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    total: { amount: Number(total._sum.amount || 0), count: total._count },
    pending: { amount: Number(pending._sum.amount || 0), count: pending._count },
    completed: { amount: Number(completed._sum.amount || 0), count: completed._count },
    failed: { amount: Number(failed._sum.amount || 0), count: failed._count },
  };
}

/**
 * Generate affiliate payout statement
 */
export async function generatePayoutStatement(
  affiliateId: string,
  startDate: Date,
  endDate: Date
) {
  const [affiliate, commissions, payouts] = await Promise.all([
    prisma.affiliate.findUnique({
      where: { id: affiliateId },
      include: { program: true },
    }),
    prisma.commission.findMany({
      where: {
        affiliateId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        settlement: {
          select: { txHash: true, amount: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.payout.findMany({
      where: {
        affiliateId,
        executedAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      orderBy: { executedAt: 'asc' },
    }),
  ]);

  if (!affiliate) return null;

  const totalEarned = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPaid = payouts.reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    affiliate: {
      id: affiliate.id,
      wallet: affiliate.wallet,
      referralCode: affiliate.referralCode,
      displayName: affiliate.displayName,
    },
    program: {
      id: affiliate.program.id,
      name: affiliate.program.name,
    },
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    summary: {
      totalEarned,
      totalPaid,
      balance: totalEarned - totalPaid,
    },
    commissions: commissions.map((c) => ({
      id: c.id,
      type: c.commissionType,
      amount: Number(c.amount),
      rate: Number(c.rate),
      baseAmount: Number(c.baseAmount),
      status: c.status,
      settlementTxHash: c.settlement?.txHash,
      createdAt: c.createdAt.toISOString(),
    })),
    payouts: payouts.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      txHash: p.txHash,
      executedAt: p.executedAt?.toISOString(),
    })),
    generatedAt: new Date().toISOString(),
  };
}
