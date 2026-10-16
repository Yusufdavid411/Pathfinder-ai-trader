# Current Build Status

Updated: 2026-10-16

## Current Stage

Telegram-first live scanner, decision tracking, and approval-based Pathfinder
Demo execution.

## Completed

- Firebase-hosted Telegram webhook and Telegram command menu.
- Public Telegram access through the configured `TELEGRAM_ALLOWED_CHAT_IDS=*`
  setting.
- Twelve Data FX candles with Alpha Vantage fallback support.
- Explainable EMA, RSI, momentum, and candle-quality scanner.
- Genuine-candidate-only behavior; PAT does not invent BUY/SELL activity when
  no setup passes the gates.
- Firestore-backed candidates with chat-bound, immutable Accepted, Ignored, and
  Rejected decisions.
- Per-chat Demo/Real target, `$1-$10` stake, arm, disarm, emergency-stop, and
  resume controls.
- HMAC-signed, idempotent execution queue with one active request per chat and a
  ten-request daily safety cap.
- Local Pathfinder Demo bridge with claim tokens, stale-claim recovery,
  heartbeat reporting, and Telegram completion receipts.
- Real IQ Option requests fail closed. The bridge never reads IQ Option
  credentials, cookies, OTPs, browser sessions, or private traffic.
- Firestore client access denied for candidates, trading controls, execution
  requests, and bridge runtime state.
- Read-only IQ Option visible-page market reader remains isolated from the
  execution system.

## Verification

- Firebase Functions and Firestore rules: deployed successfully.
- Telegram command menu: synchronized successfully.
- Telegram webhook: registered, zero pending updates, and no Telegram error.
- Protected bridge claim endpoint: HTTP 204 with an empty queue.
- Local bridge: running with a current Firestore heartbeat and no post-start
  errors.
- Real execution heartbeat marker: `false`.
- Node/TypeScript tests: 41 passed (11 reader + 30 Functions).
- Python tests: 26 passed (4 API + 17 notification + 5 bridge).
- Formatting, lint, dashboard build, and extension build: passed.

## User Test Flow

1. Keep the local Pathfinder Demo bridge running.
2. In Telegram, send `/mode` and choose **Demo**.
3. Send `/stake 1`.
4. Send `/arm`.
5. Send `/scan`.
6. If a genuine live candidate appears, press **Accept & Queue** before it
   expires.
7. Wait for the **PAT Demo Execution Receipt**.
8. Use `/execution_status` to inspect controls and bridge health.
9. Use `/emergency_stop` to block new bridge claims immediately.

## Important Boundary

The current executor is a Pathfinder local simulator. It is not the IQ Option
Demo account and it never places an IQ Option order. Real and IQ Option Demo
execution stay locked because no authorized IQ Option order API is configured.
The safe future route is to implement an authorized broker adapter behind the
existing signed queue without changing the Telegram approval experience.

## Remaining Product Work

- Resolve candidate win/loss outcomes from later verified market candles.
- Add Telegram history and performance summaries after deterministic outcome
  resolution exists.
- Add authenticated user-to-Telegram account linking and rate limiting before a
  broad public launch.
- Configure mobile/web Firebase Auth and synchronize the same candidate history
  into those clients.
- Replace the locked IQ Option adapter only if IQ Option supplies and authorizes
  a suitable external order interface.

## Local Environment Notes

- Use `.venv\Scripts\python.exe`; global `python` may not be available.
- Run PowerShell scripts with `powershell.exe -ExecutionPolicy Bypass -File` on
  this machine.
- Firebase Blaze billing is enabled; monitor cloud usage.
