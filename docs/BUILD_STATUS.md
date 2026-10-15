Current Stage:
Telegram-First Candidate Decision Tracking

Status:
Telegram-first interface foundation is implemented, verified, command-synced with Telegram, deployed to Firebase Cloud Functions, registered as the Telegram webhook, and confirmed live from the phone. The bot no longer depends on the laptop staying on.

The Taken/Ignored/Rejected candidate-tracking continuation was implemented and
tested locally on 2026-10-15. It is committed separately from the previously
deployed scanner and still requires a Firebase Functions deployment before it
is live in Telegram.

Completed:

- Saved the Codex Master Build Guide as `docs/CODEX_MASTER_BUILD_GUIDE.md` and treated it as the project source of truth.
- Stage 1 foundation exists: monorepo, Flutter shell, React/Vite shell, FastAPI foundation, lint/format config, CI placeholder, docs, and health checks.
- Added trusted API service boundary at `services/api`.
- Added Firebase ID token verifier abstraction and Firebase Admin verifier adapter.
- Added authenticated `/v1/me` profile API.
- Added user profile repository interface, in-memory repository for tests, and Firestore repository adapter boundary.
- Added dashboard Firebase config and auth service foundation for email/password and Google Sign-In.
- Added mobile Firebase/Auth service foundations and Firebase package dependencies.
- Added Firestore and Storage security rule foundations.
- Added Firebase Auth setup documentation and initial Firestore user schema documentation.
- Added shared contracts package and expanded test folder structure.
- Product direction clarified: Telegram is the first lightweight control surface, not a replacement for the backend, mobile app, or web dashboard.
- Added `docs/TELEGRAM_FIRST_PRODUCT_PLAN.md`.
- Added `services/notification_engine` with Telegram command responder, outbound message renderer, and transport boundary.
- Enforced manual-review messaging: Telegram alerts cannot place or imply IQ Option trade execution.
- Added local Telegram polling bridge and command runner.
- Added real PAT Telegram commands: `/start`, `/status`, `/help`, `/watchlist`, `/market_status`, `/risk`, `/mode`, `/compliance`, and `/signals`.
- Added `/scan` command foundation for Telegram-first market scanning.
- Added Telegram inline button architecture for scanner/status/watchlist/risk/compliance/help actions.
- Updated Telegram-first plan so scanner, manual-review candidate ideas, trade outcome tracking, and later app synchronization come before app polish/user registration.
- Deployed button-enabled Telegram webhook to Firebase.
- Re-registered Telegram webhook with `message` and `callback_query` updates enabled.
- Changed Telegram access mode to public by setting `TELEGRAM_ALLOWED_CHAT_IDS=*` in local ignored config and Firebase Secret Manager.
- Added market-data provider interface for Firebase Functions.
- Added Alpha Vantage FX intraday candle adapter.
- Added Twelve Data FX time-series adapter.
- Added fallback market-data provider chain: Twelve Data first, Alpha Vantage second.
- Added first scanner/ranker that evaluates configured FX pairs from candle data.
- Added manual-review trade-card formatter with pair, expiry window, entry window, direction, signal strength, reasons, and tracking-only recovery levels.
- Added market-data setup documentation at `docs/MARKET_DATA_PROVIDER_SETUP.md`.
- Created Firebase Secret Manager slot `ALPHA_VANTAGE_API_KEY` with a placeholder value.
- Stored provided Alpha Vantage key in Firebase Secret Manager.
- Tested Alpha Vantage key against `FX_INTRADAY`; provider reports the endpoint is premium for this key.
- Created Firebase Secret Manager slot `TWELVE_DATA_API_KEY` with a placeholder value.
- Stored provided Twelve Data key in Firebase Secret Manager.
- Verified Twelve Data returned 30 live EUR/USD 1-minute candles.
- Redeployed Firebase webhook with the latest Twelve Data secret version.
- Deployed scanner-enabled webhook to Firebase.
- Added saved Telegram polling offset state to avoid repeating old messages after restart.
- Added continuous Telegram polling runner.
- Added Telegram command-menu sync through the Bot API.
- Added local Windows controls for Telegram runner start, stop, and status.
- Added Firebase project configuration through `.firebaserc` and `firebase.json`.
- Added Firebase Cloud Functions webhook package under `firebase/functions`.
- Added `telegramWebhook` HTTPS function for Telegram updates.
- Added `syncTelegramCommandMenu` HTTPS function for protected command-menu sync.
- Added Firebase Secret Manager bindings for Telegram token, webhook secret, and allowed chat IDs.
- Upgraded Firebase Functions runtime target to Node.js 22.
- Granted required Cloud Build builder permission to the default compute service account after Firebase deploy reported a build-service-account permission failure.
- Granted Cloud Run invoker access to the deployed Firebase-backed Cloud Run services so Telegram can reach the webhook.
- Registered Telegram webhook URL: `https://telegramwebhook-anp4du33za-uc.a.run.app`.
- Added webhook helper scripts for registration and status checks.
- Stored Telegram credentials locally in ignored `.env.local`.
- Verified live Telegram message delivery from PAT code.
- Verified live Telegram command menu sync.
- Started the local continuous Telegram runner.
- Stopped the local continuous Telegram runner after the Firebase webhook path was confirmed.
- Verified Telegram webhook status: registered URL correct, pending updates `0`, last Telegram error `none`.
- Verified Firebase webhook synthetic `/status` request returned HTTP `200`.
- Verified phone `/status` command replied with `PAT status: cloud webhook mode.`
- Verified Firebase webhook synthetic `/scan` request returned HTTP `200`.
- Verified `/scan` cloud path returns HTTP `200` after scanner deployment.
- Synced Telegram command menu after adding `/scan`.
- Verified Alpha Vantage live response: key works, but intraday FX candles require premium access.
- Deployed multi-provider scanner chain to Firebase.
- Verified deployed live-data `/scan` path returned HTTP `200` after Twelve Data setup.
- Recovered and merged the existing read-only IQ Option market-reader GitHub history without replacing the Telegram/Firebase platform.
- Added Firestore-backed `signals/{signalId}` candidate records.
- Added Taken, Ignored, and Rejected inline actions to successful Telegram scan cards.
- Bound candidate decisions to the Telegram chat that received the card.
- Made the first decision immutable through a Firestore transaction.
- Marked ignored/rejected candidates for later shadow-outcome resolution.
- Persisted provider, entry window, expiry, source candle, evidence, and execution-disabled state for each candidate.
- Updated stale Telegram status text to reflect the configured live provider chain and manual-review scanner.

Tests:

- Passed: `npm run format:check`.
- Passed: `npm run lint`.
- Passed: `npm run build:dashboard`.
- Passed: `npm run test:functions` - 21 Firebase Functions tests.
- Passed: `services/api` pytest suite with `.venv/Scripts/python.exe -m pytest` - 4 tests.
- Passed: `services/notification_engine` pytest suite with `.venv/Scripts/python.exe -m pytest` - 17 tests.
- Passed: live Telegram polling cycle with `.venv/Scripts/python.exe -m notification_engine.cli poll-once`.
- Passed: live Telegram command sync with `.venv/Scripts/python.exe -m notification_engine.cli sync-commands`.
- Passed: local Telegram runner start/status verification.
- Passed: Firebase Functions deploy to project `pathfinder-ai-trader`.
- Passed: Telegram webhook registration against the Firebase URL.
- Passed: Telegram webhook status check.
- Passed: phone verification from Telegram screenshot at 2026-09-12 04:54 local time.
- Not run: Black check because Black is not installed in the local virtual environment.
- Not run: Flutter analysis/tests because Flutter is not available on PATH.

Known Issues:

- Global `python` command is not available on this machine; use `.venv/Scripts/python.exe`.
- Flutter SDK is not available on PATH, so Flutter package resolution and analysis cannot run here.
- API tests pass with one upstream FastAPI/Starlette deprecation warning about `TestClient`; no code failure is present.
- Telegram cloud delivery is configured through Firebase Cloud Functions and Firebase Secret Manager.
- Telegram bot is currently public. Anyone who finds or opens the bot can send commands, which may increase Firebase/Telegram usage.
- `/scan` is wired to the live scanner path and Twelve Data is returning 1-minute FX candles. Candidate output depends on whether current market conditions pass scanner thresholds.
- Candidate decisions are implemented locally but not yet deployed to the live webhook.
- Outcome resolution is not implemented yet; new records remain `pending` until the resolver milestone.
- Firebase Blaze billing is enabled for the project; cloud function use may create small usage charges.
- Direct PowerShell script execution is blocked by the local execution policy; run scripts through `powershell.exe -ExecutionPolicy Bypass -File ...` or change the local execution policy manually.

Manual Actions Required:

- Enable Firebase Authentication email/password provider.
- Configure Google Sign-In OAuth consent/client settings.
- Provide backend Firebase credentials through `GOOGLE_APPLICATION_CREDENTIALS` or application default credentials.
- Fill Firebase web/mobile configuration values in local environment files.
- Keep Telegram bot token private; it is stored locally in ignored `.env.local` and in Firebase Secret Manager.
- Optionally upgrade Alpha Vantage so `FX_INTRADAY` is available as a backup provider.
- Monitor Firebase billing/usage in the Firebase console.
- Add rate limiting or user-account linking before broad public launch.
- Deploy the candidate-tracking Functions update and Firestore rules after reviewing the production change.

Next Stage:

- Finish remaining Stage 2 Firebase Auth/client configuration once OAuth and app config values are available.
- After Stage 2 live setup is fully verified, continue to Stage 3 - Subscription + Entitlements.
- Next Telegram product step: resolve candidates after expiry using later market candles.
- Create shadow results for ignored/rejected candidates while keeping them separate from manually accepted candidates.
- Add history/reporting only after outcome resolution is deterministic and tested.
