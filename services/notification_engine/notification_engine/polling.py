import asyncio
from dataclasses import dataclass
from pathlib import Path

from notification_engine.telegram_bot import TelegramBotResponder
from notification_engine.telegram_transport import (
    TelegramBotApiTransport,
    extract_incoming_messages,
)


def next_offset(updates: list[dict]) -> int | None:
    update_ids = [
        update["update_id"]
        for update in updates
        if isinstance(update.get("update_id"), int)
    ]

    if not update_ids:
        return None

    return max(update_ids) + 1


class TelegramPollingBridge:
    def __init__(
        self,
        *,
        transport: TelegramBotApiTransport,
        responder: TelegramBotResponder,
    ) -> None:
        self._transport = transport
        self._responder = responder

    async def process_once(self, *, offset: int | None = None) -> int | None:
        updates = await self._transport.get_updates(offset=offset)

        for incoming in extract_incoming_messages(updates):
            response = self._responder.respond(incoming)
            await self._transport.send_message(response)

        return next_offset(updates)


@dataclass(frozen=True)
class PollingCycleResult:
    previous_offset: int | None
    next_offset: int | None


class FilePollingState:
    def __init__(self, path: Path) -> None:
        self._path = path

    def load(self) -> int | None:
        if not self._path.exists():
            return None

        value = self._path.read_text(encoding="utf-8").strip()
        if not value:
            return None

        try:
            return int(value)
        except ValueError:
            return None

    def save(self, offset: int | None) -> None:
        if offset is None:
            return

        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(str(offset), encoding="utf-8")


async def process_polling_cycle(
    *,
    bridge: TelegramPollingBridge,
    state: FilePollingState,
) -> PollingCycleResult:
    previous_offset = state.load()
    next_update_offset = await bridge.process_once(offset=previous_offset)
    state.save(next_update_offset)

    return PollingCycleResult(
        previous_offset=previous_offset,
        next_offset=next_update_offset,
    )


async def run_polling_loop(
    *,
    bridge: TelegramPollingBridge,
    state: FilePollingState,
    interval_seconds: float,
    max_cycles: int | None = None,
) -> None:
    completed_cycles = 0

    while max_cycles is None or completed_cycles < max_cycles:
        await process_polling_cycle(bridge=bridge, state=state)
        completed_cycles += 1

        if max_cycles is not None and completed_cycles >= max_cycles:
            return

        await asyncio.sleep(interval_seconds)
