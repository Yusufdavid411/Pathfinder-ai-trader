# Pathfinder Demo Execution Bridge

This service completes the Telegram approval flow without pretending to place an
IQ Option order. It polls the protected Firebase execution queue, verifies the
HMAC signature on every command, records a local simulated Demo receipt, and
returns that receipt to Telegram.

## What It Does

- Accepts only signed `DEMO` requests.
- Enforces the `$1-$10` stake range and the candidate execution window.
- Rejects altered commands and every `REAL` request.
- Never reads an IQ Option username, password, cookie, OTP, or browser session.
- Never calls or automates IQ Option.

`IqOptionExecutionLockedAdapter` is an intentional closed boundary. It must not
be replaced until an authorized IQ Option order interface is available and has
been reviewed.

## Start and Check It

From the repository root on Windows:

```powershell
powershell.exe -ExecutionPolicy Bypass -File scripts\start_demo_bridge.ps1
powershell.exe -ExecutionPolicy Bypass -File scripts\demo_bridge_status.ps1
```

The bridge reads the existing `TELEGRAM_WEBHOOK_SECRET` from the ignored root
`.env.local` file. Firebase uses the same secret to authenticate the bridge and
sign execution-critical fields.

To stop it:

```powershell
powershell.exe -ExecutionPolicy Bypass -File scripts\stop_demo_bridge.ps1
```

## Telegram Test Flow

1. Send `/mode` and choose **Demo**.
2. Send `/stake 1`.
3. Send `/arm`.
4. Send `/scan`.
5. When a genuine candidate appears, press **Accept & Queue** before it expires.
6. Wait for the **PAT Demo Execution Receipt**.
7. Send `/emergency_stop` at any time to disarm new bridge claims.

The receipt always says that no IQ Option Demo or Real order was placed.
