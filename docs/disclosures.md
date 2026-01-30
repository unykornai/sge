# Disclosures & Compliance

## Important Notices

### General Disclaimer
The SGE Energy platform is provided "as is" without warranty of any kind. Use at your own risk.

## Token Distribution & Rewards

### 36-Month Reward Schedule
::: warning IMPORTANT
SGE token rewards are distributed over a **36-month period**. Claiming eligibility and distribution schedules are defined by smart contract logic and cannot be modified after deployment.
:::

**Key Points:**
- Tokens vest linearly over 36 months from claim date
- Early withdrawal may not be available
- Distribution is subject to smart contract execution
- No guarantees of token value or liquidity
- Eligibility requirements must be met throughout vesting period

### Claim Process
1. **Registration**: Mint SGE-ID NFT (gasless, relayer pays gas)
2. **Payment**: Complete $100 USD payment (if required by configuration)
3. **Approval**: Approve USDC/USDT spending by Claim contract
4. **Claim**: Execute claim transaction to receive tokens
5. **Vesting**: Tokens vest over 36 months according to schedule

## Market Risk Disclosure

### Cryptocurrency Volatility
::: danger HIGH RISK
Cryptocurrencies are highly volatile assets. SGE token value may:
- Fluctuate significantly in short periods
- Lose all or substantially all value
- Be affected by regulatory changes
- Experience low liquidity
- Be subject to market manipulation
:::

**Risk Factors:**
- **Price Volatility**: Token prices can change rapidly
- **Liquidity Risk**: You may not be able to sell when desired
- **Technology Risk**: Smart contracts may contain bugs
- **Regulatory Risk**: Laws may change affecting token use
- **Counterparty Risk**: Third parties (RPC, exchanges) may fail

### Not an Investment
SGE tokens are utility tokens for participation in the SGE ecosystem. They are **NOT**:
- Securities or investment contracts
- Guaranteed to appreciate in value
- Backed by physical assets
- Insured or protected by government agencies
- Suitable for all investors

## KYC & Compliance

### KYC Policy Toggle
The platform supports optional KYC (Know Your Customer) requirements:

```javascript
// Configuration flags
KYC_REQUIRED=false          // Hard KYC required
ALLOW_SOFT_KYC=true         // Soft KYC acceptable
COMMERCE_REQUIRED=false     // Payment required
```

**KYC States:**
- **No KYC**: Anyone can claim (KYC_REQUIRED=false)
- **Soft KYC**: Basic verification (name/email) required
- **Hard KYC**: Full identity verification required

::: info
Current default configuration: **No KYC required**, soft KYC allowed. This may change based on regulatory requirements or project decisions.
:::

### Geographic Restrictions
Access may be restricted in certain jurisdictions due to:
- Local cryptocurrency regulations
- Sanctions and export controls
- Licensing requirements
- Platform policy

**Restricted Jurisdictions:**
- Check local laws before participating
- VPN use to circumvent restrictions is prohibited
- Platform may block IPs from restricted regions

## Payment Processing

### Coinbase Commerce Integration
When payment is required, the platform uses Coinbase Commerce:

**Payment Methods:**
- Credit/Debit Cards
- ACH Bank Transfer (US only)
- Cryptocurrency (Bitcoin, Ethereum, USDC, etc.)

**Important:**
- Payments are non-refundable once confirmed
- Settlement times vary by method (1-3 business days)
- Card processing fees may apply
- Chargebacks are not supported for crypto payments

### Fee Structure
- **Registration Fee**: $0 (gasless mint, relayer pays gas)
- **Claim Fee**: $100 USD (if COMMERCE_REQUIRED=true)
- **Gas Fees**: User pays for approve/claim transactions

::: warning
Ethereum gas fees vary by network congestion. Check current gas prices before transacting.
:::

## Data Privacy

### Information Collection
The platform collects minimal user data:
- **On-chain**: Wallet address, transaction hashes (public)
- **Off-chain**: Optional email (if Commerce used)
- **Logs**: IP addresses, timestamps (temporary, for security)

### Data Usage
- **Registration**: Store mint records (wallet → tokenId)
- **Claims**: Store claim records (wallet → amount)
- **Payments**: Store payment status (wallet → paid/unpaid)
- **Analytics**: Aggregate statistics (no PII)

### Data Retention
- Mint/claim records: **Indefinite** (required for system operation)
- Logs: **30 days** (security and debugging)
- Payment records: **7 years** (financial compliance)
- Analytics: **Anonymized, indefinite**

### Third-Party Services
Data may be shared with:
- **Coinbase Commerce**: Payment processing
- **Ethereum RPC**: Transaction broadcasting
- **GitHub**: Code hosting (open source)

## Security & Responsibility

### User Responsibilities
You are responsible for:
- Securing your private keys and seed phrases
- Verifying transaction details before signing
- Understanding smart contract interactions
- Keeping software/wallet updated
- Monitoring for suspicious activity

::: danger NEVER SHARE
**NEVER** share your private key or seed phrase with anyone, including:
- Support staff (we will never ask)
- Email/social media requests
- Websites (except your own wallet)
:::

### Platform Security
The platform implements:
- Input validation (Zod schemas)
- HTTPS/TLS encryption
- HMAC webhook verification
- Rate limiting on public endpoints
- Admin API key authentication
- Structured logging (no PII)

**However:**
- No system is 100% secure
- Smart contracts may have undiscovered bugs
- Third-party services may be compromised
- User error is the #1 security risk

## Legal

### Jurisdiction
This platform operates globally. Legal disputes may be subject to:
- Terms of service (if applicable)
- Smart contract logic (immutable)
- Local laws and regulations
- International arbitration

### Liability Limitations
TO THE MAXIMUM EXTENT PERMITTED BY LAW:
- No warranty, express or implied
- No liability for losses or damages
- No guarantee of uninterrupted service
- No responsibility for third-party actions
- User assumes all risks

### Regulatory Compliance
The platform aims to comply with:
- Anti-Money Laundering (AML) regulations
- Know Your Customer (KYC) requirements (when enabled)
- Securities laws (tokens are utilities, not securities)
- Tax reporting obligations

**However:**
- Users are responsible for their own tax compliance
- Regulatory landscape is evolving
- Local laws may vary
- Seek professional legal/tax advice

## Age Restrictions
You must be at least **18 years old** (or legal age in your jurisdiction) to use this platform.

## Changes to Terms
These disclosures may be updated at any time. Continued use constitutes acceptance of changes.

## Contact
For questions about these disclosures:
- **Email**: compliance@supergreenenergy.com (example, update as needed)
- **GitHub**: [Open an issue](https://github.com/unykornai/sge/issues)

---

**Last Updated:** January 29, 2026  
**Effective Date:** January 29, 2026  
**Version:** 1.0
