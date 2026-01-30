import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import logger from './logger';

const DATABASE_URL = process.env.DATABASE_URL || process.env.PGCONN || '';
if (!DATABASE_URL) {
  logger.error('DATABASE_URL not set for migration');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function applyMigration() {
  const sqlPath = path.resolve(__dirname, '../migrations/001_create_jobs.sql');
  if (!fs.existsSync(sqlPath)) {
    logger.error('Migration SQL not found: ' + sqlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  await pool.query(sql);
  logger.info('Applied migration: 001_create_jobs.sql');
}

async function migrateFileJobs() {
  const file = path.resolve(process.cwd(), 'relayer-jobs.json');
  if (!fs.existsSync(file)) return;
  const jobs = JSON.parse(fs.readFileSync(file, 'utf-8')) as any[];
  for (const job of jobs) {
    try {
      const id = job.id || (job.type === 'register' ? 'reg-' + Date.now() : 'pay-' + Date.now());
      await pool.query('INSERT INTO jobs(id, type, payload, status, attempts, created_at) VALUES($1,$2,$3::jsonb,$4,$5,now()) ON CONFLICT DO NOTHING', [id, job.type, JSON.stringify(job), 'pending', 0]);
      logger.info('Migrated job', { id });
    } catch (e: any) {
      logger.warn('Failed to migrate job', e?.toString?.() ?? String(e));
    }
  }
  // remove file after migration
  try { fs.unlinkSync(file); logger.info('Removed file-based job store'); } catch {}
}

async function main(){
  try{
    await applyMigration();
    await migrateFileJobs();
    logger.info('Migration complete');
    process.exit(0);
  }catch(e:any){
    logger.error('Migration failed', e?.toString?.() ?? String(e));
    process.exit(2);
  }
}

main();
