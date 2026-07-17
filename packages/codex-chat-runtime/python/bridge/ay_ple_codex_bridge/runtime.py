"""Persistent official-SDK conversation worker behind the private protocol."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from enum import Enum
from typing import Any

from openai_codex import (
    ApprovalMode,
    AsyncCodex,
    AsyncThread,
    AsyncTurnHandle,
    JsonRpcError,
    Sandbox,
    TransportClosedError,
)
from openai_codex.generated.v2_all import (
    AgentMessageDeltaNotification,
    AgentMessageThreadItem,
    ErrorNotification,
    ItemCompletedNotification,
    TurnCompletedNotification,
    TurnStatus,
)
from openai_codex.models import Notification

from .protocol import (
    BoundedOutputBuffer,
    BridgeCommand,
    CloseCommand,
    InterruptCommand,
    OutputBufferOverflow,
    ProtocolViolation,
    RequestLeaseTable,
    ReleaseThreadCommand,
    StartThreadCommand,
    StartTurnCommand,
    encode_frame,
)


SAFE_MESSAGES = {
    "active_turn": "The thread already has an active turn.",
    "active_turn_limit": "The bridge active-turn limit was reached.",
    "live_thread_limit": "The bridge live-thread limit was reached.",
    "operation_limit": "The bridge pending-operation limit was reached.",
    "sdk_request_failed": "Codex rejected the requested operation.",
    "unknown_thread": "The native thread is not live in this bridge.",
    "unknown_turn": "The native turn is not active in this bridge.",
}


@dataclass(slots=True)
class ThreadRecord:
    handle: AsyncThread
    last_used: int
    pending_turn: bool = False
    active_turn_id: str | None = None
    eviction_reserved: bool = False


@dataclass(slots=True)
class TurnRecord:
    handle: AsyncTurnHandle
    bridge_request_id: str
    thread_id: str
    stream_task: asyncio.Task[None] | None = None


def _error_code(error: Any) -> str:
    info = getattr(error, "codex_error_info", None)
    root = getattr(info, "root", None)
    if isinstance(root, Enum):
        value = root.value
        return value if isinstance(value, str) else "turn_error"
    if root is not None and hasattr(root, "model_dump"):
        dumped = root.model_dump(by_alias=True, mode="json", exclude_none=True)
        if isinstance(dumped, dict) and len(dumped) == 1:
            key = next(iter(dumped))
            if isinstance(key, str) and key:
                return key
    return "turn_error"


def project_notification(
    notification: Notification,
    *,
    thread_id: str,
    turn_id: str,
) -> dict[str, Any] | None:
    payload = notification.payload
    if (
        notification.method == "item/agentMessage/delta"
        and isinstance(payload, AgentMessageDeltaNotification)
        and payload.thread_id == thread_id
        and payload.turn_id == turn_id
    ):
        return {
            "type": "agent_message.delta",
            "threadId": thread_id,
            "turnId": turn_id,
            "itemId": payload.item_id,
            "delta": payload.delta,
        }
    if (
        notification.method == "item/completed"
        and isinstance(payload, ItemCompletedNotification)
        and payload.thread_id == thread_id
        and payload.turn_id == turn_id
    ):
        item = payload.item.root
        if isinstance(item, AgentMessageThreadItem):
            return {
                "type": "agent_message.completed",
                "threadId": thread_id,
                "turnId": turn_id,
                "itemId": item.id,
                "text": item.text,
            }
        return None
    if (
        notification.method == "error"
        and isinstance(payload, ErrorNotification)
        and payload.thread_id == thread_id
        and payload.turn_id == turn_id
    ):
        return {
            "type": "turn.error",
            "threadId": thread_id,
            "turnId": turn_id,
            "willRetry": payload.will_retry,
            "code": _error_code(payload.error),
            "displayMessage": "Codex reported a turn error.",
        }
    if (
        notification.method == "turn/completed"
        and isinstance(payload, TurnCompletedNotification)
        and payload.thread_id == thread_id
        and payload.turn.id == turn_id
    ):
        status = payload.turn.status
        if status not in {
            TurnStatus.completed,
            TurnStatus.interrupted,
            TurnStatus.failed,
        }:
            raise ProtocolViolation("invalid_turn_terminal")
        event: dict[str, Any] = {
            "type": "turn.completed",
            "threadId": thread_id,
            "turnId": turn_id,
            "status": status.value,
        }
        if status is TurnStatus.failed:
            event["failure"] = {
                "code": _error_code(payload.turn.error),
                "displayMessage": "Codex failed the turn.",
            }
        return event
    return None


class BridgeWorker:
    def __init__(
        self,
        *,
        codex: AsyncCodex,
        workspace: str,
        output: BoundedOutputBuffer,
        live_thread_limit: int,
        active_turn_limit: int,
        pending_operation_limit: int,
        control_operation_reserve: int,
    ) -> None:
        if live_thread_limit < 1 or active_turn_limit < 1:
            raise ValueError("bridge limits must be positive")
        self._codex = codex
        self._workspace = workspace
        self._output = output
        self._live_thread_limit = live_thread_limit
        self._active_turn_limit = active_turn_limit
        self._threads: dict[str, ThreadRecord] = {}
        self._turns: dict[str, TurnRecord] = {}
        self._operations: dict[asyncio.Task[None], str] = {}
        self._thread_start_lock = asyncio.Lock()
        self._request_leases = RequestLeaseTable(
            total_limit=pending_operation_limit,
            control_reserve=control_operation_reserve,
        )
        self._clock = 0
        self._fatal_code: str | None = None
        self._fatal_event = asyncio.Event()
        self._closing = False
        self._initialized = False

    @property
    def fatal_code(self) -> str | None:
        return self._fatal_code

    @property
    def has_pending_work(self) -> bool:
        return bool(self._operations or self._turns)

    async def initialize(self) -> None:
        try:
            await self._codex.__aenter__()
            self._initialized = True
        except Exception:
            self.trigger_fatal("sdk_initialization_failed")

    async def wait_fatal(self) -> None:
        await self._fatal_event.wait()

    def signal_ready(self) -> bool:
        """Publish SDK readiness before the command reader accepts work."""
        return self._offer(
            {"type": "ready"},
            serialization_code="ready_serialization_failed",
        )

    def _tick(self) -> int:
        self._clock += 1
        return self._clock

    def accept_request(self, command: BridgeCommand) -> str:
        request_id = command.bridge_request_id
        if isinstance(command, (StartThreadCommand, StartTurnCommand)):
            kind = "application"
        elif isinstance(command, CloseCommand):
            kind = "close"
        else:
            kind = "control"
        admission = self._request_leases.acquire(request_id, kind)
        if admission == "duplicate":
            self.trigger_fatal("duplicate_bridge_request_id")
            return "fatal"
        if admission == "capacity":
            self._operation_error(request_id, "operation_limit")
            return "rejected"
        if self._closing or self._fatal_code is not None:
            self._request_leases.release(request_id)
            return "fatal"
        return "admitted"

    def dispatch(self, command: BridgeCommand) -> None:
        if isinstance(command, StartThreadCommand):
            coroutine = self._start_thread(command)
        elif isinstance(command, StartTurnCommand):
            coroutine = self._start_turn(command)
        elif isinstance(command, InterruptCommand):
            coroutine = self._interrupt(command)
        elif isinstance(command, ReleaseThreadCommand):
            coroutine = self._release_thread(command)
        else:
            raise TypeError(f"unsupported dispatch command: {type(command).__name__}")
        task = asyncio.create_task(coroutine)
        self._operations[task] = command.bridge_request_id
        task.add_done_callback(self._operation_done)

    def _operation_done(self, task: asyncio.Task[None]) -> None:
        self._operations.pop(task, None)
        if task.cancelled():
            return
        exception = task.exception()
        if exception is not None:
            self.trigger_fatal("bridge_operation_failed")

    def _offer(self, frame: dict[str, Any], *, serialization_code: str) -> bool:
        if self._fatal_code is not None:
            return False
        try:
            encoded = encode_frame(frame)
        except ProtocolViolation:
            self.trigger_fatal(serialization_code, preserve_output=True)
            return False
        try:
            self._output.offer_encoded(encoded)
        except OutputBufferOverflow:
            self.trigger_fatal("buffer_overflow")
            return False
        return True

    def _result(
        self,
        request_id: str,
        command: str,
        *,
        retain_lease: bool = False,
        **fields: Any,
    ) -> bool:
        offered = self._offer(
            {
                "type": "result",
                "bridgeRequestId": request_id,
                "command": command,
                **fields,
            },
            serialization_code="result_serialization_failed",
        )
        if offered and not retain_lease:
            self._request_leases.release(request_id)
        return offered

    def _operation_error(self, request_id: str, code: str) -> None:
        offered = self._offer(
            {
                "type": "error",
                "bridgeRequestId": request_id,
                "code": code,
                "displayMessage": SAFE_MESSAGES[code],
            },
            serialization_code="error_serialization_failed",
        )
        if offered:
            self._request_leases.release(request_id)

    def trigger_fatal(
        self,
        code: str,
        *,
        preserve_output: bool = False,
        deliver: bool = True,
    ) -> None:
        if self._fatal_code is not None:
            return
        self._fatal_code = code
        self._closing = True
        message = {
            "buffer_overflow": "The bridge output buffer overflowed.",
            "event_serialization_failed": "A Codex event could not be serialized safely.",
        }.get(code, "The Codex bridge terminated because its private protocol failed.")
        if deliver:
            encoded = encode_frame(
                {
                    "type": "fatal",
                    "code": code,
                    "displayMessage": message,
                }
            )
            self._output.latch_fatal(encoded, replace_items=not preserve_output)
        self._fatal_event.set()

    def _sdk_failure(self, request_id: str, exc: BaseException) -> None:
        if getattr(exc, "code", None) == "buffer_overflow":
            self.trigger_fatal("buffer_overflow")
        elif isinstance(exc, TransportClosedError):
            self.trigger_fatal("sdk_transport_failed")
        elif isinstance(exc, JsonRpcError):
            self._operation_error(request_id, "sdk_request_failed")
        else:
            self.trigger_fatal("sdk_operation_failed")

    def _stream_failure(self, exc: BaseException) -> None:
        if getattr(exc, "code", None) == "buffer_overflow":
            self._stream_fatal("buffer_overflow")
        elif getattr(exc, "code", None) == "malformed_response":
            self._stream_fatal("sdk_operation_failed")
        elif isinstance(exc, TransportClosedError):
            self._stream_fatal("sdk_transport_failed")
        else:
            self._stream_fatal("sdk_stream_failed")

    def _stream_fatal(self, code: str) -> None:
        self.trigger_fatal(code, preserve_output=True)

    async def _start_thread(self, command: StartThreadCommand) -> None:
        async with self._thread_start_lock:
            victim_id: str | None = None
            if len(self._threads) >= self._live_thread_limit:
                idle = [
                    (record.last_used, thread_id)
                    for thread_id, record in self._threads.items()
                    if not record.pending_turn
                    and record.active_turn_id is None
                    and not record.eviction_reserved
                ]
                if not idle:
                    self._operation_error(
                        command.bridge_request_id, "live_thread_limit"
                    )
                    return
                _, victim_id = min(idle)
                self._threads[victim_id].eviction_reserved = True
            try:
                handle = await self._codex.thread_start(
                    cwd=self._workspace,
                    approval_mode=ApprovalMode.deny_all,
                    sandbox=Sandbox.read_only,
                )
            except Exception as exc:
                if victim_id is not None and victim_id in self._threads:
                    self._threads[victim_id].eviction_reserved = False
                self._sdk_failure(command.bridge_request_id, exc)
                return
            if victim_id is not None:
                self._threads.pop(victim_id, None)
            self._threads[handle.id] = ThreadRecord(
                handle=handle, last_used=self._tick()
            )
            self._result(
                command.bridge_request_id,
                command.command,
                threadId=handle.id,
            )

    def _active_turn_count(self) -> int:
        return sum(
            1
            for record in self._threads.values()
            if record.pending_turn or record.active_turn_id is not None
        )

    async def _start_turn(self, command: StartTurnCommand) -> None:
        record = self._threads.get(command.thread_id)
        if record is None or record.eviction_reserved:
            self._operation_error(command.bridge_request_id, "unknown_thread")
            return
        if record.pending_turn or record.active_turn_id is not None:
            self._operation_error(command.bridge_request_id, "active_turn")
            return
        if self._active_turn_count() >= self._active_turn_limit:
            self._operation_error(command.bridge_request_id, "active_turn_limit")
            return
        record.pending_turn = True
        try:
            handle = await record.handle.turn(
                command.text,
                cwd=self._workspace,
                approval_mode=ApprovalMode.deny_all,
                sandbox=Sandbox.read_only,
            )
        except Exception as exc:
            record.pending_turn = False
            self._sdk_failure(command.bridge_request_id, exc)
            return
        record.pending_turn = False
        record.active_turn_id = handle.id
        record.last_used = self._tick()
        turn = TurnRecord(
            handle=handle,
            bridge_request_id=command.bridge_request_id,
            thread_id=command.thread_id,
        )
        self._turns[handle.id] = turn
        self._request_leases.transfer_to_turn(command.bridge_request_id)
        accepted = self._result(
            command.bridge_request_id,
            command.command,
            threadId=command.thread_id,
            turnId=handle.id,
            retain_lease=True,
        )
        if accepted:
            turn.stream_task = asyncio.create_task(self._consume_turn(turn))

    async def _consume_turn(self, turn: TurnRecord) -> None:
        terminal_seen = False
        try:
            async for notification in turn.handle.stream():
                event = project_notification(
                    notification,
                    thread_id=turn.thread_id,
                    turn_id=turn.handle.id,
                )
                if event is None:
                    continue
                is_terminal = event["type"] == "turn.completed"
                if not self._offer(
                    {
                        "type": "event",
                        "bridgeRequestId": turn.bridge_request_id,
                        "event": event,
                    },
                    serialization_code="event_serialization_failed",
                ):
                    return
                if is_terminal:
                    terminal_seen = True
                    break
            if not terminal_seen and not self._closing:
                self._stream_fatal("sdk_stream_ended")
        except ProtocolViolation:
            self._stream_fatal("invalid_turn_terminal")
        except Exception as exc:
            if not self._closing:
                self._stream_failure(exc)
        finally:
            current = self._turns.get(turn.handle.id)
            if current is turn:
                self._turns.pop(turn.handle.id, None)
            thread = self._threads.get(turn.thread_id)
            if thread is not None and thread.active_turn_id == turn.handle.id:
                thread.active_turn_id = None
                thread.last_used = self._tick()
            self._request_leases.release(turn.bridge_request_id)

    async def _interrupt(self, command: InterruptCommand) -> None:
        turn = self._turns.get(command.turn_id)
        if turn is None or turn.thread_id != command.thread_id:
            self._operation_error(command.bridge_request_id, "unknown_turn")
            return
        try:
            await turn.handle.interrupt()
        except Exception as exc:
            self._sdk_failure(command.bridge_request_id, exc)
            return
        thread = self._threads.get(command.thread_id)
        if thread is not None:
            thread.last_used = self._tick()
        self._result(
            command.bridge_request_id,
            command.command,
            threadId=command.thread_id,
            turnId=command.turn_id,
        )

    async def _release_thread(self, command: ReleaseThreadCommand) -> None:
        record = self._threads.get(command.thread_id)
        if record is None:
            self._operation_error(command.bridge_request_id, "unknown_thread")
            return
        if (
            record.pending_turn
            or record.active_turn_id is not None
            or record.eviction_reserved
        ):
            self._operation_error(command.bridge_request_id, "active_turn")
            return
        self._threads.pop(command.thread_id, None)
        self._result(
            command.bridge_request_id,
            command.command,
            threadId=command.thread_id,
        )

    async def close_normally(self, command: CloseCommand) -> None:
        if self._closing:
            return
        self._closing = True
        operations = [
            task for task in self._operations if task is not asyncio.current_task()
        ]
        if operations:
            await asyncio.gather(*operations, return_exceptions=True)
        turns = list(self._turns.values())
        if turns:
            await asyncio.gather(
                *(turn.handle.interrupt() for turn in turns),
                return_exceptions=True,
            )
            stream_tasks = [
                turn.stream_task for turn in turns if turn.stream_task is not None
            ]
            if stream_tasks:
                await asyncio.gather(*stream_tasks, return_exceptions=True)
        try:
            if self._initialized:
                await self._codex.close()
                self._initialized = False
        except Exception:
            self.trigger_fatal("sdk_close_failed")
            return
        self._output.finish_with_ack(
            encode_frame(
                {
                    "type": "close_ack",
                    "bridgeRequestId": command.bridge_request_id,
                }
            )
        )
        self._request_leases.release(command.bridge_request_id)

    async def close_after_idle_eof(self) -> None:
        self._closing = True
        if self._initialized:
            await self._codex.close()
            self._initialized = False
        self._output.finish_without_frame()

    async def shutdown_after_fatal(self) -> None:
        if self._initialized:
            try:
                await self._codex.close()
            except Exception:
                pass
            self._initialized = False
        tasks = [*self._operations]
        tasks.extend(
            turn.stream_task
            for turn in self._turns.values()
            if turn.stream_task is not None
        )
        for task in tasks:
            if not task.done():
                task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
