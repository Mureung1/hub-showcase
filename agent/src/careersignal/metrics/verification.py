"""통계 산출물의 수치 판정.

정의는 docs/statistics-model.md 10장과 docs/metric-spec.md 7장을 따른다.

이 모듈은 판정만 담는다. 저장소를 import 하지 않고 조회도 하지 않으며, 대조할
행은 호출자가 공급한다. 검사 실행과 결과 기록은
`verification/checks/statistics.py` 가 담당한다.

재계산은 저장 집계와 다른 경로로 수행한다. 저장값은 SQL 의
`COUNT(DISTINCT pv.posting_version_id)` 와 조인 조건이 만들고
(docs/metric-spec.md 2.1~2.3), 이 모듈은 집계되지 않은 원자 행을 받아 파이썬
집합 연산으로 다시 센다. 같은 질의를 두 번 실행하는 것은 대조가 아니므로,
모집단 조건·중복 제거·활성 분류체계 조건을 여기서 처음부터 다시 적용한다.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Callable

from careersignal.domain.depth import DepthLevel, rank
from careersignal.domain.sampling import MetricPolicy, SampleStatus, classify
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.segment import EntryLabel, EntrySegment
from careersignal.domain.segment import applicable as segment_applicable
from careersignal.domain.segment import segment_of
from careersignal.taxonomy.requiredness import Requiredness

# ============================================================ 사유 코드

REASON_POPULATION_MISMATCH = "METRIC_POPULATION_MISMATCH"
"""저장된 행의 범위·대상군·기간 표기가 실행이 정한 모집단 정의와 다르다."""

REASON_DENOMINATOR_MISMATCH = "METRIC_DENOMINATOR_MISMATCH"
"""저장된 분모가 정의를 다시 적용해 만든 모집단 크기와 다르다."""

REASON_DUPLICATE_NOT_REMOVED = "METRIC_DUPLICATE_NOT_REMOVED"
"""`posting_version_id` 단위 중복 제거가 되지 않았다.

같은 공고 버전이 여러 mention 으로 나타난 만큼 세어졌거나, 모집단에 같은 공고
버전이 두 번 들어갔다. 근거는 docs/metric-spec.md 2.2다.
"""

REASON_SAMPLE_STATUS_MISMATCH = "METRIC_SAMPLE_STATUS_MISMATCH"
"""저장된 `sample_status` 가 정책 버전의 임계값으로 판정한 값과 다르다."""

REASON_SAMPLE_SIZE_MISMATCH = "METRIC_SAMPLE_SIZE_MISMATCH"
"""저장된 `sample_size` 가 분모와 다르다. 표본 판정의 입력이 분모이기 때문이다."""

REASON_RECOUNT_MISMATCH = "METRIC_RECOUNT_MISMATCH"
"""독립 재계산 결과가 저장된 분자·분모·값과 다르다."""

REASON_RECOUNT_UNSUPPORTED = "METRIC_RECOUNT_UNSUPPORTED"
"""재계산할 재료가 없다. 검사하지 못한 행을 통과로 두지 않는다."""

REASON_POLICY_VERSION_MISMATCH = "METRIC_POLICY_VERSION_MISMATCH"
"""저장된 `metric_policy_version` 또는 분석 버전이 실행 컨텍스트와 다르다."""

REASON_TAXONOMY_VERSION_MISMATCH = "METRIC_TAXONOMY_VERSION_MISMATCH"
"""저장된 행이 선언한 분류체계 버전이 실행 컨텍스트와 다르다."""

REASON_NOT_APPLICABLE_COMPUTED = "METRIC_NOT_APPLICABLE_COMPUTED"
"""`dimension_metric_applicability.applicable` 이 거짓인 조합이 계산돼 있다."""

REASON_SEGMENT_NOT_APPLICABLE = "METRIC_SEGMENT_NOT_APPLICABLE"
"""대상군으로 전개하지 않는 지표가 다른 대상군으로 저장돼 있다."""

# ============================================================ 지표 이름

FAMILY_POSTING_PREVALENCE = "posting_prevalence"
FAMILY_REQUIREDNESS_RATIO = "requiredness_ratio"
FAMILY_DEPTH_DISTRIBUTION = "depth_distribution"
FAMILY_CLUSTER_CONTRAST = "cluster_contrast"
FAMILY_COOCCURRENCE = "cooccurrence"
FAMILY_SCOPE_EXPANSION = "scope_expansion"
FAMILY_ENTRY_ADVANCED_SIGNAL = "entry_label_advanced_signal_rate"
FAMILY_TEMPORAL_DELTA = "temporal_delta"

MEASURE_RATIO = "ratio"
MEASURE_COUNT = "count"
MEASURE_JACCARD = "jaccard"
MEASURE_CONDITIONAL_A_GIVEN_B = "conditional_a_given_b"
MEASURE_CONDITIONAL_B_GIVEN_A = "conditional_b_given_a"
MEASURE_ASSOCIATION_LIFT = "association_lift"
MEASURE_PREVALENCE_DIFFERENCE = "prevalence_difference"
MEASURE_PREVALENCE_RATIO = "prevalence_ratio"

VALUE_TOLERANCE = 1e-6
"""`statistics_facts.value` 는 `numeric(12,6)` 이므로 여섯째 자리까지만 남는다."""

ENTRY_LABELED: frozenset[EntryLabel] = frozenset(
    label for label in EntryLabel if segment_of(label) is EntrySegment.ENTRY_JUNIOR
)
"""`entry_label_advanced_signal_rate` 의 분모가 되는 표기. docs/metric-spec.md 3.7."""


# ============================================================ 대조 재료


@dataclass(frozen=True, slots=True)
class ClusterMembership:
    """`company_cluster_memberships` 한 행. 유효 구간을 그대로 담는다."""

    cluster_id: str
    valid_from: date
    valid_to: date | None = None

    def holds_on(self, as_of: date) -> bool:
        """기준일에 이 소속이 유효한가. docs/metric-spec.md 2.1의 EXISTS 조건이다."""
        if self.valid_from > as_of:
            return False
        return self.valid_to is None or self.valid_to >= as_of


@dataclass(frozen=True, slots=True)
class PopulationUnit:
    """모집단 후보 한 건. `posting_versions` 한 행에 대응한다.

    걸러지지 않은 상태로 온다. 범위·기간·대상군 조건은 이 모듈이 다시 적용한다.
    소속도 해석된 결과가 아니라 유효 구간을 그대로 받아 기준일로 다시 푼다.

    한 건이 공고 버전 하나다. 같은 `posting_version_id` 가 두 번 오면 조회가
    행을 부풀린 것이며 중복 제거 검사가 이를 잡는다.
    """

    posting_version_id: str
    posting_id: str
    company_id: str
    job_role_id: str
    dataset_version: str
    posted_on: date
    entry_label: EntryLabel
    memberships: tuple[ClusterMembership, ...] = ()


@dataclass(frozen=True, slots=True)
class AssignmentRow:
    """차원 할당 한 건. `posting_requirement_assignments` 한 행에 대응한다.

    분류체계 버전과 생명주기 상태를 그대로 담는다. 활성 분류체계 조건
    (docs/metric-spec.md 2.3)은 이 모듈이 다시 적용한다.
    """

    posting_version_id: str
    dimension_id: str
    taxonomy_version_id: str
    requiredness: Requiredness = Requiredness.UNKNOWN
    depth_level: DepthLevel | None = None
    lifecycle_status: str = "active"
    role_boundary_eligible: bool = False


@dataclass(frozen=True, slots=True)
class PopulationSpec:
    """분모 모집단의 정의. docs/metric-spec.md 2.1과 2.7이다."""

    job_role_id: str
    dataset_version: str
    scope_level: ScopeLevel
    scope_id: str | None
    period_starts_on: date
    period_ends_on: date
    entry_segment: EntrySegment
    as_of_date: date
    period_id: str = ""


@dataclass(frozen=True, slots=True)
class VersionContext:
    """실행이 고정한 버전. docs/architecture.md 5장의 실행 봉투에서 온다."""

    analysis_version: str
    dataset_version: str
    taxonomy_version_id: str
    metric_policy_version: str


@dataclass(frozen=True, slots=True)
class StoredFact:
    """`statistics_facts` 한 행. 검증이 대조할 저장값이다."""

    fact_id: str
    analysis_version: str
    metric_family: str
    measure: str
    metric_policy_version: str
    scope_level: ScopeLevel
    scope_id: str
    entry_segment: EntrySegment
    period_id: str
    sample_size: int
    sample_status: SampleStatus
    dimension_id: str | None = None
    secondary_dimension_id: str | None = None
    numerator: int | None = None
    denominator: int | None = None
    value: float | None = None


@dataclass(frozen=True, slots=True)
class FactAudit:
    """행 하나를 대조하는 데 필요한 재료 묶음.

    저장소는 이 묶음을 채우기만 하고 판정하지 않는다. 테스트는 저장소 없이
    이 묶음을 직접 만들어 판정 규칙만 검사한다.
    """

    fact: StoredFact
    spec: PopulationSpec
    context: VersionContext
    policy: MetricPolicy
    declared_taxonomy_version_id: str
    """이 행을 만든 분석 버전이 선언한 분류체계 버전. `analysis_versions` 에서 읽는다."""

    candidates: tuple[PopulationUnit, ...] = ()
    """모집단 후보. 직무와 데이터셋 버전까지만 좁혀서 온다."""

    assignments: tuple[AssignmentRow, ...] = ()
    """후보들의 차원 할당. 분류체계 버전과 생명주기로 거르지 않은 상태로 온다."""

    applicable_flags: Mapping[tuple[str, str], bool] = field(default_factory=dict)
    """`(dimension_id, metric_family)` 별 적용 가능 여부. 실행 컨텍스트의 분류체계 버전 기준이다."""

    baseline_denominator: int | None = None
    """`cluster_contrast` 의 직무 전체 분모. docs/metric-spec.md 3.4."""

    baseline_prevalence: float | None = None
    """`cluster_contrast` 의 직무 전체 비율."""

    temporal_inputs: tuple[StoredFact, StoredFact] | None = None
    """`temporal_delta` 의 두 기간 기준값. 순서는 `(period_a, period_b)` 다."""


@dataclass(frozen=True, slots=True)
class Violation:
    """검사가 찾은 위반 한 건."""

    reason_code: str
    detail: dict[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return {"reason_code": self.reason_code, **self.detail}


@dataclass(frozen=True, slots=True)
class MeasureCount:
    """한 measure 의 재계산 결과. `value` 가 None 이면 값을 재계산하지 않았다."""

    numerator: int | None
    denominator: int | None
    value: float | None = None


@dataclass(frozen=True, slots=True)
class Recount:
    """재계산 한 번의 결과와 그 과정."""

    supported: bool
    count: MeasureCount | None
    population_size: int
    excluded_by: dict[str, int] = field(default_factory=dict)


# ============================================================ 모집단 재구성


def _excluded_by(unit: PopulationUnit, spec: PopulationSpec) -> str | None:
    """모집단에서 빠지는 사유. 남으면 None 이다. docs/metric-spec.md 2.1."""
    if unit.job_role_id != spec.job_role_id:
        return "job_role"
    if unit.dataset_version != spec.dataset_version:
        return "dataset_version"
    if not spec.period_starts_on <= unit.posted_on <= spec.period_ends_on:
        return "period"
    if spec.scope_level is ScopeLevel.CLUSTER:
        held = any(
            m.cluster_id == spec.scope_id and m.holds_on(spec.as_of_date)
            for m in unit.memberships
        )
        if not held:
            return "scope"
    elif spec.scope_level is ScopeLevel.POSTING and unit.posting_id != spec.scope_id:
        return "scope"
    if (
        spec.entry_segment is not EntrySegment.ALL
        and segment_of(unit.entry_label) is not spec.entry_segment
    ):
        return "entry_segment"
    return None


def _population(
    spec: PopulationSpec, candidates: Sequence[PopulationUnit], *, dedup: bool
) -> tuple[list[str], dict[str, int]]:
    """정의를 다시 적용해 모집단을 만든다. 제외 사유별 건수를 함께 돌려준다.

    `dedup` 이 거짓이면 같은 공고 버전이 여러 번 들어간 상태를 그대로 둔다.
    중복 제거가 빠진 집계가 어떤 수를 냈을지 재현하기 위해서다.
    """
    kept: list[str] = []
    seen: set[str] = set()
    excluded: Counter[str] = Counter()
    for unit in candidates:
        reason = _excluded_by(unit, spec)
        if reason is not None:
            excluded[reason] += 1
            continue
        if dedup and unit.posting_version_id in seen:
            continue
        seen.add(unit.posting_version_id)
        kept.append(unit.posting_version_id)
    return kept, dict(excluded)


def _rows(
    audit: FactAudit,
    population: set[str],
    *,
    active_only: bool,
    current_taxonomy_only: bool,
) -> list[AssignmentRow]:
    """집계에 쓰는 할당. docs/metric-spec.md 2.3의 조인 조건을 다시 적용한다."""
    rows: list[AssignmentRow] = []
    for row in audit.assignments:
        if row.posting_version_id not in population:
            continue
        if current_taxonomy_only and (
            row.taxonomy_version_id != audit.context.taxonomy_version_id
        ):
            continue
        if active_only and row.lifecycle_status != "active":
            continue
        rows.append(row)
    return rows


def _units_with(rows: Sequence[AssignmentRow], dimension_id: str, *, dedup: bool) -> list[str]:
    """차원 할당이 있는 공고 버전. `dedup` 이 거짓이면 할당 수만큼 늘어난다."""
    found = [r.posting_version_id for r in rows if r.dimension_id == dimension_id]
    return sorted(set(found)) if dedup else found


def _size(ids: Sequence[str]) -> int:
    return len(ids)


def _ratio(numerator: int, denominator: int) -> float | None:
    return numerator / denominator if denominator else None


def _deepest(rows: Sequence[AssignmentRow], dimension_id: str) -> dict[str, DepthLevel]:
    """공고 버전별 대표 등급. 가장 깊은 등급 하나만 남긴다.

    근거는 docs/metric-spec.md 3.3이다. 이 규칙이 세 measure 의 분자 합을 분모와
    일치시킨다.
    """
    deepest: dict[str, DepthLevel] = {}
    for row in rows:
        if row.dimension_id != dimension_id or row.depth_level is None:
            continue
        current = deepest.get(row.posting_version_id)
        if current is None or rank(row.depth_level) > rank(current):
            deepest[row.posting_version_id] = row.depth_level
    return deepest


def _count_for(
    audit: FactAudit,
    rows: Sequence[AssignmentRow],
    population: list[str],
    *,
    dedup: bool,
) -> MeasureCount | None:
    """지표 정의대로 분자·분모·값을 다시 만든다. 정의가 없으면 None 이다."""
    fact = audit.fact
    family, measure = fact.metric_family, fact.measure
    total = _size(population)
    primary = fact.dimension_id
    secondary = fact.secondary_dimension_id

    if family == FAMILY_POSTING_PREVALENCE and primary:
        found = _size(_units_with(rows, primary, dedup=dedup))
        return MeasureCount(found, total, _ratio(found, total))

    if family == FAMILY_SCOPE_EXPANSION:
        boundary = [r.posting_version_id for r in rows if r.role_boundary_eligible]
        found = len(set(boundary)) if dedup else len(boundary)
        return MeasureCount(found, total, _ratio(found, total))

    if family == FAMILY_ENTRY_ADVANCED_SIGNAL:
        return _entry_advanced_signal(audit, rows, population, dedup=dedup)

    if family == FAMILY_REQUIREDNESS_RATIO and primary:
        with_dimension = _units_with(rows, primary, dedup=dedup)
        required = [
            r.posting_version_id
            for r in rows
            if r.dimension_id == primary and r.requiredness is Requiredness.REQUIRED
        ]
        found = len(set(required)) if dedup else len(required)
        base = _size(with_dimension)
        return MeasureCount(found, base, _ratio(found, base))

    if family == FAMILY_DEPTH_DISTRIBUTION and primary:
        return _depth_distribution(rows, primary, measure, dedup=dedup)

    if family == FAMILY_COOCCURRENCE and primary and secondary:
        return _cooccurrence(rows, primary, secondary, measure, total, dedup=dedup)

    if family == FAMILY_CLUSTER_CONTRAST and primary:
        return _cluster_contrast(audit, rows, primary, measure, total, dedup=dedup)

    return None


def _entry_advanced_signal(
    audit: FactAudit,
    rows: Sequence[AssignmentRow],
    population: list[str],
    *,
    dedup: bool,
) -> MeasureCount:
    """분모가 신입·주니어 표기 공고다. docs/metric-spec.md 3.7."""
    labeled = {
        unit.posting_version_id
        for unit in audit.candidates
        if unit.entry_label in ENTRY_LABELED
    }
    base_ids = [pv for pv in population if pv in labeled]
    advanced = [
        r.posting_version_id
        for r in rows
        if r.depth_level is DepthLevel.TRADEOFF and r.posting_version_id in labeled
    ]
    found = len(set(advanced)) if dedup else len(advanced)
    base = _size(base_ids)
    return MeasureCount(found, base, _ratio(found, base))


def _depth_distribution(
    rows: Sequence[AssignmentRow], dimension_id: str, measure: str, *, dedup: bool
) -> MeasureCount | None:
    """등급별 분포. 분모는 해당 차원 할당이 있는 공고 버전 수다."""
    try:
        level = DepthLevel(measure)
    except ValueError:
        return None
    base = _size(_units_with(rows, dimension_id, dedup=dedup))
    if dedup:
        found = sum(1 for value in _deepest(rows, dimension_id).values() if value is level)
    else:
        found = sum(
            1
            for r in rows
            if r.dimension_id == dimension_id and r.depth_level is level
        )
    return MeasureCount(found, base, _ratio(found, base))


def _cooccurrence(
    rows: Sequence[AssignmentRow],
    primary: str,
    secondary: str,
    measure: str,
    total: int,
    *,
    dedup: bool,
) -> MeasureCount | None:
    """두 차원의 동시 출현. docs/metric-spec.md 3.5.

    중복 제거를 뺀 재현은 교집합이 성립하지 않으므로 집합 연산으로만 센다.
    """
    if not dedup:
        return None
    set_a = set(_units_with(rows, primary, dedup=True))
    set_b = set(_units_with(rows, secondary, dedup=True))
    n_ab = len(set_a & set_b)
    n_a, n_b = len(set_a), len(set_b)
    n_union = len(set_a | set_b)

    if measure == MEASURE_COUNT:
        return MeasureCount(n_ab, None, float(n_ab))
    if measure == MEASURE_JACCARD:
        return MeasureCount(n_ab, n_union, _ratio(n_ab, n_union))
    if measure == MEASURE_CONDITIONAL_A_GIVEN_B:
        return MeasureCount(n_ab, n_b, _ratio(n_ab, n_b))
    if measure == MEASURE_CONDITIONAL_B_GIVEN_A:
        return MeasureCount(n_ab, n_a, _ratio(n_ab, n_a))
    if measure == MEASURE_ASSOCIATION_LIFT:
        lift = (n_ab * total) / (n_a * n_b) if n_a and n_b and total else None
        return MeasureCount(n_ab, total, lift)
    return None


def _cluster_contrast(
    audit: FactAudit,
    rows: Sequence[AssignmentRow],
    dimension_id: str,
    measure: str,
    total: int,
    *,
    dedup: bool,
) -> MeasureCount | None:
    """기업군과 직무 전체의 차이·비율. docs/metric-spec.md 3.4.

    분자·분모에는 기업군 범위의 원본 카운트를 담는다. 직무 전체 비율은 같은 분석
    버전의 `posting_prevalence` 행에서 오므로 재료로 받는다.
    """
    found = _size(_units_with(rows, dimension_id, dedup=dedup))
    cluster_prevalence = _ratio(found, total)
    baseline = audit.baseline_prevalence
    if baseline is None or cluster_prevalence is None:
        return MeasureCount(found, total, None)
    if measure == MEASURE_PREVALENCE_DIFFERENCE:
        return MeasureCount(found, total, cluster_prevalence - baseline)
    if measure == MEASURE_PREVALENCE_RATIO:
        if baseline == 0:
            return None
        return MeasureCount(found, total, cluster_prevalence / baseline)
    return None


def _temporal_delta(audit: FactAudit) -> MeasureCount | None:
    """두 기간 기준값에서 연산자를 다시 적용한다. docs/metric-spec.md 4장."""
    if audit.temporal_inputs is None:
        return None
    before, after = audit.temporal_inputs
    if before.value is None or after.value is None:
        return None
    return MeasureCount(
        after.numerator, after.denominator, float(after.value) - float(before.value)
    )


def recount(
    audit: FactAudit,
    *,
    dedup: bool = True,
    active_only: bool = True,
    current_taxonomy_only: bool = True,
) -> Recount:
    """저장값과 무관하게 지표를 다시 센다.

    기본 인자는 정의대로의 재계산이다. 나머지 조합은 어떤 조건이 빠진 집계가
    저장값을 냈는지 가려내는 데 쓴다.
    """
    if audit.fact.metric_family == FAMILY_TEMPORAL_DELTA:
        count = _temporal_delta(audit)
        return Recount(count is not None, count, 0, {})

    population, excluded = _population(audit.spec, audit.candidates, dedup=dedup)
    rows = _rows(
        audit,
        set(population),
        active_only=active_only,
        current_taxonomy_only=current_taxonomy_only,
    )
    count = _count_for(audit, rows, population, dedup=dedup)
    return Recount(count is not None, count, _size(population), excluded)


# ============================================================ 검사 1. 분모 일치


def check_denominator(audit: FactAudit) -> tuple[Violation, ...]:
    """모집단이 범위·기간 정의와 일치한다.

    두 가지를 본다. 저장된 행의 범위·대상군·기간 표기가 실행이 정한 정의와 같은지,
    그리고 정의를 다시 적용해 만든 모집단의 크기가 저장된 분모와 같은지다.
    """
    fact, spec = audit.fact, audit.spec
    violations: list[Violation] = []

    declared = {
        "scope_level": (str(fact.scope_level), str(spec.scope_level)),
        "entry_segment": (str(fact.entry_segment), str(spec.entry_segment)),
    }
    if spec.scope_id is not None:
        declared["scope_id"] = (fact.scope_id, spec.scope_id)
    if spec.period_id:
        declared["period_id"] = (fact.period_id, spec.period_id)
    mismatched = {k: v for k, v in declared.items() if v[0] != v[1]}
    if mismatched:
        violations.append(
            Violation(
                REASON_POPULATION_MISMATCH,
                {"stored_vs_expected": {k: list(v) for k, v in mismatched.items()}},
            )
        )

    result = recount(audit)
    if not result.supported or result.count is None:
        return tuple(violations)
    if fact.denominator is not None and result.count.denominator is not None:
        if fact.denominator != result.count.denominator:
            violations.append(
                Violation(
                    REASON_DENOMINATOR_MISMATCH,
                    {
                        "stored": fact.denominator,
                        "recounted": result.count.denominator,
                        "population_size": result.population_size,
                        "excluded_by": result.excluded_by,
                    },
                )
            )
    return tuple(violations)


# ============================================================ 검사 2. 중복 제거


def check_deduplication(audit: FactAudit) -> tuple[Violation, ...]:
    """`posting_version_id` 단위로 중복이 제거되었다.

    중복 제거를 뺀 재계산이 저장값과 같고 정의대로의 재계산과 다르면, 저장 집계가
    같은 공고 버전을 여러 번 센 것이다. 모집단 후보에 같은 공고 버전이 두 번 들어온
    경우도 함께 본다.
    """
    fact = audit.fact
    violations: list[Violation] = []

    repeated = [
        pv
        for pv, times in Counter(
            unit.posting_version_id
            for unit in audit.candidates
            if _excluded_by(unit, audit.spec) is None
        ).items()
        if times > 1
    ]

    strict = recount(audit)
    loose = recount(audit, dedup=False)
    if strict.count is None or loose.count is None:
        if repeated:
            violations.append(
                Violation(
                    REASON_DUPLICATE_NOT_REMOVED,
                    {"duplicated_units": sorted(repeated)},
                )
            )
        return tuple(violations)

    stored = (fact.numerator, fact.denominator)
    inflated = (loose.count.numerator, loose.count.denominator)
    correct = (strict.count.numerator, strict.count.denominator)
    if stored == inflated and inflated != correct:
        violations.append(
            Violation(
                REASON_DUPLICATE_NOT_REMOVED,
                {
                    "stored": list(stored),
                    "deduplicated": list(correct),
                    "duplicated_units": sorted(repeated),
                },
            )
        )
    elif repeated:
        violations.append(
            Violation(
                REASON_DUPLICATE_NOT_REMOVED,
                {"duplicated_units": sorted(repeated)},
            )
        )
    return tuple(violations)


# ============================================================ 검사 3. 표본 판정


def expected_sample_status(audit: FactAudit) -> SampleStatus | None:
    """정책 버전의 임계값으로 판정한 표본 상태. 판정할 수 없으면 None 이다.

    일반 규칙은 docs/metric-spec.md 2.4이며 입력은 표본 수다.
    `cluster_contrast` 만 3.4의 규칙을 따라 기업군 분모와 직무 전체 분모를 함께 본다.
    """
    fact, policy = audit.fact, audit.policy
    if fact.metric_family != FAMILY_CLUSTER_CONTRAST:
        return classify(fact.sample_size, policy)

    baseline = audit.baseline_denominator
    if baseline is None:
        return None
    cluster_n = fact.denominator or 0
    if cluster_n <= 0 or baseline <= 0:
        return SampleStatus.NOT_COMPUTABLE
    both_ready = (
        cluster_n >= policy.minimum_n_comparison
        and baseline >= policy.minimum_n_comparison
    )
    return SampleStatus.ANALYSIS_READY if both_ready else SampleStatus.NOT_COMPARABLE


def check_sample_status(audit: FactAudit) -> tuple[Violation, ...]:
    """`sample_status` 가 정책 버전의 임계값과 일치한다."""
    fact = audit.fact
    violations: list[Violation] = []

    if (
        fact.denominator is not None
        and fact.metric_family != FAMILY_TEMPORAL_DELTA
        and fact.sample_size != fact.denominator
    ):
        violations.append(
            Violation(
                REASON_SAMPLE_SIZE_MISMATCH,
                {"sample_size": fact.sample_size, "denominator": fact.denominator},
            )
        )

    expected = expected_sample_status(audit)
    if expected is not None and fact.sample_status is not expected:
        violations.append(
            Violation(
                REASON_SAMPLE_STATUS_MISMATCH,
                {
                    "stored": str(fact.sample_status),
                    "expected": str(expected),
                    "sample_size": fact.sample_size,
                    "minimum_n": audit.policy.minimum_n,
                    "minimum_n_comparison": audit.policy.minimum_n_comparison,
                    "metric_policy_version": fact.metric_policy_version,
                },
            )
        )
    return tuple(violations)


# ============================================================ 검사 4. 재계산 일치


def _values_differ(stored: float | None, recounted: float | None) -> bool:
    if stored is None or recounted is None:
        return False
    return abs(float(stored) - float(recounted)) > VALUE_TOLERANCE


def _diagnosis(audit: FactAudit, stored: tuple[int | None, int | None]) -> str | None:
    """어떤 조건이 빠진 집계가 저장값을 냈는지 가려낸다. 알 수 없으면 None 이다."""
    variants = {
        "inactive_dimension_included": {"active_only": False},
        "other_taxonomy_version_included": {"current_taxonomy_only": False},
    }
    for name, options in variants.items():
        result = recount(audit, **options)  # type: ignore[arg-type]
        if result.count is None:
            continue
        if (result.count.numerator, result.count.denominator) == stored:
            return name
    return None


def check_recount(audit: FactAudit) -> tuple[Violation, ...]:
    """독립 재계산 결과가 저장값과 일치한다.

    저장값은 SQL 집계가 만들고 이 판정은 걸러지지 않은 원자 행에서 파이썬 집합
    연산으로 다시 만든다. 재계산할 재료가 없으면 통과로 두지 않는다.
    """
    fact = audit.fact
    result = recount(audit)
    if not result.supported or result.count is None:
        return (
            Violation(
                REASON_RECOUNT_UNSUPPORTED,
                {"metric_family": fact.metric_family, "measure": fact.measure},
            ),
        )

    count = result.count
    stored = {"numerator": fact.numerator, "denominator": fact.denominator}
    recounted = {"numerator": count.numerator, "denominator": count.denominator}
    differs = {
        key: [stored[key], recounted[key]]
        for key in stored
        if stored[key] is not None and stored[key] != recounted[key]
    }
    if _values_differ(fact.value, count.value):
        differs["value"] = [fact.value, count.value]

    if not differs:
        return ()
    detail: dict[str, Any] = {"stored_vs_recounted": differs}
    cause = _diagnosis(audit, (fact.numerator, fact.denominator))
    if cause is not None:
        detail["reproduced_by"] = cause
    return (Violation(REASON_RECOUNT_MISMATCH, detail),)


# ============================================================ 검사 5. 버전 일치


def check_versions(audit: FactAudit) -> tuple[Violation, ...]:
    """`taxonomy_version`, `metric_policy_version` 이 실행 컨텍스트와 일치한다.

    `statistics_facts` 는 분류체계 버전을 컬럼으로 갖지 않는다. 행이 속한 분석
    버전이 선언한 값을 대신 본다. 근거는 docs/erd.md 10.5와 11.1이다.
    """
    fact, context = audit.fact, audit.context
    violations: list[Violation] = []

    declared = {
        "analysis_version": (fact.analysis_version, context.analysis_version),
        "metric_policy_version": (
            fact.metric_policy_version,
            context.metric_policy_version,
        ),
        "metric_family": (audit.policy.metric_family, fact.metric_family),
    }
    mismatched = {k: v for k, v in declared.items() if v[0] != v[1]}
    if mismatched:
        violations.append(
            Violation(
                REASON_POLICY_VERSION_MISMATCH,
                {"stored_vs_expected": {k: list(v) for k, v in mismatched.items()}},
            )
        )

    if audit.declared_taxonomy_version_id != context.taxonomy_version_id:
        violations.append(
            Violation(
                REASON_TAXONOMY_VERSION_MISMATCH,
                {
                    "stored": audit.declared_taxonomy_version_id,
                    "expected": context.taxonomy_version_id,
                },
            )
        )
    return tuple(violations)


# ============================================================ 검사 6. 적용 가능성


def check_applicability(audit: FactAudit) -> tuple[Violation, ...]:
    """적용 불가로 표시된 차원·지표 조합이 계산되지 않았다.

    `dimension_metric_applicability.applicable` 이 거짓인 조합과, 대상군으로
    전개하지 않는 지표의 다른 대상군 행을 잡는다. 근거는 docs/metric-spec.md 5장이다.
    """
    fact = audit.fact
    violations: list[Violation] = []

    for dimension_id in (fact.dimension_id, fact.secondary_dimension_id):
        if dimension_id is None:
            continue
        flag = audit.applicable_flags.get((dimension_id, fact.metric_family))
        if flag is False:
            violations.append(
                Violation(
                    REASON_NOT_APPLICABLE_COMPUTED,
                    {
                        "dimension_id": dimension_id,
                        "metric_family": fact.metric_family,
                        "taxonomy_version_id": audit.context.taxonomy_version_id,
                    },
                )
            )

    if not segment_applicable(fact.metric_family, fact.entry_segment):
        violations.append(
            Violation(
                REASON_SEGMENT_NOT_APPLICABLE,
                {
                    "metric_family": fact.metric_family,
                    "entry_segment": str(fact.entry_segment),
                },
            )
        )
    return tuple(violations)


# ============================================================ 여섯 검사


MetricCheck = Callable[[FactAudit], tuple[Violation, ...]]

CHECKS: tuple[tuple[str, MetricCheck], ...] = (
    ("denominator", check_denominator),
    ("deduplication", check_deduplication),
    ("sample_status", check_sample_status),
    ("recount", check_recount),
    ("versions", check_versions),
    ("applicability", check_applicability),
)
"""docs/statistics-model.md 10장의 여섯 검사. 순서가 실행 순서다."""


def audit_fact(audit: FactAudit) -> tuple[Violation, ...]:
    """여섯 검사를 모두 실행하고 위반을 모은다.

    위반이 나와도 남은 검사를 건너뛰지 않는다. 한 번의 실행이 결함 전체를 드러내야
    수리 지시를 한 번에 만들 수 있다. 근거는 docs/agent-design.md 9.3이다.
    """
    found: list[Violation] = []
    for name, check in CHECKS:
        for violation in check(audit):
            found.append(
                Violation(
                    violation.reason_code,
                    {"check": name, "fact_id": audit.fact.fact_id, **violation.detail},
                )
            )
    return tuple(found)


def audit_facts(audits: Sequence[FactAudit]) -> tuple[Violation, ...]:
    """여러 행을 한 번에 대조한다. 행이 없으면 위반도 없다."""
    found: list[Violation] = []
    for audit in audits:
        found.extend(audit_fact(audit))
    return tuple(found)
