# Interactive Demo

<script setup>
import InteractiveDemo from './InteractiveDemo.vue'
</script>

<ClientOnly>
  <InteractiveDemo />
</ClientOnly>

## How It Works

This interactive demo allows you to experience the complete SGE claim flow directly in your browser:

### Mock Mode (Default)
- **Fully simulated** transactions and responses
- **No wallet required** - just enter any valid Ethereum address
- **Instant feedback** - see each step complete in seconds
- **Always works** - perfect for understanding the flow

### Real Mode (Advanced)
- **Live API integration** - connects to your running API
- **Requires configuration** - API URL must be accessible
- **Wallet signing needed** - real transactions require MetaMask/Coinbase Wallet
- **Production testing** - validate your deployment

## Flow Steps

### 1. Connect Wallet
Enter a valid Ethereum address (0x...). In mock mode, use any address. In real mode, this should be your actual wallet.

### 2. Register (Gasless Mint)
The system mints an SGE-ID NFT to your address. The relayer pays all gas fees - completely free for users.

**API Endpoint:** `POST /api/register`

**Response:**
```json
{
  "tokenId": 42,
  "txHash": "0x...",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### 3. Check Status
Verify eligibility by checking:
- SGE-ID NFT ownership
- Payment status (if required)
- Claim readiness

**API Endpoint:** `GET /api/status?wallet=0x...`

### 4. Approve Tokens
Set allowance for the Claim contract to spend your USDC or USDT. This is a standard ERC-20 approval transaction.

**Note:** USDT requires resetting allowance to 0 before increasing it.

### 5. Claim SGE
Execute the final claim transaction to receive your SGE tokens. The Claim contract transfers your stablecoins to the treasury and credits you with SGE.

## Technical Details

### Mock Mode Implementation
- Uses `setTimeout` to simulate network delays
- Returns pre-defined mock data
- No external dependencies
- Runs entirely in browser

### Real Mode Integration
```javascript
// Example: Register endpoint call
const response = await fetch(`${apiUrl}/api/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wallet: '0x...' })
})
const data = await response.json()
```

### State Management
The demo uses Vue 3 Composition API with reactive state:
- `wallet` - User's Ethereum address
- `mode` - 'mock' or 'real'
- `step` - Current position in flow (0-5)
- `loading` - Request in progress
- `error` / `success` - User feedback messages

## Try It Now!

The demo is fully functional above. Enter a wallet address and click through the flow to see how the SGE claim system works.

For a real integration, deploy the API and app following the [Quickstart Guide](/guide/quickstart).
