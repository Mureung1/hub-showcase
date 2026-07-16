"""Test-only controller for the exact official SDK local Responses harness."""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
from pathlib import Path
from typing import Any

from app_server_harness import MockResponsesServer
from app_server_helpers import streaming_response


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
        requests.append(
            {
                "method": request.method,
                "path": request.path,
                "userTexts": request.message_input_texts("user"),
            }
        )
    return {"requests": requests}


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


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if args.command == "policy":
        return _policy(args)
    if args.command == "serve":
        return _serve(args)
    raise AssertionError(f"unexpected command {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
