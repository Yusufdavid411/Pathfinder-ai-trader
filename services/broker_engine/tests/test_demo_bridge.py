from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
import hashlib
import hmac
import json
import threading
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import pytest

from broker_engine.adapters import IqOptionExecutionLockedAdapter, IqOptionPracticeAdapter
from broker_engine.gateway import PracticeExtensionGateway, create_local_server
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


def practice_heartbeat(gateway: PracticeExtensionGateway) -> None:
    gateway.update_heartbeat(
        {
            "account_mode": "PRACTICE",
            "asset": "EUR/USD",
            "ready": True,
            "page_url": "https://iqoption.com/traderoom",
            "extension_version": "0.2.0",
        }
    )


def test_signed_demo_command_reaches_verified_practice_extension() -> None:
    command = make_command()
    gateway = PracticeExtensionGateway()
    practice_heartbeat(gateway)
    result: list[object] = []

    worker = threading.Thread(
        target=lambda: result.append(IqOptionPracticeAdapter(gateway).execute(command))
    )
    worker.start()
    deadline = time.monotonic() + 1
    pending = None
    while pending is None and time.monotonic() < deadline:
        pending = gateway.pending_payload()
        time.sleep(0.01)
    assert pending is not None
    gateway.complete(
        pending["token"],
        {
            "success": True,
            "broker_order_id": "iq-practice-42",
            "message": "Position opened.",
            "account_mode": "PRACTICE",
            "platform_asset": "EUR/USD",
            "evidence": "New open position row.",
        },
    )
    worker.join(timeout=1)

    assert command.verify_signature("test-secret") is True
    receipt = result[0]
    assert receipt.success is True
    assert receipt.broker_order_id == "iq-practice-42"
    assert receipt.account_mode == "PRACTICE"


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

    gateway = PracticeExtensionGateway()
    practice_heartbeat(gateway)
    receipt = IqOptionPracticeAdapter(gateway).execute(command)
    assert receipt.success is False
    assert "expired" in receipt.message.lower()


def test_iq_option_adapter_is_explicitly_locked() -> None:
    receipt = IqOptionExecutionLockedAdapter().execute(make_command())

    assert receipt.success is False
    assert "locked" in receipt.message


def test_real_account_heartbeat_can_never_arm_the_gateway() -> None:
    gateway = PracticeExtensionGateway()
    gateway.update_heartbeat(
        {
            "account_mode": "REAL",
            "asset": "EUR/USD",
            "ready": True,
            "page_url": "https://iqoption.com/traderoom",
            "extension_version": "0.2.0",
        }
    )

    assert gateway.is_ready() is False


def test_extension_success_without_practice_proof_is_rejected() -> None:
    command = make_command()
    gateway = PracticeExtensionGateway()
    practice_heartbeat(gateway)
    result: list[object] = []
    worker = threading.Thread(target=lambda: result.append(gateway.execute(command)))
    worker.start()
    deadline = time.monotonic() + 1
    pending = None
    while pending is None and time.monotonic() < deadline:
        pending = gateway.pending_payload()
        time.sleep(0.01)
    assert pending is not None
    gateway.complete(
        pending["token"],
        {
            "success": True,
            "message": "Claimed success",
            "account_mode": "REAL",
            "platform_asset": "EUR/USD",
        },
    )
    worker.join(timeout=1)

    receipt = result[0]
    assert receipt.success is False
    assert receipt.broker_order_id is None
    assert "rejected" in receipt.message.lower()


def test_local_server_accepts_extension_heartbeat_and_rejects_web_origins() -> None:
    gateway = PracticeExtensionGateway()
    server = create_local_server(gateway, port=0)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    base_url = f"http://127.0.0.1:{server.server_port}"
    body = json.dumps(
        {
            "account_mode": "PRACTICE",
            "asset": "EUR/USD",
            "ready": True,
            "page_url": "https://iqoption.com/traderoom",
            "extension_version": "0.2.0",
        }
    ).encode("utf-8")
    try:
        request = Request(
            f"{base_url}/v1/extension/heartbeat",
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Origin": "chrome-extension://pathfinder-test",
            },
            data=body,
        )
        with urlopen(request, timeout=2) as response:
            assert response.status == 200
        assert gateway.is_ready() is True

        blocked = Request(
            f"{base_url}/v1/extension/heartbeat",
            method="POST",
            headers={"Content-Type": "application/json", "Origin": "https://evil.test"},
            data=body,
        )
        with pytest.raises(HTTPError) as error:
            urlopen(blocked, timeout=2)
        assert error.value.code == 403
    finally:
        server.shutdown()
        server.server_close()
        worker.join(timeout=1)
