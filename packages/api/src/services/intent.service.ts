/**
 * Intent Service
 * 
 * Handles idempotent intent creation and processing.
 * All on-chain actions go through intents for correctness.
 */

import { prisma } from '../lib/db';
import { intentsQueue } from '../lib/queue';
import { logger } from '../lib/logger';
import { IntentType, IntentStatus, Prisma } from '../generated/prisma';

export interface CreateIntentInput {
  programId: string;
  type: IntentType;
  wallet: string;
  payload: Record<string, any>;
  idempotencyKey?: string;
}

export interface IntentResult {
  intentId: string;
  status: IntentStatus;
  isNew: boolean;
  resultTxHash?: string | null;
  resultData?: any;
  errorMessage?: string | null;
}

/**
 * Generate idempotency key based on intent type
 */
function generateIdempotencyKey(input: CreateIntentInput): string {
  const { programId, type, wallet, payload } = input;

  switch (type) {
    case 'REGISTER':
      return `register:${programId}:${wallet.toLowerCase()}`;
    
    case 'CLAIM':
      const token = payload.token || 'USDC';
      const cycle = payload.cycle || 'v1';
      return `claim:${programId}:${wallet.toLowerCase()}:${token}:${cycle}`;
    
    case 'COMMERCE_PAYMENT':
      const chargeId = payload.chargeId || Date.now();
      return `commerce:${programId}:${wallet.toLowerCase()}:${chargeId}`;
    
    case 'PAYOUT':
      const period = payload.period || new Date().toISOString().slice(0, 7);
      const affiliateId = payload.affiliateId;
      return `payout:${programId}:${affiliateId}:${period}`;
    
    default:
      return `${type}:${programId}:${wallet.toLowerCase()}:${Date.now()}`;
  }
}

/**
 * Create or return existing intent (idempotent)
 */
export async function createIntent(input: CreateIntentInput): Promise<IntentResult> {
  const idempotencyKey = input.idempotencyKey || generateIdempotencyKey(input);
  
  // Check for existing intent with same idempotency key
  const existing = await prisma.intent.findUnique({
    where: { idempotencyKey },
  });

  if (existing) {
    logger.info({ intentId: existing.id, status: existing.status }, 'Intent already exists');
    return {
      intentId: existing.id,
      status: existing.status,
      isNew: false,
      resultTxHash: existing.resultTxHash,
      resultData: existing.resultData,
      errorMessage: existing.errorMessage,
    };
  }

  // Create new intent
  const intent = await prisma.intent.create({
    data: {
      programId: input.programId,
      type: input.type,
      idempotencyKey,
      wallet: input.wallet.toLowerCase(),
      payload: input.payload as Prisma.InputJsonValue,
      status: 'PENDING',
    },
  });

  logger.info({ intentId: intent.id, type: intent.type }, 'Intent created');

  // Queue for processing
  await intentsQueue.add(
    intent.type,
    { intentId: intent.id },
    {
      jobId: intent.id, // Ensures idempotency at queue level too
    }
  );

  return {
    intentId: intent.id,
    status: intent.status,
    isNew: true,
  };
}

/**
 * Lock an intent for processing (prevents concurrent processing)
 */
export async function lockIntent(intentId: string, workerId: string): Promise<boolean> {
  const lockDuration = 5 * 60 * 1000; // 5 minutes
  const lockedUntil = new Date(Date.now() + lockDuration);

  const result = await prisma.intent.updateMany({
    where: {
      id: intentId,
      status: 'PENDING',
      OR: [
        { lockedBy: null },
        { lockedUntil: { lt: new Date() } },
      ],
    },
    data: {
      status: 'PROCESSING',
      lockedBy: workerId,
      lockedUntil,
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  });

  return result.count > 0;
}

/**
 * Complete an intent successfully
 */
export async function completeIntent(
  intentId: string,
  result: { txHash?: string; data?: any }
): Promise<void> {
  await prisma.intent.update({
    where: { id: intentId },
    data: {
      status: 'CONFIRMED',
      resultTxHash: result.txHash,
      resultData: result.data as Prisma.InputJsonValue,
      completedAt: new Date(),
      lockedBy: null,
      lockedUntil: null,
    },
  });

  logger.info({ intentId }, 'Intent completed successfully');
}

/**
 * Fail an intent
 */
export async function failIntent(
  intentId: string,
  error: string,
  permanent: boolean = false
): Promise<void> {
  const intent = await prisma.intent.findUnique({ where: { id: intentId } });
  if (!intent) return;

  const maxAttempts = 5;
  const shouldRetry = !permanent && intent.attempts < maxAttempts;

  await prisma.intent.update({
    where: { id: intentId },
    data: {
      status: shouldRetry ? 'PENDING' : 'FAILED',
      errorMessage: error,
      lockedBy: null,
      lockedUntil: null,
      nextRetryAt: shouldRetry
        ? new Date(Date.now() + Math.pow(2, intent.attempts) * 1000)
        : null,
    },
  });

  if (shouldRetry) {
    logger.warn({ intentId, attempt: intent.attempts }, 'Intent failed, will retry');
  } else {
    logger.error({ intentId, error }, 'Intent permanently failed');
  }
}

/**
 * Get intent status
 */
export async function getIntentStatus(intentId: string) {
  return prisma.intent.findUnique({
    where: { id: intentId },
    select: {
      id: true,
      type: true,
      status: true,
      attempts: true,
      resultTxHash: true,
      errorMessage: true,
      createdAt: true,
      completedAt: true,
    },
  });
}

/**
 * Get pending intents for a wallet
 */
export async function getPendingIntents(programId: string, wallet: string) {
  return prisma.intent.findMany({
    where: {
      programId,
      wallet: wallet.toLowerCase(),
      status: { in: ['PENDING', 'PROCESSING'] },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get intents ready for retry
 */
export async function getRetryableIntents(limit = 100) {
  return prisma.intent.findMany({
    where: {
      status: 'PENDING',
      nextRetryAt: { lte: new Date() },
    },
    take: limit,
    orderBy: { nextRetryAt: 'asc' },
  });
}
