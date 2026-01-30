/**
 * USD fee amount (100 USD)
 */
export const USD_FEE = 100;

/**
 * Fee in 6-decimal token units (USDC/USDT)
 * 100 USD = 100,000,000 (100 * 10^6)
 */
export const FEE_6_DECIMALS = 100_000_000n;

/**
 * Mainnet contract addresses
 */
export const MAINNET_ADDRESSES = {
  SGE_TOKEN: '0x40489719E489782959486A04B765E1E93E5B221a',
  SGE_CLAIM: '0x4BFeF695a5f85a65E1Aa6015439f317494477D09',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
} as const;
