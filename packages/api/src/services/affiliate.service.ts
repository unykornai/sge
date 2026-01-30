/**
 * Affiliate Service
 * 
 * Handles affiliate registration, hierarchy, and referral tracking.
 * Supports 2-level affiliate trees with attribution locking.
 */

import { prisma } from '../lib/db';
import { logger } from '../lib/logger';
import { AffiliateStatus, Prisma } from '../generated/prisma';
import { randomBytes } from 'crypto';

/**
 * Generate a unique referral code
 */
function generateReferralCode(length = 8): string {
  return randomBytes(length / 2 + 1)
    .toString('hex')
    .slice(0, length)
    .toUpperCase();
}

export interface RegisterAffiliateInput {
  programId: string;
  wallet: string;
  parentCode?: string;
  email?: string;
  displayName?: string;
}

export interface AffiliateRegistrationResult {
  affiliate: {
    id: string;
    referralCode: string;
    wallet: string;
    status: AffiliateStatus;
  };
  parentAffiliate?: {
    id: string;
    referralCode: string;
  };
  isNew: boolean;
}

/**
 * Register a new affiliate (or return existing)
 */
export async function registerAffiliate(
  input: RegisterAffiliateInput
): Promise<AffiliateRegistrationResult> {
  const { programId, wallet, parentCode, email, displayName } = input;
  const normalizedWallet = wallet.toLowerCase();

  // Check if affiliate already exists
  const existing = await prisma.affiliate.findUnique({
    where: {
      programId_wallet: {
        programId,
        wallet: normalizedWallet,
      },
    },
    include: {
      parent: true,
    },
  });

  if (existing) {
    return {
      affiliate: {
        id: existing.id,
        referralCode: existing.referralCode,
        wallet: existing.wallet,
        status: existing.status,
      },
      parentAffiliate: existing.parent
        ? {
            id: existing.parent.id,
            referralCode: existing.parent.referralCode,
          }
        : undefined,
      isNew: false,
    };
  }

  // Find parent affiliate if code provided
  let parentAffiliate = null;
  let depth = 1;

  if (parentCode) {
    parentAffiliate = await prisma.affiliate.findUnique({
      where: {
        programId_referralCode: {
          programId,
          referralCode: parentCode.toUpperCase(),
        },
      },
    });

    if (parentAffiliate) {
      // Get program's max depth setting
      const program = await prisma.program.findUnique({
        where: { id: programId },
        select: { maxAffiliateDepth: true },
      });

      // Check depth limit
      if (program && parentAffiliate.depth >= program.maxAffiliateDepth) {
        logger.warn(
          { parentCode, maxDepth: program.maxAffiliateDepth },
          'Parent affiliate at max depth, not setting parent'
        );
        parentAffiliate = null;
      } else {
        depth = parentAffiliate.depth + 1;
      }
    }
  }

  // Generate unique referral code
  let referralCode: string;
  let attempts = 0;
  do {
    referralCode = generateReferralCode();
    const exists = await prisma.affiliate.findFirst({
      where: { programId, referralCode },
    });
    if (!exists) break;
    attempts++;
  } while (attempts < 10);

  // Create affiliate
  const affiliate = await prisma.affiliate.create({
    data: {
      programId,
      wallet: normalizedWallet,
      referralCode,
      email,
      displayName,
      parentId: parentAffiliate?.id,
      depth,
      status: 'ACTIVE', // Auto-activate for now
    },
  });

  logger.info(
    { affiliateId: affiliate.id, referralCode, parentId: parentAffiliate?.id },
    'Affiliate registered'
  );

  return {
    affiliate: {
      id: affiliate.id,
      referralCode: affiliate.referralCode,
      wallet: affiliate.wallet,
      status: affiliate.status,
    },
    parentAffiliate: parentAffiliate
      ? {
          id: parentAffiliate.id,
          referralCode: parentAffiliate.referralCode,
        }
      : undefined,
    isNew: true,
  };
}

/**
 * Accept affiliate terms (with wallet signature)
 */
export async function acceptAffiliateTerms(
  affiliateId: string,
  termsVersion: string,
  termsHash: string,
  walletSignature: string,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  await prisma.affiliateTermsAcceptance.create({
    data: {
      affiliateId,
      termsVersion,
      termsHash,
      walletSignature,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    },
  });

  logger.info({ affiliateId, termsVersion }, 'Affiliate terms accepted');
}

/**
 * Get affiliate by wallet
 */
export async function getAffiliateByWallet(programId: string, wallet: string) {
  return prisma.affiliate.findUnique({
    where: {
      programId_wallet: {
        programId,
        wallet: wallet.toLowerCase(),
      },
    },
    include: {
      parent: {
        select: {
          id: true,
          referralCode: true,
          displayName: true,
        },
      },
      _count: {
        select: {
          children: true,
          referredUsers: true,
        },
      },
    },
  });
}

/**
 * Get affiliate by referral code
 */
export async function getAffiliateByCode(programId: string, referralCode: string) {
  return prisma.affiliate.findUnique({
    where: {
      programId_referralCode: {
        programId,
        referralCode: referralCode.toUpperCase(),
      },
    },
  });
}

/**
 * Get affiliate's downline tree
 */
interface TreeNode {
  id: string;
  referralCode: string;
  displayName: string | null;
  totalReferrals: number;
  totalEarnings: number;
  childCount?: number;
  referralCount: number;
  children?: TreeNode[];
}

export async function getAffiliateTree(
  affiliateId: string,
  maxDepth = 2
): Promise<TreeNode | null> {
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    include: {
      children: {
        include: {
          _count: {
            select: {
              children: true,
              referredUsers: true,
            },
          },
        },
      },
      _count: {
        select: {
          referredUsers: true,
        },
      },
    },
  });

  if (!affiliate) return null;

  // Recursively build tree for children
  const childrenWithTree: TreeNode[] = (await Promise.all(
    affiliate.children.map(async (child) => {
      if (maxDepth > 1) {
        const childTree = await getAffiliateTree(child.id, maxDepth - 1);
        return childTree;
      }
      return {
        id: child.id,
        referralCode: child.referralCode,
        displayName: child.displayName,
        totalReferrals: child.totalReferrals,
        totalEarnings: Number(child.totalEarnings),
        childCount: child._count.children,
        referralCount: child._count.referredUsers,
      };
    })
  )).filter((node): node is TreeNode => node !== null);

  return {
    id: affiliate.id,
    referralCode: affiliate.referralCode,
    displayName: affiliate.displayName,
    totalReferrals: affiliate.totalReferrals,
    totalEarnings: Number(affiliate.totalEarnings),
    referralCount: affiliate._count.referredUsers,
    children: childrenWithTree,
  };
}

/**
 * Get affiliate stats
 */
export async function getAffiliateStats(affiliateId: string) {
  const [affiliate, referrals, settlements] = await Promise.all([
    prisma.affiliate.findUnique({
      where: { id: affiliateId },
    }),
    prisma.user.count({
      where: { referredById: affiliateId },
    }),
    prisma.settlement.count({
      where: {
        intent: {
          wallet: {
            in: await prisma.user
              .findMany({
                where: { referredById: affiliateId },
                select: { wallet: true },
              })
              .then((users) => users.map((u) => u.wallet)),
          },
        },
        status: 'CONFIRMED',
      },
    }),
  ]);

  if (!affiliate) return null;

  return {
    totalReferrals: referrals,
    totalSettlements: settlements,
    totalEarnings: Number(affiliate.totalEarnings),
    pendingEarnings: Number(affiliate.pendingEarnings),
    conversionRate: referrals > 0 ? (settlements / referrals) * 100 : 0,
  };
}

/**
 * Get affiliate timeseries stats
 */
export async function getAffiliateTimeseries(
  affiliateId: string,
  days = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const referrals = await prisma.user.groupBy({
    by: ['referredAt'],
    where: {
      referredById: affiliateId,
      referredAt: { gte: startDate },
    },
    _count: true,
  });

  const commissions = await prisma.commission.groupBy({
    by: ['createdAt'],
    where: {
      affiliateId,
      createdAt: { gte: startDate },
    },
    _sum: { amount: true },
    _count: true,
  });

  // Aggregate by day
  const dailyStats: Record<string, { referrals: number; commissions: number; amount: number }> = {};

  referrals.forEach((r) => {
    if (!r.referredAt) return;
    const day = r.referredAt.toISOString().split('T')[0];
    if (!dailyStats[day]) dailyStats[day] = { referrals: 0, commissions: 0, amount: 0 };
    dailyStats[day].referrals += r._count;
  });

  commissions.forEach((c) => {
    const day = c.createdAt.toISOString().split('T')[0];
    if (!dailyStats[day]) dailyStats[day] = { referrals: 0, commissions: 0, amount: 0 };
    dailyStats[day].commissions += c._count;
    dailyStats[day].amount += Number(c._sum.amount || 0);
  });

  return Object.entries(dailyStats)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Attribute a user to an affiliate (locks attribution)
 */
export async function attributeUserToAffiliate(
  userId: string,
  referralCode: string,
  attributionProof: {
    ip?: string;
    userAgent?: string;
    source?: string;
  }
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    logger.error({ userId }, 'User not found for attribution');
    return false;
  }

  // Don't override existing attribution
  if (user.referredById) {
    logger.info({ userId, existingReferrer: user.referredById }, 'User already attributed');
    return false;
  }

  // Find affiliate by code
  const affiliate = await prisma.affiliate.findUnique({
    where: {
      programId_referralCode: {
        programId: user.programId,
        referralCode: referralCode.toUpperCase(),
      },
    },
  });

  if (!affiliate) {
    logger.warn({ referralCode }, 'Affiliate not found for attribution');
    return false;
  }

  // Prevent self-referral
  if (affiliate.wallet === user.wallet) {
    logger.warn({ userId, affiliateId: affiliate.id }, 'Self-referral prevented');
    return false;
  }

  // Lock attribution
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        referredById: affiliate.id,
        referredAt: new Date(),
        attributionProof: {
          refCode: referralCode,
          ip: attributionProof.ip,
          userAgent: attributionProof.userAgent,
          source: attributionProof.source,
          timestamp: new Date().toISOString(),
        },
      },
    }),
    prisma.affiliate.update({
      where: { id: affiliate.id },
      data: {
        totalReferrals: { increment: 1 },
      },
    }),
  ]);

  logger.info({ userId, affiliateId: affiliate.id }, 'User attributed to affiliate');
  return true;
}
