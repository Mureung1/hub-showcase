#!/usr/bin/env python3
"""Regression gates for the official SDK response-last router correction."""

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
UNPATCHED_SDK_SRC = Path(
    os.environ.get(
        "AY_PLE_UNPATCHED_CODEX_SDK_SRC",
        str(PACKAGE_ROOT / "python" / "openai-codex" / "sdk" / "python" / "src"),
    )
).resolve()
ACTIVE_SDK_SRC = Path(
    os.environ.get("AY_PLE_CODEX_SDK_SRC", str(UNPATCHED_SDK_SRC))
).resolve()
sys.path.insert(0, str(ACTIVE_SDK_SRC))

FAKE_SERVER = Path(__file__).with_name("fake_response_last_app_server.py")
WORKER = Path(__file__).with_name("response_last_worker.py")
EXPECTED_METHODS = [
    "turn/started",
    "item/agentMessage/delta",
    "item/completed",
    "turn/completed",
]
EXPECTED_TRACE = [*EXPECTED_METHODS, "turn/start#response"]


def _process_exists(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    return True


def _wait_for_path(path: Path, deadline: float) -> None:
    while not path.exists() and time.monotonic() < deadline:
        time.sleep(0.01)
    if not path.exists():
        raise AssertionError(f"timed out waiting for {path.name}")


def _wait_for_process_exit(pid: int, deadline: float) -> None:
    while _process_exists(pid) and time.monotonic() < deadline:
        time.sleep(0.01)
    if _process_exists(pid):
        raise AssertionError(f"process {pid} was not reaped")


def _process_group_exists(pgid: int) -> bool:
    try:
        os.killpg(pgid, 0)
    except ProcessLookupError:
        return False
    return True


def _wait_for_process_group_exit(pgid: int, deadline: float) -> None:
    while _process_group_exists(pgid) and time.monotonic() < deadline:
        time.sleep(0.01)
    if _process_group_exists(pgid):
        raise AssertionError(f"process group {pgid} was not reaped")


def _worker_env(sdk_src: Path, *, fake_mode: str | None = None) -> dict[str, str]:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(sdk_src)
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    if fake_mode is not None:
        env["AY_PLE_RESPONSE_LAST_FAKE_MODE"] = fake_mode
    else:
        env.pop("AY_PLE_RESPONSE_LAST_FAKE_MODE", None)
    return env


class ResponseLastActualChildTests(unittest.TestCase):
    def _start_worker(
        self,
        sdk_src: Path,
        root: Path,
        *,
        fake_mode: str | None = None,
    ) -> tuple[subprocess.Popen[str], Path, Path, Path, Path]:
        result_path = root / "result.json"
        child_pid_path = root / "child.pid"
        trace_path = root / "trace.json"
        response_path = root / "response.json"
        worker = subprocess.Popen(
            [
                sys.executable,
                str(WORKER),
                str(FAKE_SERVER),
                str(result_path),
                str(child_pid_path),
                str(trace_path),
                str(response_path),
            ],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=_worker_env(sdk_src, fake_mode=fake_mode),
            start_new_session=True,
        )
        return worker, result_path, child_pid_path, trace_path, response_path

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

    def test_pre_handshake_failure_still_reaps_worker_group(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="ay-ple-response-last-harness-failure-"
        ) as temp:
            worker, _result_path, child_pid_path, trace_path, response_path = (
                self._start_worker(
                    ACTIVE_SDK_SRC,
                    Path(temp),
                    fake_mode="stall-before-trace",
                )
            )
            child_pid: int | None = None
            try:
                _wait_for_path(child_pid_path, time.monotonic() + 2)
                child_pid = int(child_pid_path.read_text(encoding="utf-8"))
                with self.assertRaises(AssertionError):
                    _wait_for_path(trace_path, time.monotonic() + 0.1)
            finally:
                reaped_child_pid = self._reap_worker_group(worker, child_pid_path)
                if child_pid is None:
                    child_pid = reaped_child_pid

            self.assertIsNotNone(child_pid)
            self.assertFalse(trace_path.exists())
            self.assertFalse(response_path.exists())
            self.assertIsNotNone(worker.returncode)

    def test_unpatched_response_last_failure_is_bounded_and_reaped(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ay-ple-response-last-red-") as temp:
            worker, result_path, child_pid_path, trace_path, response_path = (
                self._start_worker(
                    UNPATCHED_SDK_SRC,
                    Path(temp),
                )
            )
            child_pid: int | None = None
            try:
                _wait_for_path(trace_path, time.monotonic() + 2)
                _wait_for_path(response_path, time.monotonic() + 2)
                child_pid = int(child_pid_path.read_text(encoding="utf-8"))
                trace = json.loads(trace_path.read_text(encoding="utf-8"))
                response = json.loads(response_path.read_text(encoding="utf-8"))
                with self.assertRaises(subprocess.TimeoutExpired):
                    worker.wait(timeout=0.5)
            finally:
                reaped_child_pid = self._reap_worker_group(worker, child_pid_path)
                if child_pid is None:
                    child_pid = reaped_child_pid

            self.assertIsNotNone(child_pid)
            self.assertEqual(trace["pid"], child_pid)
            self.assertEqual(trace["ppid"], worker.pid)
            self.assertEqual(trace["pgid"], worker.pid)
            self.assertEqual(trace["emitted_methods"], EXPECTED_TRACE)
            self.assertEqual(response["turn_id"], "turn-response-last")
            self.assertFalse(result_path.exists())
            self.assertIsNotNone(worker.returncode)

    def test_patched_response_last_preserves_native_scope_and_fifo(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ay-ple-response-last-green-") as temp:
            worker, result_path, child_pid_path, trace_path, response_path = (
                self._start_worker(
                    ACTIVE_SDK_SRC,
                    Path(temp),
                )
            )
            timed_out = False
            try:
                try:
                    stdout, stderr = worker.communicate(timeout=3)
                except subprocess.TimeoutExpired:
                    timed_out = True
                    stdout, stderr = "", ""
                _wait_for_path(result_path, time.monotonic() + 1)
                evidence = json.loads(result_path.read_text(encoding="utf-8"))
                trace = json.loads(trace_path.read_text(encoding="utf-8"))
            finally:
                child_pid = self._reap_worker_group(worker, child_pid_path)

            if timed_out:
                self.fail("patched response-last worker timed out")
            self.assertEqual((worker.returncode, stdout, stderr), (0, "", ""))
            self.assertIsNotNone(child_pid)
            self.assertEqual(evidence["thread_id"], "thread-response-last")
            self.assertEqual(evidence["turn_id"], "turn-response-last")
            self.assertEqual(evidence["event_methods"], EXPECTED_METHODS)
            self.assertEqual(trace["emitted_methods"], EXPECTED_TRACE)
            self.assertEqual(evidence["event_methods"].count("turn/completed"), 1)
            self.assertEqual(
                evidence["item_ids"],
                [None, "item-response-last", "item-response-last", None],
            )
            self.assertEqual(
                evidence["turn_ids"],
                [
                    "turn-response-last",
                    "turn-response-last",
                    "turn-response-last",
                    "turn-response-last",
                ],
            )
            self.assertTrue(evidence["child_reaped"])
            self.assertTrue(trace_path.exists())
            self.assertTrue(response_path.exists())


if __name__ == "__main__":
    unittest.main()
