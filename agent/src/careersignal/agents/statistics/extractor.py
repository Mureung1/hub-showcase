"""요구 표현 추출 어댑터.

공고 청크 하나에서 요구 표현을 원문 그대로 뽑는다. 정의는
docs/knowledge-schema.md 5장과 docs/erd.md 6.1 이다.

두 가지가 이 어댑터의 계약이다.

- `raw_expression` 은 받은 청크 원문의 부분 문자열이다. `evidence_span_*` 이 이
  문자열을 원문 위치로 고정하므로, 요약하거나 표준 용어로 바꾼 표현은 위치를
  가질 수 없고 검증에서 폐기된다.
- `stated_requiredness` 는 열거값이 아니라 공고가 쓴 라벨 원문이다. 필수·우대의
  판정은 이 단계가 아니라 할당 단계가 수행한다.

무엇을 요구로 세는지는 프롬프트가 정한다. 경계는 docs/data-strategy.md 4장의
`explicit_requirement`("공고에 명시된 요구")이고, 맡을 일을 함께 담는 근거는
docs/erd.md 7.13 의 `requiredness` 열거값에 `responsibility` 가 있다는 것과
`careersignal.taxonomy.requiredness.RESPONSIBILITY_MARKERS` 다. 뽑힌 표현의 수가
docs/statistics-model.md 5.2 의 `posting_prevalence` 와 `requiredness_ratio` 의
분자로 그대로 이어지므로, 요구가 아닌 문장 하나와 과하게 쪼갠 조각 하나가 각각
분자를 부풀린다.

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

NO_SECTION = "(구간 라벨 없음)"
"""구간 라벨을 모를 때 사용자 메시지에 적는 말.

프롬프트가 이 말을 라벨로 오인하지 말라고 지시하므로 프롬프트보다 앞에 둔다.
"""

REQUIREMENT_SCOPE: tuple[str, ...] = (
    "지원자가 갖추어야 할 지식과 기술, 도구를 다루는 능력",
    "지원자가 갖추어야 할 경험과 경력, 학력과 자격",
    "지원자에게 기대하는 태도와 일하는 방식",
    "입사한 뒤 맡을 업무와 역할",
)
"""요구로 세는 것.

제외 목록만으로는 요구의 경계를 정하지 못한다. 목록에 없는 갈래의 문장이 오면
기준이 사라지고, 목록은 언제나 불완전하다. 적극적 기준을 함께 준다.

경계의 근거는 docs/data-strategy.md 4장의 `explicit_requirement` 다. 맡을 일이
포함되는 근거는 docs/erd.md 7.13 의 `requiredness` 에 `responsibility` 가 있고
`careersignal.taxonomy.requiredness.RESPONSIBILITY_MARKERS` 가 `주요업무`·`담당업무`
구간을 그 값으로 읽는다는 것이다. 자격 구간만 뽑으면 그 열거값이 비어 있게 된다.
"""

NON_REQUIREMENT_KINDS: tuple[str, ...] = (
    "회사 소개와 서비스·팀 자랑",
    "복리후생과 보상 — 연봉, 인센티브, 스톡옵션",
    "근무 조건 — 근무지, 근무 형태, 근무 시간, 수습 기간, 계약 기간",
    "전형 절차와 지원 방법, 제출 서류, 문의처",
    "법령 고지 — 장애인고용촉진 및 직업재활법처럼 법 이름을 적어 알리는 문장",
    "관계 법령에 따른 우대 채용 대상 안내 — 보훈 대상자, 장애인",
    "차별을 두지 않는다는 채용 공정성 안내와 허위 기재 시 합격 취소 안내",
    "개인정보 수집·이용 동의 안내",
)
"""요구가 아니어서 뽑지 않는 것.

회사 소개·복리후생·근무 조건 계열만으로는 공고 끝머리의 고지 문단을 가리지 못한다.
`장애인고용촉진 및 직업재활법` 은 어느 갈래에도 들지 않아 요구로 뽑힌다. 우대 채용
대상 안내는 `우대` 라는 말이 `우대사항` 구간 라벨의 표지
(`careersignal.taxonomy.requiredness.PREFERRED_MARKERS`)와 겹쳐 요구처럼 읽히고,
뽑히면 준비할 것이 아닌 차원이 공고에 나타난 것으로 세어져
docs/metric-spec.md 3.1 의 `posting_prevalence` 분자에 들어간다.

근무 조건 갈래에 `수습 기간` 을 적는다. `3개월의 수습기간이 있어요` 는 회사가 정하는
조건이지만, 갈래 이름만으로는 지원자가 감당할 조건으로 읽힐 여지가 있다.

이 목록을 docs/eval/backend_v1.json 의 기대 항목 78 개와 대조했다. 법령 고지·우대 채용
대상 안내·근무 조건·개인정보 처리 안내에 해당하는 기대 항목은 하나도 없다. 제외 결정과
정답이 어긋나지 않는다.

다만 `개인정보 보호와 보안을 최우선으로 고려한 계정, 인증, 권한 관리 시스템을 설계하고
개선`(`exp_daangn_identity_05`)은 `개인정보` 라는 말을 담은 맡을 일이다. 갈래 이름만
읽으면 개인정보 안내로 오인할 여지가 있어 프롬프트 규칙 3 이 주제와 안내 문장을 가르는
문장을 함께 적는다.
"""


def _listed(items: tuple[str, ...]) -> str:
    """프롬프트에 넣을 목록 문자열. 상수 하나가 프롬프트의 한 줄이 된다."""
    return "\n".join(f"   - {item}" for item in items)


MENTION_EXTRACTION_PROMPT = f"""너는 채용공고에서 요구 표현을 뽑는다.

주어지는 것은 공고의 청크 하나다. 구간 라벨과 본문이 함께 온다.

1. 표현은 본문에 적힌 글자를 그대로 옮긴다. 요약하지 않고, 번역하지 않고, 표준
   용어로 바꾸지 않는다. 줄임말을 풀지 않고 풀어 쓴 말을 줄이지 않는다. 옮긴
   표현은 본문의 부분 문자열이어야 한다.
2. 요구는 지원자가 갖추어야 할 것과 입사한 뒤 맡을 일이다. 다음이 대상이다.
{_listed(REQUIREMENT_SCOPE)}
3. 다음은 요구가 아니므로 뽑지 않는다.
{_listed(NON_REQUIREMENT_KINDS)}
   회사가 제외하는 것은 안내 문장이다. 같은 말이 들어 있어도 지원자가 갖추어야 할
   것이나 맡을 일을 적은 문장이면 뽑는다. "개인정보 보호를 고려한 인증 시스템을
   설계하고 개선" 은 맡을 일이므로 뽑고, "개인정보 수집·이용에 동의해 주세요" 는
   안내이므로 뽑지 않는다.
   회사가 제공하거나 정하는 것, 회사가 법에 따라 알리는 것은 지원자가 갖출 수 있는
   것이 아니다. "우대" 나 "필수" 라는 말이 붙어 있어도 지원자가 갖출 수 있는 것이
   아니면 뽑지 않는다.
4. 한 표현은 한 항목이다. 서로 다른 준비가 필요한 요구가 한 문장이나 한 줄에 나란히
   있으면 나눠서 각각을 항목으로 만든다. 나눈 조각도 본문에 그대로 있는 글자여야
   한다.
   한 요구를 이루는 말은 떼지 않는다. 같은 자리에 놓인 선택지("A 또는 B", "A/B"),
   대상을 한정하는 말, 연차와 수준을 나타내는 말은 그 요구에 붙여 둔다.
   "Java/Kotlin 기반 서버 개발 경험" 은 하나이며 "Java", "Kotlin",
   "서버 개발 경험" 으로 나누지 않는다.
5. 구간 라벨을 stated_requiredness 에 그대로 넣는다. 정해진 값으로 바꾸지 않고,
   필수인지 우대인지 판정하지 않는다. 본문 안에 그 표현이 속한 다른 라벨이 있으면
   그 라벨의 표현을 쓴다. 한 표현에는 라벨 하나만 넣고 여러 라벨을 이어 붙이지
   않는다. 구간 라벨 자리에 {NO_SECTION} 이 적혀 있고 본문에도 라벨이 없으면 빈
   문자열로 둔다.
6. 뽑을 것이 없으면 빈 목록을 돌려준다. 본문에 없는 요구를 만들지 않는다.
7. confidence 는 그 표현이 요구라는 판단의 확신이며 0 과 1 사이의 수다. 판단할
   근거가 없으면 null 로 둔다.

출력은 주어진 스키마를 따르는 JSON 하나다. 설명 문장을 덧붙이지 않는다."""
"""요구 표현 추출 지시.

`REQUIREMENT_SCOPE` 와 `NON_REQUIREMENT_KINDS` 를 본문에 끼워 만든다. 프롬프트가
다루기로 한 사례가 상수로 남아 테스트가 읽는다.

규칙 4가 쪼개는 기준을 "서로 다른 준비가 필요한가" 로 정하는 근거는
docs/statistics-model.md 5.2 다. 중복 제거 단위가 `posting_version_id` 라 같은 차원의
반복은 한 번으로 세지만, `Java/Kotlin 기반 서버 개발 경험` 을 셋으로 쪼개면 서로 다른
차원 셋에 할당되어 `posting_prevalence` 의 분자가 각각 늘어난다. 공고가 둘 중 하나를
말한 자리에서 두 차원이 모두 필수로 세어진다. 쪼갠 조각도 원문의 부분 문자열이라
`careersignal.agents.statistics.spans` 가 걸러 내지 못하므로 이 규칙이 유일한 방어다.

규칙 5가 라벨을 하나로 제한하는 근거는
`careersignal.taxonomy.requiredness` 다. `자격요건 및 우대사항` 처럼 두 갈래의 표지가
한 라벨에 있으면 정규화가 `unknown` 으로 떨어뜨린다.
"""

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

프롬프트가 늘어나도 이 스키마는 그대로다. 규칙이 정하는 것은 무엇을 뽑는지이고,
스키마가 정하는 것은 뽑은 것을 어떤 모양으로 돌려주는지다. 새 규칙이 새 필드를
요구하지 않는다.
"""


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

    이 규칙은 내용을 판정하지 않는다. 목록 표시가 붙어 있으면 법령 고지도 근무 조건도
    그대로 표현이 된다. 대역을 실제 공고에 돌린 결과는 배선과 저장 경로의 확인이며
    추출 품질의 값이 아니다. 무엇이 요구인지는 `MENTION_EXTRACTION_PROMPT` 가 정하고,
    그 품질은 docs/eval/README.md 의 `backend_v1.json` 정밀도·재현율로 잰다.

    대역에 비요구 문장을 거르는 규칙을 두지 않는다. 같은 정책이 프롬프트와 대역 두
    곳에 생기면 갈라지고, 그럴듯한 대역 출력이 프롬프트를 아직 재지 않았다는 사실을
    가린다.

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
