# Data Model

## Entity Relationship Diagram

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#22c55e'}}}%%
erDiagram
    USER ||--o{ MINT_RECORD : has
    USER ||--o{ CLAIM_RECORD : has
    USER ||--o{ PAYMENT_RECORD : has
    USER ||--|| NFT : owns
    
    USER {
        string wallet_address PK
        boolean has_nft
        boolean has_paid
        timestamp registered_at
    }
    
    MINT_RECORD {
        string wallet_address PK
        int token_id
        string tx_hash
        timestamp timestamp
    }
    
    CLAIM_RECORD {
        string wallet_address PK
        string token_type
        int amount
        string tx_hash
        timestamp timestamp
    }
    
    PAYMENT_RECORD {
        string wallet_address PK
        string charge_code
        string status
        int amount_usd
        timestamp created_at
        timestamp confirmed_at
    }
    
    NFT {
        int token_id PK
        string owner
        string token_uri
    }
```

## JSON Storage Schema

### mints.json
```json
{
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb": {
    "tokenId": 1,
    "txHash": "0xabc...",
    "timestamp": 1706553600000
  }
}
```

### claims.json
```json
{
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb": {
    "token": "USDC",
    "amount": 100000000,
    "approveTxHash": "0xdef...",
    "claimTxHash": "0x123...",
    "timestamp": 1706557200000
  }
}
```

### payments.json
```json
{
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb": {
    "chargeCode": "ABC123",
    "status": "CONFIRMED",
    "amountUsd": 100,
    "createdAt": 1706550000000,
    "confirmedAt": 1706553600000
  }
}
```

## State Machine: User Journey

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#22c55e'}}}%%
stateDiagram-v2
    [*] --> NewUser: Arrives
    
    NewUser --> Registered: POST /api/register
    Registered --> Paid: POST /api/commerce/charge<br/>(if required)
    Registered --> Approved: Approve USDC/USDT<br/>(if no payment required)
    
    Paid --> Approved: Approve USDC/USDT
    
    Approved --> Claimed: Execute claim
    
    Claimed --> [*]: Complete
    
    note right of Registered
        Has SGE-ID NFT
        tokenId stored
    end note
    
    note right of Paid
        Payment confirmed
        $100 USD received
    end note
    
    note right of Approved
        Allowance set
        Ready to claim
    end note
    
    note right of Claimed
        SGE tokens received
        Journey complete
    end note
```

## Contract State

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#22c55e'}}}%%
classDiagram
    class SGEID {
        +string name "SGE Energy ID"
        +string symbol "SGE-ID"
        +address owner
        +uint256 _tokenIdCounter
        +mapping~uint256=>string~ _tokenURIs
        +mintTo(address to) uint256
        +setBaseURI(string uri)
        +totalSupply() uint256
        +ownerOf(uint256 tokenId) address
    }
    
    class ERC20 {
        <<interface>>
        +balanceOf(address) uint256
        +allowance(address, address) uint256
        +approve(address spender, uint256 amount) bool
        +transfer(address to, uint256 amount) bool
        +transferFrom(address from, address to, uint256 amount) bool
    }
    
    class SGEClaim {
        +address SGE_TOKEN
        +address USDC
        +address USDT
        +address treasury
        +mapping~address=>ClaimInfo~ claims
        +claim(address token, uint256 amount)
    }
    
    SGEID --|> ERC721: implements
    SGEClaim --> ERC20: uses
    SGEClaim --> SGEID: verifies ownership
```

## API Data Flow

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#22c55e'}}}%%
graph LR
    subgraph Input["Input Layer"]
        ReqBody[Request Body]
        QueryParams[Query Params]
        Headers[Headers]
    end
    
    subgraph Validation["Validation Layer"]
        ZodSchema[Zod Schema]
        TypeCheck[Runtime Type Check]
    end
    
    subgraph Storage["Storage Layer"]
        Mints[(mints.json)]
        Claims[(claims.json)]
        Payments[(payments.json)]
    end
    
    subgraph External["External Layer"]
        RPC[Ethereum RPC]
        Commerce[Commerce API]
    end
    
    subgraph Response["Response Layer"]
        JSONResp[JSON Response]
        ErrorResp[Error Response]
    end
    
    ReqBody --> ZodSchema
    QueryParams --> ZodSchema
    Headers --> TypeCheck
    
    ZodSchema -->|Valid| Storage
    ZodSchema -->|Invalid| ErrorResp
    
    Storage <-->|Read/Write| Mints
    Storage <-->|Read/Write| Claims
    Storage <-->|Read/Write| Payments
    
    Storage -->|Query| RPC
    Storage -->|Create Charge| Commerce
    
    Storage --> JSONResp
    RPC --> JSONResp
    Commerce --> JSONResp
    
    classDef input fill:#3b82f6,color:#fff
    classDef validate fill:#f59e0b,color:#000
    classDef storage fill:#22c55e,color:#000
    classDef external fill:#8b5cf6,color:#fff
    classDef response fill:#6366f1,color:#fff
    
    class ReqBody,QueryParams,Headers input
    class ZodSchema,TypeCheck validate
    class Mints,Claims,Payments,Storage storage
    class RPC,Commerce external
    class JSONResp,ErrorResp response
```

## Token Economics

| Token | Type | Decimals | Mainnet Address |
|-------|------|----------|----------------|
| **SGE** | ERC-20 | 18 | `0x40489719E489782959486A04B765E1E93E5B221a` |
| **USDC** | ERC-20 | 6 | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| **USDT** | ERC-20 | 6 | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| **SGE-ID** | ERC-721 | - | Deployed dynamically |

## Storage Patterns

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#22c55e'}}}%%
graph TD
    API[API Server] -->|getByKey| Storage[Storage Service]
    API -->|upsertByKey| Storage
    API -->|getAllValues| Storage
    
    Storage -->|readFile| FS[File System]
    Storage -->|writeFile| FS
    
    FS -->|JSON| Mints[mints.json]
    FS -->|JSON| Claims[claims.json]
    FS -->|JSON| Payments[payments.json]
    
    Storage -->|Atomic Write| Temp[Temp File]
    Temp -->|Rename| FS
    
    classDef api fill:#22c55e,color:#000
    classDef service fill:#3b82f6,color:#fff
    classDef fs fill:#f59e0b,color:#000
    classDef data fill:#8b5cf6,color:#fff
    
    class API api
    class Storage service
    class FS,Temp fs
    class Mints,Claims,Payments data
```
