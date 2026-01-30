# Senior-Level Architecture: Affiliate Instant Liquidity Relayer

Purpose
- Provide a concise, senior-engineer view of the relayer-based affiliate instant-liquidity system: responsibilities, failure modes, security, deployment, and operational guidance.

Components
- API Server (`packages/api`): handles user registration, minting, and payment webhooks. Enqueues jobs for the relayer and acts as the authoritative app-state writer.
- App DB / Queue: durable store for users, payments, and relayer jobs. Can be SQLite (dev), Postgres, or Redis streams for production.
- Off-chain Relayer (`packages/relayer`): polls the queue, ensures idempotency, signs and submits on-chain transactions (registerReferral, payAffiliate*), and marks jobs processed.
- Ethereum RPC / Node: provider (Infura, Alchemy, or self-hosted). Relayer must use high-availability RPC with retry and failover.
- Smart Contracts: `AffiliateRegistry` (records referrals), `AffiliatePayout` (executes payouts, holds token approvals/funds), ERC20 tokens (USDC) and `SGE` token for hybrid payouts.

Key Responsibilities
- Relayer: idempotent execution, retry/backoff, durable job tracking, signing with a secure key, limited concurrency, observability (metrics, logs, traces), safe failure handling and admin controls (pause, emergency withdraw).
- Payout Contract: on-chain enforcement of single-payout-per-transaction (avoid duplicates) and access control to relayer-only functions.
- API: authorization for enqueuing jobs, validation of input, minimal trust surface for off-chain data.

Dataflows (concise)
- Register: user -> API -> persist referrer -> enqueue registerReferral -> relayer -> AffiliateRegistry.registerReferral
- Payout: payment confirmed -> API -> enqueue payout job -> relayer -> AffiliatePayout.payAffiliateUSDC / payAffiliateHybrid -> on-chain transfers/mints

Idempotency & Exactly-Once
- Primary idempotency: persistent job store (unique job id) + database constraint to prevent re-processing.
- Secondary on-chain guard: smart contracts maintain `referralPaid` and `referrerOf` mappings to reject duplicates.
- Relayer must mark job processed only after confirming finality of tx (wait for N confirmations optionally).

Reliability & Retries
- Use exponential backoff + cap on retries for transient RPC/network errors. Use linear or manual retry for nonce/nonce-gap issues.
- Implement concurrency limits per contract address to avoid nonce collisions.
- In case of repeated failure, escalate: move job to 'dead-letter' store and alert/notify.

Security
- Secrets: RELAYER_PRIVATE_KEY in a secure vault (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault). Do not store in plain .env on production hosts.
- Least privilege: payout contract should restrict functions to a `relayer` role or `onlyOwner` with relayer address settable and rotatable.
- Validate inputs: API must validate `referrer` addresses and disallow trivial self-referrals.
- Monitor contracts: implement on-chain watch to detect drained funds or unexpected approvals.

Operational Concerns
- Funding: `AffiliatePayout` must be pre-funded (USDC approval/balance) for instant payouts; implement monitoring for low balances and automatic top-ups or alerts.
- Observability: emit structured logs, metrics (jobs processed, failures, latency), and traces for each job to correlate API -> DB -> Relayer -> Tx.
- Monitoring & Alerts: low-balance, repeated tx failures, high retry counts, unexpected contract reverts, and high gas price spikes.
- Backpressure: limit relayer throughput (p-limit) and apply rate-limiting on API to avoid bursts.

Deployment & Scaling
- Run relayer as multiple instances with a single leader pattern or via distributed queue (Postgres advisory locks or Redis streams) to avoid duplicate processing.
- Use database-backed job queue (Postgres, Redis Streams, or Kafka) in production instead of file-based jobs.
- Ensure deterministic nonce handling; prefer signing through a single wallet instance per relayer partition or use EIP-1559 and lock per-wallet nonce allocation.

Failure Modes & Recovery
- RPC outage: retry with alternate RPC providers; fallback to read-only mode and alert.
- Insufficient funds: detect and pause payouts; notify ops and optionally queue jobs until replenished.
- Contract reverts: capture revert reason, move job to dead-letter and notify; do not retry forever.
- Duplicate jobs: DB constraint prevents double-processing; on-chain guards prevent double payouts even if relayer retries.

Testing Strategy
- Unit tests for contracts (Hardhat) — already present.
- Integration tests: local fork of mainnet or a staged testnet with funded payout contract; test relayer end-to-end with a site-running API.
- Chaos testing: simulate RPC failures, db failures, and high concurrency to ensure idempotency and safe retries.

Operational Runbook (brief)
1. Deploy contracts to target chain and set `AFFILIATE_REGISTRY_ADDRESS`, `AFFILIATE_PAYOUT_ADDRESS`.
2. Fund payout contract with USDC and ensure token approval.
3. Configure `RELAYER_PRIVATE_KEY`, `ETH_RPC_HTTPS`, `RELAYER_DB_PATH`, and `POLL_INTERVAL_MS`.
4. Start relayer: `npm --prefix packages/relayer run build && npm --prefix packages/relayer run start` or `npm --prefix packages/relayer run dev` for development.
5. Monitor logs & metrics; verify sample register and payout flows end-to-end.

Notes
- This doc is intentionally concise; I can expand into separate runbooks: security hardening, disaster recovery, or a detailed API->Relayer schema mapping.
