# ============================================================================
#  SUPERGREEN ENERGY - SETUP SCRIPT (Windows PowerShell)
#  Revolutionary 99% Efficiency Renewable Energy Platform
# ============================================================================

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "     SUPERGREEN ENERGY - SETUP SCRIPT" -ForegroundColor Cyan
Write-Host "     Revolutionary Self-Charging Renewable Energy Platform" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node -v
    $major = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($major -lt 18) {
        Write-Host "Node.js 18+ required. Current: $nodeVersion" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Blue
npm install

# Build shared package
Write-Host ""
Write-Host "Building shared package..." -ForegroundColor Blue
npm run build --workspace=@sge/shared

# Create .env files if they don't exist
if (-not (Test-Path "packages/api/.env")) {
    Write-Host ""
    Write-Host "Creating API .env file..." -ForegroundColor Yellow
    @"
# Server configuration
PORT=3000
APP_ORIGIN=http://localhost:5173

# Ethereum mainnet RPC (REQUIRED)
# Get a free API key from https://www.alchemy.com or https://infura.io
ETH_RPC_HTTPS=https://eth.llamarpc.com

# Relayer wallet (REQUIRED - must own SGEID contract)
# Generate with: node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
RELAYER_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000

# Contract addresses (REQUIRED after deployment)
SGEID_ADDRESS=0x0000000000000000000000000000000000000000

# Mainnet token addresses (verified)
SGE_TOKEN=0x40489719E489782959486A04B765E1E93E5B221a
SGE_CLAIM=0x4BFeF695a5f85a65E1Aa6015439f317494477D09
USDC=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# Fee configuration
FEE_USD=100

# Feature gates
KYC_REQUIRED=false
COMMERCE_REQUIRED=false
ALLOW_SOFT_KYC=true

# Admin API key (for /api/admin/* endpoints)
ADMIN_API_KEY=

# Coinbase Commerce (optional)
COINBASE_COMMERCE_API_KEY=
COINBASE_COMMERCE_WEBHOOK_SHARED_SECRET=whsec_
"@ | Out-File -FilePath "packages/api/.env" -Encoding utf8
    Write-Host "✓ Created packages/api/.env" -ForegroundColor Green
}

if (-not (Test-Path "packages/app/.env")) {
    Write-Host ""
    Write-Host "Creating App .env file..." -ForegroundColor Yellow
    @"
# App configuration
VITE_APP_ORIGIN=http://localhost:5173

# Ethereum RPC (optional - defaults to public RPC)
VITE_ETH_RPC_HTTPS=

# WalletConnect Project ID (optional)
VITE_WALLETCONNECT_PROJECT_ID=

# Contract addresses (use mainnet defaults if not set)
VITE_SGE_TOKEN=0x40489719E489782959486A04B765E1E93E5B221a
VITE_SGE_CLAIM=0x4BFeF695a5f85a65E1Aa6015439f317494477D09
VITE_USDC=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
VITE_USDT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# Fee
VITE_FEE_USD=100
"@ | Out-File -FilePath "packages/app/.env" -Encoding utf8
    Write-Host "✓ Created packages/app/.env" -ForegroundColor Green
}

# Create directories
New-Item -ItemType Directory -Force -Path "packages/api/data" | Out-Null
New-Item -ItemType Directory -Force -Path "logs" | Out-Null

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:"
Write-Host ""
Write-Host "1. Configure your environment:"
Write-Host "   - Edit packages/api/.env with your RPC URL and wallet key"
Write-Host "   - Optionally edit packages/app/.env"
Write-Host ""
Write-Host "2. Deploy the SGEID contract (requires funded wallet):"
Write-Host "   cd packages/contracts"
Write-Host "   npx hardhat run scripts/deploy-sgeid.ts --network mainnet"
Write-Host ""
Write-Host "3. Update SGEID_ADDRESS in packages/api/.env"
Write-Host ""
Write-Host "4. Start development servers:"
Write-Host "   npm run dev"
Write-Host ""
Write-Host "5. For production:"
Write-Host "   - Docker: docker-compose up -d"
Write-Host "   - PM2: npm run build; pm2 start ecosystem.config.js"
Write-Host ""
Write-Host "SuperGreen Energy - Powering the Future! ⚡🌱" -ForegroundColor Blue
Write-Host ""
