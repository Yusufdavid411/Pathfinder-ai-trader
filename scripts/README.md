# Scripts

Repository automation scripts live here.

## Telegram Bot

- `start_telegram_bot.ps1` starts the local PAT Telegram polling runner.
- `telegram_bot_status.ps1` checks whether the local runner is active.
- `stop_telegram_bot.ps1` stops the local runner.
- `register_telegram_webhook.ps1` points Telegram to the deployed Firebase
  webhook.
- `check_telegram_webhook.ps1` reads Telegram's current webhook status.

These scripts read Telegram settings from the repository `.env.local` file. They
do not print or store the bot token in source-controlled files.

## IQ Option Practice Execution Bridge

- `start_demo_bridge.ps1` starts the signed local IQ Option Practice bridge.
- `demo_bridge_status.ps1` checks whether the Practice bridge is active.
- `stop_demo_bridge.ps1` stops the Practice bridge.

The bridge reads `TELEGRAM_WEBHOOK_SECRET` from `.env.local` and listens only on
`127.0.0.1:8765` for the Chrome extension. Real-account execution is locked.
