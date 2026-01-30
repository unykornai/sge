import { ethers } from 'ethers';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { env } from '../env';
import { logger } from './logger';

// Ethers provider and signer (for writes)
export const provider = new ethers.JsonRpcProvider(env.ETH_RPC_HTTPS);

// Create signer lazily to handle invalid private key at startup
let _signer: ethers.Wallet | null = null;

export function getSigner(): ethers.Wallet {
  if (!_signer) {
    try {
      _signer = new ethers.Wallet(env.RELAYER_PRIVATE_KEY, provider);
    } catch (e: any) {
      throw new Error(
        `Invalid RELAYER_PRIVATE_KEY. Please configure a valid private key in .env\n` +
        `Error: ${e.message}`
      );
    }
  }
  return _signer;
}

// For backward compatibility - will throw on access if key is invalid
export const signer = {
  get address() { return getSigner().address; },
  getAddress: () => getSigner().getAddress(),
};

// Viem public client (for reads)
export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(env.ETH_RPC_HTTPS),
});

/**
 * Verify we're on mainnet
 */
export async function verifyMainnet(): Promise<void> {
  const network = await provider.getNetwork();
  if (network.chainId !== 1n) {
    throw new Error(
      `CRITICAL: Not connected to Ethereum mainnet! ` +
      `Current chainId: ${network.chainId}, expected: 1`
    );
  }
}

/**
 * Checksum an address
 */
export function checksumAddress(addr: string): string {
  return ethers.getAddress(addr);
}

/**
 * Format Etherscan transaction URL
 */
export function etherscanTx(hash: string): string {
  return `https://etherscan.io/tx/${hash}`;
}

/**
 * Initialize EVM service
 */
export async function initEvm(): Promise<void> {
  logger.info('Initializing EVM service...');
  
  await verifyMainnet();
  
  const blockNumber = await provider.getBlockNumber();
  const signerAddress = await signer.getAddress();
  const balance = await provider.getBalance(signerAddress);
  
  logger.info({
    chainId: 1,
    blockNumber,
    signer: signerAddress,
    balance: ethers.formatEther(balance),
  }, 'EVM service initialized');

  if (!/^0x0{40}$/i.test(env.SGEID_ADDRESS)) {
    const sgeidCode = await provider.getCode(env.SGEID_ADDRESS);
    const hasSgeidCode = sgeidCode !== '0x' && sgeidCode.length > 2;
    if (!hasSgeidCode) {
      logger.warn({ sgeidAddress: env.SGEID_ADDRESS }, 'SGEID contract not deployed (no code) - API will run in LIMITED MODE');
    }
  }
  
  if (balance < ethers.parseEther('0.01')) {
    logger.warn('⚠️  Relayer balance is low! Ensure sufficient ETH for gas.');
  }
}
