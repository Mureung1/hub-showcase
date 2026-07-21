#!/usr/bin/env python3
"""Bounded, one-shot Route S ingestion for KNU board 720.

This module deliberately stops at normalized notice persistence.  It does not
extract candidates, reconcile events, create snapshots, or refresh a feed.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import http.client
import importlib.util
import ipaddress
import json
import os
import shutil
import socket
import ssl
import stat
import sys
import tempfile
import time
import uuid
import zlib
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from types import ModuleType
from typing import Any, Callable, Mapping
from urllib import robotparser
from urllib.parse import urlparse


USER_AGENT = "NoticePilotBot/0.1 (+https://github.com/OlemeQ/hub)"
INSTITUTION_ID = "kangwon.ac.kr"
BOARD_ID = "720"
ALLOWED_HOSTS = frozenset({"kangwon.ac.kr", "www.kangwon.ac.kr"})
ALLOWED_PATHS = {
    "robots": "/robots.txt",
    "list": "/ko/bbs/720/list.do",
    "detail": "/ko/bbs/720/detail.do",
}
MAX_BODY_BYTES = 2 * 1024 * 1024
CONNECT_TIMEOUT_SECONDS = 5
READ_TIMEOUT_SECONDS = 15
MIN_REQUEST_INTERVAL_SECONDS = 1
TRANSIENT_STATUS_CODES = frozenset({429, 502, 503, 504})
CHECKPOINT_SCHEMA = "noticepilot.routeS.checkpoint.v1"
MANIFEST_SCHEMA = "noticepilot.routeS.batchManifest.v1"


class IngestionError(Exception):
    """An intentionally non-diagnostic error safe to surface to operators."""

    def __init__(self, code: str, *, transient: bool = False) -> None:
        super().__init__(code)
        self.code = code
        self.transient = transient


@dataclass(frozen=True)
class HttpResponse:
    status: int
    headers: Mapping[str, str]
    body: bytes


@dataclass(frozen=True)
class IngestionResult:
    exit_code: int
    result: str
    notice_count: int
    changed_count: int

    def stdout_json(self) -> str:
        return json.dumps(
            {
                "status": "ingested",
                "result": self.result,
                "noticeCount": self.notice_count,
                "changedCount": self.changed_count,
            },
            separators=(",", ":"),
        )


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _canonical_json(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _is_private_mode(path: Path, expected_type: str) -> bool:
    try:
        item = path.lstat()
    except FileNotFoundError:
        return False
    if stat.S_ISLNK(item.st_mode) or item.st_mode & 0o077:
        return False
    return stat.S_ISDIR(item.st_mode) if expected_type == "directory" else stat.S_ISREG(item.st_mode)


def _require_absolute_existing_directory(path_value: str, *, code: str) -> Path:
    path = Path(path_value)
    if not path.is_absolute() or path.is_symlink() or not path.is_dir():
        raise IngestionError(code)
    return path.resolve()


def _reject_repository_path(path: Path) -> None:
    repository_root = Path(__file__).resolve().parents[2]
    try:
        path.resolve().relative_to(repository_root)
    except ValueError:
        return
    raise IngestionError("state_root_inside_repository")


def _validate_state_root_path(path_value: str) -> Path:
    root = Path(path_value)
    if not root.is_absolute():
        raise IngestionError("state_root_invalid")
    _reject_repository_path(root)
    if root.exists():
        if not _is_private_mode(root, "directory"):
            raise IngestionError("state_root_not_private")
    else:
        parent = root.parent
        if parent.is_symlink() or not parent.is_dir():
            raise IngestionError("state_root_parent_invalid")
    return root


def prepare_state_root(path_value: str) -> Path:
    root = _validate_state_root_path(path_value)
    if not root.exists():
        root.mkdir(mode=0o700)
        root.chmod(0o700)
    batches = root / "batches"
    if batches.exists():
        if not _is_private_mode(batches, "directory"):
            raise IngestionError("batches_not_private")
    else:
        batches.mkdir(mode=0o700)
        batches.chmod(0o700)
    return root


def _fsync_directory(path: Path) -> None:
    descriptor = os.open(path, os.O_RDONLY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def _atomic_write(path: Path, data: bytes) -> None:
    if not _is_private_mode(path.parent, "directory"):
        raise IngestionError("private_parent_required")
    descriptor = -1
    temporary: Path | None = None
    try:
        descriptor, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
        temporary = Path(temp_name)
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "wb", closefd=True) as handle:
            descriptor = -1
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
        path.chmod(0o600)
        _fsync_directory(path.parent)
    except OSError as error:
        raise IngestionError("private_write_failed") from error
    finally:
        if descriptor >= 0:
            os.close(descriptor)
        if temporary is not None:
            try:
                temporary.unlink()
            except FileNotFoundError:
                pass


def _load_checkpoint(root: Path) -> dict[str, Any]:
    path = root / "checkpoint.json"
    if not path.exists():
        return {
            "schemaVersion": CHECKPOINT_SCHEMA,
            "institutionId": INSTITUTION_ID,
            "boardId": BOARD_ID,
            "sourceNoticeContentHashes": {},
            "lastCleanBatchId": None,
            "updatedAt": None,
        }
    if not _is_private_mode(path, "file"):
        raise IngestionError("checkpoint_not_private")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise IngestionError("checkpoint_invalid") from error
    if (
        not isinstance(value, dict)
        or value.get("schemaVersion") != CHECKPOINT_SCHEMA
        or value.get("institutionId") != INSTITUTION_ID
        or value.get("boardId") != BOARD_ID
        or not isinstance(value.get("sourceNoticeContentHashes"), dict)
    ):
        raise IngestionError("checkpoint_invalid")
    return value


def _write_checkpoint(root: Path, checkpoint: dict[str, Any]) -> None:
    _atomic_write(root / "checkpoint.json", _canonical_json(checkpoint) + b"\n")


def _decode_html(body: bytes, content_type: str) -> str:
    charset = ""
    for parameter in content_type.split(";")[1:]:
        key, separator, value = parameter.strip().partition("=")
        if separator and key.lower() == "charset":
            charset = value.strip('"\'')
            break
    for encoding in (charset, "utf-8", "cp949", "euc-kr"):
        if not encoding:
            continue
        try:
            return body.decode(encoding)
        except (LookupError, UnicodeDecodeError):
            continue
    raise IngestionError("response_decode_failed")


def _decompress_limited(body: bytes, content_encoding: str) -> bytes:
    encoding = content_encoding.strip().lower()
    try:
        if not encoding or encoding == "identity":
            result = body
        elif encoding == "gzip":
            with gzip.GzipFile(fileobj=BytesIO(body)) as stream:
                result = stream.read(MAX_BODY_BYTES + 1)
        elif encoding == "deflate":
            decompressor = zlib.decompressobj()
            result = decompressor.decompress(body, MAX_BODY_BYTES + 1)
            if len(result) <= MAX_BODY_BYTES:
                result += decompressor.flush(MAX_BODY_BYTES + 1 - len(result))
        else:
            raise IngestionError("response_encoding_invalid")
    except (OSError, zlib.error) as error:
        raise IngestionError("response_decode_failed") from error
    if len(result) > MAX_BODY_BYTES:
        raise IngestionError("response_too_large")
    return result


def _public_addresses(hostname: str, resolver: Callable[[str], list[str]]) -> list[str]:
    try:
        values = resolver(hostname)
    except OSError as error:
        raise IngestionError("dns_resolution_failed", transient=True) from error
    if not values:
        raise IngestionError("dns_resolution_failed", transient=True)
    addresses: list[str] = []
    for value in values:
        try:
            address = ipaddress.ip_address(value)
        except ValueError as error:
            raise IngestionError("dns_address_invalid") from error
        if not address.is_global:
            raise IngestionError("dns_address_blocked")
        addresses.append(str(address))
    return addresses


def _system_resolver(hostname: str) -> list[str]:
    return sorted({row[4][0] for row in socket.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM)})


def _validate_url(url: str, kind: str, resolver: Callable[[str], list[str]]) -> tuple[str, str, str]:
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower().rstrip(".")
    if (
        parsed.scheme != "https"
        or hostname not in ALLOWED_HOSTS
        or parsed.username is not None
        or parsed.password is not None
        or parsed.port not in (None, 443)
        or parsed.fragment
        or parsed.path != ALLOWED_PATHS[kind]
    ):
        raise IngestionError("url_policy_rejected")
    addresses = _public_addresses(hostname, resolver)
    target = parsed.path + (f"?{parsed.query}" if parsed.query else "")
    return hostname, addresses[0], target


class _PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, hostname: str, address: str, timeout: int) -> None:
        super().__init__(hostname, 443, timeout=timeout, context=ssl.create_default_context())
        self._address = address

    def connect(self) -> None:
        raw_socket = socket.create_connection((self._address, self.port), self.timeout)
        self.sock = self._context.wrap_socket(raw_socket, server_hostname=self.host)


def _real_transport(url: str, hostname: str, address: str, target: str) -> HttpResponse:
    connection = _PinnedHTTPSConnection(hostname, address, CONNECT_TIMEOUT_SECONDS)
    try:
        connection.request(
            "GET",
            target,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8",
                "Accept-Encoding": "gzip, deflate",
                "Host": hostname,
            },
        )
        response = connection.getresponse()
        connection.sock.settimeout(READ_TIMEOUT_SECONDS) if connection.sock else None
        return HttpResponse(response.status, dict(response.getheaders()), response.read(MAX_BODY_BYTES + 1))
    except (OSError, http.client.HTTPException) as error:
        raise IngestionError("transport_failed", transient=True) from error
    finally:
        connection.close()


class NetworkClient:
    """Manual redirect, DNS, size, type, retry, and pacing boundary."""

    def __init__(
        self,
        *,
        resolver: Callable[[str], list[str]] = _system_resolver,
        transport: Callable[[str, str, str, str], HttpResponse] = _real_transport,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self._resolver = resolver
        self._transport = transport
        self._sleep = sleep

    def fetch(
        self,
        url: str,
        kind: str,
        before_request: Callable[[str, str], None] | None = None,
    ) -> tuple[bytes, str]:
        current = url
        redirects = 0
        attempts = 0
        while True:
            try:
                hostname, address, target = _validate_url(current, kind, self._resolver)
                if before_request is not None:
                    before_request(current, kind)
                self._sleep(MIN_REQUEST_INTERVAL_SECONDS)
                response = self._transport(current, hostname, address, target)
                headers = {str(key).lower(): str(value) for key, value in response.headers.items()}
                if response.status in {301, 302, 303, 307, 308}:
                    location = headers.get("location")
                    if not location or redirects >= 3:
                        raise IngestionError("redirect_rejected")
                    from urllib.parse import urljoin
                    current = urljoin(current, location)
                    redirects += 1
                    continue
                if response.status in TRANSIENT_STATUS_CODES:
                    raise IngestionError("transient_http_failure", transient=True)
                if response.status < 200 or response.status >= 300:
                    raise IngestionError("http_status_failure")
                body = _decompress_limited(response.body, headers.get("content-encoding", ""))
                content_type = headers.get("content-type", "").lower()
                media_type = content_type.split(";", 1)[0].strip()
                allowed_types = {"text/plain"} if kind == "robots" else {"text/html", "application/xhtml+xml"}
                if media_type not in allowed_types:
                    raise IngestionError("content_type_rejected")
                return body, content_type
            except IngestionError as error:
                if error.transient and attempts == 0:
                    attempts += 1
                    continue
                raise


class RobotsPolicy:
    """Fail-closed, origin-scoped robots policy for list/detail requests."""

    def __init__(self, network: NetworkClient) -> None:
        self._network = network
        self._by_origin: dict[str, robotparser.RobotFileParser] = {}

    def _for_origin(self, hostname: str) -> robotparser.RobotFileParser:
        existing = self._by_origin.get(hostname)
        if existing is not None:
            return existing
        robots_url = f"https://{hostname}/robots.txt"
        try:
            body, content_type = self._network.fetch(robots_url, "robots")
            parser = robotparser.RobotFileParser()
            parser.set_url(robots_url)
            parser.parse(_decode_html(body, content_type).splitlines())
        except (IngestionError, ValueError, UnicodeError) as error:
            raise IngestionError("robots_unavailable") from error
        self._by_origin[hostname] = parser
        return parser

    def ensure_allowed(self, url: str, kind: str) -> None:
        if kind not in {"list", "detail"}:
            return
        hostname, _address, _target = _validate_url(url, kind, self._network._resolver)
        parser = self._for_origin(hostname)
        if not parser.can_fetch(USER_AGENT, url):
            raise IngestionError("robots_disallow")


def _load_foundation(root: Path) -> ModuleType:
    probe_path = root / "knu_crawler_probe.py"
    registry_path = root / "configs" / "knu_board_registry.v0.2.json"
    if not probe_path.is_file() or not registry_path.is_file():
        raise IngestionError("foundation_invalid")
    module_name = f"route_s_foundation_{hashlib.sha256(str(root).encode()).hexdigest()[:16]}"
    specification = importlib.util.spec_from_file_location(module_name, probe_path)
    if specification is None or specification.loader is None:
        raise IngestionError("foundation_invalid")
    module = importlib.util.module_from_spec(specification)
    sys.modules[module_name] = module
    try:
        specification.loader.exec_module(module)
    except Exception as error:
        sys.modules.pop(module_name, None)
        raise IngestionError("foundation_load_failed") from error
    return module


def _board_metadata(foundation_root: Path) -> dict[str, Any]:
    try:
        registry = json.loads((foundation_root / "configs" / "knu_board_registry.v0.2.json").read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise IngestionError("foundation_registry_invalid") from error
    for item in registry:
        if str(item.get("boardId")) == BOARD_ID and item.get("canonical") is True:
            return item
    raise IngestionError("foundation_registry_invalid")


def _secure_tree(root: Path) -> None:
    for current, directories, files in os.walk(root):
        current_path = Path(current)
        if current_path.is_symlink():
            raise IngestionError("staging_invalid")
        current_path.chmod(0o700)
        for name in directories:
            path = current_path / name
            if path.is_symlink():
                raise IngestionError("staging_invalid")
            path.chmod(0o700)
        for name in files:
            path = current_path / name
            if path.is_symlink() or not path.is_file():
                raise IngestionError("staging_invalid")
            path.chmod(0o600)


def _write_stage_file(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.parent.chmod(0o700)
    with path.open("xb") as handle:
        handle.write(data)
        handle.flush()
        os.fsync(handle.fileno())
    path.chmod(0o600)


def _cleanup_stage(path: Path) -> None:
    if path.exists() and path.name.startswith(".stage-"):
        shutil.rmtree(path)


def _make_batch_id(notices: list[dict[str, Any]]) -> str:
    semantic = [
        {"pstSn": str(notice["pstSn"]), "contentHash": str(notice["contentHash"])}
        for notice in sorted(notices, key=lambda value: str(value["pstSn"]))
    ]
    return f"batch-{_sha256(_canonical_json(semantic))}"


def run_ingestion(
    *,
    foundation_root: str,
    state_root: str,
    board_id: str,
    max_details: int,
    confirm_live: bool,
    resolver: Callable[[str], list[str]] = _system_resolver,
    transport: Callable[[str, str, str, str], HttpResponse] = _real_transport,
    sleep: Callable[[float], None] = time.sleep,
    now: Callable[[], str] = _now_utc_iso,
) -> IngestionResult:
    if not confirm_live or board_id != BOARD_ID or not 1 <= max_details <= 5:
        raise IngestionError("argument_invalid")
    foundation_path = _require_absolute_existing_directory(foundation_root, code="foundation_root_invalid")
    state_path = _validate_state_root_path(state_root)
    foundation = _load_foundation(foundation_path)
    board = _board_metadata(foundation_path)
    network = NetworkClient(resolver=resolver, transport=transport, sleep=sleep)
    robots = RobotsPolicy(network)
    checkpoint = _load_checkpoint(state_path)
    list_url = foundation.list_url(BOARD_ID, page_itm=10)
    try:
        robots.ensure_allowed(list_url, "list")
        list_body, list_type = network.fetch(list_url, "list", robots.ensure_allowed)
    except IngestionError:
        return IngestionResult(exit_code=1, result="failed", notice_count=0, changed_count=0)

    try:
        list_html = _decode_html(list_body, list_type)
        items, _row_scoped, _fallback = foundation.parse_list_items(list_html, list_url, BOARD_ID)
    except (IngestionError, ValueError, UnicodeError):
        return IngestionResult(exit_code=1, result="failed", notice_count=0, changed_count=0)
    selected = items[:max_details]
    root: Path | None = None
    batches_root: Path | None = None
    stage: Path | None = None
    failures: list[str] = []
    normalized: list[dict[str, Any]] = []
    try:
        for item in selected:
            robots.ensure_allowed(str(item.url), "detail")
        for item in selected:
            if not str(item.pst_sn).isdigit():
                failures.append("detail_invalid")
                continue
            try:
                detail_body, detail_type = network.fetch(item.url, "detail", robots.ensure_allowed)
                detail_html = _decode_html(detail_body, detail_type)
                if stage is None:
                    root = prepare_state_root(str(state_path))
                    checkpoint = _load_checkpoint(root)
                    batches_root = root / "batches"
                    stage = batches_root / f".stage-{uuid.uuid4().hex}"
                    stage.mkdir(mode=0o700)
                    stage.chmod(0o700)
                    _write_stage_file(stage / "raw" / "list.html", list_body)
                raw_detail = stage / "raw" / "details" / f"{item.pst_sn}.html"
                _write_stage_file(raw_detail, detail_body)
                detail = foundation.DetailProbe(
                    board_id=BOARD_ID,
                    category=str(board.get("category", "unknown")),
                    pst_sn=str(item.pst_sn),
                    title=str(item.title),
                    url=str(item.url),
                    status="ok",
                    elapsed_ms=None,
                    body_chars=0,
                    attachment_count=0,
                    attachments=[],
                    list_item=item,
                )
                soup = foundation.BeautifulSoup(detail_html, "lxml")
                body_text = foundation.extract_body_text(soup)
                attachments = foundation.extract_attachments(detail_html, str(item.url))
                detail.body_chars = len(body_text)
                detail.attachment_count = len(attachments)
                detail.attachments = attachments
                detail.raw_html_sha256 = _sha256(detail_body)
                normalized_path = foundation.write_normalized_notice(
                    stage, board, detail, body_text, attachments, now(), raw_detail
                )
                normalized_value = json.loads(normalized_path.read_text(encoding="utf-8"))
                normalized.append(normalized_value)
            except (IngestionError, OSError, ValueError, KeyError):
                failures.append("detail_unavailable")
        if selected and not normalized:
            if stage is not None:
                _cleanup_stage(stage)
            return IngestionResult(exit_code=1, result="failed", notice_count=0, changed_count=0)

        if stage is None:
            root = prepare_state_root(str(state_path))
            checkpoint = _load_checkpoint(root)
            batches_root = root / "batches"
            stage = batches_root / f".stage-{uuid.uuid4().hex}"
            stage.mkdir(mode=0o700)
            stage.chmod(0o700)
            _write_stage_file(stage / "raw" / "list.html", list_body)

        batch_id = _make_batch_id(normalized)
        previous_hashes = checkpoint["sourceNoticeContentHashes"]
        changed_count = sum(
            previous_hashes.get(str(value["pstSn"])) != value["contentHash"] for value in normalized
        )
        status = "partial" if failures else "clean"
        normalized_paths = [
            f"normalized/notices/{value['noticeId']}.json" for value in sorted(normalized, key=lambda row: row["noticeId"])
        ]
        manifest = {
            "schemaVersion": MANIFEST_SCHEMA,
            "batchId": batch_id,
            "status": status,
            "institutionId": INSTITUTION_ID,
            "boardId": BOARD_ID,
            "startedAt": now(),
            "finishedAt": now(),
            "attemptedNoticeCount": len(selected),
            "successfulNoticeCount": len(normalized),
            "failedNoticeCount": len(failures),
            "changedNoticeCount": changed_count,
            "unchangedNoticeCount": len(normalized) - changed_count,
            "normalizedPaths": normalized_paths,
            "failureReasonCodes": sorted(set(failures)),
            "integrity": {
                "algorithm": "sha256",
                "listHtmlSha256": _sha256(list_body),
                "normalizedContentHashes": {
                    str(value["pstSn"]): value["contentHash"] for value in sorted(normalized, key=lambda row: row["pstSn"])
                },
            },
            "eligibleForDownstream": status == "clean",
        }
        _write_stage_file(stage / "manifest.json", _canonical_json(manifest) + b"\n")
        _secure_tree(stage)
        final_batch = batches_root / batch_id
        batch_created = False
        if final_batch.exists():
            if not _is_private_mode(final_batch, "directory"):
                raise IngestionError("batch_not_private")
            _cleanup_stage(stage)
        else:
            _fsync_directory(stage)
            os.replace(stage, final_batch)
            _fsync_directory(batches_root)
            batch_created = True

        next_checkpoint = dict(checkpoint)
        next_hashes = dict(previous_hashes)
        for value in normalized:
            next_hashes[str(value["pstSn"])] = value["contentHash"]
        next_checkpoint["sourceNoticeContentHashes"] = next_hashes
        if status == "clean":
            next_checkpoint["lastCleanBatchId"] = batch_id
        checkpoint_changed = next_checkpoint != checkpoint
        if checkpoint_changed:
            next_checkpoint["updatedAt"] = now()
            _write_checkpoint(root, next_checkpoint)
        elif not batch_created:
            changed_count = 0
        return IngestionResult(
            exit_code=0 if status == "clean" else 2,
            result=status,
            notice_count=len(normalized),
            changed_count=changed_count,
        )
    except IngestionError:
        if stage is not None:
            _cleanup_stage(stage)
        return IngestionResult(exit_code=1, result="failed", notice_count=0, changed_count=0)
    finally:
        if stage is not None:
            _cleanup_stage(stage)


def _argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(add_help=False)
    subcommands = parser.add_subparsers(dest="command")
    run = subcommands.add_parser("run", add_help=False)
    run.add_argument("--foundation-root", required=True)
    run.add_argument("--state-root", required=True)
    run.add_argument("--board-id", required=True)
    run.add_argument("--max-details", required=True, type=int)
    run.add_argument("--confirm-live", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    try:
        args = _argument_parser().parse_args(argv)
        if args.command != "run":
            raise IngestionError("argument_invalid")
        result = run_ingestion(
            foundation_root=args.foundation_root,
            state_root=args.state_root,
            board_id=args.board_id,
            max_details=args.max_details,
            confirm_live=args.confirm_live,
        )
        if result.exit_code in {0, 2}:
            print(result.stdout_json())
        else:
            print("Route S ingestion failed.", file=sys.stderr)
        return result.exit_code
    except (IngestionError, OSError, ValueError):
        print("Route S ingestion failed.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
