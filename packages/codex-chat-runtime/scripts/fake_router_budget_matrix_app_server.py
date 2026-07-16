#!/usr/bin/env python3
"""Actual App Server child for injected router-budget scenarios."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any


ACTIVE_TURN_ID = "turn-budget-active"
PENDING_TURN_ID = "turn-budget-staged"
ACTIVE_LOGIN_ID = "login-budget-active"


def _read_request(method: str) -> dict[str, Any]:
    line = sys.stdin.readline()
    if not line:
        raise RuntimeError(f"client closed stdin before {method}")
    message = json.loads(line)
    if not isinstance(message, dict):
        raise RuntimeError(f"expected JSON object, got {message!r}")
    if message.get("method") != method or "id" not in message:
        raise RuntimeError(f"expected {method} request, got {message!r}")
    return message


def _write_message(message: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(message, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def _write_trace(path: Path, scenario: str, steps: list[str]) -> None:
    staged = path.with_suffix(path.suffix + ".new")
    staged.write_text(
        json.dumps(
            {
                "pgid": os.getpgid(0),
                "pid": os.getpid(),
                "ppid": os.getppid(),
                "scenario": scenario,
                "steps": steps,
            },
            sort_keys=True,
        ),
        encoding="utf-8",
    )
    staged.replace(path)


def _respond_list(request: dict[str, Any]) -> None:
    _write_message(
        {
            "id": request["id"],
            "result": {"data": [], "nextCursor": None},
        }
    )


def _turn_notification(turn_id: str) -> dict[str, Any]:
    return {
        "method": "unknown/turn-budget",
        "params": {"text": "é", "turnId": turn_id},
    }


def _login_notification(login_id: str) -> dict[str, Any]:
    return {
        "method": "account/login/completed",
        "params": {"loginId": login_id, "success": True},
    }


def _global_notification() -> dict[str, Any]:
    return {
        "method": "unknown/global-budget",
        "params": {"text": "é"},
    }


def _scenario_messages(
    scenario: str,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    if scenario in {"active_turn_items", "pending_turn_items"}:
        turn_id = ACTIVE_TURN_ID if scenario.startswith("active") else PENDING_TURN_ID
        notification = _turn_notification(turn_id)
        return [notification, notification], notification
    if scenario in {"active_turn_bytes", "pending_turn_bytes"}:
        turn_id = ACTIVE_TURN_ID if scenario.startswith("active") else PENDING_TURN_ID
        notification = _turn_notification(turn_id)
        return [notification], notification
    if scenario == "login_items":
        notification = _login_notification(ACTIVE_LOGIN_ID)
        return [notification, notification], notification
    if scenario == "login_bytes":
        notification = _login_notification(ACTIVE_LOGIN_ID)
        return [notification], notification
    if scenario == "global_items":
        notification = _global_notification()
        return [notification, notification], notification
    if scenario == "global_bytes":
        notification = _global_notification()
        return [notification], notification
    if scenario in {"aggregate_items", "aggregate_bytes"}:
        return [
            _turn_notification(ACTIVE_TURN_ID),
            _login_notification(ACTIVE_LOGIN_ID),
        ], _global_notification()
    if scenario == "pending_turn_routes":
        return [_turn_notification("turn-budget-pending-1")], _turn_notification(
            "turn-budget-pending-2"
        )
    if scenario == "pending_login_routes":
        return [_login_notification("login-budget-pending-1")], _login_notification(
            "login-budget-pending-2"
        )
    raise RuntimeError(f"scenario has no wire burst: {scenario}")


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(
            "usage: fake_router_budget_matrix_app_server.py "
            "SCENARIO CHILD_PID_PATH TRACE_PATH"
        )
    scenario = sys.argv[1]
    child_pid_path = Path(sys.argv[2])
    trace_path = Path(sys.argv[3])
    child_pid_path.write_text(str(os.getpid()), encoding="utf-8")
    steps: list[str] = []
    _write_trace(trace_path, scenario, steps)

    initialize = _read_request("initialize")
    _write_message(
        {
            "id": initialize["id"],
            "result": {
                "serverInfo": {"name": "router-budget-fake", "version": "0.144.4"},
                "userAgent": "router-budget-fake/0.144.4",
            },
        }
    )
    initialized = json.loads(sys.stdin.readline())
    if initialized != {"method": "initialized"}:
        raise RuntimeError(f"expected initialized notification, got {initialized!r}")

    ready = _read_request("thread/list")
    _respond_list(ready)
    steps.append("ready")
    _write_trace(trace_path, scenario, steps)

    if scenario in {"active_turn_routes", "active_login_routes"}:
        sys.stdin.read()
        return

    boundary, candidate = _scenario_messages(scenario)
    boundary_request = _read_request("thread/list")
    for notification in boundary:
        _write_message(notification)
    _respond_list(boundary_request)
    steps.append("boundary")
    _write_trace(trace_path, scenario, steps)

    candidate_request = _read_request("thread/list")
    _write_message(candidate)
    _respond_list(candidate_request)
    steps.append("candidate")
    _write_trace(trace_path, scenario, steps)
    sys.stdin.read()


if __name__ == "__main__":
    main()
