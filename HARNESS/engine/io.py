from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import socket
import sys
import tempfile
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def canonical_json(value: Any) -> bytes:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def integrity_digest_file(path: Path, key: bytes) -> str:
    digest = hmac.new(key, digestmod=hashlib.sha256)
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def integrity_digest(value: Any, key: bytes | None = None) -> str:
    payload = canonical_json(value)
    if key:
        return hmac.new(key, payload, hashlib.sha256).hexdigest()
    return sha256_bytes(payload)


def sign_mapping(
    value: dict[str, Any],
    key: bytes,
    field: str = "integrity_hmac",
) -> dict[str, Any]:
    signed = dict(value)
    signed.pop(field, None)
    signed[field] = integrity_digest(signed, key)
    return signed


def verify_signed_mapping(
    value: dict[str, Any],
    key: bytes,
    field: str = "integrity_hmac",
) -> bool:
    actual = value.get(field)
    if not isinstance(actual, str):
        return False
    unsigned = dict(value)
    unsigned.pop(field, None)
    expected = integrity_digest(unsigned, key)
    return hmac.compare_digest(actual, expected)


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def atomic_write_json(path: Path, value: Any) -> None:
    """Replace a JSON file atomically; never expose a partially-written state."""
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    descriptor, temporary = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent)
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    except BaseException:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


def atomic_write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent)
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(value)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    except BaseException:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


def atomic_write_bytes(path: Path, value: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent)
    )
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(value)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    except BaseException:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


class Redactor:
    """Redact common credentials and explicitly named environment secrets."""

    _PATTERNS = (
        re.compile(r"(?i)(authorization\s*:\s*bearer\s+)[^\s,;]+"),
        re.compile(
            r"(?i)((?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)\s*[=:]\s*)"
            r"(?:['\"])?[^\s,;'\"]+"
        ),
        re.compile(r"(?i)(https?://[^/@:\s]+:)[^/@\s]+(@)"),
        re.compile(r"\b(?:sk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{12,}\b"),
    )

    def __init__(self, secrets: list[str] | None = None, replacement: str = "<redacted>"):
        self.replacement = replacement
        self.secrets = sorted(
            {secret for secret in (secrets or []) if len(secret) >= 4},
            key=len,
            reverse=True,
        )

    @classmethod
    def from_config(cls, config: dict[str, Any]) -> "Redactor":
        redaction = config.get("redaction", {})
        names = redaction.get("environment_secret_names", [])
        integrity_name = config.get("integrity", {}).get("environment_key")
        if integrity_name:
            names = [*names, integrity_name]
        secrets = [os.environ[name] for name in names if os.environ.get(name)]
        return cls(secrets, redaction.get("replacement", "<redacted>"))

    def text(self, value: str) -> str:
        redacted = value
        for secret in self.secrets:
            redacted = redacted.replace(secret, self.replacement)
        redacted = self._PATTERNS[0].sub(rf"\1{self.replacement}", redacted)
        redacted = self._PATTERNS[1].sub(rf"\1{self.replacement}", redacted)
        redacted = self._PATTERNS[2].sub(rf"\1{self.replacement}\2", redacted)
        redacted = self._PATTERNS[3].sub(self.replacement, redacted)
        return redacted

    def value(self, value: Any) -> Any:
        if isinstance(value, str):
            return self.text(value)
        if isinstance(value, list):
            return [self.value(item) for item in value]
        if isinstance(value, tuple):
            return [self.value(item) for item in value]
        if isinstance(value, dict):
            return {str(key): self.value(item) for key, item in value.items()}
        return value


def prepare_event(
    path: Path,
    event: dict[str, Any],
    redactor: Redactor,
    integrity_key: bytes | None = None,
) -> dict[str, Any]:
    """Prepare the next redacted, hash-chained event without writing it."""
    path.parent.mkdir(parents=True, exist_ok=True)
    previous: dict[str, Any] | None = None
    if path.exists():
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if line.strip():
                    previous = json.loads(line)
    record = redactor.value(dict(event))
    record.setdefault("schema_version", 1)
    record["seq"] = 1 if previous is None else previous["seq"] + 1
    record.setdefault("event_id", f"evt-{uuid.uuid4().hex}")
    record.setdefault("occurred_at", utc_now())
    record["prev_hash"] = None if previous is None else previous["event_hash"]
    record.pop("event_hash", None)
    record["event_hash"] = integrity_digest(record, integrity_key)
    return record


def append_prepared_event(
    path: Path,
    record: dict[str, Any],
    integrity_key: bytes | None = None,
) -> dict[str, Any]:
    """Append a precomputed event only when its predecessor still matches."""
    previous: dict[str, Any] | None = None
    if path.exists():
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if line.strip():
                    previous = json.loads(line)
    expected_seq = 1 if previous is None else previous["seq"] + 1
    expected_previous = None if previous is None else previous["event_hash"]
    if record.get("seq") != expected_seq or record.get("prev_hash") != expected_previous:
        raise RuntimeError("prepared event predecessor no longer matches the journal")
    unsigned = dict(record)
    actual_hash = unsigned.pop("event_hash", None)
    expected_hash = integrity_digest(unsigned, integrity_key)
    if not isinstance(actual_hash, str) or not hmac.compare_digest(
        actual_hash, expected_hash
    ):
        raise RuntimeError("prepared event integrity check failed")
    line = canonical_json(record) + b"\n"
    with path.open("ab") as handle:
        handle.write(line)
        handle.flush()
        os.fsync(handle.fileno())
    return record


def append_event(
    path: Path,
    event: dict[str, Any],
    redactor: Redactor,
    integrity_key: bytes | None = None,
) -> dict[str, Any]:
    """Prepare and append one event."""
    record = prepare_event(path, event, redactor, integrity_key)
    return append_prepared_event(path, record, integrity_key)


def verify_event_chain(
    path: Path,
    integrity_key: bytes | None = None,
    *,
    expected_run_id: str | None = None,
    expected_seq: int | None = None,
    expected_tail_hash: str | None = None,
) -> tuple[bool, str | None]:
    previous_hash: str | None = None
    required_seq = expected_seq
    sequence = 1
    if not path.exists():
        if expected_seq not in {None, 0}:
            return False, "event journal is missing"
        return True, None
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError as exc:
                return False, f"line {line_number}: invalid JSON: {exc}"
            actual_hash = event.pop("event_hash", None)
            calculated = integrity_digest(event, integrity_key)
            if not isinstance(actual_hash, str) or not hmac.compare_digest(
                actual_hash, calculated
            ):
                return False, f"line {line_number}: event hash mismatch"
            if event.get("seq") != sequence:
                return False, f"line {line_number}: sequence mismatch"
            if event.get("prev_hash") != previous_hash:
                return False, f"line {line_number}: previous hash mismatch"
            if expected_run_id is not None and event.get("run_id") != expected_run_id:
                return False, f"line {line_number}: run id mismatch"
            previous_hash = actual_hash
            sequence += 1
    actual_seq = sequence - 1
    if required_seq is not None and actual_seq != required_seq:
        return False, f"journal tail sequence mismatch: expected {required_seq}, actual {actual_seq}"
    if expected_tail_hash is not None and previous_hash != expected_tail_hash:
        return False, "journal tail hash mismatch"
    return True, None


class RunLockedError(RuntimeError):
    pass


@contextmanager
def exclusive_lock(lock_path: Path, operation: str) -> Iterator[None]:
    """Hold an OS-backed repository mutex plus an owner-token audit file."""
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    token = uuid.uuid4().hex
    descriptor: int | None = None
    windows_mutex: int | None = None
    unix_socket: socket.socket | None = None
    if os.name == "nt":
        import ctypes

        name = "Local\\ReviewjigiHarness-" + sha256_bytes(
            str(lock_path.resolve(strict=False)).casefold().encode("utf-8")
        )
        kernel32 = ctypes.windll.kernel32
        kernel32.CreateMutexW.restype = ctypes.c_void_p
        handle = kernel32.CreateMutexW(None, False, name)
        if not handle:
            raise RunLockedError("could not create the Windows harness mutex")
        if kernel32.GetLastError() == 183:
            kernel32.CloseHandle(handle)
            raise RunLockedError("harness mutation mutex is already held")
        windows_mutex = int(handle)
    elif hasattr(socket, "AF_UNIX") and sys.platform.startswith("linux"):
        unix_socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        abstract_name = "\0reviewjigi-" + sha256_bytes(
            str(lock_path.resolve(strict=False)).encode("utf-8")
        )[:48]
        try:
            unix_socket.bind(abstract_name)
        except OSError as exc:
            unix_socket.close()
            raise RunLockedError("harness mutation socket is already held") from exc
    try:
        descriptor = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        payload = canonical_json(
            {
                "token": token,
                "pid": os.getpid(),
                "host": socket.gethostname(),
                "operation": operation,
                "created_at": utc_now(),
            }
        )
        os.write(descriptor, payload)
        os.fsync(descriptor)
        os.close(descriptor)
        descriptor = None
    except FileExistsError as exc:
        owner = "unknown"
        try:
            owner = lock_path.read_text(encoding="utf-8")
        except OSError:
            pass
        if windows_mutex is not None:
            import ctypes

            ctypes.windll.kernel32.CloseHandle(windows_mutex)
            windows_mutex = None
        if unix_socket is not None:
            unix_socket.close()
            unix_socket = None
        raise RunLockedError(f"harness mutation lock is held: {owner}") from exc
    try:
        yield
    finally:
        if descriptor is not None:
            os.close(descriptor)
        try:
            owner = json.loads(lock_path.read_text(encoding="utf-8"))
            if owner.get("token") == token:
                lock_path.unlink()
        except (FileNotFoundError, OSError, json.JSONDecodeError):
            pass
        if windows_mutex is not None:
            import ctypes

            ctypes.windll.kernel32.CloseHandle(windows_mutex)
        if unix_socket is not None:
            unix_socket.close()
