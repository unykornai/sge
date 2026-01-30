import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { env } from './env';
import { logger } from './services/logger';

// Phase 2: Observability & Hardening
import { metricsMiddleware, register as promRegistry } from './lib/metrics';
import { rateLimit as customRateLimit, byIp, byWallet } from './middleware/ratelimit';
import { idempotency } from './middleware/idempotency';
import { IdempotencyService } from './services/idempotency.service';

// Legacy Routes (v1 - JSON file storage)
import registerRoute from './routes/register';
import commerceRoute from './routes/commerce';
import chargeRoute from './routes/charge';
import statusRoute from './routes/status';
import healthzRoute from './routes/healthz';
import claimRoute from './routes/claim';
import adminRoute from './routes/admin';
import walletRoute from './routes/wallet';

// Enterprise Routes (v2 - Database-backed)
import programsRouter from './routes/programs';
import affiliatesRouter from './routes/affiliates';
import usersRouter from './routes/users';
import claimsRouter from './routes/claims';
import payoutsRouter from './routes/payouts';
import enterpriseRouter from './routes/enterprise';

// Idempotency service (singleton)
const idemSvc = new IdempotencyService();

// Helper to get dependencies for middleware
async function getMiddlewareDeps() {
  const isMockMode = env.MOCK_MODE;
  let prisma: any = null;
  let redis: any = null;

  if (!isMockMode) {
    try {
      // Lazy load DB/Redis only in real mode
      const { db } = await import('./lib/db');
      const { getRedis } = await import('./lib/redis');
      prisma = db;
      redis = getRedis();
    } catch (e) {
      logger.warn('Failed to load DB/Redis for middleware, falling back to mock mode');
    }
  }

  return { isMockMode, prisma, redis };
}

export function createServer(): Express {
  const app = express();

  // Trust proxy for correct IP detection behind load balancer
  app.set('trust proxy', 1);

  // Phase 2: Prometheus metrics for all requests
  app.use(metricsMiddleware);

  // Logging
  app.use(pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/healthz' || req.url === '/metrics',
    },
  }));

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
  }));

  // CORS - allow multiple origins
  const allowedOrigins = env.APP_ORIGIN.split(',').map(o => o.trim());
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  // Rate limiting - different limits for different endpoints
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const mintLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 mint attempts per hour per IP
    message: { error: 'Too many mint attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 50, // Allow burst of webhooks
    message: { error: 'Too many webhook requests' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiters
  app.use('/api/register', mintLimiter);
  app.use('/api/commerce/webhook', webhookLimiter);
  app.use(generalLimiter);

  // Body parsing (JSON for non-webhook routes)
  app.use((req, res, next) => {
    // Skip body parsing for webhook route (needs raw body)
    if (req.path === '/api/commerce/webhook') {
      return next();
    }
    express.json({ limit: '1mb' })(req, res, next);
  });

  // === API Routes ===
  
  // Phase 2: Prometheus metrics endpoint
  app.get('/metrics', async (req, res) => {
    res.setHeader('Content-Type', promRegistry.contentType);
    res.send(await promRegistry.metrics());
  });

  // Phase 2: Apply idempotency + tiered rate limiting to mutation endpoints
  // Register route gets the strictest limits (Sybil protection)
  app.use('/api/register', async (req, res, next) => {
    const deps = await getMiddlewareDeps();
    customRateLimit(
      { windowSec: 3600, limit: env.RL_REGISTER_PER_HOUR },
      byIp,
      { isMockMode: deps.isMockMode, redis: deps.redis }
    )(req, res, (err) => {
      if (err) return next(err);
      customRateLimit(
        { windowSec: 86400, limit: env.RL_REGISTER_PER_DAY_WALLET },
        byWallet,
        { isMockMode: deps.isMockMode, redis: deps.redis }
      )(req, res, (err2) => {
        if (err2) return next(err2);
        idempotency({ isMockMode: deps.isMockMode, prisma: deps.prisma, service: idemSvc })(req, res, next);
      });
    });
  });

  // Claim routes get per-wallet rate limiting + idempotency
  app.use('/api/claim/prepare', async (req, res, next) => {
    const deps = await getMiddlewareDeps();
    customRateLimit(
      { windowSec: 3600, limit: env.RL_CLAIM_PER_HOUR },
      byWallet,
      { isMockMode: deps.isMockMode, redis: deps.redis }
    )(req, res, (err) => {
      if (err) return next(err);
      idempotency({ isMockMode: deps.isMockMode, prisma: deps.prisma, service: idemSvc })(req, res, next);
    });
  });

  app.use('/api/claim/record', async (req, res, next) => {
    const deps = await getMiddlewareDeps();
    customRateLimit(
      { windowSec: 3600, limit: env.RL_CLAIM_PER_HOUR },
      byWallet,
      { isMockMode: deps.isMockMode, redis: deps.redis }
    )(req, res, (err) => {
      if (err) return next(err);
      idempotency({ isMockMode: deps.isMockMode, prisma: deps.prisma, service: idemSvc })(req, res, next);
    });
  });
  
  // Core endpoints
  app.use('/api', registerRoute);      // POST /api/register - Gasless mint
  app.use('/api', statusRoute);        // GET  /api/status - User status
  
  // Commerce/Payment endpoints
  app.use('/api', commerceRoute);      // POST /api/commerce/webhook
  app.use('/api', chargeRoute);        // POST /api/commerce/charge, GET /api/commerce/charge/:code
  
  // Claim endpoints
  app.use('/api', claimRoute);         // GET/POST /api/claim/*
  
  // Wallet utilities
  app.use('/api', walletRoute);        // GET /api/wallet/*, /api/gas-price, /api/block
  
  // Admin endpoints (requires X-Admin-Key header)
  app.use('/api', adminRoute);         // GET/POST /api/admin/*
  
  // === Enterprise API Routes (v2 - Database-backed) ===
  // Multi-tenant programs
  app.use('/api/v2/programs', programsRouter);
  
  // Affiliate network
  app.use('/api/v2/affiliates', affiliatesRouter);
  
  // User registration intents
  app.use('/api/v2/users', usersRouter);
  
  // Claim intents
  app.use('/api/v2/claims', claimsRouter);
  
  // Payout management
  app.use('/api/v2/payouts', payoutsRouter);
  
  // Enterprise admin (ledger, audit, reconciliation)
  app.use('/api/v2/enterprise', enterpriseRouter);
  
  // Health check (no /api prefix)
  app.use(healthzRoute);               // GET /healthz

  // Error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error({ error: err.message, stack: err.stack }, 'Unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
