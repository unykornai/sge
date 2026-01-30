/**
 * Program Routes
 * 
 * CRUD for multi-tenant programs.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db';
import { logger } from '../lib/logger';
import { audit } from '../services/audit.service';

const router = Router();

/**
 * GET /api/programs
 * List all programs (admin only)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const programs = await prisma.program.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        feeUsd: true,
        createdAt: true,
        _count: {
          select: {
            affiliates: true,
            users: true,
            settlements: true,
          },
        },
      },
    });

    res.json({ programs });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to list programs');
    res.status(500).json({ error: 'Failed to list programs' });
  }
});

/**
 * GET /api/programs/:id
 * Get program details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const program = await prisma.program.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            affiliates: true,
            users: true,
            settlements: true,
            commissions: true,
            payouts: true,
          },
        },
      },
    });

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    res.json({ program });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get program');
    res.status(500).json({ error: 'Failed to get program' });
  }
});

/**
 * POST /api/programs
 * Create a new program (admin only)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      slug,
      treasuryAddress,
      feeUsd = 100,
      claimAmount = 1000,
      directCommissionPct = 10,
      overrideCommissionPct = 5,
      sgeTokenAddress,
      sgeClaimAddress,
      sgeidAddress,
    } = req.body;

    if (!name || !slug || !treasuryAddress) {
      return res.status(400).json({ error: 'name, slug, and treasuryAddress are required' });
    }

    const program = await prisma.program.create({
      data: {
        name,
        slug: slug.toLowerCase(),
        treasuryAddress,
        feeUsd,
        claimAmount,
        directCommissionPct,
        overrideCommissionPct,
        sgeTokenAddress,
        sgeClaimAddress,
        sgeidAddress,
      },
    });

    await audit.log({
      programId: program.id,
      action: 'PROGRAM_CREATED',
      actorType: 'ADMIN',
      targetType: 'Program',
      targetId: program.id,
      after: program,
    });

    res.status(201).json({ program });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Program with this slug already exists' });
    }
    logger.error({ error: error.message }, 'Failed to create program');
    res.status(500).json({ error: 'Failed to create program' });
  }
});

/**
 * PATCH /api/programs/:id
 * Update a program (admin only)
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const before = await prisma.program.findUnique({ where: { id } });
    if (!before) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const program = await prisma.program.update({
      where: { id },
      data: updates,
    });

    await audit.log({
      programId: id,
      action: 'PROGRAM_UPDATED',
      actorType: 'ADMIN',
      targetType: 'Program',
      targetId: id,
      before,
      after: program,
    });

    res.json({ program });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to update program');
    res.status(500).json({ error: 'Failed to update program' });
  }
});

/**
 * GET /api/programs/:id/stats
 * Get program statistics
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [
      program,
      totalUsers,
      totalAffiliates,
      totalSettlements,
      totalRevenue,
      totalCommissions,
      totalPayouts,
    ] = await Promise.all([
      prisma.program.findUnique({ where: { id } }),
      prisma.user.count({ where: { programId: id } }),
      prisma.affiliate.count({ where: { programId: id } }),
      prisma.settlement.count({ where: { programId: id, status: 'CONFIRMED' } }),
      prisma.settlement.aggregate({
        where: { programId: id, status: 'CONFIRMED' },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        where: { programId: id },
        _sum: { amount: true },
      }),
      prisma.payout.aggregate({
        where: { programId: id, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    res.json({
      program: {
        id: program.id,
        name: program.name,
      },
      stats: {
        totalUsers,
        totalAffiliates,
        totalSettlements,
        totalRevenue: Number(totalRevenue._sum.amount || 0),
        totalCommissions: Number(totalCommissions._sum.amount || 0),
        totalPayouts: Number(totalPayouts._sum.amount || 0),
        outstandingLiabilities:
          Number(totalCommissions._sum.amount || 0) - Number(totalPayouts._sum.amount || 0),
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get program stats');
    res.status(500).json({ error: 'Failed to get program stats' });
  }
});

export default router;
