from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
import hashlib
import hmac

import pytest

from broker_engine.adapters import IqOptionExecutionLockedAdapter, PathfinderDemoAdapter
from broker_engine.models import ExecutionCommand


def make_command(**changes: object) -> ExecutionCommand:
    now = datetime.now(timezone.utc)
    values: dict[str, object] = {
        "request_id": "candidate-123",
        "candidate_id": "candidate-123",
        "telegram_chat_id": 42,
        "mode": "DEMO",
        "stake": Decimal("1.00"),
        "asset": "EUR/USD",
        "direction": "BUY",
        "expiry_minutes": 2,
        "reference_price": Decimal("1.10234"),
        "execute_not_before": now - timedelta(seconds=1),
        "expires_at": now + timedelta(minutes=1),
        "requested_at": now - timedelta(seconds=30),
        "status": "claimed",
        "signature": "pending",
    }
    values.update(changes)
    command = ExecutionCommand(**values)  # type: ignore[arg-type]
    signature = hmac.new(
        b"test-secret",
        command.canonical_value().encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return ExecutionCommand(**{**command.__dict__, "signature": signature})


def test_signed_demo_command_executes_only_in_the_local_simulator() -> None:
    command = make_command()

    assert command.verify_signature("test-secret") is True
    receipt = PathfinderDemoAdapter().execute(command)
    assert receipt.success is True
    assert receipt.broker_order_id is not None
    assert receipt.broker_order_id.startswith("pat-demo-")


def test_signature_detects_execution_field_tampering() -> None:
    command = make_command()
    changed = ExecutionCommand(**{**command.__dict__, "stake": Decimal("10")})

    assert changed.verify_signature("test-secret") is False


def test_real_commands_are_rejected_during_parsing() -> None:
    command = make_command(mode="REAL")

    with pytest.raises(ValueError, match="Demo commands only"):
        command.validate()


def test_expired_demo_command_fails_closed() -> None:
    now = datetime.now(timezone.utc)
    command = make_command(
        execute_not_before=now - timedelta(minutes=2),
        expires_at=now - timedelta(minutes=1),
    )

    receipt = PathfinderDemoAdapter().execute(command)
    assert receipt.success is False
    assert "expired" in receipt.message.lower()


def test_iq_option_adapter_is_explicitly_locked() -> None:
    receipt = IqOptionExecutionLockedAdapter().execute(make_command())

    assert receipt.success is False
    assert "authorized broker integration" in receipt.message
