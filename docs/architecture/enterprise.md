# Enterprise Settlement Platform

This document describes the enterprise-grade multi-tenant settlement, affiliate, and payout system architecture.

## Overview

The platform supports:
- **Multi-tenant Programs**: Each program is isolated with its own affiliates, users, and settlements
- **Intent-based Processing**: Idempotent operations via idempotency keys
- **Double-Entry Ledger**: Guaranteed balance between debits and credits
- **2-Level Affiliate Hierarchy**: Direct commissions + parent override commissions
- **Automated Payouts**: Batch payouts with 2-person approval control
- **Reconciliation**: Nightly on-chain/off-chain verification

```mermaid
graph TB
    subgraph "User Layer"
        USER[User Portal]
        AFF[Affiliate Portal]
        ADMIN[Admin Portal]
    end

    subgraph "API Layer"
        API[Express API Server]
        ROUTES[Enterprise Routes /api/v2]
    end

    subgraph "Service Layer"
        INTENT[Intent Service]
        LEDGER[Ledger Service]
        COMM[Commission Service]
        PAYOUT[Payout Service]
        AUDIT[Audit Service]
        RECON[Reconciliation Service]
    end

    subgraph "Queue Layer"
        REDIS[(Redis)]
        QUEUES[BullMQ Queues]
        WORKERS[Background Workers]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL)]
        PRISMA[Prisma ORM]
    end

    USER --> API
    AFF --> API
    ADMIN --> API
    
    API --> ROUTES
    ROUTES --> INTENT
    ROUTES --> LEDGER
    ROUTES --> COMM
    ROUTES --> PAYOUT
    
    INTENT --> QUEUES
    QUEUES --> WORKERS
    WORKERS --> PRISMA
    
    PRISMA --> PG
    QUEUES --> REDIS
```

## Core Concepts

### Programs (Multi-tenancy)

Each **Program** represents an isolated settlement environment:

```typescript
interface Program {
  id: string;
  name: string;
  slug: string;          // Unique URL-safe identifier
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
  baseCommissionRate: number;  // Default commission %
  overrideCommissionRate: number; // Parent commission %
  settings: Record<string, any>;
}
```

### Intents (Idempotent Operations)

All state-changing operations go through the **Intent Pipeline**:

```mermaid
stateDiagram-v2
    [*] --> PENDING: Create Intent
    PENDING --> LOCKED: Worker picks up
    LOCKED --> COMPLETED: Success
    LOCKED --> FAILED: Error
    FAILED --> PENDING: Retry
    COMPLETED --> [*]
```

**Idempotency Keys** prevent duplicate processing:
```
REGISTER:{programId}:{wallet}
CLAIM:{programId}:{wallet}:{claimId}
COMMERCE:{programId}:{chargeCode}
PAYOUT:{batchId}:{affiliateId}
```

### Double-Entry Ledger

Every money movement creates balanced ledger entries:

| Transaction | Debit Account | Credit Account |
|-------------|---------------|----------------|
| Settlement Revenue | `program:{id}:revenue` | `system:settlements` |
| Commission Accrual | `affiliate:{id}:liability` | `program:{id}:expense` |
| Commission Payout | `system:payouts` | `affiliate:{id}:liability` |

The ledger must always balance: `Σ debits = Σ credits`

### Affiliate Hierarchy

```mermaid
graph TD
    PARTNER[Partner Affiliate]
    AFF1[Affiliate 1]
    AFF2[Affiliate 2]
    AFF3[Affiliate 3]
    
    PARTNER --> AFF1
    PARTNER --> AFF2
    AFF1 --> AFF3
    
    AFF3 -->|refers| USER1[User 1]
    AFF3 -->|refers| USER2[User 2]
```

**Commission Types:**
- **DIRECT**: Paid to the referring affiliate (e.g., 10%)
- **OVERRIDE**: Paid to the parent affiliate (e.g., 2%)

### Payout Workflow

```mermaid
sequenceDiagram
    participant Admin1 as Admin 1
    participant System
    participant Admin2 as Admin 2
    participant Blockchain

    Admin1->>System: Create Payout Batch
    Note over System: Status: DRAFT
    
    Admin1->>System: Add Payouts to Batch
    Admin1->>System: Submit for Approval
    Note over System: Status: PENDING_APPROVAL
    
    Admin2->>System: Review & Approve
    Note over System: Status: APPROVED
    
    Admin2->>System: Execute Batch
    System->>Blockchain: Process Payouts
    Note over System: Status: EXECUTED
```

**2-Person Control**: The creator of a batch cannot approve it.

## API Reference

### Programs API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/programs` | POST | Create program |
| `/api/v2/programs` | GET | List programs |
| `/api/v2/programs/:id` | GET | Get program |
| `/api/v2/programs/:id` | PUT | Update program |

### Affiliates API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/affiliates/register` | POST | Register affiliate |
| `/api/v2/affiliates/tree` | GET | Get downline tree |
| `/api/v2/affiliates/:id/stats` | GET | Affiliate statistics |
| `/api/v2/affiliates/:id/commissions` | GET | Commission history |

### Users API (Intent-based)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/users/register` | POST | Create registration intent |
| `/api/v2/users/:wallet` | GET | Get user status |

### Claims API (Intent-based)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/claims` | POST | Create claim intent |
| `/api/v2/claims/:id` | GET | Get claim status |

### Payouts API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/payouts/batch` | POST | Create batch |
| `/api/v2/payouts/batch` | GET | List batches |
| `/api/v2/payouts/batch/:id/add` | POST | Add payout to batch |
| `/api/v2/payouts/batch/:id/approve` | POST | Approve batch |
| `/api/v2/payouts/batch/:id/execute` | POST | Execute batch |

### Enterprise Admin API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/enterprise/ledger/balance` | GET | Verify ledger balance |
| `/api/v2/enterprise/audit` | GET | Query audit log |
| `/api/v2/enterprise/reconcile` | POST | Run reconciliation |
| `/api/v2/enterprise/settlements` | GET | List settlements |

## Data Model

### Core Tables

```
┌─────────────────────────────────────────────────────────────────┐
│                          Program                                 │
├─────────────────────────────────────────────────────────────────┤
│ id, name, slug, status, baseCommissionRate, settings            │
└─────────────────────────────────────────────────────────────────┘
        │
        ├───────────────────────────────────────┐
        │                                       │
        ▼                                       ▼
┌─────────────────────┐               ┌─────────────────────┐
│     Affiliate       │               │       User          │
├─────────────────────┤               ├─────────────────────┤
│ id, wallet, tier    │◄──────────────│ id, wallet, status  │
│ referralCode        │  affiliateId  │ affiliateId         │
│ parentId (self-ref) │               │                     │
└─────────────────────┘               └─────────────────────┘
        │                                       │
        │                                       │
        ▼                                       ▼
┌─────────────────────┐               ┌─────────────────────┐
│    Commission       │               │    Settlement       │
├─────────────────────┤               ├─────────────────────┤
│ id, amount, type    │               │ id, amount, status  │
│ status, affiliateId │               │ userId, txHash      │
└─────────────────────┘               └─────────────────────┘
```

### Supporting Tables

- **Intent**: Tracks all pending operations with idempotency keys
- **LedgerEntry**: Double-entry accounting records
- **PayoutBatch**: Batch payout management
- **Payout**: Individual payout records
- **AuditLog**: Immutable audit trail

## Background Jobs

### Queues

| Queue | Purpose | Concurrency |
|-------|---------|-------------|
| `intents` | Process pending intents | 5 workers |
| `settlements` | Process settlements | 3 workers |
| `payouts` | Execute payouts | 2 workers |
| `reconciler` | Reconciliation jobs | 1 worker |
| `notifications` | Send notifications | 3 workers |

### Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Nightly Reconciliation | 2:00 AM | Full ledger + settlement verification |
| Stuck Intent Reset | Every 15 min | Reset intents stuck in LOCKED state |
| Retry Failed Intents | Every 5 min | Retry FAILED intents with retry count |

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sge

# Redis
REDIS_URL=redis://localhost:6379

# Security
ADMIN_KEY=your-admin-key
JWT_SECRET=your-jwt-secret

# Blockchain
RPC_URL=https://mainnet.infura.io/v3/...
RELAYER_PRIVATE_KEY=0x...
```

### Running Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (development)
npx prisma db seed
```

## Deployment

### Production Checklist

- [ ] DATABASE_URL configured with connection pooling
- [ ] REDIS_URL configured with persistence
- [ ] Admin keys rotated
- [ ] Rate limiting configured
- [ ] Monitoring/alerting set up
- [ ] Backup strategy in place

### Horizontal Scaling

The platform is designed for horizontal scaling:

1. **API Servers**: Stateless, can run N instances behind a load balancer
2. **Workers**: Can run on separate machines, Redis handles job distribution
3. **Database**: Use read replicas for query-heavy operations
4. **Redis**: Use Redis Cluster for high availability

## Monitoring

### Key Metrics

- **Intent Processing Rate**: Intents processed per minute
- **Settlement Volume**: Total settlements by day/week
- **Ledger Balance**: Should always be 0 (balanced)
- **Queue Depth**: Jobs waiting in each queue
- **Error Rate**: Failed intents / total intents

### Health Checks

- `GET /healthz` - Basic health check
- `GET /api/v2/enterprise/ledger/balance` - Ledger health
- `GET /api/v2/enterprise/reconciliation` - Reconciliation status
