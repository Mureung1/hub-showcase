"""통계 산출물의 수치 검증.

실패 조건은 docs/statistics-model.md 10장과 docs/metric-spec.md 7장에서 온다.
여섯 검사를 저장소 없이 단독으로 검사한다. 대조할 행은 이 파일이 직접 만든다.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date
from typing import Any

from careersignal.contracts import CheckVerdict, RepairAction, RunContext, Severity
from careersignal.domain.depth import DepthLevel
from careersignal.domain.sampling import MetricPolicy, SampleStatus
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.segment import EntryLabel, EntrySegment
from careersignal.metrics.verification import (
    CHECKS,
    FAMILY_CLUSTER_CONTRAST,
    FAMILY_COOCCURRENCE,
    FAMILY_DEPTH_DISTRIBUTION,
    FAMILY_ENTRY_ADVANCED_SIGNAL,
    FAMILY_POSTING_PREVALENCE,
    FAMILY_REQUIREDNESS_RATIO,
    FAMILY_SCOPE_EXPANSION,
    FAMILY_TEMPORAL_DELTA,
    MEASURE_ASSOCIATION_LIFT,
    MEASURE_CONDITIONAL_A_GIVEN_B,
    MEASURE_COUNT,
    MEASURE_JACCARD,
    MEASURE_PREVALENCE_DIFFERENCE,
    MEASURE_RATIO,
    REASON_DENOMINATOR_MISMATCH,
    REASON_DUPLICATE_NOT_REMOVED,
    REASON_NOT_APPLICABLE_COMPUTED,
    REASON_POLICY_VERSION_MISMATCH,
    REASON_POPULATION_MISMATCH,
    REASON_RECOUNT_MISMATCH,
    REASON_RECOUNT_UNSUPPORTED,
    REASON_SAMPLE_SIZE_MISMATCH,
    REASON_SAMPLE_STATUS_MISMATCH,
    REASON_SEGMENT_NOT_APPLICABLE,
    REASON_TAXONOMY_VERSION_MISMATCH,
    AssignmentRow,
    ClusterMembership,
    FactAudit,
    PopulationSpec,
    PopulationUnit,
    StoredFact,
    VersionContext,
    audit_fact,
    check_applicability,
    check_denominator,
    check_deduplication,
    check_recount,
    check_sample_status,
    check_versions,
    recount,
)
from careersignal.taxonomy.requiredness import Requiredness
from careersignal.verification import CheckContext
from careersignal.verification.checks.statistics import (
    FACT_PAGE_SIZE,
    REASON_NO_FACTS,
    REASON_PARTIAL_SCAN,
    REASON_TARGET_NOT_FOUND,
    TARGET_AGGREGATION,
    TARGET_FACT,
    numerical_consistency_check,
)

PERIOD_START = date(2026, 1, 1)
PERIOD_END = date(2026, 6, 30)
AS_OF = date(2026, 7, 1)

POLICY = MetricPolicy(
    metric_family=FAMILY_POSTING_PREVALENCE,
    formula_version="v1",
    minimum_n=5,
    minimum_n_comparison=10,
)

CONTEXT = VersionContext(
    analysis_version="an_001",
    dataset_version="ds_001",
    taxonomy_version_id="tx_001",
    metric_policy_version="mp_v1",
)


def _spec(**override: Any) -> PopulationSpec:
    base: dict[str, Any] = {
        "job_role_id": "backend",
        "dataset_version": "ds_001",
        "scope_level": ScopeLevel.OVERALL,
        "scope_id": None,
        "period_starts_on": PERIOD_START,
        "period_ends_on": PERIOD_END,
        "entry_segment": EntrySegment.ALL,
        "as_of_date": AS_OF,
        "period_id": "pd_2026h1",
    }
    return PopulationSpec(**(base | override))


def _unit(index: int, **override: Any) -> PopulationUnit:
    base: dict[str, Any] = {
        "posting_version_id": f"pv_{index}",
        "posting_id": f"post_{index}",
        "company_id": f"co_{index}",
        "job_role_id": "backend",
        "dataset_version": "ds_001",
        "posted_on": date(2026, 3, 1),
        "entry_label": EntryLabel.ENTRY_JUNIOR,
        "memberships": (),
    }
    return PopulationUnit(**(base | override))


def _assignment(index: int, dimension_id: str = "dim_a", **override: Any) -> AssignmentRow:
    base: dict[str, Any] = {
        "posting_version_id": f"pv_{index}",
        "dimension_id": dimension_id,
        "taxonomy_version_id": "tx_001",
        "requiredness": Requiredness.REQUIRED,
        "depth_level": DepthLevel.APPLICATION,
        "lifecycle_status": "active",
        "role_boundary_eligible": False,
    }
    return AssignmentRow(**(base | override))


def _fact(**override: Any) -> StoredFact:
    base: dict[str, Any] = {
        "fact_id": "fact_1",
        "analysis_version": "an_001",
        "metric_family": FAMILY_POSTING_PREVALENCE,
        "measure": MEASURE_RATIO,
        "metric_policy_version": "mp_v1",
        "scope_level": ScopeLevel.OVERALL,
        "scope_id": "backend",
        "entry_segment": EntrySegment.ALL,
        "period_id": "pd_2026h1",
        "sample_size": 4,
        "sample_status": SampleStatus.LOW_CONFIDENCE,
        "dimension_id": "dim_a",
        "secondary_dimension_id": None,
        "numerator": 2,
        "denominator": 4,
        "value": 0.5,
    }
    return StoredFact(**(base | override))


def _audit(**override: Any) -> FactAudit:
    """저장값과 원자 행이 서로 맞는 기본 묶음. 공고 넷 중 둘이 `dim_a` 를 요구한다."""
    base: dict[str, Any] = {
        "fact": _fact(),
        "spec": _spec(),
        "context": CONTEXT,
        "policy": POLICY,
        "declared_taxonomy_version_id": "tx_001",
        "candidates": tuple(_unit(i) for i in range(1, 5)),
        "assignments": (_assignment(1), _assignment(2)),
        "applicable_flags": {},
    }
    return FactAudit(**(base | override))


def _codes(violations: tuple[Any, ...]) -> set[str]:
    return {v.reason_code for v in violations}


def _run_context() -> RunContext:
    return RunContext(
        agent_run_id="run_001",
        analysis_version="an_001",
        dataset_version="ds_001",
        taxonomy_version_id="tx_001",
        job_role_id="backend",
        scope_level=ScopeLevel.OVERALL,
        as_of_date=AS_OF,
    )


class FakeReader:
    """저장소 조회의 대역. 검사는 대조할 행만 받는다.

    조회 호출을 센다. 왕복 수가 다시 늘어나면 그 자리에서 드러난다. `missing` 에 적은
    식별자는 행은 있으나 기준 행을 찾지 못한 자리로 다룬다.
    """

    def __init__(
        self,
        audits: dict[str, FactAudit] | None = None,
        missing: Sequence[str] = (),
    ) -> None:
        self._audits = audits or {}
        self._missing = tuple(missing)
        self.calls: list[str] = []
        self.pages: list[int] = []

    def _order(self) -> list[str]:
        return sorted([*self._audits, *self._missing])

    def fact_ids(self, analysis_version: str) -> list[str]:
        self.calls.append("fact_ids")
        return self._order()

    def fact_audit(self, fact_id: str) -> FactAudit | None:
        self.calls.append("fact_audit")
        return self._audits.get(fact_id)

    def fact_count(self, analysis_version: str) -> int:
        self.calls.append("fact_count")
        return len(self._order())

    def fact_audit_page(
        self, analysis_version: str, after: str, size: int
    ) -> list[tuple[str, FactAudit | None]]:
        self.calls.append("fact_audit_page")
        self.pages.append(size)
        following = [fact_id for fact_id in self._order() if fact_id > after]
        return [
            (fact_id, self._audits.get(fact_id))
            for fact_id in following[:size]
        ]


# ============================================================ 기본 상태
def test_consistent_fact_passes_every_check() -> None:
    """저장값과 원자 행이 맞으면 여섯 검사 모두 위반이 없다."""
    assert audit_fact(_audit()) == ()


def test_six_checks_are_declared() -> None:
    """docs/statistics-model.md 10장의 여섯 검사가 전부 등록돼 있다."""
    assert [name for name, _ in CHECKS] == [
        "denominator",
        "deduplication",
        "sample_status",
        "recount",
        "versions",
        "applicability",
    ]


# ============================================================ 검사 1. 분모 일치
def test_posting_outside_the_period_is_not_in_the_denominator() -> None:
    """기간 밖 공고를 분모에 넣으면 잡힌다."""
    audit = _audit(
        candidates=(
            _unit(1),
            _unit(2),
            _unit(3),
            _unit(4),
            _unit(5, posted_on=date(2025, 12, 31)),
        ),
        fact=_fact(denominator=5, sample_size=5, value=0.4),
    )
    violations = check_denominator(audit)

    assert REASON_DENOMINATOR_MISMATCH in _codes(violations)
    detail = next(v.detail for v in violations if v.reason_code == REASON_DENOMINATOR_MISMATCH)
    assert detail["stored"] == 5
    assert detail["recounted"] == 4
    assert detail["excluded_by"] == {"period": 1}


def test_cluster_scope_uses_membership_valid_on_the_as_of_date() -> None:
    """기준일에 유효하지 않은 소속은 기업군 모집단에 들어가지 않는다."""
    member = ClusterMembership("cl_1", date(2025, 1, 1))
    expired = ClusterMembership("cl_1", date(2025, 1, 1), date(2026, 2, 1))
    audit = _audit(
        spec=_spec(scope_level=ScopeLevel.CLUSTER, scope_id="cl_1"),
        fact=_fact(
            scope_level=ScopeLevel.CLUSTER,
            scope_id="cl_1",
            numerator=1,
            denominator=2,
            sample_size=2,
            value=0.5,
        ),
        candidates=(
            _unit(1, memberships=(member,)),
            _unit(2, memberships=(member,)),
            _unit(3, memberships=(expired,)),
        ),
    )
    assert check_denominator(audit) == ()

    inflated = _audit(
        spec=audit.spec,
        fact=_fact(
            scope_level=ScopeLevel.CLUSTER,
            scope_id="cl_1",
            numerator=1,
            denominator=3,
            sample_size=3,
        ),
        candidates=audit.candidates,
        assignments=audit.assignments,
    )
    assert REASON_DENOMINATOR_MISMATCH in _codes(check_denominator(inflated))


def test_scope_label_of_the_row_must_match_the_execution_definition() -> None:
    """행이 선언한 범위·대상군·기간이 정의와 다르면 잡힌다."""
    audit = _audit(fact=_fact(entry_segment=EntrySegment.EXPERIENCED))

    assert REASON_POPULATION_MISMATCH in _codes(check_denominator(audit))


def test_entry_segment_restricts_the_population() -> None:
    """대상군 축이 분모를 제한한다. 표기가 다른 공고는 빠진다."""
    audit = _audit(
        spec=_spec(entry_segment=EntrySegment.ENTRY_JUNIOR),
        fact=_fact(
            entry_segment=EntrySegment.ENTRY_JUNIOR,
            numerator=2,
            denominator=2,
            sample_size=2,
            value=1.0,
        ),
        candidates=(
            _unit(1),
            _unit(2),
            _unit(3, entry_label=EntryLabel.EXPERIENCED),
        ),
    )
    assert check_denominator(audit) == ()
    assert check_recount(audit) == ()


# ============================================================ 검사 2. 중복 제거
def test_same_posting_version_counted_twice_is_caught() -> None:
    """같은 공고가 두 mention 으로 두 번 세어졌으면 잡힌다."""
    audit = _audit(
        assignments=(_assignment(1), _assignment(1), _assignment(2)),
        fact=_fact(numerator=3, value=0.75),
    )
    violations = check_deduplication(audit)

    assert REASON_DUPLICATE_NOT_REMOVED in _codes(violations)
    detail = violations[0].detail
    assert detail["stored"] == [3, 4]
    assert detail["deduplicated"] == [2, 4]


def test_duplicate_population_rows_are_caught() -> None:
    """모집단에 같은 공고 버전이 두 번 들어가면 잡힌다."""
    audit = _audit(
        candidates=(_unit(1), _unit(1), _unit(2), _unit(3), _unit(4)),
        fact=_fact(numerator=2, denominator=5, sample_size=5, value=0.4),
    )
    assert REASON_DUPLICATE_NOT_REMOVED in _codes(check_deduplication(audit))


def test_deduplicated_fact_has_no_duplicate_violation() -> None:
    """한 공고 버전에 같은 차원이 여러 번 나타나도 한 번 세면 통과다."""
    audit = _audit(assignments=(_assignment(1), _assignment(1), _assignment(2)))

    assert check_deduplication(audit) == ()
    assert check_recount(audit) == ()


# ============================================================ 검사 3. 표본 판정
def test_sample_status_below_minimum_n_is_low_confidence() -> None:
    """분모가 `minimum_n` 미만이면 `low_confidence` 다."""
    assert check_sample_status(_audit()) == ()


def test_sample_status_that_disagrees_with_the_policy_is_caught() -> None:
    """정책 임계값과 다른 `sample_status` 는 잡힌다."""
    audit = _audit(fact=_fact(sample_status=SampleStatus.ANALYSIS_READY))
    violations = check_sample_status(audit)

    assert REASON_SAMPLE_STATUS_MISMATCH in _codes(violations)
    assert violations[0].detail["expected"] == str(SampleStatus.LOW_CONFIDENCE)


def test_sample_size_must_equal_the_denominator() -> None:
    """표본 판정의 입력이 분모이므로 `sample_size` 가 분모와 달라지면 잡힌다."""
    audit = _audit(fact=_fact(sample_size=9, sample_status=SampleStatus.NOT_COMPARABLE))

    assert REASON_SAMPLE_SIZE_MISMATCH in _codes(check_sample_status(audit))


def test_zero_denominator_is_not_computable() -> None:
    """분모가 0이면 `not_computable` 이고 값이 없다."""
    audit = _audit(
        candidates=(),
        assignments=(),
        fact=_fact(
            numerator=0,
            denominator=0,
            sample_size=0,
            sample_status=SampleStatus.NOT_COMPUTABLE,
            value=None,
        ),
    )
    assert check_sample_status(audit) == ()
    assert check_recount(audit) == ()


def test_cluster_contrast_needs_both_denominators_to_be_comparable() -> None:
    """기업군과 직무 전체 중 한쪽이라도 미달이면 `not_comparable` 이다."""
    audit = _audit(
        spec=_spec(scope_level=ScopeLevel.CLUSTER, scope_id="cl_1"),
        fact=_fact(
            metric_family=FAMILY_CLUSTER_CONTRAST,
            measure=MEASURE_PREVALENCE_DIFFERENCE,
            scope_level=ScopeLevel.CLUSTER,
            scope_id="cl_1",
            numerator=2,
            denominator=4,
            sample_size=4,
            sample_status=SampleStatus.ANALYSIS_READY,
            value=0.1,
        ),
        policy=MetricPolicy(FAMILY_CLUSTER_CONTRAST, "v1", 5, 10),
        candidates=tuple(
            _unit(i, memberships=(ClusterMembership("cl_1", date(2025, 1, 1)),))
            for i in range(1, 5)
        ),
        baseline_denominator=30,
        baseline_prevalence=0.4,
    )
    violations = check_sample_status(audit)

    assert REASON_SAMPLE_STATUS_MISMATCH in _codes(violations)
    assert violations[0].detail["expected"] == str(SampleStatus.NOT_COMPARABLE)


# ============================================================ 검사 4. 재계산 일치
def test_stored_numerator_that_differs_from_the_recount_is_caught() -> None:
    """저장값과 독립 재계산이 다르면 잡힌다."""
    audit = _audit(fact=_fact(numerator=3, value=0.75))
    violations = check_recount(audit)

    assert REASON_RECOUNT_MISMATCH in _codes(violations)
    assert violations[0].detail["stored_vs_recounted"]["numerator"] == [3, 2]


def test_stored_value_that_disagrees_with_its_own_counts_is_caught() -> None:
    """분자·분모가 맞아도 값이 다르면 잡힌다."""
    audit = _audit(fact=_fact(value=0.8))

    assert REASON_RECOUNT_MISMATCH in _codes(check_recount(audit))


def test_inactive_dimension_included_is_reproduced_in_the_diagnosis() -> None:
    """비활성 차원을 넣은 집계는 재계산이 잡고 원인까지 남긴다."""
    audit = _audit(
        assignments=(
            _assignment(1),
            _assignment(2),
            _assignment(3, lifecycle_status="deprecated"),
        ),
        fact=_fact(numerator=3, value=0.75),
    )
    violations = check_recount(audit)

    assert REASON_RECOUNT_MISMATCH in _codes(violations)
    assert violations[0].detail["reproduced_by"] == "inactive_dimension_included"


def test_other_taxonomy_version_assignments_are_excluded() -> None:
    """활성 분류체계 버전이 아닌 할당은 재계산에 들어가지 않는다."""
    audit = _audit(
        assignments=(
            _assignment(1),
            _assignment(2),
            _assignment(3, taxonomy_version_id="tx_000"),
        )
    )
    assert check_recount(audit) == ()


def test_requiredness_ratio_denominator_is_the_dimension_population() -> None:
    """`requiredness_ratio` 의 분모는 전체 모집단이 아니라 차원이 나타난 공고다."""
    audit = _audit(
        fact=_fact(
            metric_family=FAMILY_REQUIREDNESS_RATIO,
            numerator=1,
            denominator=2,
            sample_size=2,
            value=0.5,
        ),
        assignments=(
            _assignment(1),
            _assignment(2, requiredness=Requiredness.PREFERRED),
        ),
    )
    assert check_recount(audit) == ()


def test_depth_distribution_counts_only_the_deepest_level() -> None:
    """한 공고에 여러 깊이가 있으면 가장 깊은 등급 하나만 센다."""
    audit = _audit(
        fact=_fact(
            metric_family=FAMILY_DEPTH_DISTRIBUTION,
            measure=str(DepthLevel.TRADEOFF),
            numerator=1,
            denominator=2,
            sample_size=2,
            value=0.5,
        ),
        assignments=(
            _assignment(1, depth_level=DepthLevel.FOUNDATION),
            _assignment(1, depth_level=DepthLevel.TRADEOFF),
            _assignment(2, depth_level=DepthLevel.APPLICATION),
        ),
    )
    assert check_recount(audit) == ()


def test_depth_distribution_numerators_sum_to_the_denominator() -> None:
    """세 measure 의 분자 합이 분모와 같다."""
    audit = _audit(
        assignments=(
            _assignment(1, depth_level=DepthLevel.FOUNDATION),
            _assignment(1, depth_level=DepthLevel.TRADEOFF),
            _assignment(2, depth_level=DepthLevel.APPLICATION),
        )
    )
    total = 0
    for level in DepthLevel:
        result = recount(
            FactAudit(
                fact=_fact(
                    metric_family=FAMILY_DEPTH_DISTRIBUTION, measure=str(level)
                ),
                spec=audit.spec,
                context=CONTEXT,
                policy=POLICY,
                declared_taxonomy_version_id="tx_001",
                candidates=audit.candidates,
                assignments=audit.assignments,
            )
        )
        assert result.count is not None
        total += result.count.numerator or 0
        assert result.count.denominator == 2
    assert total == 2


def test_scope_expansion_counts_boundary_dimensions_once() -> None:
    """경계 차원이 여럿이어도 공고 하나를 한 번만 센다."""
    audit = _audit(
        fact=_fact(
            metric_family=FAMILY_SCOPE_EXPANSION,
            dimension_id=None,
            numerator=1,
            denominator=4,
            sample_size=4,
            value=0.25,
        ),
        assignments=(
            _assignment(1, role_boundary_eligible=True),
            _assignment(1, "dim_b", role_boundary_eligible=True),
            _assignment(2),
        ),
    )
    assert check_recount(audit) == ()


def test_entry_label_advanced_signal_denominator_is_labeled_postings() -> None:
    """분모가 신입·주니어 표기 공고로 제한된다."""
    audit = _audit(
        spec=_spec(entry_segment=EntrySegment.ENTRY_JUNIOR),
        fact=_fact(
            metric_family=FAMILY_ENTRY_ADVANCED_SIGNAL,
            entry_segment=EntrySegment.ENTRY_JUNIOR,
            dimension_id=None,
            numerator=1,
            denominator=2,
            sample_size=2,
            value=0.5,
        ),
        candidates=(
            _unit(1),
            _unit(2, entry_label=EntryLabel.ENTRY),
            _unit(3, entry_label=EntryLabel.EXPERIENCED),
        ),
        assignments=(
            _assignment(1, depth_level=DepthLevel.TRADEOFF),
            _assignment(2, depth_level=DepthLevel.APPLICATION),
            _assignment(3, depth_level=DepthLevel.TRADEOFF),
        ),
    )
    assert check_recount(audit) == ()


def test_cooccurrence_measures_are_recounted_from_sets() -> None:
    """교집합·합집합·조건부 확률을 집합 연산으로 다시 만든다."""
    assignments = (
        _assignment(1, "dim_a"),
        _assignment(1, "dim_b"),
        _assignment(2, "dim_a"),
        _assignment(3, "dim_b"),
    )
    expected = {
        MEASURE_COUNT: (1, None, 1.0),
        MEASURE_JACCARD: (1, 3, 1 / 3),
        MEASURE_CONDITIONAL_A_GIVEN_B: (1, 2, 0.5),
    }
    for measure, (numerator, denominator, value) in expected.items():
        audit = _audit(
            fact=_fact(
                metric_family=FAMILY_COOCCURRENCE,
                measure=measure,
                dimension_id="dim_a",
                secondary_dimension_id="dim_b",
                numerator=numerator,
                denominator=denominator,
                sample_size=denominator or 4,
                sample_status=SampleStatus.LOW_CONFIDENCE,
                value=value,
            ),
            assignments=assignments,
        )
        assert check_recount(audit) == (), measure


def test_cluster_contrast_difference_uses_the_baseline_prevalence() -> None:
    """기업군 비율에서 직무 전체 비율을 뺀 값이 저장값과 같아야 한다."""
    audit = _audit(
        spec=_spec(scope_level=ScopeLevel.CLUSTER, scope_id="cl_1"),
        fact=_fact(
            metric_family=FAMILY_CLUSTER_CONTRAST,
            measure=MEASURE_PREVALENCE_DIFFERENCE,
            scope_level=ScopeLevel.CLUSTER,
            scope_id="cl_1",
            numerator=2,
            denominator=4,
            sample_size=4,
            value=0.1,
        ),
        candidates=tuple(
            _unit(i, memberships=(ClusterMembership("cl_1", date(2025, 1, 1)),))
            for i in range(1, 5)
        ),
        baseline_denominator=30,
        baseline_prevalence=0.4,
    )
    assert check_recount(audit) == ()

    wrong = FactAudit(
        fact=_fact(
            metric_family=FAMILY_CLUSTER_CONTRAST,
            measure=MEASURE_PREVALENCE_DIFFERENCE,
            scope_level=ScopeLevel.CLUSTER,
            scope_id="cl_1",
            numerator=2,
            denominator=4,
            sample_size=4,
            value=0.5,
        ),
        spec=audit.spec,
        context=CONTEXT,
        policy=POLICY,
        declared_taxonomy_version_id="tx_001",
        candidates=audit.candidates,
        assignments=audit.assignments,
        baseline_denominator=30,
        baseline_prevalence=0.4,
    )
    assert REASON_RECOUNT_MISMATCH in _codes(check_recount(wrong))


# ------------------------------------------------------------ 값을 비운 행
def test_suppressed_value_is_not_a_recount_violation() -> None:
    """억제 정책이 값을 비운 행을 불일치로 잡지 않는다.

    `hide` 는 표본에 못 미친 값과 구간만 비우고 행과 분자·분모는 남긴다
    (docs/metric-spec.md 2.4). 값이 없는 것은 저장 규칙이지 계산 오류가 아니다.
    """
    audit = _audit(fact=_fact(value=None, sample_status=SampleStatus.LOW_CONFIDENCE))

    assert check_recount(audit) == ()


def test_not_computable_row_is_not_a_recount_violation() -> None:
    """분모가 서지 않아 값이 없는 행도 불일치가 아니다."""
    audit = _audit(
        candidates=(),
        assignments=(),
        fact=_fact(
            numerator=0,
            denominator=0,
            sample_size=0,
            sample_status=SampleStatus.NOT_COMPUTABLE,
            value=None,
        ),
    )
    assert check_recount(audit) == ()
    assert audit_fact(audit) == ()


def test_emptied_value_does_not_hide_a_wrong_numerator() -> None:
    """값을 비운 행도 분자·분모로는 그대로 대조한다. 검사가 무르지 않다."""
    audit = _audit(
        fact=_fact(
            numerator=4, value=None, sample_status=SampleStatus.LOW_CONFIDENCE
        )
    )
    violations = check_recount(audit)

    assert REASON_RECOUNT_MISMATCH in _codes(violations)
    assert violations[0].detail["stored_vs_recounted"]["numerator"] == [4, 2]
    assert violations[0].detail["value_compared"] is False


def test_value_that_should_not_exist_is_caught() -> None:
    """재계산이 값을 내지 못하는 자리에 수가 들어가 있으면 잡힌다.

    `association_lift` 는 두 집합 가운데 하나라도 비면 정의되지 않는다
    (docs/metric-spec.md 3.5).
    """
    audit = _audit(
        fact=_fact(
            metric_family=FAMILY_COOCCURRENCE,
            measure=MEASURE_ASSOCIATION_LIFT,
            dimension_id="dim_a",
            secondary_dimension_id="dim_z",
            numerator=0,
            denominator=4,
            sample_size=4,
            value=0.0,
        )
    )
    violations = check_recount(audit)

    assert REASON_RECOUNT_MISMATCH in _codes(violations)
    assert violations[0].detail["stored_vs_recounted"]["value"] == [0.0, None]


def test_cooccurrence_count_keeps_its_null_denominator() -> None:
    """`count` 은 분모가 없는 것이 정의다. 양쪽이 함께 비면 어긋남이 아니다."""
    audit = _audit(
        fact=_fact(
            metric_family=FAMILY_COOCCURRENCE,
            measure=MEASURE_COUNT,
            dimension_id="dim_a",
            secondary_dimension_id="dim_b",
            numerator=0,
            denominator=None,
            sample_size=4,
            value=0.0,
        ),
        assignments=(_assignment(1), _assignment(2)),
    )
    assert check_recount(audit) == ()


def test_recount_detail_carries_both_sides() -> None:
    """예시 출력이 읽는 저장값·재계산값이 위반에 함께 담긴다."""
    audit = _audit(fact=_fact(numerator=3, value=0.75))
    detail = check_recount(audit)[0].detail

    assert detail["stored"] == {"numerator": 3, "denominator": 4, "value": 0.75}
    assert detail["recounted"] == {"numerator": 2, "denominator": 4, "value": 0.5}


def test_every_violation_names_its_family_and_measure() -> None:
    """family 별로 세려면 위반이 자기 family 를 들고 있어야 한다."""
    audit = _audit(fact=_fact(numerator=3, value=0.75))
    for violation in audit_fact(audit):
        assert violation.detail["metric_family"] == FAMILY_POSTING_PREVALENCE
        assert violation.detail["measure"] == MEASURE_RATIO


def test_temporal_delta_without_base_facts_is_not_passed() -> None:
    """재계산할 재료가 없는 행을 통과로 두지 않는다."""
    audit = _audit(
        fact=_fact(
            metric_family=FAMILY_TEMPORAL_DELTA,
            measure="posting_prevalence__ratio",
            numerator=2,
            denominator=4,
            sample_size=3,
            value=0.1,
        )
    )
    assert REASON_RECOUNT_UNSUPPORTED in _codes(check_recount(audit))


def test_temporal_delta_is_recomputed_from_the_two_base_facts() -> None:
    """연산자는 두 기간 기준값에서 다시 적용한다."""
    before = _fact(fact_id="fact_a", numerator=1, denominator=3, value=0.333333)
    after = _fact(fact_id="fact_b", numerator=2, denominator=4, value=0.5)
    audit = _audit(
        fact=_fact(
            metric_family=FAMILY_TEMPORAL_DELTA,
            measure="posting_prevalence__ratio",
            numerator=2,
            denominator=4,
            sample_size=3,
            value=0.166667,
        ),
        temporal_inputs=(before, after),
    )
    assert check_recount(audit) == ()


# ============================================================ 검사 5. 버전 일치
def test_policy_version_that_differs_from_the_context_is_caught() -> None:
    """실행 컨텍스트와 다른 지표 정책 버전은 잡힌다."""
    audit = _audit(fact=_fact(metric_policy_version="mp_v2"))
    violations = check_versions(audit)

    assert REASON_POLICY_VERSION_MISMATCH in _codes(violations)
    assert violations[0].detail["stored_vs_expected"]["metric_policy_version"] == [
        "mp_v2",
        "mp_v1",
    ]


def test_taxonomy_version_that_differs_from_the_context_is_caught() -> None:
    """실행 컨텍스트와 다른 분류체계 버전은 잡힌다."""
    audit = _audit(declared_taxonomy_version_id="tx_000")

    assert REASON_TAXONOMY_VERSION_MISMATCH in _codes(check_versions(audit))


def test_analysis_version_of_the_row_must_match_the_context() -> None:
    """다른 분석 버전의 행이 이 실행의 산출물로 섞이지 않는다."""
    audit = _audit(fact=_fact(analysis_version="an_002"))

    assert REASON_POLICY_VERSION_MISMATCH in _codes(check_versions(audit))


def test_matching_versions_pass() -> None:
    assert check_versions(_audit()) == ()


# ============================================================ 검사 6. 적용 가능성
def test_not_applicable_combination_that_was_computed_is_caught() -> None:
    """적용 불가로 표시된 차원·지표 조합이 계산돼 있으면 잡힌다."""
    audit = _audit(
        applicable_flags={("dim_a", FAMILY_POSTING_PREVALENCE): False}
    )
    violations = check_applicability(audit)

    assert REASON_NOT_APPLICABLE_COMPUTED in _codes(violations)
    assert violations[0].detail["dimension_id"] == "dim_a"


def test_secondary_dimension_applicability_is_checked() -> None:
    """차원 쌍은 두 차원 모두 본다."""
    audit = _audit(
        fact=_fact(
            metric_family=FAMILY_COOCCURRENCE,
            measure=MEASURE_COUNT,
            dimension_id="dim_a",
            secondary_dimension_id="dim_b",
            denominator=None,
        ),
        applicable_flags={("dim_b", FAMILY_COOCCURRENCE): False},
    )
    assert REASON_NOT_APPLICABLE_COMPUTED in _codes(check_applicability(audit))


def test_segment_only_family_stored_in_another_segment_is_caught() -> None:
    """대상군으로 전개하지 않는 지표가 다른 대상군으로 저장되면 잡힌다."""
    audit = _audit(
        fact=_fact(
            metric_family=FAMILY_ENTRY_ADVANCED_SIGNAL,
            entry_segment=EntrySegment.EXPERIENCED,
            dimension_id=None,
        )
    )
    assert REASON_SEGMENT_NOT_APPLICABLE in _codes(check_applicability(audit))


def test_applicable_combination_passes() -> None:
    audit = _audit(applicable_flags={("dim_a", FAMILY_POSTING_PREVALENCE): True})

    assert check_applicability(audit) == ()


# ============================================================ 검사 실행
def test_empty_aggregation_is_skipped_not_passed() -> None:
    """검사할 행이 0개인 것과 통과를 구분한다."""
    outcome = numerical_consistency_check(FakeReader())(
        CheckContext(
            run=_run_context(),
            target_type=TARGET_AGGREGATION,
            target_id="an_001",
        )
    )

    assert outcome.verdict is CheckVerdict.SKIP
    assert outcome.reason_code == REASON_NO_FACTS
    assert outcome.detail == {"analysis_version": "an_001", "fact_count": 0}


def test_consistent_aggregation_passes() -> None:
    reader = FakeReader({"fact_1": _audit()})
    outcome = numerical_consistency_check(reader)(
        CheckContext(
            run=_run_context(),
            target_type=TARGET_AGGREGATION,
            target_id="an_001",
        )
    )

    assert outcome.verdict is CheckVerdict.PASS
    assert outcome.reason_code is None


def test_violation_blocks_and_asks_for_recomputation() -> None:
    """수치 위반은 차단이고 수리 동작은 재계산이다."""
    reader = FakeReader({"fact_1": _audit(fact=_fact(numerator=3, value=0.75))})
    outcome = numerical_consistency_check(reader)(
        CheckContext(
            run=_run_context(),
            target_type=TARGET_FACT,
            target_id="fact_1",
        )
    )

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.severity is Severity.BLOCKING
    assert outcome.repair_action is RepairAction.RECOMPUTE_STAT
    assert outcome.detail is not None
    assert outcome.detail["violations"][0]["fact_id"] == "fact_1"


def test_not_applicable_combination_is_dropped_not_recomputed() -> None:
    """존재하면 안 되는 행은 다시 계산하지 않고 폐기한다."""
    reader = FakeReader(
        {"fact_1": _audit(applicable_flags={("dim_a", FAMILY_POSTING_PREVALENCE): False})}
    )
    outcome = numerical_consistency_check(reader)(
        CheckContext(
            run=_run_context(),
            target_type=TARGET_FACT,
            target_id="fact_1",
        )
    )

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.repair_action is RepairAction.DROP_CLAIM


def test_missing_target_is_not_passed() -> None:
    outcome = numerical_consistency_check(FakeReader())(
        CheckContext(
            run=_run_context(),
            target_type=TARGET_FACT,
            target_id="fact_missing",
        )
    )

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_TARGET_NOT_FOUND


def test_other_target_type_is_skipped() -> None:
    outcome = numerical_consistency_check(FakeReader())(
        CheckContext(
            run=_run_context(),
            target_type="analysis_claim",
            target_id="claim_1",
        )
    )

    assert outcome.verdict is CheckVerdict.SKIP


def test_all_violations_are_collected_in_one_run() -> None:
    """위반이 나와도 남은 검사를 건너뛰지 않는다."""
    audit = _audit(
        fact=_fact(
            metric_policy_version="mp_v2",
            numerator=3,
            sample_status=SampleStatus.ANALYSIS_READY,
            value=0.75,
        )
    )
    codes = _codes(audit_fact(audit))

    assert REASON_RECOUNT_MISMATCH in codes
    assert REASON_SAMPLE_STATUS_MISMATCH in codes
    assert REASON_POLICY_VERSION_MISMATCH in codes


def test_violations_are_counted_by_family_and_reason() -> None:
    """어느 family 가 몇 건인지 판정 하나에서 읽힌다."""
    wrong = _audit(fact=_fact(fact_id="fact_a", numerator=3, value=0.75))
    other = _audit(
        fact=_fact(
            fact_id="fact_b",
            metric_family=FAMILY_REQUIREDNESS_RATIO,
            numerator=1,
            denominator=2,
            sample_size=2,
            value=0.5,
        ),
        policy=MetricPolicy(FAMILY_REQUIREDNESS_RATIO, "v1", 5, 10),
        assignments=(_assignment(1),),
    )
    outcome = numerical_consistency_check(
        FakeReader({"fact_a": wrong, "fact_b": other})
    )(
        CheckContext(
            run=_run_context(),
            target_type=TARGET_AGGREGATION,
            target_id="an_001",
        )
    )

    assert outcome.verdict is CheckVerdict.FAIL
    detail = outcome.detail or {}
    assert detail["by_family"][FAMILY_POSTING_PREVALENCE] == 1
    assert detail["by_family"][FAMILY_REQUIREDNESS_RATIO] >= 1
    assert detail["by_reason"][REASON_RECOUNT_MISMATCH] >= 1
    assert detail["by_check"]["recount"] >= 1
    assert detail["violated_fact_count"] == 2


def test_violation_rows_are_counted_apart_from_violations() -> None:
    """한 행이 여러 검사에서 걸리면 위반 건수가 행 수보다 크다."""
    audit = _audit(
        fact=_fact(
            metric_policy_version="mp_v2",
            numerator=3,
            sample_status=SampleStatus.ANALYSIS_READY,
            value=0.75,
        )
    )
    outcome = numerical_consistency_check(FakeReader({"fact_1": audit}))(
        CheckContext(
            run=_run_context(),
            target_type=TARGET_AGGREGATION,
            target_id="an_001",
        )
    )
    detail = outcome.detail or {}

    assert detail["violated_fact_count"] == 1
    assert detail["violation_count"] > detail["violated_fact_count"]


# ============================================================ 대조 재료 공급
class FakeUnit:
    """저장소가 쓰는 거래의 대역. SQL 을 실행하지 않고 문장으로 행을 고른다.

    문장 상수를 키로 쓰므로 컬럼 이름이 바뀌면 대역이 아니라 저장소가 먼저 깨진다.
    """

    def __init__(self, rows: dict[str, Any]) -> None:
        from careersignal.domain.permissions import Component

        self.component = Component.PIPE_VERIFY
        self._rows = rows
        self.calls: list[str] = []

    def _key(self, sql: str) -> str:
        from careersignal.repositories.metrics import StatisticsAuditRepository

        for name in dir(StatisticsAuditRepository):
            if not name.startswith("_") or not name[1:].isupper():
                continue
            value = getattr(StatisticsAuditRepository, name)
            if isinstance(value, str) and value == sql:
                return name
        raise AssertionError(f"등록되지 않은 문장이다: {sql}")

    def fetch_all(self, sql: str, params: Any = None) -> list[dict[str, Any]]:
        key = self._key(sql)
        self.calls.append(key)
        rows = [dict(row) for row in self._rows.get(key, [])]
        if key == "_FACT_PAGE" and params:
            # 문장의 `fact_id > %(after)s ... LIMIT %(size)s` 를 대신한다.
            rows.sort(key=lambda row: str(row["fact_id"]))
            rows = [
                row for row in rows if str(row["fact_id"]) > str(params["after"])
            ][: int(params["size"])]
        return rows

    def fetch_one(self, sql: str, params: Any = None) -> dict[str, Any] | None:
        key = self._key(sql)
        self.calls.append(key)
        if key == "_FACT_COUNT":
            return {"fact_count": len(self._rows.get("_FACT_PAGE", []))}
        rows = self._rows.get(key, [])
        return dict(rows[0]) if rows else None


def _audit_rows() -> dict[str, Any]:
    return {
        "_FACT": [
            {
                "fact_id": "fact_1",
                "analysis_version": "an_001",
                "metric_family": FAMILY_POSTING_PREVALENCE,
                "measure": MEASURE_RATIO,
                "metric_policy_version": "mp_v1_prevalence",
                "scope_level": "overall",
                "scope_id": "backend",
                "entry_segment": "all",
                "period_id": "pd_2026h1",
                "dimension_id": "dim_a",
                "secondary_dimension_id": None,
                "numerator": 1,
                "denominator": 1,
                "value": 1.0,
                "sample_size": 1,
                "sample_status": "low_confidence",
            }
        ],
        "_ANALYSIS_VERSION": [
            {
                "job_role_id": "backend",
                "dataset_version": "ds_001",
                "taxonomy_version_id": "tx_001",
                "metric_policy_version": "mp_v1_prevalence",
            }
        ],
        "_PERIOD": [
            {
                "period_id": "pd_2026h1",
                "starts_on": PERIOD_START,
                "ends_on": PERIOD_END,
            }
        ],
        "_POLICY": [
            {
                "metric_family": FAMILY_POSTING_PREVALENCE,
                "formula_version": "v1",
                "minimum_n": 5,
                "minimum_n_comparison": 10,
            }
        ],
        "_EFFECTIVE_POLICIES": [
            {
                "metric_family": FAMILY_POSTING_PREVALENCE,
                "metric_policy_version": "mp_v1_prevalence",
            }
        ],
        "_CANDIDATES": [
            {
                "posting_version_id": "pv_1",
                "posting_id": "post_1",
                "company_id": "co_1",
                "job_role_id": "backend",
                "dataset_version": "ds_001",
                "posted_on": date(2026, 3, 1),
                "entry_label": "entry_junior",
            }
        ],
        "_MEMBERSHIPS": [
            {
                "company_id": "co_1",
                "cluster_id": "cl_platform",
                "valid_from": date(2026, 1, 1),
                "valid_to": None,
            }
        ],
        "_ASSIGNMENTS": [
            {
                "posting_version_id": "pv_1",
                "dimension_id": "dim_a",
                "taxonomy_version_id": "tx_001",
                "requiredness": "required",
                "depth_level": "application",
                "lifecycle_status": "active",
                "role_boundary_eligible": False,
            }
        ],
        "_APPLICABLE_FLAGS": [
            {
                "dimension_id": "dim_a",
                "metric_family": FAMILY_POSTING_PREVALENCE,
                "applicable": True,
            }
        ],
    }


def _audit_repository(rows: dict[str, Any] | None = None) -> Any:
    from careersignal.repositories.metrics import StatisticsAuditRepository

    return StatisticsAuditRepository(
        FakeUnit(_audit_rows() if rows is None else rows),  # type: ignore[arg-type]
        AS_OF,
    )


def test_repository_builds_an_audit_that_passes_a_correct_row() -> None:
    """올바른 행은 여섯 검사를 모두 지난다. 재료가 어긋나면 여기서 드러난다."""
    audit = _audit_repository().fact_audit("fact_1")

    assert audit is not None
    assert audit.spec.job_role_id == "backend"
    assert audit.spec.scope_id == "backend"
    assert audit.candidates[0].entry_label is EntryLabel.ENTRY_JUNIOR
    assert audit.candidates[0].memberships[0].cluster_id == "cl_platform"
    assert audit.assignments[0].requiredness is Requiredness.REQUIRED
    assert audit.assignments[0].depth_level is DepthLevel.APPLICATION
    assert audit_fact(audit) == ()


def test_repository_expects_the_policy_of_the_facts_family() -> None:
    """분석 버전의 단일 정책 값과 견주지 않는다.

    `analysis_versions.metric_policy_version` 은 하나이고
    `metric_policy_versions` 는 family 마다 행이다. 분석 버전의 값과 견주면 그 family
    를 뺀 모든 행이 위반이 된다.
    """
    rows = _audit_rows()
    rows["_ANALYSIS_VERSION"][0]["metric_policy_version"] = "mp_v1_depth"
    audit = _audit_repository(rows).fact_audit("fact_1")

    assert audit is not None
    assert audit.context.metric_policy_version == "mp_v1_prevalence"
    assert _codes(check_versions(audit)) == set()


def test_repository_expects_the_base_policy_for_a_delta_row() -> None:
    """`temporal_delta` 는 전용 정책 행이 없어 기준 지표의 정책을 쓴다."""
    rows = _audit_rows()
    rows["_FACT"][0]["metric_family"] = FAMILY_TEMPORAL_DELTA
    rows["_FACT"][0]["measure"] = "posting_prevalence__ratio"
    audit = _audit_repository(rows).fact_audit("fact_1")

    assert audit is not None
    assert audit.context.metric_policy_version == "mp_v1_prevalence"
    assert audit.policy.metric_family == FAMILY_TEMPORAL_DELTA


def test_repository_reads_the_atomic_rows_once_per_transaction() -> None:
    """행마다 같은 후보 목록을 다시 읽지 않는다."""
    repository = _audit_repository()
    repository.fact_audit("fact_1")
    repository.fact_audit("fact_1")
    unit = repository.unit

    assert unit.calls.count("_CANDIDATES") == 1
    assert unit.calls.count("_ASSIGNMENTS") == 1


def test_repository_returns_nothing_for_an_unknown_fact() -> None:
    assert _audit_repository({"_FACT": []}).fact_audit("fact_missing") is None


def test_repository_reads_the_reference_rows_once_per_transaction() -> None:
    """분석 버전·기간·정책을 행마다 다시 읽지 않는다.

    셋 다 행마다 값이 거의 같다. 되풀이해 읽으면 왕복이 행 수의 세 배로 늘고, 원격
    저장소에서는 그 왕복이 검증 시간의 거의 전부가 된다.
    """
    repository = _audit_repository()
    repository.fact_audit("fact_1")
    repository.fact_audit("fact_1")
    unit = repository.unit

    assert unit.calls.count("_ANALYSIS_VERSION") == 1
    assert unit.calls.count("_PERIOD") == 1
    assert unit.calls.count("_POLICY") == 1


def test_repository_reads_the_baselines_once_for_the_whole_version() -> None:
    """`cluster_contrast` 기준선을 행마다 찾지 않는다."""
    rows = _audit_rows()
    rows["_FACT"][0]["metric_family"] = FAMILY_CLUSTER_CONTRAST
    rows["_FACT"][0]["measure"] = MEASURE_PREVALENCE_DIFFERENCE
    rows["_BASELINE_PREVALENCES"] = [
        {
            "entry_segment": "all",
            "period_id": "pd_2026h1",
            "dimension_id": "dim_a",
            "numerator": 3,
            "denominator": 4,
        },
        {
            "entry_segment": "all",
            "period_id": "pd_2026h1",
            "dimension_id": "dim_b",
            "numerator": 1,
            "denominator": 4,
        },
    ]
    repository = _audit_repository(rows)
    audit = repository.fact_audit("fact_1")
    repository.fact_audit("fact_1")

    assert audit is not None
    assert audit.baseline_denominator == 4
    assert audit.baseline_prevalence == 0.75
    assert repository.unit.calls.count("_BASELINE_PREVALENCES") == 1


def test_repository_reads_the_delta_inputs_once_for_the_whole_version() -> None:
    """`temporal_delta` 의 두 입력을 행마다 찾지 않는다.

    기준 기간 이하의 마지막 두 행을 고른다. 앞선 문장이 `starts_on DESC` 로 두 줄만
    집던 것과 같은 차례여야 델타의 뺄셈이 같은 두 값을 본다.
    """
    rows = _audit_rows()
    rows["_FACT"][0]["metric_family"] = FAMILY_TEMPORAL_DELTA
    rows["_FACT"][0]["measure"] = "posting_prevalence__ratio"
    base = {
        **_audit_rows()["_FACT"][0],
        "metric_family": FAMILY_POSTING_PREVALENCE,
        "measure": MEASURE_RATIO,
    }
    rows["_BASE_FACTS_FOR_DELTA"] = [
        {
            **base,
            "fact_id": "fact_old",
            "period_id": "pd_2025h1",
            "starts_on": date(2025, 1, 1),
        },
        {
            **base,
            "fact_id": "fact_prior",
            "period_id": "pd_2025h2",
            "starts_on": date(2025, 7, 1),
        },
        {
            **base,
            "fact_id": "fact_latest",
            "period_id": "pd_2026h1",
            "starts_on": PERIOD_START,
        },
        {
            **base,
            "fact_id": "fact_after",
            "period_id": "pd_2026h2",
            "starts_on": date(2026, 7, 1),
        },
    ]
    repository = _audit_repository(rows)
    audit = repository.fact_audit("fact_1")
    repository.fact_audit("fact_1")

    assert audit is not None
    assert audit.temporal_inputs is not None
    period_a, period_b = audit.temporal_inputs
    assert (period_a.fact_id, period_b.fact_id) == ("fact_prior", "fact_latest")
    assert repository.unit.calls.count("_BASE_FACTS_FOR_DELTA") == 1


def test_repository_leaves_the_delta_inputs_empty_without_two_base_rows() -> None:
    """기준 행이 하나뿐이면 입력을 지어내지 않는다."""
    rows = _audit_rows()
    rows["_FACT"][0]["metric_family"] = FAMILY_TEMPORAL_DELTA
    rows["_FACT"][0]["measure"] = "posting_prevalence__ratio"
    audit = _audit_repository(rows).fact_audit("fact_1")

    assert audit is not None
    assert audit.temporal_inputs is None


# ============================================================ 왕복 조회 수
LEGACY_FETCHES_PER_FACT = 4
"""고치기 전 지표 행 하나에 들던 왕복 수.

`_FACT`·`_ANALYSIS_VERSION`·`_PERIOD`·`_POLICY` 를 행마다 하나씩 읽었다. 21,676행이면
왕복이 8만 7천 번이다. 이 상수는 줄어든 폭을 수로 확인하기 위한 기준이다.
"""


def _paged_rows(count: int) -> dict[str, Any]:
    """지표 행 `count` 개를 담은 대역 상태. 행끼리는 식별자만 다르다."""
    rows = _audit_rows()
    template = rows["_FACT"][0]
    rows["_FACT_PAGE"] = [
        {**template, "fact_id": f"fact_{index:05d}"} for index in range(count)
    ]
    return rows


def _aggregation_outcome(repository: Any, **options: Any) -> Any:
    return numerical_consistency_check(repository, **options)(
        CheckContext(
            run=_run_context(),
            target_type=TARGET_AGGREGATION,
            target_id="an_001",
        )
    )


def test_batched_scan_cuts_the_number_of_round_trips() -> None:
    """행 수에 비례하던 왕복이 묶음 수로 줄었다.

    행 1,200개는 고치기 전이라면 왕복 4,800번이었다. 지금은 묶음 3번에 기준 행과 원자
    행을 합쳐 열 번대다. 이 수가 다시 늘면 회귀다.
    """
    count = 1200
    repository = _audit_repository(_paged_rows(count))
    outcome = _aggregation_outcome(repository)
    calls = repository.unit.calls

    assert outcome.verdict is CheckVerdict.PASS
    assert calls.count("_FACT_PAGE") == -(-count // FACT_PAGE_SIZE)
    assert calls.count("_FACT_COUNT") == 1
    assert calls.count("_ANALYSIS_VERSION") == 1
    assert calls.count("_PERIOD") == 1
    assert calls.count("_POLICY") == 1
    assert calls.count("_FACT") == 0
    assert calls.count("_FACT_IDS") == 0
    assert len(calls) < LEGACY_FETCHES_PER_FACT * count // 100


def test_scan_does_not_grow_with_the_number_of_facts() -> None:
    """행이 열 배가 되어도 왕복은 묶음 수만큼만 는다."""
    small = _audit_repository(_paged_rows(100))
    large = _audit_repository(_paged_rows(1000))
    _aggregation_outcome(small)
    _aggregation_outcome(large)

    assert len(large.unit.calls) - len(small.unit.calls) == 1


def test_full_scan_records_that_nothing_remains() -> None:
    """전수로 훑은 실행은 남은 행이 0 이라고 적는다."""
    outcome = _aggregation_outcome(_audit_repository(_paged_rows(10)))

    assert outcome.verdict is CheckVerdict.PASS
    assert outcome.detail == {"fact_count": 10, "remaining_count": 0}


# ============================================================ 한도와 진행
def test_limit_scans_the_head_and_is_not_a_pass() -> None:
    """한도를 건 실행은 위반이 없어도 통과가 아니다."""
    outcome = _aggregation_outcome(_audit_repository(_paged_rows(10)), limit=4)

    assert outcome.verdict is CheckVerdict.SKIP
    assert outcome.reason_code == REASON_PARTIAL_SCAN
    assert outcome.detail is not None
    assert outcome.detail["fact_count"] == 4
    assert outcome.detail["remaining_count"] == 6
    assert outcome.detail["total_count"] == 10


def test_limit_larger_than_the_target_is_a_full_scan() -> None:
    outcome = _aggregation_outcome(_audit_repository(_paged_rows(3)), limit=100)

    assert outcome.verdict is CheckVerdict.PASS
    assert outcome.detail == {"fact_count": 3, "remaining_count": 0}


def test_limit_does_not_read_more_rows_than_it_checks() -> None:
    """한도가 묶음보다 작으면 묶음도 그만큼만 읽는다."""
    reader = FakeReader({f"fact_{i:03d}": _audit() for i in range(10)})
    numerical_consistency_check(reader, limit=3)(
        CheckContext(
            run=_run_context(),
            target_type=TARGET_AGGREGATION,
            target_id="an_001",
        )
    )

    assert reader.pages == [3]


def test_limited_run_still_fails_on_a_violation() -> None:
    """한도를 걸어도 찾은 위반은 그대로 실패다."""
    reader = FakeReader(
        {
            "fact_1": _audit(fact=_fact(numerator=3, value=0.75)),
            "fact_2": _audit(),
        }
    )
    outcome = numerical_consistency_check(reader, limit=1)(
        CheckContext(
            run=_run_context(),
            target_type=TARGET_AGGREGATION,
            target_id="an_001",
        )
    )

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.detail is not None
    assert outcome.detail["remaining_count"] == 1


def test_aggregation_reads_rows_in_pages_not_one_by_one() -> None:
    """식별자를 모은 뒤 행을 하나씩 읽는 경로를 쓰지 않는다."""
    reader = FakeReader({f"fact_{i:03d}": _audit() for i in range(3)})
    _aggregation_outcome(reader)

    assert reader.calls == ["fact_count", "fact_audit_page"]


def test_progress_is_reported_for_every_page() -> None:
    """묶음마다 진행 상황을 알린다. 화면이 비어 있으면 멈춘 실행과 같아 보인다."""
    seen: list[tuple[int, int]] = []
    reader = FakeReader({f"fact_{i:03d}": _audit() for i in range(3)})
    def progress(done: int, total: int) -> None:
        seen.append((done, total))

    numerical_consistency_check(reader, None, progress)(
        CheckContext(
            run=_run_context(),
            target_type=TARGET_AGGREGATION,
            target_id="an_001",
        )
    )

    assert seen == [(3, 3)]


def test_row_without_reference_rows_is_not_silently_dropped() -> None:
    """기준 행을 찾지 못한 행은 통과로 세지 않는다."""
    reader = FakeReader({"fact_1": _audit()}, missing=["fact_2"])
    outcome = _aggregation_outcome(reader)

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_TARGET_NOT_FOUND
    assert outcome.detail is not None
    assert outcome.detail["fact_ids"] == ["fact_2"]
    assert outcome.detail["fact_count"] == 2
