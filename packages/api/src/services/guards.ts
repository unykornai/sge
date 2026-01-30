import { Request, Response, NextFunction } from 'express';
import { env } from '../env';
import { logger } from './logger';

/**
 * Check KYC status (stub implementation)
 */
export function checkKyc(wallet: string): boolean {
  // In production, integrate with KYC provider
  if (env.ALLOW_SOFT_KYC) {
    return true;
  }
  
  // TODO: Implement real KYC check
  return false;
}

/**
 * KYC guard middleware
 */
export function requireKyc(req: Request, res: Response, next: NextFunction) {
  if (!env.KYC_REQUIRED) {
    return next();
  }
  
  const wallet = req.body.wallet;
  
  if (!wallet || !checkKyc(wallet)) {
    logger.warn({ wallet }, 'KYC check failed');
    return res.status(403).json({
      error: 'KYC_REQUIRED',
      message: 'KYC verification is required before minting',
    });
  }
  
  next();
}
