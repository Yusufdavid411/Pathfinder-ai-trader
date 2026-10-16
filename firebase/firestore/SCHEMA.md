# Firestore Schema Foundation

## `users/{uid}`

Initial Stage 2 user profile collection:

- `uid` - Firebase Auth UID. Must match the document ID.
- `email` - Email from verified Firebase token claims.
- `display_name` - User-editable display name.
- `photo_url` - User-editable profile image URL.
- `created_at` - Profile creation timestamp.
- `updated_at` - Last profile update timestamp.

## `signals/{signalId}`

Backend-owned Telegram scanner candidates:

- `id` - Random candidate identifier. Must match the document ID.
- `source` - Candidate source, currently `telegram_scan`.
- `telegram_chat_id` - Telegram chat that received the candidate.
- `provider` - Market-data provider that supplied the selected candles.
- `asset` - Currency pair such as `EUR/USD`.
- `direction` - `BUY` or `SELL` manual-review direction.
- `signal_strength` - Scanner ranking score from 0 to 100.
- `expiry_minutes` - Candidate review expiry duration.
- `generated_at` - Server candidate creation time.
- `entry_window_at` - Suggested manual-review entry window.
- `expires_at` - Time when outcome resolution becomes eligible.
- `latest_candle_at` - Timestamp of the newest source candle.
- `reference_price` - Last verified source candle close used by the Demo bridge.
- `reasons` - Explainable scanner evidence.
- `status` - `presented`, `accepted`, `ignored`, or `rejected`.
- `decision_at` - Telegram decision time, initially `null`.
- `outcome_status` - Resolution state, initially `pending`.
- `shadow_tracking_required` - Whether a skipped candidate requires a shadow outcome.
- `execution_enabled` - Remains `false` for direct broker execution.
- `execution_status` - `not_requested`, `queued`, `filled`, `failed`, or another
  fail-closed lifecycle state.
- `execution_request_id` - Signed bridge request identifier when accepted.
- `real_order_placed` - Always `false` in the current Demo bridge release.

Signal documents are written only by trusted Firebase Admin code. Client access
remains denied until authenticated user-account linking and authorization are
implemented.

## `telegram_trading_controls/{telegramChatId}`

Backend-owned controls for one Telegram chat:

- `mode` - `DEMO` or the locked `REAL` target.
- `stake` - Current Demo stake, limited to $1-$10.
- `armed` - Whether a fresh accepted candidate may be queued.
- `emergency_stop` - Blocks new bridge claims when `true`.
- `real_execution_unlocked` - Always `false` until an authorized adapter exists.
- `max_stake` - Demo stake cap.
- `max_trades_per_day` and `trades_today` - Daily request limit.
- `active_execution_request_id` - Prevents overlapping requests.

## `execution_requests/{candidateId}`

Signed, idempotent requests consumed by the local Demo bridge:

- Candidate, chat, account mode, stake, asset, direction, expiry, reference
  price, execution window, and request timestamps.
- `signature` - HMAC-SHA256 over every execution-critical field.
- `status` - `queued`, `claimed`, `filled`, `failed`, `expired`, or `cancelled`.
- `simulated` - Always `true` in this release.
- `real_order_allowed` and `real_order_placed` - Always `false`.
- Claim-token hashes and completion metadata for single-use processing.

## `system_runtime/broker_bridge`

Local bridge heartbeat, active request, and an explicit
`real_execution_enabled: false` marker. All three collections remain inaccessible
to Firebase clients and are used only by trusted Admin code.
