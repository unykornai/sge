import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ethers } from 'ethers';
import { env } from '../env';
import { logger } from '../services/logger';
import { readJson, writeJson, upsertByKey, getByKey } from '../services/storage';
import { getMintRecord } from '../services/sgeid';
import { hasPaid } from '../services/commerce';
import { getSigner, provider } from '../services/evm';

const router = Router();

// Simple API key auth middleware
const adminAuth = (req: Request, res: Response, next: Function) => {
  const apiKey = req.headers['x-admin-key'] as string;
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    return res.status(503).json({ error: 'Admin API not configured' });
  }

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

/**
 * GET /api/admin/stats
 * Get platform statistics
 */
router.get('/admin/stats', adminAuth, async (req: Request, res: Response) => {
  try {
    const mints = await readJson<Record<string, any>>('mints.json');
    const payments = await readJson<Record<string, any>>('payments.json');
    const claims = await readJson<Record<string, any>>('claims.json');
    const webhooks = await readJson<Record<string, any>>('webhooks.json');

    const mintCount = Object.keys(mints).length;
    const paymentCount = Object.keys(payments).length;
    const claimCount = Object.keys(claims).length;
    const webhookCount = Object.keys(webhooks).length;

    // Get relayer balance
    let relayerBalance = '0';
    let relayerAddress = '';
    try {
      const signer = getSigner();
      relayerAddress = await signer.getAddress();
      const balance = await provider.getBalance(relayerAddress);
      relayerBalance = ethers.formatEther(balance);
    } catch (e) {
      // Signer not available
    }

    res.json({
      totalMints: mintCount,
      totalPayments: paymentCount,
      totalClaims: claimCount,
      totalWebhooks: webhookCount,
      relayer: {
        address: relayerAddress,
        balanceEth: relayerBalance,
      },
      config: {
        feeUsd: env.FEE_USD,
        kycRequired: env.KYC_REQUIRED,
        commerceRequired: env.COMMERCE_REQUIRED,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Admin stats error');
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/admin/mints
 * List all mints
 */
router.get('/admin/mints', adminAuth, async (req: Request, res: Response) => {
  try {
    const mints = await readJson<Record<string, any>>('mints.json');
    
    const list = Object.entries(mints).map(([wallet, record]) => ({
      wallet,
      ...record,
    }));

    // Sort by timestamp descending
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    res.json({
      total: list.length,
      mints: list,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Admin mints error');
    res.status(500).json({ error: 'Failed to fetch mints' });
  }
});

/**
 * GET /api/admin/payments
 * List all payments
 */
router.get('/admin/payments', adminAuth, async (req: Request, res: Response) => {
  try {
    const payments = await readJson<Record<string, any>>('payments.json');
    
    const list = Object.entries(payments).map(([walletOrEmail, record]) => ({
      walletOrEmail,
      ...record,
    }));

    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    res.json({
      total: list.length,
      payments: list,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Admin payments error');
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

/**
 * POST /api/admin/payment/manual
 * Manually mark a wallet as paid (for testing or support)
 */
router.post('/admin/payment/manual', adminAuth, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      reason: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.issues });
    }

    const { wallet, reason } = parsed.data;
    const checksummed = ethers.getAddress(wallet);

    await upsertByKey('payments.json', checksummed, {
      paid: true,
      chargeId: 'MANUAL',
      reason: reason || 'Manual admin override',
      timestamp: Date.now(),
    });

    logger.info({ wallet: checksummed, reason }, 'Manual payment recorded');

    res.json({ success: true, wallet: checksummed });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Admin manual payment error');
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

/**
 * GET /api/admin/wallet/:address
 * Get full details for a specific wallet
 */
router.get('/admin/wallet/:address', adminAuth, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const checksummed = ethers.getAddress(address);

    const mint = await getMintRecord(checksummed);
    const paid = await hasPaid(checksummed);
    const claim = await getByKey('claims.json', checksummed);

    res.json({
      wallet: checksummed,
      hasMint: !!mint,
      mint: mint || null,
      hasPaid: paid,
      claim: claim || null,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Admin wallet lookup error');
    res.status(500).json({ error: 'Failed to fetch wallet details' });
  }
});

/**
 * POST /api/admin/fund-check
 * Check if relayer needs funding
 */
router.get('/admin/fund-check', adminAuth, async (req: Request, res: Response) => {
  try {
    const signer = getSigner();
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    const balanceEth = parseFloat(ethers.formatEther(balance));

    // Estimate mints remaining (assuming ~0.003 ETH per mint)
    const costPerMint = 0.003;
    const mintsRemaining = Math.floor(balanceEth / costPerMint);

    res.json({
      relayerAddress: address,
      balanceWei: balance.toString(),
      balanceEth: balanceEth.toFixed(6),
      mintsRemaining,
      needsFunding: balanceEth < 0.05,
      lowWarning: balanceEth < 0.1,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Admin fund check error');
    res.status(500).json({ error: 'Failed to check funds' });
  }
});

/**
 * GET /api/admin/stats/timeseries
 * Get time-series data for charts (registrations and claims)
 */
router.get('/admin/stats/timeseries', adminAuth, async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = parseInt(String(days), 10);

    // In MOCK_MODE, return deterministic mock data
    if (env.MOCK_MODE) {
      return res.json(getMockTimeSeriesStats(daysNum));
    }

    // Real mode: aggregate from JSON files
    const mints = await readJson<Record<string, any>>('mints.json');
    const claims = await readJson<Record<string, any>>('claims.json');

    const cutoffDate = Date.now() - (daysNum * 24 * 60 * 60 * 1000);
    
    // Group by day
    const dayMap = new Map<string, { registrations: number; claims: number }>();

    Object.entries(mints).forEach(([_, record]) => {
      if (record.timestamp && record.timestamp >= cutoffDate) {
        const day = new Date(record.timestamp).toISOString().split('T')[0];
        const existing = dayMap.get(day) || { registrations: 0, claims: 0 };
        existing.registrations++;
        dayMap.set(day, existing);
      }
    });

    Object.entries(claims).forEach(([_, record]) => {
      if (record.timestamp && record.timestamp >= cutoffDate) {
        const day = new Date(record.timestamp).toISOString().split('T')[0];
        const existing = dayMap.get(day) || { registrations: 0, claims: 0 };
        existing.claims++;
        dayMap.set(day, existing);
      }
    });

    // Convert to array and sort
    const timeseries = Array.from(dayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      summary: {
        totalMints: Object.keys(mints).length,
        totalClaims: Object.keys(claims).length,
      },
      timeseries,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Admin stats timeseries error');
    res.status(500).json({ error: 'Failed to fetch timeseries stats' });
  }
});

/**
 * Mock time-series data generator
 */
function getMockTimeSeriesStats(days: number) {
  const timeseries: any[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Generate realistic mock data with growth trend
    const dayIndex = days - i;
    timeseries.push({
      date: dateStr,
      registrations: Math.floor(Math.random() * 30) + dayIndex * 2 + 10,
      claims: Math.floor(Math.random() * 20) + dayIndex + 5,
    });
  }

  return {
    summary: {
      totalMints: 1247,
      totalClaims: 892,
    },
    timeseries,
  };
}

export default router;
