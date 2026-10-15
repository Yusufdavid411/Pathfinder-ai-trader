$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$runtimeDir = Join-Path $repoRoot "services\notification_engine\.runtime"
$pidFile = Join-Path $runtimeDir "telegram_bot.pid"
$stdoutLog = Join-Path $runtimeDir "telegram_bot.out.log"
$stderrLog = Join-Path $runtimeDir "telegram_bot.err.log"

if (-not (Test-Path -LiteralPath $pidFile)) {
    Write-Output "PAT Telegram bot status: stopped."
    exit 0
}

$pidValue = (Get-Content -LiteralPath $pidFile -Raw).Trim()
if (-not ($pidValue -match "^\d+$")) {
    Write-Output "PAT Telegram bot status: invalid PID file."
    exit 1
}

$process = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
if ($null -eq $process) {
    Write-Output "PAT Telegram bot status: stopped, stale PID file remains."
    exit 1
}

Write-Output "PAT Telegram bot status: running. PID: $pidValue"
Write-Output "Output log: $stdoutLog"
Write-Output "Error log: $stderrLog"
