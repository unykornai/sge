import { createServer } from './server';
import { env } from './env';
import { logger } from './services/logger';
import { initEvm } from './services/evm';
import { verifyOwnership } from './services/sgeid';

async function main() {
  try {
    logger.info('Starting SGE Energy API...');
    logger.info('SuperGreen Energy - Revolutionary 99% Efficiency Renewable Power');

    // Initialize EVM connection (optional in dev)
    try {
      await initEvm();
      // Verify SGEID ownership (only if EVM init succeeds)
      await verifyOwnership();
    } catch (e: any) {
      logger.warn('EVM initialization: ' + e.message);
      logger.warn('API starting in LIMITED MODE - configure .env for full functionality');
    }

    // Create Express server
    const app = createServer();

    // Start server
    app.listen(env.PORT, () => {
      logger.info({
        port: env.PORT,
        appOrigin: env.APP_ORIGIN,
      }, 'Server started successfully');

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
      console.log('  HEALTH');
      console.log('    GET  /healthz                   - System health');
      console.log('');
      console.log('='.repeat(65));
      console.log('  Listening on: http://localhost:' + env.PORT);
      console.log('='.repeat(65));
      console.log('');
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to start server');
    process.exit(1);
  }
}

main();
