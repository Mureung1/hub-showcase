from __future__ import annotations

import copy
import json
import os
import re
import signal
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

from .io import (
    Redactor,
    append_event,
    append_prepared_event,
    atomic_write_bytes,
    atomic_write_json,
    atomic_write_text,
    canonical_json,
    exclusive_lock,
    integrity_digest,
    integrity_digest_file,
    prepare_event,
    read_json,
    sha256_bytes,
    sha256_file,
    sign_mapping,
    utc_now,
    verify_event_chain,
    verify_signed_mapping,
)
from .specs import (
    SpecError,
    is_protected,
    load_config,
    load_plan,
    normalize_relative,
    path_is_allowed,
    public_plan,
    resolve_inside,
    validate_inputs,
    validate_mutable_path,
)


class HarnessError(RuntimeError):
    pass


class PreflightError(HarnessError):
    pass


@dataclass(frozen=True)
class CommandResult:
    argv: list[str]
    returncode: int
    stdout: str
    stderr: str
    timed_out: bool
    duration_ms: int

    def summary(self) -> dict[str, Any]:
        return {
            "argv": self.argv,
            "returncode": self.returncode,
            "timed_out": self.timed_out,
            "duration_ms": self.duration_ms,
        }


class _WindowsJob:
    def __init__(self, process: subprocess.Popen[bytes]):
        self.handle: int | None = None
        if os.name != "nt":
            return
        import ctypes
        from ctypes import wintypes

        class BasicLimitInformation(ctypes.Structure):
            _fields_ = [
                ("PerProcessUserTimeLimit", ctypes.c_longlong),
                ("PerJobUserTimeLimit", ctypes.c_longlong),
                ("LimitFlags", wintypes.DWORD),
                ("MinimumWorkingSetSize", ctypes.c_size_t),
                ("MaximumWorkingSetSize", ctypes.c_size_t),
                ("ActiveProcessLimit", wintypes.DWORD),
                ("Affinity", ctypes.c_size_t),
                ("PriorityClass", wintypes.DWORD),
                ("SchedulingClass", wintypes.DWORD),
            ]

        class IoCounters(ctypes.Structure):
            _fields_ = [
                ("ReadOperationCount", ctypes.c_ulonglong),
                ("WriteOperationCount", ctypes.c_ulonglong),
                ("OtherOperationCount", ctypes.c_ulonglong),
                ("ReadTransferCount", ctypes.c_ulonglong),
                ("WriteTransferCount", ctypes.c_ulonglong),
                ("OtherTransferCount", ctypes.c_ulonglong),
            ]

        class ExtendedLimitInformation(ctypes.Structure):
            _fields_ = [
                ("BasicLimitInformation", BasicLimitInformation),
                ("IoInfo", IoCounters),
                ("ProcessMemoryLimit", ctypes.c_size_t),
                ("JobMemoryLimit", ctypes.c_size_t),
                ("PeakProcessMemoryUsed", ctypes.c_size_t),
                ("PeakJobMemoryUsed", ctypes.c_size_t),
            ]

        kernel32 = ctypes.windll.kernel32
        kernel32.CreateJobObjectW.restype = ctypes.c_void_p
        kernel32.SetInformationJobObject.argtypes = [
            ctypes.c_void_p,
            ctypes.c_int,
            ctypes.c_void_p,
            wintypes.DWORD,
        ]
        kernel32.AssignProcessToJobObject.argtypes = [
            ctypes.c_void_p,
            ctypes.c_void_p,
        ]
        handle = kernel32.CreateJobObjectW(None, None)
        if not handle:
            return
        information = ExtendedLimitInformation()
        information.BasicLimitInformation.LimitFlags = 0x00002000
        configured = kernel32.SetInformationJobObject(
            handle,
            9,
            ctypes.byref(information),
            ctypes.sizeof(information),
        )
        assigned = (
            configured
            and kernel32.AssignProcessToJobObject(
                handle, ctypes.c_void_p(int(process._handle))
            )
        )
        if not assigned:
            kernel32.CloseHandle(handle)
            return
        self.handle = int(handle)

    def close(self) -> None:
        if self.handle is None:
            return
        import ctypes

        ctypes.windll.kernel32.CloseHandle(self.handle)
        self.handle = None


def _kill_process_tree(
    process: subprocess.Popen[bytes], job: _WindowsJob | None
) -> None:
    if job is not None and job.handle is not None:
        job.close()
    if os.name == "nt":
        if process.poll() is None:
            try:
                subprocess.run(
                    ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                    shell=False,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=False,
                    timeout=5,
                )
            except (OSError, subprocess.TimeoutExpired):
                pass
            if process.poll() is None:
                process.kill()
    else:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass


def run_process(
    argv: list[str],
    cwd: Path,
    environment: dict[str, str],
    timeout_seconds: int,
    max_output_bytes: int,
    stdin_text: str | None = None,
) -> CommandResult:
    if not argv or not all(isinstance(item, str) and item for item in argv):
        raise HarnessError("subprocess argv must be a non-empty string array")
    executable = argv[0]
    resolved = (
        executable
        if Path(executable).is_absolute()
        else shutil.which(executable, path=environment.get("PATH"))
    )
    if not resolved:
        return CommandResult(
            argv=list(argv),
            returncode=127,
            stdout="",
            stderr=f"executable not found: {executable}",
            timed_out=False,
            duration_ms=0,
        )
    argv = [str(Path(resolved).resolve()), *argv[1:]]
    started = time.monotonic()
    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    try:
        process = subprocess.Popen(
            argv,
            cwd=str(cwd),
            env=environment,
            shell=False,
            stdin=subprocess.PIPE if stdin_text is not None else subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=creationflags,
            start_new_session=os.name != "nt",
        )
    except OSError as exc:
        return CommandResult(
            argv=list(argv),
            returncode=127,
            stdout="",
            stderr=f"{type(exc).__name__}: {exc}",
            timed_out=False,
            duration_ms=int((time.monotonic() - started) * 1000),
        )
    job = _WindowsJob(process) if os.name == "nt" else None
    stdout_buffer = bytearray()
    stderr_buffer = bytearray()
    stdout_truncated = [False]
    stderr_truncated = [False]

    def drain(
        pipe: Any, buffer: bytearray, truncated: list[bool]
    ) -> None:
        try:
            while True:
                chunk = pipe.read(65536)
                if not chunk:
                    return
                remaining = max_output_bytes - len(buffer)
                if remaining > 0:
                    buffer.extend(chunk[:remaining])
                if len(chunk) > remaining:
                    truncated[0] = True
        except (OSError, ValueError):
            return

    readers = [
        threading.Thread(
            target=drain,
            args=(process.stdout, stdout_buffer, stdout_truncated),
            daemon=True,
        ),
        threading.Thread(
            target=drain,
            args=(process.stderr, stderr_buffer, stderr_truncated),
            daemon=True,
        ),
    ]
    for reader in readers:
        reader.start()
    stdin_writer: threading.Thread | None = None
    if stdin_text is not None and process.stdin is not None:
        def feed_stdin() -> None:
            try:
                process.stdin.write(stdin_text.encode("utf-8"))
                process.stdin.flush()
            except (BrokenPipeError, OSError, ValueError):
                pass
            finally:
                try:
                    process.stdin.close()
                except (OSError, ValueError):
                    pass

        stdin_writer = threading.Thread(target=feed_stdin, daemon=True)
        stdin_writer.start()
    timed_out = False
    try:
        process.wait(timeout=timeout_seconds)
    except subprocess.TimeoutExpired:
        timed_out = True
        _kill_process_tree(process, job)
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            if process.poll() is None:
                process.kill()
            try:
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                pass
    finally:
        if job is not None:
            job.close()
    if not timed_out and os.name != "nt":
        # The worker contract forbids detached helpers. A parent that exits while
        # descendants keep pipes or side effects alive must not leak that process
        # tree beyond this bounded invocation.
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    if stdin_writer is not None:
        stdin_writer.join(timeout=1)
        if process.stdin is not None:
            try:
                process.stdin.close()
            except (OSError, ValueError):
                pass
    for reader in readers:
        reader.join(timeout=2)
    for pipe in (process.stdout, process.stderr):
        if pipe is not None:
            try:
                pipe.close()
            except OSError:
                pass
    for reader in readers:
        reader.join(timeout=0.5)
    stdout_bytes = bytes(stdout_buffer)
    stderr_bytes = bytes(stderr_buffer)
    marker = b"\n<output truncated by harness>\n"
    if stdout_truncated[0]:
        stdout_bytes += marker
    if stderr_truncated[0]:
        stderr_bytes += marker
    return CommandResult(
        argv=list(argv),
        returncode=124 if timed_out else int(process.returncode or 0),
        stdout=stdout_bytes.decode("utf-8", errors="replace"),
        stderr=stderr_bytes.decode("utf-8", errors="replace"),
        timed_out=timed_out,
        duration_ms=int((time.monotonic() - started) * 1000),
    )


class HarnessController:
    FINAL_PHASE_STATES = {"passed", "deployed", "observed"}
    FINAL_RUN_STATES = {"passed", "deployed", "observed", "failed", "cancelled"}
    STAGE_RANK = {"passed": 0, "deployed": 1, "observed": 2}

    def __init__(self, repo_root: Path):
        self.repo_root = repo_root.resolve(strict=True)
        self.config = load_config(self.repo_root)
        self.plan = load_plan(self.repo_root, self.config)
        self.redactor = Redactor.from_config(self.config)
        integrity_name = self.config["integrity"]["environment_key"]
        integrity_value = os.environ.get(integrity_name)
        self.integrity_key = (
            integrity_value.encode("utf-8") if integrity_value else None
        )
        self.runs_dir = resolve_inside(self.repo_root, self.config["runs_dir"])
        self.lock_path = self.runs_dir / ".lock"
        secret_environment_names = set(
            self.config.get("redaction", {}).get("environment_secret_names", [])
        )
        self.environment = {
            name: os.environ[name]
            for name in self.config["worker"].get("environment_allowlist", [])
            if name in os.environ and name not in secret_environment_names
        }
        self.environment.update(
            {
                "CI": "1",
                "NO_COLOR": "1",
                "PYTHONDONTWRITEBYTECODE": "1",
                "PYTHONUTF8": "1",
            }
        )
        self.active_inputs: dict[str, Any] = {}

    def validation_report(self) -> dict[str, Any]:
        warnings: list[str] = []
        if not self.config["worker"].get("argv"):
            warnings.append(
                "worker.argv is not configured; plan inspection works but execution will block"
            )
        if self.integrity_key is None:
            warnings.append(
                f"{self.config['integrity']['environment_key']} is not set; "
                "mutation commands will fail closed"
            )
        for name in ("staging", "production"):
            if not self.config.get("adapters", {}).get(name, {}).get("argv"):
                warnings.append(
                    f"{name} adapter is not configured; its release steps will block"
                )
        boundary = self.config.get("execution_boundary", {})
        if not boundary.get("provider_sandbox_attested") or not boundary.get("profile"):
            warnings.append(
                "provider/OS sandbox is not attested; network and external steps will block"
            )
        disabled = [
            name
            for name, enabled in self.config.get("capabilities", {}).items()
            if not enabled
        ]
        if disabled:
            warnings.append("capabilities disabled by default: " + ", ".join(disabled))
        return {
            "valid": True,
            "project_id": self.plan["project_id"],
            "phase_count": len(self.plan["phases"]),
            "step_count": sum(len(phase["steps"]) for phase in self.plan["phases"]),
            "warnings": warnings,
        }

    def plan_report(self, target_stage: str, inputs: dict[str, Any] | None = None) -> dict[str, Any]:
        self._validate_target(target_stage)
        selected = self._selected_phases(target_stage)
        supplied = inputs if inputs is not None else self._load_inputs()
        missing = validate_inputs(
            {"phases": selected}, supplied, target_stage
        )
        input_issues = self._input_issues(selected, supplied)
        return {
            "project_id": self.plan["project_id"],
            "target_stage": target_stage,
            "phases": [
                {
                    "phase_id": phase["phase_id"],
                    "name": phase["name"],
                    "completion_stage": phase["completion_stage"],
                    "steps": [step["step_id"] for step in phase["steps"]],
                    "approval": phase["approval"],
                }
                for phase in selected
            ],
            "missing_inputs": missing,
            "input_issues": input_issues,
            "worker_configured": bool(self.config["worker"].get("argv")),
            "adapters_configured": {
                name: bool(
                    self.config.get("adapters", {}).get(name, {}).get("argv")
                )
                for name in ("staging", "production")
            },
            "execution_boundary": {
                "provider_sandbox_attested": bool(
                    self.config.get("execution_boundary", {}).get(
                        "provider_sandbox_attested"
                    )
                ),
                "profile": self.config.get("execution_boundary", {}).get(
                    "profile", ""
                ),
            },
            "capabilities": self.config.get("capabilities", {}),
        }

    def start(self, target_stage: str = "observed") -> dict[str, Any]:
        self._validate_target(target_stage)
        self._require_integrity_key()
        with exclusive_lock(self.lock_path, "start"):
            self._require_clean_worktree()
            inputs = self._load_inputs()
            missing = validate_inputs(self.plan, inputs, target_stage)
            if missing:
                raise PreflightError(
                    "required inputs are missing from HARNESS/inputs.local.json: "
                    + ", ".join(missing)
                )
            issues = self._input_issues(self._selected_phases(target_stage), inputs)
            if issues:
                raise PreflightError("invalid input configuration: " + "; ".join(issues))
            self.active_inputs = inputs
            run_id = self._new_run_id()
            run_dir = self.runs_dir / run_id
            run_dir.mkdir(parents=True, exist_ok=False)
            selected = self._selected_phases(target_stage)
            snapshot = self._snapshot_plan(selected)
            snapshot_path = run_dir / "plan.json"
            atomic_write_json(snapshot_path, snapshot)
            state = self._initial_state(
                run_id, target_stage, selected, snapshot_path, inputs
            )
            signed_initial_state = sign_mapping(
                self.redactor.value(state), self.integrity_key
            )
            state.clear()
            state.update(signed_initial_state)
            atomic_write_json(self._state_path(run_dir), state)
            self._emit(
                run_dir,
                state,
                "run.created",
                actor="controller",
                entity={"type": "run", "id": run_id},
                from_status=None,
                to_status="pending",
                payload={"target_stage": target_stage},
            )
            return self._execute(run_dir, state, snapshot)

    def resume(self, run_id: str) -> dict[str, Any]:
        self._require_integrity_key()
        with exclusive_lock(self.lock_path, f"resume:{run_id}"):
            run_dir, state, snapshot = self._load_run(
                run_id, recover_transaction=True
            )
            if state["status"] in self.FINAL_RUN_STATES:
                return state
            self._recover_interrupted_attempt(run_dir, state, snapshot)
            if state["status"] in self.FINAL_RUN_STATES:
                return state
            self._require_run_git_baseline(state)
            if (
                state.get("status") == "blocked"
                and state.get("blocked", {}).get("safe_to_resume") is False
            ):
                raise PreflightError(
                    "the blocked attempt is explicitly unsafe to resume; preserve its "
                    "failure evidence, restore any affected files manually, and start "
                    "a new run"
                )
            self._require_clean_worktree()
            inputs = self._load_inputs()
            current_inputs_sha256 = (
                sha256_bytes(canonical_json(inputs)) if inputs else None
            )
            if current_inputs_sha256 != state["result"].get("inputs_sha256"):
                raise PreflightError(
                    "inputs.local.json changed after run creation; start a new run "
                    "so approvals and audit evidence remain bound to one input snapshot"
                )
            missing = validate_inputs(snapshot, inputs, state["target_stage"])
            if missing:
                raise PreflightError(
                    "required inputs are missing from HARNESS/inputs.local.json: "
                    + ", ".join(missing)
                )
            issues = self._input_issues(snapshot["phases"], inputs)
            if issues:
                raise PreflightError("invalid input configuration: " + "; ".join(issues))
            self.active_inputs = inputs
            previous = state["status"]
            state["status"] = "pending"
            state["blocked"] = None
            self._emit(
                run_dir,
                state,
                "run.resumed",
                actor="controller",
                entity={"type": "run", "id": run_id},
                from_status=previous,
                to_status="pending",
                payload={},
            )
            return self._execute(run_dir, state, snapshot)

    def status(self, run_id: str) -> dict[str, Any]:
        self._require_integrity_key()
        _, state, _ = self._load_run(run_id)
        return state

    def verify_journal(self, run_id: str) -> dict[str, Any]:
        run_dir = self.runs_dir / run_id
        if self.integrity_key is None:
            return {
                "run_id": run_id,
                "valid": False,
                "error": "journal integrity key is unavailable",
            }
        state_path = run_dir / "state.json"
        if not state_path.is_file():
            return {"run_id": run_id, "valid": False, "error": "state is missing"}
        state = read_json(state_path)
        if not verify_signed_mapping(state, self.integrity_key):
            return {
                "run_id": run_id,
                "valid": False,
                "error": "state HMAC mismatch",
            }
        ok, error = verify_event_chain(
            run_dir / "events.jsonl",
            self.integrity_key,
            expected_run_id=run_id,
            expected_seq=state["last_event_seq"],
            expected_tail_hash=state["last_event_hash"],
        )
        return {"run_id": run_id, "valid": ok, "error": error}

    def approval_challenge(self, run_id: str, approval_id: str) -> dict[str, Any]:
        run_dir, state, snapshot = self._load_run(run_id)
        phase = self._phase_for_approval(snapshot, approval_id)
        inputs = self._load_inputs()
        artifact_scope = self._release_artifact_scope(
            state, phase, approval_id, inputs
        )
        challenge = {
            "run_id": run_id,
            "approval_id": approval_id,
            "phase_id": phase["phase_id"],
            **artifact_scope,
            "workspace_commit": self._git_head(),
            "inputs_sha256": (
                sha256_bytes(canonical_json(inputs)) if inputs else None
            ),
        }
        challenge["scope_digest"] = sha256_bytes(canonical_json(challenge))
        return challenge

    def approve(
        self,
        run_id: str,
        approval_id: str,
        approved_by: str,
        ttl_minutes: int = 120,
    ) -> dict[str, Any]:
        self._require_integrity_key()
        if not approved_by.strip():
            raise HarnessError("approved_by must be non-empty")
        if ttl_minutes < 1 or ttl_minutes > 1440:
            raise HarnessError("ttl_minutes must be between 1 and 1440")
        with exclusive_lock(self.lock_path, f"approve:{run_id}:{approval_id}"):
            run_dir, state, snapshot = self._load_run(
                run_id, recover_transaction=True
            )
            challenge = self.approval_challenge(run_id, approval_id)
            approval = {
                **challenge,
                "approved_by": approved_by,
                "approved_at": utc_now(),
                "expires_at": (
                    datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)
                ).isoformat().replace("+00:00", "Z"),
            }
            approval = sign_mapping(
                self.redactor.value(approval), self.integrity_key
            )
            approvals_path = run_dir / "approvals.json"
            approvals = read_json(approvals_path) if approvals_path.exists() else []
            approvals.append(approval)
            atomic_write_json(approvals_path, approvals)
            self._emit(
                run_dir,
                state,
                "approval.granted",
                actor="user",
                entity={"type": "approval", "id": approval_id},
                from_status=None,
                to_status="granted",
                payload=approval,
            )
            return approval

    def _validate_target(self, target_stage: str) -> None:
        if target_stage not in self.STAGE_RANK:
            raise HarnessError(f"unsupported target stage: {target_stage}")

    def _selected_phases(self, target_stage: str) -> list[dict[str, Any]]:
        target_rank = self.STAGE_RANK[target_stage]
        return [
            phase
            for phase in self.plan["phases"]
            if phase.get("required", True)
            and self.STAGE_RANK[phase["completion_stage"]] <= target_rank
        ]

    def _load_inputs(self) -> dict[str, Any]:
        path = self.repo_root / "HARNESS" / "inputs.local.json"
        if not path.exists():
            return {}
        value = read_json(path)
        if not isinstance(value, dict):
            raise PreflightError("HARNESS/inputs.local.json must be a JSON object")
        return value

    def _input_issues(
        self, phases: Iterable[dict[str, Any]], inputs: dict[str, Any]
    ) -> list[str]:
        issues: list[str] = []
        allowed_environment = set(
            self.config["worker"].get("environment_allowlist", [])
        )
        redacted_environment = set(
            self.config.get("redaction", {}).get("environment_secret_names", [])
        )
        for phase in phases:
            for requirement in phase.get("required_inputs", []):
                if not requirement.get("secret"):
                    continue
                key = requirement["key"]
                if key not in inputs:
                    # Missing values are reported once by validate_inputs; only
                    # validate the reference shape after a value was supplied.
                    continue
                value = inputs.get(key)
                if not isinstance(value, dict) or set(value) != {"environment"}:
                    issues.append(
                        f"{phase['phase_id']}:{key} must be "
                        '{"environment":"ENV_NAME"}; literal secrets are forbidden'
                    )
                    continue
                name = value.get("environment")
                if not isinstance(name, str) or not name:
                    issues.append(f"{phase['phase_id']}:{key} has an invalid environment name")
                    continue
                if name not in allowed_environment:
                    issues.append(
                        f"{phase['phase_id']}:{key} environment {name} is not worker-allowlisted"
                    )
                if name not in redacted_environment:
                    issues.append(
                        f"{phase['phase_id']}:{key} environment {name} is not in the redaction list"
                    )
                if not os.environ.get(name):
                    issues.append(
                        f"{phase['phase_id']}:{key} environment {name} is not set"
                    )
        return issues

    def _step_environment(
        self,
        phase: dict[str, Any],
        step: dict[str, Any],
        *,
        include_worker_credentials: bool = False,
        include_step_secrets: bool = True,
    ) -> dict[str, str]:
        del phase
        environment = dict(self.environment)
        names: set[str] = set()
        if include_worker_credentials:
            names.update(
                self.config["worker"].get("credential_environment", [])
            )
        if include_step_secrets:
            for key in step.get("secret_inputs", []):
                value = self.active_inputs.get(key)
                if isinstance(value, dict) and isinstance(value.get("environment"), str):
                    names.add(value["environment"])
        names.discard(self.config["integrity"]["environment_key"])
        for name in names:
            if name in os.environ:
                environment[name] = os.environ[name]
        return environment

    def _snapshot_plan(self, phases: list[dict[str, Any]]) -> dict[str, Any]:
        snapshot = {
            "schema_version": 1,
            "project_id": self.plan["project_id"],
            "source_index": {
                "path": self.plan["index_path"],
                "sha256": self.plan["index_sha256"],
            },
            "phases": copy.deepcopy(phases),
        }
        for phase in snapshot["phases"]:
            phase.pop("_manifest", None)
            phase.pop("_sha256", None)
            for step in phase["steps"]:
                instruction_path = resolve_inside(self.repo_root, step["instruction_file"])
                instruction = instruction_path.read_text(encoding="utf-8")
                step["_instruction_text"] = instruction
                step["_instruction_sha256"] = sha256_bytes(instruction.encode("utf-8"))
        return snapshot

    def _initial_state(
        self,
        run_id: str,
        target_stage: str,
        phases: list[dict[str, Any]],
        snapshot_path: Path,
        inputs: dict[str, Any],
    ) -> dict[str, Any]:
        created = utc_now()
        branch = self._git(["symbolic-ref", "--quiet", "--short", "HEAD"], check=False)
        branch_name = branch.stdout.strip() if branch.returncode == 0 else "detached"
        state = {
            "schema_version": 1,
            "run_id": run_id,
            "project_id": self.config["project_id"],
            "target_stage": target_stage,
            "status": "pending",
            "created_at": created,
            "updated_at": created,
            "ended_at": None,
            "source": {
                "base_commit": self._git_head(),
                "branch": branch_name,
                "dirty_paths": [],
            },
            "plan_snapshot": {
                "path": str(snapshot_path.relative_to(self.repo_root)).replace("\\", "/"),
                "sha256": sha256_file(snapshot_path),
            },
            "current": {"phase_id": None, "step_id": None, "attempt_id": None},
            "phase_states": [
                {
                    "phase_id": phase["phase_id"],
                    "status": "pending",
                    "completion_stage": phase["completion_stage"],
                    "steps": [
                        {
                            "step_id": step["step_id"],
                            "status": "pending",
                            "attempt_count": 0,
                            "worker_attempt_count": 0,
                            "failure_ids": [],
                            "last_attempt_id": None,
                        }
                        for step in phase["steps"]
                    ],
                }
                for phase in phases
            ],
            "open_failure_ids": [],
            "blocked": None,
            "result": {
                "commits": [],
                "input_keys": sorted(inputs),
                "inputs_sha256": sha256_bytes(canonical_json(inputs)) if inputs else None,
                "git_control_hmac": self._git_control_hmac(),
            },
            "last_event_seq": 0,
            "last_event_hash": None,
            "integrity_key_id": self.config["integrity"]["key_id"],
        }
        return state

    def _load_run(
        self, run_id: str, recover_transaction: bool = False
    ) -> tuple[Path, dict[str, Any], dict[str, Any]]:
        if not run_id or "/" in run_id or "\\" in run_id or ":" in run_id or ".." in run_id:
            raise HarnessError("invalid run id")
        run_dir = self.runs_dir / run_id
        state_path = run_dir / "state.json"
        if not state_path.is_file():
            raise HarnessError(f"run does not exist: {run_id}")
        state = read_json(state_path)
        self._require_integrity_key()
        if not verify_signed_mapping(state, self.integrity_key):
            raise HarnessError("run state HMAC verification failed")
        if state.get("integrity_key_id") != self.config["integrity"]["key_id"]:
            raise HarnessError(
                "run state integrity key id does not match the active controller key"
            )
        transaction_path = run_dir / "transaction.json"
        if transaction_path.exists():
            if not recover_transaction:
                raise HarnessError(
                    "a signed state transaction is pending; use resume to recover it"
                )
            state = self._recover_state_transaction(run_dir, state)
        ok, error = verify_event_chain(
            run_dir / "events.jsonl",
            self.integrity_key,
            expected_run_id=run_id,
            expected_seq=state["last_event_seq"],
            expected_tail_hash=state["last_event_hash"],
        )
        if not ok:
            raise HarnessError(f"event journal integrity check failed: {error}")
        snapshot_path = resolve_inside(self.repo_root, state["plan_snapshot"]["path"])
        if sha256_file(snapshot_path) != state["plan_snapshot"]["sha256"]:
            raise HarnessError("run plan snapshot hash mismatch")
        snapshot = read_json(snapshot_path)
        self._verify_immutable_records(run_dir, state)
        return run_dir, state, snapshot

    def _require_integrity_key(self) -> None:
        if self.integrity_key is None:
            name = self.config["integrity"]["environment_key"]
            raise PreflightError(
                f"{name} must be set for signed run state; it is never passed to workers"
            )
        if len(self.integrity_key) < 32:
            raise PreflightError(
                f"{self.config['integrity']['environment_key']} must contain at least "
                "32 bytes of random secret material"
            )

    def _verify_immutable_records(
        self, run_dir: Path, state: dict[str, Any]
    ) -> None:
        assert self.integrity_key is not None
        attempt_paths = list(run_dir.glob("attempts/**/attempt.json"))
        attempts: dict[str, dict[str, Any]] = {}
        for path in attempt_paths:
            record = read_json(path)
            if not verify_signed_mapping(record, self.integrity_key):
                raise HarnessError(
                    f"immutable attempt HMAC verification failed: {path.relative_to(run_dir)}"
                )
            if record.get("run_id") != state["run_id"]:
                raise HarnessError("attempt run id mismatch")
            attempt_id = record.get("attempt_id")
            if not isinstance(attempt_id, str) or attempt_id in attempts:
                raise HarnessError(f"duplicate or missing attempt id: {attempt_id}")
            attempts[attempt_id] = record
            attempt_dir = path.parent
            for evidence in record.get("evidence", []):
                raw = evidence.get("path")
                expected = evidence.get("sha256")
                if not isinstance(raw, str) or not isinstance(expected, str):
                    raise HarnessError(f"invalid evidence reference in {attempt_id}")
                evidence_path = (attempt_dir / raw).resolve(strict=False)
                try:
                    evidence_path.relative_to(attempt_dir.resolve(strict=True))
                except ValueError as exc:
                    raise HarnessError(
                        f"attempt evidence escapes its directory: {raw}"
                    ) from exc
                if not evidence_path.is_file() or sha256_file(evidence_path) != expected:
                    raise HarnessError(
                        f"attempt evidence hash mismatch: {attempt_id}/{raw}"
                    )
        failure_paths = list((run_dir / "failures").glob("*.json"))
        failures: dict[str, dict[str, Any]] = {}
        for path in failure_paths:
            record = read_json(path)
            if not verify_signed_mapping(record, self.integrity_key):
                raise HarnessError(
                    f"immutable failure HMAC verification failed: {path.name}"
                )
            failure_id = record.get("failure_id")
            if not isinstance(failure_id, str) or failure_id in failures:
                raise HarnessError(f"duplicate or missing failure id: {failure_id}")
            failures[failure_id] = record
        referenced_failures: set[str] = set()
        for phase_state in state["phase_states"]:
            for step_state in phase_state["steps"]:
                count = int(step_state["attempt_count"])
                for number in range(1, count + 1):
                    attempt_id = self._attempt_id(
                        phase_state["phase_id"], step_state["step_id"], number
                    )
                    if attempt_id not in attempts:
                        is_inflight = (
                            number == count
                            and step_state["status"] == "running"
                            and (
                                run_dir
                                / "attempts"
                                / phase_state["phase_id"]
                                / step_state["step_id"]
                                / f"attempt-{number:03d}"
                                / "started.json"
                            ).is_file()
                        )
                        if not is_inflight:
                            raise HarnessError(
                                f"state references a missing immutable attempt: {attempt_id}"
                            )
                referenced_failures.update(step_state.get("failure_ids", []))
        if not referenced_failures.issubset(failures):
            missing = sorted(referenced_failures.difference(failures))
            raise HarnessError(f"state references missing failure records: {missing}")
        if not set(state["open_failure_ids"]).issubset(referenced_failures):
            raise HarnessError("open failure ids are not owned by any step")
        approvals_path = run_dir / "approvals.json"
        if approvals_path.exists():
            approvals = read_json(approvals_path)
            if not isinstance(approvals, list) or not all(
                isinstance(item, dict)
                and verify_signed_mapping(item, self.integrity_key)
                for item in approvals
            ):
                raise HarnessError("approval record HMAC verification failed")

    def _new_run_id(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]

    def _state_path(self, run_dir: Path) -> Path:
        return run_dir / "state.json"

    def _emit(
        self,
        run_dir: Path,
        state: dict[str, Any],
        event_type: str,
        *,
        actor: str,
        entity: dict[str, Any],
        from_status: str | None,
        to_status: str | None,
        payload: dict[str, Any],
        attempt_id: str | None = None,
    ) -> None:
        previous_state_hmac = state.get("integrity_hmac")
        event = prepare_event(
            run_dir / "events.jsonl",
            {
                "schema_version": 1,
                "run_id": state["run_id"],
                "integrity_key_id": self.config["integrity"]["key_id"],
                "event_type": event_type,
                "actor": actor,
                "entity": entity,
                "from_status": from_status,
                "to_status": to_status,
                "attempt_id": attempt_id,
                "correlation_id": state["run_id"],
                "payload": payload,
            },
            self.redactor,
            self.integrity_key,
        )
        state["last_event_seq"] = event["seq"]
        state["last_event_hash"] = event["event_hash"]
        state["updated_at"] = utc_now()
        self._redact_state_in_place(state)
        signed_state = sign_mapping(
            state, self.integrity_key
        )
        transaction = sign_mapping(
            {
                "schema_version": 1,
                "run_id": state["run_id"],
                "previous_state_hmac": previous_state_hmac,
                "event": event,
                "next_state": signed_state,
            },
            self.integrity_key,
        )
        transaction_path = run_dir / "transaction.json"
        atomic_write_json(transaction_path, transaction)
        append_prepared_event(
            run_dir / "events.jsonl", event, self.integrity_key
        )
        # Preserve nested object identities held by the phase/step execution loop.
        # Replacing the whole mapping here would leave those references pointing at
        # stale copies and could produce a terminal run with pending steps.
        state["integrity_hmac"] = signed_state["integrity_hmac"]
        atomic_write_json(self._state_path(run_dir), state)
        transaction_path.unlink()

    def _redact_state_in_place(self, value: Any) -> Any:
        """Redact strings without replacing state containers used by the executor."""
        if isinstance(value, str):
            return self.redactor.text(value)
        if isinstance(value, list):
            for index, item in enumerate(value):
                value[index] = self._redact_state_in_place(item)
            return value
        if isinstance(value, dict):
            for key, item in list(value.items()):
                value[key] = self._redact_state_in_place(item)
            return value
        return value

    def _recover_state_transaction(
        self, run_dir: Path, current_state: dict[str, Any]
    ) -> dict[str, Any]:
        transaction_path = run_dir / "transaction.json"
        transaction = read_json(transaction_path)
        if not verify_signed_mapping(transaction, self.integrity_key):
            raise HarnessError("pending state transaction HMAC verification failed")
        if transaction.get("run_id") != current_state.get("run_id"):
            raise HarnessError("pending state transaction run id mismatch")
        next_state = transaction.get("next_state")
        event = transaction.get("event")
        if (
            not isinstance(next_state, dict)
            or not verify_signed_mapping(next_state, self.integrity_key)
            or not isinstance(event, dict)
        ):
            raise HarnessError("pending state transaction payload is invalid")
        current_hmac = current_state.get("integrity_hmac")
        next_hmac = next_state.get("integrity_hmac")
        if current_hmac not in {
            transaction.get("previous_state_hmac"),
            next_hmac,
        }:
            raise HarnessError("pending state transaction predecessor mismatch")
        events_path = run_dir / "events.jsonl"
        next_ok, _ = verify_event_chain(
            events_path,
            self.integrity_key,
            expected_run_id=current_state["run_id"],
            expected_seq=next_state["last_event_seq"],
            expected_tail_hash=next_state["last_event_hash"],
        )
        if not next_ok:
            current_ok, _ = verify_event_chain(
                events_path,
                self.integrity_key,
                expected_run_id=current_state["run_id"],
                expected_seq=current_state["last_event_seq"],
                expected_tail_hash=current_state["last_event_hash"],
            )
            if not current_ok and events_path.exists():
                raw = events_path.read_bytes()
                if raw and not raw.endswith(b"\n"):
                    boundary = raw.rfind(b"\n")
                    complete = raw[: boundary + 1] if boundary >= 0 else b""
                    recovery_path = run_dir / "events.recovery"
                    atomic_write_bytes(recovery_path, complete)
                    current_ok, _ = verify_event_chain(
                        recovery_path,
                        self.integrity_key,
                        expected_run_id=current_state["run_id"],
                        expected_seq=current_state["last_event_seq"],
                        expected_tail_hash=current_state["last_event_hash"],
                    )
                    if current_ok:
                        atomic_write_bytes(events_path, complete)
                    recovery_path.unlink(missing_ok=True)
            if not current_ok:
                raise HarnessError(
                    "journal does not match either side of the pending transaction"
                )
            append_prepared_event(events_path, event, self.integrity_key)
        atomic_write_json(self._state_path(run_dir), next_state)
        transaction_path.unlink()
        return next_state

    def _execute(
        self, run_dir: Path, state: dict[str, Any], snapshot: dict[str, Any]
    ) -> dict[str, Any]:
        state["status"] = "running"
        self._emit(
            run_dir,
            state,
            "run.started",
            actor="controller",
            entity={"type": "run", "id": state["run_id"]},
            from_status="pending",
            to_status="running",
            payload={},
        )
        phase_by_id = {phase["phase_id"]: phase for phase in snapshot["phases"]}
        for phase_state in state["phase_states"]:
            if phase_state["status"] in self.FINAL_PHASE_STATES:
                continue
            phase = phase_by_id[phase_state["phase_id"]]
            phase_state["status"] = "running"
            state["current"]["phase_id"] = phase["phase_id"]
            self._emit(
                run_dir,
                state,
                "phase.started",
                actor="controller",
                entity={"type": "phase", "id": phase["phase_id"]},
                from_status="pending",
                to_status="running",
                payload={},
            )
            if phase["approval"]["mode"] == "before_phase":
                valid, challenge = self._approval_valid(run_dir, state, phase)
                if not valid:
                    step = phase["steps"][0]
                    step_state = phase_state["steps"][0]
                    self._record_precondition_failure(
                        run_dir,
                        state,
                        phase,
                        phase_state,
                        step,
                        step_state,
                        category="approval",
                        symptom="A scoped approval is required before this phase can run.",
                        detail=challenge,
                    )
                    return state
            for index, step in enumerate(phase["steps"]):
                step_state = phase_state["steps"][index]
                if step_state["status"] == "passed":
                    continue
                state["current"]["step_id"] = step["step_id"]
                if step_state["status"] in {"blocked", "failed", "retry_wait", "interrupted"}:
                    step_state["status"] = "pending"
                if (
                    step["permissions"].get("production")
                    and step["permissions"].get("external_side_effects")
                    and phase["approval"]["mode"] == "before_phase"
                ):
                    valid, challenge = self._approval_valid(run_dir, state, phase)
                    if not valid:
                        self._record_precondition_failure(
                            run_dir,
                            state,
                            phase,
                            phase_state,
                            step,
                            step_state,
                            category="approval",
                            symptom=(
                                "The production release scope changed after approval; "
                                "a fresh scoped approval is required."
                            ),
                            detail=challenge,
                        )
                        return state
                precondition = self._step_precondition(phase, step)
                if precondition is not None:
                    category, symptom, detail = precondition
                    self._record_precondition_failure(
                        run_dir,
                        state,
                        phase,
                        phase_state,
                        step,
                        step_state,
                        category=category,
                        symptom=symptom,
                        detail=detail,
                    )
                    return state
                max_attempts = int(step["retry_policy"]["max_attempts"])
                step_state.setdefault("worker_attempt_count", 0)
                while step_state["worker_attempt_count"] < max_attempts:
                    try:
                        disposition = self._run_attempt(
                            run_dir, state, phase, phase_state, step, step_state
                        )
                    except (KeyboardInterrupt, SystemExit):
                        raise
                    except Exception as exc:
                        disposition = self._record_controller_exception(
                            run_dir,
                            state,
                            phase,
                            phase_state,
                            step,
                            step_state,
                            exc,
                        )
                    if disposition == "passed":
                        break
                    if disposition == "retry":
                        continue
                    return state
                if step_state["status"] != "passed":
                    return state
            previous_phase_status = phase_state["status"]
            phase_state["status"] = phase["completion_stage"]
            self._emit(
                run_dir,
                state,
                "phase.completed",
                actor="verifier",
                entity={"type": "phase", "id": phase["phase_id"]},
                from_status=previous_phase_status,
                to_status=phase["completion_stage"],
                payload={"independent_checks_passed": True},
            )
        previous = state["status"]
        state["status"] = state["target_stage"]
        state["ended_at"] = utc_now()
        state["current"] = {"phase_id": None, "step_id": None, "attempt_id": None}
        state["blocked"] = None
        self._emit(
            run_dir,
            state,
            "run.completed",
            actor="verifier",
            entity={"type": "run", "id": state["run_id"]},
            from_status=previous,
            to_status=state["target_stage"],
            payload={"open_failure_count": len(state["open_failure_ids"])},
        )
        return state

    def _step_precondition(
        self, phase: dict[str, Any], step: dict[str, Any]
    ) -> tuple[str, str, dict[str, Any]] | None:
        executor_role, executor = self._executor_for_step(step)
        if not executor.get("argv"):
            return (
                "configuration",
                f"No {executor_role} command is configured.",
                {
                    "required_action": (
                        "create ignored HARNESS/config.local.json from the example"
                    )
                },
            )
        if executor_role != "worker":
            adapter_error = self._adapter_attestation_error(executor_role, executor)
            if adapter_error:
                return (
                    "configuration",
                    adapter_error,
                    {
                        "required_action": (
                            "configure the exact adapter executable digest in "
                            "HARNESS/config.local.json"
                        )
                    },
                )
        if step["permissions"].get("production"):
            if not self.config["policy"].get("production_approval_required", True):
                return (
                    "configuration",
                    "Production approval policy is disabled.",
                    {"required_action": "restore production_approval_required=true"},
                )
            if phase.get("approval", {}).get("mode") != "before_phase":
                return (
                    "configuration",
                    "A production step is not protected by before-phase approval.",
                    {"required_action": "fix the signed phase contract and start a new run"},
                )
        capabilities = self.config.get("capabilities", {})
        for name, required in step["permissions"].items():
            if required and not capabilities.get(name, False):
                return (
                    "capability",
                    f"The step requires the disabled capability: {name}.",
                    {"capability": name, "required_action": "enable it explicitly in config.local.json"},
                )
        if any(step["permissions"].values()):
            boundary = self.config.get("execution_boundary", {})
            if (
                not boundary.get("provider_sandbox_attested")
                or not isinstance(boundary.get("profile"), str)
                or not boundary["profile"].strip()
            ):
                return (
                    "configuration",
                    "The Provider/OS execution sandbox has not been attested.",
                    {
                        "required_action": (
                            "configure a provider-enforced file, command, and network "
                            "sandbox and record its profile in config.local.json"
                        )
                    },
                )
        return None

    def _adapter_attestation_error(
        self, executor_role: str, adapter: dict[str, Any]
    ) -> str | None:
        argv = adapter.get("argv", [])
        executable = argv[0] if argv else ""
        resolved = (
            executable
            if executable and Path(executable).is_absolute()
            else shutil.which(executable, path=self.environment.get("PATH"))
        )
        if not resolved:
            return f"The {executor_role} executable cannot be resolved."
        unresolved_path = Path(resolved)
        if unresolved_path.is_symlink():
            return f"The {executor_role} executable must not be a symbolic link."
        path = unresolved_path.resolve(strict=False)
        if not path.is_file():
            return f"The {executor_role} executable is not a trusted regular file."
        expected = str(adapter.get("executable_sha256", ""))
        if expected.startswith("sha256:"):
            expected = expected[7:]
        actual = sha256_file(path)
        if actual != expected:
            return (
                f"The {executor_role} executable digest does not match its "
                "configured attestation."
            )
        return None

    def _executor_for_step(
        self, step: dict[str, Any]
    ) -> tuple[str, dict[str, Any]]:
        if step["permissions"].get("production"):
            return "production-adapter", self.config.get("adapters", {}).get(
                "production", {}
            )
        if step["permissions"].get("external_side_effects"):
            return "staging-adapter", self.config.get("adapters", {}).get(
                "staging", {}
            )
        return "worker", self.config["worker"]

    def _record_precondition_failure(
        self,
        run_dir: Path,
        state: dict[str, Any],
        phase: dict[str, Any],
        phase_state: dict[str, Any],
        step: dict[str, Any],
        step_state: dict[str, Any],
        *,
        category: str,
        symptom: str,
        detail: dict[str, Any],
    ) -> None:
        number = step_state["attempt_count"] + 1
        attempt_id = self._attempt_id(phase["phase_id"], step["step_id"], number)
        attempt_dir = self._create_attempt_dir(
            run_dir, phase["phase_id"], step["step_id"], number
        )
        started = utc_now()
        failure_id = f"failure-{uuid.uuid4().hex}"
        observation = {
            "observation_id": f"obs-{uuid.uuid4().hex}",
            "observed_at": started,
            "symptom": symptom,
            "source": "controller-preflight",
            "details": detail,
        }
        assessment = {
            "assessment_id": f"diag-{uuid.uuid4().hex}",
            "category": category,
            "statement": symptom,
            "status": "confirmed",
            "basis": "deterministic controller precondition",
        }
        attempt = self._attempt_record_base(
            state, phase, step, number, attempt_id, started, trigger=self._trigger(number)
        )
        attempt.update(
            {
                "status": "blocked",
                "ended_at": utc_now(),
                "duration_ms": 0,
                "observations": [observation],
                "diagnosis_assessments": [assessment],
                "evidence": self._log_evidence(
                    attempt_dir,
                    [
                        name
                        for name in ("worker.stdout.log", "worker.stderr.log")
                        if (attempt_dir / name).is_file()
                    ],
                ),
                "disposition": {
                    "action": "blocked",
                    "retryable": False,
                    "failure_id": failure_id,
                    "required_action": detail.get("required_action"),
                },
            }
        )
        self._finalize_attempt(attempt_dir, attempt)
        self._write_failure(
            run_dir, failure_id, attempt_id, phase, step, observation, assessment, attempt["disposition"]
        )
        step_state["attempt_count"] = number
        step_state["last_attempt_id"] = attempt_id
        step_state["status"] = "blocked"
        step_state["failure_ids"].append(failure_id)
        phase_state["status"] = "blocked"
        state["status"] = "blocked"
        state["current"]["attempt_id"] = attempt_id
        state["open_failure_ids"].append(failure_id)
        state["blocked"] = {
            "failure_id": failure_id,
            "category": category,
            "symptom": symptom,
            "details": detail,
        }
        self._emit(
            run_dir,
            state,
            "step.blocked",
            actor="controller",
            entity={"type": "step", "id": step["step_id"], "phase_id": phase["phase_id"]},
            from_status="pending",
            to_status="blocked",
            payload={"failure_id": failure_id, "category": category, "symptom": symptom},
            attempt_id=attempt_id,
        )

    def _run_attempt(
        self,
        run_dir: Path,
        state: dict[str, Any],
        phase: dict[str, Any],
        phase_state: dict[str, Any],
        step: dict[str, Any],
        step_state: dict[str, Any],
    ) -> str:
        self._require_run_git_baseline(state)
        self._require_clean_worktree()
        number = step_state["attempt_count"] + 1
        attempt_id = self._attempt_id(phase["phase_id"], step["step_id"], number)
        attempt_dir = self._create_attempt_dir(
            run_dir, phase["phase_id"], step["step_id"], number
        )
        started_at = utc_now()
        monotonic_started = time.monotonic()
        atomic_write_json(
            attempt_dir / "started.json",
            {
                "attempt_id": attempt_id,
                "run_id": state["run_id"],
                "phase_id": phase["phase_id"],
                "step_id": step["step_id"],
                "number": number,
                "started_at": started_at,
            },
        )
        previous_status = step_state["status"]
        step_state["attempt_count"] = number
        step_state["worker_attempt_count"] = (
            int(step_state.get("worker_attempt_count", 0)) + 1
        )
        step_state["last_attempt_id"] = attempt_id
        step_state["status"] = "running"
        state["status"] = "running"
        state["current"]["attempt_id"] = attempt_id
        self._emit(
            run_dir,
            state,
            "attempt.started",
            actor="controller",
            entity={"type": "step", "id": step["step_id"], "phase_id": phase["phase_id"]},
            from_status=previous_status,
            to_status="running",
            payload={"number": number},
            attempt_id=attempt_id,
        )
        input_snapshot = self._input_snapshot(step)
        prompt = self._build_prompt(state, phase, step, input_snapshot)
        head_before = self._git_head()
        guard_before = self._filesystem_guard_snapshot(step["allowed_paths"])
        control_before = self._control_plane_snapshot(run_dir)
        git_control_before = self._git_control_snapshot()
        lock_before = (
            self.lock_path.read_bytes() if self.lock_path.is_file() else None
        )
        executor_role, executor = self._executor_for_step(step)
        executor_argv = list(executor["argv"])
        if executor_role != "worker":
            adapter_error = self._adapter_attestation_error(executor_role, executor)
            if adapter_error:
                raise HarnessError(adapter_error)
            resolved_adapter = (
                executor_argv[0]
                if Path(executor_argv[0]).is_absolute()
                else shutil.which(
                    executor_argv[0], path=self.environment.get("PATH")
                )
            )
            if not resolved_adapter:
                raise HarnessError(f"The {executor_role} executable disappeared.")
            executor_argv[0] = str(Path(resolved_adapter).resolve(strict=True))
        worker_result = run_process(
            executor_argv,
            self.repo_root,
            self._step_environment(
                phase, step, include_worker_credentials=executor_role == "worker"
            ),
            int(executor.get("timeout_seconds", 1800)),
            int(self.config["policy"].get("max_log_bytes", 262144)),
            prompt,
        )
        control_after = self._control_plane_snapshot(run_dir, control_before)
        control_changes = self._control_plane_changes(control_before, control_after)
        if control_changes:
            self._restore_control_plane(run_dir, control_before, control_after)
        git_control_after = self._git_control_snapshot()
        git_control_changes = sorted(
            path
            for path in set(git_control_before).union(git_control_after)
            if git_control_before.get(path) != git_control_after.get(path)
        )
        lock_after = (
            self.lock_path.read_bytes() if self.lock_path.is_file() else None
        )
        lock_changed = lock_before != lock_after
        stdout = self.redactor.text(worker_result.stdout)
        stderr = self.redactor.text(worker_result.stderr)
        atomic_write_text(attempt_dir / "worker.stdout.log", stdout)
        atomic_write_text(attempt_dir / "worker.stderr.log", stderr)
        head_after_worker = self._git_head()
        changed_paths = self._git_status_paths()
        guard_after = self._filesystem_guard_snapshot(step["allowed_paths"])
        guarded_changes = sorted(
            path
            for path in set(guard_before).union(guard_after)
            if guard_before.get(path) != guard_after.get(path)
        )
        observations: list[dict[str, Any]] = []
        assessments: list[dict[str, Any]] = []
        verification_results: list[dict[str, Any]] = []
        evidence = self._log_evidence(attempt_dir, ["worker.stdout.log", "worker.stderr.log"])
        category: str | None = None
        root_status = "suspected"
        cause = "The underlying cause has not been confirmed."
        verified_snapshot: dict[str, dict[str, Any]] = {}
        if worker_result.timed_out:
            category = "timeout"
            root_status = "confirmed"
            cause = "The worker exceeded the controller timeout."
        elif control_changes or git_control_changes or lock_changed:
            category = "controller_state_violation"
            root_status = "confirmed"
            cause = (
                "The worker modified controller-owned run records. The controller "
                "restored its trusted pre-invocation snapshot."
            )
            observations.append(
                self._observation(
                    "Controller-owned run files changed during worker execution.",
                    "control-plane-guard",
                    {
                        "run_changes": control_changes,
                        "git_control_changes": git_control_changes,
                        "lock_changed": lock_changed,
                    },
                )
            )
        elif worker_result.returncode != 0:
            category, root_status, cause = self._classify_worker_failure(stderr)
        elif head_after_worker != head_before:
            category = "unauthorized_git"
            root_status = "confirmed"
            cause = "The worker changed HEAD; only the controller may create checkpoints."
        else:
            scope_errors = self._scope_errors(changed_paths, step["allowed_paths"])
            scope_errors.extend(
                {"path": path, "reason": "non-allowed filesystem change (including ignored files)"}
                for path in guarded_changes
            )
            if scope_errors:
                category = "scope_violation"
                root_status = "confirmed"
                cause = "Worker changes escaped the step's declared allowed paths."
                observations.append(
                    self._observation(
                        "Changed paths failed scope validation.",
                        "git-status",
                        {"violations": scope_errors, "changed_paths": changed_paths},
                    )
                )
        if category is None:
            attribute_error = self._unsafe_git_attribute(changed_paths)
            if attribute_error:
                category = "checkpoint"
                root_status = "confirmed"
                cause = attribute_error
                observations.append(
                    self._observation(
                        "A content-transforming Git attribute is active on a candidate path.",
                        "git-attributes",
                        {"error": attribute_error},
                    )
                )
        if category is None:
            candidate_before_verification = self._git_candidate_snapshot(changed_paths)
            verifier_guard_before = guard_after
            verifier_control_before = self._control_plane_snapshot(run_dir)
            verifier_git_control_before = self._git_control_snapshot()
            verification_results, check_evidence = self._verify_step(
                phase, step, attempt_dir
            )
            evidence.extend(check_evidence)
            verifier_git_control_after = self._git_control_snapshot()
            verifier_git_control_changes = sorted(
                path
                for path in set(verifier_git_control_before).union(
                    verifier_git_control_after
                )
                if verifier_git_control_before.get(path)
                != verifier_git_control_after.get(path)
            )
            changed_after_verification = self._git_status_paths()
            verified_snapshot = self._git_candidate_snapshot(
                changed_after_verification
            )
            verifier_guard_after = self._filesystem_guard_snapshot(
                step["allowed_paths"]
            )
            verifier_control_after = self._control_plane_snapshot(
                run_dir, verifier_control_before
            )
            check_prefix = str(
                (attempt_dir / "checks").relative_to(run_dir)
            ).replace("\\", "/") + "/"
            verifier_control_changes = [
                change
                for change in self._control_plane_changes(
                    verifier_control_before, verifier_control_after
                )
                if not change["path"].startswith(check_prefix)
            ]
            if verifier_control_changes:
                filtered_before = {
                    path: value
                    for path, value in verifier_control_before.items()
                    if not path.startswith(check_prefix)
                }
                filtered_after = {
                    path: value
                    for path, value in verifier_control_after.items()
                    if not path.startswith(check_prefix)
                }
                self._restore_control_plane(
                    run_dir, filtered_before, filtered_after
                )
            verifier_guard_changes = sorted(
                path
                for path in set(verifier_guard_before).union(verifier_guard_after)
                if verifier_guard_before.get(path) != verifier_guard_after.get(path)
            )
            post_scope_errors = self._scope_errors(
                changed_after_verification, step["allowed_paths"]
            )
            mutation_details: dict[str, Any] = {}
            if changed_after_verification != changed_paths:
                mutation_details["git_paths_before"] = changed_paths
                mutation_details["git_paths_after"] = changed_after_verification
            if verified_snapshot != candidate_before_verification:
                mutation_details["candidate_blob_changed"] = True
            if verifier_guard_changes:
                mutation_details["non_allowed_changes"] = verifier_guard_changes
            if verifier_control_changes:
                mutation_details["controller_state_changes"] = verifier_control_changes
            if verifier_git_control_changes:
                mutation_details["git_control_changes"] = verifier_git_control_changes
            if post_scope_errors:
                mutation_details["scope_errors"] = post_scope_errors
            if mutation_details:
                category = "verifier_mutation"
                root_status = "confirmed"
                cause = (
                    "An acceptance command modified the candidate or controller-owned "
                    "state; verifier commands must be read-only."
                )
                observations.append(
                    self._observation(
                        "The repository changed while independent checks were running.",
                        "verifier-guard",
                        mutation_details,
                    )
                )
            changed_paths = changed_after_verification
            required_failures = [
                result
                for result in verification_results
                if result["required"] and not result["passed"]
            ]
            if category is None and required_failures:
                category = "verification"
                root_status = "suspected"
                cause = (
                    "Independent acceptance checks failed; the implementation defect "
                    "still requires diagnosis."
                )
                observations.append(
                    self._observation(
                        "One or more required acceptance checks failed.",
                        "verifier",
                        {"failed_check_ids": [item["check_id"] for item in required_failures]},
                    )
                )
            if category is None and step["permissions"].get("external_side_effects"):
                receipt_error = (
                    self._production_receipt_error(state, phase, step)
                    if step["permissions"].get("production")
                    else self._staging_receipt_error(state, step)
                )
                if receipt_error:
                    category = "verification"
                    root_status = "confirmed"
                    cause = receipt_error
                    observations.append(
                        self._observation(
                            "Deployment evidence does not match the Controller-owned scope.",
                            (
                                "production-receipt-verifier"
                                if step["permissions"].get("production")
                                else "staging-receipt-verifier"
                            ),
                            {"error": receipt_error},
                        )
                    )
        checkpoint: dict[str, Any] | None = None
        if category is None:
            checkpoint, checkpoint_error = self._checkpoint(
                state,
                phase,
                step,
                changed_paths,
                attempt_dir,
                verified_snapshot,
            )
            if checkpoint_error is not None:
                category = "checkpoint"
                root_status = "confirmed"
                cause = checkpoint_error
                observations.append(
                    self._observation(
                        "The verified change could not be checkpointed.",
                        "git",
                        {"error": checkpoint_error},
                    )
                )
        if category is not None and not observations:
            observations.append(
                self._observation(
                    self._failure_symptom(category, worker_result),
                    "worker" if worker_result.returncode != 0 or worker_result.timed_out else "controller",
                    {
                        "returncode": worker_result.returncode,
                        "timed_out": worker_result.timed_out,
                    },
                )
            )
        if category is not None:
            assessments.append(
                {
                    "assessment_id": f"diag-{uuid.uuid4().hex}",
                    "category": category,
                    "statement": cause,
                    "status": root_status,
                    "basis": "controller classification from recorded evidence",
                }
            )
        agent_report = self._parse_agent_report(stdout)
        attempt = self._attempt_record_base(
            state, phase, step, number, attempt_id, started_at, trigger=self._trigger(number)
        )
        attempt["input_snapshot"] = input_snapshot
        attempt["invocation"] = worker_result.summary()
        attempt["invocation"]["executor_role"] = executor_role
        attempt["agent_report"] = agent_report
        attempt["changes"] = {
            "head_before": head_before,
            "head_after_worker": head_after_worker,
            "paths": changed_paths,
            "checkpoint": checkpoint,
        }
        attempt["observations"] = observations
        attempt["diagnosis_assessments"] = assessments
        attempt["verification_results"] = verification_results
        attempt["evidence"] = evidence
        attempt["ended_at"] = utc_now()
        attempt["duration_ms"] = int((time.monotonic() - monotonic_started) * 1000)
        if category is None:
            resolved = [
                failure_id
                for failure_id in step_state["failure_ids"]
                if failure_id in state["open_failure_ids"]
            ]
            attempt["status"] = "succeeded"
            attempt["failure_updates"] = [
                {
                    "failure_id": failure_id,
                    "status": "resolved",
                    "resolution": "A later attempt passed all independent acceptance checks.",
                    "resolved_at": attempt["ended_at"],
                }
                for failure_id in resolved
            ]
            attempt["disposition"] = {
                "action": "passed",
                "retryable": False,
                "failure_id": None,
            }
            self._finalize_attempt(attempt_dir, attempt)
            state["open_failure_ids"] = [
                failure_id
                for failure_id in state["open_failure_ids"]
                if failure_id not in resolved
            ]
            step_state["status"] = "passed"
            if checkpoint and checkpoint.get("commit"):
                state["result"]["commits"].append(checkpoint["commit"])
                state["result"]["git_control_hmac"] = self._git_control_hmac()
            self._emit(
                run_dir,
                state,
                "step.passed",
                actor="verifier",
                entity={"type": "step", "id": step["step_id"], "phase_id": phase["phase_id"]},
                from_status="running",
                to_status="passed",
                payload={
                    "agent_claimed_success": self._agent_claimed_success(agent_report),
                    "required_checks_passed": True,
                    "resolved_failure_ids": resolved,
                },
                attempt_id=attempt_id,
            )
            return "passed"
        failure_id = f"failure-{uuid.uuid4().hex}"
        worker_attempt_number = int(step_state["worker_attempt_count"])
        retryable = (
            category in step["retry_policy"]["retryable_categories"]
            and worker_attempt_number < int(step["retry_policy"]["max_attempts"])
            and not step["permissions"].get("external_side_effects")
            and not changed_paths
            and head_after_worker == head_before
        )
        action = "retry" if retryable else (
            "blocked"
            if step["permissions"].get("external_side_effects")
            or changed_paths
            or category
            in {
                "scope_violation",
                "unauthorized_git",
                "checkpoint",
                "controller_state_violation",
                "verifier_mutation",
            }
            else "failed"
        )
        attempt["status"] = "failed" if retryable or action == "failed" else "blocked"
        attempt["disposition"] = {
            "action": action,
            "retryable": retryable,
            "failure_id": failure_id,
            "next_attempt_number": number + 1 if retryable else None,
        }
        self._finalize_attempt(attempt_dir, attempt)
        self._write_failure(
            run_dir,
            failure_id,
            attempt_id,
            phase,
            step,
            observations[0],
            assessments[0],
            attempt["disposition"],
        )
        step_state["failure_ids"].append(failure_id)
        state["open_failure_ids"].append(failure_id)
        if retryable:
            step_state["status"] = "retry_wait"
            state["status"] = "retry_wait"
            self._emit(
                run_dir,
                state,
                "attempt.retry_scheduled",
                actor="controller",
                entity={"type": "step", "id": step["step_id"], "phase_id": phase["phase_id"]},
                from_status="running",
                to_status="retry_wait",
                payload={"failure_id": failure_id, "category": category, "next_attempt": number + 1},
                attempt_id=attempt_id,
            )
            backoffs = step["retry_policy"]["backoff_seconds"]
            delay = backoffs[min(worker_attempt_number - 1, len(backoffs) - 1)]
            if delay:
                time.sleep(delay)
            return "retry"
        final_status = "blocked" if action == "blocked" else "failed"
        step_state["status"] = final_status
        phase_state["status"] = final_status
        state["status"] = final_status
        state["blocked"] = {
            "failure_id": failure_id,
            "category": category,
            "symptom": observations[0]["symptom"],
            "changed_paths": changed_paths,
            "safe_to_resume": (
                not changed_paths
                and head_after_worker == head_before
                and not git_control_changes
                and not lock_changed
            ),
        }
        state["ended_at"] = utc_now() if final_status == "failed" else None
        self._emit(
            run_dir,
            state,
            f"step.{final_status}",
            actor="controller",
            entity={"type": "step", "id": step["step_id"], "phase_id": phase["phase_id"]},
            from_status="running",
            to_status=final_status,
            payload={"failure_id": failure_id, "category": category},
            attempt_id=attempt_id,
        )
        return final_status

    def _record_controller_exception(
        self,
        run_dir: Path,
        state: dict[str, Any],
        phase: dict[str, Any],
        phase_state: dict[str, Any],
        step: dict[str, Any],
        step_state: dict[str, Any],
        error: Exception,
    ) -> str:
        """Complete an in-flight attempt when Controller logic rejects its output."""
        number = int(step_state.get("attempt_count", 0))
        attempt_id = step_state.get("last_attempt_id")
        if number < 1 or not attempt_id:
            raise error
        attempt_dir = (
            run_dir
            / "attempts"
            / phase["phase_id"]
            / step["step_id"]
            / f"attempt-{number:03d}"
        )
        if (attempt_dir / "attempt.json").exists():
            raise HarnessError(
                "Controller stopped after an immutable attempt was finalized; "
                "resume is required to reconcile the signed record"
            ) from error
        if step_state.get("status") != "running":
            raise error
        started_path = attempt_dir / "started.json"
        started = (
            read_json(started_path).get("started_at", utc_now())
            if started_path.is_file()
            else utc_now()
        )
        message = self.redactor.text(f"{type(error).__name__}: {error}")
        failure_id = f"failure-{uuid.uuid4().hex}"
        observation = self._observation(
            "The Controller could not safely verify or finalize the in-flight attempt.",
            "controller-exception-boundary",
            {
                "exception": message,
                "attempt_id": attempt_id,
            },
        )
        assessment = {
            "assessment_id": f"diag-{uuid.uuid4().hex}",
            "category": "controller_exception",
            "statement": message,
            "status": "confirmed",
            "basis": "exception captured by the Controller attempt boundary",
        }
        attempt = self._attempt_record_base(
            state,
            phase,
            step,
            number,
            attempt_id,
            started,
            trigger=self._trigger(number),
        )
        attempt.update(
            {
                "status": "blocked",
                "ended_at": utc_now(),
                "input_snapshot": {},
                "invocation": {"controller_exception": message},
                "changes": {
                    "head_expected": (
                        state["result"]["commits"][-1]
                        if state["result"].get("commits")
                        else state["source"]["base_commit"]
                    )
                },
                "observations": [observation],
                "diagnosis_assessments": [assessment],
                "disposition": {
                    "action": "blocked",
                    "retryable": False,
                    "failure_id": failure_id,
                    "required_action": (
                        "Inspect the signed evidence, restore the recorded Git baseline "
                        "if necessary, then resume or start a new run."
                    ),
                },
            }
        )
        self._finalize_attempt(attempt_dir, attempt)
        self._write_failure(
            run_dir,
            failure_id,
            attempt_id,
            phase,
            step,
            observation,
            assessment,
            attempt["disposition"],
        )
        step_state["failure_ids"].append(failure_id)
        step_state["status"] = "blocked"
        phase_state["status"] = "blocked"
        state["open_failure_ids"].append(failure_id)
        state["status"] = "blocked"
        state["blocked"] = {
            "failure_id": failure_id,
            "category": "controller_exception",
            "symptom": observation["symptom"],
            "safe_to_resume": False,
        }
        self._emit(
            run_dir,
            state,
            "step.blocked",
            actor="controller",
            entity={
                "type": "step",
                "id": step["step_id"],
                "phase_id": phase["phase_id"],
            },
            from_status="running",
            to_status="blocked",
            payload={
                "failure_id": failure_id,
                "category": "controller_exception",
            },
            attempt_id=attempt_id,
        )
        return "blocked"

    def _attempt_record_base(
        self,
        state: dict[str, Any],
        phase: dict[str, Any],
        step: dict[str, Any],
        number: int,
        attempt_id: str,
        started_at: str,
        *,
        trigger: str,
    ) -> dict[str, Any]:
        predecessor = (
            self._attempt_id(phase["phase_id"], step["step_id"], number - 1)
            if number > 1
            else None
        )
        return {
            "schema_version": 1,
            "attempt_id": attempt_id,
            "run_id": state["run_id"],
            "phase_id": phase["phase_id"],
            "step_id": step["step_id"],
            "number": number,
            "trigger": trigger,
            "predecessor_attempt_id": predecessor,
            "status": "interrupted",
            "started_at": started_at,
            "ended_at": started_at,
            "duration_ms": 0,
            "input_snapshot": {},
            "invocation": {},
            "agent_report": None,
            "changes": {},
            "observations": [],
            "diagnosis_assessments": [],
            "remediation_actions": [],
            "verification_results": [],
            "failure_updates": [],
            "evidence": [],
            "disposition": {},
        }

    def _attempt_id(self, phase_id: str, step_id: str, number: int) -> str:
        return f"{phase_id}.{step_id}.attempt-{number:03d}"

    def _trigger(self, number: int) -> str:
        return "initial" if number == 1 else "retry"

    def _create_attempt_dir(
        self, run_dir: Path, phase_id: str, step_id: str, number: int
    ) -> Path:
        path = (
            run_dir
            / "attempts"
            / phase_id
            / step_id
            / f"attempt-{number:03d}"
        )
        try:
            path.resolve(strict=False).relative_to(run_dir.resolve(strict=True))
        except ValueError as exc:
            raise HarnessError("attempt path escapes its run directory") from exc
        path.mkdir(parents=True, exist_ok=False)
        return path

    def _finalize_attempt(self, attempt_dir: Path, attempt: dict[str, Any]) -> str:
        path = attempt_dir / "attempt.json"
        if path.exists():
            raise HarnessError(f"immutable attempt already exists: {path}")
        signed = sign_mapping(self.redactor.value(attempt), self.integrity_key)
        atomic_write_json(path, signed)
        return sha256_file(path)

    def _write_failure(
        self,
        run_dir: Path,
        failure_id: str,
        attempt_id: str,
        phase: dict[str, Any],
        step: dict[str, Any],
        observation: dict[str, Any],
        assessment: dict[str, Any],
        disposition: dict[str, Any],
    ) -> None:
        path = run_dir / "failures" / f"{failure_id}.json"
        if path.exists():
            raise HarnessError(f"immutable failure record already exists: {failure_id}")
        record = self.redactor.value(
            {
                "schema_version": 1,
                "failure_id": failure_id,
                "attempt_id": attempt_id,
                "phase_id": phase["phase_id"],
                "step_id": step["step_id"],
                "recorded_at": utc_now(),
                "observation": observation,
                "diagnosis_assessment": assessment,
                "disposition": disposition,
                "resolution_policy": (
                    "This record is immutable. Later attempts append resolution updates "
                    "without rewriting this failure."
                ),
            }
        )
        atomic_write_json(path, sign_mapping(record, self.integrity_key))

    def _input_snapshot(self, step: dict[str, Any]) -> dict[str, Any]:
        contexts: list[dict[str, Any]] = []
        for raw in step.get("context_files", []):
            path = resolve_inside(self.repo_root, raw)
            normalized = normalize_relative(raw)
            if path.is_file():
                contexts.append(
                    {
                        "path": normalized,
                        "kind": "file",
                        "sha256": sha256_file(path),
                    }
                )
            elif path.is_dir():
                tree = self._git(
                    ["rev-parse", f"HEAD:{normalized}"], check=False
                )
                if tree.returncode != 0:
                    raise HarnessError(
                        f"context directory is not a verified Git tree: {normalized}"
                    )
                oid = tree.stdout.strip()
                contexts.append(
                    {
                        "path": normalized,
                        "kind": "git-tree",
                        "git_oid": oid,
                        "sha256": sha256_bytes(f"git-tree:{oid}".encode("utf-8")),
                    }
                )
            else:
                raise HarnessError(f"context path does not exist: {normalized}")
        return {
            "instruction_sha256": step["_instruction_sha256"],
            "context_files": contexts,
            "allowed_paths": list(step["allowed_paths"]),
            "required_artifacts": list(step["required_artifacts"]),
        }

    def _build_prompt(
        self,
        state: dict[str, Any],
        phase: dict[str, Any],
        step: dict[str, Any],
        snapshot: dict[str, Any],
    ) -> str:
        references = "\n".join(
            f"- {item['path']} (sha256 {item['sha256']})"
            for item in snapshot["context_files"]
        )
        allowed = "\n".join(f"- {item}" for item in step["allowed_paths"])
        phase_inputs: list[str] = []
        for requirement in phase.get("required_inputs", []):
            key = requirement["key"]
            value = self.active_inputs.get(key)
            if requirement.get("secret") and isinstance(value, dict):
                phase_inputs.append(
                    f"- {key}: available only through environment variable "
                    f"{value.get('environment')}"
                )
            elif not requirement.get("secret"):
                phase_inputs.append(
                    f"- {key}: {json.dumps(value, ensure_ascii=False)}"
                )
        approval_scope = ""
        if (
            step["permissions"].get("production")
            and step["permissions"].get("external_side_effects")
        ):
            challenge = self.approval_challenge(
                state["run_id"], phase["approval"]["approval_id"]
            )
            approval_scope = (
                "Controller-approved production scope (exact values; never "
                "substitute tags or workspace state):\n"
                + json.dumps(challenge, ensure_ascii=False, sort_keys=True)
                + "\n\n"
            )
        return (
            "You are a worker inside a controller-owned project harness.\n"
            f"Run: {state['run_id']}\n"
            f"Phase: {phase['phase_id']} - {phase['objective']}\n"
            f"Step: {step['step_id']} - {step['objective']}\n\n"
            f"Attempt: {state['current']['attempt_id']}\n\n"
            "Hard constraints:\n"
            "- Modify only the allowed paths listed below.\n"
            "- Never edit .git, .env files, HARNESS/runs, or harness configuration.\n"
            "- Do not commit, push, approve, or change harness state.\n"
            "- The controller independently verifies every acceptance check.\n"
            "- Return a concise JSON object on stdout; success claims are advisory only.\n\n"
            f"Allowed paths:\n{allowed}\n\n"
            f"Context references (read only when needed):\n{references or '- none'}\n\n"
            f"Phase inputs:\n{chr(10).join(phase_inputs) or '- none'}\n\n"
            f"{approval_scope}"
            "Step instructions:\n"
            + step["_instruction_text"]
        )

    def _scope_errors(
        self, changed_paths: list[str], allowed_paths: Iterable[str]
    ) -> list[dict[str, str]]:
        errors: list[dict[str, str]] = []
        for raw in changed_paths:
            try:
                validate_mutable_path(self.repo_root, raw)
                if not path_is_allowed(raw, allowed_paths):
                    errors.append({"path": raw, "reason": "not in allowed_paths"})
            except SpecError as exc:
                errors.append({"path": raw, "reason": str(exc)})
        return errors

    def _verify_step(
        self,
        phase: dict[str, Any],
        step: dict[str, Any],
        attempt_dir: Path,
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        results: list[dict[str, Any]] = []
        evidence: list[dict[str, Any]] = []
        ordered_checks = [
            check for check in step["acceptance_checks"] if check["type"] == "command"
        ] + [
            check for check in step["acceptance_checks"] if check["type"] != "command"
        ]
        for check in ordered_checks:
            kind = check["type"]
            passed = False
            detail: dict[str, Any] = {}
            if kind == "path_exists":
                path = resolve_inside(self.repo_root, check["path"])
                passed = path.exists()
                detail = {"path": check["path"]}
            elif kind == "content_contains":
                path = resolve_inside(self.repo_root, check["path"])
                if path.is_file():
                    content = path.read_text(encoding="utf-8", errors="replace")
                    missing = [value for value in check["values"] if value not in content]
                    passed = not missing
                    detail = {"path": check["path"], "missing_values": missing}
                else:
                    detail = {"path": check["path"], "missing_values": check["values"]}
            elif kind == "json_valid":
                path = resolve_inside(self.repo_root, check["path"])
                try:
                    read_json(path)
                    passed = True
                    detail = {"path": check["path"]}
                except (OSError, json.JSONDecodeError) as exc:
                    detail = {"path": check["path"], "error": str(exc)}
            elif kind == "command":
                cwd = (
                    resolve_inside(self.repo_root, check["cwd"])
                    if check.get("cwd") and check["cwd"] != "."
                    else self.repo_root
                )
                command_result = run_process(
                    list(check["argv"]),
                    cwd,
                    self._step_environment(
                        phase, step, include_step_secrets=False
                    ),
                    int(check.get("timeout_seconds", 600)),
                    int(self.config["policy"].get("max_log_bytes", 262144)),
                )
                check_dir = attempt_dir / "checks"
                stdout_name = f"{check['check_id']}.stdout.log"
                stderr_name = f"{check['check_id']}.stderr.log"
                atomic_write_text(check_dir / stdout_name, self.redactor.text(command_result.stdout))
                atomic_write_text(check_dir / stderr_name, self.redactor.text(command_result.stderr))
                evidence.extend(
                    self._log_evidence(
                        check_dir, [stdout_name, stderr_name], prefix="checks/"
                    )
                )
                expected = check.get("expected_exit_codes", [0])
                passed = (
                    not command_result.timed_out
                    and command_result.returncode in expected
                )
                detail = command_result.summary()
            results.append(
                {
                    "check_id": check["check_id"],
                    "type": kind,
                    "required": bool(check["required"]),
                    "passed": passed,
                    "detail": self.redactor.value(detail),
                }
            )
        for index, artifact in enumerate(step["required_artifacts"], start=1):
            path = resolve_inside(self.repo_root, artifact)
            results.append(
                {
                    "check_id": f"artifact-{index}",
                    "type": "required_artifact",
                    "required": True,
                    "passed": path.exists(),
                    "detail": {"path": artifact},
                }
            )
        return results, evidence

    def _checkpoint(
        self,
        state: dict[str, Any],
        phase: dict[str, Any],
        step: dict[str, Any],
        changed_paths: list[str],
        attempt_dir: Path,
        verified_snapshot: dict[str, dict[str, Any]],
    ) -> tuple[dict[str, Any] | None, str | None]:
        current_snapshot = self._git_candidate_snapshot(changed_paths)
        if current_snapshot != verified_snapshot:
            return None, "candidate blob changed after independent verification"
        attribute_error = self._unsafe_git_attribute(changed_paths)
        if attribute_error:
            return None, attribute_error
        secret_findings = self._secret_findings(changed_paths)
        if secret_findings:
            return None, (
                "secret scan rejected controller-approved paths: "
                + ", ".join(item["path"] for item in secret_findings)
            )
        if not changed_paths:
            artifact_error = self._required_artifact_index_error(
                step["required_artifacts"]
            )
            if artifact_error:
                return None, artifact_error
            return {"commit": None, "paths": [], "blobs": {}}, None
        if not self.config["policy"].get("auto_commit", True):
            return None, "auto_commit is disabled; a multi-step run cannot safely retain dirty changes"
        stage = self._git(["add", "--", *changed_paths], check=False)
        if stage.returncode != 0:
            return None, self.redactor.text(stage.stderr.strip() or "git add failed")
        staged = self._git(["diff", "--cached", "--name-only", "-z"], check=False)
        staged_paths = sorted(
            normalize_relative(item)
            for item in staged.stdout.split("\0")
            if item
        )
        if (
            staged.returncode != 0
            or not staged_paths
            or any(path not in changed_paths for path in staged_paths)
        ):
            return None, (
                "staged path set is not a safe subset of controller-approved changes: "
                f"expected={sorted(changed_paths)} actual={staged_paths}"
            )
        index_blobs = self._index_blob_snapshot(changed_paths)
        if index_blobs != verified_snapshot:
            return None, (
                "staged blob set differs from independently verified candidate: "
                f"verified={verified_snapshot} staged={index_blobs}"
            )
        artifact_error = self._required_artifact_index_error(
            step["required_artifacts"]
        )
        if artifact_error:
            return None, artifact_error
        message = f"harness({phase['phase_id']}): {step['step_id']}"
        commit = self._git(["commit", "--no-verify", "-m", message], check=False)
        atomic_write_text(
            attempt_dir / "checkpoint.stdout.log", self.redactor.text(commit.stdout)
        )
        atomic_write_text(
            attempt_dir / "checkpoint.stderr.log", self.redactor.text(commit.stderr)
        )
        if commit.returncode != 0:
            return None, self.redactor.text(commit.stderr.strip() or "git commit failed")
        if self._git_status_paths():
            return None, "worktree is not clean after the exact-path checkpoint"
        commit_id = self._git_head()
        head_blobs = self._head_blob_snapshot(commit_id, changed_paths)
        if head_blobs != verified_snapshot:
            return None, (
                "committed blob set differs from independently verified candidate: "
                f"verified={verified_snapshot} committed={head_blobs}"
            )
        return {
            "commit": commit_id,
            "paths": staged_paths,
            "blobs": verified_snapshot,
        }, None

    def _git_candidate_snapshot(
        self, paths: Iterable[str]
    ) -> dict[str, dict[str, Any]]:
        snapshot: dict[str, dict[str, Any]] = {}
        for raw in sorted(set(paths)):
            path = resolve_inside(self.repo_root, raw)
            if path.is_symlink():
                raise HarnessError(f"changed symbolic links are forbidden: {raw}")
            if path.is_file():
                result = self._git(
                    ["hash-object", f"--path={raw}", "--", raw], check=False
                )
                if result.returncode != 0:
                    raise HarnessError(f"could not hash candidate blob: {raw}")
                snapshot[raw] = {
                    "exists": True,
                    "blob_oid": result.stdout.strip(),
                }
            elif path.exists():
                raise HarnessError(f"git status path is not a regular file: {raw}")
            else:
                snapshot[raw] = {"exists": False, "blob_oid": None}
        return snapshot

    def _index_blob_snapshot(
        self, paths: Iterable[str]
    ) -> dict[str, dict[str, Any]]:
        snapshot: dict[str, dict[str, Any]] = {}
        for raw in sorted(set(paths)):
            result = self._git(["rev-parse", "--verify", f":{raw}"], check=False)
            snapshot[raw] = (
                {"exists": True, "blob_oid": result.stdout.strip()}
                if result.returncode == 0
                else {"exists": False, "blob_oid": None}
            )
        return snapshot

    def _head_blob_snapshot(
        self, commit: str, paths: Iterable[str]
    ) -> dict[str, dict[str, Any]]:
        snapshot: dict[str, dict[str, Any]] = {}
        for raw in sorted(set(paths)):
            result = self._git(
                ["rev-parse", "--verify", f"{commit}:{raw}"], check=False
            )
            snapshot[raw] = (
                {"exists": True, "blob_oid": result.stdout.strip()}
                if result.returncode == 0
                else {"exists": False, "blob_oid": None}
            )
        return snapshot

    def _unsafe_git_attribute(self, paths: Iterable[str]) -> str | None:
        for raw in paths:
            result = self._git(
                [
                    "check-attr",
                    "filter",
                    "working-tree-encoding",
                    "ident",
                    "--",
                    raw,
                ],
                check=False,
            )
            if result.returncode != 0:
                return f"could not inspect Git attributes for {raw}"
            for line in result.stdout.splitlines():
                value = line.rsplit(":", 1)[-1].strip()
                if value not in {"unspecified", "unset"}:
                    return (
                        f"unsafe content-transforming Git attribute on {raw}; "
                        "filter, working-tree-encoding, and ident are forbidden"
                    )
        return None

    def _secret_findings(
        self, paths: Iterable[str]
    ) -> list[dict[str, str]]:
        findings: list[dict[str, str]] = []
        assignment = re.compile(
            r"(?i)(?:password|secret|token|api[_-]?key)\s*[=:]\s*"
            r"['\"]?([A-Za-z0-9+/=_-]{16,})"
        )
        placeholders = ("placeholder", "change-me", "example", "dummy", "test-only")
        for raw in paths:
            path = resolve_inside(self.repo_root, raw)
            if not path.is_file():
                continue
            size = path.stat().st_size
            if size > 10 * 1024 * 1024:
                findings.append({"path": raw, "reason": "file exceeds secret scan limit"})
                continue
            content = path.read_bytes()
            if any(secret.encode("utf-8") in content for secret in self.redactor.secrets):
                findings.append({"path": raw, "reason": "known secret value"})
                continue
            text = content.decode("utf-8", errors="ignore")
            matches = [
                match.group(1)
                for match in assignment.finditer(text)
                if not any(word in match.group(1).casefold() for word in placeholders)
            ]
            if matches:
                findings.append({"path": raw, "reason": "credential-like assignment"})
        return findings

    def _required_artifact_index_error(
        self, artifacts: Iterable[str]
    ) -> str | None:
        for raw in artifacts:
            path = resolve_inside(self.repo_root, raw)
            if not path.exists():
                return f"required artifact is missing: {raw}"
            result = self._git(["ls-files", "-z", "--", raw], check=False)
            tracked = [
                normalize_relative(item)
                for item in result.stdout.split("\0")
                if item
            ]
            if result.returncode != 0 or not tracked:
                return (
                    f"required artifact is not present in the Git index "
                    f"(possibly ignored): {raw}"
                )
            if path.is_file() and normalize_relative(raw) not in tracked:
                return f"required artifact file is not exactly indexed: {raw}"
        return None

    def _log_evidence(
        self, directory: Path, names: list[str], prefix: str = ""
    ) -> list[dict[str, Any]]:
        evidence: list[dict[str, Any]] = []
        for name in names:
            path = directory / name
            if path.exists():
                evidence.append(
                    {
                        "path": prefix + name,
                        "sha256": sha256_file(path),
                        "redacted": True,
                    }
                )
        return evidence

    def _filesystem_guard_snapshot(
        self, allowed_paths: Iterable[str]
    ) -> dict[str, tuple[int, int, int, bool, str]]:
        """Watch non-allowed files, including Git-ignored files, without reading contents."""
        self._require_integrity_key()
        watched: dict[str, tuple[int, int, int, bool, str]] = {}
        root = self.repo_root
        runs_relative = normalize_relative(self.config["runs_dir"])
        for current, directory_names, file_names in os.walk(
            root, topdown=True, followlinks=False
        ):
            current_path = Path(current)
            relative_dir = (
                ""
                if current_path == root
                else str(current_path.relative_to(root)).replace("\\", "/")
            )
            kept_directories: list[str] = []
            for name in directory_names:
                relative = f"{relative_dir}/{name}".strip("/")
                folded = relative.casefold()
                if folded == ".git" or folded.startswith(".git/"):
                    continue
                if (
                    folded == runs_relative.casefold()
                    or folded.startswith(runs_relative.casefold() + "/")
                ):
                    continue
                kept_directories.append(name)
            directory_names[:] = kept_directories
            for name in file_names:
                relative = f"{relative_dir}/{name}".strip("/").replace("\\", "/")
                if path_is_allowed(relative, allowed_paths) and not is_protected(relative):
                    continue
                path = current_path / name
                stat = path.lstat()
                digest = (
                    integrity_digest(
                        {"symlink": os.readlink(path)}, self.integrity_key
                    )
                    if path.is_symlink()
                    else integrity_digest_file(path, self.integrity_key)
                )
                watched[relative] = (
                    int(stat.st_size),
                    int(stat.st_mtime_ns),
                    int(stat.st_mode),
                    path.is_symlink(),
                    digest,
                )
        return watched

    def _control_plane_snapshot(
        self,
        run_dir: Path,
        trusted_before: dict[str, bytes | None] | None = None,
    ) -> dict[str, bytes | None]:
        """Capture controller-owned files so a worker cannot silently rewrite history."""
        snapshot: dict[str, bytes | None] = {}
        total_bytes = 0
        limit = int(self.config["policy"].get("max_log_bytes", 262144)) * 256
        for current, directory_names, file_names in os.walk(
            run_dir, topdown=True, followlinks=False
        ):
            current_path = Path(current)
            for name in file_names:
                path = current_path / name
                relative = str(path.relative_to(run_dir)).replace("\\", "/")
                if path.is_symlink():
                    if trusted_before is None:
                        raise HarnessError(
                            f"symbolic links are forbidden in controller state: {relative}"
                        )
                    snapshot[relative] = None
                    continue
                if not path.is_file():
                    snapshot[relative] = None
                    continue
                if trusted_before is not None and relative not in trusted_before:
                    # Do not ingest arbitrary worker-created content.
                    snapshot[relative] = None
                    continue
                expected = (
                    trusted_before.get(relative)
                    if trusted_before is not None
                    else None
                )
                if (
                    trusted_before is not None
                    and expected is not None
                    and path.stat().st_size != len(expected)
                ):
                    snapshot[relative] = None
                    continue
                content = path.read_bytes()
                total_bytes += len(content)
                if total_bytes > limit:
                    raise HarnessError(
                        "controller state snapshot exceeded its bounded memory limit"
                    )
                snapshot[relative] = content
        return snapshot

    def _git_control_snapshot(self) -> dict[str, str]:
        git_dir_result = self._git(["rev-parse", "--git-dir"], check=False)
        if git_dir_result.returncode != 0:
            raise HarnessError("could not locate Git control directory")
        git_dir = Path(git_dir_result.stdout.strip())
        if not git_dir.is_absolute():
            git_dir = (self.repo_root / git_dir).resolve(strict=True)
        protected_roots = [
            git_dir / "HEAD",
            git_dir / "index",
            git_dir / "config",
            git_dir / "packed-refs",
            git_dir / "hooks",
            git_dir / "info" / "attributes",
            git_dir / "refs",
        ]
        snapshot: dict[str, str] = {}
        for root in protected_roots:
            if root.is_file():
                relative = str(root.relative_to(git_dir)).replace("\\", "/")
                snapshot[relative] = integrity_digest_file(
                    root, self.integrity_key
                )
            elif root.is_dir():
                for path in root.rglob("*"):
                    if path.is_file() and not path.is_symlink():
                        relative = str(path.relative_to(git_dir)).replace("\\", "/")
                        snapshot[relative] = integrity_digest_file(
                            path, self.integrity_key
                        )
        return snapshot

    def _git_control_hmac(self) -> str:
        """Bind resumable state to Git metadata owned by the current run."""
        if self.integrity_key is None:
            raise PreflightError("the journal integrity key is required")
        return integrity_digest(self._git_control_snapshot(), self.integrity_key)

    def _require_run_git_baseline(self, state: dict[str, Any]) -> None:
        """Refuse to continue on a Worker- or user-rewritten Git history/control plane."""
        commits = state.get("result", {}).get("commits", [])
        expected_head = commits[-1] if commits else state["source"]["base_commit"]
        actual_head = self._git_head()
        if actual_head != expected_head:
            raise PreflightError(
                "Git HEAD no longer matches the last Controller-owned checkpoint; "
                f"expected {expected_head}, actual {actual_head}. Restore the exact "
                "recorded commit or start a new run; the harness will not reset it."
            )
        expected_control = state.get("result", {}).get("git_control_hmac")
        if not isinstance(expected_control, str) or not expected_control:
            raise PreflightError(
                "run state has no trusted Git control-plane baseline; start a new run"
            )
        actual_control = self._git_control_hmac()
        if actual_control != expected_control:
            raise PreflightError(
                "Git config, index, refs, hooks, or attributes differ from the last "
                "Controller-owned checkpoint. Restore the recorded control plane or "
                "start a new run; automatic recovery is intentionally disabled."
            )

    def _control_plane_changes(
        self,
        before: dict[str, bytes | None],
        after: dict[str, bytes | None],
    ) -> list[dict[str, Any]]:
        changes: list[dict[str, Any]] = []
        for path in sorted(set(before).union(after)):
            if before.get(path) == after.get(path):
                continue
            changes.append(
                {
                    "path": path,
                    "kind": (
                        "added"
                        if path not in before
                        else "deleted"
                        if path not in after
                        else "modified"
                    ),
                    "before_sha256": (
                        sha256_bytes(before[path])
                        if path in before and before[path] is not None
                        else None
                    ),
                    "after_sha256": (
                        sha256_bytes(after[path])
                        if path in after and after[path] is not None
                        else None
                    ),
                }
            )
        return changes

    def _restore_control_plane(
        self,
        run_dir: Path,
        before: dict[str, bytes | None],
        after: dict[str, bytes | None],
    ) -> None:
        """Restore only controller-owned files; never touch project/user paths."""
        for relative in sorted(set(after).difference(before), reverse=True):
            path = run_dir / relative
            if not path.is_dir():
                path.unlink()
        for relative, content in before.items():
            if content is None:
                raise HarnessError(
                    f"trusted controller snapshot is incomplete: {relative}"
                )
            path = run_dir / relative
            if path.is_symlink():
                path.unlink()
            if after.get(relative) != content:
                atomic_write_bytes(path, content)

    def _recover_interrupted_attempt(
        self,
        run_dir: Path,
        state: dict[str, Any],
        snapshot: dict[str, Any],
    ) -> None:
        phase_map = {phase["phase_id"]: phase for phase in snapshot["phases"]}
        for phase_state in state["phase_states"]:
            phase = phase_map[phase_state["phase_id"]]
            step_map = {step["step_id"]: step for step in phase["steps"]}
            for step_state in phase_state["steps"]:
                if step_state["status"] != "running" or not step_state["last_attempt_id"]:
                    continue
                number = int(step_state["attempt_count"])
                attempt_dir = (
                    run_dir
                    / "attempts"
                    / phase["phase_id"]
                    / step_state["step_id"]
                    / f"attempt-{number:03d}"
                )
                if (attempt_dir / "attempt.json").exists():
                    self._reconcile_finalized_attempt(
                        run_dir,
                        state,
                        phase,
                        phase_state,
                        step_map[step_state["step_id"]],
                        step_state,
                        attempt_dir,
                    )
                    continue
                step = step_map[step_state["step_id"]]
                started = read_json(attempt_dir / "started.json")
                failure_id = f"failure-{uuid.uuid4().hex}"
                observation = self._observation(
                    "An attempt started but no immutable completion record was written.",
                    "controller-recovery",
                    {"recovered_at": utc_now()},
                )
                assessment = {
                    "assessment_id": f"diag-{uuid.uuid4().hex}",
                    "category": "interruption",
                    "statement": "The controller or worker stopped before finalization; the initiating cause is unknown.",
                    "status": "inconclusive",
                    "basis": "started.json exists while attempt.json is absent",
                }
                can_retry = (
                    not step["permissions"].get("external_side_effects")
                    and int(step_state.get("worker_attempt_count", 0))
                    < int(step["retry_policy"]["max_attempts"])
                )
                attempt = self._attempt_record_base(
                    state,
                    phase,
                    step,
                    number,
                    step_state["last_attempt_id"],
                    started["started_at"],
                    trigger=self._trigger(number),
                )
                attempt.update(
                    {
                        "status": "interrupted" if can_retry else "blocked",
                        "ended_at": utc_now(),
                        "observations": [observation],
                        "diagnosis_assessments": [assessment],
                        "disposition": {
                            "action": "resume" if can_retry else "blocked",
                            "retryable": can_retry,
                            "failure_id": failure_id,
                            "next_attempt_number": number + 1 if can_retry else None,
                        },
                    }
                )
                self._finalize_attempt(attempt_dir, attempt)
                self._write_failure(
                    run_dir,
                    failure_id,
                    step_state["last_attempt_id"],
                    phase,
                    step,
                    observation,
                    assessment,
                    attempt["disposition"],
                )
                recovered_status = "interrupted" if can_retry else "blocked"
                step_state["status"] = recovered_status
                phase_state["status"] = recovered_status
                step_state["failure_ids"].append(failure_id)
                state["open_failure_ids"].append(failure_id)
                state["status"] = recovered_status
                if not can_retry:
                    state["blocked"] = {
                        "failure_id": failure_id,
                        "category": "interruption",
                        "symptom": observation["symptom"],
                        "safe_to_resume": False,
                    }
                self._emit(
                    run_dir,
                    state,
                    "attempt.interrupted",
                    actor="controller",
                    entity={
                        "type": "step",
                        "id": step["step_id"],
                        "phase_id": phase["phase_id"],
                    },
                    from_status="running",
                    to_status=recovered_status,
                    payload={"failure_id": failure_id, "retryable": can_retry},
                    attempt_id=step_state["last_attempt_id"],
                )

    def _reconcile_finalized_attempt(
        self,
        run_dir: Path,
        state: dict[str, Any],
        phase: dict[str, Any],
        phase_state: dict[str, Any],
        step: dict[str, Any],
        step_state: dict[str, Any],
        attempt_dir: Path,
    ) -> None:
        """Project a signed attempt that was finalized before its state event."""
        record = read_json(attempt_dir / "attempt.json")
        attempt_id = step_state["last_attempt_id"]
        status = record.get("status")
        if status == "succeeded":
            checkpoint = record.get("changes", {}).get("checkpoint") or {}
            commit = checkpoint.get("commit")
            if commit:
                if self._git_head() != commit:
                    raise HarnessError(
                        "finalized successful attempt commit is not the current HEAD"
                    )
                paths = checkpoint.get("paths", [])
                blobs = checkpoint.get("blobs", {})
                if self._head_blob_snapshot(commit, paths) != blobs:
                    raise HarnessError(
                        "finalized attempt checkpoint blobs do not match HEAD"
                    )
                previous = (
                    state["result"]["commits"][-1]
                    if state["result"].get("commits")
                    else state["source"]["base_commit"]
                )
                ancestor = self._git(
                    ["merge-base", "--is-ancestor", previous, commit], check=False
                )
                if ancestor.returncode != 0:
                    raise HarnessError(
                        "finalized attempt checkpoint is not based on the trusted run history"
                    )
                if commit not in state["result"]["commits"]:
                    state["result"]["commits"].append(commit)
                state["result"]["git_control_hmac"] = self._git_control_hmac()
            resolved = [
                update.get("failure_id")
                for update in record.get("failure_updates", [])
                if update.get("status") == "resolved"
            ]
            state["open_failure_ids"] = [
                failure_id
                for failure_id in state["open_failure_ids"]
                if failure_id not in resolved
            ]
            step_state["status"] = "passed"
            phase_state["status"] = "running"
            state["status"] = "running"
            self._emit(
                run_dir,
                state,
                "attempt.reconciled",
                actor="controller",
                entity={
                    "type": "step",
                    "id": step["step_id"],
                    "phase_id": phase["phase_id"],
                },
                from_status="running",
                to_status="passed",
                payload={"attempt_status": status, "checkpoint": commit},
                attempt_id=attempt_id,
            )
            return
        if status not in {"failed", "blocked", "interrupted", "cancelled"}:
            raise HarnessError(f"unsupported finalized attempt status: {status}")
        disposition = record.get("disposition", {})
        failure_id = disposition.get("failure_id")
        if not isinstance(failure_id, str) or not failure_id:
            raise HarnessError("finalized failed attempt has no failure id")
        failure_path = run_dir / "failures" / f"{failure_id}.json"
        if not failure_path.exists():
            observations = record.get("observations", [])
            assessments = record.get("diagnosis_assessments", [])
            if not observations or not assessments:
                raise HarnessError(
                    "finalized failed attempt lacks evidence needed for recovery"
                )
            self._write_failure(
                run_dir,
                failure_id,
                attempt_id,
                phase,
                step,
                observations[0],
                assessments[0],
                disposition,
            )
        if failure_id not in step_state["failure_ids"]:
            step_state["failure_ids"].append(failure_id)
        if failure_id not in state["open_failure_ids"]:
            state["open_failure_ids"].append(failure_id)
        action = disposition.get("action")
        projected = (
            "retry_wait"
            if action in {"retry", "resume"}
            else "failed"
            if action in {"failed", "cancelled"}
            else "blocked"
        )
        step_state["status"] = projected
        phase_state["status"] = projected
        state["status"] = projected
        if projected == "failed":
            state["ended_at"] = utc_now()
        paths = record.get("changes", {}).get("paths", [])
        expected_head = (
            state["result"]["commits"][-1]
            if state["result"].get("commits")
            else state["source"]["base_commit"]
        )
        safe_to_resume = (
            not paths
            and self._git_head() == expected_head
            and self._git_control_hmac()
            == state["result"].get("git_control_hmac")
            and int(step_state.get("worker_attempt_count", 0))
            < int(step["retry_policy"]["max_attempts"])
        )
        state["blocked"] = {
            "failure_id": failure_id,
            "category": (
                record.get("diagnosis_assessments", [{}])[0].get(
                    "category", "interruption"
                )
            ),
            "symptom": (
                record.get("observations", [{}])[0].get(
                    "symptom", "A finalized attempt required recovery."
                )
            ),
            "safe_to_resume": safe_to_resume,
        }
        self._emit(
            run_dir,
            state,
            "attempt.reconciled",
            actor="controller",
            entity={
                "type": "step",
                "id": step["step_id"],
                "phase_id": phase["phase_id"],
            },
            from_status="running",
            to_status=projected,
            payload={"attempt_status": status, "failure_id": failure_id},
            attempt_id=attempt_id,
        )

    def _observation(
        self, symptom: str, source: str, details: dict[str, Any]
    ) -> dict[str, Any]:
        return {
            "observation_id": f"obs-{uuid.uuid4().hex}",
            "observed_at": utc_now(),
            "symptom": symptom,
            "source": source,
            "details": self.redactor.value(details),
        }

    def _failure_symptom(
        self, category: str, result: CommandResult
    ) -> str:
        if category == "timeout":
            return f"Worker timed out after {result.duration_ms} ms."
        if result.returncode != 0:
            return f"Worker exited with code {result.returncode}."
        return f"Controller detected a {category} failure."

    def _classify_worker_failure(self, stderr: str) -> tuple[str, str, str]:
        folded = stderr.casefold()
        if any(token in folded for token in ("429", "rate limit", "too many requests")):
            return "rate_limit", "suspected", "The worker output indicates provider rate limiting."
        if any(
            token in folded
            for token in ("timed out", "connection reset", "dns", "name resolution", "network")
        ):
            return "network", "suspected", "The worker output indicates a network failure."
        if any(
            token in folded
            for token in ("unauthorized", "invalid api key", "authentication", "credential")
        ):
            return "credentials", "suspected", "The worker output indicates invalid credentials."
        if any(token in folded for token in ("permission denied", "access is denied", "forbidden")):
            return "permission", "suspected", "The worker output indicates a permission failure."
        return "worker_failure", "suspected", "The worker exited unsuccessfully; root cause is unconfirmed."

    def _parse_agent_report(self, stdout: str) -> dict[str, Any] | None:
        try:
            value = json.loads(stdout)
        except json.JSONDecodeError:
            return None
        return value if isinstance(value, dict) else None

    def _agent_claimed_success(self, report: dict[str, Any] | None) -> bool:
        if not report:
            return False
        return report.get("status") in {"success", "succeeded", "completed", "passed"}

    def _phase_for_approval(
        self, snapshot: dict[str, Any], approval_id: str
    ) -> dict[str, Any]:
        for phase in snapshot["phases"]:
            if phase["approval"].get("approval_id") == approval_id:
                return phase
        raise HarnessError(f"approval id is not present in the run plan: {approval_id}")

    def _release_artifact_scope(
        self,
        state: dict[str, Any],
        phase: dict[str, Any],
        approval_id: str,
        inputs: dict[str, Any],
    ) -> dict[str, Any]:
        for raw in phase.get("steps", [{}])[0].get("context_files", []):
            if not raw.endswith("production-candidate.json"):
                continue
            path = resolve_inside(self.repo_root, raw)
            if not path.is_file():
                raise HarnessError("production candidate record is missing")
            candidate = read_json(path)
            required = {
                "revision",
                "source_tree_digest",
                "artifact_digest",
                "production_target",
                "public_domain",
                "monitoring_target",
                "production_adapter_id",
                "production_adapter_digest",
                "production_receipt_key_id",
                "production_receipt_source",
            }
            missing = sorted(
                key
                for key in required
                if not isinstance(candidate.get(key), str) or not candidate[key]
            )
            if missing:
                raise HarnessError(
                    f"production candidate is missing scope fields: {missing}"
                )
            expected_inputs = {
                "production_target": inputs.get("production-target"),
                "public_domain": inputs.get("public-domain"),
                "monitoring_target": inputs.get("monitoring-target"),
                "production_adapter_id": inputs.get("production-adapter-id"),
                "production_adapter_digest": inputs.get("production-adapter-digest"),
                "production_receipt_key_id": inputs.get("production-receipt-key-id"),
                "production_receipt_source": inputs.get("production-receipt-source"),
            }
            mismatched = sorted(
                key
                for key, value in expected_inputs.items()
                if candidate.get(key) != value
            )
            if mismatched:
                raise HarnessError(
                    f"production candidate/input scope mismatch: {mismatched}"
                )
            revision = candidate["revision"]
            commit_check = self._git(
                ["cat-file", "-e", f"{revision}^{{commit}}"], check=False
            )
            ancestor_check = self._git(
                ["merge-base", "--is-ancestor", revision, "HEAD"], check=False
            )
            if commit_check.returncode != 0 or ancestor_check.returncode != 0:
                raise HarnessError(
                    "production candidate revision is not an immutable ancestor commit"
                )
            tree = self._git(
                ["rev-parse", f"{revision}^{{tree}}"], check=False
            )
            expected_tree_digest = sha256_bytes(
                f"git-tree:{tree.stdout.strip()}".encode("utf-8")
            )
            if candidate["source_tree_digest"] != expected_tree_digest:
                raise HarnessError(
                    "production candidate source_tree_digest does not match its revision"
                )
            digest_pattern = re.compile(r"^(?:sha256:)?[a-f0-9]{64}$")
            if not digest_pattern.fullmatch(candidate["artifact_digest"]):
                raise HarnessError(
                    "production candidate artifact_digest must be an immutable SHA-256 digest"
                )
            if not digest_pattern.fullmatch(candidate["production_adapter_digest"]):
                raise HarnessError(
                    "production adapter digest must be an immutable SHA-256 digest"
                )
            configured_adapter = self.config.get("adapters", {}).get(
                "production", {}
            )
            configured_digest = str(
                configured_adapter.get("executable_sha256", "")
            )
            candidate_digest = candidate["production_adapter_digest"]
            if configured_digest.startswith("sha256:"):
                configured_digest = configured_digest[7:]
            if candidate_digest.startswith("sha256:"):
                candidate_digest = candidate_digest[7:]
            if (
                candidate["production_adapter_id"]
                != configured_adapter.get("adapter_id")
                or candidate_digest != configured_digest
            ):
                raise HarnessError(
                    "production candidate adapter identity/digest differs from "
                    "the Controller-configured production adapter"
                )
            staging_path = (
                self.repo_root / "docs" / "releases" / "staging-release.json"
            )
            if not staging_path.is_file():
                raise HarnessError("verified staging release evidence is missing")
            staging = read_json(staging_path)
            if staging.get("revision") != candidate["revision"]:
                raise HarnessError(
                    "production candidate revision differs from staging evidence"
                )
            if staging.get("artifact_digest") != candidate["artifact_digest"]:
                raise HarnessError(
                    "production candidate artifact digest differs from staging evidence"
                )
            return {
                "target": candidate["production_target"],
                "public_domain": candidate["public_domain"],
                "monitoring_target": candidate["monitoring_target"],
                "commit": revision,
                "source_tree_digest": candidate["source_tree_digest"],
                "artifact_digest": candidate["artifact_digest"],
                "production_adapter_id": candidate["production_adapter_id"],
                "production_adapter_digest": candidate["production_adapter_digest"],
                "production_receipt_key_id": candidate["production_receipt_key_id"],
                "production_receipt_source": candidate["production_receipt_source"],
            }
        production_side_effect = any(
            step["permissions"].get("production")
            and step["permissions"].get("external_side_effects")
            for step in phase.get("steps", [])
        )
        if production_side_effect:
            raise HarnessError(
                "production approval cannot fall back without production-candidate.json"
            )
        commit = self._git_head()
        fallback = sha256_bytes(
            canonical_json(
                {
                    "run_id": state["run_id"],
                    "approval_id": approval_id,
                    "phase_id": phase["phase_id"],
                    "commit": commit,
                    "plan_sha256": state["plan_snapshot"]["sha256"],
                }
            )
        )
        return {
            "target": inputs.get("production-target") or phase["phase_id"],
            "commit": commit,
            "artifact_digest": fallback,
        }

    def _staging_receipt_error(
        self,
        state: dict[str, Any],
        step: dict[str, Any],
    ) -> str | None:
        receipts = [
            raw
            for raw in step.get("required_artifacts", [])
            if raw.endswith("staging-release.json")
        ]
        if not receipts:
            return None
        if len(receipts) != 1:
            return "a staging deployment step must declare one staging-release.json"
        path = resolve_inside(self.repo_root, receipts[0])
        try:
            receipt = read_json(path)
        except (OSError, json.JSONDecodeError) as exc:
            return f"staging receipt is unreadable: {exc}"
        revision = (
            state["result"]["commits"][-1]
            if state["result"].get("commits")
            else state["source"]["base_commit"]
        )
        tree = self._git(["rev-parse", f"{revision}^{{tree}}"], check=False)
        if tree.returncode != 0:
            return "staging revision is not a valid Controller checkpoint"
        expected_tree_oid = tree.stdout.strip()
        expected_tree_digest = sha256_bytes(
            f"git-tree:{expected_tree_oid}".encode("utf-8")
        )
        adapter = self.config.get("adapters", {}).get("staging", {})
        expected_digest = str(adapter.get("executable_sha256", ""))
        actual_digest = str(receipt.get("deploy_adapter_digest", ""))
        if expected_digest.startswith("sha256:"):
            expected_digest = expected_digest[7:]
        if actual_digest.startswith("sha256:"):
            actual_digest = actual_digest[7:]
        expected = {
            "environment": "staging",
            "target": self.active_inputs.get("staging-target"),
            "url": self.active_inputs.get("staging-base-url"),
            "revision": revision,
            "source_tree_oid": expected_tree_oid,
            "source_tree_digest": expected_tree_digest,
            "deploy_adapter_id": adapter.get("adapter_id"),
        }
        mismatched = sorted(
            key for key, value in expected.items() if receipt.get(key) != value
        )
        if actual_digest != expected_digest:
            mismatched.append("deploy_adapter_digest")
        if mismatched:
            return f"staging receipt scope mismatch: {sorted(set(mismatched))}"
        digest_pattern = re.compile(r"^(?:sha256:)?[a-f0-9]{64}$")
        for key in (
            "artifact_digest",
            "deployment_receipt_digest",
        ):
            if not isinstance(receipt.get(key), str) or not digest_pattern.fullmatch(
                receipt[key]
            ):
                return f"staging receipt has an invalid {key}"
        if receipt.get("status") not in {"deployed", "healthy", "succeeded"}:
            return "staging receipt does not report a successful deployment status"
        if not isinstance(receipt.get("deployment_receipt_id"), str) or not receipt[
            "deployment_receipt_id"
        ]:
            return "staging receipt is missing deployment_receipt_id"
        return None

    def _production_receipt_error(
        self,
        state: dict[str, Any],
        phase: dict[str, Any],
        step: dict[str, Any],
    ) -> str | None:
        receipts = [
            raw
            for raw in step.get("required_artifacts", [])
            if raw.endswith("production-release.json")
        ]
        if len(receipts) != 1:
            return (
                "a production side-effect step must declare exactly one "
                "production-release.json artifact"
            )
        path = resolve_inside(self.repo_root, receipts[0])
        try:
            receipt = read_json(path)
        except (OSError, json.JSONDecodeError) as exc:
            return f"production receipt is unreadable: {exc}"
        challenge = self.approval_challenge(
            state["run_id"], phase["approval"]["approval_id"]
        )
        expected = {
            "revision": challenge.get("commit"),
            "artifact_digest": challenge.get("artifact_digest"),
            "production_target": challenge.get("target"),
            "public_domain": challenge.get("public_domain"),
            "monitoring_target": challenge.get("monitoring_target"),
            "production_adapter_id": challenge.get("production_adapter_id"),
            "production_adapter_digest": challenge.get("production_adapter_digest"),
            "receipt_key_id": challenge.get("production_receipt_key_id"),
            "receipt_source": challenge.get("production_receipt_source"),
            "approval_scope_digest": challenge.get("scope_digest"),
        }
        mismatched = sorted(
            key for key, value in expected.items() if receipt.get(key) != value
        )
        if mismatched:
            return f"production receipt scope mismatch: {mismatched}"
        if receipt.get("receipt_signature_verified") is not True:
            return "production receipt signature was not independently verified"
        if receipt.get("status") not in {"deployed", "healthy", "succeeded"}:
            return "production receipt does not report a successful deployment status"
        for key in ("receipt_id", "receipt_digest", "deployed_at", "verified_at"):
            if not isinstance(receipt.get(key), str) or not receipt[key]:
                return f"production receipt is missing {key}"
        return None

    def _approval_valid(
        self, run_dir: Path, state: dict[str, Any], phase: dict[str, Any]
    ) -> tuple[bool, dict[str, Any]]:
        approval_id = phase["approval"]["approval_id"]
        challenge = self.approval_challenge(state["run_id"], approval_id)
        approvals_path = run_dir / "approvals.json"
        approvals = read_json(approvals_path) if approvals_path.exists() else []
        granted_payloads: list[dict[str, Any]] = []
        with (run_dir / "events.jsonl").open("r", encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                event = json.loads(line)
                if (
                    event.get("event_type") == "approval.granted"
                    and event.get("actor") == "user"
                    and isinstance(event.get("payload"), dict)
                ):
                    granted_payloads.append(event["payload"])
        now = datetime.now(timezone.utc)
        for approval in reversed(approvals):
            if not verify_signed_mapping(approval, self.integrity_key):
                continue
            try:
                expires = datetime.fromisoformat(
                    approval["expires_at"].replace("Z", "+00:00")
                )
            except (KeyError, ValueError):
                continue
            if (
                all(approval.get(key) == value for key, value in challenge.items())
                and expires > now
                and any(payload == approval for payload in granted_payloads)
            ):
                return True, challenge
        return False, {
            **challenge,
            "reason": phase["approval"]["reason"],
            "command": (
                f"python HARNESS/run.py approve --run {state['run_id']} "
                f"--approval-id {approval_id} --approved-by <name>"
            ),
        }

    def _git(self, args: list[str], check: bool = True) -> CommandResult:
        with tempfile.TemporaryDirectory(prefix="harness-empty-hooks-") as hooks:
            result = run_process(
                [
                    "git",
                    "-c",
                    f"core.hooksPath={hooks}",
                    *args,
                ],
                self.repo_root,
                self.environment,
                120,
                int(self.config["policy"].get("max_log_bytes", 262144)),
            )
        if check and result.returncode != 0:
            raise HarnessError(
                self.redactor.text(result.stderr.strip() or f"git {' '.join(args)} failed")
            )
        return result

    def _git_head(self) -> str:
        return self._git(["rev-parse", "HEAD"]).stdout.strip()

    def _git_status_paths(self) -> list[str]:
        result = self._git(
            ["status", "--porcelain=v1", "-z", "--untracked-files=all"]
        )
        tokens = result.stdout.split("\0")
        paths: list[str] = []
        index = 0
        while index < len(tokens):
            token = tokens[index]
            index += 1
            if not token:
                continue
            if len(token) < 4:
                raise HarnessError(f"unexpected git status entry: {token!r}")
            status = token[:2]
            path = token[3:]
            paths.append(normalize_relative(path))
            if "R" in status or "C" in status:
                if index < len(tokens) and tokens[index]:
                    paths.append(normalize_relative(tokens[index]))
                    index += 1
        return sorted(set(paths))

    def _require_clean_worktree(self) -> None:
        if not self.config["policy"].get("require_clean_worktree", True):
            raise PreflightError("require_clean_worktree cannot be disabled")
        dirty = self._git_status_paths()
        if dirty:
            raise PreflightError(
                "dirty worktree: harness will not stash, reset, or absorb user changes: "
                + ", ".join(dirty)
            )
