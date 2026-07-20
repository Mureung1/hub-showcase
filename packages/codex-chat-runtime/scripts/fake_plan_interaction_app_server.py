#!/usr/bin/env python3
"""Purpose-built App Server child for the ordered Plan interaction patch."""

from __future__ import annotations

import json
import os
import sys
import threading
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


def _server_request_resolved(request_id: str) -> None:
    _write_message(
        {
            "method": "serverRequest/resolved",
            "params": {
                "requestId": request_id,
                "threadId": THREAD_ID,
            },
        }
    )


def _server_request(request_id: str, method: str) -> None:
    _write_message(
        {
            "id": request_id,
            "method": method,
            "params": {"threadId": THREAD_ID, "turnId": TURN_ID},
        }
    )


def _turn_continued(turn_id: str, item_id: str) -> None:
    _write_message(
        {
            "method": "item/agentMessage/delta",
            "params": {
                "delta": "continued",
                "itemId": item_id,
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
    _server_request_resolved("server-request-secret")
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


def _run_delayed_resolved(journal_path: Path) -> None:
    turn_start = _start_plan_turn()
    _request_user_input("delayed-resolved-secret")
    _write_message({"id": turn_start["id"], "result": {"turn": _turn("inProgress")}})
    response = _read_message()
    expected = {
        "id": "delayed-resolved-secret",
        "result": {"answers": {"decision": {"answers": ["Accept"]}}},
    }
    if response != expected:
        raise RuntimeError(f"unexpected delayed user-input response: {response!r}")
    _write_journal(
        journal_path,
        {
            "child_pid": os.getpid(),
            "response_received": True,
            "response": response,
        },
    )

    resolution_trigger = _require_request("account/read")
    _server_request_resolved("delayed-resolved-secret")
    _write_message(
        {
            "method": "item/agentMessage/delta",
            "params": {
                "delta": "continued-after-resolved",
                "itemId": "agent-item",
                "threadId": THREAD_ID,
                "turnId": TURN_ID,
            },
        }
    )
    _complete_turn()
    _write_message(
        {
            "id": resolution_trigger["id"],
            "result": {"account": None, "requiresOpenaiAuth": False},
        }
    )
    _write_journal(
        journal_path,
        {
            "child_pid": os.getpid(),
            "native_resolved": True,
            "response_received": True,
            "response": response,
        },
    )
    sys.stdin.read()


def _run_approval_resolved(journal_path: Path) -> None:
    turn_start = _start_plan_turn()
    _write_message({"id": turn_start["id"], "result": {"turn": _turn("inProgress")}})
    _write_message(
        {
            "id": "approval-resolved-secret",
            "method": "item/commandExecution/requestApproval",
            "params": {"threadId": THREAD_ID, "turnId": TURN_ID},
        }
    )
    response = _read_message()
    expected = {"id": "approval-resolved-secret", "result": {"decision": "accept"}}
    if response != expected:
        raise RuntimeError(f"unexpected approval response: {response!r}")
    _server_request_resolved("approval-resolved-secret")
    account = _require_request("account/read")
    _write_message(
        {
            "id": account["id"],
            "result": {"account": None, "requiresOpenaiAuth": False},
        }
    )
    _write_journal(
        journal_path,
        {
            "approval_resolved": True,
            "child_pid": os.getpid(),
            "response": response,
        },
    )
    sys.stdin.read()


def _run_non_resolving_request_tracker(journal_path: Path) -> None:
    request_count = 128
    for index in range(request_count):
        request_id = f"dynamic-tool-{index}"
        _server_request(request_id, "item/tool/call")
        response = _read_message()
        if response != {"id": request_id, "result": {}}:
            raise RuntimeError(f"unexpected dynamic-tool response: {response!r}")
    _write_journal(
        journal_path,
        {
            "child_pid": os.getpid(),
            "non_resolving_requests": request_count,
        },
    )
    account = _require_request("account/read")
    _write_message(
        {
            "id": account["id"],
            "result": {"account": None, "requiresOpenaiAuth": False},
        }
    )
    sys.stdin.read()


def _run_resolution_tracker_negative_control(journal_path: Path, mode: str) -> None:
    request_count = 1 if mode == "resolution-tracker-duplicate" else 1024
    for index in range(request_count):
        request_id = "approval-duplicate" if request_count == 1 else f"approval-{index}"
        _server_request(request_id, "item/commandExecution/requestApproval")
        response = _read_message()
        expected = {"id": request_id, "result": {"decision": "accept"}}
        if response != expected:
            raise RuntimeError(f"unexpected approval response: {response!r}")
    _write_journal(
        journal_path,
        {
            "child_pid": os.getpid(),
            "tracked_requests": request_count,
        },
    )
    request_id = "approval-duplicate" if request_count == 1 else "approval-overflow"
    _server_request(request_id, "item/commandExecution/requestApproval")
    sys.stdin.read()


def _run_settlement_cleanup(journal_path: Path, mode: str) -> None:
    turn_start = _start_plan_turn()
    request_id = f"settlement-{mode}"
    _request_user_input(request_id)
    _write_message({"id": turn_start["id"], "result": {"turn": _turn("inProgress")}})
    response = _read_message()
    _write_journal(
        journal_path,
        {
            "child_pid": os.getpid(),
            "mode": mode,
            "response": response,
            "response_received": True,
        },
    )

    if mode == "resolved-cleanup-during-settlement":
        _server_request_resolved(request_id)
        _complete_turn()
    elif mode == "terminal-during-settlement":
        _complete_turn()
    elif mode == "transport-during-settlement":
        return
    elif mode == "interrupt-during-settlement":
        interrupt = _require_request("turn/interrupt")
        _write_message({"id": interrupt["id"], "result": {}})
        _complete_turn()
    elif mode == "close-during-settlement":
        sys.stdin.read()
        return
    else:
        raise RuntimeError(f"unsupported settlement cleanup mode: {mode}")
    _write_journal(
        journal_path,
        {
            "child_pid": os.getpid(),
            "cleanup_sent": True,
            "mode": mode,
            "response": response,
            "response_received": True,
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
            request_id = str(message["id"])
            _server_request_resolved(request_id)
            index = request_id.removeprefix("capacity-")
            _turn_continued(f"turn-capacity-{index}", f"continued-{index}")
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


def _run_cancelled_waiter(journal_path: Path) -> None:
    account = _require_request("account/read")
    _request_user_input(
        "cancelled-waiter-request",
        item_id="item-after-cancelled-waiter",
    )
    _write_message(
        {
            "id": account["id"],
            "result": {"account": None, "requiresOpenaiAuth": False},
        }
    )
    response = _read_message()
    expected = {"id": "cancelled-waiter-request", "result": {"answers": {}}}
    if response != expected:
        raise RuntimeError(f"unexpected cancelled-waiter response: {response!r}")
    _server_request_resolved("cancelled-waiter-request")
    _turn_continued(TURN_ID, "continued-cancelled-waiter")
    _write_journal(
        journal_path,
        {
            "child_pid": os.getpid(),
            "response": response,
            "request_delivered": True,
        },
    )
    sys.stdin.read()


def _run_waiter_cancellation_saturation(journal_path: Path) -> None:
    watchdog = threading.Timer(2.0, lambda: os._exit(0))
    watchdog.daemon = True
    watchdog.start()
    account = _require_request("account/read")
    _write_message(
        {
            "id": account["id"],
            "result": {"account": None, "requiresOpenaiAuth": False},
        }
    )
    _write_journal(
        journal_path,
        {"account_served": True, "child_pid": os.getpid()},
    )
    sys.stdin.read()


def _run_cancelled_waiter_terminal(journal_path: Path) -> None:
    account = _require_request("account/read")
    _request_user_input("cancelled-waiter-terminal")
    _write_message(
        {
            "id": account["id"],
            "result": {"account": None, "requiresOpenaiAuth": False},
        }
    )
    terminal_trigger = _require_request("account/read")
    _complete_turn()
    _write_message(
        {
            "id": terminal_trigger["id"],
            "result": {"account": None, "requiresOpenaiAuth": False},
        }
    )
    _write_journal(
        journal_path,
        {"child_pid": os.getpid(), "terminal_sent": True},
    )
    sys.stdin.read()


def _run_interrupt_answer_race(journal_path: Path) -> None:
    turn_start = _start_plan_turn()
    _write_message({"id": turn_start["id"], "result": {"turn": _turn("inProgress")}})
    _request_user_input("interrupt-answer-race")
    interrupt = _require_request("turn/interrupt")
    _write_journal(
        journal_path,
        {
            "child_pid": os.getpid(),
            "interrupt_admitted": True,
            "unexpected_answer": False,
        },
    )

    control = _read_message()
    if control == {
        "id": "interrupt-answer-race",
        "result": {"answers": {"decision": {"answers": ["Accept"]}}},
    }:
        _write_journal(
            journal_path,
            {
                "child_pid": os.getpid(),
                "interrupt_admitted": True,
                "unexpected_answer": True,
            },
        )
        sys.stdin.read()
        return
    if control.get("method") != "account/read":
        raise RuntimeError(f"expected account/read after interrupt, got {control!r}")
    _write_message(
        {
            "id": control["id"],
            "result": {"account": None, "requiresOpenaiAuth": False},
        }
    )
    _write_message({"id": interrupt["id"], "result": {}})
    _complete_turn()
    _write_journal(
        journal_path,
        {
            "child_pid": os.getpid(),
            "interrupt_admitted": True,
            "race_completed": True,
            "unexpected_answer": False,
        },
    )
    sys.stdin.read()


def _run_half_close(journal_path: Path, mode: str) -> None:
    turn_start = _start_plan_turn()
    _write_message({"id": turn_start["id"], "result": {"turn": _turn("inProgress")}})
    if mode == "interrupt-writer-half-close":
        _request_user_input("half-close-first")
        os.close(sys.stdin.fileno())
        _write_journal(
            journal_path,
            {"child_pid": os.getpid(), "stdin_half_closed": True},
        )
        _request_user_input("half-close-second", item_id="item-half-close-second")
    elif mode == "response-writer-half-close":
        os.close(sys.stdin.fileno())
        _write_journal(
            journal_path,
            {"child_pid": os.getpid(), "stdin_half_closed": True},
        )
        _request_user_input("half-close-response")
    else:
        raise RuntimeError(f"unsupported half-close mode: {mode}")
    threading.Event().wait()


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
        _server_request_resolved(f"cleanup-{mode}")
        _write_message(
            {
                "id": trigger["id"],
                "result": {"account": None, "requiresOpenaiAuth": False},
            }
        )
    elif mode == "resolved":
        _server_request_resolved(f"cleanup-{mode}")
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
    elif mode == "delayed-resolved":
        _run_delayed_resolved(journal_path)
    elif mode == "approval-resolved":
        _run_approval_resolved(journal_path)
    elif mode == "non-resolving-request-tracker":
        _run_non_resolving_request_tracker(journal_path)
    elif mode in {
        "resolution-tracker-duplicate",
        "resolution-tracker-capacity",
    }:
        _run_resolution_tracker_negative_control(journal_path, mode)
    elif mode in {
        "close-during-settlement",
        "interrupt-during-settlement",
        "resolved-cleanup-during-settlement",
        "terminal-during-settlement",
        "transport-during-settlement",
    }:
        _run_settlement_cleanup(journal_path, mode)
    elif mode == "cancel":
        _run_round_trip(journal_path, cancel=True)
    elif mode == "second-pending":
        _run_second_pending(journal_path)
    elif mode == "capacity":
        _run_capacity(journal_path)
    elif mode == "interrupt-stall":
        _run_interrupt_stall(journal_path)
    elif mode == "cancelled-waiter":
        _run_cancelled_waiter(journal_path)
    elif mode == "waiter-cancellation-saturation":
        _run_waiter_cancellation_saturation(journal_path)
    elif mode == "cancelled-waiter-terminal":
        _run_cancelled_waiter_terminal(journal_path)
    elif mode == "interrupt-answer-race":
        _run_interrupt_answer_race(journal_path)
    elif mode in {"interrupt-writer-half-close", "response-writer-half-close"}:
        _run_half_close(journal_path, mode)
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
