# Notification Engine

Notification and conversational channel boundary for PathFinder AI Trader.

## Telegram-First Scope

Telegram is the first lightweight user interface for PAT, but it is not the trading engine.

This service can:

- Reply to basic Telegram commands.
- Run as a continuous local Telegram polling service.
- Sync the Telegram command menu through the Bot API.
- Send market-watch and manual-review messages.
- Explain that execution is disabled until a compliant broker path exists.
- Keep Telegram integration behind a transport interface.

This service must not:

- Log in to IQ Option.
- Click or automate the IQ Option website.
- Place, close, or modify trades.
- Store broker credentials.
- Claim guaranteed profits.

## Manual Setup Required

Create a Telegram bot with BotFather and set:

```bash
TELEGRAM_BOT_TOKEN=your-token
TELEGRAM_ALLOWED_CHAT_IDS=123456789,987654321
```

The token must stay outside source control.

## Commands

- `/start` - Start PathFinder AI Trader.
- `/status` - Show current system status.
- `/help` - Show available commands.
- `/watchlist` - Show the current placeholder watchlist.
- `/market_status` - Show market-reader readiness.
- `/risk` - Show risk gate status.
- `/mode` - Show the current allowed trading mode.
- `/compliance` - Show the broker execution compliance gate.
- `/signals` - Show signal-engine readiness.

## Local Runner

From the repository root:

```powershell
.\scripts\start_telegram_bot.ps1
.\scripts\telegram_bot_status.ps1
.\scripts\stop_telegram_bot.ps1
```

The runner stores local process state and Telegram update offsets under
`services/notification_engine/.runtime/`, which is ignored by Git.

To sync the Telegram command menu:

```powershell
.\.venv\Scripts\python.exe -m notification_engine.cli sync-commands
```

Run that command from `services/notification_engine`.
