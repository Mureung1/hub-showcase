"""기준선·편차 판정의 순수 함수 (Phase 15-2·15-4).

정의는 docs/agent-design.md 7.4·8장, docs/erd.md 11.6, `CONTRACT.md` 5장 B 를 따른다.

이 모듈은 저장소도 모델 제공자도 부르지 않는다. 값을 받아 값을 낸다. 그래서
데이터베이스 없이 전 갈래를 검사할 수 있고, 편차 판정 규칙이 실행 코드와 섞이지
않는다. 수치는 여기서 다시 계산하지 않는다. 집계 파이프라인이 낸
`statistics_facts` 를 읽어 견주기만 한다. 같은 수를 두 곳에서 계산하면 화면의
수치와 근거의 수치가 갈라진다.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass

from careersignal.agents.interpretation.contract import (
    BaselineItem,
    ConfidenceGrade,
    CoverageAssertion,
    EvidenceRef,
    Relation,
    StatisticFact,
    UnchangedItem,
)
from careersignal.domain.scope import ScopeLevel

PREVALENCE_FAMILY = "posting_prevalence"
"""차원이 공고에 나타난 비율. 기준선의 `freq_pct` 가 여기서 온다."""

REQUIREDNESS_FAMILY = "requiredness_ratio"
"""나타난 공고 가운데 필수로 적힌 비율. 기준선의 `required_ratio` 다."""

RATIO_MEASURE = "ratio"

BASELINE_MIN_ITEMS = 7
BASELINE_MAX_ITEMS = 9
"""기준선 항목 수의 범위(`CONTRACT.md` 5장 B).

적으면 직무의 기대치를 설명하지 못하고, 많으면 화면이 우선순위를 잃는다. 아래
`baseline_items` 는 상한만 강제한다. 하한은 데이터가 정하는 것이라 함수가 만들어
낼 수 없고, 모자란 것은 부르는 쪽이 알아야 하므로 `baseline_short` 로 가른다.
"""

DEVIATION_DELTA = 0.15
"""편차로 볼 최소 비율 차이. 기업군 비율에서 직무 전체 비율을 뺀 값이다.

15%p 는 표본 아홉 건에서 공고 한 건 반의 차이보다 크다. 이보다 작은 차이를 편차로
부르면 표본 하나가 흔드는 값을 기업군의 성질로 말하게 된다.
"""

NEW_REQUIREMENT_FLOOR = 0.10
"""직무 전체에서 이 비율 아래면 "공통 항목에 없음" 으로 적는다."""

STRONG_SUPPORT = 2
"""높은 등급이 요구하는 독립 근거 수."""

MINIMUM_SAMPLE = 5
"""등급을 매길 수 있는 최소 표본. 이보다 적으면 낮은 등급으로 내린다."""

NO_BASELINE = "공통 항목에 없음"
"""직무 전체 기준선에 없던 요구를 기준선 칸에 적는 말."""

INSUFFICIENT = "판단 근거 부족"
"""전수 검사를 마치지 못해 편차 없음을 말할 수 없을 때 내는 말.

근거를 찾지 못한 것과 부재를 확인한 것을 구분한다(docs/agent-design.md 7.4).
"""


def _key(fact: StatisticFact) -> str | None:
    return fact.dimension_id


def facts_by_dimension(
    facts: Iterable[StatisticFact],
    metric_family: str,
    measure: str = RATIO_MEASURE,
) -> dict[str, StatisticFact]:
    """쓸 수 있는 사실만 차원별로 모은다.

    같은 차원에 같은 family 의 사실이 둘이면 뒤엣것이 앞엣것을 덮는다. 저장소의
    유일 제약이 (버전, family, measure, 범위, 구간, 기간, 차원) 조합에 하나만
    허용하므로 한 범위·한 기간을 읽는 한 충돌이 생기지 않는다.
    """
    out: dict[str, StatisticFact] = {}
    for fact in facts:
        dimension = _key(fact)
        if dimension is None:
            continue
        if fact.metric_family != metric_family or fact.measure != measure:
            continue
        if not fact.usable:
            continue
        out[dimension] = fact
    return out


def baseline_items(
    facts: Sequence[StatisticFact],
    titles: Mapping[str, str] | None = None,
    descriptions: Mapping[str, str] | None = None,
    limit: int = BASELINE_MAX_ITEMS,
) -> tuple[BaselineItem, ...]:
    """직무 전체 지표에서 기준선 목록을 만든다.

    등장 비율이 높은 차원부터 담는다. 같은 비율이면 차원 식별자 순서로 가른다.
    입력 순서가 흔들려도 같은 목록이 나와야 저장된 payload 가 실행마다 달라지지
    않는다.

    `titles` 가 없으면 사실이 갖고 온 `dimension_label` 을 쓰고, 그것도 없으면
    식별자를 그대로 쓴다. 이름을 지어내지 않는다.
    """
    if limit < 1:
        raise ValueError("limit 은 1 이상이다")
    titles = titles or {}
    descriptions = descriptions or {}

    prevalence = facts_by_dimension(facts, PREVALENCE_FAMILY)
    requiredness = facts_by_dimension(facts, REQUIREDNESS_FAMILY)

    ordered = sorted(
        prevalence.items(),
        key=lambda pair: (-(pair[1].value or 0.0), pair[0]),
    )
    items: list[BaselineItem] = []
    for dimension_id, fact in ordered[:limit]:
        required = requiredness.get(dimension_id)
        items.append(
            BaselineItem(
                item_id=dimension_id,
                title=titles.get(dimension_id) or fact.dimension_label or dimension_id,
                desc=descriptions.get(dimension_id, ""),
                freq_pct=fact.percent,
                required_ratio=required.percent if required else None,
            )
        )
    return tuple(items)


def baseline_short(items: Sequence[BaselineItem]) -> bool:
    """기준선이 최소 개수에 못 미치는가. 참이면 범위가 좁다는 뜻이다."""
    return len(items) < BASELINE_MIN_ITEMS


@dataclass(frozen=True, slots=True)
class DeviationVerdict:
    """차원 하나의 편차 판정. 문장이 아니라 수치와 성질만 담는다."""

    dimension_id: str
    topic: str
    baseline_pct: int | None
    scope_pct: int | None
    delta: float
    """범위 비율에서 직무 전체 비율을 뺀 값. 비율(0~1)이다."""

    is_deviation: bool
    is_new: bool
    """직무 전체에는 사실상 없던 요구인가."""

    sample_size: int = 0

    @property
    def baseline_text(self) -> str:
        """payload 의 `baseline` 칸에 적을 말."""
        if self.is_new or self.baseline_pct is None:
            return NO_BASELINE
        return f"직무 전체 {self.baseline_pct}%"

    @property
    def ratio_text(self) -> str:
        """payload 의 `ratio` 칸. 같은 직군 안의 등장 비율을 적는다."""
        if self.baseline_pct is None:
            return "같은 직군 자료 없음"
        return f"같은 직군 {self.baseline_pct}%"


def judge_deviation(
    dimension_id: str,
    topic: str,
    baseline: StatisticFact | None,
    scoped: StatisticFact | None,
    threshold: float = DEVIATION_DELTA,
) -> DeviationVerdict:
    """직무 기준선과 이 범위의 값을 견준다.

    범위 값이 없으면 편차가 아니다. 없는 것과 낮은 것은 다르며, 값이 없는 차원을
    0 으로 놓으면 측정하지 않은 것을 "요구하지 않는다" 로 바꿔 말하게 된다.

    아래로 벌어진 차이는 편차로 보지 않는다. 이 화면이 답하는 것은 "이 범위가 더
    요구하는 것" 이고, 덜 요구하는 것은 준비 항목을 늘리지 않는다.
    """
    if threshold <= 0:
        raise ValueError("threshold 는 0 보다 크다")

    baseline_value = baseline.value if baseline and baseline.usable else None
    scope_value = scoped.value if scoped and scoped.usable else None
    if scope_value is None:
        return DeviationVerdict(
            dimension_id=dimension_id,
            topic=topic,
            baseline_pct=baseline.percent if baseline else None,
            scope_pct=None,
            delta=0.0,
            is_deviation=False,
            is_new=False,
            sample_size=scoped.sample_size if scoped else 0,
        )

    reference = baseline_value or 0.0
    delta = scope_value - reference
    is_new = baseline_value is None or baseline_value < NEW_REQUIREMENT_FLOOR
    return DeviationVerdict(
        dimension_id=dimension_id,
        topic=topic,
        baseline_pct=baseline.percent if baseline else None,
        scope_pct=scoped.percent if scoped else None,
        delta=delta,
        is_deviation=delta >= threshold,
        is_new=is_new and delta >= threshold,
        sample_size=scoped.sample_size if scoped else 0,
    )


def deviations(
    baseline_facts: Sequence[StatisticFact],
    scope_facts: Sequence[StatisticFact],
    topics: Mapping[str, str] | None = None,
    threshold: float = DEVIATION_DELTA,
) -> tuple[DeviationVerdict, ...]:
    """범위 전체의 편차 판정을 차이가 큰 순서로 낸다."""
    topics = topics or {}
    overall = facts_by_dimension(baseline_facts, PREVALENCE_FAMILY)
    scoped = facts_by_dimension(scope_facts, PREVALENCE_FAMILY)

    verdicts: list[DeviationVerdict] = []
    for dimension_id in sorted(set(overall) | set(scoped)):
        fact = scoped.get(dimension_id) or overall.get(dimension_id)
        topic = (
            topics.get(dimension_id)
            or (fact.dimension_label if fact else None)
            or dimension_id
        )
        verdict = judge_deviation(
            dimension_id,
            topic,
            overall.get(dimension_id),
            scoped.get(dimension_id),
            threshold,
        )
        if verdict.is_deviation:
            verdicts.append(verdict)
    return tuple(sorted(verdicts, key=lambda v: (-v.delta, v.dimension_id)))


def unchanged_dimensions(
    baseline: Sequence[BaselineItem],
    deviated: Iterable[str],
    limit: int = 4,
) -> tuple[str, ...]:
    """기준선 가운데 편차가 붙지 않은 차원 식별자.

    "편차가 없다" 는 말을 아직 하지 않는다. 부재를 말하려면 범위 확인이 필요하고,
    그 판정은 `may_assert_no_deviation` 이 한다.
    """
    marked = set(deviated)
    return tuple(item.item_id for item in baseline if item.item_id not in marked)[:limit]


def unchanged_items(
    baseline: Sequence[BaselineItem],
    deviated: Iterable[str],
    assertion: CoverageAssertion | None = None,
    note: str = "이 범위도 요구 수준은 공통 기대치와 같습니다.",
    limit: int = 4,
) -> tuple[UnchangedItem, ...]:
    """편차 없음 목록. 범위 확인이 끝났을 때만 편차 없음이라고 적는다.

    전수 검사를 마치지 못했으면 같은 항목을 `판단 근거 부족` 으로 적는다. 항목을
    빼지 않는다. 빼 버리면 화면이 "확인했고 없었다" 와 구분하지 못한다.
    """
    titles = {item.item_id: item.title for item in baseline}
    complete = may_assert_no_deviation(assertion)
    body = note if complete else INSUFFICIENT
    return tuple(
        UnchangedItem(item_id=item_id, title=titles[item_id], note=body)
        for item_id in unchanged_dimensions(baseline, deviated, limit)
    )


def coverage_assertion(
    assertion_id: str,
    scope_level: ScopeLevel,
    scope_id: str,
    population_n: int,
    checked_n: int,
    matched_n: int,
    assertion: str,
    dimension_id: str | None = None,
) -> CoverageAssertion:
    """범위 확인 한 건을 만든다.

    `coverage_complete` 를 인자로 받지 않는다. 모델도 사람도 그 값을 정하지 못하며
    검사한 수와 모집단 수가 정한다(docs/erd.md 11.6).
    """
    return CoverageAssertion(
        assertion_id=assertion_id,
        scope_level=scope_level,
        scope_id=scope_id,
        dimension_id=dimension_id,
        population_n=population_n,
        checked_n=checked_n,
        matched_n=matched_n,
        assertion=assertion,
    )


def may_assert_no_deviation(assertion: CoverageAssertion | None) -> bool:
    """편차 없음을 주장할 수 있는가.

    범위 확인이 없으면 거짓이다. 검사하지 않은 것을 부재로 말하지 않는다.
    """
    return assertion is not None and assertion.coverage_complete


def confidence_grade(
    verdict: DeviationVerdict,
    support_count: int,
    independent_companies: int = 0,
    contradicted: bool = False,
) -> ConfidenceGrade:
    """편차 하나의 화면 등급.

    모델의 자기 보고를 쓰지 않는다(docs/agent-design.md 8장). 근거 수, 독립 회사
    수, 표본 크기, 반박 근거의 유무만 본다.

    반박 근거가 하나라도 있으면 낮은 등급이다. 지지 근거가 아무리 많아도 상충이
    남아 있는 주장을 높은 등급으로 보이면 화면이 확신을 과장한다.
    """
    if contradicted or support_count <= 0:
        return ConfidenceGrade.LOW
    if verdict.sample_size and verdict.sample_size < MINIMUM_SAMPLE:
        return ConfidenceGrade.LOW
    if support_count >= STRONG_SUPPORT and independent_companies >= STRONG_SUPPORT:
        return ConfidenceGrade.HIGH
    return ConfidenceGrade.MID


def conflicting_supports(
    evidence: Mapping[str, Sequence[EvidenceRef]],
) -> tuple[str, ...]:
    """지지와 반박이 함께 붙은 차원을 표시한다 (Phase 15-4).

    같은 차원에 `supports` 와 `contradicts` 가 함께 있으면 둘 중 하나는 틀렸거나
    두 근거가 서로 다른 범위를 말하고 있다. 자동으로 한쪽을 버리지 않는다. 버리는
    쪽이 늘 반박이 되면 검증이 반례를 지우는 장치가 된다. 여기서는 표시만 하고
    등급을 내리는 것은 `confidence_grade` 가 한다.

    돌려주는 것은 차원 식별자를 정렬한 것이다.
    """
    conflicted: list[str] = []
    for key, refs in evidence.items():
        relations = {ref.relation for ref in refs}
        if Relation.SUPPORTS in relations and Relation.CONTRADICTS in relations:
            conflicted.append(key)
    return tuple(sorted(conflicted))


def support_counts(refs: Sequence[EvidenceRef]) -> tuple[int, int]:
    """`(지지 수, 반박 수)`. 같은 근거가 두 번 오면 한 번으로 센다."""
    supports = {r.support_id for r in refs if r.relation is Relation.SUPPORTS}
    contradicts = {r.support_id for r in refs if r.relation is Relation.CONTRADICTS}
    return len(supports), len(contradicts)


__all__ = [
    "BASELINE_MAX_ITEMS",
    "BASELINE_MIN_ITEMS",
    "DEVIATION_DELTA",
    "INSUFFICIENT",
    "MINIMUM_SAMPLE",
    "NEW_REQUIREMENT_FLOOR",
    "NO_BASELINE",
    "PREVALENCE_FAMILY",
    "RATIO_MEASURE",
    "REQUIREDNESS_FAMILY",
    "STRONG_SUPPORT",
    "DeviationVerdict",
    "baseline_items",
    "baseline_short",
    "confidence_grade",
    "conflicting_supports",
    "coverage_assertion",
    "deviations",
    "facts_by_dimension",
    "judge_deviation",
    "may_assert_no_deviation",
    "support_counts",
    "unchanged_dimensions",
    "unchanged_items",
]
