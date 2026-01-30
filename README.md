# SGE Energy (SGE) Mainnet Claim System 

> **SGE** is a mobile-first claim experience for the SGE ecosystem on **Ethereum mainnet**:
> - **Gasless SGE-ID NFT** registration (relayer pays gas)
> - **USDC/USDT approve  claim** to receive SGE tokens
> - Optional **Coinbase Commerce** payment gating (card/ACH/crypto via Commerce) with webhook verification
> - **Coinbase Wallet first-class** UX + **PWA** installability
>
>  **Performance / efficiency claims:** Any "efficiency" figures should be treated as *technology claims* that require independent validation and clear measurement definitions. Solar conversion efficiency and wind capacity factor are not directly comparable metrics. (See `docs/claims.md` for suggested wording + evidence packaging.)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Network: Ethereum Mainnet](https://img.shields.io/badge/Network-Ethereum%20Mainnet-blue.svg)](https://ethereum.org)
[![Solidity: 0.8.23](https://img.shields.io/badge/Solidity-0.8.23-orange.svg)](https://soliditylang.org)

---

## What this repo contains

A production-lean monorepo for the full SGE claim surface:

- **Gasless NFT Minting (SGE-ID)**  
  Users register and receive an ERC-721 NFT minted **by a relayer** (no gas cost to user).

- **USDC / USDT Claim Flow (Mainnet)**  
  Handles allowance checks + **USDT reset-to-zero** allowance rule before increasing approvals.

- **Coinbase Commerce Integration (Optional)**  
  Webhook receiver validates HMAC signature of the **raw body** to authenticate events.

- **Coinbase Wallet First**  
  PWA + Coinbase Wallet deep link flow, no COEP/COOP breakage.

- **Mainnet Only**  
  Everything is pinned to `chainId = 1`.

---

## Repository layout

```
sge-eth-one-swoop/
 packages/
    shared/        # ABIs, addresses, shared utils/types
    contracts/     # Hardhat + SGEID ERC721 contract + deploy scripts
    api/           # Express API (gasless mint, webhook verify, health, status)
    app/           # Vite + React PWA (Coinbase Wallet UX, approveclaim)
 docker-compose.yml
 ecosystem.config.js      # PM2 config
 setup.sh                 # Linux/Mac setup
 setup.ps1                # Windows setup
 README.md
```

---

## Architecture

```mermaid
flowchart LR
  U[User - Coinbase Wallet / PWA] -->|POST /api/register| API
  API -->|relayer tx| ETH[(Ethereum Mainnet)]
  ETH -->|mint SGE-ID NFT| SGEID[SGEID ERC-721]

  U -->|approve USDC/USDT| ERC20[(USDC/USDT)]
  U -->|claimWithUSDC/claimWithUSDT| CLAIM[SGE_CLAIM Contract]
  CLAIM -->|transfers/mints| SGE[SGE Token]

  CC[Coinbase Commerce] -->|webhook (signed raw body)| API
  API -->|paid:true gate| U
```

---

## Quick start

### Prerequisites

* Node.js 18+
* npm 9+

### Setup

**Windows**

```powershell
.\setup.ps1
```

**Linux/Mac**

```bash
chmod +x setup.sh
./setup.sh
```

**Manual**

```bash
npm install
npm run build --workspace=@sge/shared
npm run dev
```

### Dev URLs

* App: [http://localhost:5173](http://localhost:5173)
* API: [http://localhost:3000](http://localhost:3000)

---

## Environment configuration

### API (`packages/api/.env`)

```env
PORT=3000
APP_ORIGIN=http://localhost:5173

# Ethereum (REQUIRED)
ETH_RPC_HTTPS=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
RELAYER_PRIVATE_KEY=0x...               # must be funded with ETH
SGEID_ADDRESS=0x...                     # set after deploy

# Contracts (mainnet defaults)
SGE_TOKEN=0x40489719E489782959486A04B765E1E93E5B221a
SGE_CLAIM=0x4BFeF695a5f85a65E1Aa6015439f317494477D09
USDC=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# Features
FEE_USD=100
KYC_REQUIRED=false
COMMERCE_REQUIRED=false

# Admin
ADMIN_API_KEY=your-secret-key

# Coinbase Commerce (optional)
COINBASE_COMMERCE_API_KEY=
COINBASE_COMMERCE_WEBHOOK_SHARED_SECRET=whsec_...
```

### App (`packages/app/.env`)

```env
VITE_ETH_RPC_HTTPS=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

VITE_SGE_TOKEN=0x40489719E489782959486A04B765E1E93E5B221a
VITE_SGE_CLAIM=0x4BFeF695a5f85a65E1Aa6015439f317494477D09
VITE_USDC=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
VITE_USDT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_FEE_USD=100

# optional
VITE_WALLETCONNECT_PROJECT_ID=
```

---

## Contracts

### SGE-ID (ERC-721)

* **Gasless mint** via relayer calling `mintTo(address)` on SGEID (Ownable gated).
* Token IDs start at 1.

### Deploy SGE-ID to mainnet

```bash
cd packages/contracts
npm run compile
npm run deploy:mainnet
# copy printed SGEID_ADDRESS into packages/api/.env
```

---

## API endpoints

> All endpoints are **mainnet-only**. Any wallet input must be a checksummed 0x address.

### Registration

| Method | Endpoint                   | Description                                     |
| ------ | -------------------------- | ----------------------------------------------- |
| POST   | `/api/register`            | Gasless mint SGE-ID NFT (idempotent per wallet) |
| GET    | `/api/status?wallet=0x...` | Returns registration/payment/claim status       |

### Coinbase Commerce (optional)

| Method | Endpoint                     | Description                                 |
| ------ | ---------------------------- | ------------------------------------------- |
| POST   | `/api/commerce/charge`       | Create a Commerce charge (optional feature) |
| GET    | `/api/commerce/charge/:code` | Check charge status                         |
| POST   | `/api/commerce/webhook`      | Webhook receiver (HMAC-verified raw body)   |

**Webhook signature rule (important):**

* Coinbase Commerce sends `X-CC-WEBHOOK-SIGNATURE`
* Signature is **SHA256 HMAC of raw request payload**, key = webhook shared secret
  (Implement timing-safe compare)

### Claims

| Method | Endpoint                          | Description                                                   |
| ------ | --------------------------------- | ------------------------------------------------------------- |
| GET    | `/api/claim/info?wallet=0x...`    | Eligibility + allowance status                                |
| POST   | `/api/claim/prepare`              | Returns recommended tx steps (USDT may include reset-to-zero) |
| POST   | `/api/claim/record`               | Record a completed claim tx (server-side indexing support)    |
| GET    | `/api/claim/history?wallet=0x...` | Claim history                                                 |

### Admin (requires `X-Admin-Key`)

| Method | Endpoint                     | Description               |
| ------ | ---------------------------- | ------------------------- |
| GET    | `/api/admin/stats`           | Platform statistics       |
| GET    | `/api/admin/mints`           | List all mints            |
| GET    | `/api/admin/payments`        | List all payments         |
| POST   | `/api/admin/payment/manual`  | Manual payment entry      |
| GET    | `/api/admin/wallet/:address` | Wallet detail             |
| GET    | `/api/admin/fund-check`      | Relayer ETH balance check |

### Health

| Method | Endpoint   | Description                               |
| ------ | ---------- | ----------------------------------------- |
| GET    | `/healthz` | Latest block + contract read sanity check |

---

## Token claim flow (USDC / USDT)

Fee is $100 with **6 decimals**, so approval amount is:

* `100 * 10^6 = 100000000`

Steps (client-side):

1. Connect Coinbase Wallet (chainId must be 1)
2. Read allowance(owner, SGE_CLAIM)
3. If token is **USDT** and allowance > 0, do:
   * `approve(spender, 0)` then `approve(spender, 100000000)`
     Some ERC20s (notably USDT) require this pattern.
4. Preflight with `simulateContract()` for user-friendly errors
5. Call `claimWithUSDC()` or `claimWithUSDT()`
6. Show Etherscan tx link + success state
7. If re-claim is attempted, UI should show "Already claimed" without sending a tx

---

## PWA (mobile install)

* Installable PWA shell (offline-capable UI)
* No caching of RPC calls or `/api/*` POSTs
* Coinbase Wallet deep link:

```txt
https://go.cb-w.com/dapp?cb_url=https%3A%2F%2FYOUR_DOMAIN
```

---

## Deployment

### Docker

```bash
docker-compose up -d
docker-compose logs -f
```

### PM2

```bash
npm run build
pm2 start ecosystem.config.js
pm2 monit
```

### Manual

```bash
npm run build
cd packages/api && node dist/index.js
cd ../app && npx serve dist
```

---

## Security posture

* HMAC-SHA256 webhook verification (timing-safe compare)
* Helmet headers (CSP off, COEP off, COOP same-origin for wallet compatibility)
* Rate limiting (stricter on register + webhook)
* CORS origin whitelist via `APP_ORIGIN`
* Zod validation for all inputs
* Mainnet chain guard on client + server

---

## Contract addresses (Ethereum mainnet)

| Contract   | Address                                      |
| ---------- | -------------------------------------------- |
| SGE Token  | `0x40489719E489782959486A04B765E1E93E5B221a` |
| SGE Claim  | `0x4BFeF695a5f85a65E1Aa6015439f317494477D09` |
| USDC       | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| USDT       | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| SGE-ID NFT | `SGEID_ADDRESS (deploy)`                     |

---

## Smoke tests (fast)

* RPC: `getBlockNumber()` returns a recent mainnet block
* `/api/register`: returns `{ txHash, tokenId }`, Etherscan shows mint from relayer
* USDC claim: approve `100000000`  claim  wallet receives **1,000 SGE**
* USDT claim: allowance reset path works (0 then 100000000)
* Re-claim: UI shows "Already claimed"
* PWA installs, Coinbase Wallet connection works (mobile + desktop)

---

## Compliance notes (starter)

* KYC gate toggle (`KYC_REQUIRED`)
* 36-month rewards disclosure + market risk disclaimer in footer
* No PII on-chain; keep KYC artifacts off-chain and minimize retention
* Consider adding `docs/disclosures.md` and `docs/privacy.md` before launch

---

## License

MIT
