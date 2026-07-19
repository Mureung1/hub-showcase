#!/usr/bin/env python3
"""Purpose-built App Server child for the ordered Plan interaction patch."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any


THREAD_ID = "thread-plan"
TURN_ID = "turn-plan"
ITEM_ID = "item-user-input"


def _read_message() -> dict[str, Any]:
    line = sys.stdin.readline()
    if not line:
        raise EOFError
    message = json.loads(line)
    if not isinstance(message, dict):
        raise RuntimeError(f"expected JSON object, got {message!r}")
    return message


def _write_message(message: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(message, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def _write_journal(path: Path, value: dict[str, Any]) -> None:
    staged = path.with_suffix(path.suffix + ".new")
    staged.write_text(json.dumps(value, sort_keys=True), encoding="utf-8")
    staged.replace(path)


def _require_request(method: str) -> dict[str, Any]:
    message = _read_message()
    if message.get("method") != method or "id" not in message:
        raise RuntimeError(f"expected {method} request, got {message!r}")
    return message


def _request_user_input(
    request_id: str,
    *,
    turn_id: str = TURN_ID,
    item_id: str = ITEM_ID,
) -> None:
    _write_message(
        {
            "id": request_id,
            "method": "item/tool/requestUserInput",
            "params": {
                "autoResolutionMs": None,
                "itemId": item_id,
                "questions": [
                    {
                        "header": "Review",
                        "id": "decision",
                        "isOther": True,
                        "isSecret": False,
                        "options": [
                            {
                                "description": "Apply the reviewed proposal.",
                                "label": "Accept",
                            },
                            {
                                "description": "Keep the model unchanged.",
                                "label": "Reject",
                            },
                        ],
                        "question": "Apply this proposal?",
                    }
                ],
                "threadId": THREAD_ID,
                "turnId": turn_id,
            },
        }
    )


def _thread_start_response(request_id: object) -> dict[str, Any]:
    return {
        "id": request_id,
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
                "sessionId": "session-plan",
                "source": "appServer",
                "status": {"type": "idle"},
                "turns": [],
                "updatedAt": 0,
            },
        },
    }


def _turn(status: str) -> dict[str, Any]:
    return {"id": TURN_ID, "items": [], "status": status}


def _complete_turn() -> None:
    _write_message(
        {
            "method": "turn/completed",
            "params": {"threadId": THREAD_ID, "turn": _turn("completed")},
        }
    )


def _initialize() -> None:
    initialize = _require_request("initialize")
    _write_message(
        {
            "id": initialize["id"],
            "result": {
                "serverInfo": {"name": "plan-fake", "version": "0.144.4"},
                "userAgent": "plan-fake/0.144.4",
            },
        }
    )
    initialized = _read_message()
    if initialized != {"method": "initialized"}:
        raise RuntimeError(f"expected initialized notification, got {initialized!r}")


def _start_plan_turn() -> dict[str, Any]:
    thread_start = _require_request("thread/start")
    _write_message(_thread_start_response(thread_start["id"]))
    turn_start = _require_request("turn/start")
    collaboration_mode = turn_start.get("params", {}).get("collaborationMode")
    expected = {
        "mode": "plan",
        "settings": {
            "developer_instructions": None,
            "model": "fake-model",
            "reasoning_effort": "medium",
        },
    }
    if collaboration_mode != expected:
        raise RuntimeError(
            f"turn/start collaborationMode mismatch: {collaboration_mode!r}"
        )
    return turn_start


def _run_round_trip(journal_path: Path, *, cancel: bool = False) -> None:
    turn_start = _start_plan_turn()
    _request_user_input("server-request-secret")
    _write_message({"id": turn_start["id"], "result": {"turn": _turn("inProgress")}})
    _write_message(
        {
            "method": "item/agentMessage/delta",
            "params": {
                "delta": "before-answer",
                "itemId": "agent-item",
                "threadId": THREAD_ID,
                "turnId": TURN_ID,
            },
        }
    )

    account = _require_request("account/read")
    _write_message(
        {
            "id": account["id"],
            "result": {"account": None, "requiresOpenaiAuth": False},
        }
    )
    response = _read_message()
    expected_result = (
        {"answers": {}}
        if cancel
        else {"answers": {"decision": {"answers": ["Accept"]}}}
    )
    if response != {"id": "server-request-secret", "result": expected_result}:
        raise RuntimeError(f"unexpected user-input response: {response!r}")
    _write_message(
        {
            "method": "serverRequest/resolved",
            "params": {
                "requestId": "server-request-secret",
                "threadId": THREAD_ID,
            },
        }
    )
    _write_message(
        {
            "method": "item/agentMessage/delta",
            "params": {
                "delta": "after-answer",
                "itemId": "agent-item",
                "threadId": THREAD_ID,
                "turnId": TURN_ID,
            },
        }
    )
    _complete_turn()
    _write_journal(
        journal_path,
        {
            "cancelled": cancel,
            "child_pid": os.getpid(),
            "response": response,
            "wire_collaboration_mode": turn_start["params"]["collaborationMode"],
        },
    )
    sys.stdin.read()


def _run_second_pending(journal_path: Path) -> None:
    turn_start = _start_plan_turn()
    _write_message({"id": turn_start["id"], "result": {"turn": _turn("inProgress")}})
    _request_user_input("request-one")
    _request_user_input("request-two", item_id="item-two")
    interrupt = _require_request("turn/interrupt")
    if interrupt.get("params") != {"threadId": THREAD_ID, "turnId": TURN_ID}:
        raise RuntimeError(f"unexpected interaction interrupt: {interrupt!r}")
    _write_message({"id": interrupt["id"], "result": {}})
    _write_journal(
        journal_path,
        {"child_pid": os.getpid(), "interrupted_turn_ids": [TURN_ID], "requests": 2},
    )
    sys.stdin.read()


def _run_capacity(journal_path: Path) -> None:
    for index in range(33):
        _request_user_input(
            f"capacity-{index}",
            turn_id=f"turn-capacity-{index}",
            item_id=f"item-capacity-{index}",
        )
    responses: list[dict[str, Any]] = []
    interrupted_turn_ids: list[str] = []
    while len(responses) < 32 or not interrupted_turn_ids:
        message = _read_message()
        if message.get("method") == "turn/interrupt":
            params = message.get("params")
            if params != {"threadId": THREAD_ID, "turnId": "turn-capacity-32"}:
                raise RuntimeError(f"unexpected capacity interrupt: {message!r}")
            interrupted_turn_ids.append("turn-capacity-32")
            _write_message({"id": message["id"], "result": {}})
        elif "method" not in message and str(message.get("id", "")).startswith(
            "capacity-"
        ):
            responses.append(message)
        else:
            raise RuntimeError(f"unexpected capacity control message: {message!r}")
    _write_journal(
        journal_path,
        {
            "child_pid": os.getpid(),
            "interrupted_turn_ids": interrupted_turn_ids,
            "response_count": len(responses),
        },
    )
    sys.stdin.read()


def _run_interrupt_stall(journal_path: Path) -> None:
    for index in range(65):
        _request_user_input(
            f"stall-{index}",
            turn_id=f"turn-stall-{index}",
            item_id=f"item-stall-{index}",
        )
    interrupt = _require_request("turn/interrupt")
    _write_journal(
        journal_path,
        {
            "child_pid": os.getpid(),
            "interrupt_stalled": True,
            "turn_id": interrupt.get("params", {}).get("turnId"),
        },
    )
    sys.stdin.read()


def _run_cleanup(journal_path: Path, mode: str) -> None:
    turn_start = _start_plan_turn()
    _write_message({"id": turn_start["id"], "result": {"turn": _turn("inProgress")}})
    _request_user_input(f"cleanup-{mode}")
    trigger = _read_message()
    if mode == "interrupt":
        if trigger.get("method") != "turn/interrupt":
            raise RuntimeError(f"expected turn/interrupt, got {trigger!r}")
        _write_message({"id": trigger["id"], "result": {}})
        _complete_turn()
    elif mode == "terminal":
        if trigger.get("method") != "account/read":
            raise RuntimeError(f"expected account/read, got {trigger!r}")
        _complete_turn()
        _write_message(
            {
                "id": trigger["id"],
                "result": {"account": None, "requiresOpenaiAuth": False},
            }
        )
    elif mode == "resolved":
        _write_message(
            {
                "method": "serverRequest/resolved",
                "params": {
                    "requestId": f"cleanup-{mode}",
                    "threadId": THREAD_ID,
                },
            }
        )
        if trigger.get("method") != "account/read":
            raise RuntimeError(f"expected account/read, got {trigger!r}")
        _write_message(
            {
                "id": trigger["id"],
                "result": {"account": None, "requiresOpenaiAuth": False},
            }
        )
    elif mode == "transport":
        if trigger.get("method") != "account/read":
            raise RuntimeError(f"expected account/read, got {trigger!r}")
        _write_journal(journal_path, {"child_pid": os.getpid(), "mode": mode})
        return
    else:
        raise RuntimeError(f"unsupported cleanup mode: {mode}")
    _write_journal(journal_path, {"child_pid": os.getpid(), "mode": mode})
    sys.stdin.read()


def main() -> None:
    journal_value = os.environ.get("AY_PLE_PLAN_FAKE_JOURNAL")
    if not journal_value:
        raise RuntimeError("AY_PLE_PLAN_FAKE_JOURNAL is required")
    journal_path = Path(journal_value)
    mode = os.environ.get("AY_PLE_PLAN_FAKE_MODE", "round-trip")
    _write_journal(
        journal_path,
        {"child_pid": os.getpid(), "mode": mode, "started": True},
    )
    _initialize()
    if mode == "round-trip":
        _run_round_trip(journal_path)
    elif mode == "cancel":
        _run_round_trip(journal_path, cancel=True)
    elif mode == "second-pending":
        _run_second_pending(journal_path)
    elif mode == "capacity":
        _run_capacity(journal_path)
    elif mode == "interrupt-stall":
        _run_interrupt_stall(journal_path)
    elif mode in {"interrupt", "resolved", "terminal", "transport"}:
        _run_cleanup(journal_path, mode)
    elif mode == "idle":
        sys.stdin.read()
    else:
        raise RuntimeError(f"unsupported fake mode: {mode}")


if __name__ == "__main__":
    try:
        main()
    except EOFError:
        pass
