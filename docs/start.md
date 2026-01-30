# Quick Start Guide

Get the SGE claim system running in **under 5 minutes** - no mainnet keys required!

## 🚀 Fork-and-Run (Mock Mode)

This repo works out of the box in **MOCK_MODE** with no blockchain connection.

### Prerequisites

- **Node.js 18+** ([download](https://nodejs.org))
- **npm 9+** (comes with Node.js)
- **Git** ([download](https://git-scm.com))

### One-Command Setup

**Windows (PowerShell):**
```powershell
git clone https://github.com/unykornai/sge.git
cd sge
.\scripts\bootstrap.ps1
```

**macOS/Linux:**
```bash
git clone https://github.com/unykornai/sge.git
cd sge
chmod +x scripts/bootstrap.sh
./scripts/bootstrap.sh
```

**What it does:**
- ✅ Installs all dependencies
- ✅ Builds shared packages
- ✅ Creates `.env` files with `MOCK_MODE=true`
- ✅ Runs smoke tests

### Start Development

```bash
npm run dev
```

Opens:
- **API**: http://localhost:3000 (mock blockchain responses)
- **App**: http://localhost:5173 (claim UI)

Try the demo:
1. Enter any Ethereum address (e.g., `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`)
2. Click through the steps - all simulated!
3. See mock transaction hashes and responses

### View Documentation

```bash
npm run docs:dev
```

Opens: http://localhost:5175/sge/

---

## 🌐 Real Mainnet Mode

Want to deploy on Ethereum mainnet? Here's how:

### Step 1: Generate Wallets

```bash
npm run wallet:new
```

**Output:**
```
DEPLOYER Wallet:
Address: 0x1234...
Private Key: 0xabcd...

RELAYER Wallet:
Address: 0x5678...
Private Key: 0xef01...
```

⚠️ **NEVER commit these keys to Git!**

### Step 2: Fund Wallets

- **DEPLOYER**: Needs ~0.05 ETH for contract deployment
- **RELAYER**: Needs ~0.5 ETH for gasless minting operations

Send mainnet ETH to these addresses.

### Step 3: Configure Environment

Edit `packages/api/.env`:

```bash
# Set to false to use real blockchain
MOCK_MODE=false

# Your mainnet RPC (get from Alchemy, Infura, or Ankr)
ETH_RPC_HTTPS=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Paste private key from wallet:new (include 0x prefix)
RELAYER_PRIVATE_KEY=0xabcd...

# After deployment, update these:
SGEID_ADDRESS=0x...
SGE_TOKEN=0x40489719E489782959486A04B765E1E93E5B221a
SGE_CLAIM=0x4BFeF695a5f85a65E1Aa6015439f317494477D09

# Mainnet token addresses (verified)
USDC=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# Feature gates
KYC_REQUIRED=false
COMMERCE_REQUIRED=false
FEE_USD=100
```

### Step 4: Deploy Contracts

```bash
cd packages/contracts
npx hardhat run scripts/deploy.js --network mainnet
```

**Copy deployed addresses** to `packages/api/.env` and `packages/shared/src/config/addresses.ts`.

### Step 5: Start Production Services

```bash
# Build all packages
npm run build

# Start with PM2 (production)
pm2 start ecosystem.config.js

# Or start manually (development)
npm run dev
```

### Step 6: Verify Deployment

```bash
curl http://localhost:3000/healthz
```

**Expected response:**
```json
{
  "ok": true,
  "chainId": 1,
  "blockNumber": 19105234,
  "signerAddress": "0x742d35...",
  "hasSgeidCode": true,
  "hasClaimCode": true
}
```

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Test Specific Package

```bash
npm test -w @sge/contracts  # Hardhat tests
npm test -w @sge/api        # API tests
npm run typecheck           # TypeScript checks
```

### Contracts Only (Windows Fix)

```bash
# Windows users: use cross-env wrapper
npm run test:contracts:raw
```

---

## 📦 Repository Structure

```
sge/
├── packages/
│   ├── shared/       # ABIs, addresses, types
│   ├── contracts/    # Solidity + Hardhat
│   ├── api/          # Express backend
│   ├── app/          # React + Vite PWA
│   └── docs/         # VitePress docs
├── scripts/
│   ├── bootstrap.ps1 # Windows setup
│   ├── bootstrap.sh  # macOS/Linux setup
│   └── wallet-new.mjs # Wallet generator
├── LICENSE-MIT       # MIT License
├── LICENSE-APACHE    # Apache 2.0 License
├── TRADEMARKS.md     # Brand usage policy
└── DCO.md            # Contributor terms
```

---

## 🔄 Development Workflow

### 1. Make Changes

```bash
# Create feature branch
git checkout -b feat/my-feature

# Make changes
code packages/api/src/routes/register.ts

# Test changes
npm test

# Commit with sign-off (required)
git commit -s -m "feat: add feature"
```

### 2. Submit Pull Request

- ✅ All commits must have `Signed-off-by` (see [DCO.md](../DCO.md))
- ✅ Pass CI checks (tests, typecheck, build)
- ✅ Update docs if needed
- ✅ Follow [CONTRIBUTING.md](../.github/CONTRIBUTING.md)

### 3. Code Review

Maintainers will review and may request changes.

---

## 🐛 Troubleshooting

### "Cannot find module '@sge/shared'"

```bash
# Rebuild shared package
npm run build -w @sge/shared
```

### "Port 3000 already in use"

```bash
# Kill existing process
# Windows:
Get-Process -Name node | Stop-Process -Force

# macOS/Linux:
killall node
```

### Hardhat Tests Fail on Windows

Use the cross-env wrapper:
```bash
npm run test:contracts:raw
```

### "RELAYER_PRIVATE_KEY invalid"

- Ensure it starts with `0x`
- Must be 66 characters (0x + 64 hex digits)
- Generate new: `npm run wallet:new`

---

## 📚 Additional Resources

- **[Architecture Diagrams](https://unykornai.github.io/sge/diagrams/)** - System design
- **[API Documentation](https://unykornai.github.io/sge/api/)** - Endpoints and schemas
- **[Contract Docs](https://unykornai.github.io/sge/contracts/)** - Solidity reference
- **[Risk Register](https://unykornai.github.io/sge/ops/risk.html)** - Known threats
- **[Compliance](https://unykornai.github.io/sge/disclosures.html)** - Legal disclosures

---

## 🆘 Getting Help

- **💬 Discussions**: https://github.com/unykornai/sge/discussions
- **🐛 Issues**: https://github.com/unykornai/sge/issues
- **📧 Email**: [your-email]

---

## ⚡ Quick Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start API + App (dev mode) |
| `npm run build` | Build all packages |
| `npm test` | Run all tests |
| `npm run docs:dev` | Start docs server |
| `npm run wallet:new` | Generate new wallets |
| `npm run typecheck` | TypeScript validation |

---

**Ready to contribute?** Read [CONTRIBUTING.md](../.github/CONTRIBUTING.md) and [DCO.md](../DCO.md)!
