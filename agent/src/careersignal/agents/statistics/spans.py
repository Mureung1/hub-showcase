"""근거 구간 확정.

모델이 돌려준 표현이 원문의 어디인지 정한다. `evidence_span_start` 와
`evidence_span_end` 는 `source_chunks.text` 기준 오프셋이며, 검증의 근거 위치 검사가
이 구간을 원문과 대조한다. 정의는 docs/erd.md 6.1이다.

순수 함수다. 저장소와 생성 모델을 import 하지 않는다.

위치를 정하지 못한 표현은 버린다. 지어낸 위치를 넣으면 검사 3이 잡아내지만, 그 전에
근거 없는 주장이 저장소에 들어간다. 들어가지 않게 하는 편이 싸다.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

NOT_FOUND = "원문에서 찾지 못했다"
"""표현이 청크 본문의 부분 문자열이 아니다."""

EXHAUSTED = "같은 표현의 자리를 모두 썼다"
"""같은 표현이 나온 횟수보다 많이 뽑혔다."""


@dataclass(frozen=True, slots=True)
class Span:
    """원문에서 표현이 놓인 자리."""

    start: int
    end: int

    @property
    def length(self) -> int:
        return self.end - self.start


def _flexible(expression: str) -> re.Pattern[str]:
    """공백의 개수와 종류를 무시하는 패턴.

    모델이 줄바꿈을 공백 하나로 바꿔 돌려주는 경우가 잦다. 글자는 그대로이고 공백만
    다른 표현을 버리면 근거가 과하게 줄어든다.
    """
    parts = [re.escape(p) for p in expression.split()]
    return re.compile(r"\s+".join(parts))


class SpanResolver:
    """한 청크 안에서 표현의 자리를 차례로 정한다.

    같은 표현이 여러 번 나오면 나온 순서대로 하나씩 준다. 두 mention 이 같은 구간을
    가리키면 뒤의 것이 앞의 것의 근거를 덮어쓰기 때문이다.
    """

    def __init__(self, text: str) -> None:
        self._text = text
        self._used: dict[str, int] = {}

    def resolve(self, expression: str) -> Span | None:
        """표현의 자리를 돌려준다. 정하지 못하면 비운다."""
        stripped = expression.strip()
        if not stripped:
            return None

        cursor = self._used.get(stripped, 0)
        found = self._text.find(stripped, cursor)
        if found >= 0:
            self._used[stripped] = found + len(stripped)
            return Span(found, found + len(stripped))

        match = _flexible(stripped).search(self._text, cursor)
        if match is None:
            return None
        self._used[stripped] = match.end()
        return Span(match.start(), match.end())

    def reason(self, expression: str) -> str:
        """정하지 못한 이유. 처음부터 없었는지 자리를 다 썼는지 가른다."""
        stripped = expression.strip()
        if not stripped:
            return NOT_FOUND
        if self._text.find(stripped) >= 0 or _flexible(stripped).search(self._text):
            return EXHAUSTED
        return NOT_FOUND


def quoted(text: str, span: Span) -> str:
    """구간이 가리키는 원문. 검사가 이 값과 `raw_expression` 을 대조한다."""
    return text[span.start : span.end]
