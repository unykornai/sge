# SGE Platform Runbook

> Operational procedures for the SGE Energy platform.

---

## Table of Contents

1. [Relayer Management](#relayer-management)
2. [Monitoring](#monitoring)
3. [Incident Response](#incident-response)
4. [Common Issues](#common-issues)

---

## Relayer Management

### Checking Relayer Balance

```bash
# Via API (requires admin key)
curl -H "X-Admin-Key: YOUR_KEY" http://localhost:3000/api/admin/fund-check

# Direct via etherscan
# https://etherscan.io/address/RELAYER_ADDRESS
```

### Funding Thresholds

| Balance (ETH) | Status | Action |
|---------------|--------|--------|
| > 0.5 | ✅ Healthy | No action needed |
| 0.1 - 0.5 | ⚠️ Warning | Plan to fund soon |
| 0.05 - 0.1 | 🔴 Low | Fund immediately |
| < 0.05 | 🚨 Critical | Minting will fail |

### Funding the Relayer

1. Get relayer address from logs or `/api/admin/fund-check`
2. Send ETH from a funded wallet
3. Verify balance updated: `curl .../api/admin/fund-check`

### Rotating Relayer Keys

1. Generate new key:
   ```bash
   node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
   ```
2. Fund the new address
3. Transfer SGEID ownership to new address:
   ```solidity
   sgeid.transferOwnership(newAddress)
   ```
4. Update `RELAYER_PRIVATE_KEY` in `.env`
5. Restart API

---

## Monitoring

### Health Check

```bash
curl http://localhost:3000/healthz
```

Expected response:
```json
{
  "status": "ok",
  "chain": 1,
  "block": 12345678,
  "timestamp": "2026-01-29T..."
}
```

### Key Metrics to Track

- `/healthz` response time (< 500ms)
- Relayer ETH balance
- Mint success rate
- Webhook processing latency
- RPC provider errors

### Log Files (PM2)

```bash
pm2 logs sge-api --lines 100
pm2 logs sge-api --err
```

---

## Incident Response

### Minting Failures

**Symptoms**: Users report registration not completing, no NFT received

**Diagnosis**:
```bash
# Check relayer balance
curl -H "X-Admin-Key: KEY" localhost:3000/api/admin/fund-check

# Check recent mints
curl -H "X-Admin-Key: KEY" localhost:3000/api/admin/mints
```

**Resolution**:
1. If balance low → Fund relayer
2. If RPC errors → Check RPC provider status, switch if needed
3. If contract errors → Verify SGEID_ADDRESS is correct

### Webhook Not Processing

**Symptoms**: Payments not registering, users stuck at payment screen

**Diagnosis**:
1. Check Coinbase Commerce dashboard for webhook delivery status
2. Check API logs for signature verification failures

**Resolution**:
1. Verify `COINBASE_COMMERCE_WEBHOOK_SHARED_SECRET` matches dashboard
2. Ensure webhook URL is publicly accessible (not localhost)
3. Check rate limiting isn't blocking webhooks

### RPC Provider Down

**Symptoms**: All blockchain operations failing

**Resolution**:
1. Switch to backup RPC in `.env`:
   - Alchemy → Infura
   - Infura → QuickNode
   - Any → Public RPC (temporary)
2. Restart API

---

## Common Issues

### "EVM initialization failed"

**Cause**: Invalid RPC URL or private key format

**Fix**:
```bash
# Verify RPC works
curl -X POST YOUR_RPC_URL -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Verify private key format (should start with 0x, 66 chars total)
echo $RELAYER_PRIVATE_KEY | wc -c  # Should be 67 (including newline)
```

### "Could not decode result data"

**Cause**: SGEID_ADDRESS is not deployed or wrong address

**Fix**:
1. Verify contract is deployed at that address on Etherscan
2. Verify you're on mainnet (chainId 1)
3. Re-deploy if necessary

### "Relayer is not SGEID contract owner"

**Cause**: Ownership mismatch after key rotation or wrong key

**Fix**:
1. Check current owner: 
   ```bash
   cast call SGEID_ADDRESS "owner()" --rpc-url YOUR_RPC
   ```
2. If mismatch, either:
   - Use the correct private key
   - Transfer ownership from current owner

---

## Emergency Procedures

### Full System Restart

```bash
pm2 stop all
# Wait 10 seconds
pm2 start ecosystem.config.js
pm2 logs
```

### Rollback Deployment

```bash
git checkout PREVIOUS_COMMIT
npm install
npm run build
pm2 restart all
```

### Disable Registration (Emergency)

Set in `.env`:
```
KYC_REQUIRED=true  # Blocks all registrations without KYC
```

Then restart API.

---

## Contacts

- **On-call**: oncall@supergreenenergy.com
- **Escalation**: engineering@supergreenenergy.com
- **Security**: security@supergreenenergy.com
