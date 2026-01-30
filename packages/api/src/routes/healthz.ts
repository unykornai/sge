import { Router, Request, Response } from 'express';
import { provider, getSigner } from '../services/evm';
import { env } from '../env';
import { logger } from '../services/logger';
import { sgeidAbi } from '@sge/shared';

const router = Router();

router.get('/healthz', async (req: Request, res: Response) => {
  try {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    
    let signerAddress = 'NOT_CONFIGURED';
    let sgeidOwner = 'NOT_CONFIGURED';
    let hasSgeidCode = false;
    
    try {
      signerAddress = await getSigner().getAddress();

      // Verify SGEID has code (contract deployed) before calling owner()
      if (!/^0x0{40}$/i.test(env.SGEID_ADDRESS)) {
        const sgeidCode = await provider.getCode(env.SGEID_ADDRESS);
        hasSgeidCode = sgeidCode !== '0x' && sgeidCode.length > 2;
      }
      
      // Verify SGEID contract
      if (hasSgeidCode) {
        const sgeidContract = new (await import('ethers')).ethers.Contract(
          env.SGEID_ADDRESS,
          sgeidAbi,
          provider
        );
        sgeidOwner = await sgeidContract.owner();
      } else {
        sgeidOwner = 'NOT_DEPLOYED';
      }
    } catch (e: any) {
      logger.warn(`Health check signer error: ${e.message}`);
    }
    
    // Verify SGE_CLAIM has code (contract deployed)
    const claimCode = await provider.getCode(env.SGE_CLAIM);
    const hasClaimCode = claimCode !== '0x' && claimCode.length > 2;
    
    const ok = network.chainId === 1n && hasClaimCode && hasSgeidCode;
    
    const health = {
      ok,
      chainId: Number(network.chainId),
      blockNumber,
      signerAddress,
      sgeidAddress: env.SGEID_ADDRESS,
      sgeidOwner,
      claimAddress: env.SGE_CLAIM,
      hasClaimCode,
      hasSgeidCode,
    };
    
    if (!ok) {
      logger.warn(health, 'Health check failed');
      return res.status(503).json(health);
    }
    
    res.json(health);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Health check error');
    res.status(503).json({
      ok: false,
      error: error.message,
    });
  }
});

export default router;
