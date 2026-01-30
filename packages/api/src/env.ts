import * as dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue = ''): string {
  return process.env[key] || defaultValue;
}

export const env = {
  // Server
  PORT: parseInt(process.env.PORT || '3000', 10),
  APP_ORIGIN: process.env.APP_ORIGIN || 'http://localhost:5173',
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || 'dev-admin-key',

  // Ethereum RPC
  ETH_RPC_HTTPS: requireEnv('ETH_RPC_HTTPS'),

  // Wallet slots
  DEPLOYER_ADDRESS: optionalEnv('DEPLOYER_ADDRESS'),
  DEPLOYER_PRIVATE_KEY: optionalEnv('DEPLOYER_PRIVATE_KEY'),
  RELAYER_ADDRESS: optionalEnv('RELAYER_ADDRESS'),
  RELAYER_PRIVATE_KEY: requireEnv('RELAYER_PRIVATE_KEY'),
  TREASURY_ADDRESS: optionalEnv('TREASURY_ADDRESS'),

  // Contracts
  SGEID_ADDRESS: requireEnv('SGEID_ADDRESS'),
  SGE_TOKEN: optionalEnv('SGE_TOKEN', '0x40489719E489782959486A04B765E1E93E5B221a'),
  SGE_CLAIM: optionalEnv('SGE_CLAIM', '0x4BFeF695a5f85a65E1Aa6015439f317494477D09'),
  USDC: optionalEnv('USDC', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
  USDT: optionalEnv('USDT', '0xdAC17F958D2ee523a2206206994597C13D831ec7'),

  // Fee
  FEE_USD: parseInt(process.env.FEE_USD || '100', 10),

  // Feature gates
  KYC_REQUIRED: process.env.KYC_REQUIRED === 'true',
  COMMERCE_REQUIRED: process.env.COMMERCE_REQUIRED === 'true',
  ALLOW_SOFT_KYC: process.env.ALLOW_SOFT_KYC !== 'false',

  // Coinbase Commerce
  COINBASE_COMMERCE_API_KEY: optionalEnv('COINBASE_COMMERCE_API_KEY'),
  COINBASE_COMMERCE_WEBHOOK_SHARED_SECRET: optionalEnv('COINBASE_COMMERCE_WEBHOOK_SHARED_SECRET'),
};
