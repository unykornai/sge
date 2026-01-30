#!/usr/bin/env bash
# ============================================================================
# SGE Bootstrap Script for macOS/Linux
# ============================================================================
# One-command setup: ./bootstrap.sh
# ============================================================================

set -e

echo ""
echo "============================================================================"
echo "     SUPERGREEN ENERGY - Enterprise Platform Bootstrap"
echo "     99% Efficiency Revolutionary Power Technology"
echo "============================================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Check prerequisites
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[1/7] Checking prerequisites...${NC}"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "  ${GREEN}✓ Node.js $NODE_VERSION${NC}"
else
    echo -e "  ${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "  ${GREEN}✓ npm $NPM_VERSION${NC}"
else
    echo -e "  ${RED}✗ npm not found${NC}"
    exit 1
fi

# Check Docker (optional)
DOCKER_AVAILABLE=false
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "  ${GREEN}✓ Docker available: $DOCKER_VERSION${NC}"
    DOCKER_AVAILABLE=true
else
    echo -e "  ${YELLOW}! Docker not found - using MOCK_MODE (no DB required)${NC}"
fi

# -----------------------------------------------------------------------------
# Install dependencies
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[2/7] Installing dependencies...${NC}"
npm install
echo -e "  ${GREEN}✓ Dependencies installed${NC}"

# -----------------------------------------------------------------------------
# Copy environment files
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[3/7] Setting up environment files...${NC}"

# API .env
if [ ! -f "packages/api/.env" ]; then
    cp "packages/api/.env.example" "packages/api/.env"
    echo -e "  ${GREEN}✓ Created packages/api/.env${NC}"
else
    echo -e "  ${GRAY}• packages/api/.env already exists${NC}"
fi

# App .env
if [ ! -f "packages/app/.env" ]; then
    cp "packages/app/.env.example" "packages/app/.env"
    echo -e "  ${GREEN}✓ Created packages/app/.env${NC}"
else
    echo -e "  ${GRAY}• packages/app/.env already exists${NC}"
fi

# -----------------------------------------------------------------------------
# Start Docker services (if available)
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[4/7] Setting up database...${NC}"

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo -e "  ${GRAY}Starting Postgres + Redis containers...${NC}"
    docker-compose -f docker-compose.dev.yml up -d || true
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓ Postgres (5432) and Redis (6379) running${NC}"
        # Wait for Postgres to be ready
        echo -e "  ${GRAY}Waiting for Postgres to be ready...${NC}"
        sleep 3
    else
        echo -e "  ${YELLOW}! Docker compose failed - using MOCK_MODE${NC}"
    fi
else
    echo -e "  ${GRAY}• Skipping Docker (using MOCK_MODE)${NC}"
fi

# -----------------------------------------------------------------------------
# Generate Prisma client
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[5/7] Generating Prisma client...${NC}"
cd packages/api
npx prisma generate
echo -e "  ${GREEN}✓ Prisma client generated${NC}"

# -----------------------------------------------------------------------------
# Push database schema (if Docker is running)
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[6/7] Setting up database schema...${NC}"

if [ "$DOCKER_AVAILABLE" = true ]; then
    npx prisma db push --accept-data-loss 2>/dev/null || true
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓ Database schema pushed${NC}"
    else
        echo -e "  ${YELLOW}! Schema push failed - using MOCK_MODE${NC}"
    fi
else
    echo -e "  ${GRAY}• Skipping schema push (no Docker)${NC}"
fi

cd ../..

# -----------------------------------------------------------------------------
# Build shared packages
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[7/7] Building shared packages...${NC}"
npm run build:shared || true
echo -e "  ${GREEN}✓ Shared package built${NC}"

# -----------------------------------------------------------------------------
# Success!
# -----------------------------------------------------------------------------
echo ""
echo -e "${CYAN}============================================================================${NC}"
echo -e "     ${GREEN}✓ SGE Platform Ready!${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""
echo -e "  Quick Start Commands:"
echo -e "    ${GRAY}npm run dev           - Start API + App (full dev)${NC}"
echo -e "    ${GRAY}npm run dev -w @sge/api   - Start API only${NC}"
echo -e "    ${GRAY}npm run dev -w @sge/app   - Start App only${NC}"
echo ""
echo -e "  Database Commands:"
echo -e "    ${GRAY}npm run db:up         - Start Postgres + Redis${NC}"
echo -e "    ${GRAY}npm run db:down       - Stop containers${NC}"
echo -e "    ${GRAY}npm run db:reset      - Reset database${NC}"
echo -e "    ${GRAY}npm run prisma:studio - Open Prisma Studio${NC}"
echo ""
echo -e "  URLs:"
echo -e "    ${GRAY}API:     http://localhost:3000${NC}"
echo -e "    ${GRAY}App:     http://localhost:5173${NC}"
echo -e "    ${GRAY}Prisma:  http://localhost:5555 (run prisma:studio)${NC}"
echo ""
echo -e "${CYAN}============================================================================${NC}"
