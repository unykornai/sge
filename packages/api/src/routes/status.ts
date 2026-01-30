import { Router, Request, Response } from 'express';
import { getMintRecord } from '../services/sgeid';
import { hasPaid } from '../services/commerce';
import { checksumAddress } from '../services/evm';
import { logger } from '../services/logger';

const router = Router();

router.get('/status', async (req: Request, res: Response) => {
  try {
    const wallet = req.query.wallet as string;
    
    if (!wallet) {
      return res.status(400).json({
        error: 'MISSING_WALLET',
        message: 'Wallet address is required',
      });
    }
    
    let checksummedWallet: string;
    try {
      checksummedWallet = checksumAddress(wallet);
    } catch (error) {
      return res.status(400).json({
        error: 'INVALID_ADDRESS',
        message: 'Invalid Ethereum address',
      });
    }
    
    const mintRecord = await getMintRecord(checksummedWallet);
    const paid = await hasPaid(checksummedWallet);
    
    res.json({
      wallet: checksummedWallet,
      paid,
      minted: !!mintRecord,
      tokenId: mintRecord?.tokenId || null,
      mintTxHash: mintRecord?.txHash || null,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Status check error');
    res.status(500).json({
      error: 'STATUS_CHECK_FAILED',
      message: error.message,
    });
  }
});

export default router;
