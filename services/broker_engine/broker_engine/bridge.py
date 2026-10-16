"""Firebase execution-queue client for the IQ Option Practice extension."""

from __future__ import annotations

from dataclasses import dataclass
import json
import os
from pathlib import Path
import platform
import threading
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .adapters import IqOptionPracticeAdapter
from .gateway import PracticeExtensionGateway, create_local_server
from .models import ExecutionCommand, ExecutionReceipt


@dataclass(frozen=True)
class BridgeConfig:
    bridge_secret: str
    claim_url: str
    complete_url: str
    bridge_id: str
    poll_interval_seconds: float = 2.0
    local_host: str = "127.0.0.1"
    local_port: int = 8765

    @classmethod
    def load(cls, repo_root: Path | None = None) -> "BridgeConfig":
        root = repo_root or Path(__file__).resolve().parents[3]
        values = _load_environment(root / ".env.local")
        project_id = values.get("FIREBASE_PROJECT_ID") or _firebase_project_id(root)
        secret = values.get("TELEGRAM_WEBHOOK_SECRET")
        if not secret:
            raise RuntimeError("TELEGRAM_WEBHOOK_SECRET is required in .env.local.")

        base_url = f"https://us-central1-{project_id}.cloudfunctions.net"
        return cls(
            bridge_secret=secret,
            claim_url=values.get(
                "PAT_BRIDGE_CLAIM_URL", f"{base_url}/bridgeClaimExecution"
            ),
            complete_url=values.get(
                "PAT_BRIDGE_COMPLETE_URL", f"{base_url}/bridgeCompleteExecution"
            ),
            bridge_id=values.get(
                "PAT_BRIDGE_ID", f"pathfinder-iq-practice-{platform.node()}"
            ),
            poll_interval_seconds=float(values.get("PAT_BRIDGE_POLL_SECONDS", "2")),
            local_host="127.0.0.1",
            local_port=int(values.get("PAT_BRIDGE_LOCAL_PORT", "8765")),
        )


class PracticeExecutionBridge:
    def __init__(
        self,
        config: BridgeConfig,
        gateway: PracticeExtensionGateway | None = None,
        adapter: IqOptionPracticeAdapter | None = None,
    ) -> None:
        self.config = config
        self.gateway = gateway or PracticeExtensionGateway()
        self.adapter = adapter or IqOptionPracticeAdapter(self.gateway)

    def run_once(self) -> bool:
        if not self.gateway.is_ready():
            return False
        claimed = self._post(
            self.config.claim_url,
            {
                "bridge_id": self.config.bridge_id,
                "executor": "IQ_OPTION_PRACTICE_EXTENSION",
                "account_mode": "PRACTICE",
                "extension_ready": True,
            },
            allow_no_content=True,
        )
        if claimed is None:
            return False

        claim_token = claimed.get("claim_token")
        request_payload = claimed.get("request")
        if not isinstance(claim_token, str) or not isinstance(request_payload, dict):
            raise RuntimeError("Bridge claim response is malformed.")

        receipt: ExecutionReceipt
        try:
            command = ExecutionCommand.from_payload(request_payload)
            if not command.verify_signature(self.config.bridge_secret):
                raise ValueError("Execution command signature verification failed.")
            receipt = self.adapter.execute(command)
        except (KeyError, ValueError) as error:
            command_id = str(request_payload.get("id", "unknown"))
            self._complete(
                command_id,
                claim_token,
                ExecutionReceipt(False, None, str(error)),
            )
            return True

        self._complete(command.request_id, claim_token, receipt)
        return True

    def run_forever(self) -> None:
        local_server = create_local_server(
            self.gateway,
            self.config.local_host,
            self.config.local_port,
        )
        server_thread = threading.Thread(
            target=local_server.serve_forever,
            name="pathfinder-practice-localhost",
            daemon=True,
        )
        server_thread.start()
        print(
            f"IQ Option Practice connector listening on "
            f"http://{self.config.local_host}:{self.config.local_port}.",
            flush=True,
        )
        try:
            while True:
                try:
                    processed = self.run_once()
                    if processed:
                        print(
                            "Processed one verified IQ Option Practice request.",
                            flush=True,
                        )
                except (HTTPError, URLError, RuntimeError, ValueError) as error:
                    print(f"IQ Option Practice bridge error: {error}", flush=True)
                time.sleep(self.config.poll_interval_seconds)
        finally:
            local_server.shutdown()
            local_server.server_close()

    def _complete(
        self,
        request_id: str,
        claim_token: str,
        receipt: ExecutionReceipt,
    ) -> None:
        self._post(
            self.config.complete_url,
            {
                "request_id": request_id,
                "claim_token": claim_token,
                "success": receipt.success,
                "broker_order_id": receipt.broker_order_id,
                "message": receipt.message,
                "account_mode": receipt.account_mode,
                "platform_asset": receipt.platform_asset,
                "evidence": receipt.evidence,
                "executor": "IQ_OPTION_PRACTICE_EXTENSION",
            },
        )

    def _post(
        self,
        url: str,
        payload: dict[str, Any],
        *,
        allow_no_content: bool = False,
    ) -> dict[str, Any] | None:
        request = Request(
            url,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "x-pat-bridge-secret": self.config.bridge_secret,
            },
            data=json.dumps(payload).encode("utf-8"),
        )
        try:
            with urlopen(request, timeout=20) as response:
                if response.status == 204 and allow_no_content:
                    return None
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Bridge endpoint returned HTTP {error.code}: {detail}") from error


# Compatibility import for existing local scripts; this is no longer a simulator.
DemoExecutionBridge = PracticeExecutionBridge


def _load_environment(path: Path) -> dict[str, str]:
    values = dict(os.environ)
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    return values


def _firebase_project_id(repo_root: Path) -> str:
    config_path = repo_root / ".firebaserc"
    if not config_path.exists():
        raise RuntimeError("FIREBASE_PROJECT_ID is missing and .firebaserc was not found.")
    data = json.loads(config_path.read_text(encoding="utf-8"))
    project_id = data.get("projects", {}).get("default")
    if not isinstance(project_id, str) or not project_id:
        raise RuntimeError("The default Firebase project ID is not configured.")
    return project_id
