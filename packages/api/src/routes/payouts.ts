/**
 * Payout Routes (Admin)
 * 
 * Batch creation, approval, and execution.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db';
import { logger } from '../lib/logger';
import * as payoutService from '../services/payout.service';

const router = Router();

/**
 * GET /api/payouts/batches
 * List payout batches (admin)
 */
router.get('/batches', async (req: Request, res: Response) => {
  try {
    const programId = req.query.programId as string;
    const status = req.query.status as any;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const where: any = {};
    if (programId) where.programId = programId;
    if (status) where.status = status;

    const [batches, total] = await Promise.all([
      prisma.payoutBatch.findMany({
        where,
        include: {
          program: { select: { name: true } },
          _count: { select: { payouts: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.payoutBatch.count({ where }),
    ]);

    res.json({ batches, total });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to list batches');
    res.status(500).json({ error: 'Failed to list batches' });
  }
});

/**
 * POST /api/payouts/batch/create
 * Create a new payout batch (admin)
 */
router.post('/batch/create', async (req: Request, res: Response) => {
  try {
    const { programId, period, minAmount = 10 } = req.body;
    const createdById = req.headers['x-admin-id'] as string || 'admin';

    if (!programId || !period) {
      return res.status(400).json({ error: 'programId and period required' });
    }

    const result = await payoutService.createPayoutBatch({
      programId,
      period,
      createdById,
      minAmount,
    });

    if (!result) {
      return res.status(404).json({ error: 'No payable commissions found' });
    }

    res.status(201).json(result);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    logger.error({ error: error.message }, 'Failed to create batch');
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

/**
 * POST /api/payouts/batch/:id/approve
 * Approve a payout batch (requires different admin)
 */
router.post('/batch/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const approvedById = req.headers['x-admin-id'] as string || 'admin2';

    await payoutService.approvePayoutBatch(id, approvedById);

    res.json({ success: true, message: 'Batch approved' });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to approve batch');
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/payouts/batch/:id/execute
 * Execute an approved payout batch
 */
router.post('/batch/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await payoutService.executePayoutBatch(id);

    res.json({ success: true, message: 'Batch execution started' });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to execute batch');
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/payouts/batch/:id
 * Get batch details
 */
router.get('/batch/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const batch = await payoutService.getPayoutBatch(id);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    res.json({ batch });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get batch');
    res.status(500).json({ error: 'Failed to get batch' });
  }
});

/**
 * GET /api/payouts/me
 * Get current affiliate's payouts
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const wallet = req.query.wallet as string;
    const programId = req.query.programId as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!wallet || !programId) {
      return res.status(400).json({ error: 'wallet and programId required' });
    }

    const affiliate = await prisma.affiliate.findUnique({
      where: {
        programId_wallet: {
          programId,
          wallet: wallet.toLowerCase(),
        },
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const result = await payoutService.getAffiliatePayouts(affiliate.id, {
      limit,
      offset,
    });

    res.json(result);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get payouts');
    res.status(500).json({ error: 'Failed to get payouts' });
  }
});

/**
 * GET /api/payouts/summary
 * Get program payout summary (admin)
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const programId = req.query.programId as string;

    if (!programId) {
      return res.status(400).json({ error: 'programId required' });
    }

    const summary = await payoutService.getProgramPayoutSummary(programId);
    res.json({ summary });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get summary');
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

export default router;
