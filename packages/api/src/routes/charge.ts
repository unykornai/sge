import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../env';
import { logger } from '../services/logger';

const router = Router();

/**
 * POST /api/commerce/charge
 * Create a Coinbase Commerce charge for payment
 */
router.post('/commerce/charge', async (req: Request, res: Response) => {
  try {
    if (!env.COINBASE_COMMERCE_API_KEY) {
      return res.status(503).json({
        error: 'COMMERCE_NOT_CONFIGURED',
        message: 'Coinbase Commerce is not configured',
      });
    }

    const schema = z.object({
      wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet'),
      email: z.string().email().optional(),
      name: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        details: parsed.error.issues,
      });
    }

    const { wallet, email, name } = parsed.data;

    // Create charge via Coinbase Commerce API
    const chargeData = {
      name: 'SGE Energy Registration',
      description: 'Registration fee for SGE-ID NFT and access to SuperGreen Energy platform',
      pricing_type: 'fixed_price',
      local_price: {
        amount: env.FEE_USD.toString(),
        currency: 'USD',
      },
      metadata: {
        wallet: wallet.toLowerCase(),
        email: email || '',
        name: name || '',
        timestamp: Date.now().toString(),
      },
      redirect_url: `${env.APP_ORIGIN}/register?status=success`,
      cancel_url: `${env.APP_ORIGIN}/register?status=cancelled`,
    };

    const response = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': env.COINBASE_COMMERCE_API_KEY,
        'X-CC-Version': '2018-03-22',
      },
      body: JSON.stringify(chargeData),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ status: response.status, error }, 'Commerce charge creation failed');
      return res.status(500).json({
        error: 'CHARGE_CREATION_FAILED',
        message: 'Failed to create payment charge',
      });
    }

    const result = await response.json();
    const charge = result.data;

    logger.info({
      chargeId: charge.id,
      code: charge.code,
      wallet,
    }, 'Commerce charge created');

    res.json({
      chargeId: charge.id,
      code: charge.code,
      hostedUrl: charge.hosted_url,
      expiresAt: charge.expires_at,
      pricing: charge.pricing,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Commerce charge error');
    res.status(500).json({ error: 'Failed to create charge' });
  }
});

/**
 * GET /api/commerce/charge/:code
 * Get charge status
 */
router.get('/commerce/charge/:code', async (req: Request, res: Response) => {
  try {
    if (!env.COINBASE_COMMERCE_API_KEY) {
      return res.status(503).json({ error: 'COMMERCE_NOT_CONFIGURED' });
    }

    const { code } = req.params;

    const response = await fetch(`https://api.commerce.coinbase.com/charges/${code}`, {
      headers: {
        'X-CC-Api-Key': env.COINBASE_COMMERCE_API_KEY,
        'X-CC-Version': '2018-03-22',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'CHARGE_NOT_FOUND' });
      }
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    const charge = result.data;

    // Determine status from timeline
    const timeline = charge.timeline || [];
    const lastEvent = timeline[timeline.length - 1];
    const status = lastEvent?.status || 'NEW';

    res.json({
      code: charge.code,
      status,
      confirmed: status === 'COMPLETED',
      expired: status === 'EXPIRED',
      pending: ['NEW', 'PENDING', 'CREATED'].includes(status),
      hostedUrl: charge.hosted_url,
      metadata: charge.metadata,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Commerce charge status error');
    res.status(500).json({ error: 'Failed to fetch charge status' });
  }
});

export default router;
