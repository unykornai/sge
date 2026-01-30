# NEXT_SR_PROMPT.md (Phase 2: Production Hardening + Scale)

## Objective

Upgrade `unykornai/sge` into an enterprise-grade, high-throughput settlement + affiliate platform that can safely handle **10k concurrent clients**, with **idempotent execution**, **queue durability**, **observability**, **rate limiting**, and **reconciliation**. Must support both:

* **MOCK_MODE (fork-and-run)**: zero external deps, no DB/Redis required
* **REAL_MODE (production)**: Postgres + Redis + workers + metrics + tracing

## Non-Negotiable Invariants

1. **Idempotency**: every write/settlement endpoint accepts `Idempotency-Key` and returns the same response for duplicates.
2. **Ledger Integrity**: every settlement writes a balanced double-entry ledger: `sum(debits) == sum(credits)` per transaction group.
3. **State Machine**: intents and settlements follow strict states:

   * `PENDING → LOCKED → SUBMITTED → CONFIRMED → SETTLED` or `FAILED`
4. **Exactly-once effect**: use unique constraints + idempotency storage so retries do not duplicate payouts/commissions/settlements.
5. **Observability**: traces, metrics, logs with correlation IDs everywhere.

---

## Workstream A: Idempotency Keys (API)

### Implement

* Middleware extracts `Idempotency-Key` header.
* Canonical request fingerprint: `method + path + wallet + bodyHash`.
* Store idempotency records in DB (REAL) or in-memory map (MOCK).
* For duplicates: return stored `statusCode + responseBody + headers`.

### Files

* `packages/api/src/middleware/idempotency.ts` (new)
* `packages/api/src/services/idempotency.service.ts` (new)
* `packages/api/prisma/schema.prisma` add `IdempotencyRecord`
* Apply middleware to:

  * `/api/register`
  * `/api/claim/prepare`
  * `/api/claim/record`
  * `/api/v2/claims/*`
  * `/api/v2/payouts/*`
  * `/api/commerce/*`

### DB

Unique index on `key` + `requestHash`.

---

## Workstream B: Tiered Rate Limiting + Abuse Controls

### Implement

Per-endpoint limits (example defaults):

* `POST /api/register`: 5/hour per IP + 10/day per wallet
* `POST /api/claim/*`: 60/hour per wallet
* `POST /api/commerce/webhook`: high limit but only accept valid HMAC
* `GET /healthz`: generous

Backed by Redis in REAL mode, in-memory in MOCK mode.

### Files

* `packages/api/src/middleware/ratelimit.ts` (new)
* `packages/api/src/index.ts` apply route-level policies
* `packages/api/src/env.ts` add configuration:

  * `RL_REGISTER_PER_HOUR`
  * `RL_CLAIM_PER_HOUR`
  * `RL_HEALTH_PER_MIN`
  * `RL_WEBHOOK_PER_MIN`

---

## Workstream C: Queue Hardening (BullMQ)

### Implement

* Concurrency tuned per worker type
* Retry with exponential backoff
* Dead Letter Queue (DLQ)
* Stuck job sweeper (detect "LOCKED too long")
* Durable processing in REAL mode only; in MOCK mode, workers disabled.

### Files

* `packages/api/src/queues/` ensure queue names are typed and consistent
* `packages/api/src/workers/*.ts` add:

  * `attempts`, `backoff`, `removeOnComplete`, `removeOnFail`
* `packages/api/src/workers/sweeper.worker.ts` (new)
* `packages/api/src/services/reconciliation.service.ts` extend with "stuck job alerts"

---

## Workstream D: Observability (OTel + Prometheus + Grafana)

### Implement

* OpenTelemetry Node SDK auto-instrumentation for Express + fetch + Prisma
* Prometheus metrics endpoint `/metrics`
* Structured logs with request IDs (and span IDs if available)
* Docker compose adds:

  * `prometheus`
  * `grafana`
  * (optional) `tempo` or `jaeger`

### Files

* `packages/api/src/otel.ts` (new)
* `packages/api/src/index.ts` initialize OTel in REAL mode
* `docker-compose.yml` extend services
* `ops/prometheus.yml` (new)
* `ops/grafana-dashboards/` (new starter dashboard JSON)

Metrics to include:

* request count/latency by route + status
* queue depth, job duration, retries, DLQ count
* settlements confirmed vs failed
* ledger imbalance count (should be zero)
* payouts processed & approval times

---

## Workstream E: Load Testing (k6)

### Implement

k6 scenarios that reflect real usage:

1. Register storm (wallets unique)
2. Claim flow (prepare + record) with idempotency keys
3. Affiliate signup + referral attribution
4. Admin reads (stats pages)
5. Webhook storm with valid signatures

Targets:

* 10k concurrent VUs burst
* 1k steady state
* P95 latency under threshold per endpoint
* zero duplicate ledger entries
* zero duplicated claims

### Files

* `ops/k6/register.js`
* `ops/k6/claim.js`
* `ops/k6/affiliate.js`
* `ops/k6/webhook.js`
* `VERIFICATION.md` includes how to run and success criteria

---

## Acceptance Criteria

✅ In REAL mode:

* Can run `npm run setup:real` then `npm run dev:real`
* Survives k6 10k burst without duplicated claims/payouts
* `/metrics` works, dashboards show traffic + queue depth
* Reconciliation flags stuck intents and ledger mismatches

✅ In MOCK mode:

* `npm run dev` works with zero DB/Redis requirements
* Workers refuse to start (and also self-exit if forced)
* Pages demo continues to work

---

## Bonus: SR-looking VS Code prompt

Paste this into Cursor/Copilot Chat inside the repo:

> You are a senior platform engineer. Implement Phase 2 production hardening across API/workers/ops:
>
> 1. Add idempotency middleware backed by Prisma `IdempotencyRecord` (REAL) and memory map (MOCK). Enforce `Idempotency-Key` on register/claim/payout endpoints. Return cached response on duplicate requests.
> 2. Add tiered rate limiting: register 5/hour per IP + 10/day per wallet, claim 60/hour per wallet, health generous. Use Redis store in REAL, in-memory in MOCK. Add env config knobs.
> 3. Harden BullMQ: add retries/backoff, DLQ, stuck-job sweeper, consistent typed queue names. Workers must self-disable in MOCK mode even if started.
> 4. Add observability: OpenTelemetry auto-instrumentation + Prometheus `/metrics`. Extend docker-compose with prometheus + grafana + starter dashboard + scrape config. Include request IDs and trace correlation in logs.
> 5. Add k6 load testing scripts under ops/k6 for register/claim/affiliate/webhook scenarios, including idempotency-key reuse. Add VERIFICATION.md with exact commands and success criteria.
>    Keep MOCK_MODE fork-and-run behavior intact. No secrets committed. Provide file-by-file diffs and ensure `npm run test:ci` and `npm run pages:build` still pass.
