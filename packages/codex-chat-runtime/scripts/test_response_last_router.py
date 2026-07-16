#!/usr/bin/env python3
"""Regression gates for the official SDK response-last router correction."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

from process_oracle import reap_worker_group, wait_for_path


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
                wait_for_path(child_pid_path, time.monotonic() + 2)
                child_pid = int(child_pid_path.read_text(encoding="utf-8"))
                with self.assertRaises(AssertionError):
                    wait_for_path(trace_path, time.monotonic() + 0.1)
            finally:
                reaped_child_pid = reap_worker_group(worker, child_pid_path)
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
                wait_for_path(trace_path, time.monotonic() + 2)
                wait_for_path(response_path, time.monotonic() + 2)
                child_pid = int(child_pid_path.read_text(encoding="utf-8"))
                trace = json.loads(trace_path.read_text(encoding="utf-8"))
                response = json.loads(response_path.read_text(encoding="utf-8"))
                with self.assertRaises(subprocess.TimeoutExpired):
                    worker.wait(timeout=0.5)
            finally:
                reaped_child_pid = reap_worker_group(worker, child_pid_path)
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
                wait_for_path(result_path, time.monotonic() + 1)
                evidence = json.loads(result_path.read_text(encoding="utf-8"))
                trace = json.loads(trace_path.read_text(encoding="utf-8"))
            finally:
                child_pid = reap_worker_group(worker, child_pid_path)

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
