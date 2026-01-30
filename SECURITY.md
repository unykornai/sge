# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within SGE, please send an email to **security@supergreenenergy.com**.

All security vulnerabilities will be promptly addressed.

### What to include

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the issue
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue

### Response Timeline

- **24 hours**: Initial acknowledgment
- **72 hours**: Preliminary assessment
- **7 days**: Detailed response with planned fix timeline

### Scope

The following are in scope:
- Smart contracts in `packages/contracts/`
- API server in `packages/api/`
- Frontend application in `packages/app/`
- Webhook signature verification
- Private key handling

### Out of Scope

- Third-party dependencies (report to upstream)
- Issues in development/test environments only
- Social engineering attacks

## Security Best Practices

### For Operators

1. **Never commit `.env` files** - Use `.env.example` as reference
2. **Rotate relayer private keys** periodically
3. **Monitor relayer ETH balance** - Low balance = failed mints
4. **Use premium RPC endpoints** - Public RPCs have rate limits
5. **Enable COMMERCE_REQUIRED** in production for payment gating

### For Contributors

1. Use `crypto.timingSafeEqual()` for signature comparisons
2. Validate all inputs with Zod schemas
3. Never log private keys or sensitive data
4. Use checksummed addresses throughout
