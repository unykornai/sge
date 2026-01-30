/**
 * Mock API Handlers (MSW)
 * 
 * Service worker handlers for GitHub Pages demo mode.
 * Simulates the full SGE API without a real backend.
 */

import { http, HttpResponse, delay } from 'msw';

// In-memory state for demo
const demoState = {
  users: new Map<string, any>(),
  mints: new Map<string, any>(),
  claims: new Map<string, any>(),
  affiliates: new Map<string, any>(),
  intents: new Map<string, any>(),
  commissions: new Map<string, any>(),
  chargeCounter: 1,
  intentCounter: 1,
};

// Demo wallet addresses
const DEMO_WALLETS = {
  user1: '0xDemo1234567890abcdef1234567890abcdef1234',
  affiliate: '0xAffil123456789abcdef123456789abcdef1234',
  treasury: '0xTreas123456789abcdef123456789abcdef1234',
};

// Helper to generate IDs
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Simulate network delay
const withDelay = async <T>(data: T, ms = 300): Promise<T> => {
  await delay(ms);
  return data;
};

export const handlers = [
  // =========================================================================
  // Health Check
  // =========================================================================
  http.get('*/healthz', async () => {
    return HttpResponse.json(await withDelay({
      status: 'ok',
      mode: 'demo',
      timestamp: new Date().toISOString(),
      services: {
        database: 'mock',
        redis: 'mock',
        blockchain: 'mock',
      },
    }));
  }),

  // =========================================================================
  // User Status
  // =========================================================================
  http.get('*/api/status', async ({ request }) => {
    const url = new URL(request.url);
    const wallet = url.searchParams.get('wallet');
    
    if (!wallet) {
      return HttpResponse.json({ error: 'Wallet required' }, { status: 400 });
    }

    const user = demoState.users.get(wallet.toLowerCase()) || {
      wallet,
      hasSGEID: false,
      tokenId: null,
      balance: '0',
      claimable: '1000000000000000000000', // 1000 SGE
      lastClaim: null,
    };

    return HttpResponse.json(await withDelay(user));
  }),

  // =========================================================================
  // Registration (Gasless Mint)
  // =========================================================================
  http.post('*/api/register', async ({ request }) => {
    const body = await request.json() as any;
    const wallet = body.wallet?.toLowerCase();

    if (!wallet) {
      return HttpResponse.json({ error: 'Wallet required' }, { status: 400 });
    }

    // Check if already registered
    if (demoState.users.has(wallet)) {
      return HttpResponse.json({ error: 'Already registered' }, { status: 409 });
    }

    // Simulate mint
    const tokenId = demoState.mints.size + 1;
    const txHash = `0x${Math.random().toString(16).slice(2)}`;

    const user = {
      wallet,
      hasSGEID: true,
      tokenId,
      balance: '0',
      claimable: '1000000000000000000000',
      registeredAt: new Date().toISOString(),
    };

    demoState.users.set(wallet, user);
    demoState.mints.set(wallet, { tokenId, txHash });

    return HttpResponse.json(await withDelay({
      success: true,
      tokenId,
      txHash,
      message: 'Demo: SGE-ID minted successfully',
    }));
  }),

  // =========================================================================
  // Coinbase Commerce
  // =========================================================================
  http.post('*/api/commerce/charge', async ({ request }) => {
    // Consume request body for realism, but we don't need its fields in demo mode.
    await request.json().catch(() => undefined);
    const chargeId = `demo-charge-${demoState.chargeCounter++}`;

    return HttpResponse.json(await withDelay({
      id: chargeId,
      code: chargeId,
      name: 'SGE-ID Membership',
      description: 'SuperGreen Energy ID NFT',
      pricing: {
        local: { amount: '49.99', currency: 'USD' },
        ethereum: { amount: '0.02', currency: 'ETH' },
      },
      hosted_url: `https://commerce.coinbase.com/charges/${chargeId}`,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      timeline: [{ status: 'NEW', time: new Date().toISOString() }],
    }));
  }),

  http.get('*/api/commerce/charge/:code', async ({ params }) => {
    const { code } = params;
    
    // Simulate charge progression
    const rand = Math.random();
    let status = 'PENDING';
    if (rand > 0.7) status = 'COMPLETED';
    else if (rand > 0.3) status = 'PENDING';
    else status = 'NEW';

    return HttpResponse.json(await withDelay({
      id: code,
      code,
      status,
      timeline: [
        { status: 'NEW', time: new Date(Date.now() - 60000).toISOString() },
        { status, time: new Date().toISOString() },
      ],
    }));
  }),

  // =========================================================================
  // Claims
  // =========================================================================
  http.get('*/api/claim/info', async ({ request }) => {
    const url = new URL(request.url);
    const wallet = url.searchParams.get('wallet')?.toLowerCase();

    if (!wallet) {
      return HttpResponse.json({ error: 'Wallet required' }, { status: 400 });
    }

    const user = demoState.users.get(wallet);
    if (!user?.hasSGEID) {
      return HttpResponse.json({
        eligible: false,
        reason: 'No SGE-ID found',
      });
    }

    return HttpResponse.json(await withDelay({
      eligible: true,
      claimable: '1000000000000000000000',
      claimableFormatted: '1,000 SGE',
      vestingSchedule: {
        immediate: '250000000000000000000',
        vested: '750000000000000000000',
        vestingEnd: new Date(Date.now() + 90 * 24 * 3600000).toISOString(),
      },
      nextClaimDate: null,
    }));
  }),

  http.post('*/api/claim/prepare', async ({ request }) => {
    await request.json().catch(() => undefined);
    
    return HttpResponse.json(await withDelay({
      success: true,
      claimId: generateId('claim'),
      transactions: [
        {
          to: '0xClaimVault000000000000000000000000000000',
          data: '0x...',
          value: '0',
          description: 'Claim SGE tokens',
        },
      ],
    }));
  }),

  http.post('*/api/claim/record', async ({ request }) => {
    const body = (await request.json()) as { wallet?: string; amount?: unknown; txHash?: string };
    const claimId = generateId('claim');

    demoState.claims.set(claimId, {
      id: claimId,
      wallet: body.wallet ?? '0x0000000000000000000000000000000000000000',
      amount: String(body.amount ?? '0'),
      txHash: String(body.txHash ?? '0x'),
      timestamp: new Date().toISOString(),
    });

    return HttpResponse.json(await withDelay({
      success: true,
      claimId,
      message: 'Claim recorded successfully',
    }));
  }),

  // =========================================================================
  // Enterprise API v2 - Affiliates
  // =========================================================================
  http.post('*/api/v2/affiliates/register', async ({ request }) => {
    const body = await request.json() as any;
    const affiliateId = generateId('aff');
    const referralCode = `SGE${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const affiliate = {
      id: affiliateId,
      wallet: body.wallet,
      referralCode,
      tier: 1,
      parentId: body.referredBy || null,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    demoState.affiliates.set(affiliateId, affiliate);

    return HttpResponse.json(await withDelay({
      success: true,
      affiliate,
    }));
  }),

  http.get('*/api/v2/affiliates/tree', async () => {
    const affiliates = Array.from(demoState.affiliates.values());
    
    // Build demo tree
    return HttpResponse.json(await withDelay({
      tree: affiliates.map(a => ({
        ...a,
        children: [],
        stats: {
          directReferrals: Math.floor(Math.random() * 10),
          totalDownline: Math.floor(Math.random() * 50),
          totalVolume: (Math.random() * 10000).toFixed(2),
        },
      })),
    }));
  }),

  http.get('*/api/v2/affiliates/:id/stats', async ({ params }) => {
    const { id } = params;
    
    return HttpResponse.json(await withDelay({
      affiliateId: id,
      stats: {
        directReferrals: Math.floor(Math.random() * 20),
        totalDownline: Math.floor(Math.random() * 100),
        totalVolume: (Math.random() * 50000).toFixed(2),
        pendingCommissions: (Math.random() * 1000).toFixed(2),
        paidCommissions: (Math.random() * 5000).toFixed(2),
        conversionRate: (Math.random() * 30 + 10).toFixed(1),
      },
    }));
  }),

  // =========================================================================
  // Enterprise API v2 - Intents
  // =========================================================================
  http.post('*/api/v2/users/register', async ({ request }) => {
    const body = await request.json() as any;
    const intentId = generateId('intent');

    const intent = {
      id: intentId,
      type: 'REGISTER',
      wallet: body.wallet,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    demoState.intents.set(intentId, intent);

    // Simulate async processing
    setTimeout(() => {
      const i = demoState.intents.get(intentId);
      if (i) {
        i.status = 'COMPLETED';
        i.completedAt = new Date().toISOString();
      }
    }, 2000);

    return HttpResponse.json(await withDelay({
      success: true,
      intentId,
      status: 'PENDING',
      message: 'Registration intent queued',
    }));
  }),

  http.post('*/api/v2/claims', async ({ request }) => {
    const body = await request.json() as any;
    const intentId = generateId('intent');

    const intent = {
      id: intentId,
      type: 'CLAIM',
      wallet: body.wallet,
      amount: body.amount,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    demoState.intents.set(intentId, intent);

    return HttpResponse.json(await withDelay({
      success: true,
      intentId,
      status: 'PENDING',
    }));
  }),

  http.get('*/api/v2/claims/:id', async ({ params }) => {
    const { id } = params;
    const intent = demoState.intents.get(id as string);

    if (!intent) {
      return HttpResponse.json({ error: 'Intent not found' }, { status: 404 });
    }

    return HttpResponse.json(await withDelay(intent));
  }),

  // =========================================================================
  // Enterprise API v2 - Admin
  // =========================================================================
  http.get('*/api/v2/enterprise/ledger/balance', async () => {
    return HttpResponse.json(await withDelay({
      balances: [
        { account: 'TREASURY', asset: 'SGE', balance: '1000000000000000000000000' },
        { account: 'TREASURY', asset: 'ETH', balance: '50000000000000000000' },
        { account: 'COMMISSIONS', asset: 'SGE', balance: '25000000000000000000000' },
        { account: 'PENDING_PAYOUTS', asset: 'SGE', balance: '5000000000000000000000' },
      ],
    }));
  }),

  http.get('*/api/v2/enterprise/audit', async () => {
    return HttpResponse.json(await withDelay({
      entries: [
        {
          id: '1',
          action: 'INTENT_CREATED',
          actor: DEMO_WALLETS.user1,
          target: 'intent-123',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '2',
          action: 'SETTLEMENT_COMPLETED',
          actor: 'SYSTEM',
          target: 'settlement-456',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: '3',
          action: 'COMMISSION_CREDITED',
          actor: 'SYSTEM',
          target: DEMO_WALLETS.affiliate,
          metadata: { amount: '100 SGE' },
          timestamp: new Date(Date.now() - 900000).toISOString(),
        },
      ],
      total: 3,
    }));
  }),

  // =========================================================================
  // Admin API
  // =========================================================================
  http.get('*/api/admin/stats', async () => {
    return HttpResponse.json(await withDelay({
      totalUsers: demoState.users.size + 1247,
      totalMints: demoState.mints.size + 1089,
      totalClaims: demoState.claims.size + 892,
      totalVolume: '4,567,890 SGE',
      activeAffiliates: demoState.affiliates.size + 156,
      pendingPayouts: 23,
      systemHealth: 'healthy',
    }));
  }),

  http.get('*/api/admin/stats/timeseries', async ({ request }) => {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7', 10);

    const timeseries = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Generate realistic growth trend
      const dayIndex = days - i;
      timeseries.push({
        date: dateStr,
        registrations: Math.floor(Math.random() * 30) + dayIndex * 2 + 10,
        claims: Math.floor(Math.random() * 20) + dayIndex + 5,
      });
    }

    return HttpResponse.json(await withDelay({
      summary: {
        totalMints: demoState.mints.size + 1247,
        totalClaims: demoState.claims.size + 892,
      },
      timeseries,
    }));
  }),

  // =========================================================================
  // Wallet Utilities
  // =========================================================================
  http.get('*/api/wallet/validate', async ({ request }) => {
    const url = new URL(request.url);
    const address = url.searchParams.get('address');
    
    const valid = /^0x[a-fA-F0-9]{40}$/.test(address || '');
    
    return HttpResponse.json(await withDelay({ valid }));
  }),

  http.get('*/api/gas-price', async () => {
    return HttpResponse.json(await withDelay({
      fast: '25',
      standard: '20',
      slow: '15',
      baseFee: '18',
      timestamp: new Date().toISOString(),
    }));
  }),
];

export default handlers;
