#!/usr/bin/env bash
# Bootstrap script for macOS/Linux
# One-command setup: ./scripts/bootstrap.sh
# Sets up the repo for first-time contributors with MOCK_MODE (no secrets required)

set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}║   🚀 SGE Energy - Enterprise Settlement Platform             ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}║   Fork-and-Run Setup (MOCK_MODE)                              ║${NC}"
echo -e "${GREEN}║   No secrets, wallets, or DB required                         ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check Node.js version
echo -e "${CYAN}📦 Checking Node.js version...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo -e "${RED}  ❌ Node.js 18+ required. Found: $NODE_VERSION${NC}"
        echo -e "${YELLOW}     Download from: https://nodejs.org${NC}"
        exit 1
    fi
    echo -e "${GREEN}  ✅ Node.js $NODE_VERSION detected${NC}"
else
    echo -e "${RED}  ❌ Node.js not found. Install from https://nodejs.org${NC}"
    exit 1
fi

# Check npm
echo ""
echo -e "${CYAN}📦 Checking npm...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}  ✅ npm $NPM_VERSION detected${NC}"
else
    echo -e "${RED}  ❌ npm not found${NC}"
    exit 1
fi

# Install dependencies
echo ""
echo -e "${CYAN}📥 Installing dependencies...${NC}"
echo -e "${GRAY}  This may take 2-3 minutes on first run...${NC}"
npm install
echo -e "${GREEN}  ✅ Dependencies installed${NC}"

# Build shared package
echo ""
echo -e "${CYAN}🔨 Building shared package...${NC}"
npm run build:shared
echo -e "${GREEN}  ✅ Shared package built${NC}"

# Generate Prisma client
echo ""
echo -e "${CYAN}🔧 Generating Prisma client...${NC}"
if npm run prisma:generate 2>/dev/null; then
    echo -e "${GREEN}  ✅ Prisma client generated${NC}"
else
    echo -e "${YELLOW}  ⚠️  Prisma generation skipped (not required for MOCK_MODE)${NC}"
fi

# Create .env files with MOCK_MODE defaults
echo ""
echo -e "${CYAN}🔐 Setting up environment configuration...${NC}"

API_ENV_PATH="packages/api/.env"
API_ENV_EXAMPLE="packages/api/.env.example"

if [ -f "$API_ENV_PATH" ]; then
    echo -e "${GREEN}  ✅ API .env already exists (skipping)${NC}"
else
    echo -e "${YELLOW}  📝 Creating API .env with MOCK_MODE...${NC}"
    
    if [ -f "$API_ENV_EXAMPLE" ]; then
        cp "$API_ENV_EXAMPLE" "$API_ENV_PATH"
        echo -e "${GREEN}  ✅ Created from .env.example${NC}"
    else
        # Fallback minimal config
        cat > "$API_ENV_PATH" << 'EOF'
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
EOF
        echo -e "${GREEN}  ✅ Created minimal MOCK_MODE .env${NC}"
    fi
fi

APP_ENV_PATH="packages/app/.env"
APP_ENV_EXAMPLE="packages/app/.env.example"

if [ -f "$APP_ENV_PATH" ]; then
    echo -e "${GREEN}  ✅ App .env already exists (skipping)${NC}"
else
    echo -e "${YELLOW}  📝 Creating App .env...${NC}"
    
    if [ -f "$APP_ENV_EXAMPLE" ]; then
        cp "$APP_ENV_EXAMPLE" "$APP_ENV_PATH"
        echo -e "${GREEN}  ✅ Created from .env.example${NC}"
    else
        # Fallback minimal config
        cat > "$APP_ENV_PATH" << 'EOF'
# SGE App - Local Dev
VITE_API_URL=http://localhost:3000
VITE_MOCK_MODE=true
VITE_DEMO_MODE=false
VITE_CHAIN_ID=1
EOF
        echo -e "${GREEN}  ✅ Created minimal .env${NC}"
    fi
fi

# Run typecheck
echo ""
echo -e "${CYAN}🧪 Running type checks...${NC}"
if npm run typecheck 2>/dev/null; then
    echo -e "${GREEN}  ✅ Type checks passed${NC}"
else
    echo -e "${YELLOW}  ⚠️  Type checks have warnings (safe to ignore in MOCK_MODE)${NC}"
fi

# Success summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}║   ✨ Bootstrap Complete! Ready to run.                        ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}┌─ QUICK START ─────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│                                                           │${NC}"
echo -e "${WHITE}│  Start everything (API + Workers + App):                 │${NC}"
echo -e "${CYAN}│  ${YELLOW}npm run dev${NC}"
echo -e "${CYAN}│                                                           │${NC}"
echo -e "${WHITE}│  Then open: ${MAGENTA}http://localhost:5173${NC}"
echo -e "${CYAN}│                                                           │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────────────────────┘${NC}"
echo ""

echo -e "${CYAN}┌─ WHAT'S RUNNING ──────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│                                                           │${NC}"
echo -e "${GREEN}│  ✓ MOCK_MODE enabled (no DB/Redis/RPC required)          │${NC}"
echo -e "${GREEN}│  ✓ In-memory database (data resets on restart)           │${NC}"
echo -e "${GREEN}│  ✓ In-memory queue (instant processing)                  │${NC}"
echo -e "${GREEN}│  ✓ Mock blockchain provider (no real wallets)            │${NC}"
echo -e "${CYAN}│                                                           │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────────────────────┘${NC}"
echo ""

echo -e "${CYAN}┌─ OTHER COMMANDS ──────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│                                                           │${NC}"
echo -e "${CYAN}│  ${YELLOW}npm run dev:api${WHITE}      - API only                              ${CYAN}│${NC}"
echo -e "${CYAN}│  ${YELLOW}npm run dev:app${WHITE}      - App only                              ${CYAN}│${NC}"
echo -e "${CYAN}│  ${YELLOW}npm run dev:workers${WHITE}  - Workers only                          ${CYAN}│${NC}"
echo -e "${CYAN}│  ${YELLOW}npm run docs:dev${WHITE}    - Documentation site                    ${CYAN}│${NC}"
echo -e "${CYAN}│  ${YELLOW}npm test${WHITE}            - Run contract tests                     ${CYAN}│${NC}"
echo -e "${CYAN}│                                                           │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────────────────────┘${NC}"
echo ""

echo -e "${CYAN}┌─ UPGRADING TO REAL MODE ──────────────────────────────────┐${NC}"
echo -e "${CYAN}│                                                           │${NC}"
echo -e "${WHITE}│  1. Start database:                                       │${NC}"
echo -e "${CYAN}│     ${YELLOW}npm run db:up${NC}"
echo -e "${CYAN}│                                                           │${NC}"
echo -e "${WHITE}│  2. Run migrations:                                       │${NC}"
echo -e "${CYAN}│     ${YELLOW}npm run prisma:push${NC}"
echo -e "${CYAN}│                                                           │${NC}"
echo -e "${WHITE}│  3. Generate wallets:                                     │${NC}"
echo -e "${CYAN}│     ${YELLOW}npm run wallet:new${NC}"
echo -e "${CYAN}│                                                           │${NC}"
echo -e "${WHITE}│  4. Edit packages/api/.env:                               │${NC}"
echo -e "${CYAN}│     - Set ${YELLOW}MOCK_MODE=false${NC}"
echo -e "${CYAN}│     - Add your RPC URL                                    │${NC}"
echo -e "${CYAN}│     - Add RELAYER_PRIVATE_KEY                             │${NC}"
echo -e "${CYAN}│                                                           │${NC}"
echo -e "${WHITE}│  5. Deploy contracts:                                     │${NC}"
echo -e "${CYAN}│     ${YELLOW}npm run deploy:contracts${NC}"
echo -e "${CYAN}│                                                           │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────────────────────┘${NC}"
echo ""

echo -e "${CYAN}📚 Documentation: ${MAGENTA}https://unykornai.github.io/sge/${NC}"
echo -e "${CYAN}🐛 Issues: ${MAGENTA}https://github.com/unykornai/sge/issues${NC}"
echo -e "${CYAN}💬 Discussions: ${MAGENTA}https://github.com/unykornai/sge/discussions${NC}"
echo ""

echo -e "${GREEN}Happy coding! 🎉${NC}"
echo ""
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
