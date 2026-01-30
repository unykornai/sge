import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../env';
import { logger } from './logger';
import { upsertByKey, hasKey } from './storage';

const PAYMENTS_FILE = 'payments.json';
const WEBHOOKS_FILE = 'webhooks.json';

interface PaymentRecord {
  paid: boolean;
  chargeId: string;
  amountUSD?: number;
  timestamp: number;
}

interface CommerceEvent {
  id: string;
  type: string;
  data: {
    id: string;
    code: string;
    pricing?: {
      local?: { amount: string; currency: string };
    };
    metadata?: Record<string, string>;
  };
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  if (!env.COINBASE_COMMERCE_WEBHOOK_SHARED_SECRET) {
    logger.warn('No webhook secret configured, skipping verification');
    return false;
  }
  
  const hmac = createHmac('sha256', env.COINBASE_COMMERCE_WEBHOOK_SHARED_SECRET);
  hmac.update(rawBody);
  const expectedSignature = hmac.digest('hex');
  
  // Timing-safe comparison
  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  
  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }
  
  return timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * Process Commerce webhook event
 */
export async function processWebhookEvent(event: CommerceEvent): Promise<void> {
  logger.info({ eventId: event.id, eventType: event.type }, 'Processing Commerce event');
  
  // De-duplicate by event ID
  if (await hasKey(WEBHOOKS_FILE, event.id)) {
    logger.info({ eventId: event.id }, 'Event already processed (de-dupe)');
    return;
  }
  
  // Mark event as processed
  await upsertByKey(WEBHOOKS_FILE, event.id, {
    eventType: event.type,
    processedAt: Date.now(),
  });
  
  // Handle charge confirmation (accept both formats)
  const isConfirmed = event.type === 'charge:confirmed' || event.type === 'charge.confirmed';
  
  if (!isConfirmed) {
    logger.info({ eventType: event.type }, 'Ignoring non-confirmation event');
    return;
  }
  
  const chargeId = event.data.id || event.data.code;
  const metadata = event.data.metadata || {};
  
  // Extract wallet or email as key
  const walletOrEmail = metadata.wallet || metadata.email || metadata.user;
  
  if (!walletOrEmail) {
    logger.warn({ chargeId, metadata }, 'No wallet/email in metadata, cannot link payment');
    return;
  }
  
  const amountUSD = event.data.pricing?.local?.amount
    ? parseFloat(event.data.pricing.local.amount)
    : undefined;
  
  const paymentRecord: PaymentRecord = {
    paid: true,
    chargeId,
    amountUSD,
    timestamp: Date.now(),
  };
  
  await upsertByKey(PAYMENTS_FILE, walletOrEmail, paymentRecord);
  
  logger.info({
    walletOrEmail,
    chargeId,
    amountUSD,
  }, 'Payment marked as paid');
}

/**
 * Check if wallet has paid
 */
export async function hasPaid(walletOrEmail: string): Promise<boolean> {
  const payments = await import('./storage').then(m => m.readJson<Record<string, PaymentRecord>>(PAYMENTS_FILE));
  const record = payments[walletOrEmail];
  return record?.paid === true;
}
