#!/usr/bin/env python3
"""Bounded live-source ingestion for the S1-lite single-feed slice.

The module deliberately has no caller-provided URL surface.  It fetches one
allowlisted KNU notice, evaluates the extracted notice with Policy.15, and
returns exactly one calendar-publishable candidate or fails closed.
"""
from __future__ import annotations

import hashlib
import http.client
import ipaddress
import json
import socket
import ssl
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlsplit


SOURCE_ID = "knu-721-2436"
SOURCE_URL = "https://www.kangwon.ac.kr/ko/bbs/721/detail.do?pstSn=2436"
SOURCE_HOST = "www.kangwon.ac.kr"
SOURCE_PATH = "/ko/bbs/721/detail.do?pstSn=2436"
SOURCE_BOARD_ID = "721"
MAX_RESPONSE_BYTES = 512 * 1024
FETCH_TIMEOUT_SECONDS = 10
USER_AGENT = "NoticePilot-S1-lite/0.1 (+single-allowlisted-source)"


class SourceRefreshError(RuntimeError):
    """The allowlisted source could not produce one safe calendar candidate."""


@dataclass(frozen=True)
class SourceResponse:
    body: bytes
    content_type: str
    charset: str = "utf-8"


@dataclass(frozen=True)
class SourceEvaluation:
    source_id: str
    source_url: str
    content_hash: str
    candidate: dict[str, Any]
    checked_at: str


class _PinnedHttpsConnection(http.client.HTTPSConnection):
    """HTTPS connection pinned to a pre-validated IP while retaining TLS SNI."""

    def __init__(self, host: str, pinned_ip: str, *, timeout: int) -> None:
        context = ssl.create_default_context()
        context.set_alpn_protocols(["http/1.1"])
        super().__init__(host, 443, timeout=timeout, context=context)
        self._pinned_ip = pinned_ip

    def connect(self) -> None:
        if self._tunnel_host is not None:
            raise SourceRefreshError("proxy tunneling is not allowed")
        raw_socket = socket.create_connection(
            (self._pinned_ip, self.port),
            self.timeout,
            self.source_address,
        )
        try:
            self.sock = self._context.wrap_socket(raw_socket, server_hostname=self.host)
        except Exception:
            raw_socket.close()
            raise


def _public_source_addresses() -> list[str]:
    try:
        answers = socket.getaddrinfo(
            SOURCE_HOST,
            443,
            family=socket.AF_UNSPEC,
            type=socket.SOCK_STREAM,
            proto=socket.IPPROTO_TCP,
        )
    except OSError as error:
        raise SourceRefreshError("source DNS resolution failed") from error
    addresses = sorted({answer[4][0] for answer in answers})
    if not addresses:
        raise SourceRefreshError("source DNS returned no addresses")
    for value in addresses:
        try:
            address = ipaddress.ip_address(value)
        except ValueError as error:
            raise SourceRefreshError("source DNS returned an invalid address") from error
        if not address.is_global:
            raise SourceRefreshError("source DNS returned a non-public address")
    return addresses


def fetch_exact_source() -> SourceResponse:
    """Fetch the one allowlisted page without redirects or DNS rebinding."""

    parsed = urlsplit(SOURCE_URL)
    if (
        parsed.scheme != "https"
        or parsed.hostname != SOURCE_HOST
        or parsed.port is not None
        or parsed.path + (f"?{parsed.query}" if parsed.query else "") != SOURCE_PATH
        or parsed.fragment
        or parsed.username
        or parsed.password
    ):
        raise SourceRefreshError("source allowlist configuration is invalid")

    connection = _PinnedHttpsConnection(
        SOURCE_HOST,
        _public_source_addresses()[0],
        timeout=FETCH_TIMEOUT_SECONDS,
    )
    try:
        connection.request(
            "GET",
            SOURCE_PATH,
            headers={
                "Accept": "text/html",
                "Accept-Encoding": "identity",
                "Connection": "close",
                "User-Agent": USER_AGENT,
            },
        )
        response = connection.getresponse()
        if response.status != 200:
            # http.client never follows redirects; all non-200 responses fail.
            raise SourceRefreshError("source returned a non-success status")
        media_type = (response.headers.get_content_type() or "").lower()
        if media_type != "text/html":
            raise SourceRefreshError("source response is not text/html")
        encoding = (response.getheader("Content-Encoding") or "identity").lower()
        if encoding != "identity":
            raise SourceRefreshError("encoded source responses are not accepted")
        content_length = response.getheader("Content-Length")
        if content_length is not None:
            try:
                declared_length = int(content_length)
            except ValueError as error:
                raise SourceRefreshError("source Content-Length is invalid") from error
            if declared_length < 0 or declared_length > MAX_RESPONSE_BYTES:
                raise SourceRefreshError("source response exceeds the size limit")
        body = response.read(MAX_RESPONSE_BYTES + 1)
        if len(body) > MAX_RESPONSE_BYTES:
            raise SourceRefreshError("source response exceeds the size limit")
        charset = response.headers.get_content_charset("utf-8")
        return SourceResponse(body=body, content_type=media_type, charset=charset)
    except (OSError, ssl.SSLError, http.client.HTTPException) as error:
        raise SourceRefreshError("source HTTPS request failed") from error
    finally:
        connection.close()


def _load_policy(foundation_root: Path) -> tuple[Any, dict[str, Any], Any, Any]:
    root = foundation_root.resolve()
    if not root.is_dir():
        raise SourceRefreshError("Foundation package is unavailable")
    root_text = str(root)
    if root_text not in sys.path:
        sys.path.insert(0, root_text)
    try:
        from bs4 import BeautifulSoup  # pylint: disable=import-outside-toplevel
        from knu_crawler_probe import (  # pylint: disable=import-outside-toplevel
            build_campus_scope,
            extract_body_text,
            extract_detail_published_at,
        )
        from noticepilot_mvp_policy_pipeline import (  # pylint: disable=import-outside-toplevel
            evaluate_notice,
            load_json,
        )

        config = load_json(root / "configs" / "noticepilot_mvp_policy.v0.1.json")
    except Exception as error:
        raise SourceRefreshError("Policy.15 runtime is unavailable") from error
    return BeautifulSoup, config, evaluate_notice, (
        build_campus_scope,
        extract_body_text,
        extract_detail_published_at,
    )


def _extract_title(soup: Any) -> str:
    for selector in (
        ".card-header h3.heading-02",
        ".view-header h4",
        ".view-header h3",
        ".view-title",
        ".detail-title",
        "meta[property='og:title']",
    ):
        node = soup.select_one(selector)
        if node is None:
            continue
        value = node.get("content") if node.name == "meta" else node.get_text(" ", strip=True)
        title = " ".join(str(value or "").split())
        if title:
            return title
    raise SourceRefreshError("source title is unavailable")


def _normalized_notice(
    html: str,
    *,
    foundation_root: Path,
) -> tuple[dict[str, Any], Any, dict[str, Any]]:
    BeautifulSoup, config, evaluate_notice, extractors = _load_policy(foundation_root)
    build_campus_scope, extract_body_text, extract_detail_published_at = extractors
    soup = BeautifulSoup(html, "lxml")
    title = _extract_title(soup)
    published_at = extract_detail_published_at(soup)
    body = extract_body_text(soup)
    if published_at is None or len(body.strip()) <= 20:
        raise SourceRefreshError("source notice fields are incomplete")
    stable_input = json.dumps(
        {"title": title, "publishedAt": published_at, "body": body},
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    content_hash = hashlib.sha256(stable_input.encode("utf-8")).hexdigest()
    notice = {
        "schemaVersion": "noticepilot.normalizedNotice.v0.3",
        "noticeId": SOURCE_ID,
        "institution": "강원대학교",
        "sourceSystem": "kangwon.ac.kr public bbs",
        "board": {
            "boardId": SOURCE_BOARD_ID,
            "name": "장학공지",
            "category": "scholarship",
        },
        "sourceUrl": SOURCE_URL,
        "pstSn": "2436",
        "title": title,
        "publishedAt": published_at,
        "timezone": "Asia/Seoul",
        "campusScope": build_campus_scope(
            title=title,
            body_text=body,
            list_campus=None,
            author=None,
        ),
        "listMetadata": {},
        "extractedText": body,
        "extractedTextChars": len(body),
        "textExtractionStatus": "body_html_extracted",
        "attachments": [],
        "attachmentCount": 0,
        "attachmentRequiredForFullExtraction": False,
        "contentHash": content_hash,
    }
    return notice, evaluate_notice, config


def evaluate_allowlisted_source(
    foundation_root: Path,
    *,
    fetcher: Callable[[], SourceResponse] = fetch_exact_source,
    checked_at: str | None = None,
) -> SourceEvaluation:
    """Fetch and evaluate the fixed source; arbitrary URLs are never accepted."""

    try:
        response = fetcher()
    except Exception as error:
        raise SourceRefreshError("source fetch failed") from error
    if (
        not isinstance(response, SourceResponse)
        or not isinstance(response.body, bytes)
        or not isinstance(response.content_type, str)
        or not isinstance(response.charset, str)
    ):
        raise SourceRefreshError("source fetcher returned an invalid response")
    if response.content_type.lower() != "text/html":
        raise SourceRefreshError("source response is not text/html")
    if len(response.body) > MAX_RESPONSE_BYTES:
        raise SourceRefreshError("source response exceeds the size limit")
    try:
        html = response.body.decode(response.charset, errors="strict")
    except (LookupError, UnicodeDecodeError) as error:
        raise SourceRefreshError("source response encoding is invalid") from error

    notice, evaluate_notice, config = _normalized_notice(
        html,
        foundation_root=foundation_root,
    )
    try:
        decision = evaluate_notice(notice, None, config)
    except Exception as error:
        raise SourceRefreshError("Policy.15 evaluation failed") from error
    candidates = [
        candidate
        for candidate in decision.get("candidates") or []
        if candidate.get("includeInCalendarFeed") is True
        and candidate.get("status") in {"auto_confirmed", "user_confirmed"}
    ]
    if decision.get("disposition") != "publishable" or len(candidates) != 1:
        raise SourceRefreshError("source must yield exactly one publishable candidate")
    timestamp = checked_at or datetime.now(timezone.utc).isoformat()
    return SourceEvaluation(
        source_id=SOURCE_ID,
        source_url=SOURCE_URL,
        content_hash=notice["contentHash"],
        candidate=json.loads(json.dumps(candidates[0], ensure_ascii=False)),
        checked_at=timestamp,
    )
