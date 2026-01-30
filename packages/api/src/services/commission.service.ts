/**
 * Commission Engine
 * 
 * Calculates and accrues commissions on confirmed settlements.
 * Supports 2-level commissions (direct + parent override).
 */

import { prisma } from '../lib/db';
import { logger } from '../lib/logger';
import * as ledger from './ledger.service';
import { CommissionStatus, Prisma } from '../generated/prisma';

export interface CommissionCalculation {
  affiliateId: string;
  type: 'DIRECT' | 'OVERRIDE';
  rate: number;
  baseAmount: number;
  amount: number;
}

/**
 * Calculate commissions for a settlement
 */
export function calculateCommissions(
  baseAmount: number,
  directAffiliateId: string | null,
  parentAffiliateId: string | null,
  directRate: number,
  overrideRate: number
): CommissionCalculation[] {
  const commissions: CommissionCalculation[] = [];

  // Direct commission (to referring affiliate)
  if (directAffiliateId) {
    commissions.push({
      affiliateId: directAffiliateId,
      type: 'DIRECT',
      rate: directRate,
      baseAmount,
      amount: Math.round(baseAmount * directRate) / 100,
    });
  }

  // Override commission (to parent affiliate)
  if (parentAffiliateId && directAffiliateId) {
    commissions.push({
      affiliateId: parentAffiliateId,
      type: 'OVERRIDE',
      rate: overrideRate,
      baseAmount,
      amount: Math.round(baseAmount * overrideRate) / 100,
    });
  }

  return commissions;
}

/**
 * Process commissions for a confirmed settlement
 */
export async function processSettlementCommissions(
  settlementId: string
): Promise<void> {
  // Get settlement with related data
  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    include: {
      program: true,
      intent: true,
    },
  });

  if (!settlement) {
    logger.error({ settlementId }, 'Settlement not found for commission processing');
    return;
  }

  if (settlement.status !== 'CONFIRMED') {
    logger.warn({ settlementId, status: settlement.status }, 'Settlement not confirmed, skipping commissions');
    return;
  }

  // Check if commissions already exist for this settlement
  const existingCommissions = await prisma.commission.count({
    where: { settlementId },
  });

  if (existingCommissions > 0) {
    logger.info({ settlementId }, 'Commissions already processed for settlement');
    return;
  }

  // Get user and their referrer
  const user = await prisma.user.findFirst({
    where: {
      programId: settlement.programId,
      wallet: settlement.wallet,
    },
    include: {
      referredBy: {
        include: {
          parent: true,
        },
      },
    },
  });

  if (!user?.referredBy) {
    logger.info({ settlementId }, 'No referrer for user, no commissions');
    return;
  }

  const affiliate = user.referredBy;
  const parentAffiliate = affiliate.parent;
  const program = settlement.program;

  // Calculate commissions
  const baseAmount = Number(settlement.amount);
  const calculations = calculateCommissions(
    baseAmount,
    affiliate.id,
    parentAffiliate?.id || null,
    Number(program.directCommissionPct),
    Number(program.overrideCommissionPct)
  );

  // Create commission records and ledger entries
  await prisma.$transaction(async (tx) => {
    for (const calc of calculations) {
      // Create commission record
      const commission = await tx.commission.create({
        data: {
          programId: settlement.programId,
          settlementId,
          affiliateId: calc.affiliateId,
          overrideAffiliateId: calc.type === 'OVERRIDE' ? calc.affiliateId : null,
          commissionType: calc.type,
          rate: calc.rate,
          baseAmount: calc.baseAmount,
          amount: calc.amount,
          status: 'ACCRUED',
        },
      });

      // Record ledger entry
      await ledger.recordCommissionAccrual(
        settlement.programId,
        calc.affiliateId,
        commission.id,
        calc.amount,
        `${calc.type} commission on settlement ${settlementId}`
      );

      // Update affiliate pending earnings
      await tx.affiliate.update({
        where: { id: calc.affiliateId },
        data: {
          pendingEarnings: { increment: calc.amount },
        },
      });

      logger.info(
        { commissionId: commission.id, affiliateId: calc.affiliateId, type: calc.type, amount: calc.amount },
        'Commission accrued'
      );
    }
  });
}

/**
 * Get affiliate's commission summary
 */
export async function getAffiliateCommissionSummary(affiliateId: string) {
  const [accrued, payable, paid, total] = await Promise.all([
    prisma.commission.aggregate({
      where: { affiliateId, status: 'ACCRUED' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.commission.aggregate({
      where: { affiliateId, status: 'PAYABLE' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.commission.aggregate({
      where: { affiliateId, status: 'PAID' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.commission.aggregate({
      where: { affiliateId },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    accrued: {
      amount: Number(accrued._sum.amount || 0),
      count: accrued._count,
    },
    payable: {
      amount: Number(payable._sum.amount || 0),
      count: payable._count,
    },
    paid: {
      amount: Number(paid._sum.amount || 0),
      count: paid._count,
    },
    total: {
      amount: Number(total._sum.amount || 0),
      count: total._count,
    },
  };
}

/**
 * Get affiliate's commission history
 */
export async function getAffiliateCommissions(
  affiliateId: string,
  options: {
    status?: CommissionStatus;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, limit = 50, offset = 0 } = options;

  const where: Prisma.CommissionWhereInput = { affiliateId };
  if (status) where.status = status;

  const [commissions, total] = await Promise.all([
    prisma.commission.findMany({
      where,
      include: {
        settlement: {
          select: {
            id: true,
            type: true,
            amount: true,
            txHash: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.commission.count({ where }),
  ]);

  return { commissions, total };
}

/**
 * Mark commissions as payable (ready for payout batch)
 */
export async function markCommissionsPayable(
  affiliateId: string,
  beforeDate?: Date
): Promise<number> {
  const where: Prisma.CommissionWhereInput = {
    affiliateId,
    status: 'ACCRUED',
  };
  if (beforeDate) {
    where.createdAt = { lt: beforeDate };
  }

  const result = await prisma.commission.updateMany({
    where,
    data: { status: 'PAYABLE' },
  });

  return result.count;
}

/**
 * Get program commission stats
 */
export async function getProgramCommissionStats(programId: string) {
  const [total, byStatus, topAffiliates] = await Promise.all([
    prisma.commission.aggregate({
      where: { programId },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.commission.groupBy({
      by: ['status'],
      where: { programId },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.commission.groupBy({
      by: ['affiliateId'],
      where: { programId },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    total: {
      amount: Number(total._sum.amount || 0),
      count: total._count,
    },
    byStatus: byStatus.reduce((acc, s) => {
      acc[s.status] = { amount: Number(s._sum.amount || 0), count: s._count };
      return acc;
    }, {} as Record<string, { amount: number; count: number }>),
    topAffiliates: topAffiliates.map((a) => ({
      affiliateId: a.affiliateId,
      totalAmount: Number(a._sum.amount || 0),
      count: a._count,
    })),
  };
}
