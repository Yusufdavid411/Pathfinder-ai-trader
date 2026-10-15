from dataclasses import dataclass
from typing import Protocol

from notification_engine.commands import DEFAULT_WATCHLIST, command_menu_text
from notification_engine.messages import TelegramMessage


class MessageTransport(Protocol):
    async def send_message(self, message: TelegramMessage) -> None:
        """Send a Telegram message through a transport implementation."""


@dataclass(frozen=True)
class IncomingTelegramMessage:
    chat_id: int
    text: str


class TelegramBotResponder:
    def __init__(self, allowed_chat_ids: frozenset[int] | None = None) -> None:
        self._allowed_chat_ids = allowed_chat_ids or frozenset()

    def respond(self, incoming: IncomingTelegramMessage) -> TelegramMessage:
        if self._allowed_chat_ids and incoming.chat_id not in self._allowed_chat_ids:
            return TelegramMessage(
                chat_id=incoming.chat_id,
                text="Access denied. This PAT bot is private.",
            )

        command = incoming.text.strip().lower()

        if command == "/start":
            return TelegramMessage(
                chat_id=incoming.chat_id,
                text=(
                    "Welcome to PathFinder AI Trader.\n"
                    "Telegram is the first PAT control surface for alerts, manual review, "
                    "and shadow-trading updates.\n"
                    "IQ Option auto-execution is disabled.\n"
                    "Send /help to see what I can do."
                ),
            )

        if command == "/status":
            return TelegramMessage(
                chat_id=incoming.chat_id,
                text=(
                    "PAT status: build mode.\n"
                    "Telegram runner: online when local polling is active.\n"
                    "Market reading: foundation pending.\n"
                    "Signals: not enabled yet.\n"
                    "IQ Option execution: disabled by compliance gate."
                ),
            )

        if command == "/scan":
            return TelegramMessage(
                chat_id=incoming.chat_id,
                text=(
                    "PAT Market Scan\n"
                    "Scanner button: connected.\n"
                    "Live market data: not connected yet.\n"
                    "Trade recommendation: unavailable until a verified data provider, "
                    "market-quality checks, confidence scoring, and risk gates are active.\n"
                    "PAT will not fabricate BUY/SELL signals."
                ),
            )

        if command == "/help":
            return TelegramMessage(
                chat_id=incoming.chat_id,
                text=command_menu_text(),
            )

        if command == "/watchlist":
            return TelegramMessage(
                chat_id=incoming.chat_id,
                text="\n".join(
                    [
                        "PAT Watchlist",
                        *[f"- {asset}" for asset in DEFAULT_WATCHLIST],
                        "Market data is not connected yet.",
                    ]
                ),
            )

        if command == "/market_status":
            return TelegramMessage(
                chat_id=incoming.chat_id,
                text=(
                    "Market Reader Status\n"
                    "Data source: not connected yet.\n"
                    "Observer Engine: pending Stage 6.\n"
                    "Market Quality: pending Stage 8.\n"
                    "Current action: build market data foundation next."
                ),
            )

        if command == "/risk":
            return TelegramMessage(
                chat_id=incoming.chat_id,
                text=(
                    "Risk Gate Status\n"
                    "Execution allowed: no.\n"
                    "Auto mode: off.\n"
                    "Capital protection: enforced by design.\n"
                    "Full Risk Engine: pending Stage 11."
                ),
            )

        if command == "/mode":
            return TelegramMessage(
                chat_id=incoming.chat_id,
                text=(
                    "Trading Mode\n"
                    "Current mode: Signal/manual-review only.\n"
                    "Semi-automatic: unavailable.\n"
                    "Automatic: unavailable.\n"
                    "IQ Option execution: disabled."
                ),
            )

        if command == "/compliance":
            return TelegramMessage(
                chat_id=incoming.chat_id,
                text=(
                    "Compliance Gate\n"
                    "IQ Option auto-execution is disabled.\n"
                    "PAT will not log in to IQ Option, click trade buttons, or use unofficial "
                    "execution paths.\n"
                    "Broker execution requires a compliant adapter, completed risk controls, "
                    "audit logs, and explicit user opt-in."
                ),
            )

        if command == "/signals":
            return TelegramMessage(
                chat_id=incoming.chat_id,
                text=(
                    "Signal Engine Status\n"
                    "Signals: not enabled yet.\n"
                    "Reason: market data, observer, quality, confidence, and risk layers must "
                    "be built first.\n"
                    "PAT will never fabricate signals or guaranteed results."
                ),
            )

        return TelegramMessage(
            chat_id=incoming.chat_id,
            text="Command not recognized. Send /help to see available commands.",
        )


class TelegramNotificationService:
    def __init__(self, transport: MessageTransport) -> None:
        self._transport = transport

    async def send(self, message: TelegramMessage) -> None:
        await self._transport.send_message(message)
