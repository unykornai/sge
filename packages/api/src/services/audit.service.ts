/**
 * Audit Service
 * 
 * Provides immutable audit logging for all sensitive actions.
 * Required for compliance and debugging.
 */

import { prisma } from '../lib/db';
import { logger } from '../lib/logger';
import { Prisma } from '../generated/prisma';

export type AuditAction =
  | 'AFFILIATE_CREATED'
  | 'AFFILIATE_UPDATED'
  | 'AFFILIATE_SUSPENDED'
  | 'USER_REGISTERED'
  | 'USER_ATTRIBUTED'
  | 'INTENT_CREATED'
  | 'INTENT_COMPLETED'
  | 'INTENT_FAILED'
  | 'SETTLEMENT_CONFIRMED'
  | 'SETTLEMENT_FAILED'
  | 'COMMISSION_ACCRUED'
  | 'COMMISSION_PAID'
  | 'PAYOUT_BATCH_CREATED'
  | 'PAYOUT_BATCH_APPROVED'
  | 'PAYOUT_EXECUTED'
  | 'PAYOUT_FAILED'
  | 'PROGRAM_CREATED'
  | 'PROGRAM_UPDATED'
  | 'ADMIN_ACTION'
  | 'RECONCILIATION_RUN'
  | 'RECONCILIATION_MISMATCH';

export interface AuditLogInput {
  programId?: string;
  action: AuditAction;
  actorId?: string;
  actorType?: 'ADMIN' | 'SYSTEM' | 'AFFILIATE' | 'USER';
  targetType?: string;
  targetId?: string;
  before?: any;
  after?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry (immutable)
 */
export async function log(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        programId: input.programId,
        action: input.action,
        actorId: input.actorId,
        actorType: input.actorType,
        targetType: input.targetType,
        targetId: input.targetId,
        before: input.before as Prisma.InputJsonValue,
        after: input.after as Prisma.InputJsonValue,
        metadata: input.metadata as Prisma.InputJsonValue,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });

    logger.debug(
      { action: input.action, targetType: input.targetType, targetId: input.targetId },
      'Audit log created'
    );
  } catch (error: any) {
    // Never fail the main operation due to audit logging
    logger.error({ error: error.message, action: input.action }, 'Failed to create audit log');
  }
}

/**
 * Query audit logs
 */
export async function query(options: {
  programId?: string;
  action?: AuditAction;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const {
    programId,
    action,
    actorId,
    targetType,
    targetId,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = options;

  const where: Prisma.AuditLogWhereInput = {};
  
  if (programId) where.programId = programId;
  if (action) where.action = action;
  if (actorId) where.actorId = actorId;
  if (targetType) where.targetType = targetType;
  if (targetId) where.targetId = targetId;
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Get audit trail for a specific entity
 */
export async function getEntityAuditTrail(targetType: string, targetId: string) {
  return prisma.auditLog.findMany({
    where: { targetType, targetId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Get recent actions by an actor
 */
export async function getActorHistory(actorId: string, limit = 100) {
  return prisma.auditLog.findMany({
    where: { actorId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export const audit = {
  log,
  query,
  getEntityAuditTrail,
  getActorHistory,
};

export default audit;
