# Phase 2 Implementation Plan: File-by-File Changes

**Tailored to your exact routing structure**

---

## 🎯 Workstream A: Idempotency Keys

### New Files

#### 1. `packages/api/src/middleware/idempotency.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { env } from '../env';
import { IdempotencyService } from '../services/idempotency.service';
import crypto from 'crypto';

const idempotencyService = new IdempotencyService();

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  
  if (!idempotencyKey) {
    return next(); // Optional - only enforce on specific routes
  }

  // Create request fingerprint
  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({
      method: req.method,
      path: req.path,
      body: req.body,
      wallet: req.body?.wallet || req.query?.wallet
    }))
    .digest('hex');

  // Check for cached response
  idempotencyService.get(idempotencyKey, requestHash).then((cached) => {
    if (cached) {
      return res
        .status(cached.statusCode)
        .set(cached.headers || {})
        .json(cached.responseBody);
    }

    // Intercept response to cache it
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      idempotencyService.store(
        idempotencyKey,
        requestHash,
        res.statusCode,
        body,
        res.getHeaders() as Record<string, string>
      );
      return originalJson(body);
    };

    next();
  });
}
```

#### 2. `packages/api/src/services/idempotency.service.ts`

```typescript
import { env } from '../env';

interface IdempotencyRecord {
  key: string;
  requestHash: string;
  statusCode: number;
  responseBody: any;
  headers: Record<string, string>;
  createdAt: Date;
}

// In-memory store for MOCK_MODE
const memoryStore = new Map<string, IdempotencyRecord>();

export class IdempotencyService {
  async get(key: string, requestHash: string): Promise<IdempotencyRecord | null> {
    if (env.MOCK_MODE) {
      return memoryStore.get(`${key}:${requestHash}`) || null;
    }

    // Real mode: query Prisma
    const { db } = await import('../lib/db');
    return db.idempotencyRecord.findUnique({
      where: { key_requestHash: { key, requestHash } }
    });
  }

  async store(
    key: string,
    requestHash: string,
    statusCode: number,
    responseBody: any,
    headers: Record<string, string>
  ): Promise<void> {
    const record: IdempotencyRecord = {
      key,
      requestHash,
      statusCode,
      responseBody,
      headers,
      createdAt: new Date()
    };

    if (env.MOCK_MODE) {
      memoryStore.set(`${key}:${requestHash}`, record);
      return;
    }

    // Real mode: store in Prisma
    const { db } = await import('../lib/db');
    await db.idempotencyRecord.create({
      data: {
        key,
        requestHash,
        statusCode,
        responseBody,
        headers,
      }
    });
  }
}
```

#### 3. Add to `packages/api/prisma/schema.prisma`

```prisma
model IdempotencyRecord {
  id           String   @id @default(cuid())
  key          String   // From Idempotency-Key header
  requestHash  String   // SHA256 of method+path+body
  statusCode   Int
  responseBody Json
  headers      Json
  createdAt    DateTime @default(now())
  
  @@unique([key, requestHash])
  @@index([createdAt]) // For cleanup jobs
}
```

### Modified Files

#### 4. `packages/api/src/server.ts`

Add idempotency middleware to routes:

```typescript
import { idempotencyMiddleware } from './middleware/idempotency';

// Apply to mutation endpoints
router.post('/api/register', idempotencyMiddleware, registerRoute);
router.post('/api/claim/prepare', idempotencyMiddleware, claimPrepareRoute);
router.post('/api/claim/record', idempotencyMiddleware, claimRecordRoute);
router.post('/api/commerce/webhook', idempotencyMiddleware, webhookRoute);

// v2 routes
router.post('/api/v2/claims', idempotencyMiddleware, v2ClaimsRoute);
router.post('/api/v2/payouts/batch', idempotencyMiddleware, v2PayoutsRoute);
```

---

## 🎯 Workstream B: Tiered Rate Limiting

### New Files

#### 5. `packages/api/src/middleware/ratelimit.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { env } from '../env';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyExtractor: (req: Request) => string;
}

// In-memory store for MOCK_MODE
const memoryStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = config.keyExtractor(req);
    const now = Date.now();

    if (env.MOCK_MODE) {
      // In-memory rate limiting
      let record = memoryStore.get(key);
      
      if (!record || now > record.resetAt) {
        record = { count: 0, resetAt: now + config.windowMs };
        memoryStore.set(key, record);
      }

      record.count++;

      if (record.count > config.maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((record.resetAt - now) / 1000)
        });
      }

      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - record.count));
      res.setHeader('X-RateLimit-Reset', new Date(record.resetAt).toISOString());
      
      return next();
    }

    // Real mode: Redis-backed rate limiting
    const { getRedis } = await import('../lib/redis');
    const redis = getRedis();
    
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.pexpire(key, config.windowMs);
    }

    const ttl = await redis.pttl(key);
    const remaining = Math.max(0, config.maxRequests - count);

    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', new Date(now + ttl).toISOString());

    if (count > config.maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(ttl / 1000)
      });
    }

    next();
  };
}

// Preset rate limiters
export const registerRateLimit = rateLimit({
  maxRequests: parseInt(process.env.RL_REGISTER_PER_HOUR || '5', 10),
  windowMs: 60 * 60 * 1000, // 1 hour
  keyExtractor: (req) => `rl:register:${req.ip}`
});

export const claimRateLimit = rateLimit({
  maxRequests: parseInt(process.env.RL_CLAIM_PER_HOUR || '60', 10),
  windowMs: 60 * 60 * 1000,
  keyExtractor: (req) => `rl:claim:${req.body.wallet || req.query.wallet}`
});

export const webhookRateLimit = rateLimit({
  maxRequests: parseInt(process.env.RL_WEBHOOK_PER_MIN || '100', 10),
  windowMs: 60 * 1000,
  keyExtractor: (req) => `rl:webhook:${req.body.event?.id || req.ip}`
});

export const healthRateLimit = rateLimit({
  maxRequests: 600, // Generous for monitoring
  windowMs: 60 * 1000,
  keyExtractor: (req) => `rl:health:${req.ip}`
});
```

### Modified Files

#### 6. `packages/api/src/env.ts`

Add rate limit configuration:

```typescript
export const env = {
  // ... existing config ...

  // Rate Limiting
  RL_REGISTER_PER_HOUR: parseInt(process.env.RL_REGISTER_PER_HOUR || '5', 10),
  RL_CLAIM_PER_HOUR: parseInt(process.env.RL_CLAIM_PER_HOUR || '60', 10),
  RL_HEALTH_PER_MIN: parseInt(process.env.RL_HEALTH_PER_MIN || '600', 10),
  RL_WEBHOOK_PER_MIN: parseInt(process.env.RL_WEBHOOK_PER_MIN || '100', 10),
};
```

#### 7. `packages/api/src/server.ts`

Apply rate limiters to routes:

```typescript
import { 
  registerRateLimit, 
  claimRateLimit, 
  webhookRateLimit, 
  healthRateLimit 
} from './middleware/ratelimit';

// Apply to routes
router.post('/api/register', registerRateLimit, idempotencyMiddleware, registerRoute);
router.post('/api/claim/prepare', claimRateLimit, idempotencyMiddleware, claimPrepareRoute);
router.post('/api/claim/record', claimRateLimit, idempotencyMiddleware, claimRecordRoute);
router.post('/api/commerce/webhook', webhookRateLimit, idempotencyMiddleware, webhookRoute);
router.get('/healthz', healthRateLimit, healthzRoute);
```

---

## 🎯 Workstream C: Queue Hardening

### Modified Files

#### 8. `packages/api/src/lib/queue.ts`

Add BullMQ configuration:

```typescript
import { Queue, QueueOptions } from 'bullmq';
import { env } from '../env';
import { getRedis } from './redis';

export const QUEUE_NAMES = {
  INTENT: 'intent-queue',
  PAYOUT: 'payout-queue',
  RECONCILER: 'reconciler-queue',
  DLQ: 'dead-letter-queue',
} as const;

const baseQueueConfig: Partial<QueueOptions> = {
  connection: env.MOCK_MODE ? undefined : getRedis(),
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000, // 1s, 2s, 4s, 8s, 16s
    },
    removeOnComplete: 1000, // Keep last 1k completed
    removeOnFail: 5000,     // Keep last 5k failed (for debugging)
  },
};

export function createQueue(name: string, options?: Partial<QueueOptions>) {
  return new Queue(name, { ...baseQueueConfig, ...options });
}

// Typed queue getters
export const getIntentQueue = () => createQueue(QUEUE_NAMES.INTENT);
export const getPayoutQueue = () => createQueue(QUEUE_NAMES.PAYOUT);
export const getReconcilerQueue = () => createQueue(QUEUE_NAMES.RECONCILER);
export const getDLQ = () => createQueue(QUEUE_NAMES.DLQ);
```

### New Files

#### 9. `packages/api/src/workers/sweeper.worker.ts`

```typescript
import { Worker } from 'bullmq';
import { env } from '../env';
import { getRedis } from '../lib/redis';
import { logger } from '../services/logger';
import { QUEUE_NAMES, getDLQ } from '../lib/queue';

const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export function startSweeperWorker() {
  if (env.MOCK_MODE) {
    logger.info('[sweeper] MOCK_MODE=true -> sweeper disabled');
    return null;
  }

  const worker = new Worker(
    'sweeper-cron',
    async (job) => {
      logger.info('[sweeper] Running stuck job sweep...');
      
      const { db } = await import('../lib/db');
      const stuckCutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);

      // Find stuck intents
      const stuckIntents = await db.intent.findMany({
        where: {
          status: 'PROCESSING',
          lockedAt: { lt: stuckCutoff },
        },
      });

      logger.info(`[sweeper] Found ${stuckIntents.length} stuck intents`);

      for (const intent of stuckIntents) {
        // Move to DLQ
        const dlq = getDLQ();
        await dlq.add('stuck-intent', {
          intentId: intent.id,
          reason: 'Stuck in PROCESSING state',
          originalQueue: QUEUE_NAMES.INTENT,
        });

        // Update status
        await db.intent.update({
          where: { id: intent.id },
          data: { status: 'FAILED', error: 'Processing timeout' },
        });

        logger.warn({ intentId: intent.id }, 'Moved stuck intent to DLQ');
      }

      return { sweptCount: stuckIntents.length };
    },
    {
      connection: getRedis(),
      limiter: { max: 1, duration: 15 * 60 * 1000 }, // Every 15 minutes
    }
  );

  worker.on('completed', (job) => {
    logger.info({ result: job.returnvalue }, '[sweeper] Sweep completed');
  });

  return worker;
}
```

#### 10. `packages/api/src/routes/admin-dlq.ts`

```typescript
import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { getDLQ, getIntentQueue } from '../lib/queue';
import { logger } from '../services/logger';

const router = Router();

// List DLQ jobs
router.get('/admin/dlq', adminAuth, async (req, res) => {
  const dlq = getDLQ();
  const jobs = await dlq.getJobs(['failed', 'completed'], 0, 100);
  
  res.json({
    count: jobs.length,
    jobs: jobs.map(j => ({
      id: j.id,
      name: j.name,
      data: j.data,
      failedReason: j.failedReason,
      timestamp: j.timestamp,
    }))
  });
});

// Retry DLQ job
router.post('/admin/dlq/:jobId/retry', adminAuth, async (req, res) => {
  const { jobId } = req.params;
  const dlq = getDLQ();
  const job = await dlq.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Re-enqueue to original queue
  const originalQueue = job.data.originalQueue;
  if (originalQueue === 'intent-queue') {
    const intentQueue = getIntentQueue();
    await intentQueue.add('retry-from-dlq', job.data);
    await job.remove();
    logger.info({ jobId }, 'Retried job from DLQ');
    return res.json({ success: true });
  }

  res.status(400).json({ error: 'Unknown original queue' });
});

export default router;
```

---

## 🎯 Workstream D: Observability

### New Files

#### 11. `packages/api/src/otel.ts`

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { env } from './env';

let sdk: NodeSDK | null = null;

export function initializeOTel() {
  if (env.MOCK_MODE) {
    console.log('[otel] MOCK_MODE=true -> observability disabled');
    return;
  }

  const prometheusExporter = new PrometheusExporter(
    {
      port: 9464, // Prometheus scrape port
      endpoint: '/metrics',
    },
    () => {
      console.log('[otel] Prometheus exporter listening on :9464/metrics');
    }
  );

  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'sge-api',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    }),
    metricReader: prometheusExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  console.log('[otel] OpenTelemetry initialized');
}

export function shutdownOTel() {
  if (sdk) {
    sdk.shutdown();
  }
}
```

#### 12. `packages/api/src/lib/metrics.ts`

```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

// Intent metrics
export const intentsTotal = new Counter({
  name: 'sge_intents_total',
  help: 'Total number of intents created',
  labelNames: ['status', 'type'],
});

export const settlementDuration = new Histogram({
  name: 'sge_settlement_duration_seconds',
  help: 'Time to settle an intent',
  buckets: [1, 3, 5, 10, 30, 60],
});

// Ledger metrics
export const ledgerBalance = new Gauge({
  name: 'sge_ledger_balance',
  help: 'Ledger balance per program (should always be 0)',
  labelNames: ['program_id'],
});

// Queue metrics
export const queueDepth = new Gauge({
  name: 'sge_queue_depth',
  help: 'Number of jobs in queue',
  labelNames: ['queue'],
});

// Relayer metrics
export const relayerBalanceEth = new Gauge({
  name: 'sge_relayer_balance_eth',
  help: 'Relayer ETH balance',
});

// Webhook metrics
export const webhookVerificationFailures = new Counter({
  name: 'sge_webhook_verification_failures_total',
  help: 'Failed webhook signature verifications',
});
```

### Modified Files

#### 13. `packages/api/src/index.ts`

Initialize OTel at the very top:

```typescript
// MUST be first import
import { initializeOTel, shutdownOTel } from './otel';
initializeOTel();

// Rest of imports
import { createServer } from './server';
import { env } from './env';
// ...

async function main() {
  // ... existing code ...
}

// Update shutdown handler
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutdown signal received, cleaning up...');
  
  shutdownOTel(); // Add this
  
  if (isEnterpriseMode) {
    // ... existing shutdown code ...
  }
  
  process.exit(0);
};
```

#### 14. `packages/api/src/server.ts`

Add metrics endpoint:

```typescript
import { register } from 'prom-client';

// Add after existing routes
router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  const metrics = await register.metrics();
  res.send(metrics);
});
```

#### 15. `docker-compose.yml`

Add Prometheus and Grafana:

```yaml
services:
  # ... existing postgres, redis ...

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./ops/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
    depends_on:
      - api

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - ./ops/grafana-dashboards:/var/lib/grafana/dashboards
    depends_on:
      - prometheus
```

#### 16. `ops/prometheus.yml` (new)

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'sge-api'
    static_configs:
      - targets: ['host.docker.internal:9464']
```

#### 17. `ops/grafana-dashboards/sge-overview.json` (new)

```json
{
  "dashboard": {
    "title": "SGE Platform Overview",
    "panels": [
      {
        "title": "Intent Processing Rate",
        "targets": [
          {
            "expr": "rate(sge_intents_total[5m])"
          }
        ]
      },
      {
        "title": "Queue Depth",
        "targets": [
          {
            "expr": "sge_queue_depth"
          }
        ]
      },
      {
        "title": "Ledger Balance (should be 0)",
        "targets": [
          {
            "expr": "sge_ledger_balance"
          }
        ]
      }
    ]
  }
}
```

---

## 🎯 Workstream E: Load Testing

### New Files

#### 18. `ops/k6/register.js`

```javascript
import http from 'k6/http';
import { check } from 'k6';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Ramp up
    { duration: '1m', target: 1000 },   // Burst
    { duration: '30s', target: 0 },     // Ramp down
  ],
};

export default function () {
  const wallet = `0x${Math.random().toString(16).substring(2, 42).padStart(40, '0')}`;
  const idempotencyKey = `test-${__VU}-${__ITER}`;

  const payload = JSON.stringify({ wallet });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
  };

  const res = http.post('http://localhost:3000/api/register', payload, params);

  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'has txHash': (r) => JSON.parse(r.body).txHash !== undefined,
  });
}
```

#### 19. `ops/k6/claim.js`

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 500 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const wallet = `0x${Math.random().toString(16).substring(2, 42).padStart(40, '0')}`;
  const idempotencyKey = `claim-${__VU}-${__ITER}`;

  const payload = JSON.stringify({ wallet, amount: '100' });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
  };

  const res = http.post('http://localhost:3000/api/claim/prepare', payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has transactions': (r) => JSON.parse(r.body).transactions !== undefined,
  });
}
```

---

## 📦 Installation Steps

```powershell
# Install new dependencies
npm install --save @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-prometheus prom-client

# Install k6 (Windows)
choco install k6

# Generate Prisma client with new IdempotencyRecord model
npm run prisma:generate
npm run prisma:push

# Run migrations
npm run db:up
npm run prisma:migrate dev --name add-idempotency
```

---

## ✅ Acceptance Checklist

After implementing all workstreams:

- [ ] `npm run dev` works in MOCK_MODE (no DB/Redis)
- [ ] `npm run setup:real && npm run dev:real` starts full stack
- [ ] `/metrics` endpoint returns Prometheus metrics
- [ ] Idempotency test (see VERIFICATION.md) passes
- [ ] Rate limit test returns 429 after threshold
- [ ] k6 load tests complete without duplicate claims
- [ ] Grafana dashboard shows queue depth and latency
- [ ] DLQ admin API works (`GET /api/admin/dlq`)
- [ ] Sweeper worker detects stuck intents
- [ ] Workers still refuse to start in MOCK_MODE

---

**Ready to implement?** Start with Workstream A (idempotency) and work sequentially through E.
