#!/usr/bin/env bash
# Bootstrap script for macOS/Linux
# Sets up the repo for first-time contributors

set -e

echo "🚀 SGE Energy - Bootstrap Setup"
echo "================================"
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  ✅ Node.js $NODE_VERSION detected"
else
    echo "  ❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check npm
echo ""
echo "📦 Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "  ✅ npm $NPM_VERSION detected"
else
    echo "  ❌ npm not found"
    exit 1
fi

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
echo "  This may take a few minutes..."
npm install
echo "  ✅ Dependencies installed"

# Build shared package
echo ""
echo "🔨 Building shared package..."
npm run build -w @sge/shared
echo "  ✅ Shared package built"

# Check for .env files
echo ""
echo "🔐 Checking environment configuration..."

API_ENV_PATH="packages/api/.env"
if [ -f "$API_ENV_PATH" ]; then
    echo "  ✅ API .env exists"
else
    echo "  ⚠️  API .env not found - creating with MOCK_MODE"
    
    cat > "$API_ENV_PATH" << 'EOF'
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
EOF
    
    echo "  ✅ Created API .env with MOCK_MODE=true"
fi

APP_ENV_PATH="packages/app/.env"
if [ -f "$APP_ENV_PATH" ]; then
    echo "  ✅ App .env exists"
else
    echo "  ⚠️  App .env not found - creating defaults"
    
    cat > "$APP_ENV_PATH" << 'EOF'
VITE_API_BASE_URL=http://localhost:3000
VITE_CHAIN_ID=1
VITE_MOCK_MODE=true
EOF
    
    echo "  ✅ Created App .env"
fi

# Run quick smoke test
echo ""
echo "🧪 Running smoke test..."
echo "  Testing shared package build..."
if npm run typecheck -w @sge/shared; then
    echo "  ✅ Shared package typechecks pass"
else
    echo "  ⚠️  Typecheck failed (may be expected in mock mode)"
fi

# Success message
echo ""
echo "✨ Bootstrap complete!"
echo "================================"
echo ""

echo "📋 Next steps:"
echo ""

echo "  1️⃣  Start development servers:"
echo "     npm run dev"
echo "     (Runs API + App in MOCK_MODE - no real blockchain needed)"
echo ""

echo "  2️⃣  View documentation:"
echo "     npm run docs:dev"
echo "     Open: http://localhost:5173/sge/"
echo ""

echo "  3️⃣  Run tests:"
echo "     npm test"
echo "     (Most tests work in mock mode)"
echo ""

echo "  4️⃣  For REAL mainnet mode:"
echo "     - Generate wallets: npm run wallet:new"
echo "     - Edit packages/api/.env and set MOCK_MODE=false"
echo "     - Add real RPC URL and RELAYER_PRIVATE_KEY"
echo "     - Deploy contracts (see docs/start.md)"
echo ""

echo "📚 Documentation: https://unykornai.github.io/sge/"
echo "🐛 Issues: https://github.com/unykornai/sge/issues"
echo "💬 Discussions: https://github.com/unykornai/sge/discussions"
echo ""

echo "Happy coding! 🎉"
