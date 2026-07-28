"""표현과 차원의 할당 실행.

정의는 docs/statistics-model.md 3.1·3.5 이고, 저장 자리는 docs/erd.md 7.13 이다.
표현과 할당을 나눈 이유는 docs/adr/0005-mention-assignment-separation.md 에 있다.
mention 은 원문 근거를 담고 분류체계를 참조하지 않으며, 해석 결과는 이 실행이
`posting_requirement_assignments` 에 남긴다.

방법을 우선순위 사슬로 둔다. `alias_exact` → `vector_match` → `model_judgment` 순으로
시도하고 먼저 맞힌 방법에서 멈춘다. 순서의 근거는 되돌릴 수 있는 정도다. 별칭 정확
일치는 표기 차이만 흡수하는 결정적 판단이라 재실행이 같은 결과를 주고, 벡터 근접은
의미 공간의 거리라 문턱값에 따라 흔들리며, 모델 판정은 실행마다 달라질 수 있다.
값싸고 흔들리지 않는 방법을 먼저 쓰면 비싼 방법이 볼 표현이 줄고 결과의 재현성이
올라간다.

`manual` 은 이 실행이 만들지 않는다. 사람이 넣은 할당이며, 같은 버전에 이미 있으면
증분 판정이 그 mention 을 건너뛰므로 자동 판정이 덮어쓰지 않는다.

한 mention 은 분류체계 버전당 하나의 차원에만 할당된다.
`UNIQUE (mention_id, taxonomy_version_id)` 가 이를 강제하고 지표의 중복 제거가 이
제약에 의존한다(docs/metric-spec.md 2.2). 할당 식별자를 두 값에서 결정적으로 만들어
재실행이 같은 행을 가리키게 한다.

대상은 A 계층 자료로 제한한다. 저장소 조회가 `posting_versions` 를 안쪽 조인하므로
공고로 등록되지 않은 출처의 표현은 대상에 들어오지 않는다.

차원이 하나도 없는 상태를 정상으로 취급한다. 냉시작의 활성 분류체계에는 차원이 없고,
어느 방법도 붙을 곳이 없으므로 아무것도 하지 않고 끝난다. 이때 임베딩과 모델을
부르지 않는다.
"""

from __future__ import annotations

import hashlib
import math
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from careersignal.agents.statistics.assigner import DimensionAssigner
from careersignal.agents.statistics.judge import DimensionOption
from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.providers.embeddings import EmbeddingClient
from careersignal.providers.models import EMBEDDING
from careersignal.repositories.assignment import AssignmentRepository
from careersignal.taxonomy.depth import judge_depth
from careersignal.taxonomy.discovery import (
    NEIGHBOUR_LIMIT,
    NO_ACTIVE_TAXONOMY,
    TAXONOMY_MISMATCH,
)
from careersignal.taxonomy.requiredness import normalize_requiredness
from careersignal.taxonomy.vocabulary import DimensionEntry, Vocabulary

ALIAS_EXACT = "alias_exact"
"""별칭·라벨의 매칭 키가 정확히 같다. `assignment_method` 의 첫 값이다."""

VECTOR_MATCH = "vector_match"
"""임베딩 근접이 문턱값을 넘었다. 표기가 달라도 의미가 가까운 표현을 집는다."""

MODEL_JUDGMENT = "model_judgment"
"""생성 모델이 활성 차원 하나를 골랐다. 앞의 두 방법이 비었을 때만 부른다."""

MANUAL = "manual"
"""사람이 넣은 할당. 이 실행이 만들지 않고 이미 있으면 건너뛴다."""

METHOD_CHAIN: tuple[str, ...] = (ALIAS_EXACT, VECTOR_MATCH, MODEL_JUDGMENT)
"""자동 방법의 시도 순서. 먼저 맞힌 방법에서 멈춘다."""

METHODS: tuple[str, ...] = (*METHOD_CHAIN, MANUAL)
"""`posting_requirement_assignments.assignment_method` 의 CHECK 와 같은 집합이다."""

METHOD_CONFIDENCE: dict[str, float] = {
    ALIAS_EXACT: 0.95,
    VECTOR_MATCH: 0.60,
    MODEL_JUDGMENT: 0.40,
    MANUAL: 1.0,
}
"""방법별 `assignment_confidence`.

값은 방법마다 고정한다. 생성 모델의 자기 보고를 신뢰도로 쓰지 않는다는
docs/agent-design.md 8장을 따르며, 같은 방법으로 붙은 할당은 같은 신뢰도를 갖는다.
서로 다른 근거 강도를 한 수로 뭉뚱그리지 않으려고 방법별로 값을 가른다.

- `alias_exact` 0.95. 승격 심사를 거친 별칭·라벨과 매칭 키가 정확히 같다. 1.0 이
  아닌 이유는 정규화가 대소문자와 띄어쓰기를 지우기 때문이다. 서로 다른 차원으로
  접히는 키는 어휘가 버리지만(`Vocabulary._register`), 한 차원 안에서 표기 변형이
  실제로 다른 요구였을 가능성은 남는다. 검증도 아직 돌지 않았다.
- `vector_match` 0.60. 의미 공간의 근접이며 근접이 곧 같은 개념은 아니다. 메시지
  큐와 비동기 처리는 가깝게 놓이지만 각각 다른 준비를 요구한다
  (docs/statistics-model.md 3.2). 문턱값을 넘겨도 별칭 일치보다 약한 근거다.
- `model_judgment` 0.40. 자동 세 방법 가운데 가장 약하다. 실행마다 결과가 달라질 수
  있고 목록 밖의 차원을 가리키는 응답을 어댑터가 걸러 낸 뒤에 남는 값이다.
- `manual` 1.0. 사람이 확인한 할당이다. 이 실행이 만들지 않는다.
"""

VECTOR_MATCH_THRESHOLD = 0.82
"""벡터 근접이 할당으로 굳는 코사인 유사도 문턱값.

문턱값을 낮추면 인접하지만 별개인 요구가 한 차원으로 뭉개지고, 높이면 표기가 다른
같은 요구가 매번 모델 판정으로 넘어간다. 뭉개진 할당은 지표에서 되돌릴 수 없고 모델
호출은 비용일 뿐이므로 높은 쪽으로 잡는다.
"""

PENDING_VERIFICATION = "pending"
"""`verifier_status` 의 초기값.

`verification/verdict.py` 의 `decide` 는 선언된 검사가 모두 실행되지 않았으면 판정
이름을 붙이지 않고 None 을 돌려준다. 할당은 만들어진 시점에 어떤 검사도 거치지
않았으므로 일곱 판정 가운데 어느 이름도 쓸 수 없고, 검사를 기다리는 상태를 따로
적는다. 검증이 끝나면 `TypedVerdict` 의 값으로 갱신된다.
"""

NO_DIMENSIONS = "활성 분류체계에 차원이 없다"
"""냉시작. 실패가 아니라 할당할 것이 없는 상태다."""

NOT_ASSIGNED = "어느 방법도 차원을 맞히지 못했다"
"""세 방법을 모두 지나고도 붙을 차원이 없다. 이 표현은 차원 후보로 남는다."""

BUDGET_STOPPED = "예산이 끝나 방법 사슬을 마치지 못했다"
"""남은 표현은 다음 실행이 같은 자리에서 다시 집는다."""

EMBEDDING_FAILED = "임베딩을 만들지 못했다"
"""벡터 방법만 비우고 모델 판정으로 넘긴다."""

DIMENSION_MISMATCH = "임베딩 차원이 설정과 다르다"
"""`EMBEDDING.dimensions` 와 다른 벡터는 비교에 쓰지 않는다."""


def assignment_identifier(mention_id: str, taxonomy_version_id: str) -> str:
    """같은 버전의 같은 mention 은 같은 할당이다.

    재료가 `UNIQUE (mention_id, taxonomy_version_id)` 와 같다. 재실행이 같은 행을
    가리키므로 중복 삽입이 기본키에서도 막히고, 버전이 다르면 다른 식별자가 되어
    이전 버전의 할당이 그대로 남는다.
    """
    material = f"{mention_id}:{taxonomy_version_id}".encode()
    return f"assign_{hashlib.sha256(material).hexdigest()[:24]}"


class AssignmentOutcome(BaseModel):
    """할당 실행 하나의 결과."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    agent_run_id: str
    stop_reason: StopReason
    taxonomy_version_id: str | None = None
    full_reassignment: bool = False
    """버전 변경으로 데이터셋 전체를 다시 할당한 실행인지."""

    vocabulary_size: int = 0
    """할당할 수 있는 활성 차원 수. 0 이면 냉시작이며 붙일 곳이 없다."""

    visited_mentions: int = 0
    skipped_mentions: int = 0
    """이 버전에 이미 할당이 있어 건너뛴 mention. 증분 재실행이 여기서 갈린다."""

    assigned_mentions: int = 0
    by_method: dict[str, int] = Field(default_factory=dict)
    """방법별 할당 수. 네 값 가운데 나온 것만 담는다."""

    embedded_expressions: int = 0
    """벡터를 만든 표현 수. 차원 라벨은 세지 않는다."""

    judged: int = 0
    """모델 판정 호출 수."""

    unassigned: tuple[tuple[str, str], ...] = ()
    """차원을 붙이지 못한 표현. `(mention, 사유)` 다."""

    errors: tuple[tuple[str, str], ...] = ()
    """구현이 던진 예외와 실행 전제의 실패. `(대상, 사유)` 다."""

    @property
    def gained_evidence(self) -> bool:
        return self.assigned_mentions > 0

    def count_of(self, method: str) -> int:
        return self.by_method.get(method, 0)


class RequirementAssignment:
    """요구 표현을 활성 차원에 할당한다.

    진입점이 둘이다. `run` 은 증분이고 `reassign` 은 분류체계 버전 변경 뒤의 전량
    재할당이다. 두 실행의 저장 규칙은 같고 대상 범위와 결과 표시가 다르다.
    """

    def __init__(
        self,
        assigner: DimensionAssigner,
        repository: AssignmentRepository,
        embeddings: EmbeddingClient | None = None,
    ) -> None:
        self._assigner = assigner
        self._repository = repository
        self._embeddings = embeddings

    # ------------------------------------------------------------ 진입점
    def run(self, context: RunContext, limit: int | None = None) -> AssignmentOutcome:
        """증분 실행. 이 버전에 아직 할당이 없는 mention 만 집는다.

        같은 버전으로 다시 돌리면 이미 할당된 mention 을 건너뛰므로 모델 호출이
        늘지 않는다. `limit` 으로 나눠 돌 수 있고, 남은 표현은 다음 실행이 집는다.
        """
        return self._execute(context, limit=limit, full=False)

    def reassign(
        self, context: RunContext, limit: int | None = None
    ) -> AssignmentOutcome:
        """전량 재할당. 새 분류체계 버전이 발행된 뒤 돈다.

        대상은 데이터셋의 mention 전체다. 근거는 docs/statistics-model.md 3.5 의
        "새 분류체계 버전을 발행하면 해당 데이터셋의 mention 전체를 다시 할당한다"
        이고, 버전이 다른 할당을 섞어 집계하지 않기 위해서다.

        `limit` 은 한 번에 처리할 건수를 자를 뿐이며 재할당의 완료 조건이 아니다.
        전량이 끝날 때까지 다시 돌린다. 기본값은 전량이므로 인자를 주지 않으면
        동작이 바뀌지 않는다. 저장소 조회가 이 버전에 이미 할당이 있는 표현을 먼저
        빼므로 자른 실행을 이어 돌리면 남은 표현부터 집는다.

        이전 버전의 할당 행을 지우지 않는다. `taxonomy_version_id` 가 다르므로
        UNIQUE 제약에 걸리지 않고, 분류체계 변경 전후의 통계를 각각 재현할 수 있다
        (docs/adr/0005-mention-assignment-separation.md).

        중간에 끊긴 재할당을 다시 돌려도 안전하다. 같은 버전에 이미 만든 행은
        건너뛴다.
        """
        return self._execute(context, limit=limit, full=True)

    # ------------------------------------------------------------ 실행
    def _execute(
        self, context: RunContext, limit: int | None, full: bool
    ) -> AssignmentOutcome:
        """방법 사슬을 한 번 돈다.

        한 표현의 실패가 나머지를 막지 않는다. 저장에 실패한 표현은 결과에 남고
        다음 실행이 다시 집는다.
        """
        active = self._repository.active_taxonomy_version(context.job_role_id)
        if active is None:
            return self._halted(context, NO_ACTIVE_TAXONOMY, full=full)

        taxonomy_version_id = active["taxonomy_version_id"]
        if (
            context.taxonomy_version_id is not None
            and context.taxonomy_version_id != taxonomy_version_id
        ):
            return self._halted(
                context, TAXONOMY_MISMATCH, taxonomy_version_id, full=full
            )

        vocabulary = Vocabulary.from_rows(
            taxonomy_version_id,
            self._repository.active_dimensions(taxonomy_version_id),
            self._repository.active_aliases(taxonomy_version_id),
        )
        rows = self._repository.mentions_to_assign(
            context.dataset_version, context.job_role_id, taxonomy_version_id, limit
        )
        done = self._repository.assigned_mentions(
            context.dataset_version, taxonomy_version_id
        )

        state = _State(context, vocabulary, taxonomy_version_id, full)
        pending = [row for row in rows if row["mention_id"] not in done]
        state.skipped = len(rows) - len(pending)

        if vocabulary.is_empty:
            state.visited = len(pending)
            state.unassigned = [
                (row["mention_id"], NO_DIMENSIONS) for row in pending
            ]
            return state.outcome(rows)

        residual = self._by_alias(pending, state)
        residual = self._by_vector(residual, state)
        self._by_model(residual, state)
        return state.outcome(rows)

    # ------------------------------------------------------------ 1. 별칭 일치
    def _by_alias(
        self, rows: list[dict[str, Any]], state: _State
    ) -> list[dict[str, Any]]:
        """어휘의 매칭 키와 정확히 같은 표현을 붙인다.

        사슬의 첫 자리다. 여기서 붙은 표현은 임베딩도 모델도 보지 않는다. 대조는
        결정적이라 재실행이 같은 결과를 준다.
        """
        residual: list[dict[str, Any]] = []
        for row in rows:
            state.visited += 1
            match = state.vocabulary.match(row["raw_expression"])
            if match is None:
                residual.append(row)
                continue
            self._store(row, match.dimension_id, ALIAS_EXACT, state)
        return residual

    # ------------------------------------------------------------ 2. 벡터 근접
    def _by_vector(
        self, rows: list[dict[str, Any]], state: _State
    ) -> list[dict[str, Any]]:
        """임베딩 근접이 문턱값을 넘은 표현을 붙인다.

        차원 라벨과 표현을 같은 종류의 문자열로 견준다. 정의문을 붙이지 않는 이유는
        길이가 제각각이라 근접도가 문장 길이에 끌리기 때문이다.

        임베딩 차원은 새로 정하지 않고 `providers/models.py` 의 `EMBEDDING` 을 쓴다.
        `text-embedding-3-large` 를 3072 에서 1536 으로 축소해 받는 처리는
        `providers/embeddings.py` 가 갖고 있으며, 축소 규칙을 두 벌 두지 않는다.

        임베딩이 없거나 넘어지면 이 방법만 비우고 모델 판정으로 넘긴다. 벡터 검색이
        비는 것과 실행이 실패하는 것은 다른 상태다.
        """
        if not rows or self._embeddings is None:
            return rows

        labels = [entry.display_label for entry in state.entries.values()]
        ids = list(state.entries)
        expressions = [row["raw_expression"] for row in rows]

        vectors = self._embed(labels + expressions, state)
        if vectors is None:
            return rows

        label_vectors = vectors[: len(labels)]
        state.embedded += len(expressions)

        residual: list[dict[str, Any]] = []
        for row, vector in zip(rows, vectors[len(labels) :]):
            ranked = sorted(
                (
                    (_cosine(vector, label_vector), dimension_id)
                    for dimension_id, label_vector in zip(ids, label_vectors)
                ),
                key=lambda item: (-item[0], item[1]),
            )
            state.ranked[row["mention_id"]] = tuple(
                dimension_id for score, dimension_id in ranked if score > 0.0
            )
            if ranked and ranked[0][0] >= VECTOR_MATCH_THRESHOLD:
                self._store(row, ranked[0][1], VECTOR_MATCH, state)
                continue
            residual.append(row)
        return residual

    def _embed(self, texts: list[str], state: _State) -> list[list[float]] | None:
        """문자열 묶음 하나를 벡터로 바꾼다. 실패하면 비운다."""
        if state.exhausted():
            state.budget_exhausted = True
            return None
        state.tool_calls += 1

        try:
            vectors = self._embeddings.embed(list(texts))  # type: ignore[union-attr]
        except Exception as exc:
            state.errors.append((VECTOR_MATCH, f"{type(exc).__name__}: {exc}"))
            return None

        if len(vectors) != len(texts):
            state.errors.append((VECTOR_MATCH, EMBEDDING_FAILED))
            return None
        if any(len(vector) != EMBEDDING.dimensions for vector in vectors):
            state.errors.append((VECTOR_MATCH, DIMENSION_MISMATCH))
            return None
        return [[float(value) for value in vector] for vector in vectors]

    # ------------------------------------------------------------ 3. 모델 판정
    def _by_model(self, rows: list[dict[str, Any]], state: _State) -> None:
        """앞의 두 방법이 비운 표현을 모델에 건다.

        선택지는 배정할 수 있는 활성 차원 가운데 추린 것이다. 벡터를 만들었으면
        근접 순으로, 아니면 글자 겹침으로 고른다. 목록이 비면 부르지 않는다. 고를
        것이 없는 판정은 비용만 쓴다.
        """
        for row in rows:
            options = self._options(row, state)
            if not options:
                state.unassigned.append((row["mention_id"], NOT_ASSIGNED))
                continue
            if state.exhausted():
                state.budget_exhausted = True
                state.unassigned.append((row["mention_id"], BUDGET_STOPPED))
                continue

            state.tool_calls += 1
            state.judged += 1
            try:
                judgment = self._assigner.assign(
                    row["raw_expression"], options, row.get("section")
                )
            except Exception as exc:
                state.errors.append(
                    (row["mention_id"], f"{type(exc).__name__}: {exc}")
                )
                continue

            if judgment.dimension_id is None:
                state.unassigned.append((row["mention_id"], NOT_ASSIGNED))
                continue
            self._store(row, judgment.dimension_id, MODEL_JUDGMENT, state)

    def _options(
        self, row: dict[str, Any], state: _State
    ) -> tuple[DimensionOption, ...]:
        """모델에 걸 활성 차원. 표시 라벨을 준다.

        판정은 사람이 읽는 이름으로 하고, 내부 표준 라벨은 저장의 기준이다.
        """
        ranked = state.ranked.get(row["mention_id"])
        if ranked is None:
            entries = state.vocabulary.neighbours(
                row["raw_expression"], NEIGHBOUR_LIMIT
            )
        else:
            entries = tuple(
                state.entries[dimension_id]
                for dimension_id in ranked[:NEIGHBOUR_LIMIT]
                if dimension_id in state.entries
            )
        return tuple(
            DimensionOption(
                dimension_id=entry.dimension_id,
                label=entry.display_label,
                definition=entry.definition,
            )
            for entry in entries
        )

    # ------------------------------------------------------------ 저장
    def _store(
        self, row: dict[str, Any], dimension_id: str, method: str, state: _State
    ) -> None:
        """할당 한 줄을 남긴다. 저장에 실패한 표현은 결과에 남는다."""
        entry = state.entries.get(dimension_id)
        if entry is None:
            state.unassigned.append((row["mention_id"], NOT_ASSIGNED))
            return
        try:
            self._repository.add_assignment(
                _assignment_row(row, entry, method, state.taxonomy_version_id)
            )
        except Exception as exc:
            state.errors.append((row["mention_id"], f"{type(exc).__name__}: {exc}"))
            return
        state.assigned += 1
        state.by_method[method] = state.by_method.get(method, 0) + 1

    # ------------------------------------------------------------ 실패
    def _halted(
        self,
        context: RunContext,
        reason: str,
        taxonomy_version_id: str | None = None,
        full: bool = False,
    ) -> AssignmentOutcome:
        """실행 전제가 깨진 결과. 할당할 것 없음과 구분한다."""
        return AssignmentOutcome(
            agent_run_id=context.agent_run_id,
            stop_reason=StopReason.EXPLICIT_FAILURE,
            taxonomy_version_id=taxonomy_version_id,
            full_reassignment=full,
            errors=((context.job_role_id, reason),),
        )


class _State:
    """실행 하나가 쌓는 값. 결과 모델로 굳히기 전의 가변 상태다."""

    def __init__(
        self,
        context: RunContext,
        vocabulary: Vocabulary,
        taxonomy_version_id: str,
        full: bool,
    ) -> None:
        self.context = context
        self.vocabulary = vocabulary
        self.taxonomy_version_id = taxonomy_version_id
        self.full = full

        self.entries: dict[str, DimensionEntry] = {
            entry.dimension_id: entry for entry in vocabulary.dimensions
        }
        """차원 식별자로 어휘 항목을 찾는 대응. `Vocabulary` 는 목록만 준다."""

        self.visited = 0
        self.skipped = 0
        self.assigned = 0
        self.embedded = 0
        self.judged = 0
        self.tool_calls = 0
        self.budget_exhausted = False

        self.by_method: dict[str, int] = {}
        self.ranked: dict[str, tuple[str, ...]] = {}
        """표현마다 벡터 근접 순으로 세운 차원. 모델 선택지를 고르는 데 쓴다."""

        self.unassigned: list[tuple[str, str]] = []
        self.errors: list[tuple[str, str]] = []

    def exhausted(self) -> bool:
        """예산은 외부 호출 수로 센다. 임베딩과 모델 판정이 함께 걸린다."""
        return self.tool_calls >= self.context.budget.max_tool_calls

    def outcome(self, rows: list[dict[str, Any]]) -> AssignmentOutcome:
        return AssignmentOutcome(
            agent_run_id=self.context.agent_run_id,
            stop_reason=_stop_reason(
                rows=rows,
                assigned=self.assigned,
                errors=bool(self.errors),
                budget_exhausted=self.budget_exhausted,
            ),
            taxonomy_version_id=self.taxonomy_version_id,
            full_reassignment=self.full,
            vocabulary_size=len(self.entries),
            visited_mentions=self.visited,
            skipped_mentions=self.skipped,
            assigned_mentions=self.assigned,
            by_method=dict(self.by_method),
            embedded_expressions=self.embedded,
            judged=self.judged,
            unassigned=tuple(self.unassigned),
            errors=tuple(self.errors),
        )


def _assignment_row(
    row: dict[str, Any],
    entry: DimensionEntry,
    method: str,
    taxonomy_version_id: str,
) -> dict[str, Any]:
    """저장할 할당 한 줄. 컬럼은 docs/erd.md 7.13 이다.

    `normalized_label` 은 표현 원문이 아니라 차원의 내부 표준 라벨이다. 원문은
    `requirement_mentions.raw_expression` 에 남아 있고, 이 자리는 어느 차원으로
    셌는지를 사람이 읽을 수 있게 적는 곳이다.

    `requiredness` 와 `depth_level` 은 순수 함수가 정한다. 저장소도 모델도 거치지
    않으므로 같은 mention 은 언제 돌려도 같은 값을 받는다.
    """
    return {
        "assignment_id": assignment_identifier(
            row["mention_id"], taxonomy_version_id
        ),
        "mention_id": row["mention_id"],
        "taxonomy_version_id": taxonomy_version_id,
        "dimension_id": entry.dimension_id,
        "normalized_label": entry.internal_canonical_label,
        "requiredness": str(normalize_requiredness(row.get("stated_requiredness"))),
        "depth_level": str(judge_depth(row["raw_expression"])),
        "assignment_confidence": METHOD_CONFIDENCE[method],
        "assignment_method": method,
        "verifier_status": PENDING_VERIFICATION,
    }


def _cosine(left: list[float], right: list[float]) -> float:
    """두 벡터의 코사인 유사도. 길이가 0 이면 0 이다."""
    norm_left = math.sqrt(sum(value * value for value in left))
    norm_right = math.sqrt(sum(value * value for value in right))
    if norm_left == 0.0 or norm_right == 0.0:
        return 0.0
    return sum(a * b for a, b in zip(left, right)) / (norm_left * norm_right)


def _stop_reason(
    rows: list[dict[str, Any]],
    assigned: int,
    errors: bool,
    budget_exhausted: bool,
) -> StopReason:
    """docs/agent-design.md 11.1의 종료 조건을 판정한다.

    순서가 의미를 갖는다. 예산이 끝나 표현을 남긴 실행을 전수 조사로 볼 수 없고,
    저장이나 판정이 깨진 실행을 근거 없음으로 볼 수 없다. 차원이 없어 아무것도
    붙이지 못한 실행은 실패가 아니라 근거 없음이다.
    """
    if budget_exhausted:
        return StopReason.BUDGET_EXHAUSTED
    if errors:
        return StopReason.EXPLICIT_FAILURE
    if not rows:
        return StopReason.FRONTIER_EXHAUSTED
    if assigned:
        return StopReason.SLOTS_FILLED
    return StopReason.NO_NEW_EVIDENCE


__all__ = [
    "ALIAS_EXACT",
    "BUDGET_STOPPED",
    "DIMENSION_MISMATCH",
    "EMBEDDING_FAILED",
    "MANUAL",
    "METHODS",
    "METHOD_CHAIN",
    "METHOD_CONFIDENCE",
    "MODEL_JUDGMENT",
    "NOT_ASSIGNED",
    "NO_DIMENSIONS",
    "PENDING_VERIFICATION",
    "VECTOR_MATCH",
    "VECTOR_MATCH_THRESHOLD",
    "AssignmentOutcome",
    "RequirementAssignment",
    "assignment_identifier",
]
