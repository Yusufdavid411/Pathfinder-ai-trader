"""Command line entrypoint for the IQ Option Practice execution bridge."""

from __future__ import annotations

import argparse
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

from .bridge import BridgeConfig, PracticeExecutionBridge


def main() -> None:
    parser = argparse.ArgumentParser(description="Pathfinder IQ Option Practice connector")
    parser.add_argument("command", choices=["run", "once", "status"])
    args = parser.parse_args()

    if args.command == "run":
        _run_with_file_logs()
        return

    config = BridgeConfig.load()
    bridge = PracticeExecutionBridge(config)

    if args.command == "status":
        print("IQ Option Practice bridge configuration is valid.")
        print(f"Bridge ID: {config.bridge_id}")
        print(f"Local extension endpoint: http://{config.local_host}:{config.local_port}")
        print("Real IQ Option execution: locked")
        return

    if args.command == "once":
        processed = bridge.run_once()
        print("Processed a request." if processed else "No eligible request was queued.")
        return



def _run_with_file_logs() -> None:
    runtime_dir = Path(__file__).resolve().parents[1] / ".runtime"
    runtime_dir.mkdir(parents=True, exist_ok=True)
    stdout_path = runtime_dir / "demo_bridge.out.log"
    stderr_path = runtime_dir / "demo_bridge.err.log"

    with (
        stdout_path.open("a", encoding="utf-8", buffering=1) as stdout_file,
        stderr_path.open("a", encoding="utf-8", buffering=1) as stderr_file,
        redirect_stdout(stdout_file),
        redirect_stderr(stderr_file),
    ):
        print("Starting IQ Option Practice bridge.", flush=True)
        config = BridgeConfig.load()
        PracticeExecutionBridge(config).run_forever()


if __name__ == "__main__":
    main()
