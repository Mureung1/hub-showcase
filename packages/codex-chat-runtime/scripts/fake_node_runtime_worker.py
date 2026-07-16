#!/usr/bin/env python3
"""Purpose-built malformed and process-lifecycle worker for Node tests."""

from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--site-packages", required=True)
    parser.add_argument("--scenario", required=True)
    parser.add_argument("--process-journal", required=True)
    parser.add_argument("--launch-arg", action="append", default=[])
    parser.add_argument("--codex-bin")
    return parser


def _write(value: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(value, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def _write_journal(
    path: Path,
    *,
    descendant_pid: int | None,
    commands: list[dict[str, Any]] | None = None,
) -> None:
    staged = path.with_suffix(path.suffix + ".new")
    staged.write_text(
        json.dumps(
            {
                "descendantPid": descendant_pid,
                "processGroupId": os.getpgrp(),
                "workerPid": os.getpid(),
                "commands": commands or [],
            },
            sort_keys=True,
        ),
        encoding="utf-8",
    )
    staged.replace(path)


def _spawn_stubborn_descendant() -> subprocess.Popen[bytes]:
    program = (
        "import signal,time;"
        "signal.signal(signal.SIGTERM, signal.SIG_IGN);"
        "time.sleep(3600)"
    )
    return subprocess.Popen(
        [sys.executable, "-B", "-c", program],
        stdin=subprocess.DEVNULL,
        stdout=sys.stdout.buffer,
        stderr=sys.stderr.buffer,
    )


def main() -> None:
    args = _parser().parse_args()
    journal = Path(args.process_journal)
    if args.scenario == "startup-hang":
        _write_journal(journal, descendant_pid=None)
        while True:
            time.sleep(3600)
    if args.scenario == "response-hang":
        commands: list[dict[str, Any]] = []
        _write_journal(journal, descendant_pid=None, commands=commands)
        _write({"type": "ready"})
        for line in sys.stdin:
            message = json.loads(line)
            commands.append(message)
            _write_journal(journal, descendant_pid=None, commands=commands)
        return
    if args.scenario == "close-ack-followed-by-result":
        commands = []
        _write_journal(journal, descendant_pid=None, commands=commands)
        _write({"type": "ready"})
        start_thread = json.loads(sys.stdin.readline())
        commands.append(start_thread)
        _write_journal(journal, descendant_pid=None, commands=commands)
        close = json.loads(sys.stdin.readline())
        commands.append(close)
        _write_journal(journal, descendant_pid=None, commands=commands)
        sys.stdout.write(
            json.dumps(
                {
                    "type": "close_ack",
                    "bridgeRequestId": close["bridgeRequestId"],
                },
                separators=(",", ":"),
            )
            + "\n"
            + json.dumps(
                {
                    "type": "result",
                    "bridgeRequestId": start_thread["bridgeRequestId"],
                    "command": "start_thread",
                    "threadId": "post-ack-success",
                },
                separators=(",", ":"),
            )
            + "\n"
        )
        sys.stdout.flush()
        return
    if args.scenario == "stdin-stall":
        commands = []
        _write_journal(journal, descendant_pid=None, commands=commands)
        _write({"type": "ready"})
        message = json.loads(sys.stdin.readline())
        commands.append(message)
        _write_journal(journal, descendant_pid=None, commands=commands)
        _write(
            {
                "type": "result",
                "bridgeRequestId": message["bridgeRequestId"],
                "command": "start_thread",
                "threadId": "thread-1",
            }
        )
        while True:
            time.sleep(3600)
    if args.scenario == "unsafe-fatal":
        commands = []
        _write_journal(journal, descendant_pid=None, commands=commands)
        _write({"type": "ready"})
        for line in sys.stdin:
            message = json.loads(line)
            commands.append(message)
            _write_journal(journal, descendant_pid=None, commands=commands)
            sys.stderr.write(
                "Traceback /private/secret OPENAI_API_KEY=leaked "
                + ("x" * 256)
                + " stderr-tail"
            )
            sys.stderr.flush()
            _write(
                {
                    "type": "fatal",
                    "code": "sdk_transport_failed",
                    "displayMessage": "Traceback /private/secret leaked",
                }
            )
            while True:
                time.sleep(3600)
        return
    if args.scenario in {
        "invalid-utf8",
        "malformed-output",
        "multiple-pending-eof",
        "oversized-output",
        "pending-eof",
    }:
        commands = []
        _write_journal(journal, descendant_pid=None, commands=commands)
        _write({"type": "ready"})
        line = sys.stdin.readline()
        if line:
            message = json.loads(line)
            commands.append(message)
            _write_journal(journal, descendant_pid=None, commands=commands)
        if args.scenario == "malformed-output":
            sys.stdout.write("{malformed-json}\n")
            sys.stdout.flush()
        elif args.scenario == "invalid-utf8":
            sys.stdout.buffer.write(b"\xff\n")
            sys.stdout.buffer.flush()
        elif args.scenario == "oversized-output":
            sys.stdout.buffer.write(b"x" * (1024 * 1024))
            sys.stdout.buffer.flush()
        elif args.scenario == "multiple-pending-eof":
            second_line = sys.stdin.readline()
            if second_line:
                commands.append(json.loads(second_line))
                _write_journal(journal, descendant_pid=None, commands=commands)
            return
        else:
            return
        while True:
            time.sleep(3600)
    if args.scenario == "duplicate-response":
        commands = []
        _write_journal(journal, descendant_pid=None, commands=commands)
        _write({"type": "ready"})
        message = json.loads(sys.stdin.readline())
        commands.append(message)
        _write_journal(journal, descendant_pid=None, commands=commands)
        result = {
            "type": "result",
            "bridgeRequestId": message["bridgeRequestId"],
            "command": "start_thread",
            "threadId": "thread-1",
        }
        _write(result)
        _write(result)
        while True:
            time.sleep(3600)
    if args.scenario == "event-after-terminal":
        commands = []
        _write_journal(journal, descendant_pid=None, commands=commands)
        _write({"type": "ready"})
        for line in sys.stdin:
            message = json.loads(line)
            commands.append(message)
            _write_journal(journal, descendant_pid=None, commands=commands)
            bridge_request_id = message["bridgeRequestId"]
            if message["command"] == "start_thread":
                _write(
                    {
                        "type": "result",
                        "bridgeRequestId": bridge_request_id,
                        "command": "start_thread",
                        "threadId": "thread-1",
                    }
                )
            elif message["command"] == "start_turn":
                _write(
                    {
                        "type": "result",
                        "bridgeRequestId": bridge_request_id,
                        "command": "start_turn",
                        "threadId": "thread-1",
                        "turnId": "turn-1",
                    }
                )
                terminal = {
                    "type": "event",
                    "bridgeRequestId": bridge_request_id,
                    "event": {
                        "type": "turn.completed",
                        "threadId": "thread-1",
                        "turnId": "turn-1",
                        "status": "completed",
                    },
                }
                _write(terminal)
                _write(terminal)
                while True:
                    time.sleep(3600)
        return
    if args.scenario in {"stream-active", "stream-complete", "stream-idle"}:
        commands = []
        _write_journal(journal, descendant_pid=None, commands=commands)
        _write({"type": "ready"})
        for line in sys.stdin:
            message = json.loads(line)
            commands.append(message)
            _write_journal(journal, descendant_pid=None, commands=commands)
            bridge_request_id = message.get("bridgeRequestId")
            if message.get("command") == "start_thread":
                if args.scenario == "stream-complete":
                    time.sleep(0.03)
                _write(
                    {
                        "type": "result",
                        "bridgeRequestId": bridge_request_id,
                        "command": "start_thread",
                        "threadId": "thread-1",
                    }
                )
            elif message.get("command") == "start_turn":
                if args.scenario == "stream-complete":
                    time.sleep(0.03)
                _write(
                    {
                        "type": "result",
                        "bridgeRequestId": bridge_request_id,
                        "command": "start_turn",
                        "threadId": "thread-1",
                        "turnId": "turn-1",
                    }
                )
                if args.scenario == "stream-active":
                    index = 0
                    while True:
                        _write(
                            {
                                "type": "event",
                                "bridgeRequestId": bridge_request_id,
                                "event": {
                                    "type": "agent_message.delta",
                                    "threadId": "thread-1",
                                    "turnId": "turn-1",
                                    "itemId": "item-1",
                                    "delta": str(index),
                                },
                            }
                        )
                        index += 1
                        time.sleep(0.02)
                elif args.scenario == "stream-complete":
                    _write(
                        {
                            "type": "event",
                            "bridgeRequestId": bridge_request_id,
                            "event": {
                                "type": "turn.completed",
                                "threadId": "thread-1",
                                "turnId": "turn-1",
                                "status": "completed",
                            },
                        }
                    )
            elif message.get("command") == "close":
                _write(
                    {
                        "type": "close_ack",
                        "bridgeRequestId": bridge_request_id,
                    }
                )
                return
        return
    if args.scenario == "leader-exits-first":
        descendant = _spawn_stubborn_descendant()
        _write_journal(journal, descendant_pid=descendant.pid)
        _write({"type": "ready"})
        for line in sys.stdin:
            message = json.loads(line)
            if message.get("command") == "close":
                return
        return
    if args.scenario == "fatal-on-close":
        commands = []
        start_thread_count = 0
        _write_journal(journal, descendant_pid=None, commands=commands)
        _write({"type": "ready"})
        for line in sys.stdin:
            message = json.loads(line)
            commands.append(message)
            _write_journal(journal, descendant_pid=None, commands=commands)
            bridge_request_id = message.get("bridgeRequestId")
            if message.get("command") == "start_thread":
                start_thread_count += 1
                if start_thread_count == 1:
                    _write(
                        {
                            "type": "result",
                            "bridgeRequestId": bridge_request_id,
                            "command": "start_thread",
                            "threadId": "thread-1",
                        }
                    )
            elif message.get("command") == "start_turn":
                _write(
                    {
                        "type": "result",
                        "bridgeRequestId": bridge_request_id,
                        "command": "start_turn",
                        "threadId": "thread-1",
                        "turnId": "turn-1",
                    }
                )
            elif message.get("command") == "close":
                sys.stdout.write("{malformed-json}\n")
                sys.stdout.flush()
                while True:
                    time.sleep(3600)
        return
    if args.scenario != "stubborn-close":
        raise SystemExit("unknown fake worker scenario")

    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    descendant = _spawn_stubborn_descendant()
    _write_journal(journal, descendant_pid=descendant.pid)
    _write({"type": "ready"})
    for line in sys.stdin:
        message = json.loads(line)
        if message.get("command") == "close":
            while True:
                time.sleep(3600)


if __name__ == "__main__":
    main()
