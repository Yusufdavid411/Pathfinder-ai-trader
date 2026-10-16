$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$serviceDir = Join-Path $repoRoot "services\broker_engine"
$runtimeDir = Join-Path $serviceDir ".runtime"
$pidFile = Join-Path $runtimeDir "demo_bridge.pid"
$stdoutLog = Join-Path $runtimeDir "demo_bridge.out.log"
$stderrLog = Join-Path $runtimeDir "demo_bridge.err.log"
$pythonPath = Join-Path $repoRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $pythonPath)) {
    $pythonPath = "python"
}

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

if (Test-Path -LiteralPath $pidFile) {
    $existingPid = (Get-Content -LiteralPath $pidFile -Raw).Trim()
    if ($existingPid -match "^\d+$") {
        $existingProcess = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
        if ($null -ne $existingProcess) {
            Write-Output "PAT IQ Option Practice bridge is already running. PID: $existingPid"
            exit 0
        }
    }
}

$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $pythonPath
$startInfo.Arguments = "-m broker_engine.cli run"
$startInfo.WorkingDirectory = $serviceDir
$startInfo.UseShellExecute = $true
$startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden

$process = [System.Diagnostics.Process]::Start($startInfo)
if ($null -eq $process) {
    throw "Failed to start the IQ Option Practice bridge."
}

Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ascii

Write-Output "PAT IQ Option Practice bridge started. PID: $($process.Id)"
Write-Output "Output log: $stdoutLog"
Write-Output "Error log: $stderrLog"
