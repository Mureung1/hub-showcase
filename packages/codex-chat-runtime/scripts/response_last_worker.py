#!/usr/bin/env python3
"""Run the public async SDK against the response-last fake child."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path


sys.dont_write_bytecode = True


def _write_json_atomic(path: Path, value: dict[str, object]) -> None:
    staged = path.with_suffix(path.suffix + ".new")
    staged.write_text(json.dumps(value, sort_keys=True), encoding="utf-8")
    staged.replace(path)


def _event_item_id(event: object) -> str | None:
    payload = getattr(event, "payload", None)
    direct = getattr(payload, "item_id", None)
    if isinstance(direct, str):
        return direct
    item = getattr(payload, "item", None)
    root = getattr(item, "root", None)
    nested = getattr(root, "id", None)
    return nested if isinstance(nested, str) else None


async def _run(
    fake_server: Path,
    result_path: Path,
    child_pid_path: Path,
    trace_path: Path,
    response_path: Path,
) -> None:
    from openai_codex import AsyncCodex, CodexConfig

    codex = AsyncCodex(
        config=CodexConfig(
            launch_args_override=(
                sys.executable,
                str(fake_server),
                str(child_pid_path),
                str(trace_path),
            )
        )
    )
    child = codex._client._sync._proc
    try:
        async with codex:
            child = codex._client._sync._proc
            thread = await codex.thread_start()
            turn = await thread.turn("hello")
            _write_json_atomic(
                response_path,
                {"thread_id": thread.id, "turn_id": turn.id},
            )
            events = [event async for event in turn.stream()]
    finally:
        await codex.close()

    _write_json_atomic(
        result_path,
        {
            "child_reaped": child is not None and child.poll() is not None,
            "event_methods": [event.method for event in events],
            "item_ids": [_event_item_id(event) for event in events],
            "thread_id": thread.id,
            "turn_id": turn.id,
            "turn_ids": [
                getattr(event.payload, "turn_id", None)
                or getattr(getattr(event.payload, "turn", None), "id", None)
                for event in events
            ],
        },
    )


def main() -> None:
    if len(sys.argv) != 6:
        raise SystemExit(
            "usage: response_last_worker.py FAKE_SERVER RESULT_PATH CHILD_PID_PATH "
            "TRACE_PATH RESPONSE_PATH"
        )
    asyncio.run(
        _run(
            Path(sys.argv[1]),
            Path(sys.argv[2]),
            Path(sys.argv[3]),
            Path(sys.argv[4]),
            Path(sys.argv[5]),
        )
    )


if __name__ == "__main__":
    main()
