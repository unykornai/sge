import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ethers } from 'ethers';
import { claimAbi, erc20Abi } from '@sge/shared';
import { provider, checksumAddress, etherscanTx } from '../services/evm';
import { env } from '../env';
import { logger } from '../services/logger';
import { getMintRecord } from '../services/sgeid';
import { upsertByKey, getByKey } from '../services/storage';

const router = Router();

const CLAIMS_FILE = 'claims.json';

interface ClaimRecord {
  tokenId: number;
  tokenType: 'USDC' | 'USDT';
  amount: string;
  txHash: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
}

const claimSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  tokenType: z.enum(['USDC', 'USDT']),
});

/**
 * GET /api/claim/info
 * Get claim eligibility and SGE balance for wallet
 */
router.get('/claim/info', async (req: Request, res: Response) => {
  try {
    const wallet = req.query.wallet as string;
    
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const checksummed = checksumAddress(wallet);

    // Check if wallet has SGE-ID NFT
    const mintRecord = await getMintRecord(checksummed);
    const hasSgeId = !!mintRecord;

    // Get SGE token balance
    const sgeToken = new ethers.Contract(env.SGE_TOKEN, erc20Abi, provider);
    const sgeBalance = await sgeToken.balanceOf(checksummed);

    // Get claim contract info
    const claimContract = new ethers.Contract(env.SGE_CLAIM, claimAbi, provider);
    
    let claimableAmount = BigInt(0);
    let hasClaimed = false;

    try {
      // Check if already claimed
      hasClaimed = await claimContract.hasClaimed(checksummed);
      
      if (!hasClaimed && sgeBalance > 0) {
        // Get claimable amount based on SGE balance
        claimableAmount = await claimContract.getClaimableAmount(checksummed);
      }
    } catch (e) {
      // Claim contract may not be deployed or may have different interface
      logger.debug({ error: (e as Error).message }, 'Claim contract query failed');
    }

    // Get fee from env
    const feeUsd = env.FEE_USD;

    res.json({
      wallet: checksummed,
      hasSgeId,
      tokenId: mintRecord?.tokenId || null,
      sgeBalance: sgeBalance.toString(),
      sgeBalanceFormatted: ethers.formatUnits(sgeBalance, 18),
      claimableAmount: claimableAmount.toString(),
      claimableFormatted: ethers.formatUnits(claimableAmount, 6), // USDC/USDT have 6 decimals
      hasClaimed,
      feeUsd,
      eligible: hasSgeId && sgeBalance > 0 && !hasClaimed,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Claim info error');
    res.status(500).json({ error: 'Failed to fetch claim info' });
  }
});

/**
 * POST /api/claim/prepare
 * Prepare claim transaction data for client signing
 * (Used for USDT reset-to-zero allowance pattern)
 */
router.post('/claim/prepare', async (req: Request, res: Response) => {
  try {
    const parsed = claimSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        details: parsed.error.issues,
      });
    }

    const { wallet, tokenType } = parsed.data;
    const checksummed = checksumAddress(wallet);

    // Token addresses
    const tokenAddress = tokenType === 'USDC' ? env.USDC : env.USDT;
    const spender = env.SGE_CLAIM;

    // Get current allowance
    const token = new ethers.Contract(tokenAddress, erc20Abi, provider);
    const currentAllowance = await token.allowance(checksummed, spender);

    // Fee in token decimals (6 for both USDC/USDT)
    const feeAmount = ethers.parseUnits(env.FEE_USD.toString(), 6);

    // Check if USDT reset needed (non-zero allowance that's insufficient)
    const needsReset = tokenType === 'USDT' && 
                       currentAllowance > 0 && 
                       currentAllowance < feeAmount;

    // Prepare transaction data
    const iface = new ethers.Interface(erc20Abi);

    const response: any = {
      wallet: checksummed,
      tokenType,
      tokenAddress,
      spender,
      feeAmount: feeAmount.toString(),
      feeFormatted: env.FEE_USD.toString(),
      currentAllowance: currentAllowance.toString(),
      needsApproval: currentAllowance < feeAmount,
      needsReset,
      transactions: [],
    };

    // Step 1: Reset to zero if needed (USDT only)
    if (needsReset) {
      response.transactions.push({
        step: 1,
        description: 'Reset USDT allowance to zero (required by USDT)',
        to: tokenAddress,
        data: iface.encodeFunctionData('approve', [spender, 0]),
        value: '0',
      });
    }

    // Step 2: Approve fee amount
    if (currentAllowance < feeAmount) {
      response.transactions.push({
        step: needsReset ? 2 : 1,
        description: `Approve ${env.FEE_USD} ${tokenType} for claim fee`,
        to: tokenAddress,
        data: iface.encodeFunctionData('approve', [spender, feeAmount]),
        value: '0',
      });
    }

    // Step 3: Claim (always last)
    const claimIface = new ethers.Interface(claimAbi);
    response.transactions.push({
      step: response.transactions.length + 1,
      description: 'Claim SGE tokens',
      to: spender,
      data: claimIface.encodeFunctionData('claim', [tokenType === 'USDC' ? 0 : 1]),
      value: '0',
    });

    res.json(response);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Claim prepare error');
    res.status(500).json({ error: 'Failed to prepare claim' });
  }
});

/**
 * POST /api/claim/record
 * Record a claim after client-side transaction (for tracking)
 */
router.post('/claim/record', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      tokenType: z.enum(['USDC', 'USDT']),
      txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
      amount: z.string(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.issues });
    }

    const { wallet, tokenType, txHash, amount } = parsed.data;
    const checksummed = checksumAddress(wallet);

    // Get token ID
    const mintRecord = await getMintRecord(checksummed);
    const tokenId = mintRecord?.tokenId || 0;

    const record: ClaimRecord = {
      tokenId,
      tokenType,
      amount,
      txHash,
      timestamp: Date.now(),
      status: 'pending',
    };

    await upsertByKey(CLAIMS_FILE, checksummed, record);

    logger.info({ wallet: checksummed, txHash, tokenType }, 'Claim recorded');

    res.json({
      success: true,
      record,
      etherscanUrl: etherscanTx(txHash),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Claim record error');
    res.status(500).json({ error: 'Failed to record claim' });
  }
});

/**
 * GET /api/claim/history
 * Get claim history for wallet
 */
router.get('/claim/history', async (req: Request, res: Response) => {
  try {
    const wallet = req.query.wallet as string;
    
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const checksummed = checksumAddress(wallet);
    const record = await getByKey<ClaimRecord>(CLAIMS_FILE, checksummed);

    res.json({
      wallet: checksummed,
      claim: record || null,
      hasClaimed: !!record,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Claim history error');
    res.status(500).json({ error: 'Failed to fetch claim history' });
  }
});

export default router;
