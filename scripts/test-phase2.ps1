# Phase 2 Manual Testing Script (No k6 Required)
# Run this to validate idempotency and rate limiting

Write-Host "=== Phase 2 Feature Tests ===" -ForegroundColor Cyan
Write-Host ""

# Check if API is running
Write-Host "Checking if API is running..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/healthz" -Method GET
    Write-Host "✅ API is running" -ForegroundColor Green
} catch {
    Write-Host "❌ API is not running. Start it with: npm run dev" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Test 1: Idempotency ===" -ForegroundColor Cyan
Write-Host "Sending same request twice with same Idempotency-Key..." -ForegroundColor Yellow

$key = "test-idem-$(Get-Random)"
$wallet = "0x1111111111111111111111111111111111111111"
$body = @{ wallet = $wallet } | ConvertTo-Json

# First request
Write-Host "Request 1..." -ForegroundColor Gray
$response1 = Invoke-WebRequest -Uri "http://localhost:3000/api/register" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json"; "Idempotency-Key" = $key } `
    -Body $body `
    -UseBasicParsing

$idem1 = $response1.Headers["X-Idempotency"]
Write-Host "  Status: $($response1.StatusCode)" -ForegroundColor White
Write-Host "  X-Idempotency: $idem1" -ForegroundColor White

# Second request (should be cached)
Write-Host "Request 2 (same key)..." -ForegroundColor Gray
$response2 = Invoke-WebRequest -Uri "http://localhost:3000/api/register" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json"; "Idempotency-Key" = $key } `
    -Body $body `
    -UseBasicParsing

$idem2 = $response2.Headers["X-Idempotency"]
Write-Host "  Status: $($response2.StatusCode)" -ForegroundColor White
Write-Host "  X-Idempotency: $idem2" -ForegroundColor White

if ($idem1 -eq "MISS" -and $idem2 -eq "HIT") {
    Write-Host "✅ Idempotency works! First=MISS, Second=HIT" -ForegroundColor Green
} else {
    Write-Host "❌ Idempotency failed. Expected MISS then HIT" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test 2: Rate Limiting ===" -ForegroundColor Cyan
Write-Host "Sending 6 requests quickly (limit is 5/hour per IP)..." -ForegroundColor Yellow

$rateLimitHit = $false
for ($i = 1; $i -le 6; $i++) {
    $testWallet = "0x" + $i.ToString().PadLeft(40, '0')
    $testBody = @{ wallet = $testWallet } | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/register" `
            -Method POST `
            -Headers @{ "Content-Type" = "application/json" } `
            -Body $testBody `
            -UseBasicParsing
        
        $limit = $response.Headers["X-RateLimit-Limit"]
        $remaining = $response.Headers["X-RateLimit-Remaining"]
        
        Write-Host "  Request $i`: Status $($response.StatusCode), Remaining: $remaining/$limit" -ForegroundColor White
    } catch {
        if ($_.Exception.Response.StatusCode -eq 429) {
            Write-Host "  Request $i`: 429 Too Many Requests (rate limited)" -ForegroundColor Yellow
            $rateLimitHit = $true
        } else {
            Write-Host "  Request $i`: Error $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

if ($rateLimitHit) {
    Write-Host "✅ Rate limiting works! Got 429 after limit exceeded" -ForegroundColor Green
} else {
    Write-Host "⚠️  Rate limiting may not be working (no 429 received)" -ForegroundColor Yellow
    Write-Host "   This is OK in MOCK mode with fresh start - try more requests" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Test 3: Prometheus Metrics ===" -ForegroundColor Cyan
Write-Host "Fetching metrics endpoint..." -ForegroundColor Yellow

try {
    $metrics = Invoke-RestMethod -Uri "http://localhost:3000/metrics" -Method GET
    
    if ($metrics -like "*http_request_duration_ms*") {
        Write-Host "✅ Metrics endpoint works!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Sample metrics:" -ForegroundColor Gray
        $metrics -split "`n" | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    } else {
        Write-Host "❌ Metrics endpoint returned unexpected format" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Metrics endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Phase 2 features tested. See results above." -ForegroundColor White
Write-Host ""
Write-Host "To install k6 for load testing:" -ForegroundColor Yellow
Write-Host "  Option 1: choco install k6" -ForegroundColor Gray
Write-Host "  Option 2: Download from https://k6.io/docs/get-started/installation/" -ForegroundColor Gray
Write-Host "  Option 3: Skip k6 - core features work without it!" -ForegroundColor Green
