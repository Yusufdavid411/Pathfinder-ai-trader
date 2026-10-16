"""Signed execution command and receipt models."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import hmac
from typing import Any


@dataclass(frozen=True)
class ExecutionCommand:
    request_id: str
    candidate_id: str
    telegram_chat_id: int
    mode: str
    stake: Decimal
    asset: str
    direction: str
    expiry_minutes: int
    reference_price: Decimal
    execute_not_before: datetime
    expires_at: datetime
    requested_at: datetime
    status: str
    signature: str

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "ExecutionCommand":
        command = cls(
            request_id=_required_string(payload, "id"),
            candidate_id=_required_string(payload, "candidate_id"),
            telegram_chat_id=_required_integer(payload, "telegram_chat_id"),
            mode=_required_string(payload, "mode"),
            stake=Decimal(str(payload["stake"])),
            asset=_required_string(payload, "asset"),
            direction=_required_string(payload, "direction"),
            expiry_minutes=_required_integer(payload, "expiry_minutes"),
            reference_price=Decimal(str(payload["reference_price"])),
            execute_not_before=_parse_datetime(payload, "execute_not_before"),
            expires_at=_parse_datetime(payload, "expires_at"),
            requested_at=_parse_datetime(payload, "requested_at"),
            status=_required_string(payload, "status"),
            signature=_required_string(payload, "signature"),
        )
        command.validate()
        return command

    def validate(self) -> None:
        if self.mode != "DEMO":
            raise ValueError("The local bridge accepts Demo commands only.")
        if self.direction not in {"BUY", "SELL"}:
            raise ValueError("Direction must be BUY or SELL.")
        if self.stake < Decimal("1") or self.stake > Decimal("10"):
            raise ValueError("Demo stake is outside the $1-$10 safety range.")
        if self.expiry_minutes < 1 or self.expiry_minutes > 15:
            raise ValueError("Expiry is outside the supported Demo range.")
        if self.expires_at <= self.execute_not_before:
            raise ValueError("Execution window is invalid.")

    def canonical_value(self) -> str:
        return "|".join(
            [
                self.request_id,
                self.candidate_id,
                str(self.telegram_chat_id),
                self.mode,
                f"{self.stake:.2f}",
                self.asset,
                self.direction,
                str(self.expiry_minutes),
                _decimal_for_javascript(self.reference_price),
                _javascript_iso(self.execute_not_before),
                _javascript_iso(self.expires_at),
                _javascript_iso(self.requested_at),
            ]
        )

    def verify_signature(self, secret: str) -> bool:
        expected = hmac.new(
            secret.encode("utf-8"),
            self.canonical_value().encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, self.signature)


@dataclass(frozen=True)
class ExecutionReceipt:
    success: bool
    broker_order_id: str | None
    message: str
    account_mode: str = "UNVERIFIED"
    platform_asset: str = ""
    evidence: str = ""


def command_to_extension_payload(command: ExecutionCommand) -> dict[str, Any]:
    """Return only the signed execution fields needed by the browser extension."""
    return {
        "id": command.request_id,
        "candidate_id": command.candidate_id,
        "mode": command.mode,
        "stake": float(command.stake),
        "asset": command.asset,
        "direction": command.direction,
        "expiry_minutes": command.expiry_minutes,
        "reference_price": float(command.reference_price),
        "execute_not_before": _javascript_iso(command.execute_not_before),
        "expires_at": _javascript_iso(command.expires_at),
    }


def _required_string(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value:
        raise ValueError(f"{key} must be a non-empty string.")
    return value


def _required_integer(payload: dict[str, Any], key: str) -> int:
    value = payload.get(key)
    if not isinstance(value, int) or isinstance(value, bool):
        raise ValueError(f"{key} must be an integer.")
    return value


def _parse_datetime(payload: dict[str, Any], key: str) -> datetime:
    value = _required_string(payload, key)
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _javascript_iso(value: datetime) -> str:
    utc = value.astimezone(timezone.utc).isoformat(timespec="milliseconds")
    if utc.endswith("+00:00"):
        return f"{utc[:-6]}Z"
    return utc


def _decimal_for_javascript(value: Decimal) -> str:
    normalized = format(value, "f").rstrip("0").rstrip(".")
    return normalized or "0"
