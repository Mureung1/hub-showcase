"""요구 표현 추출 어댑터.

공고 청크 하나에서 요구 표현을 원문 그대로 뽑는다. 정의는
docs/knowledge-schema.md 5장과 docs/erd.md 6.1 이다.

두 가지가 이 어댑터의 계약이다.

- `raw_expression` 은 받은 청크 원문의 부분 문자열이다. `evidence_span_*` 이 이
  문자열을 원문 위치로 고정하므로, 요약하거나 표준 용어로 바꾼 표현은 위치를
  가질 수 없고 검증에서 폐기된다.
- `stated_requiredness` 는 열거값이 아니라 공고가 쓴 라벨 원문이다. 필수·우대의
  판정은 이 단계가 아니라 할당 단계가 수행한다.

추출에 생성 모델을 쓰는 근거는 docs/agent-design.md 7.3 이고, 모델 배치는 13장과
`careersignal.providers.models.TASK_TIER` 를 따른다. 구조는
`careersignal.providers.embeddings` 와 같다. Protocol 로 모양을 정하고, 실구현과
결정적 대역을 나란히 둔다.

이 모듈은 저장소를 모른다. 문자열을 받아 후보를 돌려줄 뿐이고, 식별자 부여와
`evidence_span_*` 계산과 적재는 파이프라인이 수행한다.
"""

from __future__ import annotations

import json
import os
from typing import Any, Protocol, runtime_checkable

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from careersignal.providers.models import chat_model

EXTRACTION_TASK = "mention_extraction"
"""`TASK_TIER` 의 작업 이름. 중간 등급이며 근거는 docs/agent-design.md 13장이다."""

BULLET_MARKS = ("-", "·", "•")
"""대역이 목록 항목으로 보는 줄머리 표시."""

MENTION_EXTRACTION_PROMPT = """너는 채용공고에서 요구 표현을 뽑는다.

주어지는 것은 공고의 청크 하나다. 구간 라벨과 본문이 함께 온다.

1. 표현은 본문에 적힌 글자를 그대로 옮긴다. 요약하지 않고, 번역하지 않고, 표준
   용어로 바꾸지 않는다. 줄임말을 풀지 않고 풀어 쓴 말을 줄이지 않는다. 옮긴
   표현은 본문의 부분 문자열이어야 한다.
2. 한 표현은 한 항목이다. 한 문장이나 한 줄에 요구가 여럿이면 나눠서 각각을
   항목으로 만든다. 나눈 조각도 본문에 그대로 있는 글자여야 한다.
3. 구간 라벨을 stated_requiredness 에 그대로 넣는다. 정해진 값으로 바꾸지 않고,
   필수인지 우대인지 판정하지 않는다. 본문 안에 그 표현이 속한 다른 라벨이 있으면
   그 라벨의 표현을 쓴다. 라벨이 어디에도 없으면 빈 문자열로 둔다.
4. 요구가 아닌 문장은 뽑지 않는다. 회사 소개, 서비스 자랑, 팀 자랑, 복리후생,
   근무 조건, 보상, 전형 절차, 지원 방법, 문의처는 대상이 아니다.
5. 뽑을 것이 없으면 빈 목록을 돌려준다. 본문에 없는 요구를 만들지 않는다.
6. confidence 는 그 표현이 요구라는 판단의 확신이며 0 과 1 사이의 수다. 판단할
   근거가 없으면 null 로 둔다.

출력은 주어진 스키마를 따르는 JSON 하나다. 설명 문장을 덧붙이지 않는다."""

MENTION_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "mentions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "raw_expression": {"type": "string"},
                    "stated_requiredness": {"type": "string"},
                    "confidence": {"type": ["number", "null"]},
                },
                "required": [
                    "raw_expression",
                    "stated_requiredness",
                    "confidence",
                ],
                "additionalProperties": False,
            },
        }
    },
    "required": ["mentions"],
    "additionalProperties": False,
}
"""구조화 출력 스키마.

`strict` 모드는 모든 속성이 `required` 에 있기를 요구하므로, 값이 없을 수 있는
`confidence` 는 생략이 아니라 `null` 허용으로 표현한다.
"""

NO_SECTION = "(구간 라벨 없음)"
"""구간 라벨을 모를 때 사용자 메시지에 적는 말."""


class MentionCandidate(BaseModel):
    """추출된 요구 표현 하나.

    `requirement_mentions` 행 전체가 아니라 모델이 만들 수 있는 부분만 담는다.
    식별자, 계보 컬럼, `evidence_span_*` 은 파이프라인이 채운다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    raw_expression: str
    """청크 원문의 부분 문자열. 요약·번역·표준 용어 치환을 하지 않은 원문이다."""

    stated_requiredness: str
    """이 표현이 있던 구간의 라벨 원문. 열거값이 아니다."""

    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    """`requirement_mentions.extraction_confidence` 로 간다. 제약은 0 과 1 사이다."""


@runtime_checkable
class MentionExtractor(Protocol):
    """청크 하나에서 요구 표현을 뽑는 것. 제공자를 감춘다.

    `section` 은 청크가 속한 구간의 라벨이며 모를 수 있다. `text` 는 청크 원문이고
    돌려주는 표현은 이 문자열의 부분 문자열이다.
    """

    def extract(self, section: str | None, text: str) -> tuple[MentionCandidate, ...]: ...


class OpenAIMentionExtractor:
    """OpenAI 요구 표현 추출 어댑터.

    구조화 출력으로 스키마를 강제해 자유 문장이 오지 않게 한다. 그래도 원문 일치는
    스키마가 보장하지 못하므로, 받은 표현이 청크의 부분 문자열인지 여기서 확인하고
    아닌 것은 버린다. 위치를 고정할 수 없는 표현은 뒤 단계에서 어차피 폐기된다.
    """

    def __init__(
        self,
        client: Any | None = None,
        *,
        task: str = EXTRACTION_TASK,
        api_key: str | None = None,
        timeout: float = 60.0,
    ) -> None:
        self._client = client
        self._task = task
        self._model = chat_model(task)
        self._api_key = api_key
        self._timeout = timeout

    @property
    def model(self) -> str:
        return self._model

    @property
    def task(self) -> str:
        return self._task

    def extract(self, section: str | None, text: str) -> tuple[MentionCandidate, ...]:
        """청크 하나를 보내고 원문에 있는 표현만 돌려준다."""
        if not text.strip():
            return ()

        payload = self._request(section, text)
        candidates: list[MentionCandidate] = []
        for item in payload:
            candidate = self._candidate(item, text)
            if candidate is not None:
                candidates.append(candidate)
        return tuple(candidates)

    # ------------------------------------------------------------ 내부
    def _request(self, section: str | None, text: str) -> list[dict[str, Any]]:
        response = self._sdk().chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": MENTION_EXTRACTION_PROMPT},
                {"role": "user", "content": user_message(section, text)},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "requirement_mentions",
                    "schema": MENTION_RESPONSE_SCHEMA,
                    "strict": True,
                },
            },
        )
        content = response.choices[0].message.content
        if not content:
            return []
        parsed = json.loads(content)
        mentions = parsed.get("mentions", [])
        if not isinstance(mentions, list):
            raise ValueError("mentions 가 목록이 아니다")
        return [item for item in mentions if isinstance(item, dict)]

    def _candidate(self, item: dict[str, Any], text: str) -> MentionCandidate | None:
        """원문에 없는 표현과 범위를 벗어난 신뢰도를 버린다."""
        raw_expression = str(item.get("raw_expression", ""))
        if not raw_expression.strip() or raw_expression not in text:
            return None
        try:
            return MentionCandidate(
                raw_expression=raw_expression,
                stated_requiredness=str(item.get("stated_requiredness", "")),
                confidence=item.get("confidence"),
            )
        except ValidationError:
            return None

    def _sdk(self) -> Any:
        """실제로 호출할 때 만든다. 대역만 쓰는 실행 경로가 키를 요구하지 않는다."""
        if self._client is None:
            from openai import OpenAI

            key = self._api_key or os.getenv("OPENAI_API_KEY")
            if not key:
                raise RuntimeError("OPENAI_API_KEY 가 agent/.env 에 없다")
            self._client = OpenAI(api_key=key, timeout=self._timeout, max_retries=2)
        return self._client


class StubMentionExtractor:
    """결정적 대역. 외부를 호출하지 않는다.

    목록 표시로 시작하는 줄만 표현으로 삼는다. 공고의 자격요건과 우대사항이 대체로
    목록이라 이 규칙만으로도 파이프라인을 끝까지 돌릴 수 있고, 표시를 떼어 낸
    나머지는 언제나 원문의 부분 문자열이다.

    구간 라벨은 받은 `section` 을 그대로 쓴다. 판정하지 않는다.

    `calls` 는 호출마다 받은 `(section, text)` 다.
    """

    model = "stub-mention-extractor"

    def __init__(self, marks: tuple[str, ...] = BULLET_MARKS) -> None:
        if not marks:
            raise ValueError("marks 는 하나 이상이다")
        self._marks = marks
        self.calls: list[tuple[str | None, str]] = []

    def extract(self, section: str | None, text: str) -> tuple[MentionCandidate, ...]:
        self.calls.append((section, text))
        requiredness = section if section is not None else ""
        candidates: list[MentionCandidate] = []
        for line in text.splitlines():
            expression = self._expression(line)
            if expression is None:
                continue
            candidates.append(
                MentionCandidate(
                    raw_expression=expression,
                    stated_requiredness=requiredness,
                )
            )
        return tuple(candidates)

    def _expression(self, line: str) -> str | None:
        """줄머리 표시를 떼고 남은 글자. 표시가 없거나 남는 것이 없으면 비운다."""
        stripped = line.strip()
        for mark in self._marks:
            if stripped.startswith(mark):
                expression = stripped[len(mark) :].strip()
                return expression or None
        return None


def user_message(section: str | None, text: str) -> str:
    """모델에 보내는 사용자 메시지. 구간 라벨과 본문을 나눠 적는다."""
    label = section if section else NO_SECTION
    return f"구간 라벨: {label}\n본문:\n{text}"
