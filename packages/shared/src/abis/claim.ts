export const claimAbi = [
  {
    inputs: [],
    name: 'claimWithUSDC',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimWithUSDT',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimUSDC',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimUSDT',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * Claim function name fallbacks for different contract implementations.
 * Try each in order until one succeeds.
 */
export const CLAIM_FUNCTION_FALLBACKS = {
  USDC: ['claimWithUSDC', 'claimUSDC', 'claim'] as const,
  USDT: ['claimWithUSDT', 'claimUSDT', 'claim'] as const,
} as const;

/**
 * Get the appropriate claim function name for a token.
 * Returns the primary function name; use CLAIM_FUNCTION_FALLBACKS for retries.
 */
export function getClaimFunctionName(token: 'USDC' | 'USDT'): string {
  return CLAIM_FUNCTION_FALLBACKS[token][0];
}

/**
 * Get all fallback function names for a token claim.
 */
export function getClaimFallbacks(token: 'USDC' | 'USDT'): readonly string[] {
  return CLAIM_FUNCTION_FALLBACKS[token];
}
