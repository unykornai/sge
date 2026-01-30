// Default public RPC for development (rate-limited, use your own for production)
const DEFAULT_RPC = 'https://eth.llamarpc.com';

export const env = {
  appOrigin: import.meta.env.VITE_APP_ORIGIN || 'http://localhost:5173',
  rpcUrl: import.meta.env.VITE_ETH_RPC_HTTPS || DEFAULT_RPC,
  walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  
  sgeToken: import.meta.env.VITE_SGE_TOKEN || '0x40489719E489782959486A04B765E1E93E5B221a',
  sgeClaim: import.meta.env.VITE_SGE_CLAIM || '0x4BFeF695a5f85a65E1Aa6015439f317494477D09',
  usdc: import.meta.env.VITE_USDC || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  usdt: import.meta.env.VITE_USDT || '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  feeUsd: parseInt(import.meta.env.VITE_FEE_USD || '100', 10),
} as const;
