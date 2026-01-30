# SGE Platform Runbook

Operational procedures for the SGE claim system (API + relayer + PWA).

## Quick checks

- Health: `GET http://localhost:3000/healthz`
- CI sanity: `npm run test:ci`
- App: `http://localhost:5173`

---

## Relayer management

### Checking relayer balance

```bash
# Via API (requires admin key)
curl -H "X-Admin-Key: YOUR_KEY" http://localhost:3000/api/admin/fund-check

# Direct via Etherscan
# https://etherscan.io/address/RELAYER_ADDRESS
```

### Funding thresholds

| Balance (ETH) | Status | Action |
|---:|---|---|
| > 0.5 | Healthy | No action needed |
| 0.1 - 0.5 | Warning | Plan to fund soon |
| 0.05 - 0.1 | Low | Fund immediately |
| < 0.05 | Critical | Minting will fail |

### Rotating relayer keys

1. Generate a new key
   ```bash
   node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
   ```
2. Fund the new address
3. Transfer SGEID ownership to the new address
4. Update `RELAYER_PRIVATE_KEY` in `packages/api/.env`
5. Restart API

---

## Monitoring

### Health check

```bash
curl http://localhost:3000/healthz
```

### Key metrics to track

- `/healthz` response time (< 500ms)
- Relayer ETH balance
- Mint success rate
- Webhook processing latency
- RPC provider errors

### Log files (PM2)

```bash
pm2 logs sge-api --lines 100
pm2 logs sge-api --err
```

---

## Incident response

### Minting failures

Symptoms: users report registration not completing / no NFT received.

Diagnosis:
```bash
curl -H "X-Admin-Key: KEY" localhost:3000/api/admin/fund-check
curl -H "X-Admin-Key: KEY" localhost:3000/api/admin/mints
```

Resolution:
1. If balance low → fund relayer
2. If RPC errors → check provider status, switch if needed
3. If contract errors → verify `SGEID_ADDRESS` is correct

### Webhook not processing

Symptoms: payments not registering; users stuck at payment screen.

Resolution:
1. Verify `COINBASE_COMMERCE_WEBHOOK_SHARED_SECRET`
2. Ensure webhook URL is publicly accessible (not localhost)
3. Check rate limiting / WAF rules

### RPC provider down

Resolution:
1. Switch to backup RPC in `.env`
2. Restart API

---

## Common issues

### “EVM initialization failed”

Cause: invalid RPC URL or private key format.

Fix:
```bash
curl -X POST YOUR_RPC_URL -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Private key should start with 0x and be 66 chars
echo $RELAYER_PRIVATE_KEY
```

### “Could not decode result data”

Cause: `SGEID_ADDRESS` is wrong or not deployed.

Fix:
1. Verify on Etherscan
2. Verify chainId is mainnet (1)
3. Re-deploy if necessary

---

## Emergency procedures

### Full system restart

```bash
pm2 stop all
pm2 start ecosystem.config.js
pm2 logs
```
