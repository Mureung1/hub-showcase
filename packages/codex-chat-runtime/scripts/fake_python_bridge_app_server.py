#!/usr/bin/env python3
"""Purpose-built App Server child for the persistent Python bridge oracle."""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any


def _write(message: dict[str, Any]) -> None:
    sys.stdout.write(
        json.dumps(message, ensure_ascii=True, separators=(",", ":")) + "\n"
    )
    sys.stdout.flush()


def _write_raw(line: str) -> None:
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


def _input_text(params: dict[str, Any]) -> str:
    for item in params.get("input", []):
        if isinstance(item, dict) and item.get("type") == "text":
            value = item.get("text")
            if isinstance(value, str):
                return value
    return ""


class FakeAppServer:
    def __init__(self, journal_path: Path) -> None:
        self._journal_path = journal_path
        self._messages: list[dict[str, Any]] = []
        self._thread_count = 0
        self._turn_count = 0
        self._held_turns: dict[tuple[str, str], dict[str, Any]] = {}
        self._opt_out_notification_methods: set[str] = set()

    def _record(self, message: dict[str, Any]) -> None:
        self._messages.append(message)
        staged = self._journal_path.with_suffix(self._journal_path.suffix + ".new")
        staged.write_text(
            json.dumps({"messages": self._messages}, ensure_ascii=True, sort_keys=True),
            encoding="utf-8",
        )
        staged.replace(self._journal_path)

    def _notify(self, message: dict[str, Any]) -> None:
        method = message.get("method")
        if isinstance(method, str) and method in self._opt_out_notification_methods:
            return
        _write(message)

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

    def handle(self, message: dict[str, Any]) -> None:
        self._record(message)
        method = message.get("method")
        if method == "initialized" and "id" not in message:
            return
        if "id" not in message:
            raise RuntimeError(f"unexpected notification: {message!r}")
        if method == "initialize":
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
        if method == "turn/start":
            self._turn_count += 1
            turn_id = f"turn-{self._turn_count}"
            params = message.get("params", {})
            thread_id = params.get("threadId")
            text = _input_text(params)
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
            _write({"id": message["id"], "result": {}})
            if held is not None:
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
    if len(sys.argv) != 3:
        raise SystemExit(
            "usage: fake_python_bridge_app_server.py JOURNAL_PATH CHILD_PID_PATH"
        )
    journal_path = Path(sys.argv[1])
    Path(sys.argv[2]).write_text(str(os.getpid()), encoding="utf-8")
    server = FakeAppServer(journal_path)
    for line in sys.stdin:
        message = json.loads(line)
        if not isinstance(message, dict):
            raise RuntimeError(f"expected object, got {message!r}")
        server.handle(message)


if __name__ == "__main__":
    main()
