/**
 * Claim Routes
 * 
 * Token claim intent management.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db';
import { logger } from '../lib/logger';
import * as intentService from '../services/intent.service';

const router = Router();

/**
 * POST /api/claim/intent
 * Create a claim intent
 */
router.post('/intent', async (req: Request, res: Response) => {
  try {
    const { programId, wallet, token = 'USDC' } = req.body;

    if (!programId || !wallet) {
      return res.status(400).json({ error: 'programId and wallet are required' });
    }

    // Verify user is registered
    const user = await prisma.user.findUnique({
      where: {
        programId_wallet: {
          programId,
          wallet: wallet.toLowerCase(),
        },
      },
    });

    if (!user?.sgeidTokenId) {
      return res.status(400).json({ error: 'Must register before claiming' });
    }

    if (user.hasClaimed) {
      return res.status(400).json({
        error: 'Already claimed',
        claimTxHash: user.claimTxHash,
      });
    }

    // Create claim intent
    const result = await intentService.createIntent({
      programId,
      type: 'CLAIM',
      wallet,
      payload: {
        token,
        cycle: 'v1',
      },
    });

    res.status(result.isNew ? 201 : 200).json({
      intentId: result.intentId,
      status: result.status,
      isNew: result.isNew,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to create claim intent');
    res.status(500).json({ error: 'Failed to create claim intent' });
  }
});

/**
 * GET /api/claim/info
 * Get claim information for a wallet
 */
router.get('/info', async (req: Request, res: Response) => {
  try {
    const wallet = req.query.wallet as string;
    const programId = req.query.programId as string;

    if (!wallet || !programId) {
      return res.status(400).json({ error: 'wallet and programId required' });
    }

    const [user, program] = await Promise.all([
      prisma.user.findUnique({
        where: {
          programId_wallet: {
            programId,
            wallet: wallet.toLowerCase(),
          },
        },
      }),
      prisma.program.findUnique({
        where: { id: programId },
        select: {
          feeUsd: true,
          claimAmount: true,
          kycRequired: true,
          commerceRequired: true,
        },
      }),
    ]);

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    res.json({
      eligible: !!user?.sgeidTokenId && !user?.hasClaimed,
      registered: !!user?.sgeidTokenId,
      claimed: !!user?.hasClaimed,
      claimInfo: {
        feeUsd: Number(program.feeUsd),
        claimAmount: Number(program.claimAmount),
        token: 'SGE',
        kycRequired: program.kycRequired,
        commerceRequired: program.commerceRequired,
      },
      claimTxHash: user?.claimTxHash,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get claim info');
    res.status(500).json({ error: 'Failed to get claim info' });
  }
});

export default router;
