import argparse
import asyncio
from pathlib import Path

from notification_engine.commands import SUPPORTED_COMMANDS
from notification_engine.config import TelegramSettings
from notification_engine.polling import (
    FilePollingState,
    TelegramPollingBridge,
    process_polling_cycle,
    run_polling_loop,
)
from notification_engine.telegram_bot import TelegramBotResponder
from notification_engine.telegram_transport import TelegramBotApiTransport


def default_state_path() -> Path:
    return Path.cwd() / ".runtime" / "telegram_bot.offset"


def build_bridge(settings: TelegramSettings) -> TelegramPollingBridge:
    if settings.bot_token is None:
        raise SystemExit("TELEGRAM_BOT_TOKEN is missing.")

    return TelegramPollingBridge(
        transport=TelegramBotApiTransport(settings.bot_token),
        responder=TelegramBotResponder(settings.allowed_chat_ids),
    )


async def run_poll_once() -> int:
    settings = TelegramSettings.from_local_environment()
    bridge = build_bridge(settings)
    state = FilePollingState(default_state_path())
    result = await process_polling_cycle(bridge=bridge, state=state)

    if result.next_offset is None:
        print("No Telegram messages to process.")
    else:
        print(f"Processed Telegram messages. Next offset: {result.next_offset}.")

    return 0


async def run_continuously(
    *, interval_seconds: float, max_cycles: int | None = None
) -> int:
    settings = TelegramSettings.from_local_environment()
    bridge = build_bridge(settings)
    state = FilePollingState(default_state_path())

    print("PAT Telegram bot runner started.", flush=True)
    await run_polling_loop(
        bridge=bridge,
        state=state,
        interval_seconds=interval_seconds,
        max_cycles=max_cycles,
    )

    return 0


async def sync_commands() -> int:
    settings = TelegramSettings.from_local_environment()
    if settings.bot_token is None:
        raise SystemExit("TELEGRAM_BOT_TOKEN is missing.")

    transport = TelegramBotApiTransport(settings.bot_token)
    await transport.set_commands(SUPPORTED_COMMANDS)
    print("Telegram command menu synced.")

    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="PAT Telegram notification runner.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("poll-once", help="Run one Telegram polling cycle.")

    run_parser = subparsers.add_parser("run", help="Run continuous Telegram polling.")
    run_parser.add_argument(
        "--interval-seconds",
        type=float,
        default=2.0,
        help="Delay between polling cycles.",
    )
    run_parser.add_argument(
        "--max-cycles",
        type=int,
        default=None,
        help="Optional limit for tests and diagnostics.",
    )

    subparsers.add_parser("sync-commands", help="Sync BotFather command menu.")

    args = parser.parse_args()

    if args.command == "poll-once":
        raise SystemExit(asyncio.run(run_poll_once()))
    if args.command == "run":
        raise SystemExit(
            asyncio.run(
                run_continuously(
                    interval_seconds=args.interval_seconds,
                    max_cycles=args.max_cycles,
                )
            )
        )
    if args.command == "sync-commands":
        raise SystemExit(asyncio.run(sync_commands()))


if __name__ == "__main__":
    main()
