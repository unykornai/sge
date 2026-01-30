# VERIFICATION.md (Golden Verification Steps)

## Quick Smoke (Mock Mode)

```powershell
npm install
npm run dev
# open http://localhost:5173
# open http://localhost:3000/healthz
```

Expected:

* app loads
* `/healthz` 200
* no DB/Redis connection attempts
* workers disabled

## Real Mode Boot

```powershell
npm run setup:real
npm run dev:real
```

Expected:

* Postgres + Redis containers healthy
* Prisma client generated
* Workers running
* `/metrics` returns Prometheus metrics
* `/healthz` shows current block (or mock if configured)

## Idempotency Test

Run twice with same `Idempotency-Key` and same body:

```powershell
$k="idem-test-123"
curl.exe -H "Idempotency-Key: $k" -H "Content-Type: application/json" `
  -d "{\"wallet\":\"0x1111111111111111111111111111111111111111\"}" `
  http://localhost:3000/api/register

curl.exe -H "Idempotency-Key: $k" -H "Content-Type: application/json" `
  -d "{\"wallet\":\"0x1111111111111111111111111111111111111111\"}" `
  http://localhost:3000/api/register
```

Expected:

* second response matches first (same txHash/tokenId payload)
* DB has one idempotency record (REAL mode)

## Rate Limit Test

Hit register more than 5 times quickly:
Expected:

* 429 after threshold
* response includes reset info headers

## Queue / DLQ Test (Real Mode)

Trigger a forced failure path (config flag or test route):
Expected:

* job retries with backoff
* after max attempts, job moves to DLQ
* metric increments DLQ count

## Reconciliation Test

Force a stuck intent (LOCKED older than threshold):
Expected:

* sweeper moves it to FAILED or requeues
* audit log entry created

## Load Test

```bash
# from ops/k6
k6 run register.js
k6 run claim.js
```

Success criteria:

* zero duplicate claims
* ledger imbalance count = 0
* p95 under target per endpoint

---

## Worker Safety Tests (Phase 1 Validation)

### Test 1: Mock Mode (Workers Disabled)

```powershell
# Ensure MOCK_MODE=true in packages/api/.env
npm run dev
```

**Expected:**
- ✅ API starts on port 3000
- ✅ App starts on port 5173
- ✅ **NO workers process**
- ✅ Log shows: `[api] Starting API server...`
- ✅ NO database connection attempts

**Verify health:**
```powershell
curl http://localhost:3000/healthz
```

Should return:
```json
{
  "ok": true,
  "mode": "MOCK",
  "chainId": 1,
  ...
}
```

---

### Test 2: Worker Hard Kill Switch

```powershell
# Try to manually start workers (should exit immediately)
npm run worker:dev -w @sge/api
```

**Expected:**
- ✅ Log shows: `[workers] MOCK_MODE=true -> workers disabled`
- ✅ Process exits with code 0 (clean exit)
- ✅ **NO** database connection attempts
- ✅ Terminal returns to prompt immediately

---

## Test 3: Real Mode Validation (Database Required)

```powershell
# Set MOCK_MODE=false in packages/api/.env
# But DON'T start Docker yet
npm run dev:real
```

**Expected:**
- ❌ API refuses to start
- ✅ Error message: `DATABASE_URL is required when MOCK_MODE=false`
- ✅ Process exits (prevents half-boot)

---

## Test 4: Real Mode Success Path

```powershell
# Full stack setup
npm run setup:real
npm run dev:real
```

**Expected:**
- ✅ Docker starts Postgres + Redis
- ✅ Prisma generates client
- ✅ Prisma pushes schema to DB
- ✅ API starts and connects to Postgres
- ✅ Workers start and connect to Redis
- ✅ App starts

**Verify all services:**
```powershell
# Check Docker
docker ps

# Should show:
# - sge-postgres (port 5432)
# - sge-redis (port 6379)

# Check health
curl http://localhost:3000/healthz
```

Should return:
```json
{
  "ok": true,
  "mode": "REAL",
  "database": "connected",
  "redis": "connected",
  ...
}
```

---

## Test 5: Worker Behavior in Real Mode

With `npm run dev:real` running, check logs for:

```
[workers] Starting all workers...
[workers] ✓ Intent worker started (concurrency: 5)
[workers] ✓ Payout worker started (concurrency: 2)
[workers] ✓ Reconciler worker started
[workers] All workers started { workerCount: 3 }
```

---

## Success Criteria

| Test | Pass Criteria |
|------|---------------|
| Mock Mode | API + App run, NO workers, NO DB connections |
| Hard Kill Switch | Workers exit immediately with clean log |
| Real Mode Validation | API refuses to start without DATABASE_URL |
| Real Mode Success | Full stack runs with DB + Redis + Workers |
| Worker Behavior | Workers process jobs from Redis queue |

---

## Cleanup

```powershell
# Stop all dev servers (Ctrl+C)

# Stop Docker
npm run db:down

# Reset to mock mode
# Edit packages/api/.env: MOCK_MODE=true
```

---

## Next Level: Load Testing

Once verified, add load testing:

```bash
# Install k6
npm install -D @grafana/k6

# Run load test
npm run test:load
```

**Load test should verify:**
- 1000 concurrent registrations
- No duplicate intents (idempotency)
- Ledger always balanced
- < 5s p95 settlement latency
