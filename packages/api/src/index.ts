import { createServer } from './server';
import { env } from './env';
import { logger } from './services/logger';
import { initEvm } from './services/evm';
import { verifyOwnership } from './services/sgeid';
import { connectDatabase, disconnectDatabase } from './lib/db';
import { disconnectRedis } from './lib/redis';
import jobsRouter from './routes/jobs';
import { startWorkers, stopWorkers, scheduleRecurringJobs } from './workers';

// Phase 2: OpenTelemetry (REAL mode only)
let otelSdk: any = null;
if (!env.MOCK_MODE && process.env.OTEL_ENABLED === 'true') {
  try {
    const { startOtel } = require('./otel');
    otelSdk = startOtel('sge-api');
    logger.info('[otel] OpenTelemetry initialized');
  } catch (e: any) {
    logger.warn('[otel] Failed to initialize: ' + e.message);
  }
}

// Track if we're in enterprise mode (has DATABASE_URL)
const isEnterpriseMode = !env.MOCK_MODE && !!process.env.DATABASE_URL;

async function main() {
  try {
    logger.info('Starting SGE Energy API...');
    logger.info('SuperGreen Energy - Revolutionary 99% Efficiency Renewable Power');

    // Initialize enterprise services if DATABASE_URL is configured
    if (isEnterpriseMode) {
      logger.info('Enterprise mode detected - initializing database and queues');
      try {
        await connectDatabase();
        logger.info('Database connected successfully');
        
        // Start background workers and schedule recurring jobs
        await startWorkers();
        await scheduleRecurringJobs();
        logger.info('Background workers started');
      } catch (dbError: any) {
        logger.error({ error: dbError.message }, 'Failed to initialize enterprise services');
        throw dbError;
      }
    } else {
      logger.warn('DATABASE_URL not configured - running in legacy mode');
      logger.warn('Enterprise features (v2 API) will not be available');
    }

    // Create Express server
    const app = createServer();
    // Mount admin job routes (enterprise only)
    if (isEnterpriseMode) app.use('/api', jobsRouter);

    // Start server
    app.listen(env.PORT, () => {
      logger.info({
        port: env.PORT,
        appOrigin: env.APP_ORIGIN,
      }, 'Server started successfully');

      // Initialize EVM connection AFTER the server is listening.
      // This avoids slow RPC calls preventing the API from starting.
      (async () => {
        try {
          await initEvm();
          await verifyOwnership();
        } catch (e: any) {
          logger.warn('EVM initialization: ' + e.message);
          logger.warn('API running in LIMITED MODE - configure .env for full functionality');
        }
      })();

      console.log('');
      console.log('='.repeat(65));
      console.log('         SUPERGREEN ENERGY API - REVOLUTIONARY POWER');
      console.log('            Self-Charging Renewable Energy Platform');
      console.log('                   99% Efficiency Technology');
      console.log('='.repeat(65));
      console.log('');
      console.log('API ENDPOINTS:');
      console.log('');
      console.log('  REGISTRATION');
      console.log('    POST /api/register              - Gasless mint SGE-ID NFT');
      console.log('    GET  /api/status?wallet=        - Check user status');
      console.log('');
      console.log('  PAYMENTS (Coinbase Commerce)');
      console.log('    POST /api/commerce/charge       - Create payment charge');
      console.log('    GET  /api/commerce/charge/:code - Check charge status');
      console.log('    POST /api/commerce/webhook      - Webhook receiver');
      console.log('');
      console.log('  TOKEN CLAIMS');
      console.log('    GET  /api/claim/info?wallet=    - Get claim eligibility');
      console.log('    POST /api/claim/prepare         - Prepare claim txs');
      console.log('    POST /api/claim/record          - Record claim tx');
      console.log('    GET  /api/claim/history?wallet= - Claim history');
      console.log('');
      console.log('  WALLET UTILITIES');
      console.log('    GET  /api/wallet/validate?address= - Validate address');
      console.log('    GET  /api/wallet/balances?address= - Get balances');
      console.log('    GET  /api/wallet/nft?address=      - Check NFT');
      console.log('    GET  /api/gas-price                - Current gas');
      console.log('    GET  /api/block                    - Block info');
      console.log('');
      console.log('  ADMIN (requires X-Admin-Key header)');
      console.log('    GET  /api/admin/stats           - Platform stats');
      console.log('    GET  /api/admin/mints           - List all mints');
      console.log('    GET  /api/admin/payments        - List payments');
      console.log('    POST /api/admin/payment/manual  - Manual payment');
      console.log('    GET  /api/admin/wallet/:address - Wallet details');
      console.log('    GET  /api/admin/fund-check      - Relayer balance');
      console.log('');
      
      // Enterprise API endpoints (v2)
      if (isEnterpriseMode) {
        console.log('  ENTERPRISE API (v2 - Database-backed)');
        console.log('');
        console.log('  PROGRAMS');
        console.log('    POST /api/v2/programs           - Create program');
        console.log('    GET  /api/v2/programs           - List programs');
        console.log('    GET  /api/v2/programs/:id       - Get program');
        console.log('    PUT  /api/v2/programs/:id       - Update program');
        console.log('');
        console.log('  AFFILIATES');
        console.log('    POST /api/v2/affiliates/register    - Register affiliate');
        console.log('    GET  /api/v2/affiliates/tree        - Downline tree');
        console.log('    GET  /api/v2/affiliates/:id/stats   - Affiliate stats');
        console.log('    GET  /api/v2/affiliates/:id/commissions - Commissions');
        console.log('');
        console.log('  USERS (Intent-based)');
        console.log('    POST /api/v2/users/register     - Register user intent');
        console.log('    GET  /api/v2/users/:wallet      - User status');
        console.log('');
        console.log('  CLAIMS (Intent-based)');
        console.log('    POST /api/v2/claims             - Create claim intent');
        console.log('    GET  /api/v2/claims/:id         - Claim status');
        console.log('');
        console.log('  PAYOUTS (2-person approval)');
        console.log('    POST /api/v2/payouts/batch      - Create batch');
        console.log('    POST /api/v2/payouts/batch/:id/approve  - Approve');
        console.log('    POST /api/v2/payouts/batch/:id/execute  - Execute');
        console.log('');
        console.log('  ENTERPRISE ADMIN');
        console.log('    GET  /api/v2/enterprise/ledger/balance  - Ledger balance');
        console.log('    GET  /api/v2/enterprise/audit           - Audit log');
        console.log('    POST /api/v2/enterprise/reconcile       - Run reconciliation');
        console.log('');
      }
      
      console.log('  HEALTH');
      console.log('    GET  /healthz                   - System health');
      console.log('');
      console.log('='.repeat(65));
      console.log('  Mode: ' + (isEnterpriseMode ? 'ENTERPRISE' : 'LEGACY'));
      console.log('  Listening on: http://localhost:' + env.PORT);
      console.log('='.repeat(65));
      console.log('');
    });

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutdown signal received, cleaning up...');
      
      // Phase 2: Shutdown OTel
      if (otelSdk) {
        try {
          await otelSdk.shutdown();
          logger.info('[otel] OpenTelemetry shutdown complete');
        } catch (e: any) {
          logger.error('[otel] Shutdown error: ' + e.message);
        }
      }
      
      if (isEnterpriseMode) {
        try {
          await stopWorkers();
          await disconnectDatabase();
          await disconnectRedis();
          logger.info('All connections closed');
        } catch (err) {
          logger.error({ err }, 'Error during shutdown');
        }
      }
      
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to start server');
    process.exit(1);
  }
}

main();
