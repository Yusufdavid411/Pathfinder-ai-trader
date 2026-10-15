# Telegram-First Product Plan

Telegram is PAT's first lightweight control surface. It does not replace the full product.

## What Changes

- Users can receive PAT alerts in Telegram earlier than the full mobile/web product.
- Telegram becomes the fastest path to test conversations, watchlists, manual-review alerts, and shadow-trading updates.
- The intelligence stack remains backend-owned and broker-independent.
- Telegram now runs through a Firebase Cloud Functions webhook, so the bot does
  not depend on a local laptop process.
- Telegram becomes the first product surface before mobile/web account polish:
  buttons, scanner actions, manual-review trade ideas, signal tracking, and
  later app synchronization will be proven here first.

## What Does Not Change

- Python remains the backend and service language.
- React + Vite remains the dashboard stack.
- Flutter remains the mobile/desktop stack.
- IQ Option auto-execution remains disabled until a compliant integration path exists.

## Intended Flow

```text
Market Data Engine
  -> Observer Engine
  -> Market DNA
  -> Market Quality
  -> Confidence
  -> Risk
  -> Decision
  -> Telegram Alert
  -> Manual User Review
  -> Outcome or Shadow Trade Recording
```

## Current Telegram Commands

- `/start` - Starts the PAT conversation.
- `/scan` - Opens the scanner action path for candidate trade setups.
- `/status` - Shows system readiness and execution lock status.
- `/help` - Lists available commands.
- `/watchlist` - Shows the placeholder watchlist.
- `/market_status` - Shows the configured provider chain and engine readiness.
- `/risk` - Shows risk-gate readiness.
- `/mode` - Shows the currently allowed operating mode.
- `/compliance` - Explains broker execution restrictions.
- `/signals` - Shows candidate-decision and outcome-tracking readiness.

## Current Hosting

Telegram updates are registered to this Firebase-hosted webhook:

```text
https://telegramwebhook-anp4du33za-uc.a.run.app
```

The webhook uses Firebase Secret Manager for the Telegram bot token, webhook
verification secret, and allowed chat IDs.

## Telegram-First Build Priority

PAT will prioritize Telegram before the mobile app and dashboard:

1. Completed: build the Telegram command and button experience.
2. Completed: add a compliant market-data provider.
3. Completed: generate explainable manual-review candidate trade ideas.
4. Implemented locally: track whether a user acted, ignored, or rejected a
   candidate idea. Firebase deployment is pending.
5. Next: compare the candidate idea against later market outcome.
6. Sync the same history into web/mobile once user accounts are added.

The bot may produce candidate ideas only after live market data, market quality,
confidence, and risk gates exist. It must never invent signals to look active.

## Current Scanner Implementation

The Firebase webhook now includes:

- Market-data provider interface.
- Alpha Vantage FX intraday adapter.
- Twelve Data FX time-series adapter.
- Provider fallback chain.
- Candle-based scanner/ranker.
- Manual-review trade-card renderer.
- Firestore candidate repository.
- Chat-bound Taken, Ignored, and Rejected decision actions.
- Immutable first-decision transaction.

The scanner is deployed. Twelve Data is configured and verified with live
1-minute FX candles. Alpha Vantage is configured as a secondary slot, but its
current key does not unlock `FX_INTRADAY`.

The candidate-decision continuation is tested locally. It is not part of the
currently deployed webhook until the next Firebase deployment.

## Compliance Gate

Telegram messages may notify, explain, and request manual review. They must not execute trades or automate the IQ Option website.

Before any broker execution is considered, PAT requires:

- A compliant broker integration path.
- Demo-only enforcement during development.
- Backend authorization.
- Completed Risk Engine.
- Emergency stop.
- Audit logging.
- Explicit user opt-in.
