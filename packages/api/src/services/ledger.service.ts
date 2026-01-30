/**
 * Double-Entry Ledger Service
 * 
 * Implements proper double-entry accounting for all money movements.
 * Every transaction creates balanced debit/credit entries.
 */

import { prisma } from '../lib/db';
import { logger } from '../lib/logger';
import { Prisma } from '../generated/prisma';

// Standard account types
export const ACCOUNTS = {
  // Program accounts
  REVENUE: (programId: string) => `program:${programId}:revenue`,
  TREASURY: (programId: string) => `program:${programId}:treasury`,
  COMMISSION_EXPENSE: (programId: string) => `program:${programId}:commission_expense`,
  
  // Affiliate accounts
  AFFILIATE_LIABILITY: (affiliateId: string) => `affiliate:${affiliateId}:liability`,
  AFFILIATE_PAID: (affiliateId: string) => `affiliate:${affiliateId}:paid`,
  
  // User accounts
  USER_CLAIMS: (userId: string) => `user:${userId}:claims`,
  
  // System accounts
  SUSPENSE: 'system:suspense',
  FEES: 'system:fees',
} as const;

export interface LedgerEntryInput {
  programId: string;
  account: string;
  counterparty: string;
  amount: number | Prisma.Decimal;
  currency?: string;
  refType: string;
  refId: string;
  settlementId?: string;
  description?: string;
}

/**
 * Record a single ledger entry
 * For double-entry, call this twice with opposite amounts
 */
export async function recordEntry(input: LedgerEntryInput) {
  return prisma.ledgerEntry.create({
    data: {
      programId: input.programId,
      account: input.account,
      counterparty: input.counterparty,
      amount: input.amount,
      currency: input.currency || 'USD',
      refType: input.refType,
      refId: input.refId,
      settlementId: input.settlementId,
      description: input.description,
    },
  });
}

/**
 * Record a balanced double-entry transaction
 * Creates two entries that net to zero
 */
export async function recordTransaction(
  programId: string,
  debitAccount: string,
  creditAccount: string,
  amount: number,
  refType: string,
  refId: string,
  options: {
    settlementId?: string;
    description?: string;
    currency?: string;
  } = {}
) {
  const { settlementId, description, currency = 'USD' } = options;

  // Use transaction to ensure both entries are created
  const entries = await prisma.$transaction([
    // Debit entry (positive)
    prisma.ledgerEntry.create({
      data: {
        programId,
        account: debitAccount,
        counterparty: creditAccount,
        amount: amount,
        currency,
        refType,
        refId,
        settlementId,
        description: description ? `DEBIT: ${description}` : undefined,
      },
    }),
    // Credit entry (negative)
    prisma.ledgerEntry.create({
      data: {
        programId,
        account: creditAccount,
        counterparty: debitAccount,
        amount: -amount,
        currency,
        refType,
        refId,
        settlementId,
        description: description ? `CREDIT: ${description}` : undefined,
      },
    }),
  ]);

  logger.debug(
    { programId, debit: debitAccount, credit: creditAccount, amount, refType, refId },
    'Ledger transaction recorded'
  );

  return entries;
}

/**
 * Record settlement revenue
 * When a user pays $100 for claim:
 * - Debit TREASURY (asset)
 * - Credit REVENUE (income)
 */
export async function recordSettlementRevenue(
  programId: string,
  settlementId: string,
  amount: number,
  description?: string
) {
  return recordTransaction(
    programId,
    ACCOUNTS.TREASURY(programId),
    ACCOUNTS.REVENUE(programId),
    amount,
    'SETTLEMENT',
    settlementId,
    { settlementId, description: description || 'Settlement revenue' }
  );
}

/**
 * Record commission accrual
 * When affiliate earns commission:
 * - Debit COMMISSION_EXPENSE (expense)
 * - Credit AFFILIATE_LIABILITY (liability)
 */
export async function recordCommissionAccrual(
  programId: string,
  affiliateId: string,
  commissionId: string,
  amount: number,
  description?: string
) {
  return recordTransaction(
    programId,
    ACCOUNTS.COMMISSION_EXPENSE(programId),
    ACCOUNTS.AFFILIATE_LIABILITY(affiliateId),
    amount,
    'COMMISSION',
    commissionId,
    { description: description || 'Commission accrual' }
  );
}

/**
 * Record commission payout
 * When affiliate is paid:
 * - Debit AFFILIATE_LIABILITY (reduce liability)
 * - Credit TREASURY (reduce assets)
 */
export async function recordCommissionPayout(
  programId: string,
  affiliateId: string,
  payoutId: string,
  amount: number,
  description?: string
) {
  return recordTransaction(
    programId,
    ACCOUNTS.AFFILIATE_LIABILITY(affiliateId),
    ACCOUNTS.TREASURY(programId),
    amount,
    'PAYOUT',
    payoutId,
    { description: description || 'Commission payout' }
  );
}

/**
 * Get account balance
 * Sum of all entries for an account
 */
export async function getAccountBalance(account: string, currency = 'USD') {
  const result = await prisma.ledgerEntry.aggregate({
    where: { account, currency },
    _sum: { amount: true },
  });

  return Number(result._sum.amount || 0);
}

/**
 * Get account statement (entries for an account)
 */
export async function getAccountStatement(
  account: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { startDate, endDate, limit = 100, offset = 0 } = options;

  const where: Prisma.LedgerEntryWhereInput = { account };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [entries, total] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.ledgerEntry.count({ where }),
  ]);

  return { entries, total };
}

/**
 * Get program financial summary
 */
export async function getProgramFinancials(programId: string) {
  const [revenue, commissionExpense, affiliateLiabilities] = await Promise.all([
    getAccountBalance(ACCOUNTS.REVENUE(programId)),
    getAccountBalance(ACCOUNTS.COMMISSION_EXPENSE(programId)),
    prisma.ledgerEntry.aggregate({
      where: {
        programId,
        AND: [
          { account: { startsWith: 'affiliate:' } },
          { account: { endsWith: ':liability' } },
        ],
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalRevenue: Math.abs(revenue), // Revenue is credited (negative)
    totalCommissionExpense: commissionExpense,
    outstandingLiabilities: Math.abs(Number(affiliateLiabilities._sum.amount || 0)),
    netRevenue: Math.abs(revenue) - commissionExpense,
  };
}

/**
 * Verify ledger balance (sum of all entries should be 0)
 */
export async function verifyLedgerBalance(programId?: string) {
  const where = programId ? { programId } : {};
  
  const result = await prisma.ledgerEntry.aggregate({
    where,
    _sum: { amount: true },
  });

  const balance = Number(result._sum.amount || 0);
  const isBalanced = Math.abs(balance) < 0.01; // Allow for floating point

  if (!isBalanced) {
    logger.error({ programId, balance }, 'Ledger imbalance detected!');
  }

  return { isBalanced, balance };
}
