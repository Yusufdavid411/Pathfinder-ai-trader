param(
    [string]$WebhookUrl = "https://telegramwebhook-anp4du33za-uc.a.run.app"
)

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
$webhookSecret = $values["TELEGRAM_WEBHOOK_SECRET"]

if (-not $botToken) {
    throw "TELEGRAM_BOT_TOKEN is missing."
}

if (-not $webhookSecret) {
    throw "TELEGRAM_WEBHOOK_SECRET is missing."
}

$body = @{
    url = $WebhookUrl
    secret_token = $webhookSecret
    allowed_updates = @("message", "callback_query")
    drop_pending_updates = $false
} | ConvertTo-Json -Depth 5

$result = Invoke-RestMethod `
    -Method Post `
    -Uri "https://api.telegram.org/bot$botToken/setWebhook" `
    -ContentType "application/json" `
    -Body $body `
    -TimeoutSec 30

if (-not $result.ok) {
    throw $result.description
}

Write-Output "Telegram webhook registered."
Write-Output "Webhook URL: $WebhookUrl"
