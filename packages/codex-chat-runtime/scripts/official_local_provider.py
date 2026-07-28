"""Test-only controller for the exact official SDK local Responses harness."""

from __future__ import annotations

import argparse
import json
import os
import shlex
import sys
import threading
from pathlib import Path
from typing import Any

from app_server_harness import (
    MockResponsesServer,
    MockSseResponse,
    ev_completed,
    ev_function_call,
    ev_response_created,
    sse,
)
from app_server_helpers import streaming_response


_SANDBOX_EXEC_CALL_ID = "call-workspace-sandbox-exec"
_SANDBOX_MARKER_CONTENT = "workspace-write-ok\n"
_SANDBOX_SENTINEL_REPLACEMENT = "sandbox-escape\n"
_ACTION_SELECTED_PATHS = (
    "materials/lms-outline-notice.txt",
    "materials/problem-solving-syllabus.txt",
)
_ACTION_ACCEPTED_ASSIGNMENT = "# 첫 과제\n\n마감: 2026-08-03 23:59\n제출: LMS 과제함\n"


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)

    policy = commands.add_parser("policy")
    policy.add_argument("--codex-bin", required=True)
    policy.add_argument("--workspace", required=True)
    policy.add_argument("--codex-home", required=True)
    policy.add_argument("--codex-sqlite-home", required=True)
    policy.add_argument("--home", required=True)
    policy.add_argument("--temp-directory", required=True)
    policy.add_argument("--thread-id", required=True)

    serve = commands.add_parser("serve")
    serve.add_argument("--ready-file", required=True)
    serve.add_argument("--journal-file", required=True)

    serve_action = commands.add_parser("serve-action")
    serve_action.add_argument("--ready-file", required=True)
    serve_action.add_argument("--journal-file", required=True)

    serve_sandbox = commands.add_parser("serve-sandbox")
    serve_sandbox.add_argument("--ready-file", required=True)
    serve_sandbox.add_argument("--journal-file", required=True)
    serve_sandbox.add_argument("--workspace", required=True)
    serve_sandbox.add_argument("--inside-marker", required=True)
    serve_sandbox.add_argument("--outside-sentinel", required=True)
    return parser


def _atomic_json(path: Path, value: object) -> None:
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    temporary.write_text(
        json.dumps(value, separators=(",", ":"), sort_keys=True),
        encoding="utf-8",
    )
    os.replace(temporary, path)


def _policy(args: argparse.Namespace) -> int:
    from openai_codex import CodexConfig
    from openai_codex.client import CodexClient
    from openai_codex.generated.v2_all import ThreadResumeParams

    config = CodexConfig(
        codex_bin=args.codex_bin,
        cwd=args.workspace,
        env={
            "CODEX_APP_SERVER_DISABLE_MANAGED_CONFIG": "1",
            "CODEX_HOME": args.codex_home,
            "CODEX_SQLITE_HOME": args.codex_sqlite_home,
            "HOME": args.home,
            "TMPDIR": args.temp_directory,
        },
    )
    with CodexClient(config) as client:
        client.initialize()
        response = client.thread_resume(
            args.thread_id,
            ThreadResumeParams(thread_id=args.thread_id),
        )
    value = response.model_dump(by_alias=True, mode="json")
    print(
        json.dumps(
            {
                "approvalPolicy": value["approvalPolicy"],
                "sandbox": value["sandbox"],
                "threadId": value["thread"]["id"],
            },
            separators=(",", ":"),
            sort_keys=True,
        ),
        flush=True,
    )
    return 0


def _request_journal(responses: MockResponsesServer) -> dict[str, Any]:
    requests = []
    for request in responses.requests():
        body = request.body_json()
        requests.append(
            {
                "method": request.method,
                "model": body.get("model"),
                "path": request.path,
                "instructions": body.get("instructions"),
                "developerTexts": request.message_input_texts("developer"),
                "functionCalls": _journal_function_calls(body),
                "functionOutputs": _journal_function_outputs(body),
                "toolNames": _journal_tool_names(body),
                "userTexts": request.message_input_texts("user"),
            }
        )
    return {"requests": requests}


def _journal_tool_names(body: dict[str, Any]) -> list[str]:
    tools = body.get("tools")
    if not isinstance(tools, list):
        return []
    return [
        name
        for tool in tools
        if isinstance(tool, dict)
        for name in [tool.get("name")]
        if isinstance(name, str)
    ]


def _journal_function_calls(body: dict[str, Any]) -> list[dict[str, Any]]:
    inputs = body.get("input")
    if not isinstance(inputs, list):
        return []
    calls = []
    for item in inputs:
        if not isinstance(item, dict) or item.get("type") != "function_call":
            continue
        call_id = item.get("call_id")
        name = item.get("name")
        namespace = item.get("namespace")
        arguments = item.get("arguments")
        if not isinstance(call_id, str) or not isinstance(name, str):
            continue
        if isinstance(namespace, str):
            name = f"{namespace}__{name}"
        parsed_arguments: Any = arguments
        if isinstance(arguments, str):
            try:
                parsed_arguments = json.loads(arguments)
            except json.JSONDecodeError:
                parsed_arguments = arguments
        calls.append(
            {
                "arguments": parsed_arguments,
                "callId": call_id,
                "name": name,
            }
        )
    return calls


def _journal_function_outputs(body: dict[str, Any]) -> list[str]:
    inputs = body.get("input")
    if not isinstance(inputs, list):
        return []
    outputs = []
    for item in inputs:
        if not isinstance(item, dict) or item.get("type") != "function_call_output":
            continue
        output = item.get("output")
        if isinstance(output, str):
            outputs.append(output)
            continue
        if isinstance(output, list):
            texts = [
                part.get("text")
                for part in output
                if isinstance(part, dict) and isinstance(part.get("text"), str)
            ]
            if texts:
                outputs.append("\n".join(texts))
    return outputs


def _publish_journal(
    responses: MockResponsesServer,
    path: Path,
    stop: threading.Event,
) -> None:
    previous = -1
    while not stop.is_set():
        current = len(responses.requests())
        if current != previous:
            _atomic_json(path, _request_journal(responses))
            previous = current
        stop.wait(0.01)
    _atomic_json(path, _request_journal(responses))


def _is_within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
    except ValueError:
        return False
    return True


def _response_with_call(
    response_id: str,
    call_id: str,
    name: str,
    arguments: dict[str, Any],
    namespace: str | None = None,
) -> MockSseResponse:
    function_call = ev_function_call(
        call_id,
        name,
        json.dumps(
            arguments,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        ),
    )
    if namespace is not None:
        function_call["item"]["namespace"] = namespace
    return MockSseResponse(
        body=sse(
            [
                ev_response_created(response_id),
                function_call,
                ev_completed(response_id),
            ]
        )
    )


def _serve(args: argparse.Namespace) -> int:
    ready_path = Path(args.ready_file)
    journal_path = Path(args.journal_file)
    stop = threading.Event()
    with MockResponsesServer() as responses:
        responses.enqueue_sse(
            streaming_response(
                "exact-t0-response",
                "exact-t0-message",
                ["hello ", "exact ", "runtime"],
            )
        )
        responses.enqueue_sse(
            streaming_response(
                "exact-interrupt-response",
                "exact-interrupt-message",
                ["still ", "running"],
            ),
            delay_between_events_s=0.4,
        )
        responses.enqueue_sse(
            streaming_response(
                "exact-follow-up-response",
                "exact-follow-up-message",
                ["after ", "interrupt"],
            )
        )
        responses.enqueue_sse(
            streaming_response(
                "exact-skill-action-response",
                "exact-skill-action-message",
                ["skill ", "action"],
            )
        )
        journal = threading.Thread(
            target=_publish_journal,
            args=(responses, journal_path, stop),
            name="local-provider-journal",
        )
        journal.start()
        try:
            _atomic_json(ready_path, {"url": responses.url})
            for line in sys.stdin:
                if line.strip() == "close":
                    break
        finally:
            stop.set()
            journal.join(timeout=2)
            if journal.is_alive():
                raise RuntimeError("local provider journal did not stop")
    return 0


def _selected_read_command() -> str:
    python_source = (
        "from pathlib import Path;import hashlib,json,sys;"
        "values={value:hashlib.sha256(Path(value).read_bytes()).hexdigest()"
        " for value in sys.argv[1:]};"
        "print(json.dumps({'selectedFileDigests':values},"
        "separators=(',',':'),sort_keys=True))"
    )
    return " ".join(
        [
            "/usr/bin/python3",
            "-c",
            shlex.quote(python_source),
            *(shlex.quote(value) for value in _ACTION_SELECTED_PATHS),
        ]
    )


def _accepted_checkpoint_command() -> str:
    python_source = (
        "from pathlib import Path;import json,sys;"
        "Path(sys.argv[1]).write_text(sys.argv[2],encoding='utf-8');"
        "print(json.dumps({'intendedMutation':sys.argv[1]},"
        "separators=(',',':'),sort_keys=True))"
    )
    write_command = " ".join(
        [
            "/usr/bin/python3",
            "-c",
            shlex.quote(python_source),
            "assignment.md",
            shlex.quote(_ACTION_ACCEPTED_ASSIGNMENT),
        ]
    )
    return " && ".join(
        [
            write_command,
            "/usr/bin/git add -- assignment.md",
            (
                "/usr/bin/git commit --quiet --only "
                "-m 'feat: record accepted first assignment' -- assignment.md"
            ),
        ]
    )


def _action_review(summary: str, description: str) -> dict[str, Any]:
    return {
        "changes": [
            {
                "after": "2026-08-03 23:59 / LMS 과제함",
                "before": "미정",
                "description": description,
                "label": "첫 과제 정보",
            }
        ],
        "question": "이 변경을 실제 과제 파일에 반영할까요?",
        "summary": summary,
    }


def _guardian_allow_response(response_id: str, message_id: str) -> MockSseResponse:
    return streaming_response(
        response_id,
        message_id,
        ['{"outcome":"allow"}'],
    )


def _serve_action(args: argparse.Namespace) -> int:
    ready_path = Path(args.ready_file)
    journal_path = Path(args.journal_file)
    read_arguments = {
        "cmd": _selected_read_command(),
        "login": False,
        "yield_time_ms": 10_000,
    }
    stop = threading.Event()
    with MockResponsesServer() as responses:
        responses.enqueue_sse(
            _response_with_call(
                "action-read-response",
                "call-action-read-selected",
                "exec_command",
                read_arguments,
            ).body
        )
        responses.enqueue_sse(
            _response_with_call(
                "action-review-initial-response",
                "call-action-review-initial",
                "propose_state_patch",
                _action_review(
                    "첫 과제 정보를 정리합니다.",
                    "선택한 두 자료에서 확인한 정보를 반영합니다.",
                ),
                namespace="mcp__ay_ple_interaction",
            ).body
        )
        responses.enqueue_sse(
            _guardian_allow_response(
                "action-review-initial-guardian-response",
                "action-review-initial-guardian-message",
            )
        )
        responses.enqueue_sse(
            _response_with_call(
                "action-review-revised-response",
                "call-action-review-revised",
                "propose_state_patch",
                _action_review(
                    "피드백을 반영해 과제 정보를 다시 정리합니다.",
                    "제출 방식을 더 분명하게 반영합니다.",
                ),
                namespace="mcp__ay_ple_interaction",
            ).body
        )
        responses.enqueue_sse(
            _guardian_allow_response(
                "action-review-revised-guardian-response",
                "action-review-revised-guardian-message",
            )
        )
        responses.enqueue_sse(
            _response_with_call(
                "action-apply-response",
                "call-action-apply-checkpoint",
                "exec_command",
                {
                    "cmd": _accepted_checkpoint_command(),
                    "justification": (
                        "Record the accepted SemesterWorkspace checkpoint."
                    ),
                    "login": False,
                    "sandbox_permissions": "require_escalated",
                    "yield_time_ms": 10_000,
                },
            ).body
        )
        responses.enqueue_sse(
            _guardian_allow_response(
                "action-apply-guardian-response",
                "action-apply-guardian-message",
            )
        )
        responses.enqueue_sse(
            streaming_response(
                "action-accepted-terminal-response",
                "action-accepted-terminal-message",
                ["accepted ", "action ", "completed"],
            )
        )
        responses.enqueue_sse(
            _response_with_call(
                "action-reject-read-response",
                "call-action-read-rejected",
                "exec_command",
                read_arguments,
            ).body
        )
        responses.enqueue_sse(
            _response_with_call(
                "action-review-rejected-response",
                "call-action-review-rejected",
                "propose_state_patch",
                _action_review(
                    "추가 변경을 제안합니다.",
                    "현재 자료를 다시 확인한 추가 제안입니다.",
                ),
                namespace="mcp__ay_ple_interaction",
            ).body
        )
        responses.enqueue_sse(
            _guardian_allow_response(
                "action-review-rejected-guardian-response",
                "action-review-rejected-guardian-message",
            )
        )
        responses.enqueue_sse(
            streaming_response(
                "action-rejected-terminal-response",
                "action-rejected-terminal-message",
                ["rejected ", "action ", "completed"],
            )
        )
        journal = threading.Thread(
            target=_publish_journal,
            args=(responses, journal_path, stop),
            name="action-local-provider-journal",
        )
        journal.start()
        try:
            _atomic_json(ready_path, {"url": responses.url})
            for line in sys.stdin:
                if line.strip() == "close":
                    break
        finally:
            stop.set()
            journal.join(timeout=2)
            if journal.is_alive():
                raise RuntimeError("action local provider journal did not stop")
    return 0


def _serve_sandbox(args: argparse.Namespace) -> int:
    ready_path = Path(args.ready_file)
    journal_path = Path(args.journal_file)
    workspace = Path(args.workspace).resolve(strict=True)
    inside_marker = Path(args.inside_marker).resolve(strict=False)
    outside_sentinel = Path(args.outside_sentinel).resolve(strict=True)
    if (
        not workspace.is_dir()
        or not inside_marker.parent.resolve(strict=True).is_dir()
        or not _is_within(inside_marker, workspace)
        or _is_within(outside_sentinel, workspace)
        or inside_marker.exists()
        or not outside_sentinel.is_file()
    ):
        raise ValueError("invalid sandbox fixture paths")

    outside_source = (
        "from pathlib import Path;import sys;"
        f"Path(sys.argv[1]).write_text({_SANDBOX_SENTINEL_REPLACEMENT!r},"
        "encoding='utf-8')"
    )
    python_source = (
        "from pathlib import Path;import json,subprocess,sys;"
        "inside=Path(sys.argv[1]);outside=Path(sys.argv[2]);"
        "before=outside.read_text(encoding='utf-8');"
        f"inside.write_text({_SANDBOX_MARKER_CONTENT!r},encoding='utf-8');"
        "attempt=subprocess.run("
        f"['/usr/bin/python3','-c',{outside_source!r},str(outside)],"
        "capture_output=True,text=True);"
        "blocked=attempt.returncode!=0;"
        "error='nonzero_exit' if blocked else None;"
        "after=outside.read_text(encoding='utf-8');"
        "print(json.dumps({'cwd':str(Path.cwd().resolve()),"
        "'insideWrite':inside.read_text(encoding='utf-8')=="
        f"{_SANDBOX_MARKER_CONTENT!r},"
        "'outsidePreserved':before==after,"
        "'outsideWriteBlocked':blocked,"
        "'outsideWriteError':error},"
        "separators=(',',':'),sort_keys=True))"
    )
    command = " ".join(
        [
            "/usr/bin/python3",
            "-c",
            shlex.quote(python_source),
            shlex.quote(str(inside_marker)),
            shlex.quote(str(outside_sentinel)),
        ]
    )

    stop = threading.Event()
    with MockResponsesServer() as responses:
        responses.enqueue_sse(
            _response_with_call(
                "workspace-sandbox-exec-response",
                _SANDBOX_EXEC_CALL_ID,
                "exec_command",
                {
                    "cmd": command,
                    "login": False,
                    "yield_time_ms": 10_000,
                },
            ).body
        )
        responses.enqueue_sse(
            streaming_response(
                "workspace-sandbox-terminal-response",
                "workspace-sandbox-terminal-message",
                ["workspace ", "sandbox ", "checked"],
            )
        )
        journal = threading.Thread(
            target=_publish_journal,
            args=(responses, journal_path, stop),
            name="sandbox-provider-journal",
        )
        journal.start()
        try:
            _atomic_json(ready_path, {"url": responses.url})
            for line in sys.stdin:
                if line.strip() == "close":
                    break
        finally:
            stop.set()
            journal.join(timeout=2)
            if journal.is_alive():
                raise RuntimeError("sandbox provider journal did not stop")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if args.command == "policy":
        return _policy(args)
    if args.command == "serve":
        return _serve(args)
    if args.command == "serve-action":
        return _serve_action(args)
    if args.command == "serve-sandbox":
        return _serve_sandbox(args)
    raise AssertionError(f"unexpected command {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
