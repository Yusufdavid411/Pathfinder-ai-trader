"""Broker adapters available to the local bridge."""

from __future__ import annotations

from .gateway import PracticeExtensionGateway
from .models import ExecutionCommand, ExecutionReceipt


class IqOptionPracticeAdapter:
    """Routes a signed command to a verified IQ Option Practice browser tab."""

    name = "IQ_OPTION_PRACTICE_EXTENSION"
    real_execution_enabled = False

    def __init__(self, gateway: PracticeExtensionGateway) -> None:
        self.gateway = gateway

    def execute(self, command: ExecutionCommand) -> ExecutionReceipt:
        return self.gateway.execute(command)


class IqOptionExecutionLockedAdapter:
    """Explicit boundary for a future broker-approved IQ Option adapter."""

    name = "IQ_OPTION_LOCKED"
    real_execution_enabled = False

    def execute(self, command: ExecutionCommand) -> ExecutionReceipt:
        del command
        return ExecutionReceipt(
            success=False,
            broker_order_id=None,
            message=(
                "IQ Option Real order placement is locked. The browser connector "
                "accepts verified Practice accounts only."
            ),
        )
