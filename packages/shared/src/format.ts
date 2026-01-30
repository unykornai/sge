import type { Address } from './addresses';

/**
 * Shorten an Ethereum address for display
 */
export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Format Etherscan transaction URL
 */
export function etherscanTx(hash: string): string {
  return `https://etherscan.io/tx/${hash}`;
}

/**
 * Format Etherscan address URL
 */
export function etherscanAddress(addr: Address | string): string {
  return `https://etherscan.io/address/${addr}`;
}

/**
 * Format Etherscan token URL
 */
export function etherscanToken(addr: Address | string): string {
  return `https://etherscan.io/token/${addr}`;
}

/**
 * Format USD amount
 */
export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(amount: bigint, decimals: number, maxDecimals: number = 4): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;
  
  if (remainder === 0n) {
    return whole.toString();
  }
  
  const fractional = remainder.toString().padStart(decimals, '0');
  const trimmed = fractional.slice(0, maxDecimals).replace(/0+$/, '');
  
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}
