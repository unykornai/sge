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

`
sge-eth-one-swoop/
 scripts/
    wallet-new.mjs      # Wallet generator script
 packages/
    shared/             # ABIs, addresses, shared utils/types
    contracts/          # Hardhat + SGEID ERC721 contract + deploy scripts
    api/                # Express API (gasless mint, webhook verify, health, status)
    app/                # Vite + React PWA (Coinbase Wallet UX, approveclaim)
 docker-compose.yml
 ecosystem.config.js     # PM2 config
 setup.sh                # Linux/Mac setup
 setup.ps1               # Windows setup
 README.md
`

---

## Quick start (complete runnable steps)

### Prerequisites

* Node.js 18+
* npm 9+
* Ethereum mainnet RPC URL (Alchemy, Infura, etc.)

### Step 1: Generate wallets

`ash
npm run wallet:new
`

This prints **DEPLOYER** and **RELAYER** wallet addresses + private keys.
Copy the output and paste into `packages/api/.env`.

 **NEVER commit private keys to version control!**

### Step 2: Install dependencies

`ash
npm install
`

### Step 3: Configure environment

`ash
cp packages/api/.env.example packages/api/.env
cp packages/app/.env.example packages/app/.env.local
`

Edit `packages/api/.env` with:
- Your Alchemy/Infura RPC URL
- Generated wallet addresses and keys
- (Later) SGEID_ADDRESS after contract deployment

### Step 4: Build shared package

`ash
npm run build -w @sge/shared
`

### Step 5: Deploy SGEID contract (optional - needs funded deployer)

`ash
cd packages/contracts
cp .env.example .env
# Edit .env with your RPC URL and DEPLOYER_PRIVATE_KEY
npm run deploy:mainnet
`

Copy the printed `SGEID_ADDRESS` into `packages/api/.env`.

### Step 6: Fund the relayer wallet

Send 0.05-0.1 ETH to your **RELAYER_ADDRESS** on Ethereum mainnet.
This wallet pays gas for gasless NFT minting.

### Step 7: Start development servers

`ash
npm run dev
`

### Dev URLs

* **App**: [http://localhost:5173](http://localhost:5173)
* **API**: [http://localhost:3000](http://localhost:3000)
* **Health**: [http://localhost:3000/healthz](http://localhost:3000/healthz)

---

## Wallet slots

| Role | Env Var | Purpose |
| ---- | ------- | ------- |
| **Deployer/Owner** | `DEPLOYER_ADDRESS` / `DEPLOYER_PRIVATE_KEY` | Deploys SGEID contract, has onlyOwner permissions (setBaseURI). Can be cold storage after deploy. |
| **Relayer** | `RELAYER_ADDRESS` / `RELAYER_PRIVATE_KEY` | Pays gas for /api/register gasless minting. Hot wallet, should only hold small ETH balance. |
| **Treasury** | `TREASURY_ADDRESS` | (Optional) For accounting/display. Claim contract may custody actual funds. |

---

## Environment configuration

### API (`packages/api/.env`)

`env
# Server
PORT=3000
APP_ORIGIN=http://localhost:5173
ADMIN_API_KEY=dev-admin-key-change-in-production

# Ethereum RPC
ETH_RPC_HTTPS=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Wallet slots (generated with npm run wallet:new)
DEPLOYER_ADDRESS=0x...
DEPLOYER_PRIVATE_KEY=0x...
RELAYER_ADDRESS=0x...
RELAYER_PRIVATE_KEY=0x...
TREASURY_ADDRESS=0x...

# Contracts
SGEID_ADDRESS=0x...                     # set after deploy
SGE_TOKEN=0x40489719E489782959486A04B765E1E93E5B221a
SGE_CLAIM=0x4BFeF695a5f85a65E1Aa6015439f317494477D09
USDC=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT=0xdAC17F958D2ee523a2206206994597C13D831ec7
FEE_USD=100

# Feature gates
KYC_REQUIRED=false
COMMERCE_REQUIRED=false
ALLOW_SOFT_KYC=true

# Coinbase Commerce (optional)
COINBASE_COMMERCE_API_KEY=
COINBASE_COMMERCE_WEBHOOK_SHARED_SECRET=
`

### App (`packages/app/.env.local`)

`env
VITE_ETH_RPC_HTTPS=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_WALLETCONNECT_PROJECT_ID=          # optional
VITE_SGE_TOKEN=0x40489719E489782959486A04B765E1E93E5B221a
VITE_SGE_CLAIM=0x4BFeF695a5f85a65E1Aa6015439f317494477D09
VITE_USDC=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
VITE_USDT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_FEE_USD=100
`

---

## Architecture

`mermaid
flowchart LR
  U[User - Coinbase Wallet / PWA] -->|POST /api/register| API
  API -->|relayer tx| ETH[(Ethereum Mainnet)]
  ETH -->|mint SGE-ID NFT| SGEID[SGEID ERC-721]

  U -->|approve USDC/USDT| ERC20[(USDC/USDT)]
  U -->|claimWithUSDC/claimWithUSDT| CLAIM[SGE_CLAIM Contract]
  CLAIM -->|transfers/mints| SGE[SGE Token]

  CC[Coinbase Commerce] -->|webhook (signed raw body)| API
  API -->|paid:true gate| U
`

---

## API Endpoints

### Registration

| Method | Endpoint                     | Description                                |
| ------ | ---------------------------- | ------------------------------------------ |
| POST   | `/api/register`            | Gasless mint SGE-ID NFT (idempotent per wallet) |
| GET    | `/api/status?wallet=0x...` | Returns registration/payment/claim status       |

### Coinbase Commerce (optional)

| Method | Endpoint                       | Description                              |
| ------ | ------------------------------ | ---------------------------------------- |
| POST   | `/api/commerce/charge`       | Create a Commerce charge (optional)      |
| GET    | `/api/commerce/charge/:code` | Check charge status                      |
| POST   | `/api/commerce/webhook`      | Webhook receiver (HMAC-verified raw body)|

**Webhook signature rule:**
- Header: `X-CC-WEBHOOK-SIGNATURE`
- Signature: SHA256 HMAC of raw request payload, key = webhook shared secret
- Implement timing-safe compare

### Claims

| Method | Endpoint                            | Description                                             |
| ------ | ----------------------------------- | ------------------------------------------------------- |
| GET    | `/api/claim/info?wallet=0x...`    | Eligibility + allowance status                          |
| POST   | `/api/claim/prepare`              | Returns recommended tx steps (USDT may include reset)   |
| POST   | `/api/claim/record`               | Record a completed claim tx                             |
| GET    | `/api/claim/history?wallet=0x...` | Claim history                                           |

### Admin (requires `X-Admin-Key` header)

| Method | Endpoint                      | Description               |
| ------ | ----------------------------- | ------------------------- |
| GET    | `/api/admin/stats`          | Platform statistics       |
| GET    | `/api/admin/mints`          | List all mints            |
| GET    | `/api/admin/payments`       | List all payments         |
| POST   | `/api/admin/payment/manual` | Manual payment entry      |
| GET    | `/api/admin/wallet/:address`| Wallet detail             |
| GET    | `/api/admin/fund-check`     | Relayer ETH balance check |

### Health

| Method | Endpoint     | Description                               |
| ------ | ------------ | ----------------------------------------- |
| GET    | `/healthz` | Latest block + contract read sanity check |

---

## Token claim flow (USDC / USDT)

Fee is $100 with 6 decimals, so approval amount = `100000000`

**Steps (client-side):**

1. Connect Coinbase Wallet (chainId must be 1)
2. Read `allowance(owner, SGE_CLAIM)`
3. If token is **USDT** and allowance > 0:
   - `approve(spender, 0)` first, wait for confirmation
   - Then `approve(spender, 100000000)`
4. Preflight with `simulateContract()` for user-friendly errors
5. Call `claimWithUSDC()` or `claimWithUSDT()`
6. Show Etherscan tx link + success state
7. If re-claim attempted, UI shows "Already claimed"

---

## Coinbase Wallet Integration

**Deep link for mobile:**
`
https://go.cb-w.com/dapp?cb_url=https%3A%2F%2FYOUR_DOMAIN
`

**Install CTA:** App shows download link for users without Coinbase Wallet

**PWA:** Installable shell (offline-capable UI, no caching of RPC/API calls)

---

## Troubleshooting

| Issue | Solution |
| ----- | -------- |
| RPC errors | Ensure `ETH_RPC_HTTPS` is a full https URL |
| Relayer out of gas | Fund `RELAYER_ADDRESS` with more ETH |
| Coinbase popup blocked | Ensure COEP off, COOP same-origin in Helmet config |
| USDT approval fails | Must reset to 0 first if existing allowance > 0 |
| Webhook verification fails | Use raw body parser, verify `X-CC-WEBHOOK-SIGNATURE` header |
| Wrong network | Client enforces chainId === 1 |

---

## Deployment

### Docker

`ash
docker-compose up -d
docker-compose logs -f
`

### PM2

`ash
npm run build
pm2 start ecosystem.config.js
pm2 monit
`

### Manual

`ash
npm run build
cd packages/api && node dist/index.js
cd ../app && npx serve dist
`

---

## Contract addresses (Ethereum mainnet)

| Contract   | Address                                      |
| ---------- | -------------------------------------------- |
| SGE Token  | `0x40489719E489782959486A04B765E1E93E5B221a` |
| SGE Claim  | `0x4BFeF695a5f85a65E1Aa6015439f317494477D09` |
| USDC       | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| USDT       | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| SGE-ID NFT | `SGEID_ADDRESS (deploy with npm run deploy:mainnet)` |

---

## Smoke tests

* RPC: `getBlockNumber()` returns a recent mainnet block
* `/api/register`: returns `{ txHash, tokenId }`, Etherscan shows mint from relayer
* USDC claim: approve `100000000`  claim  wallet receives **1,000 SGE**
* USDT claim: allowance reset path works (0 then 100000000)
* Re-claim: UI shows "Already claimed"
* PWA installs, Coinbase Wallet connection works (mobile + desktop)

---

## Security posture

* HMAC-SHA256 webhook verification (timing-safe compare)
* Helmet headers (CSP off, COEP off, COOP same-origin for wallet compatibility)
* Rate limiting (stricter on register + webhook)
* CORS origin whitelist via `APP_ORIGIN`
* Zod validation for all inputs
* Mainnet chain guard on client + server

---

## Compliance notes

* KYC gate toggle (`KYC_REQUIRED`)
* 36-month rewards disclosure + market risk disclaimer in footer
* No PII on-chain; keep KYC artifacts off-chain and minimize retention
* See `docs/disclosures.md` and `docs/privacy.md` before launch

---

## License

MIT
