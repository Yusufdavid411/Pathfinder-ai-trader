# Firebase Functions

Cloud Functions source for the live PathFinder Telegram product.

## Deployed Functions

- `telegramWebhook` - receives Telegram messages and callbacks, performs live
  scans, saves candidates, updates per-chat controls, and queues accepted Demo
  requests.
- `syncTelegramCommandMenu` - protected administrative endpoint for publishing
  the supported Telegram command list.
- `bridgeClaimExecution` - protected endpoint through which the local Demo
  bridge claims one signed eligible request.
- `bridgeCompleteExecution` - protected endpoint that records a single-use
  completion and sends the Telegram receipt.

## Stored State

- `signals/{signalId}` - presented candidate, immutable user decision, and Demo
  execution lifecycle.
- `telegram_trading_controls/{chatId}` - mode, stake, arm/disarm, emergency
  stop, active request, and daily limit.
- `execution_requests/{candidateId}` - HMAC-signed idempotent execution request.
- `system_runtime/broker_bridge` - local bridge heartbeat.

Firestore clients are denied access to these collections. The Functions runtime
uses its Cloud Datastore User IAM role through Firebase Admin.

## Required Secrets

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ALLOWED_CHAT_IDS`
- `TWELVE_DATA_API_KEY`
- `ALPHA_VANTAGE_API_KEY`

The current bridge is a Pathfinder local Demo simulator. These functions never
store IQ Option credentials or allow an IQ Option Demo/Real order.

## Verify

```powershell
npm.cmd --prefix firebase/functions test
```
