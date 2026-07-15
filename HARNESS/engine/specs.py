from __future__ import annotations

import copy
import json
import os
import re
from pathlib import Path, PureWindowsPath
from typing import Any, Iterable

from .io import read_json, sha256_file


class SpecError(ValueError):
    pass


PROTECTED_EXACT = {
    "HARNESS/config.json",
    "HARNESS/config.local.json",
    "HARNESS/inputs.local.json",
}
PROTECTED_PREFIXES = (".git", "HARNESS/runs")
SHELL_EXECUTABLES = {
    "sh",
    "sh.exe",
    "bash",
    "bash.exe",
    "zsh",
    "zsh.exe",
    "cmd",
    "cmd.exe",
    "powershell",
    "powershell.exe",
    "pwsh",
    "pwsh.exe",
}
SCRIPT_INTERPRETERS = {
    "python",
    "python.exe",
    "python3",
    "python3.exe",
    "node",
    "node.exe",
    "nodejs",
    "nodejs.exe",
}
SCRIPT_SUFFIXES = {".py", ".pyw", ".js", ".mjs", ".cjs", ".ts"}
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
PHASE_KINDS = {"discovery", "design", "build", "quality", "release", "operations"}
COMPLETION_STAGES = {"passed", "deployed", "observed"}
APPROVAL_MODES = {"none", "before_phase"}
CHECK_TYPES = {"path_exists", "content_contains", "json_valid", "command"}
RETRYABLE_CATEGORIES = {
    "timeout",
    "network",
    "rate_limit",
    "external_service",
    "worker_failure",
    "verification",
}

PHASE_REQUIRED_FIELDS = {
    "schema_version",
    "phase_id",
    "name",
    "kind",
    "objective",
    "required",
    "depends_on",
    "completion_stage",
    "required_inputs",
    "approval",
    "steps",
}
REQUIRED_INPUT_FIELDS = {"key", "description", "secret"}
APPROVAL_FIELDS = {"mode", "approval_id", "reason"}
STEP_REQUIRED_FIELDS = {
    "step_id",
    "name",
    "objective",
    "depends_on",
    "instruction_file",
    "context_files",
    "allowed_paths",
    "required_artifacts",
    "acceptance_checks",
    "retry_policy",
    "permissions",
}
STEP_OPTIONAL_FIELDS = {"secret_inputs"}
CHECK_REQUIRED_FIELDS = {"check_id", "type", "required"}
CHECK_OPTIONAL_FIELDS = {
    "path",
    "values",
    "argv",
    "cwd",
    "timeout_seconds",
    "expected_exit_codes",
}
RETRY_POLICY_FIELDS = {"max_attempts", "backoff_seconds", "retryable_categories"}
PERMISSION_FIELDS = {"network", "external_side_effects", "production"}


def _validate_object_fields(
    value: Any,
    required: set[str],
    optional: set[str],
    label: str,
) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise SpecError(f"{label} must be an object")
    missing = required.difference(value)
    if missing:
        raise SpecError(f"{label} missing fields: {sorted(missing)}")
    unexpected = set(value).difference(required | optional)
    if unexpected:
        raise SpecError(f"{label} has unsupported fields: {sorted(unexpected)}")
    return value


def _validate_nonempty_string(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise SpecError(f"{label} must be a non-empty string")
    return value


def _validate_bool(value: Any, label: str) -> bool:
    if type(value) is not bool:
        raise SpecError(f"{label} must be a boolean")
    return value


def _validate_bounded_integer(
    value: Any,
    minimum: int,
    maximum: int,
    label: str,
) -> int:
    # ``bool`` is a subclass of ``int`` in Python, but JSON Schema treats it as
    # a separate type.  Use an exact type check to preserve that contract.
    if type(value) is not int or not minimum <= value <= maximum:
        raise SpecError(f"{label} must be an integer from {minimum} to {maximum}")
    return value


def _validate_string_array(
    value: Any,
    label: str,
    *,
    min_items: int = 0,
    unique: bool = False,
) -> list[str]:
    if not isinstance(value, list) or len(value) < min_items:
        raise SpecError(f"{label} must be an array with at least {min_items} item(s)")
    if not all(isinstance(item, str) for item in value):
        raise SpecError(f"{label} must contain only strings")
    if unique and len(set(value)) != len(value):
        raise SpecError(f"{label} must not contain duplicates")
    return value


def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = copy.deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = copy.deepcopy(value)
    return merged


def load_config(repo_root: Path) -> dict[str, Any]:
    base = read_json(repo_root / "HARNESS" / "config.json")
    base_environment_value = base.get("worker", {}).get("environment_allowlist", [])
    if not isinstance(base_environment_value, list) or not all(
        isinstance(item, str) and item for item in base_environment_value
    ):
        raise SpecError("worker.environment_allowlist must be a string array")
    base_environment = list(base_environment_value)
    local_path = repo_root / "HARNESS" / "config.local.json"
    if local_path.exists():
        local = read_json(local_path)
        if not isinstance(local, dict):
            raise SpecError("config.local.json must be an object")
        allowed_local_sections = {
            "integrity",
            "worker",
            "adapters",
            "execution_boundary",
            "capabilities",
            "redaction",
        }
        unexpected = sorted(set(local).difference(allowed_local_sections))
        if unexpected:
            raise SpecError(
                "config.local.json cannot override Controller policy/structure: "
                + ", ".join(unexpected)
            )
        base = _deep_merge(base, local)
    configured_environment = base.get("worker", {}).get("environment_allowlist", [])
    if not isinstance(configured_environment, list) or not all(
        isinstance(item, str) and item for item in configured_environment
    ):
        raise SpecError("worker.environment_allowlist must be a string array")
    base.setdefault("worker", {})["environment_allowlist"] = list(
        dict.fromkeys([*base_environment, *configured_environment])
    )
    worker = base.get("worker", {})
    if not isinstance(worker.get("argv", []), list) or not all(
        isinstance(item, str) and item for item in worker.get("argv", [])
    ):
        raise SpecError("worker.argv must be an argv string array")
    if worker.get("prompt_delivery", "stdin") != "stdin":
        raise SpecError("worker.prompt_delivery must be stdin")
    _validate_bounded_integer(
        worker.get("timeout_seconds", 1800), 1, 7200, "worker.timeout_seconds"
    )
    policy = base.get("policy")
    if not isinstance(policy, dict):
        raise SpecError("policy must be an object")
    if policy.get("allow_shell_commands") is not False:
        raise SpecError("policy.allow_shell_commands must remain false")
    if policy.get("require_clean_worktree", True) is not True:
        raise SpecError("policy.require_clean_worktree must remain true")
    if policy.get("auto_push", False) is not False:
        raise SpecError("policy.auto_push is not supported and must remain false")
    if policy.get("production_approval_required") is not True:
        raise SpecError("policy.production_approval_required must remain true")
    integrity_name = base.get("integrity", {}).get("environment_key")
    if not isinstance(integrity_name, str) or not integrity_name:
        raise SpecError("integrity.environment_key must name a controller-only environment variable")
    if not isinstance(base.get("integrity", {}).get("key_id"), str) or not base["integrity"]["key_id"]:
        raise SpecError("integrity.key_id must be non-empty")
    if integrity_name in base["worker"]["environment_allowlist"]:
        raise SpecError("the journal integrity key must never be worker-allowlisted")
    if worker.get("argv"):
        _validate_argv(worker["argv"], False, None)
    credential_environment = worker.get("credential_environment", [])
    if not isinstance(credential_environment, list) or not all(
        isinstance(item, str) and item for item in credential_environment
    ):
        raise SpecError("worker.credential_environment must be a string array")
    if not set(credential_environment).issubset(worker["environment_allowlist"]):
        raise SpecError("worker credential environment must be explicitly allowlisted")
    redacted_names = set(base.get("redaction", {}).get("environment_secret_names", []))
    if not set(credential_environment).issubset(redacted_names):
        raise SpecError("worker credential environment must be explicitly redacted")
    adapters = base.get("adapters", {})
    if not isinstance(adapters, dict):
        raise SpecError("adapters must be an object")
    for name in ("staging", "production"):
        adapter = adapters.get(name, {})
        if not isinstance(adapter, dict):
            raise SpecError(f"adapters.{name} must be an object")
        argv = adapter.get("argv", [])
        if not isinstance(argv, list) or not all(
            isinstance(item, str) and item for item in argv
        ):
            raise SpecError(f"adapters.{name}.argv must be an argv string array")
        if argv:
            _validate_argv(argv, False, None)
            if Path(argv[0]).name.casefold() in SCRIPT_INTERPRETERS:
                raise SpecError(
                    f"adapters.{name}.argv must start with a dedicated signed "
                    "adapter executable, not a general-purpose interpreter"
                )
            _validate_nonempty_string(
                adapter.get("adapter_id"), f"adapters.{name}.adapter_id"
            )
            digest = adapter.get("executable_sha256")
            if not isinstance(digest, str) or not re.fullmatch(
                r"(?:sha256:)?[a-f0-9]{64}", digest
            ):
                raise SpecError(
                    f"adapters.{name}.executable_sha256 must be a SHA-256 digest"
                )
        _validate_bounded_integer(
            adapter.get("timeout_seconds", 1800),
            1,
            7200,
            f"adapters.{name}.timeout_seconds",
        )
    boundary = base.get("execution_boundary", {})
    if not isinstance(boundary, dict):
        raise SpecError("execution_boundary must be an object")
    if type(boundary.get("provider_sandbox_attested", False)) is not bool:
        raise SpecError("execution_boundary.provider_sandbox_attested must be boolean")
    profile = boundary.get("profile", "")
    if not isinstance(profile, str):
        raise SpecError("execution_boundary.profile must be a string")
    if boundary.get("provider_sandbox_attested") and not profile.strip():
        raise SpecError(
            "an attested execution boundary must name its provider sandbox profile"
        )
    capabilities = base.get("capabilities", {})
    if not isinstance(capabilities, dict) or any(
        type(capabilities.get(name, False)) is not bool
        for name in ("network", "external_side_effects", "production")
    ):
        raise SpecError("capabilities must contain boolean network/external/production flags")
    return base


def normalize_relative(raw: str) -> str:
    if not isinstance(raw, str) or not raw.strip():
        raise SpecError("path must be a non-empty string")
    value = raw.replace("\\", "/")
    windows = PureWindowsPath(raw)
    parts = value.split("/")
    if windows.drive or windows.root or value.startswith("/"):
        raise SpecError(f"absolute path is forbidden: {raw}")
    if ":" in value:
        raise SpecError(f"colon/ADS path is forbidden: {raw}")
    if any(part in {"", ".", ".."} for part in parts):
        raise SpecError(f"non-canonical relative path is forbidden: {raw}")
    reserved = {
        "con",
        "prn",
        "aux",
        "nul",
        *(f"com{number}" for number in range(1, 10)),
        *(f"lpt{number}" for number in range(1, 10)),
    }
    for part in parts:
        if part.rstrip(" .") != part:
            raise SpecError(f"Windows trailing dot/space path is forbidden: {raw}")
        if part.split(".", 1)[0].casefold() in reserved:
            raise SpecError(f"Windows reserved device path is forbidden: {raw}")
    return "/".join(parts)


def validate_slug(raw: Any, label: str) -> str:
    if not isinstance(raw, str) or not SLUG_PATTERN.fullmatch(raw):
        raise SpecError(f"{label} must be a lowercase kebab-case slug: {raw!r}")
    return raw


def resolve_inside(repo_root: Path, raw: str) -> Path:
    relative = normalize_relative(raw)
    candidate = (repo_root / relative).resolve(strict=False)
    root = repo_root.resolve(strict=True)
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise SpecError(f"path escapes repository root: {raw}") from exc
    return candidate


def is_protected(raw: str) -> bool:
    value = normalize_relative(raw)
    folded = value.casefold()
    if any(
        part == ".env" or part.startswith(".env.")
        for part in folded.split("/")
    ):
        return True
    if any(part == ".git" for part in folded.split("/")):
        return True
    if folded in {item.casefold() for item in PROTECTED_EXACT}:
        return True
    return any(
        folded == prefix.casefold()
        or folded.startswith(prefix.casefold() + "/")
        for prefix in PROTECTED_PREFIXES
    )


def validate_mutable_path(repo_root: Path, raw: str) -> str:
    value = normalize_relative(raw)
    if is_protected(value):
        raise SpecError(f"protected path cannot be modified by a worker: {value}")
    resolve_inside(repo_root, value)
    return value


def path_is_allowed(path: str, allowed_paths: Iterable[str]) -> bool:
    candidate = normalize_relative(path)
    candidate_cmp = candidate.casefold() if os.name == "nt" else candidate
    for allowed in allowed_paths:
        normalized = normalize_relative(allowed)
        prefix = normalized.casefold() if os.name == "nt" else normalized
        if candidate_cmp == prefix or candidate_cmp.startswith(prefix + "/"):
            return True
    return False


def _validate_argv(
    argv: Any,
    allow_shell: bool,
    allowed_executables: set[str] | None = None,
) -> None:
    if not isinstance(argv, list) or not argv or not all(isinstance(item, str) and item for item in argv):
        raise SpecError("command check argv must be a non-empty string array")
    executable = Path(argv[0]).name.casefold()
    if not allow_shell and executable in SHELL_EXECUTABLES:
        raise SpecError(f"shell interpreter is forbidden in command check: {argv[0]}")
    if allowed_executables is not None and executable not in allowed_executables:
        raise SpecError(f"command executable is not allowlisted: {argv[0]}")
    if not allow_shell and (
        executable.startswith("python")
        or executable in {"node", "node.exe", "nodejs", "nodejs.exe"}
    ):
        if any(item in {"-c", "-e", "--eval"} for item in argv[1:]):
            raise SpecError("inline interpreter commands are forbidden")


def _repo_relative_command_paths(
    repo_root: Path,
    argv: list[str],
    cwd: str = ".",
) -> set[str]:
    """Return verifier executable/script paths that resolve inside the repository.

    Bare allowlisted executables such as ``python`` and ``npm`` are not repository
    paths.  For Python/Node, the first script-like positional argument is also a
    verifier input.  This intentionally errs toward recognizing a script so a
    release worker cannot rewrite the verifier it is about to invoke.
    """

    candidates: list[str] = []
    executable = Path(argv[0]).name.casefold()
    raw_executable = argv[0]
    if (
        "/" in raw_executable
        or "\\" in raw_executable
        or Path(raw_executable).suffix.casefold() in SCRIPT_SUFFIXES
    ):
        candidates.append(raw_executable)

    if executable in SCRIPT_INTERPRETERS:
        option_values = {
            "-W",
            "-X",
            "--check-hash-based-pycs",
            "--require",
            "-r",
            "--loader",
            "--import",
        }
        skip_next = False
        for argument in argv[1:]:
            if skip_next:
                skip_next = False
                continue
            if argument in {"-m", "--module"}:
                # Module execution does not name a repository script path.
                break
            if argument in option_values:
                skip_next = True
                continue
            if argument == "--":
                continue
            if argument.startswith("-"):
                continue
            candidates.append(argument)
            break

    resolved: set[str] = set()
    root = repo_root.resolve(strict=True)
    normalized_cwd = "" if cwd == "." else normalize_relative(cwd)
    for raw in candidates:
        windows = PureWindowsPath(raw)
        if windows.drive or windows.root or raw.startswith(("/", "\\")):
            continue
        try:
            normalized = normalize_relative(raw)
            if normalized_cwd:
                normalized = normalize_relative(f"{normalized_cwd}/{normalized}")
            candidate = (root / normalized).resolve(strict=False)
            candidate.relative_to(root)
        except (SpecError, ValueError):
            continue
        resolved.add(normalized)
    return resolved


def _paths_overlap(left: str, right: str) -> bool:
    return path_is_allowed(left, [right]) or path_is_allowed(right, [left])


def _validate_phase(
    repo_root: Path,
    phase: dict[str, Any],
    allow_shell: bool,
    command_executables: set[str],
    known_generated: set[str],
) -> set[str]:
    phase = _validate_object_fields(
        phase,
        PHASE_REQUIRED_FIELDS,
        set(),
        "phase",
    )
    if type(phase["schema_version"]) is not int or phase["schema_version"] != 1:
        raise SpecError("phase.schema_version must be the integer 1")
    phase_id = validate_slug(phase["phase_id"], "phase_id")
    _validate_nonempty_string(phase["name"], f"phase {phase_id} name")
    if not isinstance(phase["kind"], str) or phase["kind"] not in PHASE_KINDS:
        raise SpecError(f"phase {phase_id} kind is unsupported: {phase['kind']!r}")
    _validate_nonempty_string(phase["objective"], f"phase {phase_id} objective")
    _validate_bool(phase["required"], f"phase {phase_id} required")

    phase_dependencies = _validate_string_array(
        phase["depends_on"],
        f"phase {phase_id} depends_on",
        unique=True,
    )
    for dependency in phase_dependencies:
        validate_slug(dependency, "phase dependency")

    completion_stage = phase["completion_stage"]
    if not isinstance(completion_stage, str) or completion_stage not in COMPLETION_STAGES:
        raise SpecError(
            f"phase {phase_id} completion_stage is unsupported: {completion_stage!r}"
        )

    required_inputs = phase["required_inputs"]
    if not isinstance(required_inputs, list):
        raise SpecError(f"phase {phase_id} required_inputs must be an array")
    required_input_keys: set[str] = set()
    for position, requirement in enumerate(required_inputs):
        requirement = _validate_object_fields(
            requirement,
            REQUIRED_INPUT_FIELDS,
            set(),
            f"phase {phase_id} required_inputs[{position}]",
        )
        key = validate_slug(requirement["key"], "required input key")
        if key in required_input_keys:
            raise SpecError(f"duplicate required input key in {phase_id}: {key}")
        required_input_keys.add(key)
        _validate_nonempty_string(
            requirement["description"],
            f"phase {phase_id} required input {key} description",
        )
        _validate_bool(
            requirement["secret"],
            f"phase {phase_id} required input {key} secret",
        )

    approval = _validate_object_fields(
        phase["approval"],
        APPROVAL_FIELDS,
        set(),
        f"phase {phase_id} approval",
    )
    approval_mode = approval["mode"]
    if not isinstance(approval_mode, str) or approval_mode not in APPROVAL_MODES:
        raise SpecError(
            f"phase {phase_id} approval mode is unsupported: {approval_mode!r}"
        )
    approval_id = approval["approval_id"]
    if approval_id is not None:
        validate_slug(approval_id, "approval_id")
    approval_reason = approval["reason"]
    if approval_reason is not None and not isinstance(approval_reason, str):
        raise SpecError(f"phase {phase_id} approval reason must be a string or null")
    if approval_mode == "before_phase":
        if approval_id is None:
            raise SpecError(
                f"phase {phase_id} before_phase approval requires a non-empty approval_id"
            )
        _validate_nonempty_string(
            approval_reason,
            f"phase {phase_id} before_phase approval reason",
        )

    steps = phase["steps"]
    if not isinstance(steps, list) or not steps:
        raise SpecError(f"phase {phase_id} steps must be a non-empty array")
    step_ids: set[str] = set()
    generated = set(known_generated)
    secret_input_keys = {
        requirement["key"]
        for requirement in required_inputs
        if requirement["secret"]
    }
    for position, step in enumerate(steps):
        step = _validate_object_fields(
            step,
            STEP_REQUIRED_FIELDS,
            STEP_OPTIONAL_FIELDS,
            f"phase {phase_id} steps[{position}]",
        )
        step_id = step["step_id"]
        validate_slug(step_id, "step_id")
        if step_id in step_ids:
            raise SpecError(f"duplicate step id in {phase_id}: {step_id}")
        step_ids.add(step_id)
        _validate_nonempty_string(step["name"], f"step {phase_id}/{step_id} name")
        _validate_nonempty_string(
            step["objective"], f"step {phase_id}/{step_id} objective"
        )

        dependencies = _validate_string_array(
            step["depends_on"],
            f"step {phase_id}/{step_id} depends_on",
            unique=True,
        )
        for dependency in dependencies:
            validate_slug(dependency, "step dependency")
            if dependency not in step_ids:
                raise SpecError(
                    f"step dependency must refer to an earlier step: "
                    f"{phase_id}/{dependency}"
                )

        instruction = normalize_relative(step["instruction_file"])
        if not resolve_inside(repo_root, instruction).is_file():
            raise SpecError(f"instruction file does not exist: {instruction}")

        context_files = _validate_string_array(
            step["context_files"],
            f"step {phase_id}/{step_id} context_files",
            unique=True,
        )
        normalized_contexts: set[str] = set()
        for context in context_files:
            context_path = resolve_inside(repo_root, context)
            normalized_context = normalize_relative(context)
            if normalized_context in normalized_contexts:
                raise SpecError(
                    f"step {phase_id}/{step_id} context_files must not contain duplicates"
                )
            normalized_contexts.add(normalized_context)
            generated_context = any(
                normalized_context == item
                or normalized_context.startswith(item + "/")
                or item.startswith(normalized_context + "/")
                for item in generated
            )
            if not context_path.exists() and not generated_context:
                raise SpecError(f"context file does not exist: {context}")

        allowed_paths = _validate_string_array(
            step["allowed_paths"],
            f"step {phase_id}/{step_id} allowed_paths",
            min_items=1,
            unique=True,
        )
        normalized_allowed_paths: list[str] = []
        for allowed in allowed_paths:
            normalized = validate_mutable_path(repo_root, allowed)
            if normalized in normalized_allowed_paths:
                raise SpecError(
                    f"step {phase_id}/{step_id} allowed_paths must not contain duplicates"
                )
            normalized_allowed_paths.append(normalized)

        secret_inputs = _validate_string_array(
            step.get("secret_inputs", []),
            f"step {phase_id}/{step_id} secret_inputs",
            unique=True,
        )
        for secret_input in secret_inputs:
            validate_slug(secret_input, "step secret input")
            if secret_input not in secret_input_keys:
                raise SpecError(
                    f"step references an undeclared secret input: "
                    f"{phase_id}/{step_id}/{secret_input}"
                )

        required_artifacts = _validate_string_array(
            step["required_artifacts"],
            f"step {phase_id}/{step_id} required_artifacts",
            unique=True,
        )
        normalized_artifacts: list[str] = []
        for artifact in required_artifacts:
            normalized_artifact = normalize_relative(artifact)
            resolve_inside(repo_root, normalized_artifact)
            if normalized_artifact in normalized_artifacts:
                raise SpecError(
                    f"step {phase_id}/{step_id} required_artifacts must not contain duplicates"
                )
            normalized_artifacts.append(normalized_artifact)

        checks = step["acceptance_checks"]
        if not isinstance(checks, list) or not checks:
            raise SpecError(f"step has no acceptance checks: {phase_id}/{step_id}")
        check_ids: set[str] = set()
        verifier_paths: set[str] = set()
        for check_position, check in enumerate(checks):
            check = _validate_object_fields(
                check,
                CHECK_REQUIRED_FIELDS,
                CHECK_OPTIONAL_FIELDS,
                f"step {phase_id}/{step_id} acceptance_checks[{check_position}]",
            )
            check_id = check["check_id"]
            validate_slug(check_id, "check_id")
            if check_id in check_ids:
                raise SpecError(f"duplicate check id: {check_id}")
            check_ids.add(check_id)
            kind = check["type"]
            if not isinstance(kind, str) or kind not in CHECK_TYPES:
                raise SpecError(f"unsupported check type: {kind!r}")
            _validate_bool(
                check["required"],
                f"check {phase_id}/{step_id}/{check_id} required",
            )

            if "path" in check:
                resolve_inside(repo_root, check["path"])
            if kind in {"path_exists", "content_contains", "json_valid"}:
                if "path" not in check:
                    raise SpecError(f"{kind} check requires path: {check_id}")
            if "values" in check:
                _validate_string_array(
                    check["values"],
                    f"check {phase_id}/{step_id}/{check_id} values",
                )
            if kind == "content_contains":
                if "values" not in check or not check["values"]:
                    raise SpecError(f"content_contains check requires values: {check_id}")

            if "cwd" in check:
                if check["cwd"] != ".":
                    resolve_inside(repo_root, check["cwd"])
                elif not isinstance(check["cwd"], str):
                    raise SpecError(f"command check cwd must be a relative path: {check_id}")
            if "timeout_seconds" in check:
                _validate_bounded_integer(
                    check["timeout_seconds"],
                    1,
                    7200,
                    f"check {phase_id}/{step_id}/{check_id} timeout_seconds",
                )
            if "expected_exit_codes" in check:
                expected = check["expected_exit_codes"]
                if not isinstance(expected, list) or not expected:
                    raise SpecError(
                        f"check {phase_id}/{step_id}/{check_id} "
                        "expected_exit_codes must be a non-empty integer array"
                    )
                if not all(type(code) is int for code in expected):
                    raise SpecError(
                        f"check {phase_id}/{step_id}/{check_id} "
                        "expected_exit_codes must contain only integers"
                    )
            if "argv" in check:
                _validate_argv(
                    check["argv"],
                    allow_shell,
                    command_executables,
                )
            if kind == "command":
                if "argv" not in check:
                    raise SpecError(f"command check requires argv: {check_id}")
                verifier_paths.update(
                    _repo_relative_command_paths(
                        repo_root,
                        check["argv"],
                        check.get("cwd", "."),
                    )
                )

        retry_policy = _validate_object_fields(
            step["retry_policy"],
            RETRY_POLICY_FIELDS,
            set(),
            f"step {phase_id}/{step_id} retry_policy",
        )
        max_attempts = _validate_bounded_integer(
            retry_policy["max_attempts"],
            1,
            10,
            f"step {phase_id}/{step_id} retry max_attempts",
        )
        backoff_seconds = retry_policy["backoff_seconds"]
        if not isinstance(backoff_seconds, list) or not backoff_seconds:
            raise SpecError(
                f"step {phase_id}/{step_id} retry backoff_seconds must be non-empty"
            )
        for delay in backoff_seconds:
            _validate_bounded_integer(
                delay,
                0,
                3600,
                f"step {phase_id}/{step_id} retry backoff_seconds item",
            )
        if len(backoff_seconds) < max_attempts:
            raise SpecError(
                f"step {phase_id}/{step_id} retry backoff_seconds must provide "
                f"at least {max_attempts} entries"
            )
        retryable_categories = retry_policy["retryable_categories"]
        if not isinstance(retryable_categories, list):
            raise SpecError(
                f"step {phase_id}/{step_id} retryable_categories must be an array"
            )
        if len(set(map(str, retryable_categories))) != len(retryable_categories):
            raise SpecError(
                f"step {phase_id}/{step_id} retryable_categories must not contain duplicates"
            )
        for category in retryable_categories:
            if not isinstance(category, str) or category not in RETRYABLE_CATEGORIES:
                raise SpecError(
                    f"step {phase_id}/{step_id} has unsupported retry category: "
                    f"{category!r}"
                )

        permissions = _validate_object_fields(
            step["permissions"],
            PERMISSION_FIELDS,
            set(),
            f"step {phase_id}/{step_id} permissions",
        )
        for permission in PERMISSION_FIELDS:
            _validate_bool(
                permissions[permission],
                f"step {phase_id}/{step_id} permission {permission}",
            )
        if permissions["external_side_effects"] and (
            max_attempts != 1 or retryable_categories
        ):
            raise SpecError(
                f"external side-effect step {phase_id}/{step_id} must use exactly "
                "one attempt and no automatic retry categories"
            )
        if permissions["production"] and permissions["external_side_effects"]:
            if approval_mode != "before_phase":
                raise SpecError(
                    f"production side-effect step {phase_id}/{step_id} requires "
                    "approval.mode=before_phase"
                )
            if not isinstance(approval_id, str) or not approval_id:
                raise SpecError(
                    f"production side-effect step {phase_id}/{step_id} requires "
                    "a non-empty approval_id"
                )
            if not isinstance(approval_reason, str) or not approval_reason.strip():
                raise SpecError(
                    f"production side-effect step {phase_id}/{step_id} requires "
                    "a non-empty approval reason"
                )
        if permissions["external_side_effects"] or permissions["production"]:
            for verifier_path in verifier_paths:
                if any(
                    _paths_overlap(verifier_path, allowed_path)
                    for allowed_path in normalized_allowed_paths
                ):
                    raise SpecError(
                        f"release verifier path overlaps worker allowed_paths: "
                        f"{phase_id}/{step_id}/{verifier_path}"
                    )

        generated.update(
            normalize_relative(artifact)
            for artifact in required_artifacts
        )
        generated.update(
            normalize_relative(allowed)
            for allowed in allowed_paths
        )
    return generated


def load_plan(repo_root: Path, config: dict[str, Any]) -> dict[str, Any]:
    index_path = resolve_inside(repo_root, config["phase_index"])
    index = read_json(index_path)
    if index.get("schema_version") != 1 or index.get("project_id") != config.get("project_id"):
        raise SpecError("phase index schema_version/project_id does not match config")
    entries = index.get("phases")
    if not isinstance(entries, list) or not entries:
        raise SpecError("phase index must contain at least one phase")
    phases: list[dict[str, Any]] = []
    identifiers: set[str] = set()
    generated_artifacts: set[str] = set()
    for entry in entries:
        phase_id = entry.get("phase_id")
        validate_slug(phase_id, "phase index id")
        if not phase_id or phase_id in identifiers:
            raise SpecError(f"duplicate or missing phase id: {phase_id}")
        manifest_path = resolve_inside(repo_root, entry.get("manifest", ""))
        phase = read_json(manifest_path)
        if phase.get("phase_id") != phase_id:
            raise SpecError(f"index/manifest phase id mismatch: {phase_id}")
        generated_artifacts = _validate_phase(
            repo_root,
            phase,
            config["policy"].get("allow_shell_commands", False),
            {
                Path(item).name.casefold()
                for item in config["policy"].get("command_executables", [])
            },
            generated_artifacts,
        )
        phase["_manifest"] = normalize_relative(entry["manifest"])
        phase["_sha256"] = sha256_file(manifest_path)
        phases.append(phase)
        identifiers.add(phase_id)
    completed: set[str] = set()
    for phase in phases:
        for dependency in phase.get("depends_on", []):
            if dependency not in completed:
                raise SpecError(
                    f"phase dependency must refer to an earlier phase: {phase['phase_id']}/{dependency}"
                )
        completed.add(phase["phase_id"])
    return {
        "schema_version": 1,
        "project_id": index["project_id"],
        "index_path": normalize_relative(config["phase_index"]),
        "index_sha256": sha256_file(index_path),
        "phases": phases,
    }


def public_plan(plan: dict[str, Any]) -> dict[str, Any]:
    value = copy.deepcopy(plan)
    for phase in value["phases"]:
        phase.pop("_manifest", None)
        phase.pop("_sha256", None)
    return value


def validate_inputs(plan: dict[str, Any], inputs: dict[str, Any], target_stage: str) -> list[str]:
    rank = {"passed": 0, "deployed": 1, "observed": 2}
    missing: list[str] = []
    for phase in plan["phases"]:
        if rank[phase["completion_stage"]] > rank[target_stage]:
            continue
        for requirement in phase.get("required_inputs", []):
            key = requirement["key"]
            if key not in inputs or inputs[key] is None or inputs[key] == "":
                missing.append(f"{phase['phase_id']}:{key}")
    return missing
