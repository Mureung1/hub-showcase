#!/usr/bin/env python3
"""Purpose-built App Server child for the persistent Python bridge oracle."""

from __future__ import annotations

import json
import os
import sys
import threading
import time
from pathlib import Path
from typing import Any


_WRITE_LOCK = threading.Lock()


def _write(message: dict[str, Any]) -> None:
    with _WRITE_LOCK:
        sys.stdout.write(
            json.dumps(message, ensure_ascii=True, separators=(",", ":")) + "\n"
        )
        sys.stdout.flush()


def _write_raw(line: str) -> None:
    with _WRITE_LOCK:
        sys.stdout.write(line)
        sys.stdout.flush()


def _turn(
    turn_id: str, status: str, *, item: dict[str, Any] | None = None
) -> dict[str, Any]:
    return {
        "id": turn_id,
        "items": [] if item is None else [item],
        "status": status,
    }


def _thread(thread_id: str, cwd: str) -> dict[str, Any]:
    return {
        "cliVersion": "0.144.4",
        "createdAt": 0,
        "cwd": cwd,
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


def _model(model: str, reasoning_effort: str, *, is_default: bool) -> dict[str, Any]:
    return {
        "defaultReasoningEffort": reasoning_effort,
        "description": f"Fake {model}",
        "displayName": model,
        "hidden": False,
        "id": model,
        "isDefault": is_default,
        "model": model,
        "serviceTiers": [
            {
                "description": "Faster fake processing",
                "id": "fast",
                "name": "Fast",
            }
        ],
        "supportedReasoningEfforts": [
            {
                "description": f"Fake {reasoning_effort} effort",
                "reasoningEffort": reasoning_effort,
            }
        ],
    }


def _input_text(params: dict[str, Any]) -> str:
    for item in params.get("input", []):
        if isinstance(item, dict) and item.get("type") == "text":
            value = item.get("text")
            if isinstance(value, str):
                return value
    return ""


class FakeAppServer:
    def __init__(self, journal_path: Path, launch_args: list[str]) -> None:
        self._journal_path = journal_path
        self._launch_args = launch_args
        self._messages: list[dict[str, Any]] = []
        self._thread_count = 0
        self._turn_count = 0
        self._held_turns: dict[tuple[str, str], dict[str, Any]] = {}
        self._pending_user_inputs: dict[str, dict[str, str]] = {}
        self._deferred_user_input_resolutions: dict[str, dict[str, str]] = {}
        self._opt_out_notification_methods: set[str] = set()

    def _record(self, message: dict[str, Any]) -> None:
        self._messages.append(message)
        staged = self._journal_path.with_suffix(self._journal_path.suffix + ".new")
        staged.write_text(
            json.dumps(
                {
                    "launchArgs": self._launch_args,
                    "environment": {
                        "AY_PLE_INTERACTION_BROKER_TOKEN": os.environ.get(
                            "AY_PLE_INTERACTION_BROKER_TOKEN"
                        ),
                        "AY_PLE_INTERACTION_BROKER_URL": os.environ.get(
                            "AY_PLE_INTERACTION_BROKER_URL"
                        ),
                        "AY_PLE_INTERACTION_RUNTIME_BINDING": os.environ.get(
                            "AY_PLE_INTERACTION_RUNTIME_BINDING"
                        ),
                        "CODEX_HOME": os.environ.get("CODEX_HOME"),
                        "CODEX_SQLITE_HOME": os.environ.get("CODEX_SQLITE_HOME"),
                        "HOME": os.environ.get("HOME"),
                        "LANG": os.environ.get("LANG"),
                        "LC_ALL": os.environ.get("LC_ALL"),
                        "PATH": os.environ.get("PATH"),
                        "TMPDIR": os.environ.get("TMPDIR"),
                        "keys": sorted(os.environ),
                        "unsafePresent": sorted(
                            key
                            for key in (
                                "ANTHROPIC_API_KEY",
                                "DYLD_LIBRARY_PATH",
                                "OPENAI_API_KEY",
                                "OPENAI_BASE_URL",
                                "OPENAI_ORGANIZATION",
                                "OPENAI_PROJECT",
                                "PYTHONPATH",
                            )
                            if key in os.environ
                        ),
                    },
                    "messages": self._messages,
                },
                ensure_ascii=True,
                sort_keys=True,
            ),
            encoding="utf-8",
        )
        staged.replace(self._journal_path)

    def _notify(self, message: dict[str, Any]) -> None:
        method = message.get("method")
        if isinstance(method, str) and method in self._opt_out_notification_methods:
            return
        _write(message)

    def _account_state(self) -> str:
        path = self._journal_path.parent / "account-state"
        if not path.is_file():
            return "unsupported"
        return path.read_text(encoding="utf-8").strip()

    def _inject_response(self, request: dict[str, Any]) -> bool:
        injection_path = self._journal_path.parent / "injected-response.json"
        if not injection_path.is_file():
            return False
        injection = json.loads(injection_path.read_text(encoding="utf-8"))
        if not isinstance(injection, dict) or injection.get("method") != request.get(
            "method"
        ):
            return False
        response = injection.get("response")
        if not isinstance(response, dict):
            raise RuntimeError(f"invalid injected response: {response!r}")
        injection_path.unlink()
        _write({"id": request["id"], **response})
        return True

    def _complete(self, thread_id: str, turn_id: str, text: str) -> None:
        item_id = f"item-{turn_id}"
        item = {"id": item_id, "text": text, "type": "agentMessage"}
        _write(
            {
                "method": "item/agentMessage/delta",
                "params": {
                    "delta": text,
                    "itemId": item_id,
                    "threadId": thread_id,
                    "turnId": turn_id,
                },
            }
        )
        _write(
            {
                "method": "item/completed",
                "params": {
                    "completedAtMs": 1,
                    "item": item,
                    "threadId": thread_id,
                    "turnId": turn_id,
                },
            }
        )
        _write(
            {
                "method": "turn/completed",
                "params": {
                    "threadId": thread_id,
                    "turn": _turn(turn_id, "completed", item=item),
                },
            }
        )

    def _response_last(
        self, request: dict[str, Any], thread_id: str, turn_id: str
    ) -> None:
        item_id = f"item-{turn_id}"
        item = {"id": item_id, "text": "hello", "type": "agentMessage"}
        for message in (
            {
                "method": "error",
                "params": {
                    "error": {
                        "additionalDetails": "/secret/path/provider-token",
                        "codexErrorInfo": "serverOverloaded",
                        "message": "secret provider detail",
                    },
                    "threadId": thread_id,
                    "turnId": turn_id,
                    "willRetry": True,
                },
            },
            {
                "method": "item/agentMessage/delta",
                "params": {
                    "delta": "hello",
                    "itemId": item_id,
                    "threadId": thread_id,
                    "turnId": turn_id,
                },
            },
            {
                "method": "item/completed",
                "params": {
                    "completedAtMs": 1,
                    "item": item,
                    "threadId": thread_id,
                    "turnId": turn_id,
                },
            },
            {
                "method": "turn/completed",
                "params": {
                    "threadId": thread_id,
                    "turn": _turn(turn_id, "completed", item=item),
                },
            },
            {
                "method": "turn/completed",
                "params": {
                    "threadId": thread_id,
                    "turn": _turn(turn_id, "completed", item=item),
                },
            },
        ):
            _write(message)
        _write({"id": request["id"], "result": {"turn": _turn(turn_id, "inProgress")}})

    def _start_product_turn(
        self,
        request: dict[str, Any],
        thread_id: str,
        turn_id: str,
    ) -> None:
        params = request.get("params", {})
        text = _input_text(params)
        if text == "Continue the product conversation.":
            expected_input = [{"type": "text", "text": text}]
        else:
            expected_input = [
                {
                    "type": "skill",
                    "name": "assignment-modeling",
                    "path": "/managed/assignment-modeling/SKILL.md",
                },
                {
                    "type": "text",
                    "text": "Review staged Markdown at /staged/assignment.md",
                },
            ]
        expected_collaboration = {
            "mode": "plan",
            "settings": {
                "developer_instructions": None,
                "model": "fake-model",
                "reasoning_effort": "medium",
            },
        }
        if params.get("input") != expected_input:
            raise RuntimeError(f"product input mismatch: {params.get('input')!r}")
        if params.get("collaborationMode") != expected_collaboration:
            raise RuntimeError("product collaboration mode mismatch")

        request_id = f"user-input-{turn_id}"
        self._pending_user_inputs[request_id] = {
            "threadId": thread_id,
            "turnId": turn_id,
            "itemId": f"review-{turn_id}",
        }
        _write(
            {
                "id": request_id,
                "method": "item/tool/requestUserInput",
                "params": {
                    "autoResolutionMs": None,
                    "itemId": f"review-{turn_id}",
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
                    "threadId": thread_id,
                    "turnId": turn_id,
                },
            }
        )
        _write({"id": request["id"], "result": {"turn": _turn(turn_id, "inProgress")}})
        self._notify(
            {
                "method": "item/plan/delta",
                "params": {
                    "delta": "Inspect the staged assignment.",
                    "itemId": f"plan-{turn_id}",
                    "threadId": thread_id,
                    "turnId": turn_id,
                },
            }
        )
        self._notify(
            {
                "method": "item/completed",
                "params": {
                    "completedAtMs": 1,
                    "item": {
                        "id": f"plan-{turn_id}",
                        "text": "Inspect the staged assignment.",
                        "type": "plan",
                    },
                    "threadId": thread_id,
                    "turnId": turn_id,
                },
            }
        )
        mcp_item = {
            "arguments": {
                "absoluteSourcePath": "/private/staged/assignment.md",
                "credential": "never-project-this",
            },
            "id": f"mcp-{turn_id}",
            "server": "private-state-server",
            "status": "inProgress",
            "tool": "propose_state_patch",
            "type": "mcpToolCall",
        }
        self._notify(
            {
                "method": "item/started",
                "params": {
                    "item": mcp_item,
                    "startedAtMs": 2,
                    "threadId": thread_id,
                    "turnId": turn_id,
                },
            }
        )
        self._notify(
            {
                "method": "item/completed",
                "params": {
                    "completedAtMs": 3,
                    "item": {
                        **mcp_item,
                        "result": {
                            "content": [],
                            "structuredContent": {
                                "absolutePath": "/private/result.json"
                            },
                        },
                        "status": "completed",
                    },
                    "threadId": thread_id,
                    "turnId": turn_id,
                },
            }
        )

    def _settle_product_user_input(self, message: dict[str, Any]) -> bool:
        request_id = message.get("id")
        pending = self._pending_user_inputs.get(str(request_id))
        if pending is None:
            return False
        result = message.get("result")
        expected_answer = {"answers": {"decision": {"answers": ["Accept"]}}}
        if result not in (expected_answer, {"answers": {}}):
            raise RuntimeError(f"unexpected user-input settlement: {result!r}")
        self._pending_user_inputs.pop(str(request_id), None)
        cleanup_resolution = self._journal_path.parent / "cleanup-user-input-resolution"
        if cleanup_resolution.is_file():
            cleanup_resolution.unlink()
            self._notify(
                {
                    "method": "serverRequest/resolved",
                    "params": {
                        "requestId": str(request_id),
                        "threadId": pending["threadId"],
                    },
                }
            )
            self._notify(
                {
                    "method": "turn/completed",
                    "params": {
                        "threadId": pending["threadId"],
                        "turn": _turn(pending["turnId"], "interrupted"),
                    },
                }
            )
            return True
        delay_resolution = self._journal_path.parent / "delay-user-input-resolution"
        if delay_resolution.is_file():
            delay_resolution.unlink()
            self._deferred_user_input_resolutions[str(request_id)] = pending
            return True
        self._resolve_product_user_input(str(request_id), pending)
        return True

    def _resolve_product_user_input(
        self,
        request_id: str,
        pending: dict[str, str],
    ) -> None:
        self._notify(
            {
                "method": "serverRequest/resolved",
                "params": {
                    "requestId": request_id,
                    "threadId": pending["threadId"],
                },
            }
        )
        self._complete(
            pending["threadId"],
            pending["turnId"],
            "continued after product review",
        )

    def _flush_deferred_user_input_resolutions(self) -> None:
        for request_id, pending in list(self._deferred_user_input_resolutions.items()):
            self._deferred_user_input_resolutions.pop(request_id, None)
            self._resolve_product_user_input(request_id, pending)

    def _flood_pending_product_turn(self) -> None:
        trigger = self._journal_path.parent / "flood-pending-product-turn"
        if not trigger.is_file():
            return
        trigger.unlink()
        pending = next(iter(self._pending_user_inputs.values()), None)
        if pending is None:
            raise RuntimeError("no pending product interaction to flood")
        for index in range(16):
            self._notify(
                {
                    "method": "item/plan/delta",
                    "params": {
                        "delta": f"pending-overflow-{index}",
                        "itemId": f"overflow-{pending['turnId']}",
                        "threadId": pending["threadId"],
                        "turnId": pending["turnId"],
                    },
                }
            )

    def handle(self, message: dict[str, Any]) -> None:
        self._record(message)
        method = message.get("method")
        if method == "initialized" and "id" not in message:
            return
        if method is None and "id" in message:
            if self._settle_product_user_input(message):
                return
            raise RuntimeError(f"unexpected response: {message!r}")
        if "id" not in message:
            raise RuntimeError(f"unexpected notification: {message!r}")
        if method == "initialize":
            if (self._journal_path.parent / "fail-initialize").is_file():
                _write(
                    {
                        "id": message["id"],
                        "error": {
                            "code": -32000,
                            "message": "injected initialization failure",
                        },
                    }
                )
                return
            capabilities = message.get("params", {}).get("capabilities", {})
            opt_out = capabilities.get("optOutNotificationMethods", [])
            if isinstance(opt_out, list):
                self._opt_out_notification_methods = {
                    value for value in opt_out if isinstance(value, str)
                }
            _write(
                {
                    "id": message["id"],
                    "result": {
                        "serverInfo": {"name": "bridge-fake", "version": "0.144.4"},
                        "userAgent": "bridge-fake/0.144.4",
                    },
                }
            )
            return
        if self._inject_response(message):
            return
        if method == "thread/start":
            if (self._journal_path.parent / "hold-thread-start").is_file():
                return
            delay_path = self._journal_path.parent / "delay-thread-start-ms"
            if delay_path.is_file():
                delay_ms = int(delay_path.read_text(encoding="utf-8"))
                delay_path.unlink()
                time.sleep(delay_ms / 1000)
            self._thread_count += 1
            thread_id = f"thread-{self._thread_count}"
            params = message.get("params", {})
            cwd = params.get("cwd", "/tmp")
            _write(
                {
                    "id": message["id"],
                    "result": {
                        "approvalPolicy": "never",
                        "approvalsReviewer": "user",
                        "cwd": cwd,
                        "instructionSources": [],
                        "model": "fake-model",
                        "modelProvider": "fake-provider",
                        "reasoningEffort": "medium",
                        "sandbox": {"type": "readOnly"},
                        "thread": _thread(thread_id, cwd),
                    },
                }
            )
            self._notify(
                {
                    "method": "thread/started",
                    "params": {"thread": _thread(thread_id, cwd)},
                }
            )
            return
        if method == "account/read":
            self._flood_pending_product_turn()
            self._flush_deferred_user_input_resolutions()
            state = self._account_state()
            if (self._journal_path.parent / "account-not-ready").is_file():
                state = "signed_out"
            if state == "chatgpt":
                account = {
                    "email": "student-private@example.com",
                    "planType": "pro",
                    "type": "chatgpt",
                }
                requires_openai_auth = False
            elif state == "signed_out":
                account = None
                requires_openai_auth = True
            else:
                account = {"type": "apiKey"}
                requires_openai_auth = False
            _write(
                {
                    "id": message["id"],
                    "result": {
                        "account": account,
                        "requiresOpenaiAuth": requires_openai_auth,
                    },
                }
            )
            return
        if method == "model/list":
            if message.get("params") != {"includeHidden": True}:
                raise RuntimeError("product model lookup must include hidden models")
            if (self._journal_path.parent / "fail-model-list").is_file():
                _write(
                    {
                        "id": message["id"],
                        "error": {
                            "code": -32000,
                            "message": "injected model list failure",
                        },
                    }
                )
                return
            no_default = (self._journal_path.parent / "no-default-model").is_file()
            multiple_defaults = (
                self._journal_path.parent / "multiple-default-models"
            ).is_file()
            _write(
                {
                    "id": message["id"],
                    "result": {
                        "data": [
                            _model(
                                "current-default-model",
                                "high",
                                is_default=not no_default,
                            ),
                            _model(
                                "fake-model",
                                "medium",
                                is_default=multiple_defaults,
                            ),
                        ],
                        "nextCursor": None,
                    },
                }
            )
            return
        if method == "turn/start":
            if (self._journal_path.parent / "hold-turn-start").is_file():
                return
            self._turn_count += 1
            turn_id = f"turn-{self._turn_count}"
            params = message.get("params", {})
            thread_id = params.get("threadId")
            text = _input_text(params)
            if text in {
                "Continue the product conversation.",
                "Review staged Markdown at /staged/assignment.md",
            }:
                self._start_product_turn(message, thread_id, turn_id)
                return
            if text == "response-last":
                self._response_last(message, thread_id, turn_id)
                return
            _write(
                {"id": message["id"], "result": {"turn": _turn(turn_id, "inProgress")}}
            )
            if text == "malformed-after-response":
                time.sleep(0.2)
                _write_raw("{malformed-json}\n")
                return
            self._notify(
                {
                    "method": "thread/status/changed",
                    "params": {
                        "status": {
                            "activeFlags": [],
                            "type": "active",
                        },
                        "threadId": thread_id,
                    },
                }
            )
            if text == "hold":
                self._held_turns[(thread_id, turn_id)] = {"mode": text}
            elif text == "node-stalled-consumer-overflow":
                for index in range(3):
                    _write(
                        {
                            "method": "item/agentMessage/delta",
                            "params": {
                                "delta": f"delta-{index}",
                                "itemId": f"item-{turn_id}-{index}",
                                "threadId": thread_id,
                                "turnId": turn_id,
                            },
                        }
                    )
                self._held_turns[(thread_id, turn_id)] = {"mode": text}
            elif text == "bad-serialization":
                _write(
                    {
                        "method": "item/agentMessage/delta",
                        "params": {
                            "delta": "x" * (1024 * 1024),
                            "itemId": f"item-{turn_id}",
                            "threadId": thread_id,
                            "turnId": turn_id,
                        },
                    }
                )
            else:
                self._complete(thread_id, turn_id, text or "completed")
            return
        if method == "turn/interrupt":
            params = message.get("params", {})
            key = (params.get("threadId"), params.get("turnId"))
            held = self._held_turns.pop(key, None)
            pending_request_id = next(
                (
                    request_id
                    for request_id, pending in self._pending_user_inputs.items()
                    if (pending["threadId"], pending["turnId"]) == key
                ),
                None,
            )
            if pending_request_id is None:
                pending_request_id = next(
                    (
                        request_id
                        for request_id, pending in self._deferred_user_input_resolutions.items()
                        if (pending["threadId"], pending["turnId"]) == key
                    ),
                    None,
                )
            if pending_request_id is not None:
                self._pending_user_inputs.pop(pending_request_id, None)
                self._deferred_user_input_resolutions.pop(pending_request_id, None)
            _write({"id": message["id"], "result": {}})
            if held is not None or pending_request_id is not None:
                _write(
                    {
                        "method": "turn/completed",
                        "params": {
                            "threadId": key[0],
                            "turn": _turn(key[1], "interrupted"),
                        },
                    }
                )
            return
        raise RuntimeError(f"unexpected request: {message!r}")


def main() -> None:
    launch_args = sys.argv[3:]
    if len(sys.argv) != 3 or launch_args:
        raise SystemExit(
            "usage: fake_python_bridge_app_server.py JOURNAL_PATH CHILD_PID_PATH"
        )
    journal_path = Path(sys.argv[1])
    Path(sys.argv[2]).write_text(str(os.getpid()), encoding="utf-8")
    server = FakeAppServer(journal_path, launch_args)
    for line in sys.stdin:
        message = json.loads(line)
        if not isinstance(message, dict):
            raise RuntimeError(f"expected object, got {message!r}")
        server.handle(message)


if __name__ == "__main__":
    main()
