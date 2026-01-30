# Architecture Overview

## Components

- **PWA App** (`@sge/app`): Coinbase Wallet-first UX, approvals + claim UX.
- **API** (`@sge/api`): gasless minting, optional Commerce webhooks, storage.
- **Contracts** (`@sge/contracts`): SGE-ID ERC721; claim contract is external mainnet deployment.
- **Shared** (`@sge/shared`): ABIs and shared helpers.

## High-level flow

```mermaid
sequenceDiagram
  participant U as User (Wallet)
  participant A as App (PWA)
  participant API as API (Express)
  participant E as Ethereum Mainnet

  U->>A: Open app
  A->>API: POST /api/register (wallet)
  API->>E: Relayer mints SGE-ID
  E-->>API: Tx receipt
  API-->>A: tokenId + txHash
  A-->>U: Show minted SGE-ID
```
