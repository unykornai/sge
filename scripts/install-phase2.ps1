# Phase 2 Installation Script

Write-Host "=== Installing Phase 2 Dependencies ===" -ForegroundColor Cyan

# Install API dependencies
Write-Host "`nInstalling API packages..." -ForegroundColor Yellow
cd packages\api
npm install prom-client
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions

# Generate Prisma client with new IdempotencyRecord model
Write-Host "`nGenerating Prisma client..." -ForegroundColor Yellow
npx prisma generate

# Run migration (if in real mode)
if ($env:MOCK_MODE -ne "true") {
    Write-Host "`nRunning Prisma migration..." -ForegroundColor Yellow
    npx prisma migrate dev --name add_idempotency_records
} else {
    Write-Host "`nSkipping migration (MOCK_MODE=true)" -ForegroundColor Gray
}

# Install k6 (optional)
Write-Host "`nTo install k6 for load testing:" -ForegroundColor Yellow
Write-Host "  choco install k6" -ForegroundColor Gray
Write-Host "  OR download from: https://k6.io/docs/get-started/installation/" -ForegroundColor Gray

cd ..\..

Write-Host "`n=== Phase 2 Installation Complete ===" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Run 'npm run dev' to start in MOCK mode (idempotency + rate limits enabled)" -ForegroundColor White
Write-Host "  2. Test idempotency: See VERIFICATION.md" -ForegroundColor White
Write-Host "  3. Load test: cd ops/k6 && k6 run register.js" -ForegroundColor White
Write-Host "  4. View metrics: curl http://localhost:3000/metrics" -ForegroundColor White
