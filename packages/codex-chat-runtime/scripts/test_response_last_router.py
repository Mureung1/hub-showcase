#!/usr/bin/env python3
"""Regression gates for the official SDK response-last router correction."""

from __future__ import annotations

import json
import os
import queue
import signal
import subprocess
import sys
import tempfile
import threading
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

from openai_codex import _message_router as router_module  # noqa: E402
from openai_codex.client import CodexClient  # noqa: E402
from openai_codex.models import Notification, UnknownNotification  # noqa: E402


FAKE_SERVER = Path(__file__).with_name("fake_response_last_app_server.py")
WORKER = Path(__file__).with_name("response_last_worker.py")
EXPECTED_METHODS = [
    "turn/started",
    "item/agentMessage/delta",
    "item/completed",
    "turn/completed",
]
EXPECTED_TRACE = [*EXPECTED_METHODS, "turn/start#response"]


def _notification(method: str, *, turn_id: str = "turn-1") -> Notification:
    params = {"threadId": "thread-1", "turnId": turn_id}
    if method == "turn/completed":
        params = {
            "threadId": "thread-1",
            "turn": {"id": turn_id},
        }
    return Notification(method=method, payload=UnknownNotification(params=params))


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


def _worker_env(sdk_src: Path) -> dict[str, str]:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(sdk_src)
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    return env


class ResponseLastActualChildTests(unittest.TestCase):
    def _start_worker(
        self,
        sdk_src: Path,
        root: Path,
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
            env=_worker_env(sdk_src),
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

    def test_unpatched_response_last_failure_is_bounded_and_reaped(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ay-ple-response-last-red-") as temp:
            worker, result_path, child_pid_path, trace_path, response_path = (
                self._start_worker(
                    UNPATCHED_SDK_SRC,
                    Path(temp),
                )
            )
            _wait_for_path(trace_path, time.monotonic() + 2)
            _wait_for_path(response_path, time.monotonic() + 2)
            child_pid = int(child_pid_path.read_text(encoding="utf-8"))
            trace = json.loads(trace_path.read_text(encoding="utf-8"))
            response = json.loads(response_path.read_text(encoding="utf-8"))
            self.assertEqual(trace["pid"], child_pid)
            self.assertEqual(trace["ppid"], worker.pid)
            self.assertEqual(trace["pgid"], worker.pid)
            self.assertEqual(trace["emitted_methods"], EXPECTED_TRACE)
            self.assertEqual(response["turn_id"], "turn-response-last")
            with self.assertRaises(subprocess.TimeoutExpired):
                worker.wait(timeout=0.5)
            self._kill_worker_group(worker)
            _wait_for_process_exit(child_pid, time.monotonic() + 2)
            _wait_for_process_group_exit(worker.pid, time.monotonic() + 2)

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
            try:
                stdout, stderr = worker.communicate(timeout=3)
            except subprocess.TimeoutExpired:
                self._kill_worker_group(worker)
                self.fail("patched response-last worker timed out")
            self.assertEqual((worker.returncode, stdout, stderr), (0, "", ""))
            _wait_for_path(result_path, time.monotonic() + 1)
            evidence = json.loads(result_path.read_text(encoding="utf-8"))
            trace = json.loads(trace_path.read_text(encoding="utf-8"))
            child_pid = int(child_pid_path.read_text(encoding="utf-8"))
            _wait_for_process_exit(child_pid, time.monotonic() + 2)
            _wait_for_process_group_exit(worker.pid, time.monotonic() + 2)

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


class ResponseLastRouterUnitTests(unittest.TestCase):
    def test_early_delta_item_and_terminal_replay_fifo_then_clear_pending(self) -> None:
        client = CodexClient()
        for method in (
            "item/agentMessage/delta",
            "item/completed",
            "turn/completed",
        ):
            client._router.route_notification(_notification(method))

        client.register_turn_notifications("turn-1")
        turn_queue = client._router._turn_notifications["turn-1"]
        observed = []
        while not turn_queue.empty():
            observed.append(turn_queue.get_nowait().method)

        self.assertEqual(
            observed,
            ["item/agentMessage/delta", "item/completed", "turn/completed"],
        )
        self.assertNotIn("turn-1", client._router._pending_turn_notifications)

    def test_live_event_cannot_overtake_staged_replay_at_registration(self) -> None:
        router = router_module.MessageRouter()
        router.route_notification(_notification("item/agentMessage/delta"))
        replay_entered = threading.Event()
        release_replay = threading.Event()
        route_started = threading.Event()
        route_done = threading.Event()

        class ReplayGateQueue(queue.Queue[object]):
            first_put = True

            def put(
                self,
                item: object,
                block: bool = True,
                timeout: float | None = None,
            ) -> None:
                if self.first_put:
                    self.first_put = False
                    replay_entered.set()
                    if not release_replay.wait(timeout=2):
                        raise AssertionError("test did not release staged replay")
                super().put(item, block=block, timeout=timeout)

        original_queue = router_module.queue.Queue
        router_module.queue.Queue = ReplayGateQueue  # type: ignore[misc]
        try:
            register = threading.Thread(target=router.register_turn, args=("turn-1",))
            register.start()
            self.assertTrue(replay_entered.wait(timeout=1))

            def deliver_live() -> None:
                route_started.set()
                router.route_notification(_notification("item/completed"))
                route_done.set()

            route_live = threading.Thread(target=deliver_live)
            route_live.start()
            self.assertTrue(route_started.wait(timeout=1))
            self.assertFalse(route_done.wait(timeout=0.05))
            release_replay.set()
            register.join(timeout=1)
            route_live.join(timeout=1)
            self.assertFalse(register.is_alive())
            self.assertFalse(route_live.is_alive())
        finally:
            router_module.queue.Queue = original_queue  # type: ignore[misc]
            release_replay.set()

        turn_queue = router._turn_notifications["turn-1"]
        self.assertEqual(
            [turn_queue.get_nowait().method, turn_queue.get_nowait().method],
            ["item/agentMessage/delta", "item/completed"],
        )


if __name__ == "__main__":
    unittest.main()
