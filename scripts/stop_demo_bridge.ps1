$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$pidFile = Join-Path $repoRoot "services\broker_engine\.runtime\demo_bridge.pid"

if (-not (Test-Path -LiteralPath $pidFile)) {
    Write-Output "PAT Demo bridge is not running."
    exit 0
}

$pidValue = (Get-Content -LiteralPath $pidFile -Raw).Trim()
if (-not ($pidValue -match "^\d+$")) {
    Remove-Item -LiteralPath $pidFile -Force
    Write-Output "Removed invalid PAT Demo bridge PID file."
    exit 0
}

$process = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
if ($null -eq $process) {
    Remove-Item -LiteralPath $pidFile -Force
    Write-Output "PAT Demo bridge was not running. Cleaned PID file."
    exit 0
}

Stop-Process -Id ([int]$pidValue) -Force
Remove-Item -LiteralPath $pidFile -Force
Write-Output "PAT Demo bridge stopped."
