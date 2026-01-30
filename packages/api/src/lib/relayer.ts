import { ethers } from 'ethers';
import { env } from '../env';
import { provider, getSigner, checksumAddress } from '../services/evm';
import { logger } from '../services/logger';

// Minimal ABIs
const AffiliateRegistryAbi = [
  'function registerReferral(address child, address referrer)',
  'function getReferrer(address child) view returns (address)'
];

const AffiliatePayoutAbi = [
  'function payAffiliateUSDC(address child, address referrer, uint256 usdcAmount, address usdcToken)',
  'function payAffiliateHybrid(address child, address referrer, uint256 usdcAmount, address usdcToken, uint256 sgeAmount, address sgeToken)'
];

function getRegistryContract() {
  if (!env.MOCK_MODE && /^0x0{40}$/i.test(env.SGEID_ADDRESS)) {
    throw new Error('AffiliateRegistry address not configured');
  }
  // Use AFFILIATE_REGISTRY env if available, else expect to be set to SGEID_ADDRESS (not ideal)
  const addr = (process.env.AFFILIATE_REGISTRY_ADDRESS || process.env.AFFILIATE_REGISTRY || '');
  if (!addr) throw new Error('AFFILIATE_REGISTRY_ADDRESS not configured');
  return new ethers.Contract(addr, AffiliateRegistryAbi, getSigner());
}

function getPayoutContract() {
  const addr = (process.env.AFFILIATE_PAYOUT_ADDRESS || process.env.AFFILIATE_PAYOUT || '');
  if (!addr) throw new Error('AFFILIATE_PAYOUT_ADDRESS not configured');
  return new ethers.Contract(addr, AffiliatePayoutAbi, getSigner());
}

async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      logger.warn({ err: e.message, attempt: i + 1 }, 'Relayer call failed, retrying');
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

export async function registerReferral(child: string, referrer: string): Promise<string | null> {
  const childC = checksumAddress(child);
  const refC = checksumAddress(referrer);
  const contract = getRegistryContract();
  const tx = await retry(() => contract.registerReferral(childC, refC));
  logger.info({ child: childC, referrer: refC, txHash: tx.hash }, 'registerReferral submitted');
  await tx.wait();
  return tx.hash;
}

export async function getReferrer(child: string): Promise<string> {
  const childC = checksumAddress(child);
  const contract = getRegistryContract();
  return await contract.getReferrer(childC);
}

export async function payAffiliateUSDC(child: string, referrer: string, amount: ethers.BigNumberish, usdcToken: string): Promise<string | null> {
  const childC = checksumAddress(child);
  const refC = checksumAddress(referrer);
  const contract = getPayoutContract();
  const tx = await retry(() => contract.payAffiliateUSDC(childC, refC, amount, usdcToken));
  logger.info({ child: childC, referrer: refC, amount: amount.toString(), txHash: tx.hash }, 'payAffiliateUSDC submitted');
  await tx.wait();
  return tx.hash;
}

export async function payAffiliateHybrid(child: string, referrer: string, usdcAmount: ethers.BigNumberish, usdcToken: string, sgeAmount: ethers.BigNumberish, sgeToken: string): Promise<string | null> {
  const childC = checksumAddress(child);
  const refC = checksumAddress(referrer);
  const contract = getPayoutContract();
  const tx = await retry(() => contract.payAffiliateHybrid(childC, refC, usdcAmount, usdcToken, sgeAmount, sgeToken));
  logger.info({ child: childC, referrer: refC, usdcAmount: usdcAmount.toString(), sgeAmount: sgeAmount.toString(), txHash: tx.hash }, 'payAffiliateHybrid submitted');
  await tx.wait();
  return tx.hash;
}

export default {
  registerReferral,
  getReferrer,
  payAffiliateUSDC,
  payAffiliateHybrid,
};
