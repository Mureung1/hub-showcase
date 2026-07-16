"""feed 문자열 정리. content_pipeline.md 6장 "문자열 정리".

순서: script/style 제거 → HTML tag 제거 → entity decode → NFC → 공백 축소 → trim.
길이 제한: title 300, author 200, excerpt 1000.
"""

from __future__ import annotations

import html
import re
import unicodedata

TITLE_MAX_LENGTH = 300
AUTHOR_MAX_LENGTH = 200
EXCERPT_MAX_LENGTH = 1000

_SCRIPT_STYLE_RE = re.compile(r"<(script|style)\b[^>]*>.*?</\1>", re.IGNORECASE | re.DOTALL)
_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")


def clean_text(raw: str | None) -> str | None:
    """HTML을 제거하고 정규화한 plain text를 돌려준다. 빈 결과는 None."""
    if raw is None:
        return None
    text = _SCRIPT_STYLE_RE.sub(" ", raw)
    text = _TAG_RE.sub(" ", text)
    text = html.unescape(text)
    text = unicodedata.normalize("NFC", text)
    text = _WHITESPACE_RE.sub(" ", text)
    text = text.strip()
    return text or None


def clean_title(raw: str | None) -> str | None:
    """title 정리 후 길이 제한 적용. 빈 title은 None."""
    text = clean_text(raw)
    if text is None:
        return None
    return text[:TITLE_MAX_LENGTH]


def clean_author(raw: str | None) -> str | None:
    text = clean_text(raw)
    if text is None:
        return None
    return text[:AUTHOR_MAX_LENGTH]


def clean_excerpt(raw: str | None) -> str | None:
    text = clean_text(raw)
    if text is None:
        return None
    return text[:EXCERPT_MAX_LENGTH]
