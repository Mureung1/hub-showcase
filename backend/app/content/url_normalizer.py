"""Canonical URL 정규화. content_pipeline.md 7장.

원문 요청이나 HTML canonical tag를 읽지 않는다. URL 문자열만 정규화한다.
path의 trailing slash·대소문자·percent encoding은 바꾸지 않는다.
"""

from __future__ import annotations

from urllib.parse import parse_qsl, urlsplit, urlunsplit

# 대소문자 구분 없이 제거하는 추적 parameter. utm_*는 prefix로 처리.
_TRACKING_EXACT = {"fbclid", "gclid", "dclid", "msclkid", "mc_cid", "mc_eid", "_ga"}
_TRACKING_PREFIX = ("utm_",)

_DEFAULT_PORTS = {"http": "80", "https": "443"}


def _is_tracking_key(key: str) -> bool:
    lowered = key.lower()
    if lowered in _TRACKING_EXACT:
        return True
    return any(lowered.startswith(prefix) for prefix in _TRACKING_PREFIX)


def normalize_url(url: str) -> str:
    """추적 parameter를 제거하고 host/scheme를 정규화한 canonical URL을 돌려준다.

    남은 query의 순서와 중복, 빈 값은 그대로 보존한다.
    """
    parts = urlsplit(url.strip())

    scheme = parts.scheme.lower()
    host = (parts.hostname or "").encode("idna").decode("ascii") if parts.hostname else ""

    # 기본 포트 제거
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

    # 추적 parameter만 제거하고 나머지는 순서·중복·빈 값 보존
    pairs = parse_qsl(parts.query, keep_blank_values=True)
    kept = [(k, v) for k, v in pairs if not _is_tracking_key(k)]
    query = "&".join(f"{k}={v}" if v != "" else k for k, v in kept)

    # fragment 제거, path는 그대로
    return urlunsplit((scheme, netloc, parts.path, query, ""))
