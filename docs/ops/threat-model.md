# Threat Model (starter)

This is a pragmatic, SR-level starter threat model you can expand.

## Assets

- Relayer private key
- Admin API key(s)
- Coinbase Commerce webhook secret
- Mint/claim records

## Trust boundaries

```mermaid
flowchart LR
  U[User Browser] -->|HTTPS| APP[App (PWA)]
  APP -->|HTTPS| API[API]
  API -->|HTTPS| RPC[RPC Provider]
  API -->|HMAC| CC[Coinbase Commerce]
  API -->|tx| ETH[(Ethereum mainnet)]

  classDef trust fill:#0b1220,stroke:#334155,color:#e2e8f0;
  class API,CC,RPC trust;
```

## Primary risks

- Secret leakage (env files, logs, CI)
- Webhook spoofing (missing raw-body verification)
- Wallet draining via compromised relayer
- Replay/double-claim scenarios

## Controls

- Do not log secrets
- Validate webhook signature using raw bytes
- Limit relayer balance; rotate keys
- Mainnet-only chain guards in app and API
