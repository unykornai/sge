/**
 * User Routes
 * 
 * Registration, status, and intent management.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db';
import { logger } from '../lib/logger';
import * as intentService from '../services/intent.service';
import * as affiliateService from '../services/affiliate.service';

const router = Router();

/**
 * POST /api/register
 * Register a new user (creates REGISTER intent)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { programId, wallet, refCode } = req.body;

    if (!programId || !wallet) {
      return res.status(400).json({ error: 'programId and wallet are required' });
    }

    // Find affiliate if ref code provided
    let affiliateId: string | undefined;
    if (refCode) {
      const affiliate = await affiliateService.getAffiliateByCode(programId, refCode);
      if (affiliate && affiliate.wallet.toLowerCase() !== wallet.toLowerCase()) {
        affiliateId = affiliate.id;
      }
    }

    // Create register intent
    const result = await intentService.createIntent({
      programId,
      type: 'REGISTER',
      wallet,
      payload: {
        affiliateId,
        refCode,
        source: req.headers['referer'] || 'direct',
      },
    });

    res.status(result.isNew ? 201 : 200).json({
      intentId: result.intentId,
      status: result.status,
      isNew: result.isNew,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to register user');
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * GET /api/status
 * Get user's registration and claim status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const wallet = req.query.wallet as string;
    const programId = req.query.programId as string;

    if (!wallet || !programId) {
      return res.status(400).json({ error: 'wallet and programId required' });
    }

    const user = await prisma.user.findUnique({
      where: {
        programId_wallet: {
          programId,
          wallet: wallet.toLowerCase(),
        },
      },
      include: {
        referredBy: {
          select: {
            id: true,
            referralCode: true,
            displayName: true,
          },
        },
      },
    });

    // Get pending intents
    const pendingIntents = await intentService.getPendingIntents(programId, wallet);

    res.json({
      registered: !!user?.sgeidTokenId,
      claimed: !!user?.hasClaimed,
      user: user
        ? {
            wallet: user.wallet,
            sgeidTokenId: user.sgeidTokenId?.toString(),
            sgeidMintedAt: user.sgeidMintedAt,
            hasClaimed: user.hasClaimed,
            claimedAt: user.claimedAt,
            claimTxHash: user.claimTxHash,
            referredBy: user.referredBy,
          }
        : null,
      pendingIntents: pendingIntents.map((i: { id: string; type: string; status: string; createdAt: Date }) => ({
        id: i.id,
        type: i.type,
        status: i.status,
        createdAt: i.createdAt,
      })),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get user status');
    res.status(500).json({ error: 'Failed to get user status' });
  }
});

/**
 * GET /api/intent/:id
 * Get intent status
 */
router.get('/intent/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const intent = await intentService.getIntentStatus(id);
    if (!intent) {
      return res.status(404).json({ error: 'Intent not found' });
    }

    res.json({ intent });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get intent');
    res.status(500).json({ error: 'Failed to get intent' });
  }
});

export default router;
