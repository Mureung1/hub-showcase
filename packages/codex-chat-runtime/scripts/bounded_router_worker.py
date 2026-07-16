#!/usr/bin/env python3
"""Exercise bounded routing through the public async SDK and an OS child."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from typing import Any, AsyncIterator, Awaitable


sys.dont_write_bytecode = True


def _write_json_atomic(path: Path, value: dict[str, Any]) -> None:
    staged = path.with_suffix(path.suffix + ".new")
    staged.write_text(json.dumps(value, sort_keys=True), encoding="utf-8")
    staged.replace(path)


async def _capture_overflow(awaitable: Awaitable[object]) -> dict[str, object]:
    try:
        value = await awaitable
    except BaseException as exc:
        return {
            "code": getattr(exc, "code", None),
            "message": str(exc),
            "type": type(exc).__name__,
        }
    return {
        "code": None,
        "message": f"unexpected success: {value!r}",
        "type": "unexpected_success",
    }


async def _wait_for_registered_waiters(codex: Any) -> dict[str, int]:
    fields = (
        "response_waiters",
        "turn_waiters",
        "login_waiters",
        "global_waiters",
    )
    deadline = asyncio.get_running_loop().time() + 2
    while True:
        snapshot = codex._client._sync._router._usage_snapshot()
        waiters = {field: int(getattr(snapshot, field)) for field in fields}
        if all(value >= 1 for value in waiters.values()):
            return waiters
        if asyncio.get_running_loop().time() >= deadline:
            raise RuntimeError(
                f"router waiters did not register before deadline: {waiters}"
            )
        await asyncio.sleep(0.005)


async def _run(
    fake_server: Path,
    result_path: Path,
    child_pid_path: Path,
    trace_path: Path,
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
    child = None
    stalled_stream: AsyncIterator[object] | None = None
    tasks: list[asyncio.Task[Any]] = []
    evidence: dict[str, Any] = {}
    try:
        thread_a = await codex.thread_start()
        child = codex._client._sync._proc
        thread_b = await codex.thread_start()
        login = await codex.login_chatgpt()
        login_waiter = asyncio.create_task(login.wait())
        tasks.append(login_waiter)

        turn_b = await thread_b.turn("complete B")
        b_result_task = asyncio.create_task(turn_b.run())
        response_waiter = asyncio.create_task(thread_a.turn("fill A"))
        tasks.extend((b_result_task, response_waiter))
        b_result = await b_result_task

        stalled_turn = await thread_b.turn("stall B")
        stalled_stream = stalled_turn.stream()
        first_stalled_event = await anext(stalled_stream)
        turn_waiter = asyncio.create_task(anext(stalled_stream))
        global_waiter = asyncio.create_task(codex._client.next_notification())
        tasks.extend((turn_waiter, global_waiter))

        waiter_snapshot = await _wait_for_registered_waiters(codex)
        ready_page = await codex.thread_list()

        (
            response_failure,
            turn_failure,
            login_failure,
            global_failure,
        ) = await asyncio.gather(
            _capture_overflow(response_waiter),
            _capture_overflow(turn_waiter),
            _capture_overflow(login_waiter),
            _capture_overflow(global_waiter),
        )
        future_global_waiter = asyncio.create_task(codex._client.next_notification())
        tasks.append(future_global_waiter)
        future_global_failure = await _capture_overflow(future_global_waiter)
        evidence = {
            "b_result": {
                "final_response": b_result.final_response,
                "id": b_result.id,
                "status": b_result.status.value,
            },
            "first_stalled_method": first_stalled_event.method,
            "future_global_failure": future_global_failure,
            "global_failure": global_failure,
            "login_failure": login_failure,
            "login_handle": {
                "auth_url": login.auth_url,
                "login_id": login.login_id,
            },
            "ready_page_size": len(ready_page.data),
            "response_failure": response_failure,
            "thread_ids": [thread_a.id, thread_b.id],
            "turn_failure": turn_failure,
            "waiter_snapshot_before_overflow": waiter_snapshot,
        }
    finally:
        try:
            await codex.close()
        finally:
            for task in tasks:
                if not task.done():
                    task.cancel()
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
            if stalled_stream is not None:
                await asyncio.gather(stalled_stream.aclose(), return_exceptions=True)

    evidence["child_reaped"] = child is not None and child.poll() is not None
    _write_json_atomic(result_path, evidence)


def main() -> None:
    if len(sys.argv) != 5:
        raise SystemExit(
            "usage: bounded_router_worker.py FAKE_SERVER RESULT_PATH "
            "CHILD_PID_PATH TRACE_PATH"
        )
    asyncio.run(
        _run(
            Path(sys.argv[1]),
            Path(sys.argv[2]),
            Path(sys.argv[3]),
            Path(sys.argv[4]),
        )
    )


if __name__ == "__main__":
    main()
