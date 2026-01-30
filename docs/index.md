---
layout: home

title: SGE Claim System
hero:
  name: SGE Claim System
  text: Gasless SGE‑ID + USDC/USDT claim on Ethereum mainnet
  tagline: Professional docs with flow diagrams, runbooks, and CI-ready commands.
  actions:
    - theme: brand
      text: Quickstart
      link: /guide/quickstart
    - theme: alt
      text: Architecture
      link: /architecture/overview
features:
  - title: Gasless minting
    details: SGE‑ID ERC‑721 is minted by a relayer; users pay $0 in gas.
  - title: USDC/USDT approve + claim
    details: USDT reset-to-zero pattern supported; claim flow is mainnet-only.
  - title: Commerce webhooks (optional)
    details: HMAC-verified raw body, designed for operational safety.
---

<div class="sge-kpi">
  <div><span class="sge-pill blue">Mainnet</span><br><strong>chainId = 1</strong><br>Hard guardrails to avoid testnet drift.</div>
  <div><span class="sge-pill amber">Payments</span><br><strong>USDC/USDT</strong><br>Allowance checks + USDT reset-to-zero.</div>
  <div><span class="sge-pill rose">Ops</span><br><strong>Runbooks</strong><br>Monitoring + incident checklist.</div>
</div>

## System map

```mermaid
flowchart LR
  U[User\nCoinbase Wallet / PWA] -->|/api/register| API[Express API]
  API -->|relayer tx| ETH[(Ethereum mainnet)]
  ETH -->|mint| SGEID[SGE-ID ERC721]

  U -->|approve USDC/USDT| ERC20[(USDC/USDT)]
  U -->|claimWithUSDC / claimWithUSDT| CLAIM[SGE Claim contract]
  CLAIM -->|transfer SGE| SGE[SGE token]

  CC[Coinbase Commerce] -->|signed webhook| API
```
