"""Strict private NDJSON protocol and bounded stdout buffering."""

from __future__ import annotations

import asyncio
import ipaddress
import json
import os
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Literal, TypeAlias
from urllib.parse import urlsplit


MIB = 1024 * 1024
MAX_FRAME_BYTES = MIB


class ProtocolViolation(ValueError):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


class OutputBufferOverflow(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class ReadAccountCommand:
    bridge_request_id: str
    command: Literal["read_account"] = "read_account"


@dataclass(frozen=True, slots=True)
class PrivateMcpServer:
    url: str
    token: str = field(repr=False)


@dataclass(frozen=True, slots=True)
class StartThreadCommand:
    bridge_request_id: str
    workspace: str | None = None
    private_mcp: PrivateMcpServer | None = None
    command: Literal["start_thread"] = "start_thread"


@dataclass(frozen=True, slots=True)
class StartTurnCommand:
    bridge_request_id: str
    thread_id: str
    text: str
    command: Literal["start_turn"] = "start_turn"


@dataclass(frozen=True, slots=True)
class StartProductTurnCommand:
    bridge_request_id: str
    thread_id: str
    skill_name: str | None
    skill_path: str | None
    text: str
    command: Literal["start_product_turn"] = "start_product_turn"


@dataclass(frozen=True, slots=True)
class AnswerUserInputCommand:
    bridge_request_id: str
    interaction_id: str
    answers: dict[str, tuple[str, ...]]
    command: Literal["answer_user_input"] = "answer_user_input"


@dataclass(frozen=True, slots=True)
class CancelUserInputCommand:
    bridge_request_id: str
    interaction_id: str
    command: Literal["cancel_user_input"] = "cancel_user_input"


@dataclass(frozen=True, slots=True)
class InterruptCommand:
    bridge_request_id: str
    thread_id: str
    turn_id: str
    command: Literal["interrupt"] = "interrupt"


@dataclass(frozen=True, slots=True)
class ReleaseThreadCommand:
    bridge_request_id: str
    thread_id: str
    command: Literal["release_thread"] = "release_thread"


@dataclass(frozen=True, slots=True)
class CloseCommand:
    bridge_request_id: str
    command: Literal["close"] = "close"


BridgeCommand: TypeAlias = (
    ReadAccountCommand
    | StartThreadCommand
    | StartTurnCommand
    | StartProductTurnCommand
    | AnswerUserInputCommand
    | CancelUserInputCommand
    | InterruptCommand
    | ReleaseThreadCommand
    | CloseCommand
)

LeaseKind: TypeAlias = Literal["application", "control", "close"]
LeaseState: TypeAlias = Literal["operation", "turn", "close"]
Admission: TypeAlias = Literal["admitted", "duplicate", "capacity"]


@dataclass(slots=True)
class RequestLease:
    kind: LeaseKind
    state: LeaseState


class RequestLeaseTable:
    """Bound active private correlation IDs with a reserved control lane."""

    def __init__(self, *, total_limit: int, control_reserve: int) -> None:
        if total_limit < 1:
            raise ValueError("request lease limit must be positive")
        if control_reserve < 0 or control_reserve >= total_limit:
            raise ValueError("control reserve must be within the request lease limit")
        self._total_limit = total_limit
        self._application_limit = total_limit - control_reserve
        self._leases: dict[str, RequestLease] = {}

    def acquire(self, request_id: str, kind: LeaseKind) -> Admission:
        if request_id in self._leases:
            return "duplicate"
        if kind == "application" and len(self._leases) >= self._application_limit:
            return "capacity"
        if kind == "control" and len(self._leases) >= self._total_limit:
            return "capacity"
        state: LeaseState = "close" if kind == "close" else "operation"
        self._leases[request_id] = RequestLease(kind=kind, state=state)
        return "admitted"

    def transfer_to_turn(self, request_id: str) -> None:
        lease = self._leases.get(request_id)
        if lease is None or lease.kind != "application" or lease.state != "operation":
            raise RuntimeError("request lease cannot transfer to a turn")
        lease.state = "turn"

    def release(self, request_id: str) -> None:
        self._leases.pop(request_id, None)

    @property
    def usage(self) -> tuple[int, int, int]:
        operations = sum(lease.state == "operation" for lease in self._leases.values())
        turns = sum(lease.state == "turn" for lease in self._leases.values())
        closes = sum(lease.state == "close" for lease in self._leases.values())
        return operations, turns, closes


def _reject_json_constant(_value: str) -> None:
    raise ProtocolViolation("malformed_json")


def _require_nonempty_string(value: object, *, code: str = "invalid_command") -> str:
    if not isinstance(value, str) or not value:
        raise ProtocolViolation(code)
    return value


def _require_exact_fields(value: dict[str, Any], fields: set[str]) -> None:
    if set(value) != fields:
        raise ProtocolViolation("invalid_command")


def _require_bounded_string(
    value: object,
    *,
    max_bytes: int,
    allow_empty: bool = False,
) -> str:
    if not isinstance(value, str) or (not allow_empty and not value):
        raise ProtocolViolation("invalid_command")
    try:
        encoded = value.encode("utf-8", errors="strict")
    except UnicodeEncodeError as exc:
        raise ProtocolViolation("invalid_command") from exc
    if len(encoded) > max_bytes:
        raise ProtocolViolation("invalid_command")
    return value


def _require_answers(value: object) -> dict[str, tuple[str, ...]]:
    if not isinstance(value, dict) or len(value) > 3:
        raise ProtocolViolation("invalid_command")
    answers: dict[str, tuple[str, ...]] = {}
    for question_id, raw_values in value.items():
        key = _require_bounded_string(question_id, max_bytes=256)
        if not isinstance(raw_values, list) or len(raw_values) > 16:
            raise ProtocolViolation("invalid_command")
        answers[key] = tuple(
            _require_bounded_string(
                answer,
                max_bytes=64 * 1024,
                allow_empty=True,
            )
            for answer in raw_values
        )
    return answers


def _require_absolute_path(value: object) -> str:
    path = _require_bounded_string(value, max_bytes=16 * 1024)
    if not os.path.isabs(path):
        raise ProtocolViolation("invalid_command")
    return path


def _require_private_mcp(value: object) -> PrivateMcpServer:
    if not isinstance(value, dict):
        raise ProtocolViolation("invalid_command")
    _require_exact_fields(value, {"url", "token"})
    url = _require_bounded_string(value.get("url"), max_bytes=4 * 1024)
    try:
        parsed = urlsplit(url)
        hostname = parsed.hostname
        address = ipaddress.ip_address(hostname) if hostname is not None else None
        parsed.port
    except ValueError as exc:
        raise ProtocolViolation("invalid_command") from exc
    if (
        parsed.scheme != "http"
        or not parsed.netloc
        or parsed.username is not None
        or parsed.password is not None
        or parsed.fragment
        or address is None
        or not address.is_loopback
    ):
        raise ProtocolViolation("invalid_command")
    token = _require_bounded_string(value.get("token"), max_bytes=4 * 1024)
    if "\r" in token or "\n" in token:
        raise ProtocolViolation("invalid_command")
    return PrivateMcpServer(url=url, token=token)


def decode_command_line(line: bytes) -> BridgeCommand:
    if len(line) > MAX_FRAME_BYTES:
        raise ProtocolViolation("frame_too_large")
    if not line.endswith(b"\n"):
        raise ProtocolViolation("malformed_frame")
    try:
        text = line[:-1].decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise ProtocolViolation("invalid_utf8") from exc
    try:
        value = json.loads(text, parse_constant=_reject_json_constant)
    except ProtocolViolation:
        raise
    except (json.JSONDecodeError, RecursionError) as exc:
        raise ProtocolViolation("malformed_json") from exc
    if not isinstance(value, dict):
        raise ProtocolViolation("invalid_command")

    request_id = _require_nonempty_string(value.get("bridgeRequestId"))
    command = value.get("command")
    if command == "read_account":
        _require_exact_fields(value, {"bridgeRequestId", "command"})
        return ReadAccountCommand(request_id)
    if command == "start_thread":
        legacy_fields = {"bridgeRequestId", "command"}
        isolated_fields = legacy_fields | {"workspace", "mcp"}
        if set(value) == legacy_fields:
            return StartThreadCommand(request_id)
        _require_exact_fields(value, isolated_fields)
        return StartThreadCommand(
            request_id,
            workspace=_require_absolute_path(value.get("workspace")),
            private_mcp=_require_private_mcp(value.get("mcp")),
        )
    if command == "start_turn":
        _require_exact_fields(
            value,
            {"bridgeRequestId", "command", "threadId", "text"},
        )
        return StartTurnCommand(
            request_id,
            _require_nonempty_string(value.get("threadId")),
            _require_nonempty_string(value.get("text")),
        )
    if command == "start_product_turn":
        base_fields = {
            "bridgeRequestId",
            "command",
            "threadId",
            "text",
        }
        skill_fields = {"skillName", "skillPath"}
        if set(value) == base_fields:
            skill_name = None
            skill_path = None
        else:
            _require_exact_fields(value, base_fields | skill_fields)
            skill_name = _require_bounded_string(value.get("skillName"), max_bytes=256)
            skill_path = _require_absolute_path(value.get("skillPath"))
            if os.path.basename(skill_path) != "SKILL.md":
                raise ProtocolViolation("invalid_command")
        return StartProductTurnCommand(
            request_id,
            _require_nonempty_string(value.get("threadId")),
            skill_name,
            skill_path,
            _require_bounded_string(value.get("text"), max_bytes=512 * 1024),
        )
    if command == "answer_user_input":
        _require_exact_fields(
            value,
            {"bridgeRequestId", "command", "interactionId", "answers"},
        )
        return AnswerUserInputCommand(
            request_id,
            _require_bounded_string(value.get("interactionId"), max_bytes=256),
            _require_answers(value.get("answers")),
        )
    if command == "cancel_user_input":
        _require_exact_fields(
            value,
            {"bridgeRequestId", "command", "interactionId"},
        )
        return CancelUserInputCommand(
            request_id,
            _require_bounded_string(value.get("interactionId"), max_bytes=256),
        )
    if command == "interrupt":
        _require_exact_fields(
            value,
            {"bridgeRequestId", "command", "threadId", "turnId"},
        )
        return InterruptCommand(
            request_id,
            _require_nonempty_string(value.get("threadId")),
            _require_nonempty_string(value.get("turnId")),
        )
    if command == "release_thread":
        _require_exact_fields(
            value,
            {"bridgeRequestId", "command", "threadId"},
        )
        return ReleaseThreadCommand(
            request_id,
            _require_nonempty_string(value.get("threadId")),
        )
    if command == "close":
        _require_exact_fields(value, {"bridgeRequestId", "command"})
        return CloseCommand(request_id)
    if isinstance(command, str):
        raise ProtocolViolation("unknown_command")
    raise ProtocolViolation("invalid_command")


def encode_frame(frame: dict[str, Any]) -> bytes:
    try:
        payload = json.dumps(
            frame,
            ensure_ascii=False,
            allow_nan=False,
            separators=(",", ":"),
        ).encode("utf-8", errors="strict")
    except (TypeError, ValueError, UnicodeEncodeError, RecursionError) as exc:
        raise ProtocolViolation("frame_serialization_failed") from exc
    line = payload + b"\n"
    if len(line) > MAX_FRAME_BYTES:
        raise ProtocolViolation("frame_too_large")
    return line


class BoundedOutputBuffer:
    """Single-loop non-blocking queue with a reserved terminal frame lane."""

    def __init__(self, *, max_frames: int, max_bytes: int) -> None:
        if max_frames < 1 or max_bytes < 1:
            raise ValueError("output limits must be positive")
        self._max_frames = max_frames
        self._max_bytes = max_bytes
        self._items: deque[bytes] = deque()
        self._item_bytes = 0
        self._terminal: bytes | None = None
        self._terminal_replaces_items = False
        self._finished = False
        self._ready = asyncio.Event()

    @property
    def usage(self) -> tuple[int, int]:
        return len(self._items), self._item_bytes

    @property
    def finished(self) -> bool:
        return self._finished

    def offer_encoded(self, line: bytes) -> None:
        if self._finished:
            return
        attempted_frames = len(self._items) + 1
        attempted_bytes = self._item_bytes + len(line)
        if attempted_frames > self._max_frames or attempted_bytes > self._max_bytes:
            raise OutputBufferOverflow("buffer_overflow")
        self._items.append(line)
        self._item_bytes = attempted_bytes
        self._ready.set()

    def latch_fatal(self, line: bytes, *, replace_items: bool = True) -> None:
        if self._terminal is not None or self._finished:
            return
        if replace_items:
            self._items.clear()
            self._item_bytes = 0
        self._terminal = line
        self._terminal_replaces_items = replace_items
        self._finished = True
        self._ready.set()

    def finish_with_ack(self, line: bytes) -> None:
        if self._terminal is not None or self._finished:
            return
        self._terminal = line
        self._terminal_replaces_items = False
        self._finished = True
        self._ready.set()

    def finish_without_frame(self) -> None:
        if self._finished:
            return
        self._finished = True
        self._ready.set()

    def take_nowait(self) -> bytes | None:
        if self._terminal_replaces_items and self._terminal is not None:
            terminal = self._terminal
            self._terminal = None
            return terminal
        if self._items:
            line = self._items.popleft()
            self._item_bytes -= len(line)
            return line
        if self._terminal is not None:
            terminal = self._terminal
            self._terminal = None
            return terminal
        return None

    async def take(self) -> bytes | None:
        while True:
            line = self.take_nowait()
            if line is not None:
                return line
            if self._finished:
                return None
            self._ready.clear()
            line = self.take_nowait()
            if line is not None:
                return line
            if self._finished:
                return None
            await self._ready.wait()
