#!/usr/bin/env python3
"""Materialize and verify the package-private macOS arm64 Codex runtime.

``materialize`` is the only network-capable command. It builds the reviewed
patched SDK wheel twice, downloads hash-pinned external artifacts into an
ignored package-local cache, then performs two clean offline installations.
``verify`` only reads the tracked manifest and an existing materialization.
"""

from __future__ import annotations

import argparse
import base64
import csv
import hashlib
import json
import os
import platform
import re
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
import zipfile
from dataclasses import dataclass
from email.parser import BytesParser
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any, Callable, Mapping, Sequence

import exact_sdk


TARGET_ID = "darwin-arm64"
TARGET_SYSTEM = "Darwin"
TARGET_MACHINE = "arm64"
PYTHON_VERSION = "3.10.18"
PYTHON_BUILD = "20250818"
PYTHON_DISTRIBUTION = "CPython"
PYTHON_ARTIFACT = (
    "cpython-3.10.18+20250818-aarch64-apple-darwin-install_only_stripped.tar.gz"
)
PYTHON_URL = (
    "https://github.com/astral-sh/python-build-standalone/releases/download/"
    "20250818/cpython-3.10.18%2B20250818-aarch64-apple-darwin-"
    "install_only_stripped.tar.gz"
)
PYTHON_BYTES = 17_463_291
PYTHON_SHA256 = "f38f5fcbe39e657742e21a12c890f9f12d20d2c0eefaa2e6cd4a975f3f7f9dcd"
PYTHON_REGULAR_FILE_COUNT = 2_336
PYTHON_UNPACKED_REGULAR_BYTES = 47_913_524
RUNTIME_BINARY_VERSION = f"codex-cli {exact_sdk.RUNTIME_VERSION}"

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = PACKAGE_ROOT.parents[1]
MANIFEST_PATH = PACKAGE_ROOT / "manifests" / "production-runtime-darwin-arm64.json"
ARTIFACTS_ROOT = PACKAGE_ROOT / ".artifacts"
ARTIFACT_ROOT = ARTIFACTS_ROOT / "production-runtime-darwin-arm64"
CACHE_ROOT = ARTIFACTS_ROOT / "production-runtime-cache"
UNPATCHED_MANIFEST_PATH = PACKAGE_ROOT / "manifests" / "unpatched.json"
PATCHED_SOURCE_MANIFEST_PATH = PACKAGE_ROOT / "manifests" / "patched-source.json"
BRIDGE_SOURCE_ROOT = PACKAGE_ROOT / "python" / "bridge"
BRIDGE_ENTRYPOINT = "bundle/bridge/worker.py"
BRIDGE_SOURCE_FILES = (
    "ay_ple_codex_bridge/__init__.py",
    "ay_ple_codex_bridge/cli.py",
    "ay_ple_codex_bridge/protocol.py",
    "ay_ple_codex_bridge/runtime.py",
    "worker.py",
)


@dataclass(frozen=True)
class ExternalWheel:
    distribution: str
    version: str
    filename: str
    url: str
    bytes: int
    sha256: str


BUILD_BACKEND_WHEEL = ExternalWheel(
    distribution="uv-build",
    version="0.11.19",
    filename="uv_build-0.11.19-py3-none-macosx_11_0_arm64.whl",
    url=(
        "https://files.pythonhosted.org/packages/31/8c/"
        "cb25fc5a01f5a3d3539e58d7711589816ed43e02db2714a4e941beffebc0/"
        "uv_build-0.11.19-py3-none-macosx_11_0_arm64.whl"
    ),
    bytes=1_381_935,
    sha256="7033cf1398d05293dca9d2265730ae35ffd49631fea844c75742f0f332c4f45b",
)


EXTERNAL_WHEELS = (
    ExternalWheel(
        distribution="annotated-types",
        version="0.7.0",
        filename="annotated_types-0.7.0-py3-none-any.whl",
        url=(
            "https://files.pythonhosted.org/packages/78/b6/"
            "6307fbef88d9b5ee7421e68d78a9f162e0da4900bc5f5793f6d3d0e34fb8/"
            "annotated_types-0.7.0-py3-none-any.whl"
        ),
        bytes=13_643,
        sha256="1f02e8b43a8fbbc3f3e0d4f0f4bfc8131bcb4eebe8849b8e5c773f3a1c582a53",
    ),
    ExternalWheel(
        distribution="openai-codex-cli-bin",
        version=exact_sdk.RUNTIME_VERSION,
        filename=("openai_codex_cli_bin-0.144.4-py3-none-macosx_11_0_arm64.whl"),
        url=(
            "https://files.pythonhosted.org/packages/65/eb/"
            "64c180514a2cc3e2500e486813f5a8d7f7e349342e9bebd78d99ddd9791a/"
            "openai_codex_cli_bin-0.144.4-py3-none-macosx_11_0_arm64.whl"
        ),
        bytes=116_474_758,
        sha256="05db505a9c7f020f58b70837a94e00d32a50086986c267bcc44ea97b573d4a05",
    ),
    ExternalWheel(
        distribution="pydantic",
        version="2.13.4",
        filename="pydantic-2.13.4-py3-none-any.whl",
        url=(
            "https://files.pythonhosted.org/packages/fd/7b/"
            "122376b1fd3c62c1ed9dc80c931ace4844b3c55407b6fb2d199377c9736f/"
            "pydantic-2.13.4-py3-none-any.whl"
        ),
        bytes=472_262,
        sha256="45a282cde31d808236fd7ea9d919b128653c8b38b393d1c4ab335c62924d9aba",
    ),
    ExternalWheel(
        distribution="pydantic-core",
        version="2.46.4",
        filename="pydantic_core-2.46.4-cp310-cp310-macosx_11_0_arm64.whl",
        url=(
            "https://files.pythonhosted.org/packages/56/c6/"
            "65f646c7ff09bd257f660434adb45c4dfcbbcebcc030562fecf6f5bf887d/"
            "pydantic_core-2.46.4-cp310-cp310-macosx_11_0_arm64.whl"
        ),
        bytes=1_949_769,
        sha256="da4b951fe36dc7c3a1ccb4e3cd1747c3542b8c9ceede8fc86cae054e764485f5",
    ),
    ExternalWheel(
        distribution="typing-extensions",
        version="4.15.0",
        filename="typing_extensions-4.15.0-py3-none-any.whl",
        url=(
            "https://files.pythonhosted.org/packages/18/67/"
            "36e9267722cc04a6b9f15c7f3441c2363321a3ea07da7ae0c0707beb2a9c/"
            "typing_extensions-4.15.0-py3-none-any.whl"
        ),
        bytes=44_614,
        sha256="f0fa19c6845758ab08074a0cfa8b7aecb71c999ca73d62883bc25cc018c4e548",
    ),
    ExternalWheel(
        distribution="typing-inspection",
        version="0.4.2",
        filename="typing_inspection-0.4.2-py3-none-any.whl",
        url=(
            "https://files.pythonhosted.org/packages/dc/9b/"
            "47798a6c91d8bdb567fe2698fe81e0c6b7cb7ef4d13da4114b41d239f65d/"
            "typing_inspection-0.4.2-py3-none-any.whl"
        ),
        bytes=14_611,
        sha256="4ed1cacbdc298c220f1bd249ed5287caa16f34d44ef4e9c3d0cbad5b521545e7",
    ),
)


class BundleError(RuntimeError):
    """Raised when a production artifact or its provenance drifts."""


def canonical_json(value: Mapping[str, Any]) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True) + "\n").encode("utf-8")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def file_record(path: Path) -> dict[str, Any]:
    if not path.is_file() or path.is_symlink():
        raise BundleError(f"artifact must be a regular file: {path}")
    executable = bool(path.stat().st_mode & stat.S_IXUSR)
    return {
        "bytes": path.stat().st_size,
        "git_mode": "100755" if executable else "100644",
        "sha256": sha256_file(path),
    }


def file_roster(root: Path) -> dict[str, dict[str, Any]]:
    if not root.is_dir() or root.is_symlink():
        raise BundleError(f"artifact directory is missing or unsafe: {root}")
    records: dict[str, dict[str, Any]] = {}
    for path in sorted(root.rglob("*")):
        if path.is_dir() and not path.is_symlink():
            continue
        if path.is_symlink() or not path.is_file():
            raise BundleError(f"artifact roster entry must be a regular file: {path}")
        records[path.relative_to(root).as_posix()] = file_record(path)
    return records


def verify_file_roster(
    root: Path,
    expected: Mapping[str, Mapping[str, Any]],
    *,
    label: str,
) -> None:
    actual = file_roster(root)
    if set(actual) != set(expected):
        missing = sorted(set(expected) - set(actual))
        extra = sorted(set(actual) - set(expected))
        raise BundleError(f"{label} roster drift: missing={missing}, extra={extra}")
    changed = sorted(path for path in expected if actual[path] != expected[path])
    if changed:
        raise BundleError(f"{label} artifact digest or size drift: {changed}")


def _tree_records(root: Path) -> dict[str, dict[str, Any]]:
    if not root.is_dir() or root.is_symlink():
        raise BundleError(f"bundle tree is missing or unsafe: {root}")
    records: dict[str, dict[str, Any]] = {}
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root).as_posix()
        if path.is_symlink():
            records[relative] = {"target": os.readlink(path), "type": "symlink"}
        elif path.is_dir():
            continue
        elif path.is_file():
            record = file_record(path)
            records[relative] = {"type": "file", **record}
        else:
            raise BundleError(f"unsupported bundle tree entry: {relative}")
    return records


def tree_evidence(root: Path) -> dict[str, Any]:
    records = _tree_records(root)
    regular = [record for record in records.values() if record["type"] == "file"]
    return {
        "file_count": len(regular),
        "regular_file_bytes": sum(int(record["bytes"]) for record in regular),
        "roster_sha256": _sha256_bytes(canonical_json({"files": records})),
        "symlink_count": sum(
            1 for record in records.values() if record["type"] == "symlink"
        ),
    }


def verify_tree_evidence(
    root: Path,
    expected: Mapping[str, Any],
    *,
    label: str,
) -> None:
    actual = tree_evidence(root)
    if actual != expected:
        raise BundleError(
            f"{label} roster drift: expected={dict(expected)}, actual={actual}"
        )


def assert_portable_manifest(manifest: Mapping[str, Any]) -> None:
    forbidden_keys = {
        "absolute_path",
        "generated_at",
        "source_date_epoch",
        "timestamp",
    }

    def visit(value: Any) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                if key in forbidden_keys:
                    raise BundleError(f"manifest contains volatile key: {key}")
                visit(child)
            return
        if isinstance(value, list):
            for child in value:
                visit(child)
            return
        if isinstance(value, str):
            if not value.startswith(("http://", "https://")) and (
                PurePosixPath(value).is_absolute()
                or PureWindowsPath(value).is_absolute()
            ):
                raise BundleError("manifest contains an absolute filesystem path")

    visit(manifest)


def _load_json(path: Path, *, label: str) -> dict[str, Any]:
    if not path.is_file():
        raise BundleError(f"{label} is missing: {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise BundleError(f"{label} is not valid JSON: {path}") from error
    if not isinstance(value, dict):
        raise BundleError(f"{label} must be a JSON object: {path}")
    return value


def _guard_managed_path(
    path: Path,
    *,
    package_root: Path = PACKAGE_ROOT,
    managed_root: Path = ARTIFACTS_ROOT,
) -> None:
    """Reject symlinked or escaping package-local artifact paths."""

    package = package_root.absolute()
    managed = managed_root.absolute()
    candidate = path.absolute()
    try:
        managed.relative_to(package)
        candidate.relative_to(managed)
    except ValueError as error:
        raise BundleError(
            f"managed artifact path escapes the package: {path}"
        ) from error

    cursor = package
    if cursor.is_symlink():
        raise BundleError(f"managed artifact ancestor is a symlink: {cursor}")
    for part in candidate.relative_to(package).parts:
        cursor = cursor / part
        if cursor.is_symlink():
            raise BundleError(f"managed artifact ancestor is a symlink: {cursor}")

    package_real = package.resolve(strict=False)
    managed_real = managed.resolve(strict=False)
    candidate_real = candidate.resolve(strict=False)
    try:
        managed_real.relative_to(package_real)
        candidate_real.relative_to(managed_real)
    except ValueError as error:
        raise BundleError(
            f"managed artifact path escapes the package: {path}"
        ) from error


def _relative_file(package_root: Path, relative: str, *, label: str) -> Path:
    path = PurePosixPath(relative)
    if path.is_absolute() or not path.parts or ".." in path.parts:
        raise BundleError(f"{label} path is not a safe relative path: {relative!r}")
    candidate = package_root.joinpath(*path.parts)
    try:
        candidate.resolve().relative_to(package_root.resolve())
    except ValueError as error:
        raise BundleError(
            f"{label} path escapes the package root: {relative!r}"
        ) from error
    return candidate


def _verify_record(path: Path, expected: Mapping[str, Any], *, label: str) -> None:
    actual = file_record(path)
    if actual != expected:
        raise BundleError(f"{label} artifact digest or size drift: {path.name}")


def validate_source_contract(
    manifest: Mapping[str, Any],
    *,
    package_root: Path = PACKAGE_ROOT,
    expected_patch_ids: Sequence[str] | None = None,
) -> None:
    source = manifest.get("source")
    if not isinstance(source, dict):
        raise BundleError("production manifest source contract is invalid")
    if package_root == PACKAGE_ROOT and (
        source.get("commit") != exact_sdk.SOURCE_COMMIT
        or source.get("repository") != exact_sdk.SOURCE_REPOSITORY
        or source.get("tag") != exact_sdk.SOURCE_TAG
    ):
        raise BundleError("production manifest official source identity drift")
    unpatched_record = source.get("unpatched_manifest")
    patched_record = source.get("patched_source_manifest")
    patch_records = source.get("patches")
    if (
        not isinstance(unpatched_record, dict)
        or not isinstance(patched_record, dict)
        or not isinstance(patch_records, list)
    ):
        raise BundleError("production manifest source evidence is incomplete")

    unpatched_relative = unpatched_record.get("path")
    patched_relative = patched_record.get("path")
    if not isinstance(unpatched_relative, str) or not isinstance(patched_relative, str):
        raise BundleError("production manifest source paths are invalid")
    unpatched_path = _relative_file(
        package_root, unpatched_relative, label="unpatched manifest"
    )
    patched_path = _relative_file(
        package_root, patched_relative, label="patched-source manifest"
    )
    patched = _load_json(patched_path, label="patched-source manifest")

    actual_patch_rows = patched.get("patches")
    if not isinstance(actual_patch_rows, list):
        raise BundleError("patched-source manifest patch rows are invalid")
    expected_ids = list(
        expected_patch_ids
        if expected_patch_ids is not None
        else [patch_id for patch_id, _path, _changed in exact_sdk.BEHAVIORAL_PATCHES]
    )
    if (
        len(actual_patch_rows) != len(expected_ids)
        or len(patch_records) != len(expected_ids)
        or any(not isinstance(row, dict) for row in actual_patch_rows)
        or any(not isinstance(row, dict) for row in patch_records)
    ):
        raise BundleError("behavioral patch roster shape or length drift")
    actual_ids = [row.get("id") for row in actual_patch_rows]
    manifest_ids = [row.get("id") for row in patch_records]
    actual_orders = [row.get("order") for row in actual_patch_rows]
    manifest_orders = [row.get("order") for row in patch_records]
    expected_orders = list(range(1, len(expected_ids) + 1))
    if (
        actual_ids != expected_ids
        or manifest_ids != expected_ids
        or actual_orders != expected_orders
        or manifest_orders != expected_orders
    ):
        raise BundleError(
            "behavioral patch order drift: "
            f"expected={expected_ids}, source={actual_ids}, production={manifest_ids}"
        )

    _verify_record(
        unpatched_path,
        {key: value for key, value in unpatched_record.items() if key != "path"},
        label="unpatched manifest",
    )
    _verify_record(
        patched_path,
        {key: value for key, value in patched_record.items() if key != "path"},
        label="patched-source manifest",
    )
    unpatched = _load_json(unpatched_path, label="unpatched manifest")
    del unpatched

    base = patched.get("base")
    if (
        not isinstance(base, dict)
        or base.get("manifest") != unpatched_relative
        or base.get("sha256") != sha256_file(unpatched_path)
    ):
        raise BundleError("patched-source base manifest provenance drift")
    if source.get("patch_stack_sha256") != patched.get("patch_stack_sha256"):
        raise BundleError("behavioral patch stack digest drift")

    for order, (production_row, source_row) in enumerate(
        zip(patch_records, actual_patch_rows), start=1
    ):
        if not isinstance(production_row, dict) or not isinstance(source_row, dict):
            raise BundleError("behavioral patch row is invalid")
        for key in ("id", "order", "path", "bytes", "git_mode", "sha256"):
            if production_row.get(key) != source_row.get(key):
                raise BundleError(f"behavioral patch evidence drift at order {order}")
        relative = production_row.get("path")
        if not isinstance(relative, str):
            raise BundleError(f"behavioral patch path is invalid at order {order}")
        patch_path = _relative_file(package_root, relative, label="behavioral patch")
        _verify_record(
            patch_path,
            {key: production_row[key] for key in ("bytes", "git_mode", "sha256")},
            label="behavioral patch",
        )

    licenses = source.get("licenses")
    if package_root == PACKAGE_ROOT:
        if not isinstance(licenses, dict) or set(licenses) != set(
            exact_sdk.PROVENANCE_FILES
        ):
            raise BundleError("production manifest OpenAI license evidence is invalid")
        for name in exact_sdk.PROVENANCE_FILES:
            record = licenses[name]
            if not isinstance(record, dict) or record.get("path") != f"upstream/{name}":
                raise BundleError(f"production manifest {name} evidence is invalid")
            _verify_record(
                package_root / "upstream" / name,
                {key: record[key] for key in ("bytes", "git_mode", "sha256")},
                label=f"OpenAI {name}",
            )


def _validate_locked_external_wheels() -> None:
    unpatched = _load_json(UNPATCHED_MANIFEST_PATH, label="unpatched manifest")
    lock = unpatched.get("lock")
    if not isinstance(lock, dict) or lock.get("path") != "sdk/python/uv.lock":
        raise BundleError("unpatched manifest lock evidence is invalid")
    lock_path = exact_sdk.SNAPSHOT_ROOT / "sdk" / "python" / "uv.lock"
    _verify_record(
        lock_path,
        {key: lock[key] for key in ("bytes", "git_mode", "sha256")},
        label="exact SDK lock",
    )
    lock_text = lock_path.read_text(encoding="utf-8")
    blocks = re.split(r"(?=^\[\[package\]\]$)", lock_text, flags=re.MULTILINE)
    for wheel in EXTERNAL_WHEELS:
        package_header = f'name = "{wheel.distribution}"\nversion = "{wheel.version}"\n'
        matching_blocks = [block for block in blocks if package_header in block]
        if len(matching_blocks) != 1:
            raise BundleError(
                f"exact SDK lock package evidence drift: {wheel.distribution}"
            )
        row_prefix = (
            f'{{ url = "{wheel.url}", hash = "sha256:{wheel.sha256}", '
            f"size = {wheel.bytes},"
        )
        if matching_blocks[0].count(row_prefix) != 1:
            raise BundleError(f"exact SDK lock wheel evidence drift: {wheel.filename}")


def _validate_build_backend_source() -> None:
    unpatched = _load_json(UNPATCHED_MANIFEST_PATH, label="unpatched manifest")
    if unpatched.get("tools", {}).get("build") != {
        "backend": "uv_build",
        "version": BUILD_BACKEND_WHEEL.version,
    }:
        raise BundleError("unpatched manifest build backend evidence drift")
    pyproject = exact_sdk.SNAPSHOT_ROOT / "sdk" / "python" / "pyproject.toml"
    text = pyproject.read_text(encoding="utf-8")
    requirement = f'requires = ["uv_build=={BUILD_BACKEND_WHEEL.version}"]'
    if text.count(requirement) != 1 or text.count('build-backend = "uv_build"') != 1:
        raise BundleError("exact SDK build-system requirement drift")


def _safe_tar_path(value: str, *, label: str) -> PurePosixPath:
    path = PurePosixPath(value)
    if path.is_absolute() or not path.parts or ".." in path.parts:
        raise BundleError(f"unsafe CPython archive {label}: {value!r}")
    return path


def validate_cpython_archive(path: Path) -> dict[str, int]:
    if not path.is_file() or path.is_symlink():
        raise BundleError(f"CPython archive is missing or unsafe: {path}")
    regular_count = 0
    regular_bytes = 0
    try:
        with tarfile.open(path, "r:gz") as archive:
            for member in archive.getmembers():
                _safe_tar_path(member.name, label="member")
                if member.issym() or member.islnk():
                    _safe_tar_path(member.linkname, label="link target")
                elif not (member.isfile() or member.isdir()):
                    raise BundleError(
                        f"unsupported CPython archive member type: {member.name}"
                    )
                if member.isfile():
                    regular_count += 1
                    regular_bytes += member.size
    except (tarfile.TarError, OSError) as error:
        raise BundleError(f"could not inspect CPython archive: {path}") from error
    return {
        "regular_file_count": regular_count,
        "unpacked_regular_file_bytes": regular_bytes,
    }


def _platform_gate() -> None:
    actual = (platform.system(), platform.machine().lower())
    expected = (TARGET_SYSTEM, TARGET_MACHINE)
    if actual != expected:
        raise BundleError(
            f"production runtime supports only {TARGET_ID}: expected={expected}, "
            f"actual={actual}"
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
        raise BundleError(f"required executable is unavailable: {args[0]}") from error
    except subprocess.CalledProcessError as error:
        detail = (error.stderr or error.stdout or "").strip()
        suffix = f": {detail}" if detail else ""
        raise BundleError(f"command failed ({' '.join(args)}){suffix}") from error


def _download(url: str, destination: Path, *, bytes: int, sha256: str) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.is_file() and not destination.is_symlink():
        if destination.stat().st_size == bytes and sha256_file(destination) == sha256:
            return
    temporary = destination.with_name(f".{destination.name}.download")
    temporary.unlink(missing_ok=True)
    request = urllib.request.Request(
        url, headers={"User-Agent": "AY-PLE/production-bundle"}
    )
    try:
        with (
            urllib.request.urlopen(request) as response,
            temporary.open("wb") as output,
        ):
            shutil.copyfileobj(response, output)
        if temporary.stat().st_size != bytes or sha256_file(temporary) != sha256:
            raise BundleError(
                f"downloaded artifact digest or size drift: {destination.name}"
            )
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)


def _canonical_distribution(value: str) -> str:
    return re.sub(r"[-_.]+", "-", value).lower()


def _wheel_metadata(path: Path) -> dict[str, str]:
    try:
        with zipfile.ZipFile(path) as archive:
            metadata_paths = [
                name
                for name in archive.namelist()
                if name.endswith(".dist-info/METADATA")
            ]
            if len(metadata_paths) != 1:
                raise BundleError(f"wheel has an invalid METADATA roster: {path.name}")
            message = BytesParser().parsebytes(archive.read(metadata_paths[0]))
            name = message.get("Name")
            version = message.get("Version")
            if not name or not version:
                raise BundleError(
                    f"wheel METADATA is missing name/version: {path.name}"
                )
            return {
                "dist_info": metadata_paths[0].split("/", 1)[0],
                "distribution": _canonical_distribution(name),
                "version": version,
            }
    except zipfile.BadZipFile as error:
        raise BundleError(f"wheel is not a valid ZIP archive: {path.name}") from error


def _wheel_record(
    path: Path,
    *,
    relative: str,
    source_url: str | None,
    source: str,
) -> dict[str, Any]:
    metadata = _wheel_metadata(path)
    record: dict[str, Any] = {
        "distribution": metadata["distribution"],
        "path": relative,
        "source": source,
        "version": metadata["version"],
        **file_record(path),
    }
    if source_url is not None:
        record["source_url"] = source_url
    return record


def _isolated_environment(root: Path) -> dict[str, str]:
    controlled = {
        "CODEX_HOME": root / "codex-home",
        "CODEX_SQLITE_HOME": root / "codex-sqlite-home",
        "HOME": root / "home",
        "TMPDIR": root / "tmp",
        "XDG_CACHE_HOME": root / "xdg-cache",
        "XDG_CONFIG_HOME": root / "xdg-config",
        "XDG_DATA_HOME": root / "xdg-data",
    }
    for path in controlled.values():
        path.mkdir(parents=True, exist_ok=True)
    env = {
        key: os.environ[key]
        for key in (
            "COMSPEC",
            "DYLD_FALLBACK_LIBRARY_PATH",
            "DYLD_LIBRARY_PATH",
            "PATH",
            "PATHEXT",
            "SYSTEMROOT",
        )
        if key in os.environ
    }
    env.update({key: str(path) for key, path in controlled.items()})
    env.update(
        {
            "LANG": "C",
            "LC_ALL": "C",
            "PIP_DISABLE_PIP_VERSION_CHECK": "1",
            "PIP_NO_INDEX": "1",
            "PYTHONDONTWRITEBYTECODE": "1",
            "PYTHONNOUSERSITE": "1",
            "PYTHONUTF8": "1",
            "TZ": "UTC",
        }
    )
    return env


def _normalize_direct_url_records(site_packages: Path, wheels: Sequence[Path]) -> None:
    for wheel in wheels:
        metadata = _wheel_metadata(wheel)
        dist_info = site_packages / metadata["dist_info"]
        direct_url_path = dist_info / "direct_url.json"
        record_path = dist_info / "RECORD"
        if not direct_url_path.is_file() or not record_path.is_file():
            raise BundleError(f"pip did not record an installed wheel: {wheel.name}")
        direct_url_bytes = json.dumps(
            {
                "archive_info": {"hash": f"sha256={sha256_file(wheel)}"},
                "url": f"file:///__ay_ple_bundle__/wheels/{wheel.name}",
            },
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
        direct_url_path.write_bytes(direct_url_bytes)
        encoded_digest = (
            base64.urlsafe_b64encode(hashlib.sha256(direct_url_bytes).digest())
            .decode("ascii")
            .rstrip("=")
        )
        direct_url_relative = f"{metadata['dist_info']}/direct_url.json"

        with record_path.open(newline="", encoding="utf-8") as stream:
            rows = list(csv.reader(stream))
        matches = [
            index for index, row in enumerate(rows) if row[0] == direct_url_relative
        ]
        if len(matches) != 1:
            raise BundleError(
                f"installed RECORD has invalid direct_url ownership: {wheel.name}"
            )
        rows[matches[0]] = [
            direct_url_relative,
            f"sha256={encoded_digest}",
            str(len(direct_url_bytes)),
        ]
        with record_path.open("w", newline="", encoding="utf-8") as stream:
            writer = csv.writer(stream, lineterminator="\n")
            writer.writerows(rows)


def _distribution_map(
    site_packages: Path, python: Path, env: Mapping[str, str]
) -> dict[str, str]:
    code = """
import importlib.metadata as metadata
import json
import sys

site = sys.argv[1]
rows = sorted(
    [distribution.metadata["Name"], distribution.version]
    for distribution in metadata.distributions(path=[site])
)
print(json.dumps(rows))
"""
    output = _run(
        (str(python), "-c", code, str(site_packages)),
        cwd=site_packages,
        env=env,
        capture_output=True,
    ).stdout
    rows = json.loads(output)
    result: dict[str, str] = {}
    for raw_name, version in rows:
        name = _canonical_distribution(raw_name)
        if name in result:
            raise BundleError(f"duplicate installed distribution: {name}")
        result[name] = version
    return result


def _runtime_probe(
    bundle_root: Path,
    site_packages: Path,
    python: Path,
    env: Mapping[str, str],
) -> dict[str, Any]:
    child_env = dict(env)
    child_env["PYTHONPATH"] = str(site_packages)
    code = """
import json
import platform
from pathlib import Path

import codex_cli_bin
import openai_codex
import openai_codex._message_router as message_router

print(json.dumps({
    "codex_cli_bin_module": str(Path(codex_cli_bin.__file__).resolve()),
    "native_executable": str(codex_cli_bin.bundled_codex_path().resolve()),
    "openai_codex_module": str(Path(openai_codex.__file__).resolve()),
    "python_version": platform.python_version(),
    "router_module": str(Path(message_router.__file__).resolve()),
}, sort_keys=True))
"""
    try:
        probe = json.loads(
            _run(
                (str(python), "-c", code),
                cwd=bundle_root,
                env=child_env,
                capture_output=True,
            ).stdout
        )
    except (json.JSONDecodeError, KeyError, TypeError) as error:
        raise BundleError(
            "bundled Python import probe returned invalid evidence"
        ) from error

    for key in (
        "codex_cli_bin_module",
        "native_executable",
        "openai_codex_module",
        "router_module",
    ):
        path = Path(str(probe[key])).resolve()
        try:
            relative = path.relative_to(bundle_root.resolve()).as_posix()
        except ValueError as error:
            raise BundleError(
                f"bundled import escaped the production bundle: {key}"
            ) from error
        probe[key] = f"bundle/{relative}"
    if probe.get("python_version") != PYTHON_VERSION:
        raise BundleError(
            f"bundled Python version drift: expected {PYTHON_VERSION}, "
            f"got {probe.get('python_version')}"
        )

    native_path = bundle_root / PurePosixPath(probe["native_executable"]).relative_to(
        "bundle"
    )
    native_version = _run(
        (str(native_path), "--version"),
        cwd=bundle_root,
        env=child_env,
        capture_output=True,
    ).stdout.strip()
    if native_version != RUNTIME_BINARY_VERSION:
        raise BundleError(
            f"native runtime version drift: expected {RUNTIME_BINARY_VERSION}, "
            f"got {native_version}"
        )
    probe["native_version"] = native_version
    return probe


def _expected_distributions() -> dict[str, str]:
    result = {
        "openai-codex": exact_sdk.SDK_VERSION,
        **{wheel.distribution: wheel.version for wheel in EXTERNAL_WHEELS},
    }
    if len(result) != len(EXTERNAL_WHEELS) + 1:
        raise BundleError("production wheel source table has duplicate distributions")
    return dict(sorted(result.items()))


def _source_evidence() -> dict[str, Any]:
    unpatched = _load_json(UNPATCHED_MANIFEST_PATH, label="unpatched manifest")
    patched = _load_json(PATCHED_SOURCE_MANIFEST_PATH, label="patched-source manifest")
    del unpatched
    patch_rows = patched.get("patches")
    if not isinstance(patch_rows, list):
        raise BundleError("patched-source manifest patch rows are invalid")
    return {
        "commit": exact_sdk.SOURCE_COMMIT,
        "repository": exact_sdk.SOURCE_REPOSITORY,
        "tag": exact_sdk.SOURCE_TAG,
        "unpatched_manifest": {
            "path": UNPATCHED_MANIFEST_PATH.relative_to(PACKAGE_ROOT).as_posix(),
            **file_record(UNPATCHED_MANIFEST_PATH),
        },
        "patched_source_manifest": {
            "path": PATCHED_SOURCE_MANIFEST_PATH.relative_to(PACKAGE_ROOT).as_posix(),
            **file_record(PATCHED_SOURCE_MANIFEST_PATH),
        },
        "patch_stack_sha256": patched.get("patch_stack_sha256"),
        "patches": [
            {
                key: row[key]
                for key in ("id", "order", "path", "bytes", "git_mode", "sha256")
            }
            for row in patch_rows
        ],
        "licenses": {
            name: {
                "path": f"upstream/{name}",
                **file_record(PACKAGE_ROOT / "upstream" / name),
            }
            for name in exact_sdk.PROVENANCE_FILES
        },
    }


def _prepare_build_backend(work_root: Path) -> Path:
    _guard_managed_path(CACHE_ROOT)
    CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    cached = CACHE_ROOT / BUILD_BACKEND_WHEEL.filename
    _download(
        BUILD_BACKEND_WHEEL.url,
        cached,
        bytes=BUILD_BACKEND_WHEEL.bytes,
        sha256=BUILD_BACKEND_WHEEL.sha256,
    )
    wheelhouse = work_root / "build-wheelhouse"
    destination = wheelhouse / BUILD_BACKEND_WHEEL.filename
    _copy_exact(cached, destination)
    metadata = _wheel_metadata(destination)
    if metadata != {
        "dist_info": "uv_build-0.11.19.dist-info",
        "distribution": BUILD_BACKEND_WHEEL.distribution,
        "version": BUILD_BACKEND_WHEEL.version,
    }:
        raise BundleError("reviewed build backend wheel metadata drift")
    return destination


def _build_patched_wheel_pair(work_root: Path, build_backend: Path) -> Path:
    exact_sdk._require_generation_toolchain()
    exact_sdk.check_source_oracle()
    unpatched_manifest = exact_sdk._load_tracked_manifest()
    patched_manifest = exact_sdk._load_patched_source_manifest()
    exact_sdk.verify_snapshot_against_manifest(
        exact_sdk.SNAPSHOT_ROOT, unpatched_manifest
    )
    patched_root = work_root / "patched-source"
    stages = exact_sdk.derive_patched_source(exact_sdk.SNAPSHOT_ROOT, patched_root)
    derived = exact_sdk._build_patched_source_manifest(
        exact_sdk.SNAPSHOT_ROOT,
        patched_root,
        unpatched_manifest,
        stages,
    )
    if canonical_json(derived) != canonical_json(patched_manifest):
        raise BundleError("derived patched source differs from tracked patch evidence")

    wheels = []
    for name in ("first", "second"):
        wheel = exact_sdk._build_wheel(
            patched_root / "sdk" / "python",
            work_root / name / "dist",
            exact_sdk.DEFAULT_SOURCE_ROOT,
            work_root / name / "isolated-environment",
            build_wheelhouse=build_backend.parent,
        )
        wheels.append(wheel)
    if (
        wheels[0].name != wheels[1].name
        or wheels[0].read_bytes() != wheels[1].read_bytes()
    ):
        raise BundleError("two patched SDK builds produced different wheel bytes")
    exact_sdk.verify_snapshot_against_manifest(patched_root, patched_manifest)
    return wheels[0]


def _copy_exact(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def _bridge_source_records(
    source_root: Path = BRIDGE_SOURCE_ROOT,
) -> dict[str, dict[str, Any]]:
    actual_python = {
        path.relative_to(source_root).as_posix()
        for path in source_root.rglob("*.py")
        if "__pycache__" not in path.parts
    }
    expected = set(BRIDGE_SOURCE_FILES)
    if actual_python != expected:
        raise BundleError(
            "bridge source roster drift: "
            f"missing={sorted(expected - actual_python)}, "
            f"extra={sorted(actual_python - expected)}"
        )
    records: dict[str, dict[str, Any]] = {}
    for relative in BRIDGE_SOURCE_FILES:
        path = source_root / relative
        if not path.is_file() or path.is_symlink():
            raise BundleError(f"bridge source is missing or unsafe: {relative}")
        records[relative] = file_record(path)
    return records


def _copy_bridge_source(destination: Path) -> dict[str, dict[str, Any]]:
    records = _bridge_source_records()
    for relative in BRIDGE_SOURCE_FILES:
        _copy_exact(BRIDGE_SOURCE_ROOT / relative, destination / relative)
    verify_file_roster(destination, records, label="installed bridge source")
    return records


def _download_inputs(seed_root: Path, sdk_wheel: Path, build_backend: Path) -> None:
    _guard_managed_path(CACHE_ROOT)
    CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    cpython_cache = CACHE_ROOT / PYTHON_ARTIFACT
    _download(
        PYTHON_URL,
        cpython_cache,
        bytes=PYTHON_BYTES,
        sha256=PYTHON_SHA256,
    )
    _copy_exact(cpython_cache, seed_root / "downloads" / PYTHON_ARTIFACT)
    _copy_exact(
        build_backend,
        seed_root / "build-wheels" / BUILD_BACKEND_WHEEL.filename,
    )
    _copy_exact(sdk_wheel, seed_root / "wheels" / sdk_wheel.name)
    for wheel in EXTERNAL_WHEELS:
        cached = CACHE_ROOT / wheel.filename
        _download(wheel.url, cached, bytes=wheel.bytes, sha256=wheel.sha256)
        _copy_exact(cached, seed_root / "wheels" / wheel.filename)


def _extract_cpython(archive_path: Path, destination: Path) -> None:
    evidence = validate_cpython_archive(archive_path)
    expected = {
        "regular_file_count": PYTHON_REGULAR_FILE_COUNT,
        "unpacked_regular_file_bytes": PYTHON_UNPACKED_REGULAR_BYTES,
    }
    if evidence != expected:
        raise BundleError(
            f"CPython archive content drift: expected={expected}, actual={evidence}"
        )
    destination.mkdir(parents=True)
    with tarfile.open(archive_path, "r:gz") as archive:
        archive.extractall(destination)


def _assemble_once(seed_root: Path, destination: Path) -> dict[str, Any]:
    if destination.exists():
        raise BundleError(f"clean materialization destination exists: {destination}")
    for directory in ("build-wheels", "downloads", "wheels"):
        (destination / directory).mkdir(parents=True, exist_ok=True)
        for path in sorted((seed_root / directory).iterdir()):
            _copy_exact(path, destination / directory / path.name)

    bundle_root = destination / "bundle"
    _extract_cpython(destination / "downloads" / PYTHON_ARTIFACT, bundle_root)
    python = bundle_root / "python" / "bin" / "python3.10"
    if not python.is_file():
        raise BundleError("standalone CPython executable is missing after extraction")
    license_root = bundle_root / "licenses" / "openai-codex"
    for name in exact_sdk.PROVENANCE_FILES:
        _copy_exact(PACKAGE_ROOT / "upstream" / name, license_root / name)
    bridge_root = bundle_root / "bridge"
    bridge_records = _copy_bridge_source(bridge_root)

    site_packages = bundle_root / "site-packages"
    wheel_paths = sorted((destination / "wheels").glob("*.whl"))
    env = _isolated_environment(destination / ".isolation")
    _run(
        (
            str(python),
            "-m",
            "pip",
            "install",
            "--disable-pip-version-check",
            "--no-index",
            "--no-deps",
            "--no-compile",
            "--target",
            str(site_packages),
            *[str(path) for path in wheel_paths],
        ),
        cwd=destination,
        env=env,
        capture_output=True,
    )
    _normalize_direct_url_records(site_packages, wheel_paths)
    try:
        distributions = _distribution_map(site_packages, python, env)
        expected_distributions = _expected_distributions()
        if distributions != expected_distributions:
            raise BundleError(
                "offline installed distribution roster drift: "
                f"expected={expected_distributions}, actual={distributions}"
            )
        probe = _runtime_probe(bundle_root, site_packages, python, env)
    finally:
        shutil.rmtree(destination / ".isolation", ignore_errors=True)

    patched_manifest = _load_json(
        PATCHED_SOURCE_MANIFEST_PATH, label="patched-source manifest"
    )
    router_source = "sdk/python/src/openai_codex/_message_router.py"
    expected_router = patched_manifest.get("files", {}).get(router_source)
    router_path = site_packages / "openai_codex" / "_message_router.py"
    if not isinstance(expected_router, dict):
        raise BundleError("patched source evidence is missing the router module")
    installed_router = file_record(router_path)
    if installed_router != expected_router:
        raise BundleError("installed router does not match the complete patched source")

    wheel_rows = []
    external_by_name = {wheel.filename: wheel for wheel in EXTERNAL_WHEELS}
    for wheel_path in wheel_paths:
        external = external_by_name.get(wheel_path.name)
        wheel_rows.append(
            _wheel_record(
                wheel_path,
                relative=f"wheels/{wheel_path.name}",
                source_url=external.url if external is not None else None,
                source="reviewed_external"
                if external is not None
                else "ordered_patches",
            )
        )

    manifest: dict[str, Any] = {
        "schema_version": 1,
        "build": {
            "backend": _wheel_record(
                destination / "build-wheels" / BUILD_BACKEND_WHEEL.filename,
                relative=f"build-wheels/{BUILD_BACKEND_WHEEL.filename}",
                source_url=BUILD_BACKEND_WHEEL.url,
                source="reviewed_external",
            ),
            "offline": True,
        },
        "kind": "codex_chat_runtime_bundle",
        "target": {
            "architecture": TARGET_MACHINE,
            "id": TARGET_ID,
            "system": TARGET_SYSTEM,
        },
        "python": {
            "artifact": {
                "path": f"downloads/{PYTHON_ARTIFACT}",
                "source_url": PYTHON_URL,
                **file_record(destination / "downloads" / PYTHON_ARTIFACT),
                **validate_cpython_archive(destination / "downloads" / PYTHON_ARTIFACT),
            },
            "build": PYTHON_BUILD,
            "distribution": PYTHON_DISTRIBUTION,
            "executable": "bundle/python/bin/python3.10",
            "version": PYTHON_VERSION,
        },
        "runtime": {
            "binary_version": RUNTIME_BINARY_VERSION,
            "distribution": exact_sdk.RUNTIME_DISTRIBUTION,
            "executable": probe["native_executable"],
            "version": exact_sdk.RUNTIME_VERSION,
        },
        "bridge": {
            "entrypoint": BRIDGE_ENTRYPOINT,
            "installed": {
                "path": "bundle/bridge",
                **tree_evidence(bridge_root),
            },
            "source_files": bridge_records,
            "source_root": "python/bridge",
            "python_args": ["-B"],
        },
        "source": _source_evidence(),
        "wheels": wheel_rows,
        "installed": {
            "distributions": distributions,
            "router": {
                "path": "bundle/site-packages/openai_codex/_message_router.py",
                "source_path": router_source,
                **installed_router,
            },
            "site_packages": {
                "path": "bundle/site-packages",
                **tree_evidence(site_packages),
            },
        },
        "probe": probe,
        "bundle": {
            "path": "bundle",
            **tree_evidence(bundle_root),
        },
        "materialization": {"clean_runs": 2, "offline_install": True},
    }
    assert_portable_manifest(manifest)
    return manifest


def _tracked_package_records() -> dict[str, str]:
    result = _run(
        ("git", "ls-files", "--", PACKAGE_ROOT.relative_to(REPOSITORY_ROOT).as_posix()),
        cwd=REPOSITORY_ROOT,
        capture_output=True,
    ).stdout
    records: dict[str, str] = {}
    for relative in filter(None, result.splitlines()):
        path = REPOSITORY_ROOT / relative
        if path.is_file():
            records[relative] = sha256_file(path)
    return records


def _write_atomic(path: Path, contents: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    staged = path.with_name(f".{path.name}.new")
    try:
        staged.write_bytes(contents)
        staged.replace(path)
    finally:
        staged.unlink(missing_ok=True)


def _require_matching_materializations(
    first_root: Path,
    first: Mapping[str, Any],
    second_root: Path,
    second: Mapping[str, Any],
) -> bytes:
    first_bytes = canonical_json(first)
    if first_bytes != canonical_json(second):
        raise BundleError("two clean materializations produced different manifests")
    if _tree_records(first_root / "bundle") != _tree_records(second_root / "bundle"):
        raise BundleError("two clean materializations produced different file rosters")
    return first_bytes


def _remove_managed_tree(
    path: Path,
    *,
    package_root: Path,
    managed_root: Path,
) -> None:
    _guard_managed_path(
        path,
        package_root=package_root,
        managed_root=managed_root,
    )
    if not path.exists():
        return
    if not path.is_dir() or path.is_symlink():
        raise BundleError(f"managed artifact entry is not a safe directory: {path}")
    shutil.rmtree(path)


def _publish_artifact(
    candidate: Path,
    target: Path,
    *,
    package_root: Path = PACKAGE_ROOT,
    managed_root: Path = ARTIFACTS_ROOT,
    replace: Callable[[Path, Path], Any] = os.replace,
) -> None:
    """Publish with a same-filesystem backup and immediate rollback on failure."""

    if not candidate.is_dir() or candidate.is_symlink():
        raise BundleError(f"publish candidate is not a safe directory: {candidate}")
    staged = target.with_name(f".{target.name}.new")
    backup = target.with_name(f".{target.name}.previous")
    for path in (managed_root, target, staged, backup):
        _guard_managed_path(
            path,
            package_root=package_root,
            managed_root=managed_root,
        )
    managed_root.mkdir(parents=True, exist_ok=True)

    # Recover a process-interrupted previous swap before starting another one.
    if backup.exists() and not target.exists():
        replace(backup, target)
    elif backup.exists():
        _remove_managed_tree(
            backup,
            package_root=package_root,
            managed_root=managed_root,
        )
    _remove_managed_tree(
        staged,
        package_root=package_root,
        managed_root=managed_root,
    )
    shutil.copytree(candidate, staged, symlinks=True)
    if _tree_records(candidate) != _tree_records(staged):
        _remove_managed_tree(
            staged,
            package_root=package_root,
            managed_root=managed_root,
        )
        raise BundleError("staged publish copy differs from the verified candidate")

    moved_previous = False
    try:
        if target.exists():
            replace(target, backup)
            moved_previous = True
        replace(staged, target)
    except OSError as error:
        rollback_error: OSError | None = None
        if moved_previous:
            try:
                if target.exists():
                    _remove_managed_tree(
                        target,
                        package_root=package_root,
                        managed_root=managed_root,
                    )
                replace(backup, target)
            except OSError as nested:
                rollback_error = nested
        if staged.exists():
            _remove_managed_tree(
                staged,
                package_root=package_root,
                managed_root=managed_root,
            )
        if rollback_error is not None:
            raise BundleError(
                "production runtime publish and rollback both failed; "
                f"previous bundle remains at {backup}"
            ) from rollback_error
        raise BundleError(
            "production runtime publish failed; previous bundle was restored"
        ) from error

    if backup.exists():
        try:
            _remove_managed_tree(
                backup,
                package_root=package_root,
                managed_root=managed_root,
            )
        except (BundleError, OSError) as error:
            # Activation is already complete. Treat old-generation cleanup as
            # recoverable residue so the canonical manifest is not rolled back
            # away from the newly active bundle. The next publish retries it.
            print(
                f"production runtime warning: previous bundle cleanup deferred: {error}",
                file=sys.stderr,
            )


def _publish_manifest_and_artifact(
    candidate: Path,
    manifest_bytes: bytes,
    *,
    write_manifest: bool,
    manifest_path: Path = MANIFEST_PATH,
    artifact_root: Path = ARTIFACT_ROOT,
    publish: Callable[[Path, Path], None] | None = None,
) -> None:
    previous_manifest = manifest_path.read_bytes() if manifest_path.is_file() else None
    manifest_was_written = False
    try:
        if write_manifest:
            _write_atomic(manifest_path, manifest_bytes)
            manifest_was_written = True
        elif not manifest_path.is_file():
            raise BundleError(
                "canonical production manifest is missing; reviewed regeneration is required"
            )
        tracked_manifest_bytes = manifest_path.read_bytes()
        if manifest_bytes != tracked_manifest_bytes:
            raise BundleError(
                "materialized runtime differs from the canonical manifest"
            )
        (candidate / "manifest.json").write_bytes(tracked_manifest_bytes)
        (publish or _publish_artifact)(candidate, artifact_root)
    except Exception:
        if manifest_was_written:
            try:
                if previous_manifest is None:
                    manifest_path.unlink(missing_ok=True)
                else:
                    _write_atomic(manifest_path, previous_manifest)
            except OSError as rollback_error:
                raise BundleError(
                    "production runtime publish failed and canonical manifest "
                    "rollback also failed"
                ) from rollback_error
        raise


def materialize(*, write_manifest: bool = False) -> dict[str, Any]:
    _platform_gate()
    tracked_before = _tracked_package_records()
    _guard_managed_path(ARTIFACTS_ROOT)
    ARTIFACTS_ROOT.mkdir(exist_ok=True)
    # Keep patch application outside the enclosing repository. ``git apply``
    # otherwise discovers the outer worktree and no longer treats the copied
    # snapshot as an independent patch root.
    with tempfile.TemporaryDirectory(prefix="production-runtime-work-") as temp:
        work_root = Path(temp)
        build_backend = _prepare_build_backend(work_root / "build-inputs")
        sdk_wheel = _build_patched_wheel_pair(work_root / "build", build_backend)
        seed_root = work_root / "seed"
        _download_inputs(seed_root, sdk_wheel, build_backend)
        first_root = work_root / "first"
        second_root = work_root / "second"
        first = _assemble_once(seed_root, first_root)
        second = _assemble_once(seed_root, second_root)
        first_bytes = _require_matching_materializations(
            first_root,
            first,
            second_root,
            second,
        )

        _publish_manifest_and_artifact(
            first_root,
            first_bytes,
            write_manifest=write_manifest,
        )

    tracked_after = _tracked_package_records()
    if write_manifest:
        manifest_relative = MANIFEST_PATH.relative_to(REPOSITORY_ROOT).as_posix()
        tracked_before.pop(manifest_relative, None)
        tracked_after.pop(manifest_relative, None)
    if tracked_before != tracked_after:
        raise BundleError("materialize unexpectedly modified tracked package files")
    return verify_bundle()


def _manifest_wheel_roster(manifest: Mapping[str, Any]) -> dict[str, dict[str, Any]]:
    rows = manifest.get("wheels")
    if not isinstance(rows, list):
        raise BundleError("production manifest wheel roster is invalid")
    records: dict[str, dict[str, Any]] = {}
    seen_distributions: set[str] = set()
    for row in rows:
        if not isinstance(row, dict):
            raise BundleError("production manifest wheel row is invalid")
        path = row.get("path")
        distribution = row.get("distribution")
        if not isinstance(path, str) or not path.startswith("wheels/"):
            raise BundleError("production manifest wheel path is invalid")
        relative = PurePosixPath(path).relative_to("wheels").as_posix()
        if "/" in relative or relative in records:
            raise BundleError(
                "production manifest wheel filename is invalid or duplicate"
            )
        if not isinstance(distribution, str) or distribution in seen_distributions:
            raise BundleError(
                "production manifest wheel distribution is invalid or duplicate"
            )
        seen_distributions.add(distribution)
        records[relative] = {key: row[key] for key in ("bytes", "git_mode", "sha256")}
    if seen_distributions != set(_expected_distributions()):
        raise BundleError(
            "production manifest wheel distributions drift: "
            f"expected={sorted(_expected_distributions())}, "
            f"actual={sorted(seen_distributions)}"
        )
    return records


def _verify_manifest_static_contract(manifest: Mapping[str, Any]) -> None:
    assert_portable_manifest(manifest)
    if manifest.get("schema_version") != 1 or manifest.get("kind") != (
        "codex_chat_runtime_bundle"
    ):
        raise BundleError("production manifest schema or kind drift")
    target = manifest.get("target")
    if target != {
        "architecture": TARGET_MACHINE,
        "id": TARGET_ID,
        "system": TARGET_SYSTEM,
    }:
        raise BundleError("production manifest target drift")
    build = manifest.get("build")
    expected_build_backend = {
        "bytes": BUILD_BACKEND_WHEEL.bytes,
        "distribution": BUILD_BACKEND_WHEEL.distribution,
        "git_mode": "100644",
        "path": f"build-wheels/{BUILD_BACKEND_WHEEL.filename}",
        "sha256": BUILD_BACKEND_WHEEL.sha256,
        "source": "reviewed_external",
        "source_url": BUILD_BACKEND_WHEEL.url,
        "version": BUILD_BACKEND_WHEEL.version,
    }
    if build != {"backend": expected_build_backend, "offline": True}:
        raise BundleError("production manifest build backend evidence drift")
    python = manifest.get("python")
    runtime = manifest.get("runtime")
    if not isinstance(python, dict) or not isinstance(runtime, dict):
        raise BundleError("production manifest runtime identity is invalid")
    if (
        python.get("version") != PYTHON_VERSION
        or python.get("build") != PYTHON_BUILD
        or python.get("distribution") != PYTHON_DISTRIBUTION
        or python.get("executable") != "bundle/python/bin/python3.10"
    ):
        raise BundleError("production manifest Python identity drift")
    if runtime != {
        "binary_version": RUNTIME_BINARY_VERSION,
        "distribution": exact_sdk.RUNTIME_DISTRIBUTION,
        "executable": "bundle/site-packages/codex_cli_bin/bin/codex",
        "version": exact_sdk.RUNTIME_VERSION,
    }:
        raise BundleError("production manifest native runtime identity drift")
    bridge = manifest.get("bridge")
    if not isinstance(bridge, dict):
        raise BundleError("production manifest bridge evidence is invalid")
    if (
        bridge.get("entrypoint") != BRIDGE_ENTRYPOINT
        or bridge.get("source_root") != "python/bridge"
        or bridge.get("python_args") != ["-B"]
        or bridge.get("source_files") != _bridge_source_records()
    ):
        raise BundleError("production manifest bridge source evidence drift")
    installed_bridge = bridge.get("installed")
    if not isinstance(installed_bridge, dict) or installed_bridge.get("path") != (
        "bundle/bridge"
    ):
        raise BundleError("production manifest installed bridge evidence drift")
    validate_source_contract(manifest)
    _validate_build_backend_source()
    _validate_locked_external_wheels()

    python_artifact = python.get("artifact")
    if not isinstance(python_artifact, dict):
        raise BundleError("production manifest CPython artifact is invalid")
    expected_python_artifact = {
        "bytes": PYTHON_BYTES,
        "git_mode": "100644",
        "path": f"downloads/{PYTHON_ARTIFACT}",
        "regular_file_count": PYTHON_REGULAR_FILE_COUNT,
        "sha256": PYTHON_SHA256,
        "source_url": PYTHON_URL,
        "unpacked_regular_file_bytes": PYTHON_UNPACKED_REGULAR_BYTES,
    }
    if python_artifact != expected_python_artifact:
        raise BundleError("production manifest CPython artifact drift")

    rows = manifest.get("wheels")
    if not isinstance(rows, list):
        raise BundleError("production manifest wheel roster is invalid")
    external_rows = {
        row.get("path", "").removeprefix("wheels/"): row
        for row in rows
        if isinstance(row, dict) and row.get("source") == "reviewed_external"
    }
    for wheel in EXTERNAL_WHEELS:
        row = external_rows.get(wheel.filename)
        if row != {
            "bytes": wheel.bytes,
            "distribution": wheel.distribution,
            "git_mode": "100644",
            "path": f"wheels/{wheel.filename}",
            "sha256": wheel.sha256,
            "source": "reviewed_external",
            "source_url": wheel.url,
            "version": wheel.version,
        }:
            raise BundleError(
                f"production manifest external wheel drift: {wheel.filename}"
            )
    built_rows = [
        row
        for row in rows
        if isinstance(row, dict) and row.get("source") == "ordered_patches"
    ]
    if (
        len(built_rows) != 1
        or built_rows[0].get("distribution") != exact_sdk.SDK_DISTRIBUTION
        or built_rows[0].get("version") != exact_sdk.SDK_VERSION
        or built_rows[0].get("path")
        != f"wheels/openai_codex-{exact_sdk.SDK_VERSION}-py3-none-any.whl"
        or "source_url" in built_rows[0]
    ):
        raise BundleError("production manifest patched SDK wheel evidence drift")
    unpatched = _load_json(UNPATCHED_MANIFEST_PATH, label="unpatched manifest")
    unpatched_wheel = unpatched.get("wheel")
    if not isinstance(unpatched_wheel, dict) or built_rows[0].get(
        "sha256"
    ) == unpatched_wheel.get("sha256"):
        raise BundleError(
            "production SDK wheel is not distinct from the unpatched wheel"
        )
    if manifest.get("materialization") != {"clean_runs": 2, "offline_install": True}:
        raise BundleError("production manifest materialization contract drift")


def verify_bundle(
    *,
    artifact_root: Path = ARTIFACT_ROOT,
    package_root: Path = PACKAGE_ROOT,
    managed_root: Path = ARTIFACTS_ROOT,
) -> dict[str, Any]:
    _guard_managed_path(
        artifact_root,
        package_root=package_root,
        managed_root=managed_root,
    )
    _platform_gate()
    manifest = _load_json(MANIFEST_PATH, label="canonical production manifest")
    _verify_manifest_static_contract(manifest)
    if not artifact_root.is_dir() or artifact_root.is_symlink():
        raise BundleError(f"production runtime is not materialized: {artifact_root}")
    before = tree_evidence(artifact_root)

    expected_top_level = {
        "build-wheels",
        "bundle",
        "downloads",
        "manifest.json",
        "wheels",
    }
    actual_top_level = {path.name for path in artifact_root.iterdir()}
    if actual_top_level != expected_top_level:
        raise BundleError(
            "production artifact root roster drift: "
            f"expected={sorted(expected_top_level)}, actual={sorted(actual_top_level)}"
        )
    local_manifest = artifact_root / "manifest.json"
    if local_manifest.read_bytes() != MANIFEST_PATH.read_bytes():
        raise BundleError("materialized manifest differs from the canonical manifest")

    build_backend = manifest["build"]["backend"]
    verify_file_roster(
        artifact_root / "build-wheels",
        {
            BUILD_BACKEND_WHEEL.filename: {
                key: build_backend[key] for key in ("bytes", "git_mode", "sha256")
            }
        },
        label="production build wheels",
    )
    if _wheel_metadata(
        artifact_root / "build-wheels" / BUILD_BACKEND_WHEEL.filename
    ) != {
        "dist_info": "uv_build-0.11.19.dist-info",
        "distribution": BUILD_BACKEND_WHEEL.distribution,
        "version": BUILD_BACKEND_WHEEL.version,
    }:
        raise BundleError("materialized build backend wheel metadata drift")

    python_artifact = manifest["python"]["artifact"]
    verify_file_roster(
        artifact_root / "downloads",
        {
            PYTHON_ARTIFACT: {
                key: python_artifact[key] for key in ("bytes", "git_mode", "sha256")
            }
        },
        label="production downloads",
    )
    cpython_evidence = validate_cpython_archive(
        artifact_root / "downloads" / PYTHON_ARTIFACT
    )
    if cpython_evidence != {
        "regular_file_count": PYTHON_REGULAR_FILE_COUNT,
        "unpacked_regular_file_bytes": PYTHON_UNPACKED_REGULAR_BYTES,
    }:
        raise BundleError("materialized CPython archive content drift")

    wheel_records = _manifest_wheel_roster(manifest)
    verify_file_roster(
        artifact_root / "wheels", wheel_records, label="production wheels"
    )
    rows_by_name = {PurePosixPath(row["path"]).name: row for row in manifest["wheels"]}
    for filename in sorted(wheel_records):
        metadata = _wheel_metadata(artifact_root / "wheels" / filename)
        row = rows_by_name[filename]
        if (
            metadata["distribution"] != row["distribution"]
            or metadata["version"] != row["version"]
        ):
            raise BundleError(f"production wheel metadata drift: {filename}")

    installed = manifest.get("installed")
    bundle = manifest.get("bundle")
    if not isinstance(installed, dict) or not isinstance(bundle, dict):
        raise BundleError("production manifest installed/bundle evidence is invalid")
    site_evidence = installed.get("site_packages")
    if not isinstance(site_evidence, dict) or site_evidence.get("path") != (
        "bundle/site-packages"
    ):
        raise BundleError("production manifest site-packages evidence is invalid")
    verify_tree_evidence(
        artifact_root / "bundle" / "site-packages",
        {key: value for key, value in site_evidence.items() if key != "path"},
        label="installed site-packages",
    )
    if bundle.get("path") != "bundle":
        raise BundleError("production manifest bundle path drift")
    verify_tree_evidence(
        artifact_root / "bundle",
        {key: value for key, value in bundle.items() if key != "path"},
        label="production bundle",
    )
    bridge = manifest["bridge"]
    bridge_root = artifact_root / bridge["installed"]["path"]
    verify_file_roster(
        bridge_root,
        bridge["source_files"],
        label="installed bridge source",
    )
    verify_tree_evidence(
        bridge_root,
        {key: value for key, value in bridge["installed"].items() if key != "path"},
        label="installed bridge tree",
    )
    entrypoint = artifact_root / bridge["entrypoint"]
    if not entrypoint.is_file() or entrypoint.is_symlink():
        raise BundleError("production bridge entrypoint is missing or unsafe")

    python_path = artifact_root / manifest["python"]["executable"]
    site_packages = artifact_root / site_evidence["path"]
    env = _isolated_environment(
        Path(tempfile.mkdtemp(prefix="production-runtime-verify-"))
    )
    isolation_root = Path(env["HOME"]).parent
    try:
        distributions = _distribution_map(site_packages, python_path, env)
        if distributions != installed.get("distributions"):
            raise BundleError("installed distribution metadata drift")
        probe = _runtime_probe(
            artifact_root / "bundle", site_packages, python_path, env
        )
        if probe != manifest.get("probe"):
            raise BundleError("bundled import/runtime probe drift")
    finally:
        shutil.rmtree(isolation_root, ignore_errors=True)

    router = installed.get("router")
    if not isinstance(router, dict):
        raise BundleError("installed router evidence is invalid")
    router_path = artifact_root / str(router.get("path"))
    _verify_record(
        router_path,
        {key: router[key] for key in ("bytes", "git_mode", "sha256")},
        label="installed patched router",
    )
    patched_manifest = _load_json(
        PATCHED_SOURCE_MANIFEST_PATH, label="patched-source manifest"
    )
    source_path = router.get("source_path")
    source_record = patched_manifest.get("files", {}).get(source_path)
    installed_record = {key: router[key] for key in ("bytes", "git_mode", "sha256")}
    if not isinstance(source_record, dict) or source_record != installed_record:
        raise BundleError("installed router is not the complete patched source module")
    source_licenses = manifest["source"]["licenses"]
    for name in exact_sdk.PROVENANCE_FILES:
        record = source_licenses[name]
        _verify_record(
            artifact_root / "bundle" / "licenses" / "openai-codex" / name,
            {key: record[key] for key in ("bytes", "git_mode", "sha256")},
            label=f"bundled OpenAI {name}",
        )
    after = tree_evidence(artifact_root)
    if before != after:
        raise BundleError("verify unexpectedly mutated the materialized runtime")
    result = {
        "artifact_root": ARTIFACT_ROOT.relative_to(PACKAGE_ROOT).as_posix(),
        "bundle_roster_sha256": bundle["roster_sha256"],
        "clean_materializations": manifest["materialization"]["clean_runs"],
        "native_version": manifest["runtime"]["binary_version"],
        "python_version": manifest["python"]["version"],
        "status": "verified",
        "wheel_count": len(manifest["wheels"]),
    }
    print(json.dumps(result, sort_keys=True))
    return result


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    materialize_parser = subparsers.add_parser("materialize")
    materialize_parser.add_argument(
        "--write-manifest",
        action="store_true",
        help="intentionally replace the tracked canonical manifest after review",
    )
    subparsers.add_parser("verify")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        if args.command == "materialize":
            materialize(write_manifest=bool(args.write_manifest))
        else:
            verify_bundle()
    except (BundleError, exact_sdk.ExactSdkError) as error:
        print(f"production runtime error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
