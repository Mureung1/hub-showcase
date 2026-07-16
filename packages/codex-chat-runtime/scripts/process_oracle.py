"""Shared process-tree cleanup assertions for actual-child conformance gates."""

from __future__ import annotations

import os
import signal
import subprocess
import time
from pathlib import Path


def process_exists(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    return True


def wait_for_path(path: Path, deadline: float) -> None:
    while not path.exists() and time.monotonic() < deadline:
        time.sleep(0.01)
    if not path.exists():
        raise AssertionError(f"timed out waiting for {path.name}")


def wait_for_process_exit(pid: int, deadline: float) -> None:
    while process_exists(pid) and time.monotonic() < deadline:
        time.sleep(0.01)
    if process_exists(pid):
        raise AssertionError(f"process {pid} was not reaped")


def process_group_exists(pgid: int) -> bool:
    try:
        os.killpg(pgid, 0)
    except ProcessLookupError:
        return False
    return True


def wait_for_process_group_exit(pgid: int, deadline: float) -> None:
    while process_group_exists(pgid) and time.monotonic() < deadline:
        time.sleep(0.01)
    if process_group_exists(pgid):
        raise AssertionError(f"process group {pgid} was not reaped")


def kill_worker_group(worker: subprocess.Popen[str]) -> tuple[str, str]:
    try:
        os.killpg(worker.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        worker.wait(timeout=0.5)
    except subprocess.TimeoutExpired:
        pass
    if process_group_exists(worker.pid):
        try:
            os.killpg(worker.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    if worker.poll() is None:
        worker.wait(timeout=1)
    return worker.communicate(timeout=1)


def reap_worker_group(
    worker: subprocess.Popen[str],
    child_pid_path: Path,
) -> int | None:
    kill_worker_group(worker)
    child_pid = (
        int(child_pid_path.read_text(encoding="utf-8"))
        if child_pid_path.exists()
        else None
    )
    if child_pid is not None:
        wait_for_process_exit(child_pid, time.monotonic() + 2)
    wait_for_process_group_exit(worker.pid, time.monotonic() + 2)
    return child_pid
