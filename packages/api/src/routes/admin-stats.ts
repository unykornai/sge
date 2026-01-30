/**
 * Admin Statistics API
 * 
 * Provides metrics for charts and dashboards:
 * - Total registrations, claims, payouts
 * - Time-series data for charts
 * - Top affiliates
 * - Commission summaries
 */

import { Router } from 'express';
import { db } from '../lib/db';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/admin/stats
 * 
 * Returns summary statistics and time-series data for charts
 */
router.get('/stats', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = parseInt(String(days), 10);

    // In MOCK_MODE, return deterministic mock data
    if (process.env.MOCK_MODE === 'true') {
      return res.json(getMockStats(daysNum));
    }

    // Real mode: query database
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);

    // Get totals
    const [
      totalMints,
      totalClaims,
      totalAffiliates,
      totalCommissionsPaid,
    ] = await Promise.all([
      db.user.count(),
      db.settlement.count({ where: { status: 'CONFIRMED' } }),
      db.affiliate.count({ where: { status: 'ACTIVE' } }),
      db.commission.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    // Get time-series data
    const timeseries = await getTimeSeries(cutoffDate);

    // Get top affiliates
    const topAffiliates = await getTopAffiliates();

    res.json({
      summary: {
        totalMints,
        totalClaims,
        totalAffiliates,
        totalCommissionsPaid: totalCommissionsPaid._sum.amount || 0,
      },
      timeseries,
      topAffiliates,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch admin stats');
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * Get time-series data for charts (registrations and claims per day)
 */
async function getTimeSeries(cutoffDate: Date) {
  const users = await db.user.findMany({
    where: { createdAt: { gte: cutoffDate } },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const settlements = await db.settlement.findMany({
    where: {
      status: 'CONFIRMED',
      createdAt: { gte: cutoffDate },
    },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by day
  const dayMap = new Map<string, { registrations: number; claims: number }>();

  users.forEach((user) => {
    const day = user.createdAt.toISOString().split('T')[0];
    const existing = dayMap.get(day) || { registrations: 0, claims: 0 };
    existing.registrations++;
    dayMap.set(day, existing);
  });

  settlements.forEach((settlement) => {
    const day = settlement.createdAt.toISOString().split('T')[0];
    const existing = dayMap.get(day) || { registrations: 0, claims: 0 };
    existing.claims++;
    dayMap.set(day, existing);
  });

  // Convert to array and sort
  return Array.from(dayMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get top affiliates by total commissions earned
 */
async function getTopAffiliates() {
  const affiliates = await db.affiliate.findMany({
    where: { status: 'ACTIVE' },
    include: {
      _count: {
        select: { referredUsers: true },
      },
      commissions: {
        where: { status: { in: ['PAYABLE', 'PAID'] } },
      },
    },
    take: 10,
  });

  return affiliates
    .map((affiliate) => ({
      id: affiliate.id,
      code: affiliate.referralCode,
      wallet: affiliate.wallet,
      referrals: affiliate._count.referredUsers,
      totalEarned: affiliate.commissions.reduce((sum, c) => sum + c.amount, 0),
    }))
    .sort((a, b) => b.totalEarned - a.totalEarned);
}

/**
 * Mock data for MOCK_MODE or demo purposes
 */
function getMockStats(days: number) {
  const timeseries: any[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    timeseries.push({
      date: dateStr,
      registrations: Math.floor(Math.random() * 50) + 10,
      claims: Math.floor(Math.random() * 30) + 5,
    });
  }

  return {
    summary: {
      totalMints: 1247,
      totalClaims: 892,
      totalAffiliates: 156,
      totalCommissionsPaid: 124500, // $1,245.00 in cents
    },
    timeseries,
    topAffiliates: [
      {
        id: 'aff_1',
        code: 'ALPHA',
        wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        referrals: 45,
        totalEarned: 45000, // $450
      },
      {
        id: 'aff_2',
        code: 'BETA',
        wallet: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
        referrals: 38,
        totalEarned: 38000,
      },
      {
        id: 'aff_3',
        code: 'GAMMA',
        wallet: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
        referrals: 32,
        totalEarned: 32000,
      },
    ],
  };
}

export default router;
