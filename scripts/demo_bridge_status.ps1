$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$runtimeDir = Join-Path $repoRoot "services\broker_engine\.runtime"
$pidFile = Join-Path $runtimeDir "demo_bridge.pid"
$stdoutLog = Join-Path $runtimeDir "demo_bridge.out.log"
$stderrLog = Join-Path $runtimeDir "demo_bridge.err.log"

if (-not (Test-Path -LiteralPath $pidFile)) {
    Write-Output "PAT IQ Option Practice bridge status: stopped."
    exit 0
}

$pidValue = (Get-Content -LiteralPath $pidFile -Raw).Trim()
if (-not ($pidValue -match "^\d+$")) {
    Write-Output "PAT IQ Option Practice bridge status: invalid PID file."
    exit 1
}

$process = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
if ($null -eq $process) {
    Write-Output "PAT IQ Option Practice bridge status: stopped, stale PID file remains."
    exit 1
}

Write-Output "PAT IQ Option Practice bridge status: running. PID: $pidValue"
Write-Output "Output log: $stdoutLog"
Write-Output "Error log: $stderrLog"
