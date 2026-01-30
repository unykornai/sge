import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { env } from './env';
import { logger } from './services/logger';

// Routes
import registerRoute from './routes/register';
import commerceRoute from './routes/commerce';
import chargeRoute from './routes/charge';
import statusRoute from './routes/status';
import healthzRoute from './routes/healthz';
import claimRoute from './routes/claim';
import adminRoute from './routes/admin';
import walletRoute from './routes/wallet';

export function createServer(): Express {
  const app = express();

  // Trust proxy for correct IP detection behind load balancer
  app.set('trust proxy', 1);

  // Logging
  app.use(pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/healthz',
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
