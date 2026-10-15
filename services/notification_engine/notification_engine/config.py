from dataclasses import dataclass
import os
from pathlib import Path


def load_local_env(path: Path) -> None:
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8-sig").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def find_repo_env_file(start: Path | None = None) -> Path | None:
    current = (start or Path.cwd()).resolve()

    for path in [current, *current.parents]:
        candidate = path / ".env.local"
        if candidate.exists():
            return candidate

    return None


@dataclass(frozen=True)
class TelegramSettings:
    bot_token: str | None
    allowed_chat_ids: frozenset[int]

    @classmethod
    def from_environment(cls) -> "TelegramSettings":
        raw_chat_ids = os.getenv("TELEGRAM_ALLOWED_CHAT_IDS", "")
        chat_ids = frozenset(
            int(value.strip())
            for value in raw_chat_ids.split(",")
            if value.strip().lstrip("-").isdigit()
        )

        return cls(
            bot_token=os.getenv("TELEGRAM_BOT_TOKEN"),
            allowed_chat_ids=chat_ids,
        )

    @classmethod
    def from_local_environment(cls, start: Path | None = None) -> "TelegramSettings":
        env_file = find_repo_env_file(start)
        if env_file is not None:
            load_local_env(env_file)

        return cls.from_environment()
