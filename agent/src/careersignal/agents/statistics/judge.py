"""차원 후보 명명과 관계 판정 어댑터.

기존 차원으로 설명되지 않은 표현 하나를 받아 후보 라벨을 짓고, 가장 가까운 기존
차원과의 관계를 판정한다. 판정 값 네 가지의 정의는 docs/statistics-model.md 3.2 이고,
결과가 들어가는 자리는 docs/erd.md 7.7 의 `proposed_label`,
`nearest_dimension_id`, `relation_judgment`, `proposed_dimension_kind` 다.

차원 종류도 같은 호출이 낸다. 값 집합은 docs/erd.md 7.3 이고, 이 값이 없으면
`Technology` 그래프 노드가 하나도 만들어지지 않는다(docs/ontology-v1.md 2.1).

명명과 판정을 한 포트에 둔다. 근거는 셋이다.

- 두 일의 입력이 같다. 후보 표현과 근거 표현들과 기존 차원 목록이 전부이며,
  라벨을 짓는 이해가 곧 관계를 가르는 이해다.
- 결과가 `requirement_candidates` 한 행으로 들어간다. 나눠 부르면 라벨은
  `메시지 큐`인데 판정은 기존 `메시지 큐` 차원과 `none` 인 행이 나올 수 있다.
- 모델 배치가 같다. `dimension_naming` 과 `relation_judgement` 는
  `providers/models.py` 의 `TASK_TIER` 에서 둘 다 중간 등급이라, 합쳐도 어느 쪽의
  등급도 바뀌지 않는다. 근거는 docs/agent-design.md 13장이다.

생성 모델을 쓰는 근거는 docs/agent-design.md 7.3 의 "원문 표현의 추출과 차원 후보
명명에 생성 모델을 사용한다" 이다. 빈도와 비율은 이 포트가 만들지 않는다.

구조는 `careersignal.agents.statistics.extractor` 와 같다. Protocol 로 모양을
정하고, 실구현과 결정적 대역을 나란히 둔다. 이 모듈은 저장소와 어휘 모듈을 모른다.
문자열과 선택지를 받아 판정을 돌려줄 뿐이고, 후보 식별자 부여와 적재는
`careersignal.taxonomy.discovery` 가 수행한다.
"""

from __future__ import annotations

import json
import os
from typing import Any, Literal, Protocol, runtime_checkable

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from careersignal.providers.models import chat_model

JUDGEMENT_TASK = "relation_judgement"
"""`TASK_TIER` 의 작업 이름. 중간 등급이며 근거는 docs/agent-design.md 13장이다."""

NAMING_TASK = "dimension_naming"
"""같은 호출이 겸하는 작업. 등급이 같아 모델 선택이 갈리지 않는다."""

Relation = Literal["synonym", "broader", "narrower", "related", "none"]

RELATIONS: tuple[str, ...] = ("synonym", "broader", "narrower", "related", "none")
"""`requirement_candidates.relation_judgment` 의 CHECK 와 같은 집합이다."""

NO_RELATION: Relation = "none"
"""기존 차원으로 설명되지 않는다. 신규 차원 후보가 된다."""

DimensionKind = Literal[
    "technology", "practice", "domain", "collaboration", "tooling"
]

DIMENSION_KINDS: tuple[str, ...] = (
    "technology",
    "practice",
    "domain",
    "collaboration",
    "tooling",
)
"""`requirement_dimensions.dimension_kind` 의 CHECK 와 같은 집합이다.

값은 docs/erd.md 7.3 이 정한다. 같은 판정이 이 값을 함께 내는 이유는
docs/ontology-v1.md 2.1 이다. `Technology` 그래프 노드는
`dimension_kind = 'technology'` 인 차원에서만 만들어지므로, 종류를 판정하지 않으면
온톨로지의 기술 절반이 비어 있는 채로 남는다.

종류를 별도 호출로 나누지 않는다. 이름을 짓는 이해가 곧 종류를 가르는 이해이며,
나눠 부르면 모델 호출이 후보 수만큼 늘어난다.
"""

RELATION_JUDGEMENT_PROMPT = """너는 채용공고에서 발견된 요구 표현에 이름을 붙이고,
그 표현이 기존 요구 차원과 어떤 관계인지 판정한다.

주어지는 것은 표현 하나와 같은 표현이 나온 다른 공고의 문구, 그리고 기존 차원
목록이다. 기존 차원 목록은 비어 있을 수 있다.

1. proposed_label 은 이 표현이 가리키는 요구의 이름이다. 표현이 담은 범위보다
   넓히지 않고 좁히지 않는다. 회사 이름, 연차, 우대·필수 같은 조건 표현은 이름에
   넣지 않는다. 표기가 흔들린 여러 문구가 함께 오면 그중 하나를 고르지 말고 공통된
   요구를 가리키는 이름을 짓는다.
2. relation 은 다음 다섯 중 하나다.
   - synonym: 기존 차원과 같은 개념의 다른 표기다.
   - broader: 이 표현이 기존 차원을 포함하는 더 넓은 개념이다.
   - narrower: 이 표현이 기존 차원에 포함되는 더 좁은 개념이다.
   - related: 함께 자주 나타나지만 별개 개념이다.
   - none: 기존 차원 어느 것으로도 설명되지 않는다.
3. 의미가 가깝다는 이유로 synonym 을 고르지 않는다. 준비해야 할 것이 다르면 다른
   개념이다. 메시지 큐, 비동기 처리, 이벤트 기반 아키텍처, 대용량 트래픽은 함께
   나타나지만 각각 다른 준비를 요구하므로 related 다.
4. relation 이 none 이 아니면 nearest_dimension_id 에 주어진 목록의 식별자를 그대로
   적는다. none 이면 null 로 둔다. 목록에 없는 식별자를 만들지 않는다.
5. 기존 차원 목록이 비어 있으면 relation 은 none 이고 nearest_dimension_id 는
   null 이다.
6. dimension_kind 는 이 요구가 어떤 종류인지이며 다음 다섯 중 하나다.
   - technology: 언어·프레임워크·미들웨어처럼 이름을 가진 기술 그 자체다.
   - practice: 설계·운영·테스트처럼 기술을 쓰는 방식과 일하는 방법이다.
   - domain: 커머스·금융·광고처럼 그 일이 다루는 사업 영역의 지식이다.
   - collaboration: 협업·소통·리드처럼 사람과 함께 일하는 능력이다.
   - tooling: Jira·GitHub Actions 처럼 개발을 돕는 도구의 사용이다.
7. rationale 은 그 판정을 고른 이유를 한 문장으로 적는다.
8. confidence 는 판정의 확신이며 0 과 1 사이의 수다. 근거가 없으면 null 로 둔다.

출력은 주어진 스키마를 따르는 JSON 하나다. 설명 문장을 덧붙이지 않는다."""

JUDGEMENT_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "proposed_label": {"type": "string"},
        "relation": {"type": "string", "enum": list(RELATIONS)},
        "nearest_dimension_id": {"type": ["string", "null"]},
        "dimension_kind": {"type": ["string", "null"], "enum": [*DIMENSION_KINDS, None]},
        "rationale": {"type": "string"},
        "confidence": {"type": ["number", "null"]},
    },
    "required": [
        "proposed_label",
        "relation",
        "nearest_dimension_id",
        "dimension_kind",
        "rationale",
        "confidence",
    ],
    "additionalProperties": False,
}
"""구조화 출력 스키마.

`strict` 모드는 모든 속성이 `required` 에 있기를 요구하므로, 값이 없을 수 있는
`nearest_dimension_id` 와 `confidence` 는 생략이 아니라 `null` 허용으로 표현한다.
"""

NO_DIMENSIONS = "(기존 차원 없음)"
"""활성 분류체계에 차원이 없을 때 사용자 메시지에 적는 말."""

NO_EXAMPLES = "(다른 문구 없음)"
"""근거 표현이 하나뿐일 때 사용자 메시지에 적는 말."""


class DimensionOption(BaseModel):
    """판정에 걸 기존 차원 하나.

    어휘 값 객체가 아니라 이 포트의 입력 형식이다. 이 모듈이
    `careersignal.taxonomy` 를 모르게 하려고 따로 둔다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    dimension_id: str
    label: str
    definition: str | None = None


class RelationJudgment(BaseModel):
    """후보 하나에 대한 명명과 판정.

    `requirement_candidates` 행 전체가 아니라 모델이 만들 수 있는 부분만 담는다.
    식별자, `taxonomy_id`, `lifecycle_status`, 실행 계보는 발견 실행이 채운다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    proposed_label: str = Field(min_length=1)
    """`requirement_candidates.proposed_label`. 후보의 이름이다."""

    relation: Relation = NO_RELATION
    """`requirement_candidates.relation_judgment`. 다섯 값의 CHECK 를 따른다."""

    nearest_dimension_id: str | None = None
    """`requirement_candidates.nearest_dimension_id`. 관계가 `none` 이면 비운다."""

    dimension_kind: DimensionKind | None = None
    """`requirement_candidates.proposed_dimension_kind`. 다섯 값의 CHECK 를 따른다.

    비울 수 있다. 판정이 종류를 고르지 못한 상태와 `practice` 로 고른 상태는 다르며,
    비운 값을 승격이 `practice` 로 떨어뜨리되 그 사실을 결과에 남긴다.
    """

    rationale: str = ""
    """판정을 고른 이유. 승격 심사가 읽는다."""

    confidence: float | None = Field(default=None, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def _relation_needs_a_dimension(self) -> RelationJudgment:
        """관계는 상대가 있어야 성립한다.

        `none` 인데 차원을 가리키거나 `synonym` 인데 상대가 없는 행은
        `requirement_candidates` 에 들어가서는 안 된다. 승격 심사가 이 두 컬럼을
        함께 읽는다.
        """
        if self.relation == NO_RELATION and self.nearest_dimension_id is not None:
            raise ValueError("관계가 none 이면 nearest_dimension_id 를 비운다")
        if self.relation != NO_RELATION and not self.nearest_dimension_id:
            raise ValueError(f"관계가 {self.relation} 이면 상대 차원이 필요하다")
        return self


@runtime_checkable
class RelationJudge(Protocol):
    """후보 표현 하나를 명명하고 기존 차원과의 관계를 판정하는 것.

    `expression` 은 후보의 대표 표현이고 `examples` 는 같은 후보에 묶인 다른 공고의
    문구다. `options` 는 판정에 걸 기존 차원이며 비어 있을 수 있다.
    """

    def judge(
        self,
        expression: str,
        options: tuple[DimensionOption, ...] = (),
        examples: tuple[str, ...] = (),
    ) -> RelationJudgment: ...


class OpenAIRelationJudge:
    """OpenAI 명명·관계 판정 어댑터.

    구조화 출력으로 스키마를 강제해 자유 문장이 오지 않게 한다. 스키마가 막지 못하는
    것은 목록에 없는 차원을 가리키는 판정이며, 여기서 확인하고 `none` 으로 내린다.
    없는 차원에 후보를 붙이면 외래키가 끊기고, 임의로 가까운 차원에 붙이면 서로 다른
    요구가 한 숫자로 뭉개진다. 새 후보로 남기는 쪽이 되돌릴 수 있다.
    """

    def __init__(
        self,
        client: Any | None = None,
        *,
        task: str = JUDGEMENT_TASK,
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

    def judge(
        self,
        expression: str,
        options: tuple[DimensionOption, ...] = (),
        examples: tuple[str, ...] = (),
    ) -> RelationJudgment:
        """표현 하나를 보내고 검사를 통과한 판정만 돌려준다."""
        if not expression.strip():
            raise ValueError("판정할 표현이 비었다")

        payload = self._request(expression, options, examples)
        allowed = {option.dimension_id for option in options}
        return self._judgment(payload, expression, allowed)

    # ------------------------------------------------------------ 내부
    def _request(
        self,
        expression: str,
        options: tuple[DimensionOption, ...],
        examples: tuple[str, ...],
    ) -> dict[str, Any]:
        response = self._sdk().chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": RELATION_JUDGEMENT_PROMPT},
                {
                    "role": "user",
                    "content": user_message(expression, options, examples),
                },
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "requirement_candidate_judgement",
                    "schema": JUDGEMENT_RESPONSE_SCHEMA,
                    "strict": True,
                },
            },
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("판정 응답이 비었다")
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            raise ValueError("판정 응답이 객체가 아니다")
        return parsed

    def _judgment(
        self, item: dict[str, Any], expression: str, allowed: set[str]
    ) -> RelationJudgment:
        """목록 밖의 차원과 짝이 맞지 않는 관계를 `none` 으로 내린다.

        다섯 값 밖의 `dimension_kind` 도 비운다. 종류를 지어내면
        `Technology` 그래프 노드가 기술이 아닌 요구에서 만들어진다
        (docs/ontology-v1.md 2.1).
        """
        relation = str(item.get("relation", NO_RELATION))
        nearest = item.get("nearest_dimension_id")
        if relation not in RELATIONS or nearest not in allowed:
            relation, nearest = NO_RELATION, None
        if relation == NO_RELATION:
            nearest = None

        kind = item.get("dimension_kind")
        if kind not in DIMENSION_KINDS:
            kind = None

        label = str(item.get("proposed_label", "")).strip() or expression.strip()
        try:
            return RelationJudgment(
                proposed_label=label,
                relation=relation,  # type: ignore[arg-type]
                nearest_dimension_id=nearest,
                dimension_kind=kind,  # type: ignore[arg-type]
                rationale=str(item.get("rationale", "")),
                confidence=item.get("confidence"),
            )
        except ValidationError as exc:
            raise ValueError(f"판정 응답을 읽지 못했다: {exc}") from exc

    def _sdk(self) -> Any:
        """실제로 호출할 때 만든다. 대역만 쓰는 실행 경로가 키를 요구하지 않는다."""
        if self._client is None:
            from openai import OpenAI

            key = self._api_key or os.getenv("OPENAI_API_KEY")
            if not key:
                raise RuntimeError("OPENAI_API_KEY 가 agent/.env 에 없다")
            self._client = OpenAI(api_key=key, timeout=self._timeout, max_retries=2)
        return self._client


class StubRelationJudge:
    """결정적 대역. 외부를 호출하지 않는다.

    라벨은 받은 표현을 그대로 쓰고, 관계는 글자 포함 관계로 정한다. 선택지가 없으면
    `none` 이고, 라벨이 표현과 같으면 `synonym`, 한쪽이 다른 쪽을 담으면
    `broader` 또는 `narrower`, 글자가 겹치기만 하면 `related` 다.

    이 규칙은 실제 판정이 아니라 발견 실행을 끝까지 돌리기 위한 대역이다. 문자열
    포함만으로 동의어를 단정하지 않는다는 docs/statistics-model.md 3.2 의 요구는
    실구현이 지키며, 대역은 저장 경로와 집계 대상 판정을 검사할 값을 만들 뿐이다.

    `relation` 을 주면 그 값만 돌려준다. 판정 네 값의 저장 경로를 각각 확인할 때
    쓴다. `calls` 는 호출마다 받은 `(표현, 선택지 식별자, 근거 표현)` 이다.

    `dimension_kind` 도 같은 방식으로 준다. 기본값은 `practice` 이며 종류를 가장
    적게 특정하는 값이다. `None` 을 주면 종류를 고르지 못한 판정이 되어, 승격이
    기본값으로 떨어뜨리는 경로를 확인할 수 있다. 대역이 표현을 보고 종류를
    추측하지 않는 이유는 그것이 판정이기 때문이며, 대역은 저장 경로만 만든다.
    """

    model = "stub-relation-judge"

    def __init__(
        self,
        relation: str | None = None,
        dimension_kind: str | None = "practice",
    ) -> None:
        if relation is not None and relation not in RELATIONS:
            raise ValueError(f"관계 판정 값이 아니다: {relation}")
        if dimension_kind is not None and dimension_kind not in DIMENSION_KINDS:
            raise ValueError(f"차원 종류 값이 아니다: {dimension_kind}")
        self._forced = relation
        self._kind = dimension_kind
        self.calls: list[tuple[str, tuple[str, ...], tuple[str, ...]]] = []

    def judge(
        self,
        expression: str,
        options: tuple[DimensionOption, ...] = (),
        examples: tuple[str, ...] = (),
    ) -> RelationJudgment:
        self.calls.append(
            (expression, tuple(o.dimension_id for o in options), tuple(examples))
        )
        label = expression.strip()
        if not options:
            return RelationJudgment(
                proposed_label=label,
                relation=NO_RELATION,
                dimension_kind=self._kind,  # type: ignore[arg-type]
            )

        option = options[0]
        relation = self._forced or self._relation(label, option.label)
        nearest = None if relation == NO_RELATION else option.dimension_id
        return RelationJudgment(
            proposed_label=label,
            relation=relation,  # type: ignore[arg-type]
            nearest_dimension_id=nearest,
            dimension_kind=self._kind,  # type: ignore[arg-type]
            rationale=f"대역 판정: {option.label}",
        )

    def _relation(self, expression: str, label: str) -> str:
        """글자만 보는 규칙. 어휘 정규화를 쓰지 않는다."""
        left, right = expression.casefold(), label.casefold()
        if left == right:
            return "synonym"
        if right in left:
            return "narrower"
        if left in right:
            return "broader"
        if set(left) & set(right):
            return "related"
        return NO_RELATION


def user_message(
    expression: str,
    options: tuple[DimensionOption, ...] = (),
    examples: tuple[str, ...] = (),
) -> str:
    """모델에 보내는 사용자 메시지. 표현과 근거 문구와 선택지를 나눠 적는다."""
    listed = (
        "\n".join(
            f"- {option.dimension_id} | {option.label}"
            + (f" | {option.definition}" if option.definition else "")
            for option in options
        )
        or NO_DIMENSIONS
    )
    others = "\n".join(f"- {text}" for text in examples) or NO_EXAMPLES
    return (
        f"표현: {expression}\n"
        f"같은 표현이 나온 다른 문구:\n{others}\n"
        f"기존 차원:\n{listed}"
    )
