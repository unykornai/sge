# System Architecture

## High-Level Overview

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#22c55e','primaryTextColor':'#f5f5f5','primaryBorderColor':'#16a34a','lineColor':'#3b82f6','secondaryColor':'#1a1a1a','tertiaryColor':'#0a0a0a','background':'#0a0a0a','mainBkg':'#1a1a1a','secondBkg':'#2a2a2a'}}}%%
graph TB
    subgraph Client["🌐 Client Layer"]
        PWA[React PWA<br/>Vite + wagmi]
        CW[Coinbase Wallet<br/>Browser Extension]
    end
    
    subgraph API["⚡ API Layer"]
        Express[Express Server<br/>TypeScript]
        Relayer[Relayer Wallet<br/>Gasless Tx]
    end
    
    subgraph Blockchain["⛓️ Ethereum Mainnet"]
        SGEID[SGEID Contract<br/>ERC-721]
        USDC[USDC Contract]
        USDT[USDT Contract]
        Claim[SGE Claim Contract]
    end
    
    subgraph External["🔌 External Services"]
        RPC[Ethereum RPC<br/>Alchemy/Infura]
        Commerce[Coinbase Commerce<br/>Optional]
    end
    
    PWA -->|1. Request Mint| Express
    Express -->|2. Relayer Signs| Relayer
    Relayer -->|3. Submit Tx| RPC
    RPC -->|4. Execute| SGEID
    
    PWA -->|5. Approve USDC/USDT| CW
    CW -->|6. User Signs| RPC
    RPC -->|7. Set Allowance| USDC
    RPC -->|7. Set Allowance| USDT
    
    PWA -->|8. Claim Tokens| Express
    Express -->|9. Prepare Claim| Claim
    PWA -->|10. Execute Claim| CW
    
    Express -.->|Optional Payment| Commerce
    Commerce -.->|Webhook| Express
    
    classDef client fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef api fill:#22c55e,stroke:#16a34a,color:#000
    classDef chain fill:#f59e0b,stroke:#d97706,color:#000
    classDef external fill:#8b5cf6,stroke:#7c3aed,color:#fff
    
    class PWA,CW client
    class Express,Relayer api
    class SGEID,USDC,USDT,Claim chain
    class RPC,Commerce external
```

## Container Diagram (C4)

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#22c55e','lineColor':'#3b82f6'}}}%%
graph LR
    User((User<br/>Wallet))
    
    subgraph "SGE Platform"
        App[Web App<br/>React PWA]
        API[API Server<br/>Express/TS]
        DB[(JSON Storage<br/>Claims/Mints)]
    end
    
    subgraph "Ethereum Mainnet"
        SGEID[SGEID NFT]
        Tokens[Token Contracts]
    end
    
    RPC[RPC Provider]
    Commerce[Coinbase Commerce]
    
    User -->|Browse/Interact| App
    App -->|API Calls| API
    App -->|Sign Tx| User
    API -->|Read/Write| DB
    API -->|Submit Tx| RPC
    RPC -->|Execute| SGEID
    RPC -->|Execute| Tokens
    API -.->|Charge| Commerce
    Commerce -.->|Webhook| API
    
    classDef user fill:#3b82f6,color:#fff
    classDef platform fill:#22c55e,color:#000
    classDef chain fill:#f59e0b,color:#000
    classDef external fill:#8b5cf6,color:#fff
    
    class User user
    class App,API,DB platform
    class SGEID,Tokens,RPC chain
    class Commerce external
```

## Deployment Architecture

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#22c55e'}}}%%
graph TB
    subgraph "Production"
        LB[Load Balancer]
        API1[API Instance 1]
        API2[API Instance 2]
        App[Static PWA<br/>CDN/Pages]
    end
    
    subgraph "Infrastructure"
        PM2[PM2 Process Manager]
        Docker[Docker Compose]
        Logs[Pino Logs]
    end
    
    subgraph "External"
        GH[GitHub Actions<br/>CI/CD]
        Pages[GitHub Pages]
        RPC[Ethereum RPC]
    end
    
    GH -->|Deploy| App
    GH -->|Deploy| PM2
    App -->|Served by| Pages
    LB --> API1
    LB --> API2
    PM2 --> API1
    PM2 --> API2
    Docker --> PM2
    API1 --> Logs
    API2 --> Logs
    API1 --> RPC
    API2 --> RPC
```

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React, Vite, TypeScript, wagmi, Coinbase Wallet SDK |
| **Backend** | Express, TypeScript, ethers.js v6, Pino logger |
| **Contracts** | Solidity 0.8.23, Hardhat, OpenZeppelin |
| **Infrastructure** | Docker, PM2, GitHub Actions |
| **Blockchain** | Ethereum Mainnet, ERC-721, ERC-20 |
| **External** | Alchemy/Infura RPC, Coinbase Commerce (optional) |

## Security Boundaries

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#22c55e'}}}%%
graph TB
    subgraph Public["🌍 Public Zone (Untrusted)"]
        Browser[User Browser]
        Wallet[Wallet Extension]
    end
    
    subgraph DMZ["🔒 DMZ (Semi-Trusted)"]
        API[API Server]
        Static[Static App]
    end
    
    subgraph Secure["🛡️ Secure Zone (Trusted)"]
        RelayerKey[Relayer Private Key<br/>ENV_VAR]
        AdminKey[Admin API Key<br/>ENV_VAR]
        Storage[Claim Records]
    end
    
    subgraph External["🌐 External (Validated)"]
        RPC[Ethereum RPC<br/>TLS]
        Commerce[Coinbase Commerce<br/>HMAC Verified]
    end
    
    Browser -->|HTTPS| Static
    Browser -->|HTTPS + Auth| API
    Wallet -->|User Signs| Browser
    API -->|Environment| RelayerKey
    API -->|Environment| AdminKey
    API -->|Read/Write| Storage
    API -->|TLS + API Key| RPC
    API -.->|HMAC Sig| Commerce
    
    classDef public fill:#ef4444,color:#fff
    classDef dmz fill:#f59e0b,color:#000
    classDef secure fill:#22c55e,color:#000
    classDef external fill:#3b82f6,color:#fff
    
    class Browser,Wallet public
    class API,Static dmz
    class RelayerKey,AdminKey,Storage secure
    class RPC,Commerce external
```
