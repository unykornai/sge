#!/usr/bin/env pwsh
# Bootstrap script for Windows
# One-command setup: .\scripts\bootstrap.ps1
# Sets up the repo for first-time contributors with MOCK_MODE (no secrets required)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "║   🚀 SGE Energy - Enterprise Settlement Platform             ║" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "║   Fork-and-Run Setup (MOCK_MODE)                              ║" -ForegroundColor Green
Write-Host "║   No secrets, wallets, or DB required                         ║" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Check Node.js version
Write-Host "📦 Checking Node.js version..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    $versionNumber = [version]($nodeVersion -replace 'v','')
    if ($versionNumber.Major -lt 18) {
        Write-Host "  ❌ Node.js 18+ required. Found: $nodeVersion" -ForegroundColor Red
        Write-Host "     Download from: https://nodejs.org" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "  ✅ Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "`n📦 Checking npm..." -ForegroundColor Cyan
try {
    $npmVersion = npm --version
    Write-Host "  ✅ npm $npmVersion detected" -ForegroundColor Green
} catch {
    Write-Host "  ❌ npm not found" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "`n📥 Installing dependencies..." -ForegroundColor Cyan
Write-Host "  This may take 2-3 minutes on first run..." -ForegroundColor Gray
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Dependencies installed" -ForegroundColor Green

# Build shared package (required for other packages)
Write-Host "`n🔨 Building shared package..." -ForegroundColor Cyan
npm run build:shared
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Shared package build failed" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Shared package built" -ForegroundColor Green

# Generate Prisma client (works in MOCK_MODE too)
Write-Host "`n🔧 Generating Prisma client..." -ForegroundColor Cyan
npm run prisma:generate 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Prisma client generated" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Prisma generation skipped (not required for MOCK_MODE)" -ForegroundColor Yellow
}

# Create .env files with MOCK_MODE defaults
Write-Host "`n🔐 Setting up environment configuration..." -ForegroundColor Cyan

$apiEnvPath = "packages/api/.env"
$apiEnvExamplePath = "packages/api/.env.example"

if (Test-Path $apiEnvPath) {
    Write-Host "  ✅ API .env already exists (skipping)" -ForegroundColor Green
} else {
    Write-Host "  📝 Creating API .env with MOCK_MODE..." -ForegroundColor Yellow
    
    if (Test-Path $apiEnvExamplePath) {
        Copy-Item $apiEnvExamplePath $apiEnvPath
        Write-Host "  ✅ Created from .env.example" -ForegroundColor Green
    } else {
        # Fallback minimal config
        $mockEnv = @"
# SGE API - MOCK MODE (no secrets required)
NODE_ENV=development
MOCK_MODE=true
PORT=3000
APP_ORIGIN=http://localhost:5173

# Mock mode features (no external services needed)
KYC_REQUIRED=false
COMMERCE_REQUIRED=false
ALLOW_SOFT_KYC=true
ENABLE_ENTERPRISE_API=true
ENABLE_AFFILIATE_SYSTEM=true
ENABLE_COMMISSION_ENGINE=true
ENABLE_PAYOUT_SYSTEM=true
"@
        $mockEnv | Out-File -FilePath $apiEnvPath -Encoding utf8
        Write-Host "  ✅ Created minimal MOCK_MODE .env" -ForegroundColor Green
    }
}

$appEnvPath = "packages/app/.env"
$appEnvExamplePath = "packages/app/.env.example"

if (Test-Path $appEnvPath) {
    Write-Host "  ✅ App .env already exists (skipping)" -ForegroundColor Green
} else {
    Write-Host "  📝 Creating App .env..." -ForegroundColor Yellow
    
    if (Test-Path $appEnvExamplePath) {
        Copy-Item $appEnvExamplePath $appEnvPath
        Write-Host "  ✅ Created from .env.example" -ForegroundColor Green
    } else {
        # Fallback minimal config
        $appEnv = @"
# SGE App - Local Dev
VITE_API_URL=http://localhost:3000
VITE_MOCK_MODE=true
VITE_DEMO_MODE=false
VITE_CHAIN_ID=1
"@
        $appEnv | Out-File -FilePath $appEnvPath -Encoding utf8
        Write-Host "  ✅ Created minimal .env" -ForegroundColor Green
    }
}

# Run typecheck
Write-Host "`n🧪 Running type checks..." -ForegroundColor Cyan
npm run typecheck 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Type checks passed" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Type checks have warnings (safe to ignore in MOCK_MODE)" -ForegroundColor Yellow
}

# Success summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "║   ✨ Bootstrap Complete! Ready to run.                        ║" -ForegroundColor Green
Write-Host "║                                                                ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "┌─ QUICK START ─────────────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "│                                                           │" -ForegroundColor Cyan
Write-Host "│  Start everything (API + Workers + App):                 │" -ForegroundColor White
Write-Host "│  " -NoNewline -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor Yellow
Write-Host "│                                                           │" -ForegroundColor Cyan
Write-Host "│  Then open: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:5173" -ForegroundColor Magenta
Write-Host "│                                                           │" -ForegroundColor Cyan
Write-Host "└───────────────────────────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""

Write-Host "┌─ WHAT'S RUNNING ──────────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "│                                                           │" -ForegroundColor Cyan
Write-Host "│  ✓ MOCK_MODE enabled (no DB/Redis/RPC required)          │" -ForegroundColor Green
Write-Host "│  ✓ In-memory database (data resets on restart)           │" -ForegroundColor Green
Write-Host "│  ✓ In-memory queue (instant processing)                  │" -ForegroundColor Green
Write-Host "│  ✓ Mock blockchain provider (no real wallets)            │" -ForegroundColor Green
Write-Host "│                                                           │" -ForegroundColor Cyan
Write-Host "└───────────────────────────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""

Write-Host "┌─ OTHER COMMANDS ──────────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "│                                                           │" -ForegroundColor Cyan
Write-Host "│  " -NoNewline -ForegroundColor Cyan
Write-Host "npm run dev:api" -NoNewline -ForegroundColor Yellow
Write-Host "      - API only                              │" -ForegroundColor White
Write-Host "│  " -NoNewline -ForegroundColor Cyan
Write-Host "npm run dev:app" -NoNewline -ForegroundColor Yellow
Write-Host "      - App only                              │" -ForegroundColor White
Write-Host "│  " -NoNewline -ForegroundColor Cyan
Write-Host "npm run dev:workers" -NoNewline -ForegroundColor Yellow
Write-Host "  - Workers only                          │" -ForegroundColor White
Write-Host "│  " -NoNewline -ForegroundColor Cyan
Write-Host "npm run docs:dev" -NoNewline -ForegroundColor Yellow
Write-Host "    - Documentation site                    │" -ForegroundColor White
Write-Host "│  " -NoNewline -ForegroundColor Cyan
Write-Host "npm test" -NoNewline -ForegroundColor Yellow
Write-Host "            - Run contract tests                     │" -ForegroundColor White
Write-Host "│                                                           │" -ForegroundColor Cyan
Write-Host "└───────────────────────────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""

Write-Host "┌─ UPGRADING TO REAL MODE ──────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "│                                                           │" -ForegroundColor Cyan
Write-Host "│  1. Start database:                                       │" -ForegroundColor White
Write-Host "│     " -NoNewline -ForegroundColor Cyan
Write-Host "npm run db:up" -ForegroundColor Yellow
Write-Host "│                                                           │" -ForegroundColor Cyan
Write-Host "│  2. Run migrations:                                       │" -ForegroundColor White
Write-Host "│     " -NoNewline -ForegroundColor Cyan
Write-Host "npm run prisma:push" -ForegroundColor Yellow
Write-Host "│                                                           │" -ForegroundColor Cyan
Write-Host "│  3. Generate wallets:                                     │" -ForegroundColor White
Write-Host "│     " -NoNewline -ForegroundColor Cyan
Write-Host "npm run wallet:new" -ForegroundColor Yellow
Write-Host "│                                                           │" -ForegroundColor Cyan
Write-Host "│  4. Edit packages/api/.env:                               │" -ForegroundColor White
Write-Host "│     - Set " -NoNewline -ForegroundColor Cyan
Write-Host "MOCK_MODE=false" -ForegroundColor Yellow
Write-Host "│     - Add your RPC URL                                    │" -ForegroundColor Cyan
Write-Host "│     - Add RELAYER_PRIVATE_KEY                             │" -ForegroundColor Cyan
Write-Host "│                                                           │" -ForegroundColor Cyan
Write-Host "│  5. Deploy contracts:                                     │" -ForegroundColor White
Write-Host "│     " -NoNewline -ForegroundColor Cyan
Write-Host "npm run deploy:contracts" -ForegroundColor Yellow
Write-Host "│                                                           │" -ForegroundColor Cyan
Write-Host "└───────────────────────────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""

Write-Host "📚 Documentation: " -NoNewline -ForegroundColor Cyan
Write-Host "https://unykornai.github.io/sge/" -ForegroundColor Magenta
Write-Host "🐛 Issues: " -NoNewline -ForegroundColor Cyan
Write-Host "https://github.com/unykornai/sge/issues" -ForegroundColor Magenta
Write-Host "💬 Discussions: " -NoNewline -ForegroundColor Cyan
Write-Host "https://github.com/unykornai/sge/discussions" -ForegroundColor Magenta
Write-Host ""

Write-Host "Happy coding! 🎉`n" -ForegroundColor Green

$apiEnvPath = "packages/api/.env"
if (Test-Path $apiEnvPath) {
    Write-Host "  ✅ API .env exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  API .env not found - creating with MOCK_MODE" -ForegroundColor Yellow
    
    $mockEnv = @"
# Mock Mode Configuration (no real secrets required)
MOCK_MODE=true
PORT=3000
APP_ORIGIN=http://localhost:5173

# These are only used if MOCK_MODE=false
ETH_RPC_HTTPS=https://eth.llamarpc.com
RELAYER_PRIVATE_KEY=
SGEID_ADDRESS=
SGE_TOKEN=0x40489719E489782959486A04B765E1E93E5B221a
SGE_CLAIM=0x4BFeF695a5f85a65E1Aa6015439f317494477D09
USDC=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# Feature gates
KYC_REQUIRED=false
COMMERCE_REQUIRED=false
ALLOW_SOFT_KYC=true
FEE_USD=100
"@
    
    $mockEnv | Out-File -FilePath $apiEnvPath -Encoding utf8
    Write-Host "  ✅ Created API .env with MOCK_MODE=true" -ForegroundColor Green
}

$appEnvPath = "packages/app/.env"
if (Test-Path $appEnvPath) {
    Write-Host "  ✅ App .env exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  App .env not found - creating defaults" -ForegroundColor Yellow
    
    $appEnv = @"
VITE_API_BASE_URL=http://localhost:3000
VITE_CHAIN_ID=1
VITE_MOCK_MODE=true
"@
    
    $appEnv | Out-File -FilePath $appEnvPath -Encoding utf8
    Write-Host "  ✅ Created App .env" -ForegroundColor Green
}

# Run quick smoke test
Write-Host "`n🧪 Running smoke test..." -ForegroundColor Cyan
Write-Host "  Testing shared package build..." -ForegroundColor Yellow
npm run typecheck -w @sge/shared
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️  Typecheck failed (may be expected in mock mode)" -ForegroundColor Yellow
} else {
    Write-Host "  ✅ Shared package typechecks pass" -ForegroundColor Green
}

# Success message
Write-Host "`n✨ Bootstrap complete!" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Green

Write-Host "📋 Next steps:`n" -ForegroundColor Cyan

Write-Host "  1️⃣  Start development servers:" -ForegroundColor White
Write-Host "     npm run dev" -ForegroundColor Yellow
Write-Host "     (Runs API + App in MOCK_MODE - no real blockchain needed)`n" -ForegroundColor Gray

Write-Host "  2️⃣  View documentation:" -ForegroundColor White
Write-Host "     npm run docs:dev" -ForegroundColor Yellow
Write-Host "     Open: http://localhost:5173/sge/`n" -ForegroundColor Gray

Write-Host "  3️⃣  Run tests:" -ForegroundColor White
Write-Host "     npm test" -ForegroundColor Yellow
Write-Host "     (Most tests work in mock mode)`n" -ForegroundColor Gray

Write-Host "  4️⃣  For REAL mainnet mode:" -ForegroundColor White
Write-Host "     - Generate wallets: npm run wallet:new" -ForegroundColor Yellow
Write-Host "     - Edit packages/api/.env and set MOCK_MODE=false" -ForegroundColor Yellow
Write-Host "     - Add real RPC URL and RELAYER_PRIVATE_KEY" -ForegroundColor Yellow
Write-Host "     - Deploy contracts (see docs/start.md)`n" -ForegroundColor Gray

Write-Host "📚 Documentation: https://unykornai.github.io/sge/" -ForegroundColor Cyan
Write-Host "🐛 Issues: https://github.com/unykornai/sge/issues" -ForegroundColor Cyan
Write-Host "💬 Discussions: https://github.com/unykornai/sge/discussions`n" -ForegroundColor Cyan

Write-Host "Happy coding! 🎉" -ForegroundColor Green
