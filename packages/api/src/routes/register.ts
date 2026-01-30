import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { mintTo } from '../services/sgeid';
import { hasPaid } from '../services/commerce';
import { requireKyc } from '../services/guards';
import { checksumAddress } from '../services/evm';
import { logger } from '../services/logger';
import { env } from '../env';

const router = Router();

const registerSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

router.post('/register', requireKyc, async (req: Request, res: Response) => {
  try {
    // Validate input
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        details: parsed.error.issues,
      });
    }
    
    const { wallet } = parsed.data;
    const checksummedWallet = checksumAddress(wallet);
    
    // Check Commerce payment gate
    if (env.COMMERCE_REQUIRED) {
      const paid = await hasPaid(checksummedWallet);
      if (!paid) {
        return res.status(403).json({
          error: 'PAYMENT_REQUIRED',
          message: 'Payment required before minting. Please complete payment first.',
        });
      }
    }
    
    // Mint (idempotent)
    const result = await mintTo(checksummedWallet);
    
    logger.info({ wallet: checksummedWallet, tokenId: result.tokenId }, 'Register successful');
    
    res.json({
      tokenId: result.tokenId,
      txHash: result.txHash,
      etherscanUrl: result.etherscanUrl,
      message: 'SGE-ID NFT minted successfully (gas paid by relayer)',
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Register error');
    res.status(500).json({
      error: 'MINT_FAILED',
      message: error.message || 'Failed to mint SGE-ID NFT',
    });
  }
});

export default router;
