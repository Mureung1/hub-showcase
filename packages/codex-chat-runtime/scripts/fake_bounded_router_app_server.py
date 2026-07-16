#!/usr/bin/env python3
"""Deterministic App Server child for bounded notification-router conformance."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any


THREAD_A_ID = "thread-bounded-a"
THREAD_B_ID = "thread-bounded-b"
TURN_A_ID = "turn-bounded-a"
TURN_B_ID = "turn-bounded-b"
TURN_STALLED_ID = "turn-bounded-stalled"
ITEM_B_ID = "item-bounded-b"
LOGIN_ID = "login-bounded"
LOGIN_URL = "https://example.invalid/codex-login"
TURN_ITEM_LIMIT = 4_096


def _read_message() -> dict[str, Any]:
    line = sys.stdin.readline()
    if not line:
        raise RuntimeError(
            "client closed stdin before the bounded-router scenario completed"
        )
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


def _thread(thread_id: str) -> dict[str, Any]:
    return {
        "cliVersion": "0.144.4",
        "createdAt": 0,
        "cwd": "/tmp",
        "ephemeral": True,
        "id": thread_id,
        "modelProvider": "fake-provider",
        "preview": "",
        "sessionId": f"session-{thread_id}",
        "source": "appServer",
        "status": {"type": "idle"},
        "turns": [],
        "updatedAt": 0,
    }


def _turn(
    turn_id: str, status: str, *, items: list[dict[str, Any]] | None = None
) -> dict[str, Any]:
    return {
        "id": turn_id,
        "items": items or [],
        "status": status,
    }


def _respond_thread_start(request: dict[str, Any], thread_id: str) -> None:
    _write_message(
        {
            "id": request["id"],
            "result": {
                "approvalPolicy": "never",
                "approvalsReviewer": "user",
                "cwd": "/tmp",
                "instructionSources": [],
                "model": "fake-model",
                "modelProvider": "fake-provider",
                "sandbox": {"type": "readOnly"},
                "thread": _thread(thread_id),
            },
        }
    )


def _respond_turn_start(request: dict[str, Any], turn_id: str) -> None:
    _write_message(
        {
            "id": request["id"],
            "result": {"turn": _turn(turn_id, "inProgress")},
        }
    )


def _emit_pending_a(index: int) -> None:
    _write_message(
        {
            "method": "item/agentMessage/delta",
            "params": {
                "delta": "x",
                "itemId": f"item-bounded-a-{index}",
                "threadId": THREAD_A_ID,
                "turnId": TURN_A_ID,
            },
        }
    )


def _complete_b() -> None:
    item = {
        "id": ITEM_B_ID,
        "text": "B completed",
        "type": "agentMessage",
    }
    for message in (
        {
            "method": "turn/started",
            "params": {
                "threadId": THREAD_B_ID,
                "turn": _turn(TURN_B_ID, "inProgress"),
            },
        },
        {
            "method": "item/completed",
            "params": {
                "completedAtMs": 1,
                "item": item,
                "threadId": THREAD_B_ID,
                "turnId": TURN_B_ID,
            },
        },
        {
            "method": "turn/completed",
            "params": {
                "threadId": THREAD_B_ID,
                "turn": _turn(TURN_B_ID, "completed", items=[item]),
            },
        },
    ):
        _write_message(message)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(
            "usage: fake_bounded_router_app_server.py CHILD_PID_PATH TRACE_PATH"
        )
    Path(sys.argv[1]).write_text(str(os.getpid()), encoding="utf-8")
    trace_path = Path(sys.argv[2])
    steps: list[str] = []

    initialize = _require_request("initialize")
    _write_message(
        {
            "id": initialize["id"],
            "result": {
                "serverInfo": {"name": "bounded-router-fake", "version": "0.144.4"},
                "userAgent": "bounded-router-fake/0.144.4",
            },
        }
    )
    initialized = _read_message()
    if initialized != {"method": "initialized"}:
        raise RuntimeError(f"expected initialized notification, got {initialized!r}")
    steps.append("initialized")

    thread_a = _require_request("thread/start")
    _respond_thread_start(thread_a, THREAD_A_ID)
    steps.append("thread-a-started")

    thread_b = _require_request("thread/start")
    _respond_thread_start(thread_b, THREAD_B_ID)
    steps.append("thread-b-started")

    login_start = _require_request("account/login/start")
    _write_message(
        {
            "id": login_start["id"],
            "result": {
                "authUrl": LOGIN_URL,
                "loginId": LOGIN_ID,
                "type": "chatgpt",
            },
        }
    )
    steps.append("login-started")

    turn_b = _require_request("turn/start")
    if turn_b.get("params", {}).get("threadId") != THREAD_B_ID:
        raise RuntimeError(f"turn B scope mismatch: {turn_b!r}")
    _respond_turn_start(turn_b, TURN_B_ID)
    steps.append("turn-b-response")

    turn_a = _require_request("turn/start")
    if turn_a.get("params", {}).get("threadId") != THREAD_A_ID:
        raise RuntimeError(f"turn A scope mismatch: {turn_a!r}")
    for index in range(TURN_ITEM_LIMIT):
        _emit_pending_a(index)
    steps.append("turn-a-exact-boundary")

    _complete_b()
    steps.append("turn-b-completed")

    stalled_turn = _require_request("turn/start")
    if stalled_turn.get("params", {}).get("threadId") != THREAD_B_ID:
        raise RuntimeError(f"stalled turn scope mismatch: {stalled_turn!r}")
    _respond_turn_start(stalled_turn, TURN_STALLED_ID)
    _write_message(
        {
            "method": "turn/started",
            "params": {
                "threadId": THREAD_B_ID,
                "turn": _turn(TURN_STALLED_ID, "inProgress"),
            },
        }
    )
    steps.append("stalled-turn-first-event")

    ready = _require_request("thread/list")
    _write_message(
        {
            "id": ready["id"],
            "result": {"data": [], "nextCursor": None},
        }
    )
    steps.append("waiter-readiness-acknowledged")

    steps.append("turn-a-overflow-candidate")
    _write_json_atomic(
        trace_path,
        {
            "attempted_a_count": TURN_ITEM_LIMIT + 1,
            "boundary_count": TURN_ITEM_LIMIT,
            "pgid": os.getpgid(0),
            "pid": os.getpid(),
            "ppid": os.getppid(),
            "steps": steps,
        },
    )
    _emit_pending_a(TURN_ITEM_LIMIT)

    sys.stdin.read()


if __name__ == "__main__":
    main()
