import { Wallet, ethers } from 'ethers';
import { RELAYER_PRIVATE_KEY, ETH_RPC } from './config';
import logger from './logger';

if(!RELAYER_PRIVATE_KEY){
  logger.warn('RELAYER_PRIVATE_KEY not set; relayer will not be able to sign transactions');
}

export const provider = new ethers.JsonRpcProvider(ETH_RPC);
export const wallet = RELAYER_PRIVATE_KEY ? new Wallet(RELAYER_PRIVATE_KEY, provider) : undefined;

export async function sendTransaction(tx: any){
  if(!wallet) throw new Error('No relayer wallet configured');
  const signed = await wallet.sendTransaction(tx);
  logger.info('Sent tx', signed.hash);
  const receipt = await signed.wait();
  return receipt;
}
