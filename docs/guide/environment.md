# Environment

## API (`packages/api/.env`)

Required:
- `ETH_RPC_HTTPS`
- `RELAYER_PRIVATE_KEY`
- `SGEID_ADDRESS` (after deploy)

Optional:
- `COINBASE_COMMERCE_API_KEY`
- `COINBASE_COMMERCE_WEBHOOK_SHARED_SECRET`

## App (`packages/app/.env.local`)

- `VITE_ETH_RPC_HTTPS`
- `VITE_WALLETCONNECT_PROJECT_ID` (optional)

> Tip: Keep mainnet safety by ensuring `chainId` is Ethereum mainnet.
