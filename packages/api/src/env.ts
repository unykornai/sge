import * as dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  APP_ORIGIN: process.env.APP_ORIGIN || 'http://localhost:5173',
  
  ETH_RPC_HTTPS: requireEnv('ETH_RPC_HTTPS'),
  RELAYER_PRIVATE_KEY: requireEnv('RELAYER_PRIVATE_KEY'),
  SGEID_ADDRESS: requireEnv('SGEID_ADDRESS'),
  
  SGE_TOKEN: process.env.SGE_TOKEN || '0x40489719E489782959486A04B765E1E93E5B221a',
  SGE_CLAIM: process.env.SGE_CLAIM || '0x4BFeF695a5f85a65E1Aa6015439f317494477D09',
  USDC: process.env.USDC || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  USDT: process.env.USDT || '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  FEE_USD: parseInt(process.env.FEE_USD || '100', 10),
  
  KYC_REQUIRED: process.env.KYC_REQUIRED === 'true',
  COMMERCE_REQUIRED: process.env.COMMERCE_REQUIRED === 'true',
  ALLOW_SOFT_KYC: process.env.ALLOW_SOFT_KYC !== 'false',
  
  COINBASE_COMMERCE_API_KEY: process.env.COINBASE_COMMERCE_API_KEY || '',
  COINBASE_COMMERCE_WEBHOOK_SHARED_SECRET: process.env.COINBASE_COMMERCE_WEBHOOK_SHARED_SECRET || '',
};
