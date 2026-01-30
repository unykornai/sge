import { ethers } from 'ethers';
import { sgeidAbi } from '@sge/shared';
import { env } from '../env';
import { provider, getSigner, checksumAddress, etherscanTx, verifyMainnet } from './evm';
import { getByKey, upsertByKey } from './storage';
import { logger } from './logger';

const MINTS_FILE = 'mints.json';

interface MintRecord {
  tokenId: number;
  txHash: string;
  timestamp: number;
}

/**
 * Get SGEID contract instance
 */
function getContract() {
  return new ethers.Contract(env.SGEID_ADDRESS, sgeidAbi, getSigner());
}

/**
 * Verify relayer owns the SGEID contract
 */
export async function verifyOwnership(): Promise<void> {
  if (/^0x0{40}$/i.test(env.SGEID_ADDRESS)) {
    throw new Error(
      'SGEID_ADDRESS is the zero address. Configure a deployed SGEID contract address in .env'
    );
  }

  const code = await provider.getCode(env.SGEID_ADDRESS);
  const hasCode = code !== '0x' && code.length > 2;
  if (!hasCode) {
    throw new Error(
      `SGEID_ADDRESS has no contract code on-chain: ${env.SGEID_ADDRESS}. ` +
      `Check your .env and ETH_RPC_HTTPS network.`
    );
  }

  const contract = getContract();
  const owner = await contract.owner();
  const signerAddress = await getSigner().getAddress();
  
  if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error(
      `CRITICAL: Relayer is not SGEID contract owner!\n` +
      `  Contract owner: ${owner}\n` +
      `  Relayer address: ${signerAddress}\n` +
      `  Minting will fail until ownership is transferred.`
    );
  }
  
  logger.info({ owner, signer: signerAddress }, 'SGEID ownership verified');
}

/**
 * Mint SGE-ID NFT to wallet (idempotent)
 */
export async function mintTo(wallet: string): Promise<MintRecord & { etherscanUrl: string }> {
  const checksummedWallet = checksumAddress(wallet);
  
  // Check if already minted (idempotency)
  const existing = await getByKey<MintRecord>(MINTS_FILE, checksummedWallet);
  if (existing) {
    logger.info({ wallet: checksummedWallet, tokenId: existing.tokenId }, 'Mint already exists');
    return {
      ...existing,
      etherscanUrl: etherscanTx(existing.txHash),
    };
  }
  
  // Verify mainnet before write
  await verifyMainnet();
  
  logger.info({ wallet: checksummedWallet }, 'Minting SGE-ID NFT...');
  
  const contract = getContract();
  const tx = await contract.mintTo(checksummedWallet);
  
  logger.info({ txHash: tx.hash }, 'Transaction submitted, waiting for confirmation...');
  
  const receipt = await tx.wait();
  
  // Parse tokenId from Transfer event
  let tokenId: number | null = null;
  
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });
      
      if (parsed && parsed.name === 'Transfer') {
        tokenId = Number(parsed.args.tokenId);
        break;
      }
    } catch (e) {
      // Not our event
    }
  }
  
  if (!tokenId) {
    // Fallback: query total supply if event parsing failed
    const totalSupply = await contract.totalSupply();
    tokenId = Number(totalSupply);
  }
  
  const record: MintRecord = {
    tokenId,
    txHash: tx.hash,
    timestamp: Date.now(),
  };
  
  await upsertByKey(MINTS_FILE, checksummedWallet, record);
  
  logger.info({
    wallet: checksummedWallet,
    tokenId,
    txHash: tx.hash,
  }, 'SGE-ID NFT minted successfully');
  
  return {
    ...record,
    etherscanUrl: etherscanTx(tx.hash),
  };
}

/**
 * Get mint record for wallet
 */
export async function getMintRecord(wallet: string): Promise<MintRecord | null> {
  const checksummedWallet = checksumAddress(wallet);
  return getByKey<MintRecord>(MINTS_FILE, checksummedWallet);
}
