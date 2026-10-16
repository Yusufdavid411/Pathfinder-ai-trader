"""Broker adapters available to the local bridge."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from .models import ExecutionCommand, ExecutionReceipt


class PathfinderDemoAdapter:
    """Deterministic local simulator; it never connects to IQ Option."""

    name = "PATHFINDER_DEMO_BRIDGE"
    real_execution_enabled = False

    def execute(self, command: ExecutionCommand) -> ExecutionReceipt:
        now = datetime.now(timezone.utc)
        if now < command.execute_not_before:
            return ExecutionReceipt(
                success=False,
                broker_order_id=None,
                message="The execution window has not opened.",
            )
        if now > command.expires_at:
            return ExecutionReceipt(
                success=False,
                broker_order_id=None,
                message="The candidate expired before Demo execution.",
            )

        order_id = f"pat-demo-{uuid4()}"
        return ExecutionReceipt(
            success=True,
            broker_order_id=order_id,
            message=(
                f"Simulated {command.direction} approval recorded at reference price "
                f"{command.reference_price}."
            ),
        )


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
                "IQ Option order placement is locked. Configure an authorized broker "
                "integration before replacing the Pathfinder Demo adapter."
            ),
        )
