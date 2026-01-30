#!/usr/bin/env pwsh
# ============================================================================
# SGE Bootstrap Script for Windows (PowerShell)
# ============================================================================
# One-command setup: .\bootstrap.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "     SUPERGREEN ENERGY - Enterprise Platform Bootstrap" -ForegroundColor Green
Write-Host "     99% Efficiency Revolutionary Power Technology" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------------------------------------
# Check prerequisites
# -----------------------------------------------------------------------------
Write-Host "[1/7] Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "  ✓ npm $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ npm not found" -ForegroundColor Red
    exit 1
}

# Check Docker (optional)
$dockerAvailable = $false
try {
    $dockerVersion = docker --version
    Write-Host "  ✓ Docker available: $dockerVersion" -ForegroundColor Green
    $dockerAvailable = $true
} catch {
    Write-Host "  ! Docker not found - using MOCK_MODE (no DB required)" -ForegroundColor Yellow
}

# -----------------------------------------------------------------------------
# Install dependencies
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/7] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Dependencies installed" -ForegroundColor Green

# -----------------------------------------------------------------------------
# Copy environment files
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/7] Setting up environment files..." -ForegroundColor Yellow

# API .env
if (!(Test-Path "packages/api/.env")) {
    Copy-Item "packages/api/.env.example" "packages/api/.env"
    Write-Host "  ✓ Created packages/api/.env" -ForegroundColor Green
} else {
    Write-Host "  • packages/api/.env already exists" -ForegroundColor Gray
}

# App .env
if (!(Test-Path "packages/app/.env")) {
    Copy-Item "packages/app/.env.example" "packages/app/.env"
    Write-Host "  ✓ Created packages/app/.env" -ForegroundColor Green
} else {
    Write-Host "  • packages/app/.env already exists" -ForegroundColor Gray
}

# -----------------------------------------------------------------------------
# Start Docker services (if available)
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[4/7] Setting up database..." -ForegroundColor Yellow

if ($dockerAvailable) {
    Write-Host "  Starting Postgres + Redis containers..." -ForegroundColor Gray
    docker-compose -f docker-compose.dev.yml up -d
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ! Docker compose failed - using MOCK_MODE" -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ Postgres (5432) and Redis (6379) running" -ForegroundColor Green
        
        # Wait for Postgres to be ready
        Write-Host "  Waiting for Postgres to be ready..." -ForegroundColor Gray
        Start-Sleep -Seconds 3
    }
} else {
    Write-Host "  • Skipping Docker (using MOCK_MODE)" -ForegroundColor Gray
}

# -----------------------------------------------------------------------------
# Generate Prisma client
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[5/7] Generating Prisma client..." -ForegroundColor Yellow
Set-Location packages/api
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Prisma generate failed" -ForegroundColor Red
    Set-Location ../..
    exit 1
}
Write-Host "  ✓ Prisma client generated" -ForegroundColor Green

# -----------------------------------------------------------------------------
# Push database schema (if Docker is running)
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[6/7] Setting up database schema..." -ForegroundColor Yellow

if ($dockerAvailable) {
    npx prisma db push --accept-data-loss 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Database schema pushed" -ForegroundColor Green
    } else {
        Write-Host "  ! Schema push failed - using MOCK_MODE" -ForegroundColor Yellow
    }
} else {
    Write-Host "  • Skipping schema push (no Docker)" -ForegroundColor Gray
}

Set-Location ../..

# -----------------------------------------------------------------------------
# Build shared packages
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[7/7] Building shared packages..." -ForegroundColor Yellow
npm run build:shared
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ! Shared build failed (non-critical)" -ForegroundColor Yellow
} else {
    Write-Host "  ✓ Shared package built" -ForegroundColor Green
}

# -----------------------------------------------------------------------------
# Success!
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "     ✓ SGE Platform Ready!" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Quick Start Commands:" -ForegroundColor White
Write-Host "    npm run dev           - Start API + App (full dev)" -ForegroundColor Gray
Write-Host "    npm run dev -w @sge/api   - Start API only" -ForegroundColor Gray
Write-Host "    npm run dev -w @sge/app   - Start App only" -ForegroundColor Gray
Write-Host ""
Write-Host "  Database Commands:" -ForegroundColor White
Write-Host "    npm run db:up         - Start Postgres + Redis" -ForegroundColor Gray
Write-Host "    npm run db:down       - Stop containers" -ForegroundColor Gray
Write-Host "    npm run db:reset      - Reset database" -ForegroundColor Gray
Write-Host "    npm run prisma:studio - Open Prisma Studio" -ForegroundColor Gray
Write-Host ""
Write-Host "  URLs:" -ForegroundColor White
Write-Host "    API:     http://localhost:3000" -ForegroundColor Gray
Write-Host "    App:     http://localhost:5173" -ForegroundColor Gray
Write-Host "    Prisma:  http://localhost:5555 (run prisma:studio)" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
