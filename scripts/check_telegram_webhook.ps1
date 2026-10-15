$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$envFile = Join-Path $repoRoot ".env.local"

if (-not (Test-Path -LiteralPath $envFile)) {
    throw ".env.local was not found."
}

$values = @{}
Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $parts = $line.Split("=", 2)
        $values[$parts[0].Trim()] = $parts[1].Trim()
    }
}

$botToken = $values["TELEGRAM_BOT_TOKEN"]

if (-not $botToken) {
    throw "TELEGRAM_BOT_TOKEN is missing."
}

$info = Invoke-RestMethod `
    -Method Get `
    -Uri "https://api.telegram.org/bot$botToken/getWebhookInfo" `
    -TimeoutSec 30

Write-Output "Webhook URL: $($info.result.url)"
Write-Output "Pending updates: $($info.result.pending_update_count)"

if ($info.result.last_error_message) {
    Write-Output "Last Telegram error: $($info.result.last_error_message)"
} else {
    Write-Output "Last Telegram error: none"
}
