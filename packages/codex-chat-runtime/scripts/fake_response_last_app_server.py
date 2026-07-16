#!/usr/bin/env python3
"""Deterministic App Server child that completes a turn before its response."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any


THREAD_ID = "thread-response-last"
TURN_ID = "turn-response-last"
ITEM_ID = "item-response-last"


def _read_message() -> dict[str, Any]:
    line = sys.stdin.readline()
    if not line:
        raise RuntimeError("client closed stdin before the fake App Server completed")
    message = json.loads(line)
    if not isinstance(message, dict):
        raise RuntimeError(f"expected JSON object, got {message!r}")
    return message


def _write_message(message: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(message, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def _write_json_atomic(path: Path, value: dict[str, Any]) -> None:
    staged = path.with_suffix(path.suffix + ".new")
    staged.write_text(json.dumps(value, sort_keys=True), encoding="utf-8")
    staged.replace(path)


def _require_request(method: str) -> dict[str, Any]:
    message = _read_message()
    if message.get("method") != method or "id" not in message:
        raise RuntimeError(f"expected {method} request, got {message!r}")
    return message


def _turn(status: str) -> dict[str, Any]:
    return {
        "id": TURN_ID,
        "items": [],
        "status": status,
    }


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(
            "usage: fake_response_last_app_server.py CHILD_PID_PATH TRACE_PATH"
        )
    Path(sys.argv[1]).write_text(str(os.getpid()), encoding="utf-8")
    trace_path = Path(sys.argv[2])

    initialize = _require_request("initialize")
    _write_message(
        {
            "id": initialize["id"],
            "result": {
                "serverInfo": {"name": "response-last-fake", "version": "0.144.4"},
                "userAgent": "response-last-fake/0.144.4",
            },
        }
    )

    initialized = _read_message()
    if initialized != {"method": "initialized"}:
        raise RuntimeError(f"expected initialized notification, got {initialized!r}")

    thread_start = _require_request("thread/start")
    _write_message(
        {
            "id": thread_start["id"],
            "result": {
                "approvalPolicy": "never",
                "approvalsReviewer": "user",
                "cwd": "/tmp",
                "instructionSources": [],
                "model": "fake-model",
                "modelProvider": "fake-provider",
                "sandbox": {"type": "readOnly"},
                "thread": {
                    "cliVersion": "0.144.4",
                    "createdAt": 0,
                    "cwd": "/tmp",
                    "ephemeral": True,
                    "id": THREAD_ID,
                    "modelProvider": "fake-provider",
                    "preview": "",
                    "sessionId": "session-response-last",
                    "source": "appServer",
                    "status": {"type": "idle"},
                    "turns": [],
                    "updatedAt": 0,
                },
            },
        }
    )

    turn_start = _require_request("turn/start")
    expected_scope = turn_start.get("params", {}).get("threadId")
    if expected_scope != THREAD_ID:
        raise RuntimeError(f"turn/start thread mismatch: {turn_start!r}")

    agent_item = {"id": ITEM_ID, "text": "hello", "type": "agentMessage"}
    for message in (
        {
            "method": "turn/started",
            "params": {"threadId": THREAD_ID, "turn": _turn("inProgress")},
        },
        {
            "method": "item/agentMessage/delta",
            "params": {
                "delta": "hello",
                "itemId": ITEM_ID,
                "threadId": THREAD_ID,
                "turnId": TURN_ID,
            },
        },
        {
            "method": "item/completed",
            "params": {
                "completedAtMs": 1,
                "item": agent_item,
                "threadId": THREAD_ID,
                "turnId": TURN_ID,
            },
        },
        {
            "method": "turn/completed",
            "params": {
                "threadId": THREAD_ID,
                "turn": {**_turn("completed"), "items": [agent_item]},
            },
        },
    ):
        _write_message(message)

    _write_message(
        {
            "id": turn_start["id"],
            "result": {"turn": _turn("inProgress")},
        }
    )
    _write_json_atomic(
        trace_path,
        {
            "emitted_methods": [
                "turn/started",
                "item/agentMessage/delta",
                "item/completed",
                "turn/completed",
                "turn/start#response",
            ],
            "pgid": os.getpgid(0),
            "pid": os.getpid(),
            "ppid": os.getppid(),
        },
    )

    # Keep the child alive until the SDK performs its normal close sequence.
    sys.stdin.read()


if __name__ == "__main__":
    main()
