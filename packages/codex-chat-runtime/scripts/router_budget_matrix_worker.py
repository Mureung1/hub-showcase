#!/usr/bin/env python3
"""Run one injected router budget through an actual SDK/App Server process tree."""

from __future__ import annotations

import asyncio
import json
import sys
from dataclasses import asdict, replace
from pathlib import Path
from typing import Any


sys.dont_write_bytecode = True

ACTIVE_TURN_ID = "turn-budget-active"
PENDING_TURN_ID = "turn-budget-staged"
ACTIVE_LOGIN_ID = "login-budget-active"


def _write_json_atomic(path: Path, value: dict[str, Any]) -> None:
    staged = path.with_suffix(path.suffix + ".new")
    staged.write_text(json.dumps(value, sort_keys=True), encoding="utf-8")
    staged.replace(path)


def _canonical_bytes(method: str, params: dict[str, Any]) -> int:
    return len(
        json.dumps(
            {"method": method, "params": params},
            allow_nan=False,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
    )


TURN_BYTES = _canonical_bytes(
    "unknown/turn-budget",
    {"text": "é", "turnId": ACTIVE_TURN_ID},
)
LOGIN_BYTES = _canonical_bytes(
    "account/login/completed",
    {"error": None, "loginId": ACTIVE_LOGIN_ID, "success": True},
)
GLOBAL_BYTES = _canonical_bytes("unknown/global-budget", {"text": "é"})


def _limits_for(scenario: str):
    from openai_codex._message_router import _RouterLimits

    limits = _RouterLimits(
        turn_items=8,
        turn_bytes=4096,
        active_turn_routes=4,
        pending_turn_routes=4,
        login_items=8,
        login_bytes=4096,
        active_login_routes=4,
        pending_login_routes=4,
        global_items=8,
        global_bytes=4096,
        aggregate_items=16,
        aggregate_bytes=8192,
    )
    replacements: dict[str, int] = {
        "active_turn_items": 2,
        "pending_turn_items": 2,
        "active_turn_bytes": TURN_BYTES,
        "pending_turn_bytes": TURN_BYTES,
        "login_items": 2,
        "login_bytes": LOGIN_BYTES,
        "global_items": 2,
        "global_bytes": GLOBAL_BYTES,
        "aggregate_items": 2,
        "aggregate_bytes": TURN_BYTES + LOGIN_BYTES,
        "active_turn_routes": 1,
        "pending_turn_routes": 1,
        "active_login_routes": 1,
        "pending_login_routes": 1,
    }
    field_by_scenario = {
        "active_turn_items": "turn_items",
        "pending_turn_items": "turn_items",
        "active_turn_bytes": "turn_bytes",
        "pending_turn_bytes": "turn_bytes",
        "login_items": "login_items",
        "login_bytes": "login_bytes",
        "global_items": "global_items",
        "global_bytes": "global_bytes",
        "aggregate_items": "aggregate_items",
        "aggregate_bytes": "aggregate_bytes",
        "active_turn_routes": "active_turn_routes",
        "pending_turn_routes": "pending_turn_routes",
        "active_login_routes": "active_login_routes",
        "pending_login_routes": "pending_login_routes",
    }
    try:
        field = field_by_scenario[scenario]
        value = replacements[scenario]
    except KeyError as exc:
        raise RuntimeError(f"unknown router budget scenario: {scenario}") from exc
    return replace(limits, **{field: value}), field, value


def _failure_evidence(exc: BaseException) -> dict[str, Any]:
    return {
        "attempted": getattr(exc, "attempted", None),
        "budget": getattr(exc, "budget", None),
        "code": getattr(exc, "code", None),
        "limit": getattr(exc, "limit", None),
        "scope": getattr(exc, "scope", None),
        "type": type(exc).__name__,
    }


def _boundary_measure(usage: Any, field: str) -> int:
    return int(getattr(usage, field))


async def _run(
    scenario: str,
    fake_server: Path,
    result_path: Path,
    child_pid_path: Path,
    trace_path: Path,
) -> None:
    from openai_codex import AsyncCodex, CodexConfig
    from openai_codex._message_router import MessageRouter

    limits, measured_field, expected_boundary = _limits_for(scenario)
    codex = AsyncCodex(
        config=CodexConfig(
            launch_args_override=(
                sys.executable,
                str(fake_server),
                scenario,
                str(child_pid_path),
                str(trace_path),
            )
        )
    )
    sync_client = codex._client._sync
    if sync_client._proc is not None:
        raise RuntimeError("router limits must be injected before SDK startup")
    router = MessageRouter(limits)
    sync_client._router = router
    child = None
    failure: BaseException | None = None
    evidence: dict[str, Any] = {}
    try:
        await codex.thread_list()
        child = sync_client._proc

        if scenario.startswith("active_turn_") or scenario.startswith("aggregate_"):
            router.register_turn(ACTIVE_TURN_ID)
        if (
            scenario.startswith("login_")
            or scenario == "active_login_routes"
            or scenario.startswith("aggregate_")
        ):
            router.register_login(ACTIVE_LOGIN_ID)

        if scenario == "active_turn_routes":
            boundary = router._usage_snapshot()
            try:
                router.register_turn("turn-budget-active-2")
            except BaseException as exc:
                failure = exc
        elif scenario == "active_login_routes":
            boundary = router._usage_snapshot()
            try:
                router.register_login("login-budget-active-2")
            except BaseException as exc:
                failure = exc
        else:
            await codex.thread_list()
            boundary = router._usage_snapshot()
            try:
                await codex.thread_list()
            except BaseException as exc:
                failure = exc

        if failure is None:
            raise RuntimeError("budget candidate did not fail")
        try:
            await codex._client.next_notification()
        except BaseException as future_failure:
            future = _failure_evidence(future_failure)
            future["same_object"] = future_failure is failure
        else:
            future = {"type": "unexpected_success"}
        terminal = router._usage_snapshot()
        evidence = {
            "boundary_measure": _boundary_measure(boundary, measured_field),
            "boundary_usage": asdict(boundary),
            "canonical_bytes": {
                "global": GLOBAL_BYTES,
                "login": LOGIN_BYTES,
                "turn": TURN_BYTES,
            },
            "expected_boundary": expected_boundary,
            "failure": _failure_evidence(failure),
            "future_failure": future,
            "scenario": scenario,
            "terminal_usage": asdict(terminal),
        }
    finally:
        await codex.close()

    evidence["child_reaped"] = child is not None and child.poll() is not None
    _write_json_atomic(result_path, evidence)


def main() -> None:
    if len(sys.argv) != 6:
        raise SystemExit(
            "usage: router_budget_matrix_worker.py SCENARIO FAKE_SERVER "
            "RESULT_PATH CHILD_PID_PATH TRACE_PATH"
        )
    asyncio.run(
        _run(
            sys.argv[1],
            Path(sys.argv[2]),
            Path(sys.argv[3]),
            Path(sys.argv[4]),
            Path(sys.argv[5]),
        )
    )


if __name__ == "__main__":
    main()
