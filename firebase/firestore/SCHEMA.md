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
- `reasons` - Explainable scanner evidence.
- `status` - `presented`, `accepted`, `ignored`, or `rejected`.
- `decision_at` - Telegram decision time, initially `null`.
- `outcome_status` - Resolution state, initially `pending`.
- `shadow_tracking_required` - Whether a skipped candidate requires a shadow outcome.
- `execution_enabled` - Always `false` for this Telegram-first stage.

Signal documents are written only by trusted Firebase Admin code. Client access
remains denied until authenticated user-account linking and authorization are
implemented.
