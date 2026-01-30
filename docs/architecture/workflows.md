# System Workflows

Complete workflow diagrams showing how data flows through the SGE platform.

## Registration Flow

```mermaid
sequenceDiagram
    actor User
    participant App
    participant API
    participant Relayer
    participant SGEID
    participant Ethereum

    User->>App: Connect wallet (Coinbase/WalletConnect)
    App->>API: POST /api/register { wallet }
    API->>API: Check if already registered
    
    alt Already registered
        API-->>App: 409 Conflict
        App-->>User: Show "Already registered"
    else New user
        API->>Relayer: Request SGEID mint
        Relayer->>SGEID: mintTo(wallet, tokenId)
        SGEID->>Ethereum: Write transaction
        Ethereum-->>SGEID: Transaction hash
        SGEID-->>Relayer: Receipt
        Relayer-->>API: Success + tx_hash
        API->>API: Save User record
        API-->>App: 200 OK { user, tx_hash }
        App-->>User: Show success + Etherscan link
    end
```

**Key Points:**
- **Idempotent**: Duplicate registrations return existing record
- **Relayer pattern**: API never holds hot wallet keys
- **Gas abstraction**: User pays nothing
- **Sequential tokenIds**: First user = 1, second = 2, etc.

---

## Claim Flow (Single-Signature)

```mermaid
sequenceDiagram
    actor User
    participant App
    participant API
    participant Queue
    participant Worker
    participant USDC
    participant Relayer
    participant Claim
    participant Ethereum

    User->>App: Enter intent details (amount, token)
    App->>API: POST /api/claim/intent
    API->>API: Validate user, check balance
    API->>Queue: Add intent job
    API-->>App: 202 Accepted { intentId }
    App-->>User: Show "Processing..."

    Queue->>Worker: Process intent
    Worker->>USDC: Check allowance(user, ClaimContract)
    
    alt Allowance insufficient
        Worker->>Relayer: Request allowance increase
        Relayer->>USDC: increaseAllowance(ClaimContract, amount)
        USDC->>Ethereum: Write tx
        Ethereum-->>Worker: Receipt
    end

    Worker->>Relayer: Request claim execution
    Relayer->>Claim: executeClaim(user, tokenId, amount, token)
    Claim->>USDC: transferFrom(user, treasury, amount)
    USDC->>Ethereum: Write tx
    Ethereum-->>Claim: Receipt
    Claim-->>Worker: Success + tx_hash

    Worker->>API: Update settlement status
    API-->>App: Webhook or polling
    App-->>User: Show success + Etherscan link
```

**Key Points:**
- **Background processing**: Worker handles blockchain interactions
- **Allowance management**: Automatically resets if insufficient
- **Idempotency**: Each intent has unique ID
- **Treasury address**: Funds collected at program-level wallet

---

## Commerce Webhook Flow

```mermaid
sequenceDiagram
    actor Customer
    participant Commerce as Coinbase Commerce
    participant API
    participant Queue
    participant Worker
    participant DB

    Customer->>Commerce: Pay with crypto
    Commerce->>Commerce: Verify payment
    Commerce->>API: POST /api/webhooks/commerce
    
    API->>API: Verify signature (X-CC-Webhook-Signature)
    
    alt Invalid signature
        API-->>Commerce: 401 Unauthorized
    else Valid signature
        API->>Queue: Add webhook job
        API-->>Commerce: 200 OK
        
        Queue->>Worker: Process webhook
        Worker->>Worker: Parse event type
        
        alt charge:confirmed
            Worker->>DB: Update intent status → PAID
            Worker->>DB: Create settlement record
        else charge:failed
            Worker->>DB: Update intent status → FAILED
        end
    end
```

**Key Points:**
- **Signature verification**: Uses shared secret from Coinbase
- **Async processing**: Webhook returns immediately, worker processes later
- **Event types**: `charge:created`, `charge:confirmed`, `charge:failed`, `charge:delayed`
- **Idempotency**: Webhook ID prevents duplicate processing

---

## Affiliate Commission Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant DB
    participant Queue
    participant Worker

    User->>API: POST /api/register?ref=ALPHA
    API->>DB: Find affiliate by code "ALPHA"
    
    alt Affiliate exists
        API->>DB: Create user with referredBy = affiliate.id
        API->>DB: Calculate commission (1% of $10 = $0.10)
        API->>DB: Create commission record (ACCRUED)
        API-->>User: 200 OK
        
        Note over API,Worker: Later, during payout cycle
        
        API->>Queue: Daily payout job
        Queue->>Worker: Process payouts
        Worker->>DB: Find all ACCRUED commissions > 30 days
        Worker->>DB: Update commissions → PAYABLE
        Worker->>DB: Create payout batch (PENDING_APPROVAL)
        Worker->>Worker: Notify admin for approval
    else Affiliate not found
        API->>DB: Create user without referral
        API-->>User: 200 OK (no commission)
    end
```

**Key Points:**
- **Tiered attribution**: If ALPHA was referred by BETA, both earn
- **Approval workflow**: 2-person approval for payout batches
- **Commission rates**: Configurable in program settings
- **Minimum payout**: Default $10 (configurable)

---

## Security Boundaries

```mermaid
graph TB
    subgraph "Public Internet"
        User[User Browser]
        GitHub[GitHub Pages Demo]
    end

    subgraph "Application Layer"
        App[React App<br/>packages/app]
        API[Express API<br/>packages/api]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Prisma)]
        Redis[(Redis<br/>BullMQ)]
    end

    subgraph "Blockchain Layer"
        RPC[RPC Provider<br/>Infura/Alchemy]
        Ethereum[Ethereum Mainnet]
    end

    subgraph "Secrets Management"
        Relayer[Relayer Wallet<br/>Hot wallet]
        Treasury[Treasury Wallet<br/>Cold storage]
        Deployer[Deployer Wallet<br/>One-time use]
    end

    User -->|HTTPS| App
    GitHub -->|MSW| GitHub
    App -->|API calls| API
    API -->|Queries| DB
    API -->|Jobs| Redis
    API -->|RPC calls| RPC
    RPC -->|JSON-RPC| Ethereum
    
    API -.->|Signs txs| Relayer
    Ethereum -.->|Receives funds| Treasury
    
    style Relayer fill:#ff6b6b
    style Treasury fill:#51cf66
    style Deployer fill:#ffd43b
    style User fill:#4dabf7
