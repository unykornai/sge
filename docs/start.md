# Getting Started with SGE

> **Fork, run, and explore the enterprise settlement platform in under 5 minutes**

::: tip Quick Start
```bash
# One command to rule them all
git clone https://github.com/unykornai/sge.git
cd sge
./scripts/bootstrap.sh  # or bootstrap.ps1 on Windows
npm run dev
```
Then open http://localhost:5173
:::

---

## Understanding the Modes

SGE runs in **four distinct modes** depending on your use case:

### 1. 📱 Pages Demo (GitHub Pages)

**What**: Static website with simulated backend workflows  
**When**: Demonstrating platform capabilities to investors/partners  
**Requirements**: None (it's just HTML/CSS/JS)  
**Data**: Deterministic mock data that resets on page refresh  
**URL**: https://unykornai.github.io/sge/

**Perfect for**:
- Showing the UX without infrastructure
- Explaining workflows in presentations
- Testing frontend changes before backend deployment

::: info NOTE
The Pages demo simulates everything: affiliates, settlements, commissions, payouts. It's a fully functional workflow simulator with no backend required.
:::

---

### 2. 🚀 Local Mock Mode (Default)

**What**: Full app + API running locally with in-memory storage  
**When**: Frontend development, rapid iteration, learning the codebase  
**Requirements**: Node.js 18+ only (no Docker, no DB, no RPC, no wallets)  
**Data**: Resets when you stop the server  
**Config**: `MOCK_MODE=true` (default in `.env`)

**Perfect for**:
- First-time contributors
- UI/UX development
- Testing new features without blockchain
- Running on low-spec machines (works on a laptop)

**What's Mocked**:
- ✅ Database (in-memory Map storage)
- ✅ Redis queue (instant job processing)
- ✅ Ethereum RPC (no real blockchain calls)
- ✅ Wallets (no private keys needed)
- ✅ Coinbase Commerce (simulated payments)

**Start Command**:
```bash
npm run dev
# Runs: API (port 3000) + Workers + App (port 5173)
```

---

### 3. 🏢 Local Real Mode (Enterprise Stack)

**What**: Full production-like environment with Postgres, Redis, and mainnet RPC  
**When**: Backend development, testing workers, preparing for production  
**Requirements**: Docker, funded relayer wallet, RPC endpoint  
**Data**: Persists in Postgres (survives restarts)  
**Config**: `MOCK_MODE=false` in `packages/api/.env`

**Perfect for**:
- Testing settlement flows end-to-end
- Worker queue development
- Database schema changes
- Integration testing with real contracts

**What's Real**:
- ✅ Postgres database (Docker)
- ✅ Redis queue (Docker, BullMQ)
- ✅ Ethereum mainnet RPC (Alchemy/Infura)
- ✅ Real wallet signatures
- ⚠️ Coinbase Commerce (optional, requires API key)

**Setup Steps**:

1. **Start infrastructure**:
   ```bash
   npm run db:up
   npm run prisma:push
   npm run prisma:generate
   ```

2. **Generate wallets** (or use existing):
   ```bash
   npm run wallet:new
   # Outputs: DEPLOYER, RELAYER, TREASURY addresses + keys
   ```

3. **Fund the RELAYER** (for gasless transactions):
   - Send ~0.5 ETH to the RELAYER_ADDRESS
   - This pays for transaction gas

4. **Edit `packages/api/.env`**:
   ```bash
   MOCK_MODE=false
   ETH_RPC_HTTPS=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
   RELAYER_ADDRESS=0x...
   RELAYER_PRIVATE_KEY=0x...
   ```

5. **Start everything**:
   ```bash
   npm run dev
   ```

---

### 4. 🌐 Production (Live Mainnet)

**What**: Deployed to cloud with load balancing, monitoring, and backups  
**When**: Serving real users and processing real settlements  
**Requirements**: Everything from Real Mode + monitoring/alerts/backups  
**Data**: Backed up hourly, replicated across regions  
**Config**: Production `.env` with strict security

**Additional Requirements**:
- ✅ Cold storage for DEPLOYER and TREASURY wallets
- ✅ 2-person approval for payouts (PAYOUT_APPROVER_1 + PAYOUT_APPROVER_2)
- ✅ Monitoring (Sentry, Datadog, or similar)
- ✅ Alerting (Slack/Discord webhooks)
- ✅ Database backups (daily + point-in-time recovery)
- ✅ SSL certificates
- ✅ Rate limiting
- ✅ DDoS protection

::: danger SECURITY
Never commit private keys to Git. Use environment variables or secret management services (AWS Secrets Manager, HashiCorp Vault, etc.).
:::

---

##  Start Development

```bash
npm run dev
```

Opens:
- **API**: http://localhost:3000 (enterprise endpoints)
- **App**: http://localhost:5173 (full UI)

---

##  Docker Services

The platform uses PostgreSQL and Redis for enterprise features:

```bash
# Start infrastructure
npm run db:up

# View logs
npm run db:logs

# Stop infrastructure  
npm run db:down

# Reset database (destructive!)
npm run db:reset
```

### Docker Compose Services

| Service | Port | Description |
|---------|------|-------------|
| Postgres | 5432 | Primary database |
| Redis | 6379 | Job queues + caching |
| Adminer | 8080 | Database UI (debug profile) |
| Redis Commander | 8081 | Redis UI (debug profile) |

To access debug tools:
```bash
docker-compose -f docker-compose.dev.yml --profile debug up -d
```

---

##  Prisma Commands

```bash
# Generate Prisma client
npm run prisma:generate

# Push schema to database
npm run prisma:push

# Create migration
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
```

---

##  Workers

Background job processing:

```bash
# Start workers in dev mode
npm run worker:dev
```

Workers handle:
- **Intent Processing** - Registration, claims
- **Payout Processing** - Commission payouts
- **Reconciliation** - Nightly ledger checks

---

##  Demo Mode (GitHub Pages)

The app can run entirely in the browser with **no backend**:

1. Set environment:
```bash
VITE_DEMO_MODE=true
```

2. Build and deploy:
```bash
npm run build -w @sge/app
# Deploy dist/ to GitHub Pages
```

Demo mode uses MSW (Mock Service Worker) to simulate all API responses.

---

##  Environment Configuration

### API (.env)

```bash
# Mode
MOCK_MODE=true              # true = in-memory, false = real DB

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sge_dev

# Redis
REDIS_URL=redis://localhost:6379

# Blockchain
RPC_URL=https://eth.llamarpc.com

# Wallets (generate with: npm run wallet:new)
DEPLOYER_ADDRESS=0x...
DEPLOYER_PRIVATE_KEY=0x...
RELAYER_ADDRESS=0x...
RELAYER_PRIVATE_KEY=0x...
TREASURY_ADDRESS=0x...

# Contracts
SGEID_CONTRACT_ADDRESS=0x...
SGE_TOKEN_ADDRESS=0x...
CLAIM_VAULT_ADDRESS=0x...

# Coinbase Commerce
COINBASE_COMMERCE_API_KEY=your-key
COINBASE_COMMERCE_WEBHOOK_SECRET=your-secret

# Admin
ADMIN_API_KEY=change-in-production
```

### App (.env)

```bash
VITE_API_URL=http://localhost:3000
VITE_MOCK_MODE=true
VITE_DEMO_MODE=false
VITE_CHAIN_ID=1
```

---

##  Enterprise API (v2)

The v2 API provides database-backed enterprise features:

### Programs
```bash
POST /api/v2/programs           # Create program
GET  /api/v2/programs           # List programs
GET  /api/v2/programs/:id       # Get program
```

### Affiliates
```bash
POST /api/v2/affiliates/register    # Register affiliate
GET  /api/v2/affiliates/tree        # Get downline tree
GET  /api/v2/affiliates/:id/stats   # Get stats
```

### Intent-Based Operations
```bash
POST /api/v2/users/register     # Register (queued)
POST /api/v2/claims             # Claim (queued)
GET  /api/v2/claims/:id         # Check status
```

### Payouts (2-Person Approval)
```bash
POST /api/v2/payouts/batch              # Create batch
POST /api/v2/payouts/batch/:id/approve  # Approve (person 1)
POST /api/v2/payouts/batch/:id/execute  # Execute (person 2)
```

### Admin
```bash
GET  /api/v2/enterprise/ledger/balance  # Ledger balances
GET  /api/v2/enterprise/audit           # Audit log
POST /api/v2/enterprise/reconcile       # Run reconciliation
```

---

##  Admin Portals

### Affiliate Portal
Access at: http://localhost:5173/affiliate

- View downline tree
- Track commissions
- Performance charts

### Admin Portal  
Access at: http://localhost:5173/admin

- System metrics
- User management
- Payout approval

### Reconciliation Dashboard
Access at: http://localhost:5173/reconciliation

- Stuck intents monitoring
- Missing receipt alerts
- Ledger balance verification

---

##  Testing

```bash
# All tests
npm test

# Contracts only
npm run test:contracts

# API type checking
npm test -w @sge/api

# TypeScript validation
npm run typecheck
```

---

##  Troubleshooting

### "Cannot find module '@sge/shared'"
```bash
npm run build:shared
```

### "Database connection failed"
```bash
npm run db:up
# Wait 3 seconds for Postgres to start
npm run prisma:push
```

### "Redis connection refused"
```bash
npm run db:up
```

### Port conflicts
```bash
# Check what is using ports
netstat -ano | findstr :3000
netstat -ano | findstr :5432
```

---

##  Quick Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start API + App |
| `npm run db:up` | Start Docker services |
| `npm run db:down` | Stop Docker services |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:push` | Push schema to DB |
| `npm run prisma:studio` | Open database UI |
| `npm run worker:dev` | Start job workers |
| `npm run docs:dev` | Start docs server |
| `npm run wallet:new` | Generate wallets |

---

##  Resources

- **[Architecture](./architecture/overview.md)** - System design
- **[Enterprise Features](./architecture/enterprise.md)** - Affiliate, commissions
- **[Runbook](./ops/runbook.md)** - Operations guide
- **[API Reference](./api/)** - Endpoint docs

---

**Ready to contribute?** Read [CONTRIBUTING.md](../.github/CONTRIBUTING.md)!
