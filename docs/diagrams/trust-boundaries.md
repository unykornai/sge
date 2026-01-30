# Trust Boundaries & Security Zones

## Trust Boundary Map

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#22c55e'}}}%%
graph TB
    subgraph Internet["🌐 INTERNET (Zero Trust)"]
        direction TB
        Browser[User Browser]
        Attacker[Potential Attacker]
    end
    
    subgraph PublicZone["PUBLIC ZONE<br/>⚠️ Exposed to Internet"]
        direction TB
        StaticApp[Static PWA<br/>GitHub Pages]
        APIEndpoint[API Public Endpoints<br/>/api/*]
    end
    
    subgraph AppZone["APPLICATION ZONE<br/>🔐 Validated Input"]
        direction TB
        Business[Business Logic]
        Validation[Input Validation<br/>Zod Schemas]
        RateLimiter[Rate Limiting]
    end
    
    subgraph SecureZone["SECURE ZONE<br/>🛡️ Secrets & Keys"]
        direction TB
        RelayerKey["Relayer Private Key<br/>(process.env)"]
        AdminKey["Admin API Key<br/>(process.env)"]
        WebhookSecret["Webhook Secret<br/>(process.env)"]
    end
    
    subgraph DataZone["DATA ZONE<br/>💾 Persistent State"]
        direction TB
        MintRecords[mints.json]
        ClaimRecords[claims.json]
        PaymentRecords[payments.json]
    end
    
    subgraph ExternalZone["EXTERNAL ZONE<br/>🌍 Third-Party Services"]
        direction TB
        EthRPC[Ethereum RPC<br/>TLS Required]
        Commerce[Coinbase Commerce<br/>HMAC Verified]
    end
    
    Browser -->|HTTPS Only| StaticApp
    Browser -->|HTTPS Only| APIEndpoint
    Attacker -.->|Blocked| APIEndpoint
    
    APIEndpoint -->|Zod Validate| Validation
    Validation -->|Sanitized| Business
    APIEndpoint -->|Check| RateLimiter
    
    Business -->|Read Only| RelayerKey
    Business -->|Read Only| AdminKey
    Business -->|Verify| WebhookSecret
    
    Business -->|Read/Write| MintRecords
    Business -->|Read/Write| ClaimRecords
    Business -->|Read/Write| PaymentRecords
    
    Business -->|TLS + API Key| EthRPC
    Business -->|HMAC Sig| Commerce
    
    classDef untrusted fill:#ef4444,color:#fff,stroke:#dc2626
    classDef public fill:#f59e0b,color:#000,stroke:#d97706
    classDef app fill:#3b82f6,color:#fff,stroke:#2563eb
    classDef secure fill:#22c55e,color:#000,stroke:#16a34a
    classDef data fill:#8b5cf6,color:#fff,stroke:#7c3aed
    classDef external fill:#6366f1,color:#fff,stroke:#4f46e5
    
    class Browser,Attacker untrusted
    class StaticApp,APIEndpoint public
    class Business,Validation,RateLimiter app
    class RelayerKey,AdminKey,WebhookSecret secure
    class MintRecords,ClaimRecords,PaymentRecords data
    class EthRPC,Commerce external
```

## Data Flow Security

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#22c55e'}}}%%
flowchart LR
    subgraph Untrusted["Untrusted Input"]
        UserInput[User Input]
        QueryParams[Query Params]
        Body[Request Body]
    end
    
    subgraph Validation["Validation Layer"]
        Zod[Zod Schema]
        Sanitize[Sanitize]
        TypeCheck[Type Check]
    end
    
    subgraph Processing["Processing Layer"]
        Logic[Business Logic]
        Transform[Transform]
    end
    
    subgraph Output["Output"]
        Response[JSON Response]
        Logs[Structured Logs]
    end
    
    UserInput --> Zod
    QueryParams --> Zod
    Body --> Zod
    
    Zod -->|✅ Valid| Sanitize
    Zod -->|❌ Invalid| Reject[400 Bad Request]
    
    Sanitize --> TypeCheck
    TypeCheck --> Logic
    Logic --> Transform
    Transform --> Response
    Logic --> Logs
    
    classDef bad fill:#ef4444,color:#fff
    classDef validate fill:#f59e0b,color:#000
    classDef process fill:#22c55e,color:#000
    classDef out fill:#3b82f6,color:#fff
    
    class UserInput,QueryParams,Body,Reject bad
    class Zod,Sanitize,TypeCheck validate
    class Logic,Transform process
    class Response,Logs out
```

## Authentication & Authorization

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#22c55e'}}}%%
graph TD
    Request[Incoming Request] --> Public{Public Endpoint?}
    
    Public -->|Yes| RateLimit[Check Rate Limit]
    Public -->|No| AdminCheck{Has X-Admin-Key?}
    
    AdminCheck -->|No| Deny401[❌ 401 Unauthorized]
    AdminCheck -->|Yes| ValidateKey[Validate Admin Key]
    
    ValidateKey -->|Invalid| Deny401
    ValidateKey -->|Valid| AdminAccess[✅ Admin Access Granted]
    
    RateLimit -->|Exceeded| Deny429[❌ 429 Too Many Requests]
    RateLimit -->|OK| ValidateInput[Validate Input]
    
    ValidateInput -->|Invalid| Deny400[❌ 400 Bad Request]
    ValidateInput -->|Valid| ProcessPublic[✅ Process Request]
    
    AdminAccess --> ProcessAdmin[✅ Process Admin Request]
    
    classDef deny fill:#ef4444,color:#fff
    classDef allow fill:#22c55e,color:#000
    classDef check fill:#3b82f6,color:#fff
    
    class Deny401,Deny429,Deny400 deny
    class AdminAccess,ProcessPublic,ProcessAdmin allow
    class Public,AdminCheck,RateLimit,ValidateKey,ValidateInput check
```

## Secrets Management

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#22c55e'}}}%%
graph TB
    subgraph Development["💻 Development"]
        DevEnv[.env file<br/>Not committed]
        DevSecret[Test Keys Only]
    end
    
    subgraph Production["🚀 Production"]
        EnvVars[Environment Variables<br/>PM2 ecosystem.config.js]
        GHSecrets[GitHub Secrets<br/>For CI/CD]
    end
    
    subgraph Runtime["⚙️ Runtime"]
        Process[Node.js Process]
        Memory[process.env<br/>Read-only]
    end
    
    subgraph Security["🛡️ Security Controls"]
        NoCommit[❌ Never commit .env]
        Rotate[🔄 Rotate keys quarterly]
        Monitor[👁️ Monitor for leaks]
        Backup[💾 Backup in secure vault]
    end
    
    DevEnv --> Process
    EnvVars --> Process
    GHSecrets --> EnvVars
    Process --> Memory
    
    NoCommit -.->|Enforce| DevEnv
    Rotate -.->|Apply| EnvVars
    Monitor -.->|Watch| GHSecrets
    Backup -.->|Store| EnvVars
    
    classDef dev fill:#3b82f6,color:#fff
    classDef prod fill:#f59e0b,color:#000
    classDef runtime fill:#22c55e,color:#000
    classDef security fill:#ef4444,color:#fff
    
    class DevEnv,DevSecret dev
    class EnvVars,GHSecrets prod
    class Process,Memory runtime
    class NoCommit,Rotate,Monitor,Backup security
```

## Threat Model Summary

| Threat | Mitigation | Status |
|--------|-----------|--------|
| **Private key leak** | Never commit, env vars only, rotate quarterly | ✅ Implemented |
| **Admin key brute force** | Long random key, rate limiting, monitoring | ✅ Implemented |
| **Webhook replay** | HMAC signature verification (timing-safe) | ✅ Implemented |
| **SQL injection** | No SQL (JSON storage), Zod validation | ✅ N/A |
| **XSS** | React auto-escapes, no dangerouslySetInnerHTML | ✅ Implemented |
| **CSRF** | Public endpoints, no cookies, explicit origin | ✅ Implemented |
| **Rate limiting bypass** | IP-based, exponential backoff | ⚠️ Basic only |
| **Relayer wallet drain** | Low balance alerts, monitoring | ✅ Implemented |
| **USDT allowance exploit** | Reset to 0 before increase | ✅ Implemented |
| **Frontend manipulation** | All critical ops signed by user | ✅ Implemented |

## Security Checklist

- [ ] All secrets in environment variables (never committed)
- [ ] HTTPS enforced for all endpoints
- [ ] Input validation with Zod schemas
- [ ] Rate limiting on public endpoints
- [ ] Admin endpoints require X-Admin-Key header
- [ ] Webhook signatures verified with timing-safe comparison
- [ ] Relayer wallet balance monitoring
- [ ] Structured logging (no PII in logs)
- [ ] Error messages don't leak system details
- [ ] Dependencies scanned regularly (Dependabot)
