$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$runtimeDir = Join-Path $repoRoot "services\notification_engine\.runtime"
$pidFile = Join-Path $runtimeDir "telegram_bot.pid"

if (-not (Test-Path -LiteralPath $pidFile)) {
    Write-Output "PAT Telegram bot is not running."
    exit 0
}

$pidValue = (Get-Content -LiteralPath $pidFile -Raw).Trim()
if (-not ($pidValue -match "^\d+$")) {
    Remove-Item -LiteralPath $pidFile -Force
    Write-Output "Removed invalid PAT Telegram bot PID file."
    exit 0
}

$process = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
if ($null -eq $process) {
    Remove-Item -LiteralPath $pidFile -Force
    Write-Output "PAT Telegram bot was not running. Cleaned PID file."
    exit 0
}

Stop-Process -Id ([int]$pidValue) -Force
Remove-Item -LiteralPath $pidFile -Force
Write-Output "PAT Telegram bot stopped."
