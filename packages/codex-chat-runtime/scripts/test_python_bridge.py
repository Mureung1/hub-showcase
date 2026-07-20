from __future__ import annotations

import json
import queue
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from typing import Any

sys.dont_write_bytecode = True
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
BRIDGE_SOURCE = PACKAGE_ROOT / "python" / "bridge"
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(BRIDGE_SOURCE))

from ay_ple_codex_bridge.protocol import (  # noqa: E402
    MAX_FRAME_BYTES,
    BoundedOutputBuffer,
    OutputBufferOverflow,
    ProtocolViolation,
    RequestLeaseTable,
    decode_command_line,
    encode_frame,
)

from process_oracle import reap_worker_group, wait_for_process_exit  # noqa: E402


BUNDLE = PACKAGE_ROOT / ".artifacts" / "production-runtime-darwin-arm64" / "bundle"
BUNDLE_PYTHON = BUNDLE / "python" / "bin" / "python3.10"
BUNDLE_SITE_PACKAGES = BUNDLE / "site-packages"
WORKER = BUNDLE / "bridge" / "worker.py"
FAKE_SERVER = Path(__file__).with_name("fake_python_bridge_app_server.py")


class BridgeProcess:
    def __init__(
        self,
        root: Path,
        *extra_args: str,
        read_stdout: bool = True,
    ) -> None:
        if not BUNDLE_PYTHON.is_file() or not BUNDLE_SITE_PACKAGES.is_dir():
            raise AssertionError(
                "materialize and verify the darwin-arm64 production runtime before bridge tests"
            )
        self.journal = root / "journal.json"
        self.child_pid_path = root / "child.pid"
        self.process = subprocess.Popen(
            [
                str(BUNDLE_PYTHON),
                "-B",
                str(WORKER),
                "--workspace",
                str(root),
                "--site-packages",
                str(BUNDLE_SITE_PACKAGES),
                "--launch-arg",
                str(BUNDLE_PYTHON),
                "--launch-arg",
                str(FAKE_SERVER),
                "--launch-arg",
                str(self.journal),
                "--launch-arg",
                str(self.child_pid_path),
                *extra_args,
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
        )
        assert self.process.stdout is not None
        self._frames: queue.Queue[bytes | None] = queue.Queue()
        self._reader: threading.Thread | None = None
        self._ready_seen = False
        if read_stdout:
            self._reader = threading.Thread(target=self._read_stdout, daemon=True)
            self._reader.start()

    def _read_stdout(self) -> None:
        assert self.process.stdout is not None
        while line := self.process.stdout.readline():
            self._frames.put(line)
        self._frames.put(None)

    def send(self, frame: dict[str, Any]) -> None:
        self.send_raw(json.dumps(frame, separators=(",", ":")).encode("utf-8") + b"\n")

    def send_raw(self, frame: bytes) -> None:
        assert self.process.stdin is not None
        self.process.stdin.write(frame)
        self.process.stdin.flush()

    def _receive_frame(self, timeout: float) -> dict[str, Any]:
        try:
            line = self._frames.get(timeout=timeout)
        except queue.Empty as exc:
            raise AssertionError("timed out waiting for bridge frame") from exc
        if line is None:
            stderr = b""
            if self.process.stderr is not None:
                stderr = self.process.stderr.read()
            raise AssertionError(
                f"bridge exited before a frame: {stderr.decode(errors='replace')}"
            )
        value = json.loads(line)
        if not isinstance(value, dict):
            raise AssertionError(f"bridge emitted non-object frame: {value!r}")
        return value

    def wait_ready(self, timeout: float = 3.0) -> None:
        if self._ready_seen:
            return
        frame = self._receive_frame(timeout)
        if frame != {"type": "ready"}:
            raise AssertionError(f"bridge did not report readiness first: {frame!r}")
        self._ready_seen = True

    def receive(self, timeout: float = 3.0) -> dict[str, Any]:
        self.wait_ready(timeout)
        return self._receive_frame(timeout)

    def wait(self) -> None:
        self.process.wait(timeout=4)
        if self.process.returncode != 0:
            stderr = (
                self.process.stderr.read().decode(errors="replace")
                if self.process.stderr
                else ""
            )
            raise AssertionError(f"bridge exited {self.process.returncode}: {stderr}")

    def cleanup(self) -> None:
        try:
            if self.process.poll() is None:
                reap_worker_group(self.process, self.child_pid_path)
            elif self.child_pid_path.is_file():
                wait_for_process_exit(
                    int(self.child_pid_path.read_text(encoding="utf-8")),
                    time.monotonic() + 2,
                )
        finally:
            if self._reader is not None:
                self._reader.join(timeout=1)
            for pipe in (self.process.stdin, self.process.stdout, self.process.stderr):
                if pipe is not None:
                    pipe.close()


class ProtocolUnitTests(unittest.TestCase):
    def test_request_leases_bound_application_and_control_with_close_bypass(
        self,
    ) -> None:
        leases = RequestLeaseTable(total_limit=3, control_reserve=1)
        self.assertEqual(leases.acquire("turn", "application"), "admitted")
        leases.transfer_to_turn("turn")
        self.assertEqual(leases.acquire("app", "application"), "admitted")
        self.assertEqual(leases.acquire("excess-app", "application"), "capacity")
        self.assertEqual(leases.acquire("control", "control"), "admitted")
        self.assertEqual(leases.acquire("excess-control", "control"), "capacity")
        self.assertEqual(leases.acquire("close", "close"), "admitted")
        self.assertEqual(leases.acquire("turn", "close"), "duplicate")
        self.assertEqual(leases.usage, (2, 1, 1))

        for request_id in ("turn", "app", "control", "close"):
            leases.release(request_id)
        self.assertEqual(leases.acquire("turn", "application"), "admitted")
        self.assertEqual(leases.usage, (1, 0, 0))

    def test_decodes_exact_commands_and_rejects_unknown_or_extra_fields(self) -> None:
        command = decode_command_line(
            b'{"bridgeRequestId":"r1","command":"start_turn","threadId":"t","text":"hi"}\n'
        )
        self.assertEqual(command.bridge_request_id, "r1")
        self.assertEqual(command.thread_id, "t")
        self.assertEqual(command.text, "hi")

        invalid = (
            b'{"bridgeRequestId":"r1","command":"unknown"}\n',
            b'{"bridgeRequestId":"r1","command":"close","extra":true}\n',
            b'{"bridgeRequestId":"","command":"close"}\n',
            b'{"bridgeRequestId":"r1","command":"close","value":NaN}\n',
        )
        for line in invalid:
            with self.subTest(line=line):
                with self.assertRaises(ProtocolViolation):
                    decode_command_line(line)

    def test_decodes_legacy_and_isolated_thread_start_without_exposing_token(
        self,
    ) -> None:
        legacy = decode_command_line(
            b'{"bridgeRequestId":"legacy","command":"start_thread"}\n'
        )
        self.assertIsNone(legacy.workspace)
        self.assertIsNone(legacy.private_mcp)

        token = "private-mcp-token"
        isolated = {
            "bridgeRequestId": "isolated",
            "command": "start_thread",
            "workspace": "/workspace/semester-a",
            "mcp": {
                "url": "http://127.0.0.1:43127/mcp",
                "token": token,
            },
        }
        command = decode_command_line(
            json.dumps(isolated, separators=(",", ":")).encode() + b"\n"
        )
        self.assertEqual(command.workspace, isolated["workspace"])
        self.assertEqual(command.private_mcp.url, isolated["mcp"]["url"])
        self.assertEqual(command.private_mcp.token, token)
        self.assertNotIn(token, str(command))

        invalid = (
            {**isolated, "workspace": "relative/workspace"},
            {
                **isolated,
                "mcp": {
                    **isolated["mcp"],
                    "url": "https://127.0.0.1:43127/mcp",
                },
            },
            {
                **isolated,
                "mcp": {
                    **isolated["mcp"],
                    "url": "http://example.com:43127/mcp",
                },
            },
            {**isolated, "mcp": {"url": "http://127.0.0.1:43127/mcp"}},
            {**isolated, "extra": True},
        )
        for value in invalid:
            with self.subTest(value=value):
                line = json.dumps(value, separators=(",", ":")).encode() + b"\n"
                with self.assertRaises(ProtocolViolation):
                    decode_command_line(line)

    def test_decodes_bounded_structured_product_and_interaction_commands(self) -> None:
        product = {
            "bridgeRequestId": "product",
            "command": "start_product_turn",
            "threadId": "thread-1",
            "skillName": "assignment-modeling",
            "skillPath": "/managed/assignment-modeling/SKILL.md",
            "text": "Review staged Markdown",
            "planModel": "fake-model",
            "reasoningEffort": "medium",
        }
        command = decode_command_line(
            json.dumps(product, separators=(",", ":")).encode() + b"\n"
        )
        self.assertEqual(command.skill_name, "assignment-modeling")
        self.assertEqual(command.skill_path, product["skillPath"])

        text_only = dict(product)
        text_only.pop("skillName")
        text_only.pop("skillPath")
        command = decode_command_line(
            json.dumps(text_only, separators=(",", ":")).encode() + b"\n"
        )
        self.assertIsNone(command.skill_name)
        self.assertIsNone(command.skill_path)

        answer = decode_command_line(
            b'{"bridgeRequestId":"answer","command":"answer_user_input",'
            b'"interactionId":"interaction-1","answers":{"decision":["Accept"]}}\n'
        )
        self.assertEqual(answer.answers, {"decision": ("Accept",)})

        invalid = (
            {**product, "skillPath": "relative/SKILL.md"},
            {key: value for key, value in product.items() if key != "skillName"},
            {**product, "reasoningEffort": ""},
            {
                "bridgeRequestId": "answer",
                "command": "answer_user_input",
                "interactionId": "interaction-1",
                "answers": {str(index): [] for index in range(4)},
            },
        )
        for value in invalid:
            with self.subTest(value=value):
                line = json.dumps(value, separators=(",", ":")).encode() + b"\n"
                with self.assertRaises(ProtocolViolation):
                    decode_command_line(line)

    def test_frame_limit_is_inclusive_of_newline(self) -> None:
        prefix = (
            b'{"bridgeRequestId":"r","command":"start_turn","threadId":"t","text":"'
        )
        suffix = b'"}\n'
        exact = prefix + (b"x" * (MAX_FRAME_BYTES - len(prefix) - len(suffix))) + suffix
        self.assertEqual(len(exact), MAX_FRAME_BYTES)
        command = decode_command_line(exact)
        self.assertEqual(command.bridge_request_id, "r")
        with self.assertRaisesRegex(ProtocolViolation, "frame_too_large"):
            decode_command_line(exact[:-1] + b"x\n")

    def test_bounded_output_reserves_terminal_lane_and_counts_utf8_line(self) -> None:
        first = encode_frame({"type": "result", "bridgeRequestId": "r", "text": "한"})
        output = BoundedOutputBuffer(max_frames=1, max_bytes=len(first))
        output.offer_encoded(first)
        with self.assertRaises(OutputBufferOverflow):
            output.offer_encoded(first)

        fatal = encode_frame(
            {
                "type": "fatal",
                "code": "buffer_overflow",
                "displayMessage": "The bridge output buffer overflowed.",
            }
        )
        output.latch_fatal(fatal)
        self.assertEqual(output.take_nowait(), fatal)
        self.assertIsNone(output.take_nowait())
        self.assertEqual(output.usage, (0, 0))

    def test_encoder_rejects_nan_and_unpaired_surrogate(self) -> None:
        for value in (float("nan"), "\ud800"):
            with self.subTest(value=repr(value)):
                with self.assertRaises(ProtocolViolation):
                    encode_frame({"type": "event", "value": value})


class PythonBridgeActualChildTests(unittest.TestCase):
    def _inject_response(
        self,
        root: Path,
        *,
        method: str,
        response: dict[str, Any],
    ) -> None:
        (root / "injected-response.json").write_text(
            json.dumps({"method": method, "response": response}),
            encoding="utf-8",
        )

    def _prepare_mutation(
        self,
        bridge: BridgeProcess,
        root: Path,
        operation: str,
        response: dict[str, Any],
    ) -> None:
        bridge.wait_ready()
        if operation == "thread/start":
            self._inject_response(root, method=operation, response=response)
            bridge.send({"bridgeRequestId": "mutation", "command": "start_thread"})
            return

        bridge.send({"bridgeRequestId": "thread", "command": "start_thread"})
        self.assertEqual(bridge.receive()["type"], "result")
        if operation == "turn/start":
            self._inject_response(root, method=operation, response=response)
            bridge.send(
                {
                    "bridgeRequestId": "mutation",
                    "command": "start_turn",
                    "threadId": "thread-1",
                    "text": "injected mutation response",
                }
            )
            return

        if operation != "turn/interrupt":
            raise AssertionError(f"unsupported mutation operation: {operation}")
        bridge.send(
            {
                "bridgeRequestId": "turn",
                "command": "start_turn",
                "threadId": "thread-1",
                "text": "hold",
            }
        )
        self.assertEqual(bridge.receive()["type"], "result")
        self._inject_response(root, method=operation, response=response)
        bridge.send(
            {
                "bridgeRequestId": "mutation",
                "command": "interrupt",
                "threadId": "thread-1",
                "turnId": "turn-1",
            }
        )

    def test_malformed_mutation_responses_are_process_fatal(self) -> None:
        common_cases = (
            ("null-result", {"result": None}),
            ("scalar-result", {"result": "not-an-object"}),
            ("array-result", {"result": []}),
            ("missing-result-and-error", {}),
            (
                "result-and-error",
                {
                    "result": {},
                    "error": {"code": -32602, "message": "contradiction"},
                },
            ),
            ("non-object-error", {"error": []}),
            ("missing-error-code", {"error": {"message": "missing code"}}),
            (
                "boolean-error-code",
                {"error": {"code": True, "message": "boolean code"}},
            ),
            (
                "non-string-error-message",
                {"error": {"code": -32602, "message": 42}},
            ),
        )
        schema_cases = (("schema-invalid-result", {"result": {}}),)
        for operation in ("thread/start", "turn/start", "turn/interrupt"):
            cases = common_cases + (
                () if operation == "turn/interrupt" else schema_cases
            )
            for label, response in cases:
                with self.subTest(operation=operation, response=label):
                    with tempfile.TemporaryDirectory(
                        prefix="ay-ple-python-bridge-malformed-response-"
                    ) as temp:
                        root = Path(temp)
                        bridge = BridgeProcess(root)
                        try:
                            self._prepare_mutation(bridge, root, operation, response)
                            self.assertEqual(
                                bridge.receive(),
                                {
                                    "type": "fatal",
                                    "code": "sdk_operation_failed",
                                    "displayMessage": (
                                        "The Codex bridge terminated because its private "
                                        "protocol failed."
                                    ),
                                },
                            )
                            bridge.wait()
                            self.assertIsNone(bridge._frames.get(timeout=1))
                        finally:
                            bridge.cleanup()

    def test_well_formed_json_rpc_mutation_errors_are_nonfatal(self) -> None:
        rejection = {"error": {"code": -32602, "message": "injected valid rejection"}}
        for operation in ("thread/start", "turn/start", "turn/interrupt"):
            with self.subTest(operation=operation):
                with tempfile.TemporaryDirectory(
                    prefix="ay-ple-python-bridge-valid-rejection-"
                ) as temp:
                    root = Path(temp)
                    bridge = BridgeProcess(root)
                    try:
                        self._prepare_mutation(bridge, root, operation, rejection)
                        self.assertEqual(
                            bridge.receive(),
                            {
                                "type": "error",
                                "bridgeRequestId": "mutation",
                                "code": "sdk_request_failed",
                                "displayMessage": "Codex rejected the requested operation.",
                            },
                        )
                        if operation == "turn/interrupt":
                            bridge.send(
                                {
                                    "bridgeRequestId": "follow-up",
                                    "command": "interrupt",
                                    "threadId": "thread-1",
                                    "turnId": "turn-1",
                                }
                            )
                            frames = [bridge.receive(), bridge.receive()]
                            self.assertEqual(
                                {frame["type"] for frame in frames},
                                {"result", "event"},
                            )
                        else:
                            bridge.send(
                                {
                                    "bridgeRequestId": "follow-up",
                                    "command": "start_thread",
                                }
                            )
                            self.assertEqual(bridge.receive()["type"], "result")
                        bridge.send({"bridgeRequestId": "close", "command": "close"})
                        self.assertEqual(bridge.receive()["type"], "close_ack")
                        bridge.wait()
                    finally:
                        bridge.cleanup()

    def test_worker_reports_ready_after_sdk_initialization(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ay-ple-python-bridge-ready-") as temp:
            bridge = BridgeProcess(Path(temp))
            try:
                bridge.wait_ready()
                journal = json.loads(bridge.journal.read_text(encoding="utf-8"))[
                    "messages"
                ]
                self.assertEqual(
                    [message["method"] for message in journal[:2]],
                    ["initialize", "initialized"],
                )
                bridge.send({"bridgeRequestId": "close", "command": "close"})
                self.assertEqual(
                    bridge.receive(),
                    {"type": "close_ack", "bridgeRequestId": "close"},
                )
                bridge.wait()
            finally:
                bridge.cleanup()

    def test_response_last_stream_is_acceptance_first_allowlisted_and_safe(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory(prefix="ay-ple-python-bridge-") as temp:
            bridge = BridgeProcess(Path(temp))
            try:
                bridge.send({"bridgeRequestId": "thread", "command": "start_thread"})
                thread = bridge.receive()
                self.assertEqual(
                    thread,
                    {
                        "type": "result",
                        "bridgeRequestId": "thread",
                        "command": "start_thread",
                        "threadId": "thread-1",
                    },
                )

                bridge.send(
                    {
                        "bridgeRequestId": "turn",
                        "command": "start_turn",
                        "threadId": "thread-1",
                        "text": "response-last",
                    }
                )
                frames = [bridge.receive() for _ in range(5)]
                self.assertEqual(
                    frames[0],
                    {
                        "type": "result",
                        "bridgeRequestId": "turn",
                        "command": "start_turn",
                        "threadId": "thread-1",
                        "turnId": "turn-1",
                    },
                )
                self.assertEqual(
                    [frame.get("event", {}).get("type") for frame in frames[1:]],
                    [
                        "turn.error",
                        "agent_message.delta",
                        "agent_message.completed",
                        "turn.completed",
                    ],
                )
                self.assertEqual(frames[1]["event"]["code"], "serverOverloaded")
                serialized = json.dumps(frames, sort_keys=True)
                self.assertNotIn("secret", serialized)
                self.assertNotIn("/provider-token", serialized)
                self.assertNotIn("method", serialized)
                self.assertEqual(frames[-1]["event"]["status"], "completed")

                bridge.send({"bridgeRequestId": "close", "command": "close"})
                self.assertEqual(
                    bridge.receive(),
                    {"type": "close_ack", "bridgeRequestId": "close"},
                )
                bridge.wait()

                journal = json.loads(bridge.journal.read_text(encoding="utf-8"))[
                    "messages"
                ]
                self.assertEqual(
                    [message["method"] for message in journal[:3]],
                    ["initialize", "initialized", "thread/start"],
                )
                self.assertEqual(journal[2]["params"]["approvalPolicy"], "never")
                self.assertEqual(journal[2]["params"]["sandbox"], "read-only")
                opt_out = journal[0]["params"]["capabilities"].get(
                    "optOutNotificationMethods"
                )
                self.assertIsInstance(opt_out, list)
                self.assertEqual(len(opt_out), 61)
                self.assertEqual(opt_out, sorted(opt_out))
                self.assertIn("thread/started", opt_out)
                self.assertIn("thread/status/changed", opt_out)
                self.assertNotIn("item/agentMessage/delta", opt_out)
                self.assertNotIn("item/completed", opt_out)
                self.assertNotIn("item/plan/delta", opt_out)
                self.assertNotIn("item/started", opt_out)
                self.assertNotIn("error", opt_out)
                self.assertNotIn("serverRequest/resolved", opt_out)
                self.assertNotIn("turn/completed", opt_out)
                turn_params = next(
                    message["params"]
                    for message in journal
                    if message.get("method") == "turn/start"
                )
                self.assertEqual(turn_params["approvalPolicy"], "never")
                self.assertEqual(
                    turn_params["sandboxPolicy"],
                    {"networkAccess": False, "type": "readOnly"},
                )
            finally:
                bridge.cleanup()

    def test_interrupt_release_and_active_turn_limit_are_nonfatal(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="ay-ple-python-bridge-control-"
        ) as temp:
            bridge = BridgeProcess(Path(temp), "--active-turn-limit", "1")
            try:
                for request_id in ("a", "b"):
                    bridge.send(
                        {"bridgeRequestId": request_id, "command": "start_thread"}
                    )
                    bridge.receive()
                bridge.send(
                    {
                        "bridgeRequestId": "hold",
                        "command": "start_turn",
                        "threadId": "thread-1",
                        "text": "hold",
                    }
                )
                acceptance = bridge.receive()
                self.assertEqual(acceptance["turnId"], "turn-1")

                bridge.send(
                    {
                        "bridgeRequestId": "blocked",
                        "command": "start_turn",
                        "threadId": "thread-2",
                        "text": "complete",
                    }
                )
                self.assertEqual(bridge.receive()["code"], "active_turn_limit")
                bridge.send(
                    {
                        "bridgeRequestId": "release-active",
                        "command": "release_thread",
                        "threadId": "thread-1",
                    }
                )
                self.assertEqual(bridge.receive()["code"], "active_turn")

                bridge.send(
                    {
                        "bridgeRequestId": "interrupt",
                        "command": "interrupt",
                        "threadId": "thread-1",
                        "turnId": "turn-1",
                    }
                )
                control_and_terminal = [bridge.receive(), bridge.receive()]
                self.assertEqual(
                    {frame["type"] for frame in control_and_terminal},
                    {"result", "event"},
                )
                terminal = next(
                    frame for frame in control_and_terminal if frame["type"] == "event"
                )
                self.assertEqual(terminal["event"]["status"], "interrupted")

                bridge.send(
                    {
                        "bridgeRequestId": "release",
                        "command": "release_thread",
                        "threadId": "thread-1",
                    }
                )
                self.assertEqual(bridge.receive()["type"], "result")
                bridge.send(
                    {
                        "bridgeRequestId": "released",
                        "command": "start_turn",
                        "threadId": "thread-1",
                        "text": "complete",
                    }
                )
                self.assertEqual(bridge.receive()["code"], "unknown_thread")
                bridge.send({"bridgeRequestId": "close", "command": "close"})
                self.assertEqual(bridge.receive()["type"], "close_ack")
                bridge.wait()
            finally:
                bridge.cleanup()

    def test_thread_cap_evicts_only_exact_idle_lru_locally(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ay-ple-python-bridge-lru-") as temp:
            bridge = BridgeProcess(Path(temp), "--live-thread-limit", "2")
            try:
                for request_id in ("a", "b"):
                    bridge.send(
                        {"bridgeRequestId": request_id, "command": "start_thread"}
                    )
                    bridge.receive()
                bridge.send(
                    {
                        "bridgeRequestId": "refresh-a",
                        "command": "start_turn",
                        "threadId": "thread-1",
                        "text": "refresh",
                    }
                )
                self.assertEqual(bridge.receive()["type"], "result")
                for _ in range(3):
                    bridge.receive()

                bridge.send({"bridgeRequestId": "c", "command": "start_thread"})
                self.assertEqual(bridge.receive()["threadId"], "thread-3")
                bridge.send(
                    {
                        "bridgeRequestId": "b-gone",
                        "command": "start_turn",
                        "threadId": "thread-2",
                        "text": "complete",
                    }
                )
                self.assertEqual(bridge.receive()["code"], "unknown_thread")
                bridge.send(
                    {
                        "bridgeRequestId": "a-stays",
                        "command": "start_turn",
                        "threadId": "thread-1",
                        "text": "complete",
                    }
                )
                self.assertEqual(bridge.receive()["type"], "result")
                for _ in range(3):
                    bridge.receive()
                bridge.send({"bridgeRequestId": "close", "command": "close"})
                bridge.receive()
                bridge.wait()

                methods = [
                    message["method"]
                    for message in json.loads(
                        bridge.journal.read_text(encoding="utf-8")
                    )["messages"]
                ]
                self.assertNotIn("thread/archive", methods)
                self.assertNotIn("thread/delete", methods)
            finally:
                bridge.cleanup()

    def test_live_thread_cap_rejects_without_evicting_active_and_close_settles(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory(
            prefix="ay-ple-python-bridge-live-cap-"
        ) as temp:
            bridge = BridgeProcess(
                Path(temp),
                "--live-thread-limit",
                "2",
                "--active-turn-limit",
                "2",
            )
            try:
                for request_id in ("a", "b"):
                    bridge.send(
                        {"bridgeRequestId": request_id, "command": "start_thread"}
                    )
                    bridge.receive()
                for request_id, thread_id in (
                    ("hold-a", "thread-1"),
                    ("hold-b", "thread-2"),
                ):
                    bridge.send(
                        {
                            "bridgeRequestId": request_id,
                            "command": "start_turn",
                            "threadId": thread_id,
                            "text": "hold",
                        }
                    )
                    self.assertEqual(bridge.receive()["type"], "result")

                bridge.send({"bridgeRequestId": "c", "command": "start_thread"})
                self.assertEqual(bridge.receive()["code"], "live_thread_limit")
                bridge.send({"bridgeRequestId": "close", "command": "close"})
                frames = [bridge.receive(), bridge.receive(), bridge.receive()]
                self.assertEqual(
                    sorted(frame["type"] for frame in frames),
                    ["close_ack", "event", "event"],
                )
                self.assertEqual(
                    {
                        frame["event"]["status"]
                        for frame in frames
                        if frame["type"] == "event"
                    },
                    {"interrupted"},
                )
                bridge.wait()
            finally:
                bridge.cleanup()

    def test_stdout_queue_overflow_replaces_pending_frames_with_one_fatal(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="ay-ple-python-bridge-output-cap-"
        ) as temp:
            bridge = BridgeProcess(
                Path(temp),
                "--stdout-max-frames",
                "1",
                "--stdout-start-delay-ms",
                "1000",
            )
            try:
                bridge.send({"bridgeRequestId": "thread", "command": "start_thread"})
                bridge.send(
                    {
                        "bridgeRequestId": "turn",
                        "command": "start_turn",
                        "threadId": "thread-1",
                        "text": "complete",
                    }
                )
                self.assertEqual(
                    # This raw bridge-only oracle intentionally pipelines work
                    # before a production Node caller has consumed `ready`.
                    # The reserved terminal lane replaces every queued frame,
                    # including that private readiness signal.
                    bridge._receive_frame(3),
                    {
                        "type": "fatal",
                        "code": "buffer_overflow",
                        "displayMessage": "The bridge output buffer overflowed.",
                    },
                )
                bridge.wait()
                self.assertIsNone(bridge._frames.get(timeout=1))
            finally:
                bridge.cleanup()

    def test_accepted_stream_failure_preserves_queued_acceptance(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="ay-ple-python-bridge-queued-acceptance-"
        ) as temp:
            bridge = BridgeProcess(
                Path(temp),
                "--stdout-start-delay-ms",
                "5000",
            )
            try:
                bridge.send({"bridgeRequestId": "thread", "command": "start_thread"})
                deadline = time.monotonic() + 3
                thread_start_seen = False
                while time.monotonic() < deadline:
                    if bridge.journal.is_file():
                        messages = json.loads(
                            bridge.journal.read_text(encoding="utf-8")
                        )["messages"]
                        thread_start_seen = any(
                            message.get("method") == "thread/start"
                            for message in messages
                        )
                        if thread_start_seen:
                            break
                    time.sleep(0.01)
                self.assertTrue(thread_start_seen)
                time.sleep(0.1)

                bridge.send(
                    {
                        "bridgeRequestId": "turn",
                        "command": "start_turn",
                        "threadId": "thread-1",
                        "text": "malformed-after-response",
                    }
                )
                frames = [bridge.receive(timeout=7) for _ in range(3)]
                self.assertEqual(
                    [frame["type"] for frame in frames],
                    ["result", "result", "fatal"],
                )
                self.assertEqual(frames[0]["bridgeRequestId"], "thread")
                self.assertEqual(frames[1]["bridgeRequestId"], "turn")
                self.assertEqual(frames[1]["turnId"], "turn-1")
                self.assertEqual(frames[2]["code"], "sdk_stream_failed")
                bridge.wait()
                self.assertIsNone(bridge._frames.get(timeout=1))
            finally:
                bridge.cleanup()

    def test_close_drains_locked_and_queued_admitted_thread_starts_before_ack(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory(
            prefix="ay-ple-python-bridge-close-drain-"
        ) as temp:
            root = Path(temp)
            (root / "delay-thread-start-ms").write_text("500", encoding="utf-8")
            bridge = BridgeProcess(root)
            try:
                bridge.send({"bridgeRequestId": "first", "command": "start_thread"})
                deadline = time.monotonic() + 3
                first_start_seen = False
                while time.monotonic() < deadline:
                    if bridge.journal.is_file():
                        messages = json.loads(
                            bridge.journal.read_text(encoding="utf-8")
                        )["messages"]
                        first_start_seen = any(
                            message.get("method") == "thread/start"
                            for message in messages
                        )
                        if first_start_seen:
                            break
                    time.sleep(0.01)
                self.assertTrue(first_start_seen)

                bridge.send_raw(
                    b'{"bridgeRequestId":"second","command":"start_thread"}\n'
                    b'{"bridgeRequestId":"close","command":"close"}\n'
                )
                self.assertEqual(
                    bridge.receive(),
                    {
                        "type": "result",
                        "bridgeRequestId": "first",
                        "command": "start_thread",
                        "threadId": "thread-1",
                    },
                )
                self.assertEqual(
                    bridge.receive(),
                    {
                        "type": "result",
                        "bridgeRequestId": "second",
                        "command": "start_thread",
                        "threadId": "thread-2",
                    },
                )
                self.assertEqual(
                    bridge.receive(),
                    {"type": "close_ack", "bridgeRequestId": "close"},
                )
                bridge.wait()
            finally:
                bridge.cleanup()

    def test_pending_operation_admission_is_bounded_and_reserves_control(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="ay-ple-python-bridge-operation-cap-"
        ) as temp:
            root = Path(temp)
            bridge = BridgeProcess(
                root,
                "--pending-operation-limit",
                "3",
                "--control-operation-reserve",
                "1",
            )
            try:
                (root / "hold-thread-start").touch()
                bridge.send({"bridgeRequestId": "first", "command": "start_thread"})
                bridge.send({"bridgeRequestId": "second", "command": "start_thread"})
                bridge.send({"bridgeRequestId": "excess", "command": "start_thread"})
                self.assertEqual(bridge.receive()["code"], "operation_limit")

                bridge.send(
                    {
                        "bridgeRequestId": "control",
                        "command": "release_thread",
                        "threadId": "missing",
                    }
                )
                self.assertEqual(bridge.receive()["code"], "unknown_thread")

                bridge.send({"bridgeRequestId": "first", "command": "close"})
                self.assertEqual(
                    bridge.receive()["code"], "duplicate_bridge_request_id"
                )
                bridge.wait()
                self.assertIsNone(bridge._frames.get(timeout=1))
            finally:
                bridge.cleanup()

    def test_stdout_writer_failure_exits_and_reaps_native_child(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="ay-ple-python-bridge-writer-failure-"
        ) as temp:
            bridge = BridgeProcess(Path(temp), read_stdout=False)
            try:
                deadline = time.monotonic() + 3
                initialized = False
                while time.monotonic() < deadline:
                    if bridge.journal.is_file():
                        messages = json.loads(
                            bridge.journal.read_text(encoding="utf-8")
                        )["messages"]
                        initialized = any(
                            message.get("method") == "initialized"
                            for message in messages
                        )
                        if initialized:
                            break
                    time.sleep(0.01)
                self.assertTrue(initialized)
                assert bridge.process.stdout is not None
                bridge.process.stdout.close()
                bridge.send({"bridgeRequestId": "write", "command": "start_thread"})
                returncode = bridge.process.wait(timeout=4)
                self.assertNotEqual(returncode, 0)
                self.assertTrue(bridge.child_pid_path.is_file())
                wait_for_process_exit(
                    int(bridge.child_pid_path.read_text(encoding="utf-8")),
                    time.monotonic() + 2,
                )
            finally:
                bridge.cleanup()

    def test_protocol_and_serialization_failures_are_once_only_fatal(self) -> None:
        cases: tuple[tuple[str, bytes | dict[str, Any], str], ...] = (
            ("unknown", {"bridgeRequestId": "x", "command": "wat"}, "unknown_command"),
            ("malformed", b"{nope}\n", "malformed_json"),
            ("invalid-utf8", b"\xff\n", "invalid_utf8"),
            ("oversized", b"x" * MAX_FRAME_BYTES + b"\n", "frame_too_large"),
        )
        for label, payload, code in cases:
            with self.subTest(label=label):
                with tempfile.TemporaryDirectory(
                    prefix=f"ay-ple-python-bridge-{label}-"
                ) as temp:
                    bridge = BridgeProcess(Path(temp))
                    try:
                        if isinstance(payload, bytes):
                            bridge.send_raw(payload)
                        else:
                            bridge.send(payload)
                        self.assertEqual(bridge.receive()["code"], code)
                        bridge.wait()
                        self.assertIsNone(bridge._frames.get(timeout=1))
                    finally:
                        bridge.cleanup()

        with tempfile.TemporaryDirectory(
            prefix="ay-ple-python-bridge-serialization-"
        ) as temp:
            bridge = BridgeProcess(Path(temp))
            try:
                bridge.send({"bridgeRequestId": "thread", "command": "start_thread"})
                bridge.receive()
                bridge.send(
                    {
                        "bridgeRequestId": "turn",
                        "command": "start_turn",
                        "threadId": "thread-1",
                        "text": "bad-serialization",
                    }
                )
                self.assertEqual(bridge.receive()["type"], "result")
                self.assertEqual(bridge.receive()["code"], "event_serialization_failed")
                bridge.wait()
                self.assertIsNone(bridge._frames.get(timeout=1))
            finally:
                bridge.cleanup()


if __name__ == "__main__":
    unittest.main()
