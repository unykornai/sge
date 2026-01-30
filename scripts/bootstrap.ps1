#!/usr/bin/env pwsh
# Bootstrap script for Windows
# Sets up the repo for first-time contributors

$ErrorActionPreference = "Stop"

Write-Host "🚀 SGE Energy - Bootstrap Setup" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Green

# Check Node.js version
Write-Host "📦 Checking Node.js version..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "  ✅ Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
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
Write-Host "  This may take a few minutes..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Dependencies installed" -ForegroundColor Green

# Build shared package
Write-Host "`n🔨 Building shared package..." -ForegroundColor Cyan
npm run build -w @sge/shared
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Shared package built" -ForegroundColor Green

# Check for .env files
Write-Host "`n🔐 Checking environment configuration..." -ForegroundColor Cyan

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
