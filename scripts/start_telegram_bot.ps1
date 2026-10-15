$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$serviceDir = Join-Path $repoRoot "services\notification_engine"
$runtimeDir = Join-Path $serviceDir ".runtime"
$pidFile = Join-Path $runtimeDir "telegram_bot.pid"
$stdoutLog = Join-Path $runtimeDir "telegram_bot.out.log"
$stderrLog = Join-Path $runtimeDir "telegram_bot.err.log"
$pythonPath = Join-Path $repoRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $pythonPath)) {
    $pythonPath = "python"
}

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

if (Test-Path -LiteralPath $pidFile) {
    $existingPid = Get-Content -LiteralPath $pidFile -Raw
    $existingPid = $existingPid.Trim()

    if ($existingPid -match "^\d+$") {
        $existingProcess = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
        if ($null -ne $existingProcess) {
            Write-Output "PAT Telegram bot is already running. PID: $existingPid"
            exit 0
        }
    }
}

$arguments = @(
    "-m",
    "notification_engine.cli",
    "run",
    "--interval-seconds",
    "2"
)

$process = Start-Process `
    -FilePath $pythonPath `
    -ArgumentList $arguments `
    -WorkingDirectory $serviceDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru

Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ascii

Write-Output "PAT Telegram bot started. PID: $($process.Id)"
Write-Output "Output log: $stdoutLog"
Write-Output "Error log: $stderrLog"
