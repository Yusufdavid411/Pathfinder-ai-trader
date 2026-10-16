import pytest

from notification_engine.messages import ManualReviewAlert, TelegramMessage
from notification_engine.messages import render_manual_review_alert
from notification_engine.telegram_bot import (
    IncomingTelegramMessage,
    TelegramBotResponder,
    TelegramNotificationService,
)
from notification_engine.telegram_transport import extract_incoming_messages


class FakeTransport:
    def __init__(self) -> None:
        self.sent_messages: list[TelegramMessage] = []

    async def send_message(self, message: TelegramMessage) -> None:
        self.sent_messages.append(message)


def test_start_command_explains_telegram_role_without_execution() -> None:
    responder = TelegramBotResponder()

    response = responder.respond(IncomingTelegramMessage(chat_id=1001, text="/start"))

    assert "Telegram is the first PAT control surface" in response.text
    assert "IQ Option auto-execution is disabled" in response.text


def test_status_command_keeps_iq_option_execution_disabled() -> None:
    responder = TelegramBotResponder()

    response = responder.respond(IncomingTelegramMessage(chat_id=1001, text="/status"))

    assert "Telegram runner: online when local polling is active" in response.text
    assert "Market reading: foundation pending" in response.text
    assert "IQ Option execution: disabled by compliance gate" in response.text


def test_help_command_lists_real_pat_commands() -> None:
    responder = TelegramBotResponder()

    response = responder.respond(IncomingTelegramMessage(chat_id=1001, text="/help"))

    assert "/scan - Scan for candidate trade setups" in response.text
    assert "/watchlist - Show the current watchlist" in response.text
    assert "/market_status - Show market-reader status" in response.text
    assert "/arm - Arm approval-based Demo execution" in response.text
    assert "/emergency_stop - Stop and disarm execution" in response.text
    assert "/execution_status - Show controls and bridge status" in response.text
    assert "/signals - Show signal engine status" in response.text


def test_scan_command_refuses_to_fabricate_trade_recommendations() -> None:
    responder = TelegramBotResponder()

    response = responder.respond(IncomingTelegramMessage(chat_id=1001, text="/scan"))

    assert "Scanner button: connected" in response.text
    assert "Live market data: not connected yet" in response.text
    assert "PAT will not fabricate BUY/SELL signals" in response.text


def test_signal_command_refuses_to_fabricate_signals() -> None:
    responder = TelegramBotResponder()

    response = responder.respond(IncomingTelegramMessage(chat_id=1001, text="/signals"))

    assert "Signals: not enabled yet" in response.text
    assert "PAT will never fabricate signals" in response.text


def test_compliance_command_blocks_unofficial_execution() -> None:
    responder = TelegramBotResponder()

    response = responder.respond(IncomingTelegramMessage(chat_id=1001, text="/compliance"))

    assert "IQ Option auto-execution is disabled" in response.text
    assert "unofficial execution paths" in response.text


def test_private_bot_rejects_unapproved_chat() -> None:
    responder = TelegramBotResponder(allowed_chat_ids=frozenset({42}))

    response = responder.respond(IncomingTelegramMessage(chat_id=7, text="/start"))

    assert response.text == "Access denied. This PAT bot is private."


def test_manual_review_alert_never_claims_execution() -> None:
    text = render_manual_review_alert(
        ManualReviewAlert(
            asset="EUR/USD",
            market_state="WATCH",
            quality_score=82,
            confidence_label="Moderate",
            reason="Cleaner conditions than the previous observation window.",
        )
    )

    assert "Action: Manual review required." in text
    assert "Execution: Disabled" in text
    assert "BUY" not in text
    assert "SELL" not in text


@pytest.mark.anyio
async def test_notification_service_uses_transport_boundary() -> None:
    transport = FakeTransport()
    service = TelegramNotificationService(transport)
    message = TelegramMessage(chat_id=1001, text="PAT Market Watch")

    await service.send(message)

    assert transport.sent_messages == [message]


def test_extract_incoming_messages_reads_text_messages_only() -> None:
    messages = extract_incoming_messages(
        [
            {
                "update_id": 1,
                "message": {
                    "chat": {"id": 7383744468, "type": "private"},
                    "text": "/status",
                },
            },
            {"update_id": 2, "message": {"chat": {"id": 99}, "photo": []}},
        ]
    )

    assert messages == [
        IncomingTelegramMessage(chat_id=7383744468, text="/status")
    ]
