#!/usr/bin/env python3
"""Actual-child oracle for bounded official SDK notification routing."""

from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path


sys.dont_write_bytecode = True
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
ACTIVE_SDK_SRC = Path(
    os.environ.get(
        "AY_PLE_CODEX_SDK_SRC",
        str(PACKAGE_ROOT / "python" / "openai-codex" / "sdk" / "python" / "src"),
    )
).resolve()
FAKE_SERVER = Path(__file__).with_name("fake_bounded_router_app_server.py")
WORKER = Path(__file__).with_name("bounded_router_worker.py")
TURN_ITEM_LIMIT = 4_096
EXPECTED_STEPS = [
    "initialized",
    "thread-a-started",
    "thread-b-started",
    "login-started",
    "turn-b-response",
    "turn-a-exact-boundary",
    "turn-b-completed",
    "stalled-turn-first-event",
    "waiter-readiness-acknowledged",
    "turn-a-overflow-candidate",
]


def _process_exists(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    return True


def _process_group_exists(pgid: int) -> bool:
    try:
        os.killpg(pgid, 0)
    except ProcessLookupError:
        return False
    return True


def _wait_for_process_exit(pid: int, deadline: float) -> None:
    while _process_exists(pid) and time.monotonic() < deadline:
        time.sleep(0.01)
    if _process_exists(pid):
        raise AssertionError(f"process {pid} was not reaped")


def _wait_for_process_group_exit(pgid: int, deadline: float) -> None:
    while _process_group_exists(pgid) and time.monotonic() < deadline:
        time.sleep(0.01)
    if _process_group_exists(pgid):
        raise AssertionError(f"process group {pgid} was not reaped")


def _worker_env() -> dict[str, str]:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ACTIVE_SDK_SRC)
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    return env


class BoundedRouterActualChildTests(unittest.TestCase):
    def _start_worker(
        self,
        root: Path,
    ) -> tuple[subprocess.Popen[str], Path, Path, Path]:
        result_path = root / "result.json"
        child_pid_path = root / "child.pid"
        trace_path = root / "trace.json"
        worker = subprocess.Popen(
            [
                sys.executable,
                str(WORKER),
                str(FAKE_SERVER),
                str(result_path),
                str(child_pid_path),
                str(trace_path),
            ],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=_worker_env(),
            start_new_session=True,
        )
        return worker, result_path, child_pid_path, trace_path

    def _kill_worker_group(self, worker: subprocess.Popen[str]) -> tuple[str, str]:
        try:
            os.killpg(worker.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            worker.wait(timeout=0.5)
        except subprocess.TimeoutExpired:
            pass
        if _process_group_exists(worker.pid):
            os.killpg(worker.pid, signal.SIGKILL)
        if worker.poll() is None:
            worker.wait(timeout=1)
        return worker.communicate(timeout=1)

    def _reap_worker_group(
        self,
        worker: subprocess.Popen[str],
        child_pid_path: Path,
    ) -> int | None:
        self._kill_worker_group(worker)
        child_pid = (
            int(child_pid_path.read_text(encoding="utf-8"))
            if child_pid_path.exists()
            else None
        )
        if child_pid is not None:
            _wait_for_process_exit(child_pid, time.monotonic() + 2)
        _wait_for_process_group_exit(worker.pid, time.monotonic() + 2)
        return child_pid

    def test_pending_a_boundary_allows_b_then_overflow_settles_waiters(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ay-ple-bounded-router-") as temp:
            worker, result_path, child_pid_path, trace_path = self._start_worker(
                Path(temp)
            )
            timed_out = False
            stdout = ""
            stderr = ""
            try:
                try:
                    stdout, stderr = worker.communicate(timeout=12)
                except subprocess.TimeoutExpired:
                    timed_out = True
                result = (
                    json.loads(result_path.read_text(encoding="utf-8"))
                    if result_path.exists()
                    else None
                )
                trace = (
                    json.loads(trace_path.read_text(encoding="utf-8"))
                    if trace_path.exists()
                    else None
                )
            finally:
                child_pid = self._reap_worker_group(worker, child_pid_path)

            if timed_out:
                self.fail("bounded-router worker timed out instead of failing waiters")
            self.assertEqual((worker.returncode, stdout, stderr), (0, "", ""))
            self.assertIsNotNone(child_pid)
            self.assertIsNotNone(result)
            self.assertIsNotNone(trace)
            assert child_pid is not None
            assert result is not None
            assert trace is not None

            self.assertEqual(trace["pid"], child_pid)
            self.assertEqual(trace["ppid"], worker.pid)
            self.assertEqual(trace["pgid"], worker.pid)
            self.assertEqual(trace["boundary_count"], TURN_ITEM_LIMIT)
            self.assertEqual(trace["emitted_a_count"], TURN_ITEM_LIMIT + 1)
            self.assertEqual(trace["steps"], EXPECTED_STEPS)

            self.assertEqual(
                result["thread_ids"],
                ["thread-bounded-a", "thread-bounded-b"],
            )
            self.assertEqual(
                result["b_result"],
                {
                    "final_response": "B completed",
                    "id": "turn-bounded-b",
                    "status": "completed",
                },
            )
            self.assertEqual(result["first_stalled_method"], "turn/started")
            self.assertEqual(
                result["login_handle"],
                {
                    "auth_url": "https://example.invalid/codex-login",
                    "login_id": "login-bounded",
                },
            )
            self.assertEqual(result["ready_page_size"], 0)
            self.assertEqual(
                result["waiter_snapshot_before_overflow"],
                {
                    "global_waiters": 1,
                    "login_waiters": 1,
                    "response_waiters": 1,
                    "turn_waiters": 1,
                },
            )

            failures = [
                result["response_failure"],
                result["turn_failure"],
                result["login_failure"],
                result["global_failure"],
                result["future_global_failure"],
            ]
            self.assertEqual(
                [failure["code"] for failure in failures],
                ["buffer_overflow"] * 5,
            )
            self.assertEqual(len({failure["type"] for failure in failures}), 1)
            self.assertNotEqual(failures[0]["type"], "unexpected_success")
            self.assertTrue(result["child_reaped"])


if __name__ == "__main__":
    unittest.main()
