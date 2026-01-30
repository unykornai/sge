#!/bin/bash
# ============================================================================
#  SUPERGREEN ENERGY - SETUP SCRIPT
#  Revolutionary 99% Efficiency Renewable Energy Platform
# ============================================================================

set -e

echo ""
echo "=============================================================="
echo "     SUPERGREEN ENERGY - SETUP SCRIPT"
echo "     Revolutionary Self-Charging Renewable Energy Platform"
echo "=============================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js 18+ required. Current: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Install dependencies
echo ""
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Build shared package
echo ""
echo -e "${BLUE}Building shared package...${NC}"
npm run build --workspace=@sge/shared

# Create .env files if they don't exist
if [ ! -f packages/api/.env ]; then
    echo ""
    echo -e "${YELLOW}Creating API .env file...${NC}"
    cat > packages/api/.env << 'EOF'
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
EOF
    echo -e "${GREEN}✓ Created packages/api/.env${NC}"
fi

if [ ! -f packages/app/.env ]; then
    echo ""
    echo -e "${YELLOW}Creating App .env file...${NC}"
    cat > packages/app/.env << 'EOF'
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
EOF
    echo -e "${GREEN}✓ Created packages/app/.env${NC}"
fi

# Create data directory
mkdir -p packages/api/data
mkdir -p logs

echo ""
echo -e "${GREEN}=============================================================="
echo "  SETUP COMPLETE!"
echo "==============================================================${NC}"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Configure your environment:"
echo "   - Edit packages/api/.env with your RPC URL and wallet key"
echo "   - Optionally edit packages/app/.env"
echo ""
echo "2. Deploy the SGEID contract (requires funded wallet):"
echo "   cd packages/contracts"
echo "   npx hardhat run scripts/deploy-sgeid.ts --network mainnet"
echo ""
echo "3. Update SGEID_ADDRESS in packages/api/.env"
echo ""
echo "4. Start development servers:"
echo "   npm run dev"
echo ""
echo "5. For production:"
echo "   - Docker: docker-compose up -d"
echo "   - PM2: npm run build && pm2 start ecosystem.config.js"
echo ""
echo -e "${BLUE}SuperGreen Energy - Powering the Future! ⚡🌱${NC}"
echo ""
