# Testing

## Contract tests

CI-safe wrapper (Windows Hardhat/libuv false-fail guard):

```bash
npm test
```

Raw Hardhat behavior:

```bash
npm run test:contracts:raw
```

## CI aggregator

```bash
npm run test:ci
```

This runs:
- `@sge/contracts` tests
- `@sge/api` TypeScript typecheck
- `@sge/app` TypeScript typecheck
