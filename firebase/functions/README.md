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

Required Firebase secrets:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ALLOWED_CHAT_IDS`

This function must not place trades, automate IQ Option, or store broker
credentials.
