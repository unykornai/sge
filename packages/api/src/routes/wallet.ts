import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { erc20Abi, sgeidAbi } from '@sge/shared';
import { provider, checksumAddress } from '../services/evm';
import { env } from '../env';
import { logger } from '../services/logger';

const router = Router();

/**
 * GET /api/wallet/validate
 * Validate wallet and get basic info
 */
router.get('/wallet/validate', async (req: Request, res: Response) => {
  try {
    const address = req.query.address as string;

    if (!address) {
      return res.status(400).json({ error: 'Address required' });
    }

    // Check if valid address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.json({
        valid: false,
        error: 'Invalid Ethereum address format',
      });
    }

    const checksummed = checksumAddress(address);

    // Check if it's a contract
    const code = await provider.getCode(checksummed);
    const isContract = code !== '0x';

    res.json({
      valid: true,
      address: checksummed,
      isContract,
      warning: isContract ? 'This appears to be a contract address' : null,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Wallet validate error');
    res.status(500).json({ error: 'Validation failed' });
  }
});

/**
 * GET /api/wallet/balances
 * Get token balances for wallet
 */
router.get('/wallet/balances', async (req: Request, res: Response) => {
  try {
    const address = req.query.address as string;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const checksummed = checksumAddress(address);

    // Fetch balances in parallel
    const sgeToken = new ethers.Contract(env.SGE_TOKEN, erc20Abi, provider);
    const usdc = new ethers.Contract(env.USDC, erc20Abi, provider);
    const usdt = new ethers.Contract(env.USDT, erc20Abi, provider);

    const [ethBalance, sgeBalance, usdcBalance, usdtBalance] = await Promise.all([
      provider.getBalance(checksummed),
      sgeToken.balanceOf(checksummed).catch(() => BigInt(0)),
      usdc.balanceOf(checksummed).catch(() => BigInt(0)),
      usdt.balanceOf(checksummed).catch(() => BigInt(0)),
    ]);

    res.json({
      address: checksummed,
      balances: {
        eth: {
          raw: ethBalance.toString(),
          formatted: ethers.formatEther(ethBalance),
          decimals: 18,
        },
        sge: {
          raw: sgeBalance.toString(),
          formatted: ethers.formatUnits(sgeBalance, 18),
          decimals: 18,
        },
        usdc: {
          raw: usdcBalance.toString(),
          formatted: ethers.formatUnits(usdcBalance, 6),
          decimals: 6,
        },
        usdt: {
          raw: usdtBalance.toString(),
          formatted: ethers.formatUnits(usdtBalance, 6),
          decimals: 6,
        },
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Wallet balances error');
    res.status(500).json({ error: 'Failed to fetch balances' });
  }
});

/**
 * GET /api/wallet/nft
 * Check if wallet has SGE-ID NFT
 */
router.get('/wallet/nft', async (req: Request, res: Response) => {
  try {
    const address = req.query.address as string;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const checksummed = checksumAddress(address);

    // Check if SGEID contract is configured
    if (!env.SGEID_ADDRESS || env.SGEID_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return res.json({
        address: checksummed,
        hasNft: false,
        tokenId: null,
        error: 'SGEID contract not deployed',
      });
    }

    const sgeid = new ethers.Contract(env.SGEID_ADDRESS, sgeidAbi, provider);

    try {
      const balance = await sgeid.balanceOf(checksummed);
      const hasNft = balance > 0;

      let tokenId: number | null = null;
      if (hasNft) {
        // Get first token owned
        tokenId = Number(await sgeid.tokenOfOwnerByIndex(checksummed, 0));
      }

      res.json({
        address: checksummed,
        hasNft,
        tokenId,
        balance: Number(balance),
      });
    } catch (e) {
      // Contract may not have tokenOfOwnerByIndex
      res.json({
        address: checksummed,
        hasNft: false,
        tokenId: null,
        error: 'Could not query NFT contract',
      });
    }
  } catch (error: any) {
    logger.error({ error: error.message }, 'Wallet NFT error');
    res.status(500).json({ error: 'Failed to check NFT ownership' });
  }
});

/**
 * GET /api/gas-price
 * Get current gas prices
 */
router.get('/gas-price', async (req: Request, res: Response) => {
  try {
    const feeData = await provider.getFeeData();

    res.json({
      gasPrice: feeData.gasPrice?.toString() || null,
      maxFeePerGas: feeData.maxFeePerGas?.toString() || null,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() || null,
      gasPriceGwei: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : null,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Gas price error');
    res.status(500).json({ error: 'Failed to fetch gas price' });
  }
});

/**
 * GET /api/block
 * Get current block info
 */
router.get('/block', async (req: Request, res: Response) => {
  try {
    const block = await provider.getBlock('latest');

    if (!block) {
      return res.status(500).json({ error: 'Could not fetch block' });
    }

    res.json({
      number: block.number,
      timestamp: block.timestamp,
      hash: block.hash,
      baseFeePerGas: block.baseFeePerGas?.toString() || null,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Block info error');
    res.status(500).json({ error: 'Failed to fetch block' });
  }
});

export default router;
