"""사용자 입력 공고의 원문 정규화와 해시.

규칙은 ``agent/data/demo_seed/CONTRACT.md`` 6.2 이고 흐름은 docs/architecture.md
11장이다. Express 와 FastAPI 가 같은 규칙을 써야 같은 원문이 같은 해시로 떨어지고,
그래야 캐시가 적중한다. 규칙이 한 글자라도 갈리면 데모의 세 건이 전부 미적중이 되어
온디맨드 경로로 새어 나간다.

**결정적 순수 함수만 둔다.** 저장소도 모델 제공자도 import 하지 않고 시각도 읽지
않는다. 같은 원문이면 언제 어디서 불러도 같은 값이 나온다.

시드 생성기(``agent/scripts/demo_seed/_csv.py`` 의 ``normalize_posting_text``)와
**정확히 같은 규칙**이다. 시드는 배포 산출물에 포함되지 않는 스크립트이므로 서비스
코드가 그쪽을 import 하지 않고 규칙을 이 자리에 옮겨 둔다. 두 곳이 같은지는
``tests/unit/test_user_posting.py`` 가 두 함수를 같은 입력으로 돌려 확인한다.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
from dataclasses import dataclass

MIN_CHAR_LENGTH = 200
MAX_CHAR_LENGTH = 12000
"""정규화 원문의 길이 제한(CONTRACT 6.2).

경계는 Express 가 막는다. 값을 여기 두는 이유는 같은 수를 두 곳에서 각자 적으면
한쪽만 바뀌기 때문이고, FastAPI 쪽 검사가 필요해지면 이 상수를 본다.
"""

OUTPUT_TYPES: tuple[str, ...] = ("interpretation", "strategy", "roadmap")
"""``user_posting_analyses.output_type`` 의 값 집합(CONTRACT 6.1).

세 종이 모두 있어야 캐시 적중이다. 하나라도 비면 화면의 세 탭 가운데 하나가 빈다.
"""

# ------------------------------------------------------------------ 개인정보 패턴
# CONTRACT 6.2 의 6번. 저장 전에 지운다. 사용자가 붙여 넣은 원문에 담당자 연락처가
# 섞여 들어오는 일이 흔하고, 그대로 두면 해시로 오래 남는다.
_EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_PHONE = re.compile(r"0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}")
_RRN = re.compile(r"\d{6}[-\s]?[1-4]\d{6}")
_INLINE_SPACE = re.compile(r"[ \t]+")


def normalize_posting_text(raw: str) -> str:
    """사용자 입력 공고 원문 정규화. CONTRACT 6.2 와 같은 규칙이다.

    순서를 바꾸지 않는다. NFC 를 먼저 하지 않으면 자모가 분리된 한글이 뒤의 공백
    정리에서 다르게 접히고, 개인정보 제거를 줄 정리보다 뒤에 두면 지운 자리가 남긴
    공백이 그대로 남아 같은 원문이 다른 해시를 낸다.
    """
    text = unicodedata.normalize("NFC", raw)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = _EMAIL.sub("", text)
    text = _PHONE.sub("", text)
    text = _RRN.sub("", text)
    lines = [_INLINE_SPACE.sub(" ", line).strip() for line in text.split("\n")]
    collapsed: list[str] = []
    for line in lines:
        if line == "" and collapsed and collapsed[-1] == "":
            continue
        collapsed.append(line)
    return "\n".join(collapsed).strip()


def content_hash(normalized_text: str) -> str:
    """정규화 원문의 SHA-256 hex 64자. ``user_postings.content_hash`` 다."""
    return hashlib.sha256(normalized_text.encode("utf-8")).hexdigest()


def user_posting_identifier(hash_hex: str) -> str:
    """``up_<hash 앞 16자>``. CONTRACT 6.1 의 기본키 형식이다."""
    return f"up_{hash_hex[:16]}"


def user_analysis_identifier(hash_hex: str, output_type: str) -> str:
    """``ua_<hash 앞 16자>_<type>``. CONTRACT 6.1 의 기본키 형식이다."""
    if output_type not in OUTPUT_TYPES:
        raise ValueError(f"출력 종류가 계약에 없다: {output_type}")
    return f"ua_{hash_hex[:16]}_{output_type}"


@dataclass(frozen=True, slots=True)
class NormalizedPosting:
    """정규화를 마친 공고 하나. 저장할 값이 모두 여기서 나온다."""

    normalized_text: str
    content_hash: str

    @property
    def char_length(self) -> int:
        """``user_postings.char_length``. 정규화 뒤 길이를 센다."""
        return len(self.normalized_text)

    @property
    def user_posting_id(self) -> str:
        return user_posting_identifier(self.content_hash)

    @property
    def length_ok(self) -> bool:
        """CONTRACT 6.2 의 길이 제한 안인가. 경계 강제는 Express 가 한다."""
        return MIN_CHAR_LENGTH <= self.char_length <= MAX_CHAR_LENGTH


def normalize_and_hash(raw: str) -> NormalizedPosting:
    """원문 한 건을 정규화하고 해시까지 낸다. 서버가 요청을 다시 검증하는 자리다."""
    normalized = normalize_posting_text(raw)
    return NormalizedPosting(normalized_text=normalized, content_hash=content_hash(normalized))
