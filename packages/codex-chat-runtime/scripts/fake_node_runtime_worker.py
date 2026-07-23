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
from collections.abc import Iterator
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
    parser.add_argument("--client-name", required=True)
    parser.add_argument("--client-title", required=True)
    parser.add_argument("--client-version", required=True)
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


def _start_scenario(
    journal: Path, *, descendant_pid: int | None = None
) -> list[dict[str, Any]]:
    commands: list[dict[str, Any]] = []
    _write_journal(journal, descendant_pid=descendant_pid, commands=commands)
    _write({"type": "ready"})
    return commands


def _read_command(
    journal: Path,
    commands: list[dict[str, Any]],
    *,
    descendant_pid: int | None = None,
) -> dict[str, Any] | None:
    line = sys.stdin.readline()
    if not line:
        return None
    command = json.loads(line)
    commands.append(command)
    _write_journal(journal, descendant_pid=descendant_pid, commands=commands)
    return command


def _iter_commands(
    journal: Path,
    commands: list[dict[str, Any]],
    *,
    descendant_pid: int | None = None,
) -> Iterator[dict[str, Any]]:
    for line in sys.stdin:
        command = json.loads(line)
        commands.append(command)
        _write_journal(journal, descendant_pid=descendant_pid, commands=commands)
        yield command


def main() -> None:
    args = _parser().parse_args()
    journal = Path(args.process_journal)
    if args.scenario == "startup-hang":
        _write_journal(journal, descendant_pid=None)
        while True:
            time.sleep(3600)
    if args.scenario == "response-hang":
        commands = _start_scenario(journal)
        for _message in _iter_commands(journal, commands):
            pass
        return
    if args.scenario == "close-ack-followed-by-result":
        commands = _start_scenario(journal)
        start_thread = _read_command(journal, commands)
        close = _read_command(journal, commands)
        if start_thread is None or close is None:
            return
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
        commands = _start_scenario(journal)
        message = _read_command(journal, commands)
        if message is None:
            return
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
        commands = _start_scenario(journal)
        for _message in _iter_commands(journal, commands):
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
        commands = _start_scenario(journal)
        _read_command(journal, commands)
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
            _read_command(journal, commands)
            return
        else:
            return
        while True:
            time.sleep(3600)
    if args.scenario == "duplicate-response":
        commands = _start_scenario(journal)
        message = _read_command(journal, commands)
        if message is None:
            return
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
        commands = _start_scenario(journal)
        for message in _iter_commands(journal, commands):
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
        commands = _start_scenario(journal)
        for message in _iter_commands(journal, commands):
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
        commands = _start_scenario(journal, descendant_pid=descendant.pid)
        for message in _iter_commands(journal, commands, descendant_pid=descendant.pid):
            if message.get("command") == "close":
                return
        return
    if args.scenario == "fatal-on-close":
        commands = _start_scenario(journal)
        start_thread_count = 0
        for message in _iter_commands(journal, commands):
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
    commands = _start_scenario(journal, descendant_pid=descendant.pid)
    for message in _iter_commands(journal, commands, descendant_pid=descendant.pid):
        if message.get("command") == "close":
            while True:
                time.sleep(3600)


if __name__ == "__main__":
    main()
