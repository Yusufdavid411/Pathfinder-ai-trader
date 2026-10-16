# Telegram-First Product Plan

Telegram is PAT's first complete control surface. Market intelligence and risk
state remain backend-owned so later web and mobile clients can use the same
records.

## Live Flow

```text
Verified market candles
  -> explainable scanner and gates
  -> Telegram candidate
  -> user presses Accept & Queue
  -> Firestore signed request
  -> local Pathfinder Demo bridge
  -> Telegram simulation receipt
```

The scan itself never queues an execution. Demo must be selected and armed, and
each candidate requires a separate user acceptance before its entry window
expires.

## Commands

- `/start` - Open the main PAT control menu.
- `/scan` - Scan live provider data for a genuine candidate.
- `/mode` - Choose Demo or view the locked Real target.
- `/stake 1` - Set the Demo stake from `$1` through `$10`.
- `/arm` - Allow an accepted Demo candidate to enter the queue.
- `/disarm` - Block new execution requests.
- `/emergency_stop` - Disarm and block new bridge claims.
- `/resume` - Clear the Demo emergency stop; execution remains disarmed.
- `/execution_status` - Show controls, usage limits, and bridge heartbeat.
- `/status`, `/risk`, `/watchlist`, `/market_status`, `/signals`, `/compliance`,
  and `/help` - Inspect the remaining PAT surfaces.

## Hosting and Bridge

Telegram updates are delivered to the Firebase-hosted `telegramWebhook`
function. Candidate and execution state lives in Firestore. The local bridge
polls protected Firebase endpoints, so this computer must be online for a
queued Demo simulation to finish and return its Telegram receipt.

## Implemented Safety Gates

- Demo is the default; controls start disarmed.
- Selecting a mode or changing a stake disarms execution.
- Real cannot be armed.
- Every execution request is bound to the Telegram chat and accepted candidate.
- Every execution-critical field is HMAC-signed.
- Requests are idempotent and single-use claim tokens are stored only as
  hashes.
- One active request per chat, ten requests per day, and a `$10` stake cap.
- Entry and expiry windows are rechecked when the bridge claims a request.
- Emergency stop blocks claims.
- Firestore clients cannot access execution collections.
- All current receipts state that no IQ Option order was placed.

## IQ Option Boundary

Pathfinder Demo is a simulator, not an IQ Option Demo account. IQ Option Demo
and Real execution remain locked because no authorized external order API is
configured. PAT will not use an unofficial password-based library, capture a
session, or automate the traderoom UI. A future authorized adapter can be added
behind the signed queue while preserving the Telegram controls and audit trail.

## Next Milestones

1. Resolve candidate outcomes from later verified candles.
2. Add `/history` and performance summaries.
3. Add authenticated user and Telegram linking plus rate limiting.
4. Synchronize history into the web and mobile apps.
5. Add a real broker adapter only after provider authorization and compliance
   review.
