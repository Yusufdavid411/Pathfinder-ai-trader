from dataclasses import dataclass


@dataclass(frozen=True)
class BotCommand:
    name: str
    description: str


SUPPORTED_COMMANDS: tuple[BotCommand, ...] = (
    BotCommand("start", "Start PathFinder AI Trader"),
    BotCommand("scan", "Scan for candidate trade setups"),
    BotCommand("status", "Show current system status"),
    BotCommand("help", "Show available commands"),
    BotCommand("watchlist", "Show the current watchlist"),
    BotCommand("market_status", "Show market-reader status"),
    BotCommand("risk", "Show risk gate status"),
    BotCommand("mode", "Show current trading mode"),
    BotCommand("compliance", "Show execution compliance gate"),
    BotCommand("signals", "Show signal engine status"),
)


DEFAULT_WATCHLIST: tuple[str, ...] = (
    "EUR/USD",
    "GBP/USD",
    "USD/JPY",
    "AUD/USD",
    "EUR/JPY",
)


def command_menu_text() -> str:
    return "\n".join(
        ["Available commands:"]
        + [f"/{command.name} - {command.description}" for command in SUPPORTED_COMMANDS]
    )
