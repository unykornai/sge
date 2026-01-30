import logger from './logger';
import { POLL_INTERVAL_MS } from './config';
import { isProcessed, markProcessed } from './store';
import { callRegisterReferral, callPayAffiliateUSDC } from './contracts';
import pLimit from 'p-limit';
import { claimJob, markJobDone, moveToFailed } from './db';

const limit = pLimit(2);

async function processReferralEvent(event: {id:string, child:string, referrer:string}){
  if(isProcessed(event.id)){
    logger.info('Already processed', event.id);
    return;
  }
  try{
    await limit(()=> callRegisterReferral(event.child, event.referrer));
    markProcessed(event.id, 'register');
  }catch(e:any){
    logger.error('processReferralEvent failed', e?.toString?.() ?? String(e));
    throw e;
  }
}

async function processPaymentEvent(event: {id:string, child:string, referrer:string, usdc:string, token:string}){
  if(isProcessed(event.id)){
    logger.info('Already processed', event.id);
    return;
  }
  try{
    await limit(()=> callPayAffiliateUSDC(event.child, event.referrer, event.usdc, event.token));
    markProcessed(event.id, 'payout');
  }catch(e:any){
    logger.error('processPaymentEvent failed', e?.toString?.() ?? String(e));
    throw e;
  }
}

async function pollLoop(){
  logger.info('Relayer started poll loop', { interval: POLL_INTERVAL_MS });
  // Production: claim a job atomically from Postgres and process it.
  try{
    const job = await claimJob();
    if(job){
      const payload = job.payload;
      if(job.type === 'register'){
        await processReferralEvent({ id: job.id, child: payload.child, referrer: payload.referrer });
      } else if(job.type === 'payout'){
        await processPaymentEvent({ id: job.id, child: payload.child, referrer: payload.referrer, usdc: payload.usdc, token: payload.token });
      }
      await markJobDone(job.id);
    }
  }catch(e:any){
    logger.error('Error processing job', e?.toString?.() ?? String(e));
    if(e && e.jobId) await moveToFailed(e.jobId).catch(()=>{});
  } finally {
    setTimeout(pollLoop, POLL_INTERVAL_MS);
  }
}

process.on('unhandledRejection', (r)=> logger.error('unhandledRejection', String(r)));
process.on('uncaughtException', (e)=> logger.error('uncaughtException', String(e)));

pollLoop();
