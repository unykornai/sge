# System Dashboard

::: info Live Monitoring
This dashboard shows real-time health metrics and platform statistics. Toggle between **Mock Data** (default, safe for demo) and **Live API** mode to connect to your deployed backend.
:::

<script setup>
import Dashboard from './Dashboard.vue'
</script>

<ClientOnly>
  <Dashboard />
</ClientOnly>

## How It Works

This dashboard provides a comprehensive view of the SGE claim platform:

### Health Monitoring
- **System Health**: Overall platform status
- **Network**: Connected blockchain (mainnet/testnet)
- **Latest Block**: Current block height from RPC
- **Relayer**: Gas-paying relayer address
- **SGEID Contract**: NFT minting contract deployment status
- **Claim Contract**: Token claim contract deployment status

### Platform Statistics
- **Total NFTs Minted**: Cumulative SGEID NFTs issued
- **Total Claims**: Completed USDC/USDT claims
- **Payments Processed**: Successful Coinbase Commerce transactions
- **Success Rate**: Percentage of successful claim flows

### Charts & Visualizations
- **RPC Block Progress**: Shows blockchain sync status over time
- **User Journey Funnel**: Conversion rates from page visit → wallet → register → pay → claim

### Mock vs. Real Mode

**Mock Mode (default)**:
- Uses simulated data for safe demonstration
- No API calls or network requests
- Perfect for testing UI/UX and presentation

**Live API Mode**:
- Connects to your deployed backend
- Fetches real-time health and metrics
- Requires CORS-enabled API endpoint at `/healthz`

To switch modes, use the radio buttons at the top of the dashboard.

## Technical Details

The dashboard is built as a Vue 3 component with:
- Reactive state management (`ref`)
- Client-side only rendering (no SSR)
- Pure CSS visualizations (no Chart.js dependency)
- Responsive grid layouts

Data fetching uses native `fetch` API with error handling and loading states.
