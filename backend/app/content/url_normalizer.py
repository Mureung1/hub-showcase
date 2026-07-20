"""Canonical URL 정규화. docs/plan/engineering/content-pipeline.md 7장.

원문 요청이나 HTML canonical tag를 읽지 않는다. URL 문자열만 정규화한다.
path의 trailing slash·대소문자·percent encoding은 바꾸지 않는다.
query는 디코드하지 않고 raw 세그먼트로 다뤄 값 안의 percent encoding·`+`·빈 값을 보존한다.
"""

from __future__ import annotations

from urllib.parse import urlsplit, urlunsplit

# 대소문자 구분 없이 제거하는 추적 parameter. utm_*는 prefix로 처리.
_TRACKING_EXACT = {"fbclid", "gclid", "dclid", "msclkid", "mc_cid", "mc_eid", "_ga"}
_TRACKING_PREFIX = ("utm_",)

_DEFAULT_PORTS = {"http": "80", "https": "443"}


def _is_tracking_key(key: str) -> bool:
    lowered = key.lower()
    if lowered in _TRACKING_EXACT:
        return True
    return any(lowered.startswith(prefix) for prefix in _TRACKING_PREFIX)


def _normalize_host(host: str) -> str:
    """ASCII host는 소문자화, 국제화 도메인만 IDNA 변환.

    IDNA 변환 실패(예: 63자 초과 label)는 fallback하지 않고 예외를 전파한다.
    normalize_url 호출자(parser)가 해당 item을 INVALID_URL로 격리한다.
    """
    if not host:
        return ""
    if host.isascii():
        return host.lower()
    # 실패 시 UnicodeError 전파 → 잘못된 host를 planned_new로 흘리지 않는다.
    return host.encode("idna").decode("ascii")


def _strip_tracking(raw_query: str) -> str:
    """raw query에서 추적 key 세그먼트만 제거한다. 나머지는 원문 그대로 유지한다.

    디코드하지 않으므로 값 안의 percent encoding, `+`, 빈 값, `=` 표현, 순서, 중복이 보존된다.
    """
    if not raw_query:
        return ""
    kept: list[str] = []
    for segment in raw_query.split("&"):
        if segment == "":
            continue  # 빈 세그먼트(예: `a&&b`)만 제거
        key = segment.split("=", 1)[0]
        if _is_tracking_key(key):
            continue
        kept.append(segment)
    return "&".join(kept)


def normalize_url(url: str) -> str:
    """추적 parameter를 제거하고 scheme/host를 정규화한 canonical URL을 돌려준다.

    port가 숫자가 아닌 등 정규화가 불가능한 URL은 ValueError를 던진다.
    호출자(parser)가 이를 item 단위로 격리한다.
    """
    parts = urlsplit(url.strip())

    scheme = parts.scheme.lower()
    host = _normalize_host(parts.hostname or "")

    # 잘못된 port는 여기서 ValueError를 던진다(호출자가 격리).
    port = parts.port
    if port is not None and _DEFAULT_PORTS.get(scheme) == str(port):
        port = None

    netloc = host
    if parts.username:
        userinfo = parts.username
        if parts.password:
            userinfo += f":{parts.password}"
        netloc = f"{userinfo}@{netloc}"
    if port is not None:
        netloc = f"{netloc}:{port}"

    query = _strip_tracking(parts.query)

    # fragment 제거, path는 그대로(trailing slash·대소문자·percent encoding 유지)
    return urlunsplit((scheme, netloc, parts.path, query, ""))
