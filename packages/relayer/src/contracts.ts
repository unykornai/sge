import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { provider, wallet } from './eth';
import logger from './logger';
import { AFFILIATE_REGISTRY_ADDRESS, AFFILIATE_PAYOUT_ADDRESS } from './config';

function loadAbi(name: string){
  const p = path.resolve(__dirname, '../../packages/contracts/artifacts/contracts', name + '.sol', name + '.json');
  if(!fs.existsSync(p)){
    throw new Error('ABI not found: ' + p);
  }
  const json = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return json.abi;
}

export const registry = ((): any | undefined => {
  if(!AFFILIATE_REGISTRY_ADDRESS) return undefined;
  const abi = loadAbi('AffiliateRegistry');
  return new ethers.Contract(AFFILIATE_REGISTRY_ADDRESS, abi, wallet ?? provider);
})();

export const payout = ((): any | undefined => {
  if(!AFFILIATE_PAYOUT_ADDRESS) return undefined;
  const abi = loadAbi('AffiliatePayout');
  return new ethers.Contract(AFFILIATE_PAYOUT_ADDRESS, abi, wallet ?? provider);
})();

export async function callRegisterReferral(child:string, referrer:string){
  if(!registry) throw new Error('AffiliateRegistry not configured');
  if(!wallet) throw new Error('Relayer wallet not configured');
  logger.info('Calling registerReferral', { child, referrer });
  const tx = await (registry as any).connect(wallet).registerReferral(child, referrer);
  return tx;
}

export async function callPayAffiliateUSDC(child:string, referrer:string, amount:string, tokenAddress:string){
  if(!payout) throw new Error('AffiliatePayout not configured');
  if(!wallet) throw new Error('Relayer wallet not configured');
  logger.info('Calling payAffiliateUSDC', { child, referrer, amount, tokenAddress });
  const tx = await (payout as any).connect(wallet).payAffiliateUSDC(child, referrer, amount, tokenAddress);
  return tx;
}

export async function callPayAffiliateHybrid(child:string, referrer:string, usdcAmount:string, sgeAmount:string, tokenAddress:string){
  if(!payout) throw new Error('AffiliatePayout not configured');
  if(!wallet) throw new Error('Relayer wallet not configured');
  logger.info('Calling payAffiliateHybrid', { child, referrer, usdcAmount, sgeAmount, tokenAddress });
  const tx = await (payout as any).connect(wallet).payAffiliateHybrid(child, referrer, usdcAmount, sgeAmount, tokenAddress);
  return tx;
}
