import { Pool } from 'pg';
import { DATABASE_URL } from './config';
import logger from './logger';

const pool = new Pool({ connectionString: DATABASE_URL, max: 5 });

export async function claimJob(): Promise<any | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `UPDATE jobs
       SET status='processing', attempts = attempts + 1, last_attempt_at = now()
       WHERE id = (
         SELECT id FROM jobs
         WHERE status = 'pending'
         ORDER BY created_at
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING *;`
    );
    await client.query('COMMIT');
    if (res.rowCount === 0) return null;
    return res.rows[0];
  } catch (e: any) {
    await client.query('ROLLBACK');
    logger.error('claimJob failed', e?.toString?.() ?? String(e));
    return null;
  } finally {
    client.release();
  }
}

export async function markJobDone(id: string) {
  await pool.query('UPDATE jobs SET status=$1 WHERE id=$2', ['done', id]);
}

export async function moveToFailed(id: string) {
  await pool.query('UPDATE jobs SET status=$1 WHERE id=$2', ['failed', id]);
}

export default pool;
