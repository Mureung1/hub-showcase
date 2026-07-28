#!/usr/bin/env python3
"""Reproduce and verify the exact official Codex Python SDK snapshot.

This module deliberately keeps generation mechanics separate from the Node
runtime.  ``generate`` is the only command that mutates the tracked snapshot;
``verify`` performs two clean regenerations in temporary directories and
compares them with the tracked snapshot and manifest.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import platform
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any, Iterable, Mapping, Sequence


SOURCE_COMMIT = "8c68d4c87dc54d38861f5114e920c3de2efa5876"
SOURCE_TAG = "rust-v0.144.4"
SOURCE_REPOSITORY = "https://github.com/openai/codex"
SDK_DISTRIBUTION = "openai-codex"
SDK_VERSION = "0.0.0.dev0"
SDK_PYPROJECT_VERSION = "0.0.0-dev"
RUNTIME_DISTRIBUTION = "openai-codex-cli-bin"
RUNTIME_VERSION = "0.144.4"
ORIGINAL_RUNTIME_VERSION = "0.137.0a4"
GENERATION_PYTHON_VERSION = "3.10.12"
UV_VERSION = "0.8.13"
GENERATOR_PYDANTIC_VERSION = "2.13.4"
GENERATOR_DATAMODEL_CODE_GENERATOR_VERSION = "0.31.2"
GENERATOR_RUFF_VERSION = "0.15.8"
SUITE_RUFF_VERSION = "0.15.12"
BUILD_BACKEND_VERSION = "0.11.19"
PYPI_INDEX = "https://pypi.org/simple"

# The dependency cutoff preserves the dependency universe reviewed with the
# exact source.  The runtime cutoff is after the 0.144.4 wheel upload and is
# intentionally separate from the general dependency cutoff.
ORIGINAL_RUNTIME_CUTOFF = "2026-06-03T19:00:00Z"
DEPENDENCY_CUTOFF = "2026-06-04T00:00:00Z"
RUNTIME_CUTOFF = "2026-07-15T00:16:00Z"

LOCK_RELATIVE_CUTOFF = (
    'exclude-newer = "0001-01-01T00:00:00Z" # This has no effect and is included for '
    "backwards compatibility when using relative exclude-newer values.\n"
    'exclude-newer-span = "P7D"'
)

SOURCE_EXPORT_PATHS = (
    "LICENSE",
    "NOTICE",
    "sdk/python",
    "sdk/python-runtime",
    "justfile",
    "scripts/format.py",
)

GENERATED_FILES = (
    "sdk/python/src/openai_codex/generated/v2_all.py",
    "sdk/python/src/openai_codex/generated/notification_registry.py",
    "sdk/python/src/openai_codex/api.py",
)

# ``api.py`` is handwritten around four generated convenience-method blocks.
API_GENERATED_BLOCKS = (
    "Codex.flat_methods",
    "AsyncCodex.flat_methods",
    "Thread.flat_methods",
    "AsyncThread.flat_methods",
)

EXPECTED_TEST_RUNTIME_OCCURRENCES = 8
EXPECTED_PUBLIC_SIGNATURE_ADAPTATIONS = 2
EXPECTED_SCHEMA_EXPECTATION_ADAPTATIONS = 1
EXPECTED_TOMLLIB_COMPAT_ADAPTATIONS = 2

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = PACKAGE_ROOT.parents[1]
DEFAULT_SOURCE_ROOT = REPOSITORY_ROOT / "references" / "openai-codex"
SNAPSHOT_ROOT = PACKAGE_ROOT / "python" / "openai-codex"
UNPATCHED_MANIFEST_PATH = PACKAGE_ROOT / "manifests" / "unpatched.json"
PATCHED_SOURCE_MANIFEST_PATH = PACKAGE_ROOT / "manifests" / "patched-source.json"
ARTIFACT_ROOT = REPOSITORY_ROOT.parent / ".ay-ple" / "cache" / "exact-sdk"
UPSTREAM_ROOT = PACKAGE_ROOT / "upstream"
PATCH_ROOT = UPSTREAM_ROOT / "patches"
PROVENANCE_FILES = ("LICENSE", "NOTICE")
BEHAVIORAL_PATCHES = (
    (
        "0001-response-last-router",
        PATCH_ROOT / "0001-response-last-router.patch",
        (
            "sdk/python/src/openai_codex/_message_router.py",
            "sdk/python/tests/test_client_rpc_methods.py",
        ),
    ),
    (
        "0002-bounded-notification-routing",
        PATCH_ROOT / "0002-bounded-notification-routing.patch",
        (
            "sdk/python/src/openai_codex/_message_router.py",
            "sdk/python/tests/test_client_rpc_methods.py",
        ),
    ),
    (
        "0003-router-review-corrections",
        PATCH_ROOT / "0003-router-review-corrections.patch",
        (
            "sdk/python/src/openai_codex/_message_router.py",
            "sdk/python/tests/test_client_rpc_methods.py",
        ),
    ),
    (
        "0004-notification-opt-out-config",
        PATCH_ROOT / "0004-notification-opt-out-config.patch",
        (
            "sdk/python/src/openai_codex/client.py",
            "sdk/python/tests/test_client_rpc_methods.py",
        ),
    ),
    (
        "0005-strict-response-classification",
        PATCH_ROOT / "0005-strict-response-classification.patch",
        (
            "sdk/python/src/openai_codex/_message_router.py",
            "sdk/python/tests/test_client_rpc_methods.py",
        ),
    ),
    (
        "0006-plan-user-input-seam",
        PATCH_ROOT / "0006-plan-user-input-seam.patch",
        (
            "sdk/python/scripts/update_sdk_artifacts.py",
            "sdk/python/src/openai_codex/__init__.py",
            "sdk/python/src/openai_codex/api.py",
            "sdk/python/src/openai_codex/async_client.py",
            "sdk/python/src/openai_codex/client.py",
            "sdk/python/src/openai_codex/errors.py",
            "sdk/python/src/openai_codex/models.py",
            "sdk/python/src/openai_codex/types.py",
            "sdk/python/tests/test_public_api_signatures.py",
        ),
    ),
    (
        "0007-thread-start-settings",
        PATCH_ROOT / "0007-thread-start-settings.patch",
        (
            "sdk/python/scripts/update_sdk_artifacts.py",
            "sdk/python/src/openai_codex/api.py",
            "sdk/python/tests/test_public_api_runtime_behavior.py",
        ),
    ),
)
_stable_python: str | None = None


class ExactSdkError(RuntimeError):
    """Raised when exact-source or generated-artifact evidence drifts."""


@dataclass(frozen=True)
class BuildResult:
    """One clean exact-SDK build held in a caller-owned temporary directory."""

    snapshot_root: Path
    wheel_path: Path
    manifest: dict[str, Any]
    manifest_bytes: bytes


@dataclass(frozen=True)
class BehavioralPatchStage:
    """Source rosters immediately before and after one ordered patch."""

    patch_id: str
    before_files: dict[str, dict[str, Any]]
    after_files: dict[str, dict[str, Any]]


def _validate_behavioral_patch_stage(
    stage: BehavioralPatchStage,
    changed_paths: Sequence[str],
) -> None:
    """Require one stage to change exactly its declared source paths."""

    if set(stage.after_files) != set(stage.before_files):
        raise ExactSdkError(
            f"behavioral patch changed the source file roster: {stage.patch_id}"
        )
    declared_changed_paths = set(changed_paths)
    actual_changed_paths = {
        relative
        for relative, after in stage.after_files.items()
        if stage.before_files.get(relative) != after
    }
    if actual_changed_paths != declared_changed_paths:
        raise ExactSdkError(
            f"behavioral patch changed undeclared source paths: {stage.patch_id}; "
            f"declared={sorted(declared_changed_paths)}, "
            f"actual={sorted(actual_changed_paths)}"
        )


def _run(
    args: Sequence[str],
    *,
    cwd: Path,
    env: Mapping[str, str] | None = None,
    capture_output: bool = False,
) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            list(args),
            cwd=cwd,
            env=dict(env) if env is not None else None,
            text=True,
            capture_output=capture_output,
            check=True,
        )
    except FileNotFoundError as error:
        raise ExactSdkError(f"required command is unavailable: {args[0]}") from error
    except subprocess.CalledProcessError as error:
        detail = (error.stderr or error.stdout or "").strip()
        suffix = f": {detail}" if detail else ""
        raise ExactSdkError(f"command failed ({' '.join(args)}){suffix}") from error


def _git(source_root: Path, *args: str) -> str:
    return _run(
        ("git", *args),
        cwd=source_root,
        capture_output=True,
    ).stdout.strip()


def check_source_oracle(
    source_root: Path = DEFAULT_SOURCE_ROOT,
    *,
    expected_commit: str = SOURCE_COMMIT,
    expected_tag: str = SOURCE_TAG,
) -> None:
    """Require the exact tagged, clean official source checkout."""

    source_root = source_root.resolve()
    if not source_root.is_dir():
        raise ExactSdkError(f"official source checkout is missing: {source_root}")

    actual_commit = _git(source_root, "rev-parse", "HEAD")
    if actual_commit != expected_commit:
        raise ExactSdkError(
            f"official source commit drift: expected {expected_commit}, got {actual_commit}"
        )

    tags = set(
        filter(None, _git(source_root, "tag", "--points-at", "HEAD").splitlines())
    )
    if expected_tag not in tags:
        raise ExactSdkError(
            f"official source tag drift: {expected_tag!r} does not point at {actual_commit}"
        )

    dirty = _git(source_root, "status", "--porcelain", "--untracked-files=all")
    if dirty:
        raise ExactSdkError(
            "official source checkout is dirty; refusing exact generation"
        )


def _safe_archive_path(name: str) -> PurePosixPath:
    path = PurePosixPath(name)
    if path.is_absolute() or not path.parts or ".." in path.parts:
        raise ExactSdkError(f"unsafe path in git archive: {name!r}")
    return path


def export_committed_source(
    source_root: Path,
    destination: Path,
    *,
    commit: str = SOURCE_COMMIT,
    export_paths: Sequence[str] = SOURCE_EXPORT_PATHS,
) -> tuple[str, ...]:
    """Export only committed files and return the canonical regular-file roster."""

    destination = destination.resolve()
    if destination.exists():
        raise ExactSdkError(f"export destination already exists: {destination}")
    destination.mkdir(parents=True)

    # ``text=False`` is not available through _run because all other commands
    # need readable diagnostics; obtain the archive bytes in one dedicated call.
    try:
        archive_bytes = subprocess.run(
            ["git", "archive", "--format=tar", commit, "--", *export_paths],
            cwd=source_root,
            capture_output=True,
            check=True,
        ).stdout
    except subprocess.CalledProcessError as error:
        raise ExactSdkError("failed to export committed official source") from error

    regular_files: list[str] = []
    with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:") as archive_file:
        for member in archive_file.getmembers():
            relative = _safe_archive_path(member.name)
            target = destination.joinpath(*relative.parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
                target.chmod(stat.S_IMODE(member.mode))
                continue
            if not member.isfile():
                raise ExactSdkError(
                    f"unsupported non-regular entry in official source archive: {member.name}"
                )
            target.parent.mkdir(parents=True, exist_ok=True)
            source = archive_file.extractfile(member)
            if source is None:
                raise ExactSdkError(f"could not read archived file: {member.name}")
            target.write_bytes(source.read())
            target.chmod(stat.S_IMODE(member.mode))
            regular_files.append(relative.as_posix())

    if not regular_files:
        raise ExactSdkError("official source archive contained no regular files")
    return tuple(sorted(regular_files))


def _replace_guarded(
    text: str,
    old: str,
    new: str,
    *,
    expected_count: int,
    label: str,
) -> tuple[str, int]:
    actual_count = text.count(old)
    if actual_count != expected_count:
        raise ExactSdkError(
            f"{label} drift: expected {expected_count} occurrence(s), got {actual_count}"
        )
    return text.replace(old, new), actual_count


def _align_public_signature_expectations(sdk_root: Path) -> int:
    path = sdk_root / "tests" / "test_public_api_signatures.py"
    source = path.read_text(encoding="utf-8")
    replacements = 0
    for marker in ("Codex.thread_fork:", "AsyncCodex.thread_fork:"):
        try:
            start = source.index(marker)
            end = source.index("        ],", start)
        except ValueError as error:
            raise ExactSdkError(
                f"public signature test marker drift: {marker}"
            ) from error
        block = source[start:end]
        old = '            "ephemeral",\n            "model",'
        updated, count = _replace_guarded(
            block,
            old,
            '            "ephemeral",\n            "last_turn_id",\n            "model",',
            expected_count=1,
            label=f"public signature block {marker}",
        )
        source = source[:start] + updated + source[end:]
        replacements += count
    if replacements != EXPECTED_PUBLIC_SIGNATURE_ADAPTATIONS:
        raise ExactSdkError("unexpected public signature adaptation count")
    path.write_text(source, encoding="utf-8")
    return replacements


def _align_schema_expectation(sdk_root: Path) -> int:
    path = sdk_root / "tests" / "test_artifact_workflow_and_binaries.py"
    source = path.read_text(encoding="utf-8")
    source, count = _replace_guarded(
        source,
        '        "CommandExecOutputStream",\n        "AutoCompactTokenLimitScope",',
        '        "CommandExecOutputStream",\n'
        '        "ConsumeAccountRateLimitResetCreditOutcome",\n'
        '        "AutoCompactTokenLimitScope",',
        expected_count=EXPECTED_SCHEMA_EXPECTATION_ADAPTATIONS,
        label="schema normalization expectation",
    )
    path.write_text(source, encoding="utf-8")
    return count


def _align_python_310_test_imports(sdk_root: Path) -> int:
    """Keep the upstream >=3.10 test suite runnable before tomllib exists."""

    fallback = (
        "try:\n"
        "    import tomllib\n"
        "except ModuleNotFoundError:  # Python 3.10\n"
        "    import tomli as tomllib\n"
    )
    adaptations = (
        (
            sdk_root / "tests" / "test_artifact_workflow_and_binaries.py",
            "import pytest\nimport tomllib\nfrom pydantic import ValidationError",
            f"import pytest\n\n{fallback}from pydantic import ValidationError",
        ),
        (
            sdk_root / "tests" / "test_public_api_signatures.py",
            "from typing import Any\n\nimport tomllib\n\nimport openai_codex",
            f"from typing import Any\n\n{fallback}\nimport openai_codex",
        ),
    )
    replacements = 0
    for path, old, new in adaptations:
        source = path.read_text(encoding="utf-8")
        source, count = _replace_guarded(
            source,
            old,
            new,
            expected_count=1,
            label=f"Python 3.10 tomllib compatibility in {path.name}",
        )
        path.write_text(source, encoding="utf-8")
        replacements += count
    if replacements != EXPECTED_TOMLLIB_COMPAT_ADAPTATIONS:
        raise ExactSdkError("unexpected Python 3.10 test import adaptation count")
    return replacements


def adapt_exact_runtime_contract(sdk_root: Path) -> dict[str, int]:
    """Apply guarded exact-pin and generated-test alignment to an exported SDK."""

    pyproject_path = sdk_root / "pyproject.toml"
    pyproject = pyproject_path.read_text(encoding="utf-8")
    if pyproject.count(f'version = "{SDK_PYPROJECT_VERSION}"') != 1:
        raise ExactSdkError("upstream SDK distribution version drift")
    pyproject, build_backend_count = _replace_guarded(
        pyproject,
        'requires = ["uv_build>=0.11.19,<0.12"]',
        f'requires = ["uv_build=={BUILD_BACKEND_VERSION}"]',
        expected_count=1,
        label="SDK build backend",
    )
    pyproject, runtime_pin_count = _replace_guarded(
        pyproject,
        f"{RUNTIME_DISTRIBUTION}=={ORIGINAL_RUNTIME_VERSION}",
        f"{RUNTIME_DISTRIBUTION}=={RUNTIME_VERSION}",
        expected_count=1,
        label="SDK runtime dependency",
    )
    pyproject, general_cutoff_count = _replace_guarded(
        pyproject,
        'exclude-newer = "7 days"',
        f'exclude-newer = "{DEPENDENCY_CUTOFF}"',
        expected_count=2,
        label="SDK dependency cutoff",
    )
    pyproject, runtime_cutoff_count = _replace_guarded(
        pyproject,
        "exclude-newer-package = { openai-codex-cli-bin = "
        f'"{ORIGINAL_RUNTIME_CUTOFF}" }}',
        f'exclude-newer-package = {{ openai-codex-cli-bin = "{RUNTIME_CUTOFF}" }}',
        expected_count=2,
        label="SDK runtime upload cutoff",
    )
    pyproject_path.write_text(pyproject, encoding="utf-8")

    lock_path = sdk_root / "uv.lock"
    lock = lock_path.read_text(encoding="utf-8")
    lock, lock_runtime_cutoff_count = _replace_guarded(
        lock,
        ORIGINAL_RUNTIME_CUTOFF,
        RUNTIME_CUTOFF,
        expected_count=1,
        label="lock runtime upload cutoff",
    )
    lock, lock_general_cutoff_count = _replace_guarded(
        lock,
        LOCK_RELATIVE_CUTOFF,
        f'exclude-newer = "{DEPENDENCY_CUTOFF}"',
        expected_count=1,
        label="lock dependency cutoff",
    )
    lock_path.write_text(lock, encoding="utf-8")

    test_runtime_occurrences = 0
    for path in sorted((sdk_root / "tests").rglob("*.py")):
        source = path.read_text(encoding="utf-8")
        count = source.count(ORIGINAL_RUNTIME_VERSION)
        if count:
            path.write_text(
                source.replace(ORIGINAL_RUNTIME_VERSION, RUNTIME_VERSION),
                encoding="utf-8",
            )
            test_runtime_occurrences += count
    if test_runtime_occurrences != EXPECTED_TEST_RUNTIME_OCCURRENCES:
        raise ExactSdkError(
            "official runtime test evidence drift: expected "
            f"{EXPECTED_TEST_RUNTIME_OCCURRENCES}, got {test_runtime_occurrences}"
        )

    public_signature_count = _align_public_signature_expectations(sdk_root)
    schema_expectation_count = _align_schema_expectation(sdk_root)
    tomllib_compat_count = _align_python_310_test_imports(sdk_root)

    # Guard the distinction that motivated this package: the SDK distribution
    # keeps its own upstream version while its generated runtime contract moves.
    final_pyproject = pyproject_path.read_text(encoding="utf-8")
    if f'version = "{SDK_PYPROJECT_VERSION}"' not in final_pyproject:
        raise ExactSdkError("SDK distribution version changed during adaptation")

    return {
        "build_backend": build_backend_count,
        "runtime_dependency": runtime_pin_count,
        "dependency_cutoff": general_cutoff_count + lock_general_cutoff_count,
        "runtime_cutoff": runtime_cutoff_count + lock_runtime_cutoff_count,
        "runtime_test_evidence": test_runtime_occurrences,
        "public_signatures": public_signature_count,
        "schema_expectation": schema_expectation_count,
        "tomllib_test_compat": tomllib_compat_count,
    }


def _tool_lookup_environment() -> dict[str, str]:
    """Return the narrow host environment needed to locate pinned local tools."""

    env = {
        key: os.environ[key]
        for key in (
            "COMSPEC",
            "HOME",
            "PATH",
            "PATHEXT",
            "SYSTEMROOT",
        )
        if key in os.environ
    }
    env["UV_NO_CONFIG"] = "true"
    env["UV_PYTHON_DOWNLOADS"] = "never"
    return env


def _require_exact_python_identity(
    implementation: str, version: str, *, context: str
) -> None:
    if implementation != "CPython" or version != GENERATION_PYTHON_VERSION:
        raise ExactSdkError(
            f"{context} requires CPython {GENERATION_PYTHON_VERSION}, "
            f"got {implementation} {version}"
        )


def _generation_python() -> str:
    """Resolve the preinstalled 3.10 interpreter without an ephemeral uv shim."""

    global _stable_python
    if _stable_python is None:
        result = _run(
            (
                "uv",
                "python",
                "find",
                "--system",
                "--no-project",
                "--no-config",
                "--no-python-downloads",
                "3.10",
            ),
            cwd=PACKAGE_ROOT,
            env=_tool_lookup_environment(),
            capture_output=True,
        )
        candidate = result.stdout.strip()
        if not candidate or not Path(candidate).is_file():
            raise ExactSdkError("could not resolve a preinstalled CPython 3.10")
        identity_output = _run(
            (
                candidate,
                "-c",
                "import json, platform; "
                "print(json.dumps({'implementation': "
                "platform.python_implementation(), "
                "'version': platform.python_version()}, sort_keys=True))",
            ),
            cwd=PACKAGE_ROOT,
            env=_tool_lookup_environment(),
            capture_output=True,
        ).stdout.strip()
        try:
            identity = json.loads(identity_output)
            implementation = str(identity["implementation"])
            version = str(identity["version"])
        except (json.JSONDecodeError, KeyError, TypeError) as error:
            raise ExactSdkError(
                f"could not identify generation interpreter: {identity_output!r}"
            ) from error
        _require_exact_python_identity(
            implementation,
            version,
            context="exact generation",
        )
        _stable_python = candidate
    return _stable_python


def _generation_environment(isolation_root: Path) -> dict[str, str]:
    """Build a caller-independent environment for generation and verification."""

    isolation_root = isolation_root.resolve()
    controlled_directories = {
        "CODEX_HOME": isolation_root / "codex-home",
        "CODEX_SQLITE_HOME": isolation_root / "codex-sqlite-home",
        "HOME": isolation_root / "home",
        "TMPDIR": isolation_root / "tmp",
        "UV_CACHE_DIR": isolation_root / "uv-cache",
        "XDG_CACHE_HOME": isolation_root / "xdg-cache",
        "XDG_CONFIG_HOME": isolation_root / "xdg-config",
        "XDG_DATA_HOME": isolation_root / "xdg-data",
    }
    for path in controlled_directories.values():
        path.mkdir(parents=True, exist_ok=True)

    # Network proxy and certificate settings affect transport availability but
    # cannot select a package index. Package selection is fixed below and every
    # locked artifact is still hash-verified by uv.
    env = {
        key: os.environ[key]
        for key in (
            "COMSPEC",
            "HTTP_PROXY",
            "HTTPS_PROXY",
            "NO_PROXY",
            "PATH",
            "PATHEXT",
            "SSL_CERT_DIR",
            "SSL_CERT_FILE",
            "SYSTEMROOT",
            "http_proxy",
            "https_proxy",
            "no_proxy",
        )
        if key in os.environ
    }
    env.update({key: str(path) for key, path in controlled_directories.items()})
    env.update(
        {
            "LANG": "C",
            "LC_ALL": "C",
            "PYTHONDONTWRITEBYTECODE": "1",
            "PYTHONUTF8": "1",
            "TZ": "UTC",
            "UV_DEFAULT_INDEX": PYPI_INDEX,
            "UV_INDEX_STRATEGY": "first-index",
            "UV_NO_ENV_FILE": "true",
            "UV_PYTHON": _generation_python(),
            "UV_PYTHON_DOWNLOADS": "never",
        }
    )
    return env


def _uv_version(
    *, cwd: Path = PACKAGE_ROOT, env: Mapping[str, str] | None = None
) -> str:
    output = _run(
        ("uv", "--version"),
        cwd=cwd,
        env=env or _tool_lookup_environment(),
        capture_output=True,
    ).stdout.strip()
    fields = output.split()
    if len(fields) < 2 or fields[0] != "uv":
        raise ExactSdkError(f"could not parse uv version: {output!r}")
    if fields[1] != UV_VERSION:
        raise ExactSdkError(
            f"exact generation requires uv {UV_VERSION}, got {fields[1]}"
        )
    return fields[1]


def _require_generation_toolchain() -> None:
    _require_exact_python_identity(
        platform.python_implementation(),
        platform.python_version(),
        context="exact generation runner",
    )
    _uv_version()
    _generation_python()


def _generator_command() -> tuple[str, ...]:
    """Return the exact isolated tool environment for the official generator."""

    return (
        "uv",
        "run",
        "--isolated",
        "--no-project",
        "--no-config",
        "--no-env-file",
        "--python",
        _generation_python(),
        "--no-python-downloads",
        "--default-index",
        PYPI_INDEX,
        "--with",
        f"pydantic=={GENERATOR_PYDANTIC_VERSION}",
        "--with",
        f"datamodel-code-generator=={GENERATOR_DATAMODEL_CODE_GENERATOR_VERSION}",
        "--with",
        f"ruff=={GENERATOR_RUFF_VERSION}",
        "--with",
        f"{RUNTIME_DISTRIBUTION}=={RUNTIME_VERSION}",
        "python",
        "scripts/update_sdk_artifacts.py",
        "generate-types",
    )


def _refresh_generated_contract(sdk_root: Path, isolation_root: Path) -> None:
    env = _generation_environment(isolation_root)
    # Generate before resolving the SDK suite lock. The official maintenance
    # script runs in the exact outer environment used by the validated spike;
    # the SDK lock intentionally resolves its own (newer) Ruff suite version.
    _run(_generator_command(), cwd=sdk_root, env=env)
    _run(
        (
            "uv",
            "lock",
            "--upgrade-package",
            RUNTIME_DISTRIBUTION,
            "--default-index",
            PYPI_INDEX,
            "--index-strategy",
            "first-index",
            "--python",
            _generation_python(),
            "--no-python-downloads",
        ),
        cwd=sdk_root,
        env=env,
    )
    _run(
        (
            "uv",
            "lock",
            "--check",
            "--default-index",
            PYPI_INDEX,
            "--index-strategy",
            "first-index",
            "--python",
            _generation_python(),
            "--no-python-downloads",
        ),
        cwd=sdk_root,
        env=env,
    )


def _source_epoch(source_root: Path) -> str:
    epoch = _git(source_root, "show", "-s", "--format=%ct", SOURCE_COMMIT)
    if not epoch.isdigit():
        raise ExactSdkError("official source commit epoch is not numeric")
    return epoch


def _build_wheel(
    sdk_root: Path,
    output_root: Path,
    source_root: Path,
    isolation_root: Path,
    *,
    build_wheelhouse: Path | None = None,
) -> Path:
    output_root.mkdir(parents=True)
    env = _generation_environment(isolation_root)
    env["SOURCE_DATE_EPOCH"] = _source_epoch(source_root)
    index_args = (
        (
            "--no-index",
            "--find-links",
            str(build_wheelhouse.resolve()),
            "--offline",
        )
        if build_wheelhouse is not None
        else (
            "--default-index",
            PYPI_INDEX,
            "--index-strategy",
            "first-index",
        )
    )
    _run(
        (
            "uv",
            "build",
            "--wheel",
            "--force-pep517",
            *index_args,
            "--python",
            _generation_python(),
            "--no-python-downloads",
            "--out-dir",
            str(output_root),
            str(sdk_root),
        ),
        cwd=sdk_root,
        env=env,
    )
    wheels = sorted(output_root.glob("openai_codex-*.whl"))
    if len(wheels) != 1:
        raise ExactSdkError(f"expected exactly one SDK wheel, found {len(wheels)}")
    expected_name = f"openai_codex-{SDK_VERSION}-py3-none-any.whl"
    if wheels[0].name != expected_name:
        raise ExactSdkError(
            f"SDK wheel version drift: expected {expected_name}, got {wheels[0].name}"
        )
    return wheels[0]


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _file_record(path: Path) -> dict[str, Any]:
    executable = bool(path.stat().st_mode & stat.S_IXUSR)
    return {
        "bytes": path.stat().st_size,
        # Git preserves only the executable bit for regular files. Recording a
        # checkout's umask-derived 0644/0664 mode would make a clean clone fail
        # verification even though the tracked artifact is identical.
        "git_mode": "100755" if executable else "100644",
        "sha256": sha256_file(path),
    }


def _copy_roster(source_root: Path, destination: Path, roster: Iterable[str]) -> None:
    destination.mkdir(parents=True)
    for relative in sorted(roster):
        source = source_root / relative
        if not source.is_file():
            raise ExactSdkError(f"expected exported source file is missing: {relative}")
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def _extract_generated_api_blocks(api_path: Path) -> dict[str, dict[str, Any]]:
    source = api_path.read_text(encoding="utf-8")
    records: dict[str, dict[str, Any]] = {}
    for name in API_GENERATED_BLOCKS:
        begin = f"    # BEGIN GENERATED: {name}"
        end = f"    # END GENERATED: {name}"
        if source.count(begin) != 1 or source.count(end) != 1:
            raise ExactSdkError(f"generated api.py block marker drift: {name}")
        start_index = source.index(begin)
        end_index = source.index(end, start_index) + len(end)
        block = source[start_index:end_index].encode("utf-8")
        records[name] = {"bytes": len(block), "sha256": _sha256_bytes(block)}
    return records


def _prepare_suite_environment(
    sdk_root: Path,
    environment_root: Path,
    isolation_root: Path,
) -> dict[str, str]:
    """Sync the official locked suite outside the source/snapshot tree."""

    env = _generation_environment(isolation_root)
    env["UV_PROJECT_ENVIRONMENT"] = str(environment_root.resolve())
    _run(
        (
            "uv",
            "sync",
            "--all-groups",
            "--locked",
            "--default-index",
            PYPI_INDEX,
            "--index-strategy",
            "first-index",
            "--python",
            _generation_python(),
            "--no-python-downloads",
        ),
        cwd=sdk_root,
        env=env,
    )
    return env


def _suite_tool_versions(sdk_root: Path, env: Mapping[str, str]) -> dict[str, str]:
    probe = (
        "import importlib.metadata as m, json; "
        "print(json.dumps({name: m.version(name) for name in "
        "['datamodel-code-generator','pydantic','ruff','pytest',"
        "'openai-codex-cli-bin']}, "
        "sort_keys=True))"
    )
    result = _run(
        (
            "uv",
            "run",
            "--locked",
            "--no-sync",
            "--no-env-file",
            "--default-index",
            PYPI_INDEX,
            "--index-strategy",
            "first-index",
            "--python",
            _generation_python(),
            "--no-python-downloads",
            "python",
            "-c",
            probe,
        ),
        cwd=sdk_root,
        env=env,
        capture_output=True,
    )
    versions = {
        str(name): str(value) for name, value in json.loads(result.stdout).items()
    }
    expected = {
        "datamodel-code-generator": GENERATOR_DATAMODEL_CODE_GENERATOR_VERSION,
        "openai-codex-cli-bin": RUNTIME_VERSION,
        "pydantic": GENERATOR_PYDANTIC_VERSION,
        "ruff": SUITE_RUFF_VERSION,
    }
    drift = {
        name: {"expected": version, "actual": versions.get(name)}
        for name, version in expected.items()
        if versions.get(name) != version
    }
    if drift:
        raise ExactSdkError(f"locked official suite tool drift: {drift}")
    return {
        "python": platform.python_version(),
        "uv": _uv_version(cwd=sdk_root, env=env),
        **versions,
    }


def _runtime_binary_version(sdk_root: Path, env: Mapping[str, str]) -> str:
    probe = "from codex_cli_bin import bundled_codex_path; print(bundled_codex_path())"
    binary = _run(
        (
            "uv",
            "run",
            "--locked",
            "--no-sync",
            "--no-env-file",
            "--default-index",
            PYPI_INDEX,
            "--index-strategy",
            "first-index",
            "--python",
            _generation_python(),
            "--no-python-downloads",
            "python",
            "-c",
            probe,
        ),
        cwd=sdk_root,
        env=env,
        capture_output=True,
    ).stdout.strip()
    if not binary:
        raise ExactSdkError("runtime package did not resolve a Codex binary")
    output = _run(
        (binary, "--version"), cwd=sdk_root, capture_output=True
    ).stdout.strip()
    expected = f"codex-cli {RUNTIME_VERSION}"
    if output != expected:
        raise ExactSdkError(f"runtime binary drift: expected {expected}, got {output}")
    return output


def _canonical_json(value: Mapping[str, Any]) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True) + "\n").encode("utf-8")


def assert_portable_manifest(
    manifest: Mapping[str, Any],
    *,
    forbidden_paths: Iterable[Path] = (),
) -> None:
    """Reject timestamps and checkout-local absolute paths in tracked evidence."""

    forbidden_keys = {
        "absolute_path",
        "generated_at",
        "source_date_epoch",
        "timestamp",
    }
    roots = [str(path.resolve()) for path in forbidden_paths]

    def visit(value: Any) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                if key in forbidden_keys:
                    raise ExactSdkError(
                        f"manifest contains forbidden volatile key: {key}"
                    )
                visit(child)
            return
        if isinstance(value, list):
            for child in value:
                visit(child)
            return
        if isinstance(value, str):
            for root in roots:
                if root and root in value:
                    raise ExactSdkError("manifest contains an absolute local path")
            if not value.startswith(("http://", "https://")) and (
                PurePosixPath(value).is_absolute()
                or PureWindowsPath(value).is_absolute()
            ):
                raise ExactSdkError("manifest contains an absolute filesystem path")

    visit(manifest)


def _build_environment_identity() -> dict[str, Any]:
    """Describe the interpreter build and platform without volatile local paths."""

    version_info = sys.version_info
    return {
        "platform": {
            "machine": platform.machine(),
            "system": platform.system(),
        },
        "python": {
            "build": {
                "abi_flags": sys.abiflags,
                "cache_tag": sys.implementation.cache_tag,
                "compiler": platform.python_compiler(),
                "hexversion": f"{sys.hexversion:08x}",
                "release_level": version_info.releaselevel,
                "serial": version_info.serial,
            },
            "implementation": platform.python_implementation(),
            "version": platform.python_version(),
        },
    }


def _build_manifest(
    snapshot_root: Path,
    wheel_path: Path,
    *,
    roster: Sequence[str],
    adaptations: Mapping[str, int],
    source_root: Path,
    work_root: Path,
    runtime_binary_version: str,
    suite_tools: Mapping[str, str],
) -> dict[str, Any]:
    files = {
        relative: _file_record(snapshot_root / relative) for relative in sorted(roster)
    }
    generated = {
        relative: files[relative] for relative in GENERATED_FILES if relative in files
    }
    if tuple(sorted(generated)) != tuple(sorted(GENERATED_FILES)):
        missing = sorted(set(GENERATED_FILES) - set(generated))
        raise ExactSdkError(f"generated authority is missing from snapshot: {missing}")

    manifest: dict[str, Any] = {
        "schema_version": 1,
        "source": {
            "commit": SOURCE_COMMIT,
            "repository": SOURCE_REPOSITORY,
            "tag": SOURCE_TAG,
        },
        "sdk": {
            "distribution": SDK_DISTRIBUTION,
            "version": SDK_VERSION,
        },
        "runtime": {
            "binary_version": runtime_binary_version,
            "distribution": RUNTIME_DISTRIBUTION,
            "version": RUNTIME_VERSION,
        },
        "build_environment": _build_environment_identity(),
        "adaptations": dict(sorted(adaptations.items())),
        "tools": {
            "build": {
                "backend": "uv_build",
                "version": BUILD_BACKEND_VERSION,
            },
            "generation": {
                "datamodel-code-generator": (
                    GENERATOR_DATAMODEL_CODE_GENERATOR_VERSION
                ),
                "openai-codex-cli-bin": RUNTIME_VERSION,
                "pydantic": GENERATOR_PYDANTIC_VERSION,
                "python": GENERATION_PYTHON_VERSION,
                "ruff": GENERATOR_RUFF_VERSION,
                "uv": UV_VERSION,
            },
            "suite": dict(sorted(suite_tools.items())),
        },
        "source_file_count": len(files),
        "files": files,
        "generated": {
            "files": generated,
            "api_blocks": _extract_generated_api_blocks(
                snapshot_root / "sdk" / "python" / "src" / "openai_codex" / "api.py"
            ),
        },
        "lock": {
            "path": "sdk/python/uv.lock",
            **files["sdk/python/uv.lock"],
        },
        "licenses": {
            name: {
                "source_path": name,
                "tracked_path": f"upstream/{name}",
                **files[name],
            }
            for name in PROVENANCE_FILES
        },
        "wheel": {"name": wheel_path.name, **_file_record(wheel_path)},
    }
    assert_portable_manifest(
        manifest,
        forbidden_paths=(REPOSITORY_ROOT, PACKAGE_ROOT, source_root, work_root),
    )
    return manifest


def build_clean_once(source_root: Path, output_root: Path) -> BuildResult:
    """Regenerate one exact source snapshot and deterministic SDK wheel."""

    _require_generation_toolchain()
    check_source_oracle(source_root)
    output_root = output_root.resolve()
    if output_root.exists():
        raise ExactSdkError(f"clean build output already exists: {output_root}")
    output_root.mkdir(parents=True)

    exported_root = output_root / "export"
    roster = export_committed_source(source_root, exported_root)
    sdk_root = exported_root / "sdk" / "python"
    isolation_root = output_root / "isolated-environment"
    adaptations = adapt_exact_runtime_contract(sdk_root)
    _refresh_generated_contract(sdk_root, isolation_root)
    suite_environment = _prepare_suite_environment(
        sdk_root,
        output_root / "suite-environment",
        isolation_root,
    )
    suite_tools = _suite_tool_versions(sdk_root, suite_environment)
    runtime_binary_version = _runtime_binary_version(sdk_root, suite_environment)
    wheel = _build_wheel(
        sdk_root,
        output_root / "dist",
        source_root,
        isolation_root,
    )

    clean_snapshot = output_root / "snapshot"
    _copy_roster(exported_root, clean_snapshot, roster)
    manifest = _build_manifest(
        clean_snapshot,
        wheel,
        roster=roster,
        adaptations=adaptations,
        source_root=source_root,
        work_root=output_root,
        runtime_binary_version=runtime_binary_version,
        suite_tools=suite_tools,
    )
    return BuildResult(
        snapshot_root=clean_snapshot,
        wheel_path=wheel,
        manifest=manifest,
        manifest_bytes=_canonical_json(manifest),
    )


def _snapshot_records(root: Path) -> dict[str, dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {}
    if not root.is_dir():
        raise ExactSdkError(f"tracked SDK snapshot is missing: {root}")
    for path in sorted(
        candidate for candidate in root.rglob("*") if candidate.is_file()
    ):
        relative = path.relative_to(root).as_posix()
        records[relative] = _file_record(path)
    return records


def verify_snapshot_against_manifest(
    snapshot_root: Path,
    manifest: Mapping[str, Any],
) -> None:
    expected = manifest.get("files")
    if not isinstance(expected, dict):
        raise ExactSdkError("manifest files roster is invalid")
    actual = _snapshot_records(snapshot_root)
    if actual != expected:
        missing = sorted(set(expected) - set(actual))
        extra = sorted(set(actual) - set(expected))
        changed = sorted(
            key for key in set(actual) & set(expected) if actual[key] != expected[key]
        )
        raise ExactSdkError(
            "tracked SDK snapshot drift: "
            f"missing={missing}, extra={extra}, changed={changed}"
        )


def _replace_snapshot(source: Path, destination: Path) -> None:
    staged = destination.with_name(f".{destination.name}.new")
    if staged.exists():
        shutil.rmtree(staged)
    staged.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, staged, copy_function=shutil.copy2)
    if destination.exists():
        shutil.rmtree(destination)
    staged.replace(destination)


def _replace_file(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    staged = destination.with_name(f".{destination.name}.new")
    shutil.copy2(source, staged)
    staged.replace(destination)


def apply_behavioral_patches(
    snapshot_root: Path,
) -> tuple[BehavioralPatchStage, ...]:
    """Apply the reviewed patch series and retain every ordered source stage."""

    stages: list[BehavioralPatchStage] = []
    before_files = _snapshot_records(snapshot_root)
    for patch_id, patch_path, changed_paths in BEHAVIORAL_PATCHES:
        if not patch_path.is_file():
            raise ExactSdkError(f"behavioral patch is missing: {patch_id}")
        _run(
            (
                "git",
                "apply",
                "--check",
                "--unidiff-zero",
                "--whitespace=error-all",
                str(patch_path),
            ),
            cwd=snapshot_root,
            capture_output=True,
        )
        _run(
            (
                "git",
                "apply",
                "--unidiff-zero",
                "--whitespace=error-all",
                str(patch_path),
            ),
            cwd=snapshot_root,
            capture_output=True,
        )
        stage = BehavioralPatchStage(
            patch_id=patch_id,
            before_files=before_files,
            after_files=_snapshot_records(snapshot_root),
        )
        _validate_behavioral_patch_stage(stage, changed_paths)
        stages.append(stage)
        before_files = stage.after_files
    return tuple(stages)


def derive_patched_source(
    unpatched_root: Path,
    patched_root: Path,
) -> tuple[BehavioralPatchStage, ...]:
    """Copy an exact unpatched tree and apply the reviewed patch series."""

    roster = _snapshot_records(unpatched_root)
    _copy_roster(unpatched_root, patched_root, roster)
    return apply_behavioral_patches(patched_root)


def _replay_behavioral_patch_stages(
    unpatched_root: Path,
) -> tuple[BehavioralPatchStage, ...]:
    """Recover stage evidence for callers that only retained the final tree."""

    with tempfile.TemporaryDirectory(prefix="ay-ple-patch-stages-") as temp:
        replay_root = Path(temp) / "patched"
        return derive_patched_source(unpatched_root, replay_root)


def _build_patched_source_manifest(
    unpatched_root: Path,
    patched_root: Path,
    unpatched_manifest: Mapping[str, Any],
    patch_stages: Sequence[BehavioralPatchStage] | None = None,
) -> dict[str, Any]:
    """Describe a deterministic patched source derivation without a wheel."""

    verify_snapshot_against_manifest(unpatched_root, unpatched_manifest)
    base_files = unpatched_manifest.get("files")
    if not isinstance(base_files, dict):
        raise ExactSdkError("unpatched manifest files roster is invalid")
    patched_files = _snapshot_records(patched_root)
    if set(patched_files) != set(base_files):
        raise ExactSdkError("behavioral patches changed the source file roster")

    if patch_stages is None:
        patch_stages = _replay_behavioral_patch_stages(unpatched_root)
    if len(patch_stages) != len(BEHAVIORAL_PATCHES):
        raise ExactSdkError("behavioral patch stage count drift")
    expected_patch_ids = [patch_id for patch_id, _path, _changed in BEHAVIORAL_PATCHES]
    actual_patch_ids = [stage.patch_id for stage in patch_stages]
    if actual_patch_ids != expected_patch_ids:
        raise ExactSdkError(
            "behavioral patch stage order drift: "
            f"expected={expected_patch_ids}, actual={actual_patch_ids}"
        )
    for (_patch_id, _patch_path, changed_paths), stage in zip(
        BEHAVIORAL_PATCHES,
        patch_stages,
    ):
        _validate_behavioral_patch_stage(stage, changed_paths)
    if patch_stages:
        if patch_stages[0].before_files != base_files:
            raise ExactSdkError(
                "first behavioral patch stage does not match base source"
            )
        for previous, current in zip(patch_stages, patch_stages[1:]):
            if previous.after_files != current.before_files:
                raise ExactSdkError(
                    "behavioral patch stages are not contiguous: "
                    f"{previous.patch_id} -> {current.patch_id}"
                )
        if patch_stages[-1].after_files != patched_files:
            raise ExactSdkError(
                "last behavioral patch stage does not match patched source"
            )
    elif patched_files != base_files:
        raise ExactSdkError("patched source changed without a behavioral patch stage")

    declared_changed_paths = {
        relative
        for _patch_id, _patch_path, changed_paths in BEHAVIORAL_PATCHES
        for relative in changed_paths
    }
    actual_changed_paths = {
        relative
        for relative, after in patched_files.items()
        if base_files.get(relative) != after
    }
    undeclared_changed_paths = actual_changed_paths - declared_changed_paths
    if undeclared_changed_paths:
        raise ExactSdkError(
            "behavioral patch changed undeclared source paths: "
            f"declared={sorted(declared_changed_paths)}, "
            f"actual={sorted(actual_changed_paths)}"
        )

    patch_entries: list[dict[str, Any]] = []
    for order, ((patch_id, patch_path, changed_paths), stage) in enumerate(
        zip(BEHAVIORAL_PATCHES, patch_stages),
        start=1,
    ):
        changed: dict[str, Any] = {}
        for relative in changed_paths:
            before = stage.before_files.get(relative)
            after = stage.after_files.get(relative)
            if not isinstance(before, dict) or not isinstance(after, dict):
                raise ExactSdkError(
                    f"behavioral patch path is missing from source roster: {relative}"
                )
            if before == after:
                raise ExactSdkError(
                    f"behavioral patch did not change its declared path: {relative}"
                )
            changed[relative] = {"after": after, "before": before}
        patch_entries.append(
            {
                "changed_files": changed,
                "id": patch_id,
                "order": order,
                "path": patch_path.relative_to(PACKAGE_ROOT).as_posix(),
                **_file_record(patch_path),
            }
        )

    manifest: dict[str, Any] = {
        "schema_version": 1,
        "kind": "patched_source",
        "base": {
            "manifest": UNPATCHED_MANIFEST_PATH.relative_to(PACKAGE_ROOT).as_posix(),
            "sha256": sha256_file(UNPATCHED_MANIFEST_PATH),
            "source_commit": SOURCE_COMMIT,
        },
        "patches": patch_entries,
        "patch_stack_sha256": _sha256_bytes(
            _canonical_json({"patches": patch_entries})
        ),
        "source_file_count": len(patched_files),
        "source_tree_sha256": _sha256_bytes(_canonical_json({"files": patched_files})),
        "files": patched_files,
    }
    assert_portable_manifest(
        manifest,
        forbidden_paths=(REPOSITORY_ROOT, PACKAGE_ROOT, unpatched_root, patched_root),
    )
    return manifest


def _load_patched_source_manifest() -> dict[str, Any]:
    if not PATCHED_SOURCE_MANIFEST_PATH.is_file():
        raise ExactSdkError(
            "tracked patched-source manifest is missing: "
            f"{PATCHED_SOURCE_MANIFEST_PATH}"
        )
    try:
        value = json.loads(PATCHED_SOURCE_MANIFEST_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ExactSdkError(
            "tracked patched-source manifest is not valid JSON"
        ) from error
    if not isinstance(value, dict):
        raise ExactSdkError("tracked patched-source manifest must be an object")
    assert_portable_manifest(
        value,
        forbidden_paths=(REPOSITORY_ROOT, PACKAGE_ROOT, DEFAULT_SOURCE_ROOT),
    )
    return value


def verify_provenance_files(
    snapshot_root: Path,
    manifest: Mapping[str, Any],
) -> None:
    licenses = manifest.get("licenses")
    if not isinstance(licenses, dict):
        raise ExactSdkError("manifest license evidence is invalid")
    for name in PROVENANCE_FILES:
        evidence = licenses.get(name)
        if not isinstance(evidence, dict):
            raise ExactSdkError(f"manifest is missing {name} provenance")
        if evidence.get("source_path") != name:
            raise ExactSdkError(f"manifest {name} source path drift")
        if evidence.get("tracked_path") != f"upstream/{name}":
            raise ExactSdkError(f"manifest {name} tracked path drift")

        source = snapshot_root / name
        tracked = UPSTREAM_ROOT / name
        if not source.is_file() or not tracked.is_file():
            raise ExactSdkError(f"tracked upstream {name} is missing")
        if source.read_bytes() != tracked.read_bytes():
            raise ExactSdkError(f"tracked upstream {name} bytes drift")
        expected_record = {
            key: evidence.get(key) for key in ("bytes", "git_mode", "sha256")
        }
        if (
            _file_record(source) != expected_record
            or _file_record(tracked) != expected_record
        ):
            raise ExactSdkError(f"tracked upstream {name} digest drift")


def generate(source_root: Path = DEFAULT_SOURCE_ROOT) -> None:
    """Refresh the exact unpatched snapshot and patched-source derivation."""

    with tempfile.TemporaryDirectory(prefix="ay-ple-exact-sdk-generate-") as temp:
        temp_root = Path(temp)
        result = build_clean_once(source_root.resolve(), temp_root / "run")
        existing_unpatched = (
            UNPATCHED_MANIFEST_PATH.read_bytes()
            if UNPATCHED_MANIFEST_PATH.is_file()
            else None
        )
        if (
            existing_unpatched is not None
            and existing_unpatched != result.manifest_bytes
        ):
            raise ExactSdkError(
                "refusing to rewrite immutable unpatched manifest after behavioral patches"
            )
        _replace_snapshot(result.snapshot_root, SNAPSHOT_ROOT)
        for name in PROVENANCE_FILES:
            _replace_file(result.snapshot_root / name, UPSTREAM_ROOT / name)
        verify_provenance_files(SNAPSHOT_ROOT, result.manifest)
        UNPATCHED_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
        if existing_unpatched is None:
            staged_manifest = UNPATCHED_MANIFEST_PATH.with_suffix(".json.new")
            staged_manifest.write_bytes(result.manifest_bytes)
            staged_manifest.replace(UNPATCHED_MANIFEST_PATH)

        patched_root = temp_root / "patched-source"
        patch_stages = derive_patched_source(result.snapshot_root, patched_root)
        patched_manifest = _build_patched_source_manifest(
            result.snapshot_root,
            patched_root,
            result.manifest,
            patch_stages,
        )
        staged_patched_manifest = PATCHED_SOURCE_MANIFEST_PATH.with_suffix(".json.new")
        staged_patched_manifest.write_bytes(_canonical_json(patched_manifest))
        staged_patched_manifest.replace(PATCHED_SOURCE_MANIFEST_PATH)

        wheel_root = ARTIFACT_ROOT / "wheels"
        if wheel_root.exists():
            shutil.rmtree(wheel_root)
        wheel_root.mkdir(parents=True)
        shutil.copy2(result.wheel_path, wheel_root / result.wheel_path.name)

    print(
        json.dumps(
            {
                "manifest": UNPATCHED_MANIFEST_PATH.relative_to(
                    PACKAGE_ROOT
                ).as_posix(),
                "patched_source_manifest": PATCHED_SOURCE_MANIFEST_PATH.relative_to(
                    PACKAGE_ROOT
                ).as_posix(),
                "snapshot": SNAPSHOT_ROOT.relative_to(PACKAGE_ROOT).as_posix(),
                "wheel": result.manifest["wheel"],
            },
            sort_keys=True,
        )
    )


def _load_tracked_manifest() -> dict[str, Any]:
    if not UNPATCHED_MANIFEST_PATH.is_file():
        raise ExactSdkError(
            f"tracked exact SDK manifest is missing: {UNPATCHED_MANIFEST_PATH}"
        )
    try:
        value = json.loads(UNPATCHED_MANIFEST_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ExactSdkError("tracked exact SDK manifest is not valid JSON") from error
    if not isinstance(value, dict):
        raise ExactSdkError("tracked exact SDK manifest must be an object")
    assert_portable_manifest(
        value,
        forbidden_paths=(REPOSITORY_ROOT, PACKAGE_ROOT, DEFAULT_SOURCE_ROOT),
    )
    return value


def _assert_same_build(first: BuildResult, second: BuildResult) -> None:
    if first.manifest_bytes != second.manifest_bytes:
        raise ExactSdkError("two clean exact SDK runs produced different manifests")
    if first.wheel_path.read_bytes() != second.wheel_path.read_bytes():
        raise ExactSdkError("two clean exact SDK runs produced different wheel bytes")
    first_records = _snapshot_records(first.snapshot_root)
    second_records = _snapshot_records(second.snapshot_root)
    if first_records != second_records:
        raise ExactSdkError("two clean exact SDK runs produced different snapshots")


def verify(source_root: Path = DEFAULT_SOURCE_ROOT) -> None:
    """Non-mutating two-run regeneration and tracked-drift verification."""

    source_root = source_root.resolve()
    check_source_oracle(source_root)
    tracked_manifest_bytes = (
        UNPATCHED_MANIFEST_PATH.read_bytes()
        if UNPATCHED_MANIFEST_PATH.is_file()
        else b""
    )
    tracked_snapshot_before = _snapshot_records(SNAPSHOT_ROOT)
    tracked_manifest = _load_tracked_manifest()
    tracked_patched_manifest = _load_patched_source_manifest()
    tracked_patched_manifest_bytes = PATCHED_SOURCE_MANIFEST_PATH.read_bytes()
    tracked_patch_bytes = {
        patch_path: patch_path.read_bytes()
        for _patch_id, patch_path, _changed_paths in BEHAVIORAL_PATCHES
    }
    verify_snapshot_against_manifest(SNAPSHOT_ROOT, tracked_manifest)
    verify_provenance_files(SNAPSHOT_ROOT, tracked_manifest)
    tracked_provenance_before = {
        name: (UPSTREAM_ROOT / name).read_bytes() for name in PROVENANCE_FILES
    }

    with tempfile.TemporaryDirectory(prefix="ay-ple-exact-sdk-verify-") as temp:
        temp_root = Path(temp)
        first = build_clean_once(source_root, temp_root / "first")
        second = build_clean_once(source_root, temp_root / "second")
        _assert_same_build(first, second)
        if first.manifest_bytes != tracked_manifest_bytes:
            raise ExactSdkError("tracked unpatched manifest is stale")
        if _snapshot_records(first.snapshot_root) != tracked_snapshot_before:
            raise ExactSdkError("tracked exact SDK snapshot is stale")

        first_patched = temp_root / "first-patched"
        second_patched = temp_root / "second-patched"
        first_patch_stages = derive_patched_source(first.snapshot_root, first_patched)
        second_patch_stages = derive_patched_source(
            second.snapshot_root, second_patched
        )
        first_patched_manifest = _build_patched_source_manifest(
            first.snapshot_root,
            first_patched,
            tracked_manifest,
            first_patch_stages,
        )
        second_patched_manifest = _build_patched_source_manifest(
            second.snapshot_root,
            second_patched,
            tracked_manifest,
            second_patch_stages,
        )
        if _snapshot_records(first_patched) != _snapshot_records(second_patched):
            raise ExactSdkError(
                "two clean exact SDK runs produced different patched sources"
            )
        if _canonical_json(first_patched_manifest) != _canonical_json(
            second_patched_manifest
        ):
            raise ExactSdkError(
                "two clean exact SDK runs produced different patched-source manifests"
            )
        if _canonical_json(first_patched_manifest) != tracked_patched_manifest_bytes:
            raise ExactSdkError("tracked patched-source manifest is stale")
        verify_snapshot_against_manifest(first_patched, tracked_patched_manifest)

    if UNPATCHED_MANIFEST_PATH.read_bytes() != tracked_manifest_bytes:
        raise ExactSdkError("verify unexpectedly modified the tracked manifest")
    if _snapshot_records(SNAPSHOT_ROOT) != tracked_snapshot_before:
        raise ExactSdkError("verify unexpectedly modified the tracked snapshot")
    if PATCHED_SOURCE_MANIFEST_PATH.read_bytes() != tracked_patched_manifest_bytes:
        raise ExactSdkError(
            "verify unexpectedly modified the tracked patched-source manifest"
        )
    if any(
        patch_path.read_bytes() != before
        for patch_path, before in tracked_patch_bytes.items()
    ):
        raise ExactSdkError("verify unexpectedly modified a behavioral patch")
    if any(
        (UPSTREAM_ROOT / name).read_bytes() != tracked_provenance_before[name]
        for name in PROVENANCE_FILES
    ):
        raise ExactSdkError("verify unexpectedly modified tracked provenance")

    print(
        json.dumps(
            {
                "deterministic_runs": 2,
                "patches": len(BEHAVIORAL_PATCHES),
                "source_commit": SOURCE_COMMIT,
                "status": "verified",
                "wheel": tracked_manifest["wheel"],
            },
            sort_keys=True,
        )
    )


def run_official_checks() -> None:
    """Run the aligned official unit suite and Ruff without mutating the snapshot."""

    manifest = _load_tracked_manifest()
    verify_snapshot_against_manifest(SNAPSHOT_ROOT, manifest)
    verify_provenance_files(SNAPSHOT_ROOT, manifest)
    before = _snapshot_records(SNAPSHOT_ROOT)
    with tempfile.TemporaryDirectory(prefix="ay-ple-exact-sdk-suite-") as temp:
        temp_root = Path(temp)
        working_root = temp_root / "openai-codex"
        files = manifest.get("files")
        if not isinstance(files, dict):
            raise ExactSdkError("manifest files roster is invalid")
        _copy_roster(SNAPSHOT_ROOT, working_root, files)
        apply_behavioral_patches(working_root)
        verify_snapshot_against_manifest(
            working_root,
            _load_patched_source_manifest(),
        )
        sdk_root = working_root / "sdk" / "python"
        suite_env = _prepare_suite_environment(
            sdk_root,
            temp_root / "suite-environment",
            temp_root / "isolated-environment",
        )
        # The contract-generation test invokes Ruff through
        # datamodel-code-generator. Ruff parses this variable as a boolean
        # literal; numeric "1" makes that nested formatter fail while the
        # generator reports an unrelated "Models not found" error.
        suite_env["RUFF_NO_CACHE"] = "true"
        actual_suite_tools = _suite_tool_versions(sdk_root, suite_env)
        expected_suite_tools = manifest.get("tools", {}).get("suite")
        if actual_suite_tools != expected_suite_tools:
            raise ExactSdkError(
                "official suite environment does not match the manifest"
            )
        if _runtime_binary_version(sdk_root, suite_env) != manifest.get(
            "runtime", {}
        ).get("binary_version"):
            raise ExactSdkError(
                "official suite runtime binary does not match the manifest"
            )
        uv_prefix = (
            "uv",
            "run",
            "--locked",
            "--no-sync",
            "--no-env-file",
            "--default-index",
            PYPI_INDEX,
            "--index-strategy",
            "first-index",
            "--python",
            _generation_python(),
            "--no-python-downloads",
        )
        _run(
            (*uv_prefix, "python", "-m", "pytest", "-p", "no:cacheprovider"),
            cwd=sdk_root,
            env=suite_env,
        )
        _run(
            (*uv_prefix, "ruff", "check", "--no-cache", "."),
            cwd=sdk_root,
            env=suite_env,
        )
        _run(
            (*uv_prefix, "ruff", "format", "--check", "--no-cache", "."),
            cwd=sdk_root,
            env=suite_env,
        )
    if _snapshot_records(SNAPSHOT_ROOT) != before:
        raise ExactSdkError("official checks modified the tracked SDK snapshot")
    print(
        json.dumps(
            {
                "official_suite": "green",
                "real_provider": "skipped",
                "ruff": "green",
            },
            sort_keys=True,
        )
    )


def run_router_checks() -> None:
    """Run response-last and bounded-routing gates against one exact base."""

    unpatched_manifest = _load_tracked_manifest()
    patched_manifest = _load_patched_source_manifest()
    before = _snapshot_records(SNAPSHOT_ROOT)
    with tempfile.TemporaryDirectory(prefix="ay-ple-codex-router-") as temp:
        temp_root = Path(temp)
        unpatched_root = temp_root / "unpatched"
        patched_root = temp_root / "patched"
        files = unpatched_manifest.get("files")
        if not isinstance(files, dict):
            raise ExactSdkError("unpatched manifest files roster is invalid")
        _copy_roster(SNAPSHOT_ROOT, unpatched_root, files)
        derive_patched_source(unpatched_root, patched_root)
        verify_snapshot_against_manifest(unpatched_root, unpatched_manifest)
        verify_snapshot_against_manifest(patched_root, patched_manifest)

        sdk_root = patched_root / "sdk" / "python"
        suite_env = _prepare_suite_environment(
            sdk_root,
            temp_root / "suite-environment",
            temp_root / "isolated-environment",
        )
        suite_env["AY_PLE_CODEX_SDK_SRC"] = str(sdk_root / "src")
        suite_env["AY_PLE_UNPATCHED_CODEX_SDK_SRC"] = str(
            unpatched_root / "sdk" / "python" / "src"
        )
        suite_env["PYTHONPATH"] = str(sdk_root / "src")
        _run(
            (
                "uv",
                "run",
                "--locked",
                "--no-sync",
                "--no-env-file",
                "--default-index",
                PYPI_INDEX,
                "--index-strategy",
                "first-index",
                "--python",
                _generation_python(),
                "--no-python-downloads",
                "python",
                str(PACKAGE_ROOT / "scripts" / "test_response_last_router.py"),
                "-v",
            ),
            cwd=sdk_root,
            env=suite_env,
        )
        _run(
            (
                "uv",
                "run",
                "--locked",
                "--no-sync",
                "--no-env-file",
                "--default-index",
                PYPI_INDEX,
                "--index-strategy",
                "first-index",
                "--python",
                _generation_python(),
                "--no-python-downloads",
                "python",
                str(PACKAGE_ROOT / "scripts" / "test_plan_interaction.py"),
                "-v",
            ),
            cwd=sdk_root,
            env=suite_env,
        )
        _run(
            (
                "uv",
                "run",
                "--locked",
                "--no-sync",
                "--no-env-file",
                "--default-index",
                PYPI_INDEX,
                "--index-strategy",
                "first-index",
                "--python",
                _generation_python(),
                "--no-python-downloads",
                "python",
                str(PACKAGE_ROOT / "scripts" / "test_bounded_router.py"),
                "-v",
            ),
            cwd=sdk_root,
            env=suite_env,
        )
        _run(
            (
                "uv",
                "run",
                "--locked",
                "--no-sync",
                "--no-env-file",
                "--default-index",
                PYPI_INDEX,
                "--index-strategy",
                "first-index",
                "--python",
                _generation_python(),
                "--no-python-downloads",
                "python",
                "-m",
                "pytest",
                "tests/test_client_rpc_methods.py",
                "-q",
            ),
            cwd=sdk_root,
            env=suite_env,
        )
    if _snapshot_records(SNAPSHOT_ROOT) != before:
        raise ExactSdkError("router checks modified the tracked SDK snapshot")
    print(
        json.dumps(
            {
                "bounded_router_actual_child": "green",
                "plan_interaction_actual_child": "green",
                "response_last_red": "bounded-and-reaped",
                "response_last_router_actual_child": "green",
                "router_unit": "upstream-aligned-targeted-green",
            },
            sort_keys=True,
        )
    )


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "command",
        choices=("generate", "verify", "test", "test-router", "check-upstream"),
    )
    parser.add_argument(
        "--source-root",
        type=Path,
        default=DEFAULT_SOURCE_ROOT,
        help="exact official openai/codex checkout",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        if args.command == "generate":
            generate(args.source_root)
        elif args.command == "verify":
            verify(args.source_root)
        elif args.command == "test":
            run_official_checks()
        elif args.command == "test-router":
            run_router_checks()
        else:
            check_source_oracle(args.source_root)
            print(
                json.dumps(
                    {
                        "source_commit": SOURCE_COMMIT,
                        "source_tag": SOURCE_TAG,
                        "status": "clean",
                    },
                    sort_keys=True,
                )
            )
    except ExactSdkError as error:
        print(f"exact SDK verification failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
