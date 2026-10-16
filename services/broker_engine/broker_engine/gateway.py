"""Localhost gateway between the signed cloud queue and the IQ Option extension."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import secrets
import threading
import time
from typing import Any
from urllib.parse import unquote, urlparse

from .models import ExecutionCommand, ExecutionReceipt, command_to_extension_payload


@dataclass(frozen=True)
class ExtensionStatus:
    account_mode: str
    asset: str
    ready: bool
    page_url: str
    extension_version: str
    seen_at: float


@dataclass(frozen=True)
class PendingExecution:
    token: str
    command: ExecutionCommand


class PracticeExtensionGateway:
    """Coordinates one short-lived command with a verified Practice browser tab."""

    def __init__(self, *, heartbeat_ttl_seconds: float = 5.0) -> None:
        self.heartbeat_ttl_seconds = heartbeat_ttl_seconds
        self._condition = threading.Condition(threading.RLock())
        self._status: ExtensionStatus | None = None
        self._pending: PendingExecution | None = None
        self._receipt: ExecutionReceipt | None = None

    def update_heartbeat(self, payload: dict[str, Any]) -> ExtensionStatus:
        account_mode = _short_string(payload.get("account_mode"), 20)
        asset = _short_string(payload.get("asset"), 100)
        page_url = _short_string(payload.get("page_url"), 500)
        extension_version = _short_string(payload.get("extension_version"), 30)
        ready = payload.get("ready") is True
        parsed = urlparse(page_url)
        if parsed.scheme != "https" or not (
            parsed.hostname == "iqoption.com"
            or (parsed.hostname or "").endswith(".iqoption.com")
        ):
            raise ValueError("Heartbeat did not come from an IQ Option HTTPS page.")
        if account_mode not in {"PRACTICE", "REAL", "UNVERIFIED"}:
            raise ValueError("Unknown IQ Option account mode.")
        if account_mode != "PRACTICE":
            ready = False

        status = ExtensionStatus(
            account_mode=account_mode,
            asset=asset,
            ready=ready,
            page_url=page_url,
            extension_version=extension_version,
            seen_at=time.monotonic(),
        )
        with self._condition:
            self._status = status
            self._condition.notify_all()
        return status

    def status(self) -> ExtensionStatus | None:
        with self._condition:
            return self._status

    def is_ready(self) -> bool:
        with self._condition:
            return bool(
                self._status
                and self._status.ready
                and self._status.account_mode == "PRACTICE"
                and time.monotonic() - self._status.seen_at
                <= self.heartbeat_ttl_seconds
            )

    def pending_payload(self) -> dict[str, Any] | None:
        with self._condition:
            if not self.is_ready() or self._pending is None:
                return None
            return {
                "token": self._pending.token,
                "command": command_to_extension_payload(self._pending.command),
            }

    def execute(
        self,
        command: ExecutionCommand,
        *,
        timeout_seconds: float = 20.0,
    ) -> ExecutionReceipt:
        now = datetime.now(timezone.utc)
        if now < command.execute_not_before:
            return ExecutionReceipt(False, None, "The execution window has not opened.")
        if now > command.expires_at:
            return ExecutionReceipt(False, None, "The candidate expired before IQ Option execution.")
        if not self.is_ready():
            return ExecutionReceipt(
                False,
                None,
                "No verified IQ Option Practice tab is connected to the local bridge.",
            )

        pending = PendingExecution(secrets.token_urlsafe(24), command)
        with self._condition:
            if self._pending is not None:
                return ExecutionReceipt(False, None, "The IQ Option extension is already busy.")
            self._pending = pending
            self._receipt = None
            deadline = min(
                time.monotonic() + timeout_seconds,
                time.monotonic()
                + max(0.0, (command.expires_at - datetime.now(timezone.utc)).total_seconds()),
            )
            while self._receipt is None:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break
                self._condition.wait(timeout=remaining)
            receipt = self._receipt
            self._pending = None
            self._receipt = None

        return receipt or ExecutionReceipt(
            False,
            None,
            "Timed out waiting for a verified IQ Option Practice receipt.",
        )

    def complete(self, token: str, payload: dict[str, Any]) -> ExecutionReceipt:
        with self._condition:
            if self._pending is None or not secrets.compare_digest(
                token, self._pending.token
            ):
                raise ValueError("Unknown or expired local execution token.")

            reported_success = payload.get("success") is True
            account_mode = _short_string(payload.get("account_mode"), 20)
            platform_asset = _short_string(payload.get("platform_asset"), 100)
            broker_order_id = _optional_short_string(
                payload.get("broker_order_id"), 100
            )
            message = _short_string(payload.get("message"), 500)
            evidence = _short_string(payload.get("evidence"), 500)
            success = reported_success and account_mode == "PRACTICE"
            if reported_success and not success:
                message = (
                    "Extension success was rejected because Practice mode was not verified."
                )
                broker_order_id = None

            receipt = ExecutionReceipt(
                success=success,
                broker_order_id=broker_order_id,
                message=message or "IQ Option extension returned no message.",
                account_mode=account_mode or "UNVERIFIED",
                platform_asset=platform_asset,
                evidence=evidence,
            )
            self._receipt = receipt
            self._condition.notify_all()
            return receipt


class PracticeBridgeServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def create_local_server(
    gateway: PracticeExtensionGateway,
    host: str = "127.0.0.1",
    port: int = 8765,
) -> PracticeBridgeServer:
    class Handler(BaseHTTPRequestHandler):
        server_version = "PathfinderPracticeBridge/1"

        def do_OPTIONS(self) -> None:  # noqa: N802
            if not self._allowed_origin():
                self._json(403, {"error": "origin_not_allowed"})
                return
            self.send_response(204)
            self._cors_headers()
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()

        def do_GET(self) -> None:  # noqa: N802
            if not self._request_allowed():
                return
            if self.path == "/health":
                status = gateway.status()
                self._json(
                    200,
                    {
                        "service": "iq_option_practice_bridge",
                        "extension_ready": gateway.is_ready(),
                        "account_mode": status.account_mode if status else "UNVERIFIED",
                        "real_execution_enabled": False,
                    },
                )
                return
            if self.path == "/v1/executions/pending":
                payload = gateway.pending_payload()
                if payload is None:
                    self.send_response(204)
                    self._cors_headers()
                    self.end_headers()
                else:
                    self._json(200, payload)
                return
            self._json(404, {"error": "not_found"})

        def do_POST(self) -> None:  # noqa: N802
            if not self._request_allowed():
                return
            try:
                payload = self._read_json()
                if self.path == "/v1/extension/heartbeat":
                    status = gateway.update_heartbeat(payload)
                    self._json(
                        200,
                        {
                            "accepted": True,
                            "ready": status.ready,
                            "real_execution_enabled": False,
                        },
                    )
                    return
                prefix = "/v1/executions/"
                suffix = "/complete"
                if self.path.startswith(prefix) and self.path.endswith(suffix):
                    token = unquote(self.path[len(prefix) : -len(suffix)])
                    gateway.complete(token, payload)
                    self._json(200, {"accepted": True})
                    return
                self._json(404, {"error": "not_found"})
            except (ValueError, json.JSONDecodeError) as error:
                self._json(400, {"error": str(error)})

        def log_message(self, format: str, *args: object) -> None:
            del format, args

        def _request_allowed(self) -> bool:
            host_header = self.headers.get("Host", "").split(":", 1)[0].lower()
            if host_header not in {"127.0.0.1", "localhost"}:
                self._json(403, {"error": "host_not_allowed"})
                return False
            if not self._allowed_origin():
                self._json(403, {"error": "origin_not_allowed"})
                return False
            return True

        def _allowed_origin(self) -> bool:
            origin = self.headers.get("Origin")
            return origin is None or origin.startswith("chrome-extension://")

        def _read_json(self) -> dict[str, Any]:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 16_384:
                raise ValueError("Request body is missing or too large.")
            value = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(value, dict):
                raise ValueError("Request body must be a JSON object.")
            return value

        def _cors_headers(self) -> None:
            origin = self.headers.get("Origin")
            if origin and origin.startswith("chrome-extension://"):
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
            self.send_header("Cache-Control", "no-store")

        def _json(self, status: int, payload: dict[str, Any]) -> None:
            raw = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self._cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

    return PracticeBridgeServer((host, port), Handler)


def _short_string(value: Any, maximum: int) -> str:
    return value.strip()[:maximum] if isinstance(value, str) else ""


def _optional_short_string(value: Any, maximum: int) -> str | None:
    result = _short_string(value, maximum)
    return result or None
