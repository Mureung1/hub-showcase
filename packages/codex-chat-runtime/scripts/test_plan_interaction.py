#!/usr/bin/env python3
"""Public async actual-child conformance for the Plan interaction patch."""

from __future__ import annotations

import asyncio
import json
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path


sys.dont_write_bytecode = True
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
SDK_SRC = Path(
    os.environ.get(
        "AY_PLE_CODEX_SDK_SRC",
        str(PACKAGE_ROOT / "python" / "openai-codex" / "sdk" / "python" / "src"),
    )
).resolve()
sys.path.insert(0, str(SDK_SRC))

from openai_codex import (  # noqa: E402
    AsyncCodex,
    AsyncUserInputRequest,
    CodexConfig,
    UserInputRequestError,
)
from openai_codex.types import (  # noqa: E402
    CollaborationMode,
    CollaborationModeSettings,
    ModeKind,
    ReasoningEffort,
)


FAKE_SERVER = Path(__file__).with_name("fake_plan_interaction_app_server.py")


def _pid_exists(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    return True


async def _wait_for_file(path: Path, timeout: float = 2.0) -> dict[str, object]:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if path.is_file():
            return json.loads(path.read_text(encoding="utf-8"))
        await asyncio.sleep(0.01)
    raise AssertionError(f"timed out waiting for {path}")


async def _wait_for_journal_key(
    path: Path,
    key: str,
    timeout: float = 2.0,
) -> dict[str, object]:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if path.is_file():
            value = json.loads(path.read_text(encoding="utf-8"))
            if key in value:
                return value
        await asyncio.sleep(0.01)
    raise AssertionError(f"timed out waiting for {key} in {path}")


async def _wait_for_pid_exit(pid: int, timeout: float = 2.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if not _pid_exists(pid):
            return
        await asyncio.sleep(0.01)
    raise AssertionError(f"child process still exists: {pid}")


def _config(mode: str, journal: Path) -> CodexConfig:
    return CodexConfig(
        launch_args_override=(sys.executable, str(FAKE_SERVER)),
        env={
            "AY_PLE_PLAN_FAKE_JOURNAL": str(journal),
            "AY_PLE_PLAN_FAKE_MODE": mode,
        },
    )


def _plan_mode() -> CollaborationMode:
    return CollaborationMode(
        mode=ModeKind.plan,
        settings=CollaborationModeSettings(
            developer_instructions=None,
            model="fake-model",
            reasoning_effort=ReasoningEffort(root="medium"),
        ),
    )


async def _start_turn(codex: AsyncCodex):
    thread = await codex.thread_start()
    return await thread.turn("review", collaboration_mode=_plan_mode())


class PlanInteractionActualChildTests(unittest.IsolatedAsyncioTestCase):
    async def test_repeated_cancelled_waiters_leave_operations_and_close_live(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory(
            prefix="ay-ple-plan-waiter-saturation-"
        ) as temp:
            journal = Path(temp) / "journal.json"
            codex = AsyncCodex(_config("waiter-cancellation-saturation", journal))
            await codex.__aenter__()
            started = await _wait_for_file(journal)

            for _ in range(64):
                waiter = asyncio.create_task(codex.next_user_input())
                await asyncio.sleep(0)
                await asyncio.sleep(0)
                waiter.cancel()
                with self.assertRaises(asyncio.CancelledError):
                    await waiter

            account_completed = False
            close_completed = False
            try:
                try:
                    account = await asyncio.wait_for(codex.account(), timeout=0.5)
                    self.assertFalse(account.requires_openai_auth)
                    account_completed = True
                except asyncio.TimeoutError:
                    pass
            finally:
                close_task = asyncio.create_task(codex.close())
                try:
                    await asyncio.wait_for(asyncio.shield(close_task), timeout=0.5)
                    close_completed = True
                except asyncio.TimeoutError:
                    await asyncio.wait_for(close_task, timeout=3.0)

            await _wait_for_pid_exit(int(started["child_pid"]))
            self.assertTrue(account_completed, "account() exhausted the executor")
            self.assertTrue(close_completed, "close() exhausted the executor")

    async def test_cancelled_waiter_does_not_consume_the_next_request(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="ay-ple-plan-cancelled-waiter-"
        ) as temp:
            journal = Path(temp) / "journal.json"
            codex = AsyncCodex(_config("cancelled-waiter", journal))
            await codex.__aenter__()
            started = await _wait_for_file(journal)
            cancelled_waiter = asyncio.create_task(codex.next_user_input())
            await asyncio.sleep(0)
            cancelled_waiter.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await cancelled_waiter

            try:
                account = await codex.account()
                self.assertFalse(account.requires_openai_auth)
                request = await asyncio.wait_for(codex.next_user_input(), timeout=0.5)
                self.assertEqual(
                    (request.thread_id, request.turn_id, request.item_id),
                    (THREAD_ID, TURN_ID, "item-after-cancelled-waiter"),
                )
                await request.cancel()
                evidence = await _wait_for_journal_key(journal, "request_delivered")
            finally:
                await codex.close()

            self.assertEqual(
                evidence["response"],
                {"id": "cancelled-waiter-request", "result": {"answers": {}}},
            )
            await _wait_for_pid_exit(int(started["child_pid"]))

    async def test_interrupt_admission_wins_before_native_response(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="ay-ple-plan-interrupt-answer-"
        ) as temp:
            journal = Path(temp) / "journal.json"
            codex = AsyncCodex(_config("interrupt-answer-race", journal))
            interrupt_task: asyncio.Task[None] | None = None
            try:
                turn = await _start_turn(codex)
                request = await codex.next_user_input()
                interrupt_task = asyncio.create_task(turn.interrupt())
                admitted = await _wait_for_journal_key(journal, "interrupt_admitted")
                self.assertFalse(admitted["unexpected_answer"])

                with self.assertRaisesRegex(
                    UserInputRequestError,
                    "interaction_not_pending",
                ):
                    await request.answer({"decision": ["Accept"]})
                account = await codex.account()
                self.assertFalse(account.requires_openai_auth)
                await interrupt_task
                evidence = await _wait_for_journal_key(journal, "race_completed")
                self.assertFalse(evidence["unexpected_answer"])
            finally:
                await codex.close()
                if interrupt_task is not None:
                    await asyncio.gather(interrupt_task, return_exceptions=True)

            await _wait_for_pid_exit(int(admitted["child_pid"]))

    async def test_internal_interrupt_write_half_close_fails_transport(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="ay-ple-plan-interrupt-half-close-"
        ) as temp:
            journal = Path(temp) / "journal.json"
            codex = AsyncCodex(_config("interrupt-writer-half-close", journal))
            try:
                await _start_turn(codex)
                evidence = await _wait_for_journal_key(journal, "stdin_half_closed")
                with self.assertRaisesRegex(
                    UserInputRequestError,
                    "interaction_transport_lost",
                ):
                    await asyncio.wait_for(codex.next_user_input(), timeout=0.5)
                with self.assertRaises(Exception):
                    await codex.account()
            finally:
                await codex.close()

            await _wait_for_pid_exit(int(evidence["child_pid"]))

    async def test_user_input_response_write_half_close_fails_transport(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="ay-ple-plan-response-half-close-"
        ) as temp:
            journal = Path(temp) / "journal.json"
            codex = AsyncCodex(_config("response-writer-half-close", journal))
            try:
                await _start_turn(codex)
                evidence = await _wait_for_journal_key(journal, "stdin_half_closed")
                request = await codex.next_user_input()
                with self.assertRaises(Exception):
                    await request.cancel()
                with self.assertRaisesRegex(
                    UserInputRequestError,
                    "interaction_transport_lost",
                ):
                    await asyncio.wait_for(codex.next_user_input(), timeout=0.5)
                with self.assertRaises(Exception):
                    await codex.account()
            finally:
                await codex.close()

            await _wait_for_pid_exit(int(evidence["child_pid"]))

    async def test_plan_request_round_trip_is_typed_nonblocking_and_same_turn(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory(prefix="ay-ple-plan-round-trip-") as temp:
            journal = Path(temp) / "journal.json"
            codex = AsyncCodex(_config("round-trip", journal))
            try:
                turn = await _start_turn(codex)
                request = await codex.next_user_input()
                self.assertIsInstance(request, AsyncUserInputRequest)
                self.assertEqual(
                    (
                        request.thread_id,
                        request.turn_id,
                        request.item_id,
                        request.questions[0].id,
                        request.questions[0].options[0].label,
                    ),
                    (THREAD_ID, TURN_ID, ITEM_ID, "decision", "Accept"),
                )
                self.assertFalse(hasattr(request, "request_id"))

                account = await asyncio.wait_for(codex.account(), timeout=0.5)
                self.assertFalse(account.requires_openai_auth)
                await request.answer({"decision": ["Accept"]})
                with self.assertRaisesRegex(
                    UserInputRequestError,
                    "interaction_not_pending",
                ):
                    await request.cancel()

                events = [event async for event in turn.stream()]
                self.assertEqual(
                    [event.method for event in events],
                    [
                        "item/agentMessage/delta",
                        "item/agentMessage/delta",
                        "turn/completed",
                    ],
                )
                evidence = await _wait_for_journal_key(journal, "response")
            finally:
                await codex.close()

            await _wait_for_pid_exit(int(evidence["child_pid"]))

    async def test_cancel_is_explicit_empty_answer_and_turn_continues(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ay-ple-plan-cancel-") as temp:
            journal = Path(temp) / "journal.json"
            codex = AsyncCodex(_config("cancel", journal))
            try:
                turn = await _start_turn(codex)
                request = await codex.next_user_input()
                account = await codex.account()
                self.assertFalse(account.requires_openai_auth)
                await request.cancel()
                events = [event async for event in turn.stream()]
                self.assertEqual(events[-1].method, "turn/completed")
                evidence = await _wait_for_journal_key(journal, "cancelled")
                self.assertTrue(evidence["cancelled"])
            finally:
                await codex.close()

            await _wait_for_pid_exit(int(evidence["child_pid"]))

    async def test_second_pending_request_fails_the_affected_turn(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ay-ple-plan-second-") as temp:
            journal = Path(temp) / "journal.json"
            codex = AsyncCodex(_config("second-pending", journal))
            try:
                await _start_turn(codex)
                with self.assertRaisesRegex(
                    UserInputRequestError,
                    "interaction_already_pending",
                ) as raised:
                    await codex.next_user_input()
                self.assertEqual(raised.exception.turn_id, TURN_ID)
                evidence = await _wait_for_journal_key(journal, "interrupted_turn_ids")
                self.assertEqual(evidence["interrupted_turn_ids"], [TURN_ID])
            finally:
                await codex.close()

            await _wait_for_pid_exit(int(evidence["child_pid"]))

    async def test_global_capacity_has_control_reserve_and_reports_overflow(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory(prefix="ay-ple-plan-capacity-") as temp:
            journal = Path(temp) / "journal.json"
            codex = AsyncCodex(_config("capacity", journal))
            requests: list[AsyncUserInputRequest] = []
            try:
                await codex.__aenter__()
                for _ in range(32):
                    requests.append(await codex.next_user_input())
                await asyncio.gather(*(request.cancel() for request in requests))
                with self.assertRaisesRegex(
                    UserInputRequestError,
                    "interaction_capacity_exceeded",
                ) as raised:
                    await codex.next_user_input()
                self.assertEqual(raised.exception.turn_id, "turn-capacity-32")
                evidence = await _wait_for_journal_key(journal, "response_count")
                self.assertEqual(evidence["response_count"], 32)
                self.assertEqual(
                    evidence["interrupted_turn_ids"],
                    ["turn-capacity-32"],
                )
            finally:
                await codex.close()

            await _wait_for_pid_exit(int(evidence["child_pid"]))

    async def test_interrupt_terminal_close_and_transport_invalidate_pending(
        self,
    ) -> None:
        for mode in ("interrupt", "resolved", "terminal", "transport", "close"):
            with (
                self.subTest(mode=mode),
                tempfile.TemporaryDirectory(prefix=f"ay-ple-plan-{mode}-") as temp,
            ):
                journal = Path(temp) / "journal.json"
                fake_mode = "terminal" if mode == "close" else mode
                codex = AsyncCodex(_config(fake_mode, journal))
                request: AsyncUserInputRequest | None = None
                try:
                    turn = await _start_turn(codex)
                    request = await codex.next_user_input()
                    started = await _wait_for_file(journal)
                    if mode == "interrupt":
                        await turn.interrupt()
                        _ = [event async for event in turn.stream()]
                    elif mode in {"resolved", "terminal"}:
                        await codex.account()
                        if mode == "terminal":
                            _ = [event async for event in turn.stream()]
                    elif mode == "transport":
                        with self.assertRaises(Exception):
                            await codex.account()
                    else:
                        await codex.close()

                    with self.assertRaisesRegex(
                        UserInputRequestError,
                        "interaction_not_pending",
                    ):
                        await request.answer({"decision": ["Accept"]})
                    evidence = (
                        started if mode == "close" else await _wait_for_file(journal)
                    )
                finally:
                    await codex.close()

                await _wait_for_pid_exit(int(evidence["child_pid"]))

    async def test_stalled_interrupt_control_is_bounded_and_close_reaps(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ay-ple-plan-interrupt-stall-") as temp:
            journal = Path(temp) / "journal.json"
            codex = AsyncCodex(_config("interrupt-stall", journal))
            try:
                await codex.__aenter__()
                evidence = await _wait_for_journal_key(journal, "interrupt_stalled")
                with self.assertRaisesRegex(
                    UserInputRequestError,
                    "interaction_transport_lost",
                ):
                    await asyncio.wait_for(codex.next_user_input(), timeout=0.5)
            finally:
                await codex.close()

            await _wait_for_pid_exit(int(evidence["child_pid"]))

    async def test_close_releases_a_waiting_consumer(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ay-ple-plan-waiter-") as temp:
            journal = Path(temp) / "journal.json"
            codex = AsyncCodex(_config("idle", journal))
            await codex.__aenter__()
            evidence = await _wait_for_file(journal)
            waiter = asyncio.create_task(codex.next_user_input())
            await asyncio.sleep(0)
            await codex.close()

            with self.assertRaisesRegex(
                UserInputRequestError,
                "interaction_closed",
            ):
                await waiter
            await _wait_for_pid_exit(int(evidence["child_pid"]))


THREAD_ID = "thread-plan"
TURN_ID = "turn-plan"
ITEM_ID = "item-user-input"


if __name__ == "__main__":
    unittest.main()
