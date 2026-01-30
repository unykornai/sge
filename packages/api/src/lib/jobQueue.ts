import fs from 'fs';
import path from 'path';
import { logger } from '../services/logger';

const JOBS_PATH = path.resolve(process.cwd(), 'relayer-jobs.json');

type RegisterJob = { id: string; type: 'register'; child: string; referrer: string };
type PayoutJob = { id: string; type: 'payout'; child: string; referrer: string; usdc: string; token: string };
type Job = RegisterJob | PayoutJob;

function readJobs(): Job[] {
  try {
    if (!fs.existsSync(JOBS_PATH)) return [];
    const raw = fs.readFileSync(JOBS_PATH, 'utf-8');
    return JSON.parse(raw) as Job[];
  } catch (e: any) {
    logger.error({ err: e?.toString?.() ?? String(e) }, 'Failed to read jobs file');
    return [];
  }
}

function writeJobs(jobs: Job[]) {
  try {
    fs.writeFileSync(JOBS_PATH, JSON.stringify(jobs, null, 2));
  } catch (e: any) {
    logger.error({ err: e?.toString?.() ?? String(e) }, 'Failed to write jobs file');
  }
}

function makeId(prefix = '') {
  return prefix + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

export function enqueueRegister(child: string, referrer: string) {
  const jobs = readJobs();
  const job: RegisterJob = { id: makeId('reg-'), type: 'register', child, referrer };
  jobs.push(job);
  writeJobs(jobs);
  logger.info({ jobId: job.id, child, referrer }, 'Enqueued register job');
  return job.id;
}

export function enqueuePayout(child: string, referrer: string, usdc: string, token: string) {
  const jobs = readJobs();
  const job: PayoutJob = { id: makeId('pay-'), type: 'payout', child, referrer, usdc, token };
  jobs.push(job);
  writeJobs(jobs);
  logger.info({ jobId: job.id, child, referrer, usdc, token }, 'Enqueued payout job');
  return job.id;
}
