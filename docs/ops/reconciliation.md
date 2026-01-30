# Reconciliation & Operational Monitoring

> **Ensuring settlement integrity through continuous verification and alerting**

::: tip OPS
This is the "survive production traffic" runbook. Use the reconciliation dashboard daily.
:::

## Overview

The SGE settlement platform uses **double-entry accounting** with continuous reconciliation to ensure financial integrity. The reconciliation dashboard provides real-time visibility into system health and flags issues before they escalate.

**Dashboard URL**: `/admin/reconciliation`

**Refresh Frequency**: Auto-refresh every 30 seconds (configurable)

---

## Health Metrics

### 1. Ledger Status

**What it checks**: Sum of all debits equals sum of all credits for each program.

**Expected**: ✅ "Balanced" (difference < $0.01)

**Alert Threshold**: Any imbalance > $0.01

**Resolution**:
1. Check for incomplete settlement flows
2. Verify commission calculations
3. Review payout batch records
4. Run manual reconciliation: `POST /api/admin/reconciliation/force-reconcile`

```bash
# Manual reconciliation
curl -X POST https://api.sge.energy/admin/reconciliation/force-reconcile \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"programId": "program_main"}'
```

### 2. Worker Status

**What it checks**: Worker process heartbeats and job processing rates.

**Expected**: ✅ "Healthy" (workers running, jobs completing)

**Alert Thresholds**:
- ⚠️ "Degraded": Workers slow but operational (processing time > 2x baseline)
- ❌ "Down": No worker heartbeats for > 60 seconds

**Resolution**:
```bash
# Check worker logs
docker logs sge-api-worker-1

# Restart workers
npm run worker:dev

# Or with Docker
docker-compose restart api-worker
```

### 3. Queue Depth

**What it checks**: Number of jobs waiting in the settlement queue.

**Expected**: ✅ < 100 jobs

**Alert Thresholds**:
- ⚠️ 100-500 jobs: Workers may be slow
- ❌ > 500 jobs: Backlog forming, investigate immediately

**Resolution**:
1. Scale up workers (add more instances)
2. Check for stuck jobs blocking the queue
3. Review RPC endpoint performance (blockchain calls)

```bash
# Check queue status
curl https://api.sge.energy/admin/queue/status \
  -H "Authorization: Bearer $ADMIN_API_KEY"

# Drain queue (pause new jobs)
curl -X POST https://api.sge.energy/admin/queue/pause \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

### 4. Average Processing Time

**What it checks**: Time from intent creation to completion (last 100 intents).

**Expected**: ✅ < 5 seconds

**Alert Thresholds**:
- ⚠️ 5-15 seconds: Degraded performance
- ❌ > 15 seconds: Investigate bottlenecks

**Common Causes**:
- RPC rate limiting (switch provider or increase tier)
- Database slow queries (check indexes)
- High network latency (check blockchain congestion)

---

## Alert Types

### 🚨 Stuck Settlement Intents

**Definition**: Intents in `payment_pending`, `verifying`, or `processing` status for longer than `INTENT_TIMEOUT_MINUTES` (default: 10 minutes).

**Why it happens**:
- Payment provider webhook delay
- RPC call timeout
- Database transaction deadlock
- Worker crash mid-processing

**Dashboard View**: Shows intent ID, user, amount, status, and stuck duration.

**Manual Retry**:
```bash
curl -X POST https://api.sge.energy/admin/reconciliation/retry-intent \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"intentId": "intent_abc123"}'
```

**Automated Recovery**: Workers automatically retry failed jobs with exponential backoff (1min, 5min, 15min, 1hr).

**Prevention**:
- Set webhook timeout thresholds
- Implement circuit breakers for RPC calls
- Use idempotency keys to prevent duplicate processing

---

### ⚖️ Ledger Imbalances

**Definition**: Sum of debits ≠ sum of credits for a program (difference > $0.01).

**Why it happens** (should be **extremely rare**):
- Partial transaction commit (database rollback failure)
- Manual database modification
- Bug in commission calculation
- Race condition in concurrent processing

**Dashboard View**: Shows program, expected vs actual balance, and difference.

**Investigation Steps**:
```sql
-- Check ledger entries for program
SELECT * FROM ledger_entries
WHERE program_id = 'program_main'
ORDER BY created_at DESC;

-- Sum debits and credits
SELECT
  type,
  SUM(amount) as total
FROM ledger_entries
WHERE program_id = 'program_main'
GROUP BY type;
```

**Resolution**:
1. **DO NOT** manually insert ledger entries
2. Identify missing or duplicate entry
3. Create correcting entry through API
4. Document in incident log

::: danger SECURITY
Ledger imbalances require immediate investigation. This should **never happen** in a properly functioning system.
:::

---

### 💰 Pending Payout Batches

**Definition**: Payout batches in `pending_approval` or `approved` status.

**Why it appears**:
- Awaiting 2-person approval (security control)
- Batch created but not yet executed
- Insufficient treasury balance

**Dashboard View**: Shows batch ID, program, affiliate count, total amount, and status.

**Approval Workflow**:
```bash
# Approve batch (requires PAYOUT_APPROVER_1 or PAYOUT_APPROVER_2 key)
curl -X POST https://api.sge.energy/admin/payouts/batch/{batchId}/approve \
  -H "Authorization: Bearer $APPROVER_KEY"

# Execute batch (after approval)
curl -X POST https://api.sge.energy/admin/payouts/batch/{batchId}/execute \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

**SLA**: Batches should be approved within 24 hours of creation.

**Prevention**: Automate approval for batches under threshold (e.g., < $10,000).

---

### 🔔 Webhook Failures

**Definition**: Webhook delivery attempts that failed and are scheduled for retry.

**Why it happens**:
- Recipient endpoint down
- Timeout (> 30 seconds)
- Invalid SSL certificate
- Signature verification failure

**Dashboard View**: Shows event type, endpoint, attempt count, error, and next retry.

**Retry Schedule**:
- Attempt 1: Immediate
- Attempt 2: 1 minute later
- Attempt 3: 5 minutes later
- Attempt 4: 15 minutes later
- Attempt 5: 1 hour later
- **After 5 failures**: Alert admin, manual intervention required

**Manual Retry**:
```bash
curl -X POST https://api.sge.energy/admin/webhooks/{webhookId}/retry \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

**Permanent Failure Handling**:
- Disable webhook after 24 hours of consecutive failures
- Notify recipient via email
- Store events for later replay

---

## Runbook: Daily Operations

### Morning Checklist (5 minutes)

1. ✅ Open reconciliation dashboard
2. ✅ Verify all metrics are green
3. ✅ Check for stuck intents (should be zero)
4. ✅ Verify ledger balance (should be zero difference)
5. ✅ Review pending payouts (approve if ready)
6. ✅ Check webhook failures (investigate if > 5)

### Weekly Deep Dive (30 minutes)

1. 📊 Review processing time trends (are we getting slower?)
2. 📊 Analyze queue depth patterns (peak times?)
3. 📊 Commission accuracy spot-check (sample 10 settlements)
4. 📊 Payout execution history (any delays?)
5. 📊 RPC provider performance (uptime, latency)

### Monthly Audit (2 hours)

1. 🔍 Full ledger reconciliation for all programs
2. 🔍 Cross-reference settlements with blockchain transactions
3. 🔍 Review affiliate tree integrity (no cycles, no orphans)
4. 🔍 Verify commission rates match contract terms
5. 🔍 Export audit trail for compliance

---

## SLOs (Service Level Objectives)

### Availability
- **Target**: 99.9% uptime (43 minutes downtime/month)
- **Measured**: Health check endpoint response time

### Intent Processing
- **Target**: 95% of intents complete within 5 seconds
- **Measured**: Time from creation to completion

### Ledger Accuracy
- **Target**: 100% balanced (zero tolerance for imbalance)
- **Measured**: Daily reconciliation checks

### Payout Execution
- **Target**: 95% of payouts execute within 24 hours of approval
- **Measured**: Time from approval to execution

---

## Incident Response

### P0: Ledger Imbalance Detected
**Impact**: Financial integrity compromised  
**Response Time**: Immediate (< 15 minutes)  
**Actions**:
1. Page on-call engineer immediately
2. Pause all new settlements
3. Investigate root cause
4. Create correcting entry (if safe to do so)
5. Resume operations after verification
6. Post-mortem within 24 hours

### P1: Workers Down
**Impact**: No settlements processing  
**Response Time**: < 30 minutes  
**Actions**:
1. Check worker logs for crash cause
2. Restart workers
3. Verify queue is draining
4. Monitor for repeat failures

### P2: High Queue Depth (> 500 jobs)
**Impact**: Slow settlement processing  
**Response Time**: < 2 hours  
**Actions**:
1. Scale up worker count
2. Check RPC provider status
3. Review recent deployments (did we introduce a bug?)
4. Monitor until queue clears

### P3: Webhook Failures (> 10 consecutive)
**Impact**: External systems not notified  
**Response Time**: < 4 hours  
**Actions**:
1. Contact recipient to check endpoint status
2. Verify webhook signature is correct
3. Retry failed deliveries after fix

---

## Monitoring & Alerting

### Slack/Discord Integration
```bash
# Set webhook URL in .env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ

# Alerts sent for:
# - Ledger imbalance detected
# - Worker down for > 5 minutes
# - Queue depth > 500
# - Intent stuck > 15 minutes
```

### Metrics Export (Prometheus)
```yaml
# /metrics endpoint exposes:
sge_intent_processing_duration_seconds
sge_ledger_balance_difference_cents
sge_queue_depth_total
sge_worker_status{status="healthy|degraded|down"}
```

### Dashboard URL
Production: `https://app.sge.energy/admin/reconciliation`  
Staging: `https://staging.sge.energy/admin/reconciliation`

---

## Automation

### Scheduled Jobs

**Daily Reconciliation** (runs at 2 AM UTC)
```bash
0 2 * * * /usr/local/bin/reconcile-ledger.sh
```

**Weekly Payout Reminder** (runs Monday 9 AM)
```bash
0 9 * * 1 /usr/local/bin/payout-reminder.sh
```

**Monthly Audit Export** (runs 1st of month)
```bash
0 0 1 * * /usr/local/bin/export-audit.sh
```

---

## Related Documentation
- [Architecture: Settlement Flow](../architecture/flows.md#settlement-lifecycle)
- [Architecture: Double-Entry Ledger](../architecture/data.md#ledger-system)
- [Operations: Incident Playbook](./threat-model.md)
- [Admin API Reference](../api/admin.md)
