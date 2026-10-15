import httpx

from notification_engine.commands import BotCommand
from notification_engine.messages import TelegramMessage
from notification_engine.telegram_bot import IncomingTelegramMessage


class TelegramTransportError(Exception):
    """Raised when Telegram delivery fails."""


class TelegramBotApiTransport:
    def __init__(self, bot_token: str, base_url: str = "https://api.telegram.org") -> None:
        if not bot_token:
            raise ValueError("Telegram bot token is required.")

        self._send_message_url = f"{base_url}/bot{bot_token}/sendMessage"
        self._get_updates_url = f"{base_url}/bot{bot_token}/getUpdates"
        self._set_commands_url = f"{base_url}/bot{bot_token}/setMyCommands"

    async def send_message(self, message: TelegramMessage) -> None:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                self._send_message_url,
                json={
                    "chat_id": message.chat_id,
                    "text": message.text,
                    "disable_web_page_preview": True,
                },
            )

        if response.status_code >= 400:
            raise TelegramTransportError(
                f"Telegram sendMessage failed with {response.status_code}."
            )

    async def get_updates(
        self, *, offset: int | None = None, timeout: int = 0
    ) -> list[dict]:
        payload: dict[str, object] = {
            "timeout": timeout,
            "allowed_updates": ["message"],
        }
        if offset is not None:
            payload["offset"] = offset

        async with httpx.AsyncClient(timeout=timeout + 10) as client:
            response = await client.post(self._get_updates_url, json=payload)

        if response.status_code >= 400:
            raise TelegramTransportError(
                f"Telegram getUpdates failed with {response.status_code}."
            )

        data = response.json()
        if not data.get("ok"):
            raise TelegramTransportError("Telegram getUpdates returned an error.")

        return list(data.get("result", []))

    async def set_commands(self, commands: tuple[BotCommand, ...]) -> None:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                self._set_commands_url,
                json={
                    "commands": [
                        {
                            "command": command.name,
                            "description": command.description,
                        }
                        for command in commands
                    ]
                },
            )

        if response.status_code >= 400:
            raise TelegramTransportError(
                f"Telegram setMyCommands failed with {response.status_code}."
            )

        data = response.json()
        if not data.get("ok"):
            raise TelegramTransportError("Telegram setMyCommands returned an error.")


def extract_incoming_messages(updates: list[dict]) -> list[IncomingTelegramMessage]:
    messages: list[IncomingTelegramMessage] = []

    for update in updates:
        message = update.get("message")
        if not isinstance(message, dict):
            continue

        chat = message.get("chat")
        text = message.get("text")
        if not isinstance(chat, dict) or not isinstance(text, str):
            continue

        chat_id = chat.get("id")
        if not isinstance(chat_id, int):
            continue

        messages.append(IncomingTelegramMessage(chat_id=chat_id, text=text))

    return messages
