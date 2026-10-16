# Current Build Status

Updated: 2026-10-16

## Current stage

Telegram-first live scanning and approval-based execution in the user's actual
IQ Option **Practice** account through a local Chrome extension.

## Completed

- Firebase Telegram webhook, command menu, live FX provider chain, and
  explainable candidate scanner.
- Firestore-backed, chat-bound candidate decisions and Demo/Real target,
  `$1-$10` stake, arm, disarm, daily limit, and emergency-stop controls.
- HMAC-signed execution queue with single-use claim tokens and stale-claim
  recovery.
- Local loopback bridge and Chrome extension. The cloud queue cannot be claimed
  until a fresh extension heartbeat says the visible account is Practice and
  required traderoom controls were found.
- Practice-account, asset, amount, expiry, and direction checks before every
  action. Real and unverified modes fail closed.
- Telegram success receipt only after the IQ Option page exposes a new open
  position or positive execution notification. The old generated simulator
  receipt path has been removed.
- No IQ Option password, OTP, cookie, session token, or private network traffic
  is collected.
- Real-money execution remains hard-locked in the extension, local bridge, and
  Firebase completion gate.

## User test flow

1. Run `npm run build:extension`.
2. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**,
   and select `browser/iq-option-reader`.
3. Log in to IQ Option normally, select **Practice**, and open its traderoom.
4. Confirm the Pathfinder panel says `READY` and `account_mode: PRACTICE`.
5. Start `scripts/start_demo_bridge.ps1` and check `/execution_status` in
   Telegram.
6. Choose Demo, set `$1`, arm, scan, and press **Accept & Queue** on a current
   candidate.
7. Verify the opened position in IQ Option and compare it with the Telegram
   receipt. Use `/emergency_stop` to block new claims immediately.

## Important boundary

IQ Option does not publish a supported public order API for this workflow. This
release operates the visible traderoom UI in the user's already logged-in
browser. That makes the Practice test genuine, but the connector is necessarily
sensitive to IQ Option UI changes. Missing or ambiguous controls cause a safe
failure. Real-money execution is not enabled.

## Remaining product work

- Validate the selector set against the user's current IQ Option traderoom and
  adjust it if the readiness panel identifies changed controls.
- Resolve candidate win/loss outcomes from later verified market candles.
- Add Telegram history/performance summaries and authenticated account linking.
- Synchronize history into the web and mobile clients.
- Use a supported broker integration for production-grade execution if one
  becomes available.
