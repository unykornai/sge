# STATUS — SGE Ethereum Mainnet System

_Last updated: 2026-01-29_

This document tracks production readiness for the SGE Ethereum mainnet monorepo (contracts + API + app + docs).

---

## Current Environment

- **Target chain:** Ethereum mainnet (chainId = 1)
- **Primary wallet UX:** Coinbase Wallet (WalletConnect optional)
- **Core contracts (mainnet):**
  - **SGE Token:** `0x40489719E489782959486A04B765E1E93E5B221a`
  - **SGE Claim:** `0x4BFeF695a5f85a65E1Aa6015439f317494477D09`
  - **USDC:** `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` (6 decimals)
  - **USDT:** `0xdAC17F958D2ee523a2206206994597C13D831ec7` (6 decimals)
- **SGE-ID (ERC721):** _Deployment required_ → set `SGEID_ADDRESS` after deploy

---

## Production Readiness Checklist

### A) Contracts (Hardhat)
- [ ] SGEID deployed on Ethereum mainnet
- [ ] `SGEID_ADDRESS` updated in API env
- [ ] Ownership confirmed (`owner()` is relayer/ops multisig as intended)
- [ ] `mintTo()` access: only owner (relayer) ✅
- [ ] Base URI strategy finalized (static vs per-token vs IPFS)
- [ ] Verified on Etherscan (source + metadata)
- [ ] Key management policy documented (where the relayer key lives)

### B) API (Express)
- [ ] `.env` fully configured (RPC + relayer key + SGEID address)
- [ ] `/healthz` returns:
  - [ ] Recent mainnet `blockNumber`
  - [ ] Read checks succeed (claim contract reachable)
- [ ] `/api/register` idempotency works (same wallet returns same tokenId/tx)
- [ ] Rate limits tuned for production (mint endpoints stricter)
- [ ] CORS tightened (APP_ORIGIN pinned, not wildcard)
- [ ] Admin endpoints protected (rotate `ADMIN_API_KEY`, no default)
- [ ] Coinbase Commerce webhook verification validated end-to-end (optional)
- [ ] Logging: request IDs + structured output in prod

### C) App (Vite + React + PWA)
- [ ] Coinbase Wallet connect stable on iOS + Android
- [ ] Chain guard: blocks when not on mainnet (chainId !== 1)
- [ ] Claim flow works for:
  - [ ] USDC approve → claim
  - [ ] USDT reset-to-zero allowance → approve → claim
- [ ] Preflight simulation maps reverts to friendly messages
- [ ] Atomic fallback instructions visible and accurate
- [ ] PWA install tested:
  - [ ] iOS “Add to Home Screen”
  - [ ] Android install prompt
  - [ ] Offline shell loads
- [ ] PWA caching rules confirmed (no caching of POST /api/* and no caching RPC)

### D) Security / Compliance
- [ ] KYC toggle behavior confirmed (KYC_REQUIRED)
- [ ] Disclosure footer present (36-month rewards / market disclaimer)
- [ ] No private keys in client-side code (ever)
- [ ] Webhook HMAC verified with timing-safe compare
- [ ] Secrets stored via GitHub Secrets / hosting env vars
- [ ] Rate limiting and basic abuse handling verified

### E) Deployment
- [ ] CI green on main
- [ ] Pages deploy succeeds (docs reachable)
- [ ] Docker compose starts clean (optional)
- [ ] PM2 config validated on target host (optional)
- [ ] Backups configured for `data/` persistence (if used in prod)

---

## Known Risks / Watchouts

1) **Relayer key risk**
   - The relayer signs mainnet transactions. Use a dedicated funded wallet with tight policy and rotation plan.

2) **USDT allowance quirk**
   - USDT can require `approve(spender, 0)` before raising allowance. Must be enforced in UI, and fallback instructions must match.

3) **“LIMITED MODE”**
   - Appears when `SGEID_ADDRESS` not deployed or env incomplete. Confirm it never appears in prod.

4) **Windows Hardhat libuv exit glitch**
   - Tests can pass yet exit non-zero on Windows due to async handle cleanup. Wrapper should remain default for CI/dev on Windows.

5) **Claim ABI drift**
   - If claim contract functions differ from `claimWithUSDC()` / `claimWithUSDT()`, detection logic must be correct and tested.

---

## Go/No-Go Gate

**GO** requires:
- SGEID deployed + verified
- Full API env configured and `/healthz` green
- Coinbase Wallet claim flows verified (USDC and USDT)
- Admin key + secrets managed properly
- Disclosures present in UI
- CI + Pages green on main
