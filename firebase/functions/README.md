# Firebase Functions

Cloud Functions source and deployment configuration for PathFinder AI Trader.

## Telegram Webhook

`telegramWebhook` receives Telegram updates through HTTPS and replies with PAT
commands. It replaces the local laptop polling runner when deployed and
registered with Telegram.

Current deployed URL:

```text
https://telegramwebhook-anp4du33za-uc.a.run.app
```

Current verification:

- Deployed to Firebase project `pathfinder-ai-trader`.
- Registered as the Telegram webhook.
- Telegram webhook status reports no last error.
- Phone `/status` verification replied with cloud webhook mode.

## Candidate Decision Tracking

The current source adds the next Telegram product slice:

- Successful `/scan` candidates are saved to `signals/{signalId}` in Firestore.
- Candidate cards include Taken, Ignored, and Rejected buttons.
- Decisions are bound to the Telegram chat that received the candidate.
- A Firestore transaction preserves the first decision and rejects later
  overwrites.
- Ignored and rejected candidates are marked for later shadow-outcome
  resolution.
- Broker execution remains disabled and is explicitly stored as `false`.

This candidate-tracking update is implemented and tested locally but must be
deployed before it is available through the live Telegram webhook.

Required Firebase secrets:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ALLOWED_CHAT_IDS`

This function must not place trades, automate IQ Option, or store broker
credentials.
