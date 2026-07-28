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

발견은 후보를 만든 뒤 판정이 낡은 후보를 다시 판정한다. 근거는
docs/statistics-model.md 3.1 과 3.5 다.

3.1 의 이중 경로에서 잔여 표현은 "기존 차원으로 설명되지 않는 표현" 이고, 관계 판정은
그 실행의 활성 분류체계 어휘를 선택지로 걸어 나온다. 곧 판정은 어휘에 절대적이지 않고
특정 분류체계 버전에 상대적이다. 3.5 는 새 버전을 발행하면 그 데이터셋의 mention 을
전부 다시 할당하고 버전이 다른 할당을 섞어 집계하지 않는다고 정한다. 할당이 버전에
상대적이면 그 할당의 어휘를 만든 판정도 버전에 상대적이어야 한다.

냉시작의 첫 실행은 어휘가 비어 있어 모든 후보가 `relation = none` 으로 판정된다. 그
판정은 "기존 차원 어느 것으로도 설명되지 않는다" 가 아니라 "걸 기존 차원이 없었다" 는
뜻이다. 승격이 첫 차원들을 발행해 어휘가 채워진 뒤에도 그 판정을 그대로 두면, 이미
차원이 된 개념의 다른 표기가 영원히 별개의 신규 후보로 남고 별칭이 하나도 생기지
않는다. 그래서 `judged_against_taxonomy_version_id` 가 활성 버전과 다른 후보를 새
어휘를 걸고 다시 판정한다. 종료 상태(`merged`·`split`·`deprecated`)의 후보는 나가는
전이가 없으므로 제외하고, 이미 차원이 된 `active` 후보도 제외한다(`REJUDGE_EXCLUDED`).

기지로 갈린 표현을 `posting_requirement_assignments` 에 쓰지 않는다. 할당은 별도
단위이며 방법과 신뢰도를 함께 기록한다. 이 실행은 갈린 결과만 결과 모델에 남긴다.

첫 판정과 재판정 모두 모델 호출을 겹쳐 보내고 저장은 주 갈래에서 입력 순서대로
한다. 근거는 `providers/concurrency.py` 다. 묶음(`groups`)의 순회 순서와 후보에
붙는 근거 mention 의 순서가 실행마다 같아야 하므로, 도착 순서가 아니라 입력 순서로
결과를 적용한다.
"""

from __future__ import annotations

import hashlib
from collections import Counter
from collections.abc import Callable
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from careersignal.agents.statistics.judge import (
    DimensionOption,
    RelationJudge,
    RelationJudgment,
)
from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.providers.concurrency import DEFAULT_WORKERS, map_ordered
from careersignal.repositories.statistics import StatisticsRepository
from careersignal.taxonomy.lifecycle import ACTIVE, TERMINAL_STATUSES
from careersignal.taxonomy.vocabulary import Vocabulary, normalize_expression

PROPOSED = "proposed"
"""후보의 생명주기 첫 상태. 정의는 docs/statistics-model.md 3.3 이다."""

REJUDGE_EXCLUDED: tuple[str, ...] = tuple(sorted(TERMINAL_STATUSES | {ACTIVE}))
"""다시 판정하지 않는 생명주기 상태.

`merged`·`split`·`deprecated` 는 나가는 전이가 없는 상태다
(docs/statistics-model.md 3.3). 판정을 새로 받아도 이 후보가 갈 곳이 없고, 부른
만큼 예산만 줄어든다.

`active` 도 뺀다. 이 후보는 이미 승격해 차원이 되었으므로 새 어휘에 자기가 만든
차원이 들어 있고, 다시 판정하면 자기 자신의 동의어라는 답을 얻는다. 그 답은 후보
행을 흔들 뿐 아무것도 고치지 못한다.
"""

NO_CANDIDATE_EXPRESSION = "후보에 붙은 표현이 없다"
"""근거 mention 이 이 데이터셋에 없는 후보. 판정에 보낼 표현이 없어 건너뛴다."""

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
    proposed_dimension_kind: str | None = None
    """판정이 고른 차원 종류. 고르지 못했으면 비운다. 값 집합은 docs/erd.md 7.3 이다."""

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
    """이미 있던 후보에 근거만 더한 경우. 이 자리에서 판정을 다시 부르지 않는다."""

    rejudged_candidates: int = 0
    """판정이 낡아 다시 판정한 후보 수.

    `reused_candidates` 와 구분한다. 재사용은 근거만 더하는 일이라 모델 호출이 0 이고
    재판정은 후보마다 호출이 하나다. 둘을 한 수로 합치면 다음 실행의 예산을 세울 수
    없다.
    """

    linked_mentions: int = 0
    judged: int = 0
    """관계 판정 호출 수. 예산의 단위다.

    첫 판정과 재판정을 함께 센다. 둘 다 모델 호출 하나이며 예산은 호출을 센다.
    """

    known_assignments: tuple[tuple[str, str], ...] = ()
    """기지로 갈린 `(mention, 차원)`. 할당 단계의 입력이며 여기서 저장하지 않는다."""

    candidates: tuple[CandidateSummary, ...] = ()
    """이 실행이 새로 만든 후보의 요약."""

    rejudged: tuple[CandidateSummary, ...] = ()
    """이 실행이 다시 판정한 후보의 요약. `match_key` 는 대표 표현의 키다."""

    relations: dict[str, int] = Field(default_factory=dict)
    """판정별 후보 수. 다섯 값 가운데 나온 것만 담는다.

    첫 판정과 재판정을 함께 센다. 재판정이 `none` 을 `synonym` 으로 바꾸는 것이
    이 실행의 성과이므로 두 수를 나누면 그 변화가 보이지 않는다.
    """

    discarded: tuple[tuple[str, str], ...] = ()
    """묶지 못해 버린 표현. `(mention, 사유)` 다."""

    errors: tuple[tuple[str, str], ...] = ()
    """판정 구현이 던진 예외와 실행 전제의 실패. `(대상, 사유)` 다."""

    @property
    def gained_evidence(self) -> bool:
        return (
            self.created_candidates > 0
            or self.linked_mentions > 0
            or self.rejudged_candidates > 0
        )


class CandidateDiscovery:
    """mention 을 기지와 잔여로 가르고 잔여에서 차원 후보를 만든다."""

    def __init__(
        self,
        judge: RelationJudge,
        repository: StatisticsRepository,
        workers: int = DEFAULT_WORKERS,
        stop_when: Callable[[BaseException], bool] | None = None,
    ) -> None:
        """`workers` 는 동시에 보낼 모델 요청 수다. 1 이면 하나씩 부른다.

        `stop_when` 은 되살릴 수 없는 실패를 가르는 판정이다. 참이면 아직 보내지
        않은 후보를 더 보내지 않는다. 판정 자체는 `taxonomy/assignment.py` 의
        `unrecoverable_exception` 이 갖고 있으며, 그 모듈이 이 모듈을 import 하므로
        여기서 되받으면 순환이 된다. 실행 스크립트가 넣어 준다.
        """
        self._judge = judge
        self._repository = repository
        self._workers = workers
        self._stop_when = stop_when

    def run(self, context: RunContext, limit: int | None = None) -> DiscoveryOutcome:
        """mention 을 소진하거나 예산이 끝날 때까지 후보를 만들고 낡은 판정을 세운다.

        한 후보의 판정 실패가 나머지를 막지 않는다. 이미 후보에 붙은 mention 은
        건너뛴다.

        차례가 의미를 갖는다. 새 표현의 후보를 먼저 만들고 남은 예산으로 재판정한다.
        새 표현은 이번 실행이 아니면 후보조차 없는 상태로 남지만, 재판정 대상은 이미
        후보 행이 있어 다음 실행이 같은 자리에서 이어받는다.
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
        self._rejudge(state)
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
        """묶인 표현마다 후보 하나를 만들고 근거 mention 을 붙인다.

        세 걸음으로 나눈다. 예산이 닿는 자리까지 잘라 내고, 판정이 필요한 묶음만
        모아 동시에 부르고, 원래 묶음 순서대로 저장한다. 저장소 접근은 첫 걸음과
        셋째 걸음에만 있으므로 전부 주 갈래에서 일어난다.
        """
        existing = self._repository.candidate_ids(state.taxonomy_id)
        ordered = list(groups.items())
        window = self._within_budget(ordered, existing, state)

        fresh = [
            (key, members)
            for key, members in window
            if candidate_identifier(state.taxonomy_id, key) not in existing
        ]
        results = map_ordered(
            lambda entry: self._judge_group(entry[1], state),
            fresh,
            self._workers,
            self._stop_when,
        )
        state.judged += len(results)
        judged = {entry[0]: record for entry, record in zip(fresh, results)}

        for key, members in window:
            candidate_id = candidate_identifier(state.taxonomy_id, key)
            if candidate_id in existing:
                state.reused += 1
                self._link(candidate_id, members, state)
                continue

            record = judged.get(key)
            if record is None:
                # 되살릴 수 없는 실패로 멈춘 뒤의 묶음. 보내지 않았으므로 저장소에
                # 자국이 없고 다음 실행이 같은 자리에서 다시 집는다.
                break
            if record.error is not None:
                state.errors.append(
                    (key, f"{type(record.error).__name__}: {record.error}")
                )
                continue

            judgment = record.value
            assert judgment is not None
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
                    proposed_dimension_kind=judgment.dimension_kind,
                    rationale=judgment.rationale,
                    mention_count=len(members),
                )
            )

    def _within_budget(
        self,
        ordered: list[tuple[str, list[dict[str, Any]]]],
        existing: set[str],
        state: _State,
    ) -> list[tuple[str, list[dict[str, Any]]]]:
        """예산이 닿는 자리까지의 묶음.

        예산이 끝나는 자리에서 통째로 멈춘다. 뒤에 있는 재사용 후보도 붙이지
        않는다. 판정 하나가 예산을 넘는 순간 그 실행은 거기서 끊긴 것이고, 뒤의
        묶음을 골라 처리하면 다음 실행이 이어받을 자리가 흐려진다.
        """
        needed = 0
        for index, (key, _members) in enumerate(ordered):
            if candidate_identifier(state.taxonomy_id, key) in existing:
                continue
            if state.judged + needed >= state.context.budget.max_tool_calls:
                state.budget_exhausted = True
                return ordered[:index]
            needed += 1
        return ordered

    def _judge_group(self, members: list[dict[str, Any]], state: _State) -> Any:
        """묶음 하나의 관계 판정. 다른 갈래에서 도는 부분이다.

        저장소를 만지지 않는다. 대표 표현을 고르고 어휘에서 선택지를 추리는 것은
        모두 읽기이며, 어휘는 실행 중에 바뀌지 않는다.
        """
        expression = _representative(members)
        return self._judge.judge(
            expression,
            self._options(expression, state.vocabulary),
            _examples(members, expression),
        )

    # ------------------------------------------------------------ 재판정
    def _rejudge(self, state: _State) -> None:
        """판정 기준 버전이 활성 버전과 다른 후보를 새 어휘로 다시 판정한다.

        후보 행을 지우거나 합치지 않는다. `candidate_id` 와 근거 mention 은 그대로
        두고 판정 네 컬럼만 갈아 끼운다. 후보는 어느 표현에서 나왔는지의 기록이며
        그 계보를 잃으면 결정 행이 무엇을 근거로 섰는지 되짚을 수 없다.

        예산은 첫 판정과 함께 쓴다. 재판정도 모델 호출 하나이며, 앞선 `_propose` 가
        예산을 다 쓰면 여기서는 한 건도 부르지 않는다.

        후보의 표현을 저장소에서 읽는 일은 보내기 전에 주 갈래에서 끝낸다. 그래야
        저장소 연결을 한 갈래만 쓰고, 보낼 목록도 예산만큼 미리 잘린다.
        """
        rows = self._repository.stale_candidates(
            state.taxonomy_id, state.taxonomy_version_id, REJUDGE_EXCLUDED
        )

        tasks: list[tuple[str, tuple[str, ...]]] = []
        for row in rows:
            if state.judged + len(tasks) >= state.context.budget.max_tool_calls:
                state.budget_exhausted = True
                break

            candidate_id = row["candidate_id"]
            expressions = tuple(
                self._repository.candidate_expressions(
                    candidate_id, state.context.dataset_version
                )
            )
            if not expressions:
                state.discarded.append((candidate_id, NO_CANDIDATE_EXPRESSION))
                continue
            tasks.append((candidate_id, expressions))

        results = map_ordered(
            lambda task: self._judge.judge(
                task[1][0],
                self._options(task[1][0], state.vocabulary),
                tuple(task[1][1:]),
            ),
            tasks,
            self._workers,
            self._stop_when,
        )
        state.judged += len(results)

        for record in results:
            candidate_id, expressions = record.item
            if record.error is not None:
                state.errors.append(
                    (candidate_id, f"{type(record.error).__name__}: {record.error}")
                )
                continue

            judgment = record.value
            assert judgment is not None
            self._repository.update_candidate_judgment(
                candidate_id, _judgment_update(state, judgment)
            )
            state.rejudged += 1
            state.relations[judgment.relation] = (
                state.relations.get(judgment.relation, 0) + 1
            )
            state.rejudged_candidates.append(
                CandidateSummary(
                    candidate_id=candidate_id,
                    match_key=normalize_expression(expressions[0]),
                    proposed_label=judgment.proposed_label,
                    relation_judgment=judgment.relation,
                    nearest_dimension_id=judgment.nearest_dimension_id,
                    proposed_dimension_kind=judgment.dimension_kind,
                    rationale=judgment.rationale,
                    mention_count=len(expressions),
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
        self.rejudged = 0
        self.linked = 0
        self.judged = 0
        self.budget_exhausted = False

        self.known: list[tuple[str, str]] = []
        self.candidates: list[CandidateSummary] = []
        self.rejudged_candidates: list[CandidateSummary] = []
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
                rejudged=self.rejudged,
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
            rejudged_candidates=self.rejudged,
            linked_mentions=self.linked,
            judged=self.judged,
            known_assignments=tuple(self.known),
            candidates=tuple(self.candidates),
            rejudged=tuple(self.rejudged_candidates),
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
        "proposed_dimension_kind": judgment.dimension_kind,
        "judged_against_taxonomy_version_id": state.taxonomy_version_id,
        "judgment_rationale": judgment.rationale,
        "discovered_in_run_id": state.context.agent_run_id,
    }


def _judgment_update(state: _State, judgment: RelationJudgment) -> dict[str, Any]:
    """재판정이 갈아 끼우는 컬럼. 판정 결과와 그 판정이 선 버전만이다.

    `candidate_id`·`taxonomy_id`·`discovered_in_run_id` 와 근거 mention 은 손대지
    않는다. 후보의 계보는 발견의 기록이며 판정이 바뀌었다고 사라지지 않는다.

    `lifecycle_status` 도 손대지 않는다. 판정과 생명주기는 다른 축이고, 상태를
    옮기는 것은 승격 심사의 몫이다(docs/statistics-model.md 3.3).
    """
    return {
        "proposed_label": judgment.proposed_label,
        "nearest_dimension_id": judgment.nearest_dimension_id,
        "relation_judgment": judgment.relation,
        "proposed_dimension_kind": judgment.dimension_kind,
        "judged_against_taxonomy_version_id": state.taxonomy_version_id,
        "judgment_rationale": judgment.rationale,
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
    rejudged: int,
    errors: bool,
    budget_exhausted: bool,
) -> StopReason:
    """docs/agent-design.md 11.1의 종료 조건을 판정한다.

    순서가 의미를 갖는다. 예산이 끝나 표현을 남긴 실행을 전수 조사로 볼 수 없고,
    판정 구현이 깨진 실행을 근거 없음으로 볼 수 없다.

    새 표현이 없어도 재판정이 있었으면 진행한 실행이다. 낡은 판정을 세운 실행을
    아무것도 하지 않은 실행과 같이 볼 수 없다.
    """
    if budget_exhausted:
        return StopReason.BUDGET_EXHAUSTED
    if errors:
        return StopReason.EXPLICIT_FAILURE
    if not rows and not rejudged:
        return StopReason.FRONTIER_EXHAUSTED
    if created or linked or rejudged:
        return StopReason.SLOTS_FILLED
    return StopReason.NO_NEW_EVIDENCE


__all__ = [
    "NEIGHBOUR_LIMIT",
    "NO_ACTIVE_TAXONOMY",
    "NO_CANDIDATE_EXPRESSION",
    "PROPOSED",
    "REJUDGE_EXCLUDED",
    "TAXONOMY_MISMATCH",
    "UNNORMALIZABLE",
    "CandidateDiscovery",
    "CandidateSummary",
    "DiscoveryOutcome",
    "candidate_identifier",
]
