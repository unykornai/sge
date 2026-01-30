# k6 Installation Instructions for Windows

## Option 1: Chocolatey (Recommended)

```powershell
# Install k6 via Chocolatey
choco install k6

# Verify installation
k6 version
```

## Option 2: Manual Download

1. Download from: https://k6.io/docs/get-started/installation/
2. Extract k6.exe to a folder
3. Add folder to PATH or run from that directory

## Option 3: Skip k6 (Use PowerShell Script Instead)

k6 is optional - you can test Phase 2 features without it:

```powershell
# Run manual tests (no k6 required)
.\scripts\test-phase2.ps1
```

This script tests:
- ✅ Idempotency (prevents duplicates)
- ✅ Rate limiting (blocks excessive requests)  
- ✅ Prometheus metrics (observability)

## If You Install k6

Once k6 is installed, run load tests:

```powershell
cd ops\k6
k6 run register.js  # 1000 concurrent users
k6 run claim.js     # 500 concurrent users
```

## Current Status

✅ Phase 2 core implementation complete (idempotency + rate limits + metrics)  
⏱️ k6 load testing is OPTIONAL (validates scalability)  
✅ Manual testing works without k6
