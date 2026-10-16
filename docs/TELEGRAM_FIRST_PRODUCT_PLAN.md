# Telegram-First Product Plan

Telegram is PAT's control surface. An IQ Option browser tab is the local
Practice execution surface; credentials and sessions remain in that browser.

## Live flow

```text
Verified FX candles
  -> explainable scanner
  -> Telegram candidate
  -> user presses Accept & Queue
  -> signed Firestore request
  -> localhost bridge (Practice heartbeat required)
  -> IQ Option Chrome extension
  -> visible Practice order
  -> platform evidence
  -> Telegram receipt
```

The scan never executes by itself. Demo must be selected and armed, and every
candidate requires a separate acceptance before expiry.

## Safety gates

- Demo is default and disarmed; Real cannot be armed.
- One active request, ten requests per day, and a `$10` stake cap.
- Every execution-critical field is HMAC-signed.
- Old/local simulator clients cannot claim the cloud queue.
- A claim requires a fresh verified-Practice extension heartbeat.
- Account mode is checked before setup and again immediately before the click.
- An extension success without `PRACTICE` proof is downgraded to failure by the
  local bridge and again by Firebase.
- Telegram says “placed” only after visible IQ Option receipt evidence.
- Emergency stop blocks new claims.

## Commands

- `/mode` — choose Demo or view locked Real.
- `/stake 1` — set a `$1-$10` Practice stake.
- `/arm`, `/disarm`, `/emergency_stop`, `/resume` — execution controls.
- `/scan` — request a live candidate.
- `/execution_status` — show control and connector heartbeat state.

## Current boundary

The connector uses visible IQ Option controls because no public supported order
API is available for this flow. It never handles IQ Option credentials, cookies,
OTPs, or private traffic. UI changes may require selector maintenance; unknown
state always fails closed. Real-money execution remains locked.
