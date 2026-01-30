/**
 * Intent Worker
 * 
 * Processes pending intents (register, claim, commerce, payout).
 * Handles retries and failure states.
 */

import { Job } from 'bullmq';
import { createWorker } from '../lib/queue';
import { logger } from '../lib/logger';
import { prisma } from '../lib/db';
import * as intentService from '../services/intent.service';
import { processSettlementCommissions } from '../services/commission.service';
import { IntentType } from '../generated/prisma';

interface IntentJobData {
  intentId: string;
}

/**
 * Process an intent based on its type
 */
async function processIntent(job: Job<IntentJobData>) {
  const { intentId } = job.data;
  const workerId = `worker-${process.pid}-${job.id}`;

  // Try to lock the intent
  const locked = await intentService.lockIntent(intentId, workerId);
  if (!locked) {
    logger.info({ intentId }, 'Intent already locked, skipping');
    return { skipped: true };
  }

  const intent = await prisma.intent.findUnique({
    where: { id: intentId },
    include: { program: true },
  });

  if (!intent) {
    throw new Error(`Intent ${intentId} not found`);
  }

  try {
    let result: { txHash?: string; data?: any };

    switch (intent.type) {
      case 'REGISTER':
        result = await processRegisterIntent(intent);
        break;
      case 'CLAIM':
        result = await processClaimIntent(intent);
        break;
      case 'COMMERCE_PAYMENT':
        result = await processCommerceIntent(intent);
        break;
      case 'PAYOUT':
        result = await processPayoutIntent(intent);
        break;
      default:
        throw new Error(`Unknown intent type: ${intent.type}`);
    }

    // Mark intent as completed
    await intentService.completeIntent(intentId, result);

    // Create settlement record if we have a tx hash
    if (result.txHash) {
      const settlement = await prisma.settlement.create({
        data: {
          programId: intent.programId,
          intentId: intent.id,
          wallet: intent.wallet,
          type: intent.type === 'REGISTER' ? 'MINT' : intent.type,
          token: (intent.payload as any)?.token || null,
          amount: (intent.payload as any)?.amount || intent.program.feeUsd,
          txHash: result.txHash,
          blockNumber: BigInt((result.data as any)?.blockNumber || 0),
          blockTimestamp: new Date(),
          status: 'CONFIRMED',
        },
      });

      // Process commissions for this settlement
      await processSettlementCommissions(settlement.id);
    }

    return result;
  } catch (error: any) {
    await intentService.failIntent(intentId, error.message);
    throw error;
  }
}

/**
 * Process SGE-ID registration (gasless mint)
 */
async function processRegisterIntent(intent: any): Promise<{ txHash?: string; data?: any }> {
  const { wallet } = intent;
  const { program } = intent;

  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: {
      programId_wallet: {
        programId: program.id,
        wallet: wallet.toLowerCase(),
      },
    },
  });

  if (user?.sgeidTokenId) {
    return {
      data: { 
        message: 'Already registered',
        tokenId: user.sgeidTokenId.toString(),
      },
    };
  }

  // Create user if not exists
  if (!user) {
    const payload = intent.payload as any;
    user = await prisma.user.create({
      data: {
        programId: program.id,
        wallet: wallet.toLowerCase(),
        referredById: payload?.affiliateId,
        referredAt: payload?.affiliateId ? new Date() : null,
      },
    });
  }

  // TODO: Implement actual gasless mint
  // For now, simulate in mock mode
  if (process.env.MOCK_MODE === 'true' || program.mockMode) {
    const mockTokenId = Date.now();
    const mockTxHash = `0x${Buffer.from(`mock-mint-${mockTokenId}`).toString('hex').slice(0, 64).padEnd(64, '0')}`;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        sgeidTokenId: BigInt(mockTokenId),
        sgeidMintedAt: new Date(),
      },
    });

    return {
      txHash: mockTxHash,
      data: {
        tokenId: mockTokenId.toString(),
        mock: true,
      },
    };
  }

  // Real implementation would use relayer to mint
  throw new Error('Real minting not yet implemented');
}

/**
 * Process token claim
 */
async function processClaimIntent(intent: any): Promise<{ txHash?: string; data?: any }> {
  const { wallet, payload, program } = intent;
  const token = (payload as any)?.token || 'USDC';

  // Check if user has registered
  const user = await prisma.user.findUnique({
    where: {
      programId_wallet: {
        programId: program.id,
        wallet: wallet.toLowerCase(),
      },
    },
  });

  if (!user?.sgeidTokenId) {
    throw new Error('User must register before claiming');
  }

  if (user.hasClaimed) {
    return {
      data: {
        message: 'Already claimed',
        claimTxHash: user.claimTxHash,
      },
    };
  }

  // TODO: Verify payment was received (commerce check)
  // TODO: Implement actual claim execution

  if (process.env.MOCK_MODE === 'true' || program.mockMode) {
    const mockTxHash = `0x${Buffer.from(`mock-claim-${Date.now()}`).toString('hex').slice(0, 64).padEnd(64, '0')}`;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        hasClaimed: true,
        claimedAt: new Date(),
        claimTxHash: mockTxHash,
      },
    });

    return {
      txHash: mockTxHash,
      data: {
        claimAmount: Number(program.claimAmount),
        token: 'SGE',
        mock: true,
      },
    };
  }

  throw new Error('Real claiming not yet implemented');
}

/**
 * Process commerce payment confirmation
 */
async function processCommerceIntent(intent: any): Promise<{ txHash?: string; data?: any }> {
  const { payload } = intent;
  const chargeId = (payload as any)?.chargeId;

  // This would verify the payment with Coinbase Commerce
  // and create the appropriate records

  return {
    data: {
      chargeId,
      verified: true,
      mock: process.env.MOCK_MODE === 'true',
    },
  };
}

/**
 * Process payout intent
 */
async function processPayoutIntent(intent: any): Promise<{ txHash?: string; data?: any }> {
  const { payload } = intent;
  const payoutId = (payload as any)?.payoutId;

  // This delegates to the payout service
  const { processPayout } = await import('../services/payout.service');
  await processPayout(payoutId);

  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });

  return {
    txHash: payout?.txHash || undefined,
    data: {
      payoutId,
      status: payout?.status,
    },
  };
}

/**
 * Start the intent worker
 */
export function startIntentWorker(concurrency = 5) {
  const worker = createWorker<IntentJobData>('intents', processIntent, concurrency);
  
  logger.info({ concurrency }, 'Intent worker started');
  
  return worker;
}
