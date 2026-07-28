"""Persistent official-SDK conversation worker behind the private protocol."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from openai_codex import (
    ApprovalMode,
    AsyncCodex,
    AsyncThread,
    AsyncTurnHandle,
    AsyncUserInputRequest,
    JsonRpcError,
    Sandbox,
    SkillInput,
    TextInput,
    TransportClosedError,
    UserInputRequestError,
)
from openai_codex.generated.v2_all import (
    AgentMessageDeltaNotification,
    AgentMessageThreadItem,
    ErrorNotification,
    ItemCompletedNotification,
    PlanDeltaNotification,
    PlanThreadItem,
    ReasoningEffort,
    TurnCompletedNotification,
    TurnStatus,
)
from openai_codex.models import Notification
from openai_codex.types import (
    CollaborationMode,
    CollaborationModeSettings,
    ModeKind,
)

from .protocol import (
    BoundedOutputBuffer,
    AnswerUserInputCommand,
    BridgeCommand,
    CancelUserInputCommand,
    CloseCommand,
    InterruptCommand,
    OutputBufferOverflow,
    ProtocolViolation,
    RequestLeaseTable,
    ReadAccountCommand,
    ReadModelCatalogCommand,
    ReleaseThreadCommand,
    StartThreadCommand,
    StartProductTurnCommand,
    StartTurnCommand,
    encode_frame,
)


SAFE_MESSAGES = {
    "account_read_failed": "The Codex account could not be read.",
    "active_turn": "The thread already has an active turn.",
    "active_turn_limit": "The bridge active-turn limit was reached.",
    "interaction_not_pending": "The user-input interaction is not pending.",
    "invalid_user_input_answer": "The user-input answer is invalid.",
    "live_thread_limit": "The bridge live-thread limit was reached.",
    "operation_limit": "The bridge pending-operation limit was reached.",
    "sdk_request_failed": "Codex rejected the requested operation.",
    "unknown_thread": "The native thread is not live in this bridge.",
    "unknown_turn": "The native turn is not active in this bridge.",
}


def _model_service_tiers(model: Any) -> list[str]:
    advertised = [tier.id for tier in (model.service_tiers or [])] + list(
        model.additional_speed_tiers or []
    )
    return list(dict.fromkeys(advertised))


@dataclass(slots=True)
class ThreadRecord:
    handle: AsyncThread
    cwd: str
    last_used: int
    pending_turn: bool = False
    active_turn_id: str | None = None
    eviction_reserved: bool = False


class TurnKind(str, Enum):
    CHAT = "chat"
    PRODUCT = "product"


class EffectiveModelResolutionError(RuntimeError):
    pass


@dataclass(slots=True)
class TurnRecord:
    handle: AsyncTurnHandle
    bridge_request_id: str
    thread_id: str
    kind: TurnKind
    stream_task: asyncio.Task[None] | None = None
    interrupt_requested: bool = False
    interrupt_acknowledged: bool = False


@dataclass(slots=True)
class InteractionRecord:
    request: AsyncUserInputRequest
    interaction_id: str
    published: bool = False
    settling: bool = False
    settlement_done: asyncio.Event = field(default_factory=asyncio.Event)


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
    kind: TurnKind,
) -> dict[str, Any] | None:
    is_product = kind is TurnKind.PRODUCT
    payload = notification.payload
    if (
        is_product
        and notification.method == "item/plan/delta"
        and isinstance(payload, PlanDeltaNotification)
        and payload.thread_id == thread_id
        and payload.turn_id == turn_id
    ):
        return {
            "type": "plan.delta",
            "threadId": thread_id,
            "turnId": turn_id,
            "itemId": payload.item_id,
            "delta": payload.delta,
        }
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
        if is_product and isinstance(item, PlanThreadItem):
            return {
                "type": "plan.completed",
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
        account_operation_timeout_ms: int,
    ) -> None:
        if (
            live_thread_limit < 1
            or active_turn_limit < 1
            or account_operation_timeout_ms < 1
        ):
            raise ValueError("bridge limits must be positive")
        self._codex = codex
        self._workspace = workspace
        self._output = output
        self._live_thread_limit = live_thread_limit
        self._active_turn_limit = active_turn_limit
        self._threads: dict[str, ThreadRecord] = {}
        self._turns: dict[str, TurnRecord] = {}
        self._interactions: dict[str, InteractionRecord] = {}
        self._operations: dict[asyncio.Task[None], str] = {}
        self._user_input_collector: asyncio.Task[None] | None = None
        self._thread_start_lock = asyncio.Lock()
        self._turn_start_lock = asyncio.Lock()
        self._account_operation_timeout = account_operation_timeout_ms / 1000
        self._request_leases = RequestLeaseTable(
            total_limit=pending_operation_limit,
            control_reserve=control_operation_reserve,
        )
        self._clock = 0
        self._next_interaction = 1
        self._fatal_code: str | None = None
        self._fatal_event = asyncio.Event()
        self._closing = False
        self._initialized = False

    @property
    def fatal_code(self) -> str | None:
        return self._fatal_code

    @property
    def has_pending_work(self) -> bool:
        return bool(self._operations or self._turns or self._interactions)

    async def initialize(self) -> None:
        try:
            await self._codex.__aenter__()
            self._initialized = True
            self._user_input_collector = asyncio.create_task(self._collect_user_input())
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
        if isinstance(
            command,
            (
                ReadAccountCommand,
                ReadModelCatalogCommand,
                StartThreadCommand,
                StartTurnCommand,
                StartProductTurnCommand,
            ),
        ):
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
        if isinstance(command, ReadAccountCommand):
            coroutine = self._read_account(command)
        elif isinstance(command, ReadModelCatalogCommand):
            coroutine = self._read_model_catalog(command)
        elif isinstance(command, StartThreadCommand):
            coroutine = self._start_thread(command)
        elif isinstance(command, StartTurnCommand):
            coroutine = self._start_turn(command)
        elif isinstance(command, StartProductTurnCommand):
            coroutine = self._start_product_turn(command)
        elif isinstance(command, AnswerUserInputCommand):
            coroutine = self._answer_user_input(command)
        elif isinstance(command, CancelUserInputCommand):
            coroutine = self._cancel_user_input(command)
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
        elif isinstance(exc, EffectiveModelResolutionError):
            self._operation_error(request_id, "sdk_request_failed")
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
                thread_start_options: dict[str, Any] = {
                    "cwd": self._workspace,
                    "approval_mode": ApprovalMode.auto_review,
                    "sandbox": Sandbox.workspace_write,
                }
                handle = await self._codex.thread_start(**thread_start_options)
            except Exception as exc:
                if victim_id is not None and victim_id in self._threads:
                    self._threads[victim_id].eviction_reserved = False
                self._sdk_failure(command.bridge_request_id, exc)
                return
            if victim_id is not None:
                self._threads.pop(victim_id, None)
            self._threads[handle.id] = ThreadRecord(
                handle=handle, cwd=self._workspace, last_used=self._tick()
            )
            self._result(
                command.bridge_request_id,
                command.command,
                threadId=handle.id,
            )

    async def _read_account(self, command: ReadAccountCommand) -> None:
        try:
            state = await self._fresh_account_state()
        except Exception as exc:
            self._account_request_failure(
                command.bridge_request_id,
                "account_read_failed",
                exc,
            )
            return
        self._result(
            command.bridge_request_id,
            command.command,
            account={"state": state},
        )

    async def _read_model_catalog(self, command: ReadModelCatalogCommand) -> None:
        try:
            catalog = await self._codex.models(include_hidden=True)
        except Exception as exc:
            self._sdk_failure(command.bridge_request_id, exc)
            return
        self._result(
            command.bridge_request_id,
            command.command,
            catalog={
                "models": [
                    {
                        "model": model.model,
                        "displayName": model.display_name,
                        "description": model.description,
                        "isDefault": model.is_default,
                        "defaultReasoningEffort": model.default_reasoning_effort.root,
                        "supportedReasoningEfforts": [
                            {
                                "reasoningEffort": effort.reasoning_effort.root,
                                "description": effort.description,
                            }
                            for effort in model.supported_reasoning_efforts
                        ],
                        "serviceTiers": _model_service_tiers(model),
                        **(
                            {
                                "defaultServiceTier": model.default_service_tier,
                            }
                            if model.default_service_tier is not None
                            else {}
                        ),
                    }
                    for model in catalog.data
                    if not model.hidden
                ]
            },
        )

    async def _fresh_account_state(self) -> str:
        account = await asyncio.wait_for(
            self._codex.account(refresh_token=True),
            timeout=self._account_operation_timeout,
        )
        if account.account is None:
            return "signed_out"
        account_type = getattr(account.account.root, "type", None)
        if account_type == "chatgpt":
            return "chatgpt"
        return "unsupported"

    def _account_request_failure(
        self,
        request_id: str,
        code: str,
        exc: BaseException,
    ) -> None:
        if isinstance(exc, (asyncio.TimeoutError, TransportClosedError)):
            self.trigger_fatal(
                "sdk_transport_failed"
                if isinstance(exc, TransportClosedError)
                else "sdk_operation_timeout"
            )
            return
        self._operation_error(request_id, code)

    def _active_turn_count(self) -> int:
        return sum(
            1
            for record in self._threads.values()
            if record.pending_turn or record.active_turn_id is not None
        )

    async def _accept_turn(
        self,
        command: StartTurnCommand | StartProductTurnCommand,
        *,
        kind: TurnKind,
        start: Callable[[ThreadRecord], Awaitable[AsyncTurnHandle]],
    ) -> TurnRecord | None:
        record = self._threads.get(command.thread_id)
        if record is None or record.eviction_reserved:
            self._operation_error(command.bridge_request_id, "unknown_thread")
            return None
        if record.pending_turn or record.active_turn_id is not None:
            self._operation_error(command.bridge_request_id, "active_turn")
            return None
        if self._active_turn_count() >= self._active_turn_limit:
            self._operation_error(command.bridge_request_id, "active_turn_limit")
            return None
        record.pending_turn = True
        try:
            handle = await start(record)
        except Exception as exc:
            record.pending_turn = False
            self._sdk_failure(command.bridge_request_id, exc)
            return None
        record.pending_turn = False
        record.active_turn_id = handle.id
        record.last_used = self._tick()
        turn = TurnRecord(
            handle=handle,
            bridge_request_id=command.bridge_request_id,
            thread_id=command.thread_id,
            kind=kind,
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
        return turn if accepted else None

    async def _start_turn(self, command: StartTurnCommand) -> None:
        async def start_chat_turn(record: ThreadRecord) -> AsyncTurnHandle:
            return await record.handle.turn(
                command.text,
                cwd=record.cwd,
                approval_mode=ApprovalMode.deny_all,
                sandbox=Sandbox.read_only,
            )

        async with self._turn_start_lock:
            turn = await self._accept_turn(
                command,
                kind=TurnKind.CHAT,
                start=start_chat_turn,
            )
        if turn is not None:
            turn.stream_task = asyncio.create_task(self._consume_turn(turn))

    async def _start_product_turn(self, command: StartProductTurnCommand) -> None:
        turn_input = (
            [TextInput(text=command.text)]
            if command.skill is None
            else [
                SkillInput(
                    name=command.skill.name,
                    path=command.skill.path,
                ),
                TextInput(text=command.text),
            ]
        )

        async def start_product_turn(record: ThreadRecord) -> AsyncTurnHandle:
            effective_model = command.model or record.handle.initial_model
            if not effective_model:
                raise EffectiveModelResolutionError
            effective_effort = (
                ReasoningEffort(root=command.reasoning_effort)
                if command.reasoning_effort is not None
                else record.handle.initial_reasoning_effort
            )
            read_only = command.permission_profile == "read_only"
            return await record.handle.turn(
                turn_input,
                cwd=record.cwd,
                approval_mode=(
                    ApprovalMode.deny_all if read_only else ApprovalMode.auto_review
                ),
                sandbox=Sandbox.read_only if read_only else Sandbox.workspace_write,
                model=command.model,
                effort=(
                    ReasoningEffort(root=command.reasoning_effort)
                    if command.reasoning_effort is not None
                    else None
                ),
                service_tier=command.service_tier,
                collaboration_mode=CollaborationMode(
                    mode=ModeKind.plan,
                    settings=CollaborationModeSettings(
                        developer_instructions=None,
                        model=effective_model,
                        reasoning_effort=effective_effort,
                    ),
                ),
            )

        async with self._turn_start_lock:
            turn = await self._accept_turn(
                command,
                kind=TurnKind.PRODUCT,
                start=start_product_turn,
            )
        if turn is None:
            return
        await self._bind_pending_interactions(turn)
        if self._fatal_code is None:
            turn.stream_task = asyncio.create_task(self._consume_turn(turn))

    async def _collect_user_input(self) -> None:
        while not self._closing:
            try:
                request = await self._codex.next_user_input()
            except asyncio.CancelledError:
                raise
            except UserInputRequestError as exc:
                if self._closing:
                    return
                if exc.code == "interaction_transport_lost":
                    self.trigger_fatal("sdk_transport_failed")
                    return
                if exc.code in {
                    "interaction_already_pending",
                    "interaction_capacity_exceeded",
                    "interaction_completed",
                    "interaction_not_pending",
                }:
                    continue
                self.trigger_fatal("sdk_operation_failed")
                return
            except TransportClosedError:
                if not self._closing:
                    self.trigger_fatal("sdk_transport_failed")
                return
            except Exception:
                if not self._closing:
                    self.trigger_fatal("sdk_operation_failed")
                return
            interaction_id = f"interaction-{self._next_interaction}"
            self._next_interaction += 1
            interaction = InteractionRecord(
                request=request,
                interaction_id=interaction_id,
            )
            self._interactions[interaction_id] = interaction
            turn = self._turns.get(request.turn_id)
            if turn is not None:
                await self._publish_interaction(turn, interaction)

    async def _bind_pending_interactions(self, turn: TurnRecord) -> None:
        for interaction in list(self._interactions.values()):
            if interaction.request.turn_id == turn.handle.id:
                await self._publish_interaction(turn, interaction)

    async def _publish_interaction(
        self,
        turn: TurnRecord,
        interaction: InteractionRecord,
    ) -> None:
        if interaction.published:
            return
        request = interaction.request
        if (
            turn.kind is not TurnKind.PRODUCT
            or request.thread_id != turn.thread_id
            or any(question.is_secret for question in request.questions)
        ):
            self._discard_interaction(interaction.interaction_id)
            try:
                await turn.handle.interrupt()
            except Exception as exc:
                if not self._closing:
                    self._stream_failure(exc)
            return
        questions = []
        for question in request.questions:
            options = (
                None
                if question.options is None
                else [
                    {
                        "label": option.label,
                        "description": option.description,
                    }
                    for option in question.options
                ]
            )
            questions.append(
                {
                    "id": question.id,
                    "header": question.header,
                    "question": question.question,
                    "options": options,
                    "acceptsFreeform": question.is_other,
                }
            )
        interaction.published = True
        self._offer_turn_event(
            turn,
            {
                "type": "user_input.requested",
                "threadId": turn.thread_id,
                "turnId": turn.handle.id,
                "itemId": request.item_id,
                "interactionId": interaction.interaction_id,
                "questions": questions,
            },
        )

    def _offer_turn_event(
        self,
        turn: TurnRecord,
        event: dict[str, Any],
    ) -> bool:
        return self._offer(
            {
                "type": "event",
                "bridgeRequestId": turn.bridge_request_id,
                "event": event,
            },
            serialization_code="event_serialization_failed",
        )

    async def _answer_user_input(self, command: AnswerUserInputCommand) -> None:
        await self._settle_user_input(
            command.bridge_request_id,
            command.command,
            command.interaction_id,
            answers=command.answers,
        )

    async def _cancel_user_input(self, command: CancelUserInputCommand) -> None:
        await self._settle_user_input(
            command.bridge_request_id,
            command.command,
            command.interaction_id,
            answers=None,
        )

    async def _settle_user_input(
        self,
        bridge_request_id: str,
        command: str,
        interaction_id: str,
        *,
        answers: dict[str, tuple[str, ...]] | None,
    ) -> None:
        interaction = self._interactions.get(interaction_id)
        if interaction is None or interaction.settling:
            self._operation_error(bridge_request_id, "interaction_not_pending")
            return
        interaction.settling = True
        interaction.settlement_done = asyncio.Event()
        try:
            if answers is None:
                await interaction.request.cancel()
                resolution = "cancelled"
            else:
                await interaction.request.answer(answers)
                resolution = "answered"
        except UserInputRequestError as exc:
            if exc.code == "invalid_user_input_answer":
                interaction.settling = False
                interaction.settlement_done.set()
                self._operation_error(bridge_request_id, "invalid_user_input_answer")
            elif exc.code == "interaction_not_pending":
                self._discard_interaction(interaction_id)
                self._operation_error(bridge_request_id, "interaction_not_pending")
            else:
                self._discard_interaction(interaction_id)
                self._sdk_failure(bridge_request_id, exc)
            return
        except Exception as exc:
            self._discard_interaction(interaction_id)
            self._sdk_failure(bridge_request_id, exc)
            return
        turn = self._turns.get(interaction.request.turn_id)
        if turn is not None and turn.kind is TurnKind.PRODUCT:
            self._offer_turn_event(
                turn,
                {
                    "type": "user_input.resolved",
                    "threadId": turn.thread_id,
                    "turnId": turn.handle.id,
                    "itemId": interaction.request.item_id,
                    "interactionId": interaction_id,
                    "resolution": resolution,
                },
            )
        self._discard_interaction(interaction_id)
        self._result(
            bridge_request_id,
            command,
            interactionId=interaction_id,
        )

    async def _consume_turn(self, turn: TurnRecord) -> None:
        terminal_seen = False
        try:
            async for notification in turn.handle.stream():
                await self._await_turn_settlement(turn.handle.id)
                event = project_notification(
                    notification,
                    thread_id=turn.thread_id,
                    turn_id=turn.handle.id,
                    kind=turn.kind,
                )
                if event is None:
                    continue
                is_terminal = event["type"] == "turn.completed"
                if is_terminal and turn.interrupt_requested:
                    self._offer_interrupt_acknowledgement(turn)
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
            self._remove_turn_interactions(turn.handle.id)
            self._request_leases.release(turn.bridge_request_id)

    async def _interrupt(self, command: InterruptCommand) -> None:
        turn = self._turns.get(command.turn_id)
        if turn is None or turn.thread_id != command.thread_id:
            self._operation_error(command.bridge_request_id, "unknown_turn")
            return
        turn.interrupt_requested = True
        try:
            await turn.handle.interrupt()
        except Exception as exc:
            turn.interrupt_requested = False
            self._sdk_failure(command.bridge_request_id, exc)
            return
        thread = self._threads.get(command.thread_id)
        if thread is not None:
            thread.last_used = self._tick()
        current = self._turns.get(command.turn_id)
        if current is turn:
            self._remove_turn_interactions(command.turn_id)
            self._offer_interrupt_acknowledgement(turn)
        self._result(
            command.bridge_request_id,
            command.command,
            threadId=command.thread_id,
            turnId=command.turn_id,
        )

    def _offer_interrupt_acknowledgement(self, turn: TurnRecord) -> None:
        if turn.kind is not TurnKind.PRODUCT or turn.interrupt_acknowledged:
            return
        turn.interrupt_acknowledged = True
        self._offer_turn_event(
            turn,
            {
                "type": "turn.interrupt_acknowledged",
                "threadId": turn.thread_id,
                "turnId": turn.handle.id,
            },
        )

    def _remove_turn_interactions(self, turn_id: str) -> None:
        for interaction_id, interaction in list(self._interactions.items()):
            if interaction.request.turn_id == turn_id:
                self._discard_interaction(interaction_id)

    async def _await_turn_settlement(self, turn_id: str) -> None:
        while True:
            barriers = [
                interaction.settlement_done.wait()
                for interaction in self._interactions.values()
                if interaction.request.turn_id == turn_id and interaction.settling
            ]
            if not barriers:
                return
            await asyncio.gather(*barriers)

    def _discard_interaction(self, interaction_id: str) -> None:
        interaction = self._interactions.pop(interaction_id, None)
        if interaction is not None:
            interaction.settlement_done.set()

    def _clear_interactions(self) -> None:
        for interaction_id in list(self._interactions):
            self._discard_interaction(interaction_id)

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
        turns_by_id = dict(self._turns)
        if turns_by_id:
            await asyncio.gather(
                *(turn.handle.interrupt() for turn in turns_by_id.values()),
                return_exceptions=True,
            )
        operations = [
            task for task in self._operations if task is not asyncio.current_task()
        ]
        if operations:
            await asyncio.gather(*operations, return_exceptions=True)
        newly_accepted_turns = [
            turn for turn_id, turn in self._turns.items() if turn_id not in turns_by_id
        ]
        if newly_accepted_turns:
            await asyncio.gather(
                *(turn.handle.interrupt() for turn in newly_accepted_turns),
                return_exceptions=True,
            )
            turns_by_id.update((turn.handle.id, turn) for turn in newly_accepted_turns)
        if turns_by_id:
            stream_tasks = [
                turn.stream_task
                for turn in turns_by_id.values()
                if turn.stream_task is not None
            ]
            if stream_tasks:
                await asyncio.gather(*stream_tasks, return_exceptions=True)
        await self._stop_user_input_collector()
        self._clear_interactions()
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
        await self._stop_user_input_collector()
        self._clear_interactions()
        if self._initialized:
            await self._codex.close()
            self._initialized = False
        self._output.finish_without_frame()

    async def shutdown_after_fatal(self) -> None:
        await self._stop_user_input_collector()
        self._clear_interactions()
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

    async def _stop_user_input_collector(self) -> None:
        collector = self._user_input_collector
        self._user_input_collector = None
        if collector is None or collector.done():
            return
        collector.cancel()
        await asyncio.gather(collector, return_exceptions=True)
