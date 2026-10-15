import pytest

from notification_engine.polling import (
    FilePollingState,
    TelegramPollingBridge,
    next_offset,
    process_polling_cycle,
    run_polling_loop,
)
from notification_engine.telegram_bot import TelegramBotResponder


class FakeTelegramTransport:
    def __init__(self) -> None:
        self.sent_texts: list[str] = []
        self.offsets: list[int | None] = []

    async def get_updates(
        self, *, offset: int | None = None, timeout: int = 0
    ) -> list[dict]:
        self.offsets.append(offset)
        return [
            {
                "update_id": 10,
                "message": {
                    "chat": {"id": 42, "type": "private"},
                    "text": "/status",
                },
            }
        ]

    async def send_message(self, message) -> None:
        self.sent_texts.append(message.text)


def test_next_offset_advances_past_latest_update() -> None:
    assert next_offset([{"update_id": 4}, {"update_id": 9}]) == 10


def test_next_offset_is_empty_for_no_updates() -> None:
    assert next_offset([]) is None


@pytest.mark.anyio
async def test_polling_bridge_replies_to_updates() -> None:
    transport = FakeTelegramTransport()
    bridge = TelegramPollingBridge(
        transport=transport,
        responder=TelegramBotResponder(allowed_chat_ids=frozenset({42})),
    )

    offset = await bridge.process_once()

    assert offset == 11
    assert transport.sent_texts == [
        (
            "PAT status: build mode.\n"
            "Telegram runner: online when local polling is active.\n"
            "Market reading: foundation pending.\n"
            "Signals: not enabled yet.\n"
            "IQ Option execution: disabled by compliance gate."
        )
    ]


def test_file_polling_state_returns_empty_for_missing_file(tmp_path) -> None:
    state = FilePollingState(tmp_path / "telegram_bot.offset")

    assert state.load() is None


def test_file_polling_state_saves_offset(tmp_path) -> None:
    state = FilePollingState(tmp_path / ".runtime" / "telegram_bot.offset")

    state.save(34)

    assert state.load() == 34


@pytest.mark.anyio
async def test_polling_cycle_persists_next_offset(tmp_path) -> None:
    transport = FakeTelegramTransport()
    bridge = TelegramPollingBridge(
        transport=transport,
        responder=TelegramBotResponder(allowed_chat_ids=frozenset({42})),
    )
    state = FilePollingState(tmp_path / "telegram_bot.offset")

    result = await process_polling_cycle(bridge=bridge, state=state)

    assert result.previous_offset is None
    assert result.next_offset == 11
    assert state.load() == 11


@pytest.mark.anyio
async def test_polling_loop_reuses_saved_offset(tmp_path) -> None:
    transport = FakeTelegramTransport()
    bridge = TelegramPollingBridge(
        transport=transport,
        responder=TelegramBotResponder(allowed_chat_ids=frozenset({42})),
    )
    state = FilePollingState(tmp_path / "telegram_bot.offset")

    await run_polling_loop(
        bridge=bridge,
        state=state,
        interval_seconds=0,
        max_cycles=2,
    )

    assert transport.offsets == [None, 11]
