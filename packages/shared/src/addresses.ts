/**
 * Ethereum address type (checksummed)
 */
export type Address = `0x${string}`;

/**
 * Configuration for addresses that may come from env
 */
export interface AddressConfig {
  sgeToken: Address;
  sgeClaim: Address;
  usdc: Address;
  usdt: Address;
  sgeid?: Address;
}

/**
 * Validate and checksum an Ethereum address
 */
export function toChecksumAddress(addr: string): Address {
  // Simple validation - in real implementation, use ethers.getAddress or viem's getAddress
  if (!addr.startsWith('0x') || addr.length !== 42) {
    throw new Error(`Invalid address: ${addr}`);
  }
  return addr as Address;
}

/**
 * Create address config from environment variables
 */
export function createAddressConfig(env: Record<string, string | undefined>): AddressConfig {
  const sgeToken = env.SGE_TOKEN || env.VITE_SGE_TOKEN;
  const sgeClaim = env.SGE_CLAIM || env.VITE_SGE_CLAIM;
  const usdc = env.USDC || env.VITE_USDC;
  const usdt = env.USDT || env.VITE_USDT;
  const sgeid = env.SGEID_ADDRESS;

  if (!sgeToken || !sgeClaim || !usdc || !usdt) {
    throw new Error('Missing required address configuration');
  }

  return {
    sgeToken: toChecksumAddress(sgeToken),
    sgeClaim: toChecksumAddress(sgeClaim),
    usdc: toChecksumAddress(usdc),
    usdt: toChecksumAddress(usdt),
    sgeid: sgeid ? toChecksumAddress(sgeid) : undefined,
  };
}
