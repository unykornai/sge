/**
 * Enterprise Admin Routes
 * 
 * Ledger, audit, reconciliation, and system management for enterprise platform.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db';
import { logger } from '../lib/logger';
import * as ledger from '../services/ledger.service';
import * as auditService from '../services/audit.service';
import * as reconciliation from '../services/reconciliation.service';
import * as commissionService from '../services/commission.service';
import { getQueueStats } from '../lib/queue';

const router = Router();

/**
 * GET /api/enterprise/stats
 * Get overall system stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const programId = req.query.programId as string;
    const where = programId ? { programId } : {};

    const [
      totalPrograms,
      totalUsers,
      totalAffiliates,
      totalSettlements,
      totalRevenue,
      totalCommissions,
      totalPayouts,
      queueStats,
    ] = await Promise.all([
      prisma.program.count(),
      prisma.user.count({ where }),
      prisma.affiliate.count({ where }),
      prisma.settlement.count({ where: { ...where, status: 'CONFIRMED' } }),
      prisma.settlement.aggregate({
        where: { ...where, status: 'CONFIRMED' },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        where,
        _sum: { amount: true },
      }),
      prisma.payout.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      getQueueStats(),
    ]);

    // Generate timeseries for last 7 days
    const timeseries = await generateTimeseries(programId, 7);

    res.json({
      totalPrograms,
      totalUsers,
      totalAffiliates,
      totalSettlements,
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      totalCommissions: Number(totalCommissions._sum.amount || 0),
      totalPayouts: Number(totalPayouts._sum.amount || 0),
      outstandingLiabilities:
        Number(totalCommissions._sum.amount || 0) - Number(totalPayouts._sum.amount || 0),
      queues: queueStats,
      timeseries,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get stats');
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/enterprise/ledger
 * Query ledger entries
 */
router.get('/ledger', async (req: Request, res: Response) => {
  try {
    const account = req.query.account as string;
    const programId = req.query.programId as string;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!account && !programId) {
      return res.status(400).json({ error: 'account or programId required' });
    }

    const where: any = {};
    if (account) where.account = account;
    if (programId) where.programId = programId;

    const [entries, total, balance] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.ledgerEntry.count({ where }),
      account ? ledger.getAccountBalance(account) : null,
    ]);

    res.json({ entries, total, balance });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get ledger');
    res.status(500).json({ error: 'Failed to get ledger' });
  }
});

/**
 * GET /api/enterprise/ledger/verify
 * Verify ledger balance
 */
router.get('/ledger/verify', async (req: Request, res: Response) => {
  try {
    const programId = req.query.programId as string;
    const result = await ledger.verifyLedgerBalance(programId);
    res.json(result);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to verify ledger');
    res.status(500).json({ error: 'Failed to verify ledger' });
  }
});

/**
 * GET /api/enterprise/commissions
 * Get program commission stats
 */
router.get('/commissions', async (req: Request, res: Response) => {
  try {
    const programId = req.query.programId as string;

    if (!programId) {
      return res.status(400).json({ error: 'programId required' });
    }

    const stats = await commissionService.getProgramCommissionStats(programId);
    res.json({ stats });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get commissions');
    res.status(500).json({ error: 'Failed to get commissions' });
  }
});

/**
 * GET /api/enterprise/settlements
 * List settlements
 */
router.get('/settlements', async (req: Request, res: Response) => {
  try {
    const programId = req.query.programId as string;
    const status = req.query.status as any;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const where: any = {};
    if (programId) where.programId = programId;
    if (status) where.status = status;

    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        include: {
          intent: { select: { type: true, wallet: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.settlement.count({ where }),
    ]);

    res.json({ settlements, total });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get settlements');
    res.status(500).json({ error: 'Failed to get settlements' });
  }
});

/**
 * GET /api/enterprise/audit
 * Query audit logs
 */
router.get('/audit', async (req: Request, res: Response) => {
  try {
    const programId = req.query.programId as string;
    const action = req.query.action as any;
    const targetType = req.query.targetType as string;
    const targetId = req.query.targetId as string;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await auditService.audit.query({
      programId,
      action,
      targetType,
      targetId,
      limit,
      offset,
    });

    res.json(result);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get audit logs');
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

/**
 * POST /api/enterprise/reconcile
 * Run reconciliation
 */
router.post('/reconcile', async (req: Request, res: Response) => {
  try {
    const { programId } = req.body;

    const result = await reconciliation.runReconciliation(programId);
    res.json({ result });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to run reconciliation');
    res.status(500).json({ error: 'Failed to run reconciliation' });
  }
});

/**
 * GET /api/enterprise/reconcile/summary
 * Get reconciliation summary
 */
router.get('/reconcile/summary', async (req: Request, res: Response) => {
  try {
    const programId = req.query.programId as string;
    const summary = await reconciliation.getReconciliationSummary(programId);
    res.json({ summary });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get reconciliation summary');
    res.status(500).json({ error: 'Failed to get reconciliation summary' });
  }
});

/**
 * GET /api/enterprise/intents
 * List intents
 */
router.get('/intents', async (req: Request, res: Response) => {
  try {
    const programId = req.query.programId as string;
    const status = req.query.status as any;
    const type = req.query.type as any;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const where: any = {};
    if (programId) where.programId = programId;
    if (status) where.status = status;
    if (type) where.type = type;

    const [intents, total] = await Promise.all([
      prisma.intent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.intent.count({ where }),
    ]);

    res.json({ intents, total });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get intents');
    res.status(500).json({ error: 'Failed to get intents' });
  }
});

/**
 * Generate timeseries data for stats
 */
async function generateTimeseries(programId: string | undefined, days: number) {
  const data: any[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const where: any = {
      createdAt: { gte: date, lt: nextDate },
    };
    if (programId) where.programId = programId;

    const [mints, claims, settlements] = await Promise.all([
      prisma.user.count({
        where: { ...where, sgeidMintedAt: { gte: date, lt: nextDate } },
      }),
      prisma.user.count({
        where: { ...where, claimedAt: { gte: date, lt: nextDate } },
      }),
      prisma.settlement.count({
        where: { ...where, status: 'CONFIRMED' },
      }),
    ]);

    data.push({
      date: date.toISOString().split('T')[0],
      mints,
      claims,
      settlements,
    });
  }

  return data;
}

export default router;
