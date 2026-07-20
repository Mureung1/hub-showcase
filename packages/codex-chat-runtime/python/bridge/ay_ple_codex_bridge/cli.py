"""Composition root for the package-private persistent bridge process."""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

from .protocol import (
    MAX_FRAME_BYTES,
    BoundedOutputBuffer,
    CloseCommand,
    ProtocolViolation,
    decode_command_line,
)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--site-packages")
    parser.add_argument("--codex-bin")
    parser.add_argument("--launch-arg", action="append", default=[])
    parser.add_argument("--live-thread-limit", type=int, default=32)
    parser.add_argument("--active-turn-limit", type=int, default=32)
    parser.add_argument("--pending-operation-limit", type=int, default=64)
    parser.add_argument("--control-operation-reserve", type=int, default=8)
    parser.add_argument("--stdout-max-frames", type=int, default=4096)
    parser.add_argument("--stdout-max-bytes", type=int, default=16 * 1024 * 1024)
    parser.add_argument("--stdout-start-delay-ms", type=int, default=0)
    return parser


async def _read_line(reader: asyncio.StreamReader) -> bytes:
    try:
        line = await reader.readline()
    except ValueError as exc:
        raise ProtocolViolation("frame_too_large") from exc
    if len(line) > MAX_FRAME_BYTES:
        raise ProtocolViolation("frame_too_large")
    return line


async def _write_stdout(output: BoundedOutputBuffer, *, start_delay_ms: int) -> None:
    if start_delay_ms > 0:
        await asyncio.sleep(start_delay_ms / 1000)
    while True:
        line = await output.take()
        if line is None:
            return
        await asyncio.to_thread(_write_stdout_blocking, line)


def _write_stdout_blocking(line: bytes) -> None:
    sys.stdout.buffer.write(line)
    sys.stdout.buffer.flush()


async def _command_loop(worker: object, reader: asyncio.StreamReader) -> None:
    from .runtime import BridgeWorker

    assert isinstance(worker, BridgeWorker)
    while worker.fatal_code is None:
        try:
            line = await _read_line(reader)
            if not line:
                if worker.has_pending_work:
                    worker.trigger_fatal("unexpected_eof")
                else:
                    await worker.close_after_idle_eof()
                return
            command = decode_command_line(line)
        except ProtocolViolation as exc:
            worker.trigger_fatal(exc.code)
            return
        admission = worker.accept_request(command)
        if admission == "fatal":
            return
        if admission == "rejected":
            continue
        if isinstance(command, CloseCommand):
            await worker.close_normally(command)
            return
        worker.dispatch(command)


async def _run(args: argparse.Namespace) -> int:
    from openai_codex import AsyncCodex, CodexConfig
    from openai_codex.generated.notification_registry import NOTIFICATION_MODELS

    from .runtime import BridgeWorker

    workspace = Path(args.workspace).resolve(strict=True)
    if not workspace.is_dir():
        raise ValueError("workspace must be a directory")
    output = BoundedOutputBuffer(
        max_frames=args.stdout_max_frames,
        max_bytes=args.stdout_max_bytes,
    )
    config = CodexConfig(
        codex_bin=args.codex_bin,
        launch_args_override=tuple(args.launch_arg) or None,
        cwd=str(workspace),
        env=os.environ.copy(),
        opt_out_notification_methods=tuple(
            sorted(
                set(NOTIFICATION_MODELS)
                - {
                    "error",
                    "item/agentMessage/delta",
                    "item/completed",
                    "item/plan/delta",
                    "item/started",
                    "serverRequest/resolved",
                    "turn/completed",
                }
            )
        ),
    )
    worker = BridgeWorker(
        codex=AsyncCodex(config),
        workspace=str(workspace),
        output=output,
        live_thread_limit=args.live_thread_limit,
        active_turn_limit=args.active_turn_limit,
        pending_operation_limit=args.pending_operation_limit,
        control_operation_reserve=args.control_operation_reserve,
    )
    writer_task = asyncio.create_task(
        _write_stdout(output, start_delay_ms=args.stdout_start_delay_ms)
    )
    command_task: asyncio.Task[None] | None = None
    fatal_task: asyncio.Task[None] | None = None
    exit_code = 0
    try:
        await worker.initialize()
        if worker.fatal_code is None and worker.signal_ready():
            loop = asyncio.get_running_loop()
            reader = asyncio.StreamReader(limit=MAX_FRAME_BYTES + 1)
            protocol = asyncio.StreamReaderProtocol(reader)
            await loop.connect_read_pipe(lambda: protocol, sys.stdin.buffer)
            command_task = asyncio.create_task(_command_loop(worker, reader))
            fatal_task = asyncio.create_task(worker.wait_fatal())
            done, _ = await asyncio.wait(
                {command_task, fatal_task, writer_task},
                return_when=asyncio.FIRST_COMPLETED,
            )
            if writer_task in done:
                writer_error = writer_task.exception()
                if writer_error is not None:
                    worker.trigger_fatal("stdout_write_failed", deliver=False)
                    exit_code = 1
                elif worker.fatal_code is None and not command_task.done():
                    worker.trigger_fatal("stdout_writer_stopped", deliver=False)
                    exit_code = 1
            if command_task in done:
                command_error = command_task.exception()
                if command_error is not None and worker.fatal_code is None:
                    worker.trigger_fatal("bridge_command_loop_failed")
                    exit_code = 1
            if worker.fatal_code is not None and not command_task.done():
                command_task.cancel()
            await asyncio.gather(command_task, return_exceptions=True)
    except Exception:
        worker.trigger_fatal(
            "bridge_runtime_failed",
            deliver=not writer_task.done(),
        )
        exit_code = 1
    finally:
        for task in (command_task, fatal_task):
            if task is not None and not task.done():
                task.cancel()
        await asyncio.gather(
            *(task for task in (command_task, fatal_task) if task is not None),
            return_exceptions=True,
        )
        await worker.shutdown_after_fatal()
        if not output.finished:
            output.finish_without_frame()
        writer_result = await asyncio.gather(writer_task, return_exceptions=True)
        if writer_result and isinstance(writer_result[0], BaseException):
            exit_code = 1
    return exit_code


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if args.site_packages:
        sys.path.insert(0, str(Path(args.site_packages).resolve(strict=True)))
    os.environ.setdefault("PYTHONDONTWRITEBYTECODE", "1")
    return asyncio.run(_run(args))
