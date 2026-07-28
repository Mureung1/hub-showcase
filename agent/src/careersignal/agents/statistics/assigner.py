"""요구 표현의 차원 배정 어댑터.

기존 차원으로 곧바로 설명되지 않은 표현 하나를 받아, 주어진 활성 차원 가운데 어디에
속하는지 판정한다. 결과가 들어가는 자리는 docs/erd.md 7.13 의 `dimension_id` 이고,
방법 값은 같은 표의 `assignment_method` 가운데 `model_judgment` 다.

이 포트는 할당 방법 사슬의 마지막 자리다. 별칭 정확 일치와 벡터 근접이 아무것도
맞히지 못했을 때만 부른다. 앞의 두 방법은 결정적이라 호출 비용이 없고, 이 방법만
생성 모델을 쓴다.

`careersignal.agents.statistics.judge` 와 하는 일이 다르다. 관계 판정은 기존 차원으로
설명되지 않는 표현에 이름을 붙이고 새 후보를 만들며, 이 배정은 이미 승격된 차원
가운데 하나를 고른다. 고를 것이 없으면 비운다. 없는 차원을 만들지 않고 가까운 차원에
임의로 붙이지도 않는다. 임의로 붙이면 서로 다른 요구가 한 숫자로 뭉개진다
(docs/statistics-model.md 3.2).

모델이 스스로 적은 확신을 `assignment_confidence` 로 쓰지 않는다. 근거는
docs/agent-design.md 8장의 "생성 모델의 자기 보고를 신뢰도로 사용하지 않는다" 이며,
방법마다 정한 값은 `careersignal.taxonomy.assignment` 가 갖는다. 이 모듈의
`confidence` 는 판정을 버릴지 정하는 문턱값의 재료일 뿐이다.

구조는 `careersignal.agents.statistics.judge` 와 같다. Protocol 로 모양을 정하고,
실구현과 결정적 대역을 나란히 둔다. 이 모듈은 저장소와 어휘 모듈을 모른다. 문자열과
선택지를 받아 판정을 돌려줄 뿐이고, 식별자 부여와 적재는
`careersignal.taxonomy.assignment` 가 수행한다.
"""

from __future__ import annotations

import json
import os
from typing import Any, Protocol, runtime_checkable

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from careersignal.agents.statistics.judge import DimensionOption
from careersignal.providers.models import chat_model

ASSIGNMENT_TASK = "classification"
"""`TASK_TIER` 의 작업 이름. 경량 등급이며 근거는 docs/agent-design.md 13장이다.

닫힌 목록에서 하나를 고르는 분류다. 목록에 없는 개념에 이름을 붙이는
`dimension_naming` 과 달리 새 어휘를 만들지 않으므로 중간 등급을 쓰지 않는다.
"""

MODEL_ASSIGNMENT_PROMPT = """너는 채용공고에서 뽑은 요구 표현 하나를 이미 확정된
요구 차원 가운데 하나에 배정한다.

주어지는 것은 표현 하나와 그 표현이 있던 구간 라벨, 그리고 배정할 수 있는 차원
목록이다. 차원 목록은 비어 있을 수 있다.

1. dimension_id 는 반드시 주어진 목록의 식별자여야 한다. 목록에 없는 식별자를
   만들지 않는다.
2. 표현이 가리키는 요구가 목록의 어느 차원과도 같지 않으면 dimension_id 를 null 로
   둔다. 가장 가까운 차원에 억지로 붙이지 않는다. 준비해야 할 것이 다르면 다른
   요구이며, 억지로 붙이면 서로 다른 요구가 한 숫자로 세어진다.
3. 의미가 인접하다는 이유로 배정하지 않는다. 메시지 큐, 비동기 처리, 이벤트 기반
   아키텍처, 대용량 트래픽은 함께 나타나지만 각각 다른 차원이다.
4. 차원 목록이 비어 있으면 dimension_id 는 null 이다.
5. rationale 은 그 배정을 고른 이유를 한 문장으로 적는다.
6. confidence 는 배정의 확신이며 0 과 1 사이의 수다. 근거가 없으면 null 로 둔다.

출력은 주어진 스키마를 따르는 JSON 하나다. 설명 문장을 덧붙이지 않는다."""

ASSIGNMENT_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "dimension_id": {"type": ["string", "null"]},
        "rationale": {"type": "string"},
        "confidence": {"type": ["number", "null"]},
    },
    "required": ["dimension_id", "rationale", "confidence"],
    "additionalProperties": False,
}
"""구조화 출력 스키마.

`strict` 모드는 모든 속성이 `required` 에 있기를 요구하므로, 값이 없을 수 있는
`dimension_id` 와 `confidence` 는 생략이 아니라 `null` 허용으로 표현한다.
"""

NO_DIMENSIONS = "(배정할 차원 없음)"
"""활성 분류체계에 차원이 없을 때 사용자 메시지에 적는 말."""

NO_SECTION = "(구간 라벨 없음)"
"""구간 라벨을 모를 때 사용자 메시지에 적는 말."""


class AssignmentJudgment(BaseModel):
    """표현 하나의 배정 결과.

    `posting_requirement_assignments` 행 전체가 아니라 모델이 만들 수 있는 부분만
    담는다. 식별자, 분류체계 버전, 방법, 신뢰도, `requiredness`, `depth_level` 은
    할당 실행이 채운다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    dimension_id: str | None = None
    """비어 있으면 배정하지 않는다. 이 표현은 차원 후보로 남는다."""

    rationale: str = ""
    """배정을 고른 이유. 검증과 재할당 비교가 읽는다."""

    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    """모델의 자기 보고. `assignment_confidence` 로 그대로 쓰지 않는다."""

    @property
    def assigned(self) -> bool:
        return self.dimension_id is not None


@runtime_checkable
class DimensionAssigner(Protocol):
    """표현 하나를 활성 차원 하나에 배정하는 것.

    `expression` 은 mention 의 원문 표현이고 `section` 은 그 표현이 있던 구간
    라벨이며 모를 수 있다. `options` 는 배정할 수 있는 차원이며 비어 있을 수 있다.
    """

    def assign(
        self,
        expression: str,
        options: tuple[DimensionOption, ...] = (),
        section: str | None = None,
    ) -> AssignmentJudgment: ...


class OpenAIDimensionAssigner:
    """OpenAI 차원 배정 어댑터.

    구조화 출력으로 스키마를 강제해 자유 문장이 오지 않게 한다. 스키마가 막지 못하는
    것은 목록에 없는 차원을 가리키는 배정이며, 여기서 확인하고 비운다. 없는 차원에
    할당을 붙이면 외래키가 끊기고, 임의로 가까운 차원에 붙이면 서로 다른 요구가 한
    숫자로 뭉개진다. 배정하지 않는 쪽이 되돌릴 수 있다.
    """

    def __init__(
        self,
        client: Any | None = None,
        *,
        task: str = ASSIGNMENT_TASK,
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

    def assign(
        self,
        expression: str,
        options: tuple[DimensionOption, ...] = (),
        section: str | None = None,
    ) -> AssignmentJudgment:
        """표현 하나를 보내고 목록 안의 배정만 돌려준다."""
        if not expression.strip():
            raise ValueError("배정할 표현이 비었다")
        if not options:
            return AssignmentJudgment()

        payload = self._request(expression, options, section)
        allowed = {option.dimension_id for option in options}
        return self._judgment(payload, allowed)

    # ------------------------------------------------------------ 내부
    def _request(
        self,
        expression: str,
        options: tuple[DimensionOption, ...],
        section: str | None,
    ) -> dict[str, Any]:
        response = self._sdk().chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": MODEL_ASSIGNMENT_PROMPT},
                {
                    "role": "user",
                    "content": user_message(expression, options, section),
                },
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "posting_requirement_assignment",
                    "schema": ASSIGNMENT_RESPONSE_SCHEMA,
                    "strict": True,
                },
            },
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("배정 응답이 비었다")
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            raise ValueError("배정 응답이 객체가 아니다")
        return parsed

    def _judgment(
        self, item: dict[str, Any], allowed: set[str]
    ) -> AssignmentJudgment:
        """목록 밖의 차원을 비운다."""
        dimension_id = item.get("dimension_id")
        if dimension_id not in allowed:
            dimension_id = None
        try:
            return AssignmentJudgment(
                dimension_id=dimension_id,
                rationale=str(item.get("rationale", "")),
                confidence=item.get("confidence"),
            )
        except ValidationError as exc:
            raise ValueError(f"배정 응답을 읽지 못했다: {exc}") from exc

    def _sdk(self) -> Any:
        """실제로 호출할 때 만든다. 대역만 쓰는 실행 경로가 키를 요구하지 않는다."""
        if self._client is None:
            from openai import OpenAI

            key = self._api_key or os.getenv("OPENAI_API_KEY")
            if not key:
                raise RuntimeError("OPENAI_API_KEY 가 agent/.env 에 없다")
            self._client = OpenAI(api_key=key, timeout=self._timeout, max_retries=2)
        return self._client


class StubDimensionAssigner:
    """결정적 대역. 외부를 호출하지 않는다.

    선택지의 라벨이 표현에 글자 그대로 들어 있으면 그 차원에 배정하고, 없으면
    비운다. 선택지가 여럿 걸리면 라벨이 긴 쪽을 고른다. 긴 라벨이 더 좁은 요구를
    가리키므로 임의로 넓은 차원에 붙는 것을 막는다.

    이 규칙은 실제 배정이 아니라 할당 실행을 끝까지 돌리기 위한 대역이다. 문자열
    포함만으로 같은 개념을 단정하지 않는다는 docs/statistics-model.md 3.2 의 요구는
    실구현이 지키며, 대역은 저장 경로와 방법 사슬을 검사할 값을 만들 뿐이다.

    `dimension_id` 를 주면 선택지에 있을 때 그 값만 돌려준다. 방법별 저장 경로를
    확인할 때 쓴다. `calls` 는 호출마다 받은 `(표현, 선택지 식별자, 구간 라벨)` 이다.
    """

    model = "stub-dimension-assigner"

    def __init__(self, dimension_id: str | None = None) -> None:
        self._forced = dimension_id
        self.calls: list[tuple[str, tuple[str, ...], str | None]] = []

    def assign(
        self,
        expression: str,
        options: tuple[DimensionOption, ...] = (),
        section: str | None = None,
    ) -> AssignmentJudgment:
        self.calls.append(
            (expression, tuple(o.dimension_id for o in options), section)
        )
        if not options:
            return AssignmentJudgment()

        allowed = {option.dimension_id for option in options}
        if self._forced is not None:
            if self._forced not in allowed:
                return AssignmentJudgment()
            return AssignmentJudgment(
                dimension_id=self._forced, rationale="대역 배정: 지정된 차원"
            )

        text = expression.casefold()
        matched = [
            option for option in options if option.label.casefold() in text
        ]
        if not matched:
            return AssignmentJudgment()
        best = max(matched, key=lambda option: (len(option.label), option.dimension_id))
        return AssignmentJudgment(
            dimension_id=best.dimension_id, rationale=f"대역 배정: {best.label}"
        )


def user_message(
    expression: str,
    options: tuple[DimensionOption, ...] = (),
    section: str | None = None,
) -> str:
    """모델에 보내는 사용자 메시지. 표현과 구간 라벨과 선택지를 나눠 적는다."""
    listed = (
        "\n".join(
            f"- {option.dimension_id} | {option.label}"
            + (f" | {option.definition}" if option.definition else "")
            for option in options
        )
        or NO_DIMENSIONS
    )
    label = section if section else NO_SECTION
    return f"표현: {expression}\n구간 라벨: {label}\n배정 가능한 차원:\n{listed}"


__all__ = [
    "ASSIGNMENT_RESPONSE_SCHEMA",
    "ASSIGNMENT_TASK",
    "MODEL_ASSIGNMENT_PROMPT",
    "NO_DIMENSIONS",
    "NO_SECTION",
    "AssignmentJudgment",
    "DimensionAssigner",
    "OpenAIDimensionAssigner",
    "StubDimensionAssigner",
    "user_message",
]
