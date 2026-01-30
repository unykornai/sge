import { Router, Request, Response } from 'express';
import { listJobs, retryJob, deleteJob } from '../lib/jobQueuePg';
import { logger } from '../services/logger';

const router = Router();

router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || undefined;
    const rows = await listJobs(status);
    res.json(rows);
  } catch (e: any) {
    logger.error('jobs list failed', e?.toString?.() ?? String(e));
    res.status(500).json({ error: 'JOB_LIST_FAILED' });
  }
});

router.post('/jobs/retry/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await retryJob(id);
    res.json({ ok: true });
  } catch (e: any) {
    logger.error('jobs retry failed', e?.toString?.() ?? String(e));
    res.status(500).json({ error: 'JOB_RETRY_FAILED' });
  }
});

router.delete('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await deleteJob(id);
    res.json({ ok: true });
  } catch (e: any) {
    logger.error('jobs delete failed', e?.toString?.() ?? String(e));
    res.status(500).json({ error: 'JOB_DELETE_FAILED' });
  }
});

export default router;
