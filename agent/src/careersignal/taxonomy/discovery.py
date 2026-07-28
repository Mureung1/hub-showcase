"""차원 후보 발견의 실행 골격.

정의는 docs/statistics-model.md 3.1·3.2·3.3 이고, 저장 자리는 docs/erd.md 7.7 과
7.8 이다.

mention 을 하나씩 활성 분류체계 어휘에 대조해 기지와 잔여로 가른다. 개방 어휘만으로
추출하면 이미 확정된 차원을 누락하고 의미가 가까운 별개 개념을 하나로 합치므로, 두
경로를 나눠 실행한다.

잔여 표현은 매칭 키로 묶어 후보 하나가 된다. 같은 표현이 여러 공고에서 나오면 후보
하나에 근거 mention 이 여럿 붙는다. 후보마다 판정에 걸 기존 차원을 추리고, 관계
판정을 받아 `relation_judgment` 에 채운다.

발견은 후보 생성까지다. 후보의 `lifecycle_status` 는 `proposed` 이고 `active` 이전의
후보는 통계에 포함하지 않는다. 승격과 분류체계 버전 발행은 이 모듈이 하지 않는다.
근거는 docs/statistics-model.md 3.3·3.4 다.

기지로 갈린 표현을 `posting_requirement_assignments` 에 쓰지 않는다. 할당은 별도
단위이며 방법과 신뢰도를 함께 기록한다. 이 실행은 갈린 결과만 결과 모델에 남긴다.
"""

from __future__ import annotations

import hashlib
from collections import Counter
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from careersignal.agents.statistics.judge import (
    DimensionOption,
    RelationJudge,
    RelationJudgment,
)
from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.repositories.statistics import StatisticsRepository
from careersignal.taxonomy.vocabulary import Vocabulary, normalize_expression

PROPOSED = "proposed"
"""후보의 생명주기 첫 상태. 정의는 docs/statistics-model.md 3.3 이다."""

NO_ACTIVE_TAXONOMY = "활성 분류체계 버전이 없다"
"""직무에 발행된 분류체계 버전이 없다. 어휘가 비어 있는 것과 다른 상태다."""

TAXONOMY_MISMATCH = "실행 봉투의 분류체계 버전이 활성 버전과 다르다"
"""봉투가 고정한 버전과 저장소의 활성 버전이 어긋났다.

그대로 진행하면 서로 다른 버전의 판정이 한 후보 집합에 섞인다. 근거는
docs/statistics-model.md 3.5 다.
"""

UNNORMALIZABLE = "매칭 키가 비었다"
"""기호만 남은 표현. 묶을 키가 없어 후보를 만들지 못한다."""

NEIGHBOUR_LIMIT = 8
"""판정에 거는 기존 차원의 수. 선택지가 많을수록 판정이 흔들린다.

겹침이 없는 차원은 애초에 빠지므로(`Vocabulary.neighbours`) 이 수는 상한이다.
어휘가 커지면 같은 표현에 걸리는 차원이 늘어나며, 상한이 낮으면 정작 동의어인
차원이 목록 밖으로 밀려 후보가 별개 차원으로 승격된다.
"""


def candidate_identifier(taxonomy_id: str, match_key: str) -> str:
    """같은 분류체계의 같은 표현은 같은 후보다.

    발견을 다시 돌려도 같은 표현이 같은 식별자를 받는다. 키가 아니라 표현 원문으로
    식별하면 `Kafka` 와 `kafka` 가 후보 둘이 되고, 근거 mention 이 갈려 승격 심사의
    독립 공고 수가 실제보다 작아진다.

    분류체계를 재료에 넣는 이유는 직무마다 분류체계가 하나이기 때문이다. 백엔드의
    `배포 자동화` 와 디자이너의 `배포 자동화` 는 다른 후보다.
    """
    material = f"{taxonomy_id}:{match_key}".encode()
    return f"cand_{hashlib.sha256(material).hexdigest()[:24]}"


class CandidateSummary(BaseModel):
    """이번 실행이 만든 후보 하나의 요약."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    candidate_id: str
    match_key: str
    proposed_label: str
    relation_judgment: str
    nearest_dimension_id: str | None = None
    rationale: str = ""
    mention_count: int = 0
    """이 실행에서 붙인 근거 mention 수. 승격 심사의 독립 공고 수와 다르다."""


class DiscoveryOutcome(BaseModel):
    """발견 실행 하나의 결과."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    agent_run_id: str
    stop_reason: StopReason
    taxonomy_version_id: str | None = None
    vocabulary_size: int = 0
    """대조에 쓴 활성 차원 수. 0 이면 냉시작이며 모든 표현이 잔여로 흐른다."""

    visited_mentions: int = 0
    skipped_mentions: int = 0
    """이미 후보에 붙어 있어 건너뛴 mention. 증분 재실행이 여기서 갈린다."""

    known_mentions: int = 0
    """기지 추출로 기존 차원이 설명한 표현."""

    residual_mentions: int = 0
    """잔여 추출로 흐른 표현."""

    created_candidates: int = 0
    reused_candidates: int = 0
    """이미 있던 후보에 근거만 더한 경우. 판정을 다시 부르지 않는다."""

    linked_mentions: int = 0
    judged: int = 0
    """관계 판정 호출 수. 예산의 단위다."""

    known_assignments: tuple[tuple[str, str], ...] = ()
    """기지로 갈린 `(mention, 차원)`. 할당 단계의 입력이며 여기서 저장하지 않는다."""

    candidates: tuple[CandidateSummary, ...] = ()
    relations: dict[str, int] = Field(default_factory=dict)
    """판정별 후보 수. 다섯 값 가운데 나온 것만 담는다."""

    discarded: tuple[tuple[str, str], ...] = ()
    """묶지 못해 버린 표현. `(mention, 사유)` 다."""

    errors: tuple[tuple[str, str], ...] = ()
    """판정 구현이 던진 예외와 실행 전제의 실패. `(대상, 사유)` 다."""

    @property
    def gained_evidence(self) -> bool:
        return self.created_candidates > 0 or self.linked_mentions > 0


class CandidateDiscovery:
    """mention 을 기지와 잔여로 가르고 잔여에서 차원 후보를 만든다."""

    def __init__(
        self, judge: RelationJudge, repository: StatisticsRepository
    ) -> None:
        self._judge = judge
        self._repository = repository

    def run(self, context: RunContext, limit: int | None = None) -> DiscoveryOutcome:
        """mention 을 소진하거나 예산이 끝날 때까지 후보를 만든다.

        한 후보의 판정 실패가 나머지를 막지 않는다. 이미 후보에 붙은 mention 은
        건너뛴다.
        """
        active = self._repository.active_taxonomy_version(context.job_role_id)
        if active is None:
            return self._halted(context, NO_ACTIVE_TAXONOMY)

        taxonomy_version_id = active["taxonomy_version_id"]
        if (
            context.taxonomy_version_id is not None
            and context.taxonomy_version_id != taxonomy_version_id
        ):
            return self._halted(context, TAXONOMY_MISMATCH, taxonomy_version_id)

        vocabulary = Vocabulary.from_rows(
            taxonomy_version_id,
            self._repository.active_dimensions(taxonomy_version_id),
            self._repository.active_aliases(taxonomy_version_id),
        )
        rows = self._repository.mentions_to_discover(
            context.dataset_version, context.job_role_id, limit
        )
        linked = self._repository.candidate_mentions(context.dataset_version)

        state = _State(context, active["taxonomy_id"], vocabulary, taxonomy_version_id)
        groups = self._split(rows, linked, state)
        self._propose(groups, state)
        return state.outcome(rows)

    # ------------------------------------------------------------ 이중 경로
    def _split(
        self,
        rows: list[dict[str, Any]],
        linked: set[str],
        state: _State,
    ) -> dict[str, list[dict[str, Any]]]:
        """기지와 잔여로 가른다.

        어휘가 비면 대조가 아무것도 맞히지 못하고 전부 잔여로 흐른다. 이것이 첫
        실행의 정상 동작이며, 어휘가 채워진 뒤에도 같은 경로를 지난다.
        """
        groups: dict[str, list[dict[str, Any]]] = {}
        for row in rows:
            if row["mention_id"] in linked:
                state.skipped += 1
                continue
            state.visited += 1

            match = state.vocabulary.match(row["raw_expression"])
            if match is not None:
                state.known.append((row["mention_id"], match.dimension_id))
                continue

            key = normalize_expression(row["raw_expression"])
            if not key:
                state.discarded.append((row["mention_id"], UNNORMALIZABLE))
                continue
            groups.setdefault(key, []).append(row)
            state.residual += 1
        return groups

    # ------------------------------------------------------------ 후보
    def _propose(self, groups: dict[str, list[dict[str, Any]]], state: _State) -> None:
        """묶인 표현마다 후보 하나를 만들고 근거 mention 을 붙인다."""
        existing = self._repository.candidate_ids(state.taxonomy_id)

        for key, members in groups.items():
            candidate_id = candidate_identifier(state.taxonomy_id, key)

            if candidate_id in existing:
                state.reused += 1
                self._link(candidate_id, members, state)
                continue

            if state.judged >= state.context.budget.max_tool_calls:
                state.budget_exhausted = True
                break
            state.judged += 1

            expression = _representative(members)
            try:
                judgment = self._judge.judge(
                    expression,
                    self._options(expression, state.vocabulary),
                    _examples(members, expression),
                )
            except Exception as exc:
                state.errors.append((key, f"{type(exc).__name__}: {exc}"))
                continue

            self._repository.add_candidate(
                _candidate_row(candidate_id, state, judgment)
            )
            state.created += 1
            state.relations[judgment.relation] = (
                state.relations.get(judgment.relation, 0) + 1
            )
            self._link(candidate_id, members, state)
            state.candidates.append(
                CandidateSummary(
                    candidate_id=candidate_id,
                    match_key=key,
                    proposed_label=judgment.proposed_label,
                    relation_judgment=judgment.relation,
                    nearest_dimension_id=judgment.nearest_dimension_id,
                    rationale=judgment.rationale,
                    mention_count=len(members),
                )
            )

    def _link(
        self, candidate_id: str, members: list[dict[str, Any]], state: _State
    ) -> None:
        """근거 mention 을 후보에 붙인다. `requirement_candidate_mentions` 다."""
        for row in members:
            self._repository.link_candidate_mention(candidate_id, row["mention_id"])
            state.linked += 1

    def _options(
        self, expression: str, vocabulary: Vocabulary
    ) -> tuple[DimensionOption, ...]:
        """판정에 걸 기존 차원. 어휘가 비면 빈 목록이다.

        표시 라벨을 준다. 판정은 사람이 읽는 이름으로 하고, 내부 표준 라벨은 저장의
        기준이다.
        """
        return tuple(
            DimensionOption(
                dimension_id=entry.dimension_id,
                label=entry.display_label,
                definition=entry.definition,
            )
            for entry in vocabulary.neighbours(expression, NEIGHBOUR_LIMIT)
        )

    # ------------------------------------------------------------ 실패
    def _halted(
        self,
        context: RunContext,
        reason: str,
        taxonomy_version_id: str | None = None,
    ) -> DiscoveryOutcome:
        """실행 전제가 깨진 결과. 근거 없음과 구분한다."""
        return DiscoveryOutcome(
            agent_run_id=context.agent_run_id,
            stop_reason=StopReason.EXPLICIT_FAILURE,
            taxonomy_version_id=taxonomy_version_id,
            errors=((context.job_role_id, reason),),
        )


class _State:
    """실행 하나가 쌓는 값. 결과 모델로 굳히기 전의 가변 상태다."""

    def __init__(
        self,
        context: RunContext,
        taxonomy_id: str,
        vocabulary: Vocabulary,
        taxonomy_version_id: str,
    ) -> None:
        self.context = context
        self.taxonomy_id = taxonomy_id
        self.vocabulary = vocabulary
        self.taxonomy_version_id = taxonomy_version_id

        self.visited = 0
        self.skipped = 0
        self.residual = 0
        self.created = 0
        self.reused = 0
        self.linked = 0
        self.judged = 0
        self.budget_exhausted = False

        self.known: list[tuple[str, str]] = []
        self.candidates: list[CandidateSummary] = []
        self.relations: dict[str, int] = {}
        self.discarded: list[tuple[str, str]] = []
        self.errors: list[tuple[str, str]] = []

    def outcome(self, rows: list[dict[str, Any]]) -> DiscoveryOutcome:
        return DiscoveryOutcome(
            agent_run_id=self.context.agent_run_id,
            stop_reason=_stop_reason(
                rows=rows,
                created=self.created,
                linked=self.linked,
                errors=bool(self.errors),
                budget_exhausted=self.budget_exhausted,
            ),
            taxonomy_version_id=self.taxonomy_version_id,
            vocabulary_size=len(self.vocabulary.dimensions),
            visited_mentions=self.visited,
            skipped_mentions=self.skipped,
            known_mentions=len(self.known),
            residual_mentions=self.residual,
            created_candidates=self.created,
            reused_candidates=self.reused,
            linked_mentions=self.linked,
            judged=self.judged,
            known_assignments=tuple(self.known),
            candidates=tuple(self.candidates),
            relations=dict(self.relations),
            discarded=tuple(self.discarded),
            errors=tuple(self.errors),
        )


def _candidate_row(
    candidate_id: str, state: _State, judgment: RelationJudgment
) -> dict[str, Any]:
    """저장할 후보 한 줄. 컬럼은 docs/erd.md 7.7 이다.

    `lifecycle_status` 는 언제나 `proposed` 다. 판정이 `synonym` 이어도 별칭으로
    올리지 않는다. 승격은 심사를 거친다.

    `judged_against_taxonomy_version_id` 와 `judgment_rationale` 을 함께 남긴다.
    관계 판정은 판정에 건 기존 차원 목록에 상대적이고 그 목록은 특정 분류체계
    버전에서 나오므로, 어느 버전 기준의 판정인지 남지 않으면 승격 심사가 판정을
    그대로 믿을 수 없다. 근거는 docs/adr/0011-candidate-judgment-context.md 다.
    """
    return {
        "candidate_id": candidate_id,
        "taxonomy_id": state.taxonomy_id,
        "proposed_label": judgment.proposed_label,
        "lifecycle_status": PROPOSED,
        "nearest_dimension_id": judgment.nearest_dimension_id,
        "relation_judgment": judgment.relation,
        "judged_against_taxonomy_version_id": state.taxonomy_version_id,
        "judgment_rationale": judgment.rationale,
        "discovered_in_run_id": state.context.agent_run_id,
    }


def _representative(members: list[dict[str, Any]]) -> str:
    """후보의 대표 표현.

    같은 키로 묶인 표현들 가운데 가장 자주 쓰인 표기를 고른다. 같은 횟수면 사전
    순으로 가른다. 재실행이 같은 표현을 고르고, 판정과 라벨이 흔들리지 않는다.
    """
    counted = Counter(row["raw_expression"] for row in members)
    return min(counted, key=lambda text: (-counted[text], text))


def _examples(members: list[dict[str, Any]], representative: str) -> tuple[str, ...]:
    """대표 표현 말고 같은 후보에 묶인 다른 표기. 중복은 지운다."""
    seen: dict[str, None] = {}
    for row in members:
        text = row["raw_expression"]
        if text != representative:
            seen.setdefault(text, None)
    return tuple(seen)


def _stop_reason(
    rows: list[dict[str, Any]],
    created: int,
    linked: int,
    errors: bool,
    budget_exhausted: bool,
) -> StopReason:
    """docs/agent-design.md 11.1의 종료 조건을 판정한다.

    순서가 의미를 갖는다. 예산이 끝나 표현을 남긴 실행을 전수 조사로 볼 수 없고,
    판정 구현이 깨진 실행을 근거 없음으로 볼 수 없다.
    """
    if budget_exhausted:
        return StopReason.BUDGET_EXHAUSTED
    if errors:
        return StopReason.EXPLICIT_FAILURE
    if not rows:
        return StopReason.FRONTIER_EXHAUSTED
    if created or linked:
        return StopReason.SLOTS_FILLED
    return StopReason.NO_NEW_EVIDENCE


__all__ = [
    "NEIGHBOUR_LIMIT",
    "NO_ACTIVE_TAXONOMY",
    "PROPOSED",
    "TAXONOMY_MISMATCH",
    "UNNORMALIZABLE",
    "CandidateDiscovery",
    "CandidateSummary",
    "DiscoveryOutcome",
    "candidate_identifier",
]
