Param(
    [switch]$KillExisting
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$port = 3000

Write-Host "Repo root: $repoRoot"

# Check port
$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connections) {
    $pid = $connections[0].OwningProcess
    Write-Host "Port $port is in use by PID $pid"
    if ($KillExisting) {
        try {
            Write-Host "Stopping process $pid..."
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Start-Sleep -Seconds 1
            Write-Host "Process $pid stopped."
        } catch {
            Write-Warning "Failed to stop process $pid: $_"
        }
    } else {
        Write-Host "Run with -KillExisting to force-stop the process owning port $port. Exiting."
        exit 1
    }
} else {
    Write-Host "Port $port is free."
}

# Start dev server
Write-Host "Starting dev server (npm run dev)..."
$startInfo = @{FilePath='npm'; ArgumentList=@('run','dev'); WorkingDirectory=$repoRoot; NoNewWindow=$false}
$proc = Start-Process @startInfo -PassThru
Write-Host "Spawned process Id: $($proc.Id)"

# Wait for server
$timeout = 90
$elapsed = 0
$ready = $false
while ($elapsed -lt $timeout) {
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:$port/api/weather-trigger" -TimeoutSec 5
        Write-Host "Server responded."
        $ready = $true
        Write-Output ($resp | ConvertTo-Json -Depth 4)
        break
    } catch {
        Start-Sleep -Seconds 2
        $elapsed += 2
        # check if process exited
        try {
            $p = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
            if (-not $p) {
                Write-Error "Dev process exited unexpectedly. Check logs in the terminal where it started.";
                exit 1
            }
        } catch {
            # ignore
        }
    }
}

if (-not $ready) {
    Write-Error "Timeout waiting for server on port $port after $timeout seconds. Check 'npm run dev' output."
    exit 2
}

Write-Host "Done. Dev server reachable and API returned data."
