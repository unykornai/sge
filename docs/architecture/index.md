# Architecture Guide

Complete technical reference for the SGE multi-tenant settlement platform.

---

## Overview

SGE is designed as an **enterprise-grade settlement platform** with:

- **Multi-tenancy**: Isolated programs with dedicated treasuries
- **Affiliate networks**: Hierarchical tree attribution with commission splits
- **Perfect accounting**: Double-entry ledger with reconciliation
- **Scalability**: Horizontal scaling of API and workers
- **Observability**: Real-time dashboards and structured logging

See [System Architecture](system.html) for full platform design.

---

## Core Documents

### System Design
- [**System Architecture**](system.html) - Platform overview, scaling, deployment topology
- [**Enterprise Platform**](enterprise.html) - Multi-tenant programs, affiliate hierarchy, payout engine
- [**Data & Storage**](data.html) - Database schema, Prisma models, migrations
- [**Workflows**](workflows.html) - Sequence diagrams for all major flows

### Component Architecture
- [**Flow Trees**](flows.html) - Decision trees and state machines
- [**API Overview**](overview.html) - REST endpoints, authentication, rate limiting

---

## Quick Reference

### Settlement Pipeline States

```
PENDING → PROCESSING → CONFIRMED
             ↓
           FAILED
```

### Commission Lifecycle

```
ACCRUED → PAYABLE → PAID
            ↓
      PENDING_APPROVAL
```

### Payout Workflow

```
1. Daily cron finds ACCRUED commissions > 30 days
2. Updates to PAYABLE
3. Creates payout batch (PENDING_APPROVAL)
4. Admin approves via portal
5. Worker executes multi-send
6. Updates to PAID
```

---

## Key Design Decisions

### Why Intent-Based Architecture?

**Problem**: Blockchain transactions can fail silently (insufficient gas, nonce conflicts, etc.)

**Solution**: Intents capture user requests BEFORE blockchain interaction, allowing:
- Idempotent retries (same intent = same outcome)
- Status tracking (user sees "Processing..." not "Error: tx failed")
- Audit trail (full history of all attempts)
- Manual intervention (admin can retry stuck intents)

### Why Double-Entry Ledger?

**Problem**: Commission calculations are error-prone, disputes are expensive

**Solution**: Every financial movement creates balanced ledger entries:
- User pays $10 → DEBIT User, CREDIT Program
- Affiliate earns $0.10 → DEBIT Program, CREDIT Affiliate
- Daily reconciliation verifies: `sumDebits === sumCredits`

**Benefit**: Mathematically impossible to have accounting errors that don't trigger alerts.

### Why Multi-Tenant Programs?

**Problem**: Single treasury mixes client funds, violates separation of concerns

**Solution**: Each program has:
- Dedicated treasury address (Gnosis Safe)
- Isolated ledger for reconciliation
- Custom fee configuration
- Independent API access

**Benefit**: One platform serves multiple clients without fund commingling.

---

## Scaling Strategy

### Current Capacity
- **API**: 2 servers handle ~1k req/sec
- **Workers**: 4 processes handle ~500 intents/sec
- **Database**: Single Postgres instance (100k users, 1M intents)

### Horizontal Scaling Plan
1. **API servers**: Add behind load balancer (stateless)
2. **Workers**: Increase concurrency (BullMQ auto-distributes)
3. **Database**: Add read replicas for analytics queries
4. **Cache**: Add Redis cache for hot data (user status, etc.)

### Bottleneck Analysis
- **Slowest**: Blockchain RPC calls (~500ms avg)
- **Mitigation**: Cache chain state, batch queries
- **Target**: < 100ms API response time (excluding blockchain)

---

## Security Layers

### Application Layer
- **Authentication**: API keys for programmatic access, wallet signatures for user actions
- **Authorization**: Role-based (Client, Affiliate, Admin)
- **Rate limiting**: Per-IP, per-endpoint
- **Input validation**: Zod schemas for all API payloads

### Data Layer
- **Encryption at rest**: Database-level encryption
- **Encryption in transit**: TLS 1.3 for all connections
- **Unique constraints**: Prevent duplicate intents/settlements
- **Foreign keys**: Maintain referential integrity

### Blockchain Layer
- **Relayer isolation**: Hot wallet with minimal balance (< 0.5 ETH)
- **Treasury cold storage**: Multi-sig Gnosis Safe
- **Signature verification**: All webhook payloads HMAC-verified
- **Nonce management**: Sequential nonce tracking prevents replay

---

## For More Information

- **Workflow Diagrams**: [workflows.md](workflows.html)
- **Data Model**: [data.md](data.html)
- **Operations Guide**: [../ops/reconciliation.md](../ops/reconciliation.html)
- **Threat Model**: [../ops/threat-model.md](../ops/threat-model.html)
