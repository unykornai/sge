# Production Deployment Checklist

Use this checklist before going live with real users and real money.

---

## Pre-Deployment (Week Before Launch)

### Security Review
- [ ] Contracts audited by third-party (Consensys, OpenZeppelin, etc.)
- [ ] Penetration testing completed
- [ ] API keys rotated to production values
- [ ] Multi-sig treasury configured (3-of-5 Gnosis Safe)
- [ ] Relayer wallet funded with exactly 0.5 ETH (no more)
- [ ] Deployer private key removed from all servers
- [ ] Secrets stored in managed service (AWS Secrets Manager, etc.)
- [ ] Rate limits tested under load
- [ ] CORS restricted to production domains only

### Infrastructure Validation
- [ ] Database provisioned (RDS/Cloud SQL with backups)
- [ ] Redis provisioned (ElastiCache/MemoryStore)
- [ ] Load balancer configured with health checks
- [ ] Auto-scaling policies set (70% CPU threshold)
- [ ] CloudFlare or equivalent DDoS protection enabled
- [ ] SSL certificates installed and auto-renewal configured
- [ ] DNS records point to production (api.yourdomain.com, app.yourdomain.com)
- [ ] Monitoring stack deployed (Prometheus + Grafana)
- [ ] Log aggregation configured (CloudWatch, Datadog, etc.)

### Application Testing
- [ ] End-to-end test: Register → Pay → Claim on mainnet
- [ ] Load test: Simulate 10k concurrent users
- [ ] Failover test: Kill one API server, verify LB redirects
- [ ] Database failover test: Promote read replica to primary
- [ ] Worker crash test: Verify jobs resume after restart
- [ ] Webhook signature test: Coinbase Commerce integration
- [ ] Affiliate commission test: Verify tree attribution works
- [ ] Payout approval test: 2-person workflow functions

### Compliance & Legal
- [ ] Terms of Service drafted and reviewed by legal
- [ ] Privacy Policy published
- [ ] GDPR compliance verified (if serving EU users)
- [ ] KYC provider integrated (if required)
- [ ] Risk disclosures displayed prominently
- [ ] Jurisdiction restrictions implemented (if applicable)

---

## Launch Day (Go Live)

### T-1 Hour
- [ ] Database backup taken manually
- [ ] All services healthy (check Grafana)
- [ ] PagerDuty on-call assigned
- [ ] Incident response channel ready (Slack/Discord)
- [ ] Relayer balance confirmed > 0.4 ETH

### T-0 (Launch)
- [ ] Switch DNS to production servers
- [ ] Monitor error rates in real-time
- [ ] Watch queue depth (should be < 50)
- [ ] Check first 10 registrations manually
- [ ] Verify Etherscan shows transactions

### T+1 Hour
- [ ] Verify 99% success rate on intents
- [ ] Check ledger balances (must equal zero)
- [ ] Confirm webhooks are being received
- [ ] Test affiliate attribution (register with referral code)

### T+4 Hours
- [ ] Review logs for anomalies
- [ ] Verify API latency < 200ms p95
- [ ] Check relayer balance (should decrease predictably)
- [ ] Test claim flow end-to-end

### T+24 Hours
- [ ] Daily reconciliation report generated
- [ ] No stuck intents (processing > 10 minutes)
- [ ] No ledger imbalances
- [ ] Backup restored successfully in staging (verify)

---

## Post-Launch (First Week)

### Daily Tasks
- [ ] Review reconciliation dashboard
- [ ] Check relayer balance (fund if < 0.2 ETH)
- [ ] Monitor error rates (target: < 0.1%)
- [ ] Review new affiliate signups
- [ ] Check for unusual activity (fraud detection)

### Weekly Tasks
- [ ] Ledger reconciliation audit (manual verification)
- [ ] Review payout batches (approve if valid)
- [ ] Database performance analysis (slow queries)
- [ ] Cost analysis (gas, RPC, infra)
- [ ] Security log review (failed auth attempts, etc.)

### Metrics to Watch

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| API uptime | > 99.9% | < 99.5% |
| Intent success rate | > 95% | < 90% |
| Settlement latency (p95) | < 5s | > 10s |
| Relayer balance | 0.2-0.5 ETH | < 0.1 ETH |
| Queue depth | < 100 | > 500 |
| Ledger balance | 0.000000 | ≠ 0 |

---

## Incident Response

### P0 - Critical (Immediate Response)
- **Ledger imbalance detected**: Stop all workers, investigate
- **Relayer compromised**: Rotate keys, investigate txs
- **Smart contract exploit**: Pause contract if possible, assess damage

**Response Time**: < 15 minutes
**Communication**: Public status page + Twitter/email

### P1 - High (1 Hour Response)
- **API down**: Failover to backup, investigate root cause
- **Database unreachable**: Promote replica to primary
- **RPC provider down**: Switch to backup RPC

**Response Time**: < 1 hour
**Communication**: Status page update

### P2 - Medium (4 Hour Response)
- **Stuck intents > 100**: Investigate queue depth, restart workers
- **High error rate (> 5%)**: Review logs, identify pattern

**Response Time**: < 4 hours
**Communication**: Internal only

### P3 - Low (Next Business Day)
- **Slow queries**: Optimize with indexes
- **High gas costs**: Adjust EIP-1559 strategy

**Response Time**: Next business day
**Communication**: None

---

## Rollback Plan

If production deployment causes critical issues:

### 1. Immediate Rollback (< 5 minutes)
```bash
# Stop workers (prevents new settlements)
systemctl stop sge-workers

# Switch LB to previous API version
kubectl set image deployment/sge-api api=sge-api:v1.2.3

# Verify health
curl https://api.yourdomain.com/healthz
```

### 2. Database Rollback (if needed)
```bash
# Restore from snapshot (choose timestamp before deployment)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier sge-prod-rollback \
  --db-snapshot-identifier manual-snapshot-2025-01-15

# Update DATABASE_URL to new instance
# Restart API and workers
```

### 3. Post-Rollback
- [ ] Notify users of downtime
- [ ] Investigate root cause
- [ ] Fix in staging
- [ ] Re-test before next deployment

---

## Scaling Triggers

**When to scale UP:**
- API CPU > 70% for 5+ minutes
- Queue depth > 1000 for 10+ minutes
- Database connections > 80% of max
- Redis memory > 80% capacity

**When to scale DOWN:**
- API CPU < 20% for 1+ hour
- Queue depth < 10 consistently
- Off-peak hours (auto-scaling)

**Scaling Actions:**
1. Add API server instance (takes ~2 minutes)
2. Increase worker concurrency (edit WORKER_CONCURRENCY env var)
3. Upgrade database tier (requires maintenance window)
4. Add Redis cluster nodes

---

## Long-Term Maintenance

### Monthly Tasks
- [ ] Review cloud costs and optimize
- [ ] Rotate API keys and secrets
- [ ] Archive old intents (> 6 months) to S3
- [ ] Security patch updates (Node.js, dependencies)
- [ ] Performance tuning (slow query analysis)

### Quarterly Tasks
- [ ] Full security audit
- [ ] Disaster recovery drill (restore from backup)
- [ ] Capacity planning review
- [ ] Contract upgrade evaluation (if needed)
- [ ] Compliance audit (KYC, AML if applicable)

### Yearly Tasks
- [ ] Major version upgrades (Node.js, Postgres, etc.)
- [ ] Infrastructure cost review
- [ ] Business continuity plan update
- [ ] Insurance policy review (cyber insurance)

---

## Success Criteria

Platform is production-ready when:

✅ **Uptime**: 99.9% over 30 days
✅ **Latency**: p95 < 200ms for API, < 5s for settlements
✅ **Success rate**: > 95% of intents complete successfully
✅ **Security**: Zero critical vulnerabilities in last 90 days
✅ **Monitoring**: All metrics exported to Prometheus
✅ **Documentation**: Runbooks exist for all P0/P1 incidents
✅ **Backups**: Daily snapshots, tested restore within 1 hour
✅ **On-call**: 24/7 rotation with escalation path

---

## Resources

- **Operational Runbook**: [ops/reconciliation.md](../ops/reconciliation.html)
- **Threat Model**: [ops/threat-model.md](../ops/threat-model.html)
- **Architecture**: [architecture/system.md](../architecture/system.html)
- **GitHub**: [Issues](https://github.com/unykornai/sge/issues) for bug reports
