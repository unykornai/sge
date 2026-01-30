/**
 * Affiliate Routes
 * 
 * Registration, tree management, stats, and commissions.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db';
import { logger } from '../lib/logger';
import * as affiliateService from '../services/affiliate.service';
import * as commissionService from '../services/commission.service';
import * as payoutService from '../services/payout.service';

const router = Router();

/**
 * POST /api/affiliates/register
 * Register as an affiliate
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { programId, wallet, parentCode, email, displayName } = req.body;

    if (!programId || !wallet) {
      return res.status(400).json({ error: 'programId and wallet are required' });
    }

    const result = await affiliateService.registerAffiliate({
      programId,
      wallet,
      parentCode,
      email,
      displayName,
    });

    res.status(result.isNew ? 201 : 200).json(result);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to register affiliate');
    res.status(500).json({ error: 'Failed to register affiliate' });
  }
});

/**
 * GET /api/affiliates/me
 * Get current affiliate profile (by wallet from query or header)
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const wallet = req.query.wallet as string || req.headers['x-wallet'] as string;
    const programId = req.query.programId as string || req.headers['x-program-id'] as string;

    if (!wallet || !programId) {
      return res.status(400).json({ error: 'wallet and programId required' });
    }

    const affiliate = await affiliateService.getAffiliateByWallet(programId, wallet);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const [stats, commissions] = await Promise.all([
      affiliateService.getAffiliateStats(affiliate.id),
      commissionService.getAffiliateCommissionSummary(affiliate.id),
    ]);

    res.json({
      affiliate: {
        id: affiliate.id,
        referralCode: affiliate.referralCode,
        wallet: affiliate.wallet,
        displayName: affiliate.displayName,
        status: affiliate.status,
        depth: affiliate.depth,
        totalReferrals: affiliate.totalReferrals,
        totalEarnings: Number(affiliate.totalEarnings),
        pendingEarnings: Number(affiliate.pendingEarnings),
        parent: affiliate.parent,
        childCount: affiliate._count.children,
        referralCount: affiliate._count.referredUsers,
      },
      stats,
      commissions,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get affiliate');
    res.status(500).json({ error: 'Failed to get affiliate' });
  }
});

/**
 * GET /api/affiliates/tree
 * Get affiliate's downline tree
 */
router.get('/tree', async (req: Request, res: Response) => {
  try {
    const wallet = req.query.wallet as string;
    const programId = req.query.programId as string;
    const maxDepth = parseInt(req.query.maxDepth as string) || 2;

    if (!wallet || !programId) {
      return res.status(400).json({ error: 'wallet and programId required' });
    }

    const affiliate = await affiliateService.getAffiliateByWallet(programId, wallet);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const tree = await affiliateService.getAffiliateTree(affiliate.id, maxDepth);
    res.json({ tree });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get affiliate tree');
    res.status(500).json({ error: 'Failed to get affiliate tree' });
  }
});

/**
 * GET /api/affiliates/stats
 * Get affiliate timeseries stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const wallet = req.query.wallet as string;
    const programId = req.query.programId as string;
    const days = parseInt(req.query.days as string) || 30;

    if (!wallet || !programId) {
      return res.status(400).json({ error: 'wallet and programId required' });
    }

    const affiliate = await affiliateService.getAffiliateByWallet(programId, wallet);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const timeseries = await affiliateService.getAffiliateTimeseries(affiliate.id, days);
    res.json({ timeseries });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get affiliate stats');
    res.status(500).json({ error: 'Failed to get affiliate stats' });
  }
});

/**
 * GET /api/affiliates/commissions
 * Get affiliate's commission history
 */
router.get('/commissions', async (req: Request, res: Response) => {
  try {
    const wallet = req.query.wallet as string;
    const programId = req.query.programId as string;
    const status = req.query.status as any;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!wallet || !programId) {
      return res.status(400).json({ error: 'wallet and programId required' });
    }

    const affiliate = await affiliateService.getAffiliateByWallet(programId, wallet);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const result = await commissionService.getAffiliateCommissions(affiliate.id, {
      status,
      limit,
      offset,
    });

    res.json(result);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get commissions');
    res.status(500).json({ error: 'Failed to get commissions' });
  }
});

/**
 * GET /api/affiliates/payouts
 * Get affiliate's payout history
 */
router.get('/payouts', async (req: Request, res: Response) => {
  try {
    const wallet = req.query.wallet as string;
    const programId = req.query.programId as string;
    const status = req.query.status as any;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!wallet || !programId) {
      return res.status(400).json({ error: 'wallet and programId required' });
    }

    const affiliate = await affiliateService.getAffiliateByWallet(programId, wallet);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const result = await payoutService.getAffiliatePayouts(affiliate.id, {
      status,
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
 * GET /api/affiliates/statement
 * Generate payout statement
 */
router.get('/statement', async (req: Request, res: Response) => {
  try {
    const wallet = req.query.wallet as string;
    const programId = req.query.programId as string;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    if (!wallet || !programId) {
      return res.status(400).json({ error: 'wallet and programId required' });
    }

    const affiliate = await affiliateService.getAffiliateByWallet(programId, wallet);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const statement = await payoutService.generatePayoutStatement(
      affiliate.id,
      startDate,
      endDate
    );

    res.json({ statement });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to generate statement');
    res.status(500).json({ error: 'Failed to generate statement' });
  }
});

/**
 * POST /api/affiliates/terms
 * Accept affiliate terms
 */
router.post('/terms', async (req: Request, res: Response) => {
  try {
    const { affiliateId, termsVersion, termsHash, walletSignature } = req.body;

    if (!affiliateId || !termsVersion || !termsHash || !walletSignature) {
      return res.status(400).json({
        error: 'affiliateId, termsVersion, termsHash, and walletSignature required',
      });
    }

    await affiliateService.acceptAffiliateTerms(
      affiliateId,
      termsVersion,
      termsHash,
      walletSignature,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to accept terms');
    res.status(500).json({ error: 'Failed to accept terms' });
  }
});

/**
 * GET /api/affiliates/lookup
 * Look up affiliate by referral code
 */
router.get('/lookup', async (req: Request, res: Response) => {
  try {
    const programId = req.query.programId as string;
    const code = req.query.code as string;

    if (!programId || !code) {
      return res.status(400).json({ error: 'programId and code required' });
    }

    const affiliate = await affiliateService.getAffiliateByCode(programId, code);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    res.json({
      affiliate: {
        id: affiliate.id,
        referralCode: affiliate.referralCode,
        displayName: affiliate.displayName,
        status: affiliate.status,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to lookup affiliate');
    res.status(500).json({ error: 'Failed to lookup affiliate' });
  }
});

export default router;
