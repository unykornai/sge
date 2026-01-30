# Upgrade Path: Mock → Real → Production

Step-by-step guide to move from local development to live deployment.

---

## Starting Point: Mock Mode ✅

After running `npm run setup`, you have:
- ✅ In-memory database (no Postgres)
- ✅ In-memory queue (no Redis)
- ✅ Mock blockchain provider (no RPC)
- ✅ Working app at http://localhost:5173
- ✅ API at http://localhost:3000

**Capabilities:**
- Register wallets ✅
- Submit claims ✅
- View status ✅
- Test affiliate codes ✅

**Limitations:**
- Data resets on restart ❌
- No real blockchain transactions ❌
- No persistent state ❌

---

## Upgrade 1: Local Real Mode 🔧

**Goal**: Full stack with database, queue, and mainnet RPC

### Prerequisites
- Docker Desktop installed
- Ethereum RPC URL (Alchemy/Infura free tier)
- Test wallet with 0.5 ETH on mainnet

### Steps

#### 1. Generate Wallets
```bash
npm run wallet:new
```
Copy the output - you'll need DEPLOYER and RELAYER keys.

#### 2. Configure Environment
Edit `packages/api/.env`:
```bash
# Change this line:
MOCK_MODE=false

# Add your RPC URL:
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY_HERE

# Add wallet private keys:
DEPLOYER_PRIVATE_KEY=0xYOUR_DEPLOYER_KEY
RELAYER_PRIVATE_KEY=0xYOUR_RELAYER_KEY
TREASURY_ADDRESS=0xYOUR_GNOSIS_SAFE_ADDRESS
```

#### 3. Start Infrastructure
```bash
npm run db:up
```
Starts Postgres + Redis in Docker.

#### 4. Initialize Database
```bash
npm run prisma:push
```
Creates all tables from schema.prisma.

#### 5. Deploy Contracts (Optional)
If you want to deploy your own contracts:
```bash
cd packages/contracts
npm run deploy:mainnet
```
Copy contract addresses to `packages/api/.env`.

#### 6. Start Platform
```bash
npm run dev
```

### Verification
Visit http://localhost:5173/status and verify:
- Mode shows "Real" (purple banner)
- Chain ID = 1 (Ethereum Mainnet)
- RPC status = healthy
- Relayer balance shows real ETH amount

### Troubleshooting

**Issue**: "Database connection failed"
```bash
# Check if Postgres is running:
docker ps | grep postgres

# View logs:
npm run db:logs
```

**Issue**: "Insufficient funds for gas"
```bash
# Fund relayer wallet:
# Send 0.5 ETH to relayer address shown in .env
```

**Issue**: "RPC rate limit exceeded"
```bash
# Use paid Alchemy tier or add backup RPC:
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
RPC_BACKUP_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
```

---

## Upgrade 2: Production Deployment 🚀

**Goal**: Live platform accessible to real users

### Prerequisites
- Cloud provider account (AWS/GCP/Azure)
- Domain name
- SSL certificate (Let's Encrypt)
- Multi-sig wallet for treasury (Gnosis Safe)

### Architecture

```
[CloudFlare CDN] → [Load Balancer] → [API Servers (2+)]
                                    → [Worker Pool]
                                    
                   [RDS Postgres] ← [API + Workers]
                   [ElastiCache Redis] ← [API + Workers]
```

### Infrastructure Checklist

- [ ] Provision managed Postgres (RDS, Cloud SQL, etc.)
  - Size: db.t3.small minimum (2 vCPU, 2GB RAM)
  - Backups: Daily snapshots, 7-day retention
  - Replicas: Add read replica for analytics

- [ ] Provision managed Redis (ElastiCache, MemoryStore)
  - Size: cache.t3.micro minimum
  - Persistence: AOF enabled

- [ ] Provision compute (EC2, Compute Engine, VMs)
  - API: 2× t3.medium (4 vCPU, 8GB RAM each)
  - Workers: 1× t3.small (2 vCPU, 4GB RAM)
  - Auto-scaling: Add instances at 70% CPU

- [ ] Configure load balancer
  - Health check: GET /healthz
  - Session affinity: Not required (stateless)

- [ ] Set up DNS
  - api.yourdomain.com → Load balancer
  - app.yourdomain.com → CDN (static build)

### Environment Configuration

**Production .env:**
```bash
# Database
DATABASE_URL=postgresql://user:pass@your-rds-endpoint.aws.com:5432/sge

# Redis
REDIS_URL=redis://your-elasticache-endpoint.aws.com:6379

# Blockchain
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_PRODUCTION_KEY
RPC_BACKUP_URL=https://mainnet.infura.io/v3/YOUR_BACKUP_KEY

# Wallets (use AWS Secrets Manager or similar)
RELAYER_PRIVATE_KEY={{resolve:secretsmanager:prod/sge/relayer:SecretString:key}}
TREASURY_ADDRESS=0xYourGnosisSafe  # Multi-sig only!

# Mode
MOCK_MODE=false
NODE_ENV=production

# Security
ADMIN_API_KEY={{resolve:secretsmanager:prod/sge/admin:SecretString:key}}
COINBASE_COMMERCE_SECRET={{resolve:secretsmanager:prod/sge/commerce:SecretString:key}}

# Monitoring
SENTRY_DSN=https://your-sentry-dsn.ingest.sentry.io/project
LOG_LEVEL=info
```

### Deployment Process

#### 1. Build Application
```bash
npm run build
```

#### 2. Database Migration
```bash
# On production server:
npm run prisma:migrate deploy
```

#### 3. Start API
```bash
# Using PM2:
npm run start:api

# Or systemd:
systemctl start sge-api
```

#### 4. Start Workers
```bash
npm run start:workers
```

#### 5. Deploy Frontend
```bash
# Build app
cd packages/app
npm run build

# Upload to S3/CloudFlare Pages/etc
aws s3 sync dist/ s3://your-app-bucket/ --delete
```

#### 6. Verify Health
```bash
curl https://api.yourdomain.com/healthz
```

Expected response:
```json
{
  "ok": true,
  "mode": "PRODUCTION",
  "chainId": 1,
  "blockNumber": 19000000,
  "healthy": true
}
```

### Post-Deployment Checklist

- [ ] Monitor relayer balance (set alert for < 0.1 ETH)
- [ ] Verify database backups are running
- [ ] Test end-to-end flow (register → claim)
- [ ] Set up Prometheus scraping
- [ ] Configure Grafana dashboards
- [ ] Set up PagerDuty alerts for P0/P1 incidents
- [ ] Document runbook in Confluence/Notion
- [ ] Schedule weekly reconciliation reviews
- [ ] Test disaster recovery procedure

---

## Monitoring Setup

### Prometheus Metrics

Add to `prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'sge-api'
    static_configs:
      - targets: ['api-1:3000', 'api-2:3000']
    metrics_path: '/metrics'
```

### Grafana Dashboards

Import dashboard JSON from `docs/ops/grafana/`:
- **Overview**: System health, uptime, error rate
- **Settlement**: Intent processing time, success rate
- **Financial**: Commission totals, payout volumes
- **Infrastructure**: DB connections, Redis memory, API latency

### Alerting Rules

```yaml
groups:
  - name: sge_alerts
    rules:
      - alert: RelayerLowBalance
        expr: sge_relayer_balance_eth < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Relayer wallet balance low"

      - alert: LedgerImbalance
        expr: abs(sge_ledger_balance) > 0.01
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Ledger debits ≠ credits"

      - alert: StuckIntents
        expr: sge_intents_total{status="PROCESSING"} > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Too many stuck intents"
```

---

## Cost Optimization

### Gas Costs
- **Current**: ~0.003 ETH per mint (~$6 at 2000 ETH/USD)
- **Optimization**: Use EIP-1559 with base fee only (no priority)
- **Savings**: ~30% reduction

### RPC Costs
- **Free tier**: 100k requests/month (Alchemy)
- **Paid tier**: $199/mo for 12M requests
- **Optimization**: Cache blockchain state (blocks, balances)

### Database Costs
- **Current**: db.t3.small ($30/mo)
- **Scaling**: db.r5.large ($300/mo) for 1M users
- **Optimization**: Archive old intents to S3, use read replicas

---

## Rollback Procedure

If production deployment fails:

1. **Stop workers** (prevents new settlements)
```bash
systemctl stop sge-workers
```

2. **Revert database migration**
```bash
npm run prisma:migrate resolve --rolled-back MIGRATION_NAME
```

3. **Deploy previous API version**
```bash
git checkout v1.2.3
npm run build
pm2 restart sge-api
```

4. **Verify health**
```bash
curl https://api.yourdomain.com/healthz
```

5. **Resume workers**
```bash
systemctl start sge-workers
```

---

## Next Steps

- **Operations**: [Reconciliation Runbook](../ops/reconciliation.html)
- **Security**: [Threat Model](../ops/threat-model.html)
- **Architecture**: [System Overview](../architecture/system.html)
