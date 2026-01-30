import { Pool } from 'pg';
import { logger } from '../services/logger';
import { v4 as uuidv4 } from 'uuid';

const DATABASE_URL = process.env.DATABASE_URL || process.env.PGCONN || '';
if (!DATABASE_URL) logger.warn('DATABASE_URL not set — jobs will fail to persist');

const pool = new Pool({ connectionString: DATABASE_URL, max: 5 });

export async function enqueueRegisterPg(child: string, referrer: string) {
  const id = 'reg-' + uuidv4();
  const payload = { child, referrer };
  try {
    await pool.query(`INSERT INTO jobs(id, type, payload) VALUES($1, $2, $3::jsonb)`, [id, 'register', JSON.stringify(payload)]);
    logger.info({ jobId: id, child, referrer }, 'Enqueued register job (pg)');
  } catch (e: any) {
    logger.error({ err: e?.toString?.() ?? String(e), id }, 'Failed to enqueue register (pg)');
    throw e;
  }
  return id;
}

export async function enqueuePayoutPg(child: string, referrer: string, usdc: string, token: string) {
  const id = 'pay-' + uuidv4();
  const payload = { child, referrer, usdc, token };
  try {
    await pool.query(`INSERT INTO jobs(id, type, payload) VALUES($1, $2, $3::jsonb)`, [id, 'payout', JSON.stringify(payload)]);
    logger.info({ jobId: id, child, referrer, usdc }, 'Enqueued payout job (pg)');
  } catch (e: any) {
    logger.error({ err: e?.toString?.() ?? String(e), id }, 'Failed to enqueue payout (pg)');
    throw e;
  }
  return id;
}

export async function migrateFileJobs(filePath: string) {
  // Optional helper to migrate existing file-based jobs into DB
  try {
    const data = require(filePath);
    for (const job of data) {
      if (job.type === 'register') await enqueueRegisterPg(job.child, job.referrer);
      if (job.type === 'payout') await enqueuePayoutPg(job.child, job.referrer, job.usdc, job.token);
    }
    logger.info('Migrated file jobs to Postgres', { count: data.length });
  } catch (e: any) {
    logger.warn({ err: e?.toString?.() ?? String(e), filePath }, 'No file jobs to migrate');
  }
}

export async function listJobs(status?: string) {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT id, type, payload, status, attempts, last_attempt_at, created_at FROM jobs ${status ? "WHERE status=$1" : ''} ORDER BY created_at DESC LIMIT 100`, status ? [status] : undefined as any);
    return res.rows;
  } finally {
    client.release();
  }
}

export async function retryJob(id: string) {
  await pool.query(`UPDATE jobs SET status='pending', attempts=0 WHERE id=$1`, [id]);
}

export async function deleteJob(id: string) {
  await pool.query(`DELETE FROM jobs WHERE id=$1`, [id]);
}

