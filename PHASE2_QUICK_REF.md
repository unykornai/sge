# Phase 2 Quick Reference

## Installation (One Command)

```powershell
.\scripts\install-phase2.ps1
```

## Testing Commands

### 1. Test Idempotency
```powershell
$key="test-123"
$wallet='{"wallet":"0x1111111111111111111111111111111111111111"}'
curl -H "Idempotency-Key: $key" -H "Content-Type: application/json" -d $wallet http://localhost:3000/api/register
curl -H "Idempotency-Key: $key" -H "Content-Type: application/json" -d $wallet http://localhost:3000/api/register
# Second response has X-Idempotency: HIT
```

### 2. Test Rate Limiting
```powershell
# Hit register 6 times (limit is 5/hour)
for ($i=1; $i -le 6; $i++) { 
    curl -H "Content-Type: application/json" -d "{\"wallet\":\"0x$($i.ToString().PadLeft(40,'0'))\"}" http://localhost:3000/api/register 
}
# 6th request returns 429
```

### 3. Check Metrics
```powershell
curl http://localhost:3000/metrics
```

### 4. Load Test
```powershell
cd ops\k6
k6 run register.js  # 1000 VUs
k6 run claim.js     # 500 VUs
```

## Environment Variables

```env
# Rate Limiting
RL_REGISTER_PER_HOUR=5            # Default: 5 registrations/hour per IP
RL_REGISTER_PER_DAY_WALLET=10     # Default: 10 registrations/day per wallet
RL_CLAIM_PER_HOUR=60              # Default: 60 claims/hour per wallet

# OpenTelemetry (optional)
OTEL_ENABLED=true                 # Enable distributed tracing
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

## API Changes

### New Endpoint
- `GET /metrics` - Prometheus metrics

### New Headers (Request)
- `Idempotency-Key: <unique-key>` - Prevents duplicate operations

### New Headers (Response)
- `X-Idempotency: HIT|MISS` - Cache status
- `X-RateLimit-Limit: <number>` - Rate limit max
- `X-RateLimit-Remaining: <number>` - Requests remaining
- `X-RateLimit-Reset: <timestamp>` - Reset time (Unix epoch)

## File Structure

```
packages/api/src/
├── middleware/
│   ├── idempotency.ts     ← NEW: Idempotency middleware
│   └── ratelimit.ts       ← NEW: Rate limiting
├── services/
│   └── idempotency.service.ts  ← NEW: Storage logic
├── lib/
│   └── metrics.ts         ← NEW: Prometheus metrics
├── otel.ts                ← NEW: OpenTelemetry (opt-in)
└── ...

ops/k6/
├── register.js            ← NEW: Load test
└── claim.js               ← NEW: Load test

scripts/
└── install-phase2.ps1     ← NEW: Installation script
```

## Database Changes

### New Model (Prisma)
```prisma
model IdempotencyRecord {
  id           String   @id @default(cuid())
  key          String
  requestHash  String
  statusCode   Int
  responseBody Json
  // ... other fields
  
  @@unique([key, requestHash])
}
```

### Migration Command
```powershell
cd packages\api
npx prisma migrate dev --name add_idempotency_records
```

## Success Indicators

✅ **Idempotency works:** Second request with same key returns cached response  
✅ **Rate limiting works:** 6th request within hour returns 429  
✅ **Metrics work:** `/metrics` endpoint returns Prometheus format  
✅ **Load tests pass:** k6 completes without errors  
✅ **MOCK mode still works:** No DB/Redis required  

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Module not found: prom-client | `npm install prom-client` in packages/api |
| IdempotencyRecord table missing | Run `npx prisma migrate dev` |
| /metrics returns 404 | Check server.ts has metrics endpoint |
| k6 not found | Install: `choco install k6` |

## Performance

| Metric | MOCK Mode | REAL Mode |
|--------|-----------|-----------|
| Idempotency overhead | <1ms | ~5-10ms |
| Rate limit overhead | <1ms | ~2-5ms |
| Metrics overhead | ~1ms | ~1ms |
| **Total added latency** | **~2-3ms** | **~10-15ms** |

## Next Phase

See [NEXT_SR_PROMPT.md](NEXT_SR_PROMPT.md) for Phase 3:
- DLQ (Dead Letter Queue)
- Grafana dashboards
- CI integration
- Webhook deduplication
- Transaction-safe settlement locking
