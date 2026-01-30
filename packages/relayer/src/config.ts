import dotenv from 'dotenv';
dotenv.config();

export const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || '';
export const ETH_RPC = process.env.ETH_RPC_HTTPS || process.env.ETH_RPC || 'http://localhost:8545';
export const AFFILIATE_REGISTRY_ADDRESS = process.env.AFFILIATE_REGISTRY_ADDRESS || '';
export const AFFILIATE_PAYOUT_ADDRESS = process.env.AFFILIATE_PAYOUT_ADDRESS || '';
export const AFFILIATE_USDC_AMOUNT = process.env.AFFILIATE_USDC_AMOUNT || '';
export const AFFILIATE_SGE_AMOUNT = process.env.AFFILIATE_SGE_AMOUNT || '';

export const DB_PATH = process.env.RELAYER_DB_PATH || 'relayer.db';
export const POLL_INTERVAL_MS = Number(process.env.RELAYER_POLL_MS || '5000');

export const DATABASE_URL = process.env.DATABASE_URL || process.env.PGCONN || '';
