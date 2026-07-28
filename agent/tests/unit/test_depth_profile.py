"""역량별 깊이 프로파일 검증.

규칙은 docs/statistics-model.md 9장, 입력 지표는 docs/metric-spec.md 3.3, 저장 자리는
docs/erd.md 10.6 에서 온다. 저장소를 대역으로 대체하고 합치는 규칙, 기대 깊이 선택,
대상군 분리, 표본 미달 처리, 증분 재실행, 냉시작만 검사한다. 데이터베이스와 외부 호출은
하지 않는다.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date
from typing import Any

import pytest

from careersignal.contracts import RunContext, StopReason
from careersignal.domain.depth import DepthLevel
from careersignal.domain.permissions import Component, can_write
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.segment import EntrySegment
from careersignal.metrics.depth_profile import (
    DEPTH_MEASURES,
    EXPECTED_DEPTH_TAIL_SHARE,
    NO_ACTIVE_TAXONOMY,
    TAXONOMY_MISMATCH,
    CapabilityDepthProfiles,
    DimensionDepth,
    confidence_of,
    expected_depth,
    merge_dimensions,
    profile_identifier,
    profile_key,
    tail_share,
)
from careersignal.metrics.expansion import Envelope
from careersignal.repositories.base import INSERT_BATCH_SIZE
from careersignal.repositories.profiles import DepthProfileRepository

JOB_ROLE_ID = "backend"
TAXONOMY_VERSION_ID = "tx_backend_v1"
ANALYSIS_VERSION = "an_test"
DATASET_VERSION = "ds_test"
PERIOD = "y2026"
CAPABILITY = "cap_persistence"
AS_OF = date(2026, 7, 1)

PROFILE_COLUMNS = {
    "profile_id",
    "capability_id",
    "taxonomy_version_id",
    "scope_level",
    "scope_id",
    "entry_segment",
    "period_id",
    "depth_distribution",
    "expected_depth",
    "sample_size",
    "evidence_support",
    "confidence",
    "analysis_version",
}
"""docs/erd.md 10.6 의 컬럼. `created_at` 은 기본값이 채운다."""

ACTIVE_TAXONOMY: dict[str, Any] = {
    "taxonomy_version_id": TAXONOMY_VERSION_ID,
    "taxonomy_id": "tax_backend",
    "version_number": 1,
    "taxonomy_policy_version": "tp_v1",
}
"""`Repository.active_taxonomy_version` 이 돌려주는 행. 대역의 기본값이다."""

_UNSET = object()
"""인자를 주지 않은 것과 None 을 준 것을 가른다. None 은 활성 버전이 없다는 뜻이다."""


def _policy(
    minimum_n: int = 5,
    minimum_n_comparison: int = 10,
    suppression_policy: str = "label_low_confidence",
) -> dict[str, Any]:
    """시드의 `metric_policy_versions` v1 값과 같다(docs/metric-spec.md 6장)."""
    return {
        "metric_policy_version": "mp_v1_depth",
        "metric_family": "depth_distribution",
        "formula_version": "v1",
        "minimum_n": minimum_n,
        "minimum_n_comparison": max(minimum_n, minimum_n_comparison),
        "suppression_policy": suppression_policy,
        "uncertainty_method": "wilson_95",
    }


def _facts(
    dimension_id: str,
    counts: tuple[int, int, int],
    entry_segment: EntrySegment = EntrySegment.ALL,
    scope_level: ScopeLevel = ScopeLevel.OVERALL,
    scope_id: str = JOB_ROLE_ID,
    period_id: str = PERIOD,
) -> list[dict[str, Any]]:
    """차원 하나의 `depth_distribution` 세 행(docs/erd.md 10.5)."""
    denominator = sum(counts)
    return [
        {
            "scope_level": str(scope_level),
            "scope_id": scope_id,
            "entry_segment": str(entry_segment),
            "period_id": period_id,
            "dimension_id": dimension_id,
            "measure": measure,
            "numerator": numerator,
            "denominator": denominator,
        }
        for measure, numerator in zip(DEPTH_MEASURES, counts)
    ]


def _context(
    scope_level: ScopeLevel = ScopeLevel.OVERALL, scope_id: str | None = None
) -> RunContext:
    return RunContext(
        agent_run_id="run_profiles",
        analysis_version=ANALYSIS_VERSION,
        dataset_version=DATASET_VERSION,
        taxonomy_version_id=TAXONOMY_VERSION_ID,
        job_role_id=JOB_ROLE_ID,
        scope_level=scope_level,
        scope_id=scope_id,
        as_of_date=AS_OF,
    )


class FakeProfiles:
    """프로파일 저장소의 대역. SQL 을 실행하지 않는다.

    `capability_depth_profiles_scope_unique` 를 키 집합으로 흉내 낸다. 실행이 같은
    프로파일을 두 번 넣으려 하면 여기서 걸린다.
    """

    def __init__(
        self,
        capabilities: list[dict[str, Any]] | None = None,
        links: list[dict[str, Any]] | None = None,
        facts: list[dict[str, Any]] | None = None,
        policy: dict[str, Any] | None = _UNSET,  # type: ignore[assignment]
        active: Any = _UNSET,
    ) -> None:
        self._capabilities = (
            capabilities
            if capabilities is not None
            else [{"capability_id": CAPABILITY, "canonical_label": "영속성"}]
        )
        self._links = (
            links
            if links is not None
            else [{"capability_id": CAPABILITY, "dimension_id": "dim_a"}]
        )
        self._facts = facts if facts is not None else _facts("dim_a", (3, 2, 1))
        self._policy = _policy() if policy is _UNSET else policy
        self._active = ACTIVE_TAXONOMY if active is _UNSET else active
        self.rows: list[dict[str, Any]] = []
        self.queried_periods: list[Any] = []
        self.inserts: list[int] = []
        """저장 문장 하나가 실은 행 수. 길이가 곧 저장에 든 왕복 수다."""

    # -------------------------------------------------------- 읽기
    def active_taxonomy_version(self, job_role_id: str) -> dict[str, Any] | None:
        return self._active

    def capabilities(self, job_role_id: str) -> list[dict[str, Any]]:
        return list(self._capabilities)

    def capability_dimension_links(
        self, taxonomy_version_id: str
    ) -> list[dict[str, Any]]:
        return list(self._links)

    def depth_policy(self, as_of_date: date) -> dict[str, Any] | None:
        return dict(self._policy) if self._policy is not None else None

    def depth_facts(
        self, analysis_version: str, period_ids: Any = None
    ) -> list[dict[str, Any]]:
        self.queried_periods.append(period_ids)
        return list(self._facts)

    def existing_profile_keys(self, analysis_version: str) -> set[tuple[str, ...]]:
        return {
            (
                row["capability_id"],
                row["scope_level"],
                row["scope_id"],
                row["entry_segment"],
                row["period_id"],
            )
            for row in self.rows
            if row["analysis_version"] == analysis_version
        }

    # -------------------------------------------------------- 쓰기
    def add_profile(self, values: dict[str, Any]) -> None:
        self.inserts.append(1)
        key = _profile_key_of(values)
        if key in self.existing_profile_keys(values["analysis_version"]):
            raise AssertionError(f"같은 프로파일을 두 번 넣었다: {key}")
        self.rows.append(dict(values))

    def add_profiles(self, rows: Sequence[dict[str, Any]]) -> None:
        """묶음 하나가 문장 하나다. 한 행이 걸리면 묶음 전체가 남지 않는다."""
        self.inserts.append(len(rows))
        staged = list(self.rows)
        seen = self.existing_profile_keys(rows[0]["analysis_version"])
        for values in rows:
            key = _profile_key_of(values)
            if key in seen:
                raise AssertionError(f"같은 프로파일을 두 번 넣었다: {key}")
            seen.add(key)
            staged.append(dict(values))
        self.rows = staged


def _profile_key_of(values: dict[str, Any]) -> tuple[str, ...]:
    return (
        values["capability_id"],
        values["scope_level"],
        values["scope_id"],
        values["entry_segment"],
        values["period_id"],
    )


def _run(fake: FakeProfiles, context: RunContext | None = None) -> Any:
    profiles = CapabilityDepthProfiles(fake)  # type: ignore[arg-type]
    return profiles.run(context or _context())


# ------------------------------------------------------------ 합치는 규칙
def test_merge_pools_counts_weighted_by_sample() -> None:
    """차원별 비율을 분모로 가중해 합친다.

    분자와 분모를 각각 더한 뒤 나눈 값이며, 공고 두 건에서 관측된 차원이 이백 건에서
    관측된 차원과 같은 무게를 갖지 않는다.
    """
    merged = merge_dimensions(
        [
            DimensionDepth(
                dimension_id="dim_a",
                counts={"foundation": 8, "application": 2, "tradeoff": 0},
                denominator=10,
            ),
            DimensionDepth(
                dimension_id="dim_b",
                counts={"foundation": 0, "application": 0, "tradeoff": 2},
                denominator=2,
            ),
        ]
    )
    assert merged is not None
    assert merged.pooled == {"foundation": 8, "application": 2, "tradeoff": 2}
    assert merged.pooled_denominator == 12
    assert merged.distribution["foundation"] == pytest.approx(8 / 12)
    assert sum(merged.distribution.values()) == pytest.approx(1.0)


def test_merge_is_order_independent() -> None:
    """차원 순서가 달라도 같은 결과다. 재실행이 값을 바꾸지 않는다."""
    depths = [
        DimensionDepth(
            dimension_id="dim_a",
            counts={"foundation": 3, "application": 2, "tradeoff": 1},
            denominator=6,
        ),
        DimensionDepth(
            dimension_id="dim_b",
            counts={"foundation": 1, "application": 1, "tradeoff": 2},
            denominator=4,
        ),
    ]
    assert merge_dimensions(depths) == merge_dimensions(list(reversed(depths)))


def test_merge_sample_size_is_largest_denominator() -> None:
    """표본 수는 분모의 합이 아니라 최댓값이다.

    한 공고가 같은 역량의 두 차원을 함께 말하면 합은 그 공고를 두 번 센다. 중복 제거
    단위가 `posting_version_id` 이므로(docs/metric-spec.md 2.2) 합집합의 하한을 쓴다.
    """
    merged = merge_dimensions(
        [
            DimensionDepth(
                dimension_id="dim_a",
                counts={"foundation": 6, "application": 3, "tradeoff": 1},
                denominator=10,
            ),
            DimensionDepth(
                dimension_id="dim_b",
                counts={"foundation": 2, "application": 1, "tradeoff": 1},
                denominator=4,
            ),
        ]
    )
    assert merged is not None
    assert merged.sample_size == 10


def test_merge_skips_empty_dimensions() -> None:
    """분모가 0 인 차원은 빼고, 모두 0 이면 합칠 것이 없다."""
    empty = DimensionDepth(
        dimension_id="dim_z",
        counts={"foundation": 0, "application": 0, "tradeoff": 0},
        denominator=0,
    )
    assert merge_dimensions([empty]) is None
    merged = merge_dimensions(
        [
            empty,
            DimensionDepth(
                dimension_id="dim_a",
                counts={"foundation": 1, "application": 0, "tradeoff": 0},
                denominator=1,
            ),
        ]
    )
    assert merged is not None
    assert merged.dimension_ids == ("dim_a",)


def test_dimension_depth_requires_complete_measures() -> None:
    """등급 세 measure 의 분자 합이 분모와 같아야 한다(docs/metric-spec.md 3.3)."""
    with pytest.raises(ValueError):
        DimensionDepth(
            dimension_id="dim_a",
            counts={"foundation": 1, "application": 1},
            denominator=2,
        )
    with pytest.raises(ValueError):
        DimensionDepth(
            dimension_id="dim_a",
            counts={"foundation": 1, "application": 1, "tradeoff": 1},
            denominator=4,
        )


# ------------------------------------------------------------ 기대 깊이
def _depth(counts: tuple[int, int, int]) -> Any:
    merged = merge_dimensions(
        [
            DimensionDepth(
                dimension_id="dim_a",
                counts=dict(zip(DEPTH_MEASURES, counts)),
                denominator=sum(counts),
            )
        ]
    )
    assert merged is not None
    return merged


def test_expected_depth_is_deepest_level_reaching_threshold() -> None:
    """가장 깊은 등급부터 누적해 기준에 처음 닿는 등급을 고른다."""
    assert expected_depth(_depth((0, 0, 6))) is DepthLevel.TRADEOFF
    assert expected_depth(_depth((2, 4, 4))) is DepthLevel.APPLICATION
    assert expected_depth(_depth((6, 2, 2))) is DepthLevel.FOUNDATION


def test_expected_depth_ignores_single_deep_posting() -> None:
    """공고 한 건의 `tradeoff` 표기가 기대 깊이를 올리지 않는다."""
    assert expected_depth(_depth((9, 0, 1))) is DepthLevel.FOUNDATION


def test_expected_depth_prefers_order_over_frequency() -> None:
    """최빈 등급이 아니라 순서를 본다.

    `foundation` 40%·`application` 30%·`tradeoff` 30% 는 최빈이 `foundation` 이지만
    60% 가 `application` 이상을 요구하므로 준비 기준은 `application` 이다.
    """
    assert expected_depth(_depth((4, 3, 3))) is DepthLevel.APPLICATION


def test_expected_depth_threshold_boundary_is_inclusive() -> None:
    """누적 비율이 기준과 같으면 그 등급을 고른다."""
    depth = _depth((5, 0, 5))
    assert tail_share(depth.pooled, depth.pooled_denominator, DepthLevel.TRADEOFF) == (
        pytest.approx(EXPECTED_DEPTH_TAIL_SHARE)
    )
    assert expected_depth(depth) is DepthLevel.TRADEOFF


def test_expected_depth_always_returns_a_level() -> None:
    """`expected_depth` 가 NOT NULL 이므로 어떤 분포에서도 하나를 고른다."""
    for counts in ((1, 0, 0), (0, 1, 0), (0, 0, 1), (1, 1, 1)):
        assert expected_depth(_depth(counts)) in tuple(DepthLevel)


def test_confidence_is_tail_share_of_chosen_level() -> None:
    """`confidence` 는 고른 등급의 누적 비율이다."""
    depth = _depth((2, 4, 4))
    assert confidence_of(depth, DepthLevel.APPLICATION) == pytest.approx(0.8)


# ------------------------------------------------------------ 실행
def test_no_capability_ends_without_profiles() -> None:
    """역량이 하나도 없으면 만들 프로파일이 없다. 지표 행도 읽지 않는다."""
    fake = FakeProfiles(capabilities=[])
    outcome = _run(fake)
    assert outcome.capability_count == 0
    assert outcome.stored_profiles == 0
    assert outcome.errors == ()
    assert outcome.stop_reason is StopReason.FRONTIER_EXHAUSTED
    assert fake.queried_periods == []
    assert fake.rows == []


def test_capability_without_link_is_recorded_as_missing() -> None:
    """연결된 차원이 없는 역량은 사유를 남기고 넘어간다."""
    fake = FakeProfiles(links=[])
    outcome = _run(fake)
    assert outcome.stored_profiles == 0
    assert [target for target, _ in outcome.missing_input] == [CAPABILITY]


def test_profile_row_matches_erd_columns() -> None:
    """저장 행의 컬럼이 docs/erd.md 10.6 과 같다."""
    fake = FakeProfiles()
    outcome = _run(fake)
    assert outcome.stored_profiles == 1
    row = fake.rows[0]
    assert set(row) == PROFILE_COLUMNS
    assert row["expected_depth"] in {"foundation", "application", "tradeoff"}
    assert set(row["depth_distribution"]) == set(DEPTH_MEASURES)
    assert row["taxonomy_version_id"] == TAXONOMY_VERSION_ID
    assert row["evidence_support"]["dimension_ids"] == ["dim_a"]
    assert 0.0 <= row["confidence"] <= 1.0


def test_multiple_dimensions_produce_one_profile() -> None:
    """한 역량에 차원이 여럿이어도 프로파일은 하나다(docs/erd.md 10.6)."""
    fake = FakeProfiles(
        links=[
            {"capability_id": CAPABILITY, "dimension_id": "dim_a"},
            {"capability_id": CAPABILITY, "dimension_id": "dim_b"},
        ],
        facts=[*_facts("dim_a", (8, 2, 0)), *_facts("dim_b", (0, 0, 2))],
    )
    outcome = _run(fake)
    assert outcome.stored_profiles == 1
    row = fake.rows[0]
    assert row["evidence_support"]["dimension_ids"] == ["dim_a", "dim_b"]
    assert row["evidence_support"]["pooled_denominator"] == 12
    assert row["sample_size"] == 10


def test_profiles_are_separate_per_entry_segment() -> None:
    """대상군마다 프로파일이 따로 만들어진다.

    기대 깊이는 대상군에 따라 다르므로 신입·주니어와 경력의 값을 한 행에 담지 않는다
    (docs/erd.md 10.6, docs/statistics-model.md 5.3).
    """
    fake = FakeProfiles(
        facts=[
            *_facts("dim_a", (8, 2, 0), entry_segment=EntrySegment.ENTRY_JUNIOR),
            *_facts("dim_a", (0, 2, 8), entry_segment=EntrySegment.EXPERIENCED),
        ]
    )
    outcome = _run(fake)
    assert outcome.stored_profiles == 2
    by_segment = {row["entry_segment"]: row["expected_depth"] for row in fake.rows}
    assert by_segment == {
        "entry_junior": "foundation",
        "experienced": "tradeoff",
    }


def test_profiles_are_separate_per_scope_and_period() -> None:
    """범위와 기간도 프로파일을 가른다."""
    fake = FakeProfiles(
        facts=[
            *_facts("dim_a", (3, 2, 1)),
            *_facts(
                "dim_a",
                (1, 2, 3),
                scope_level=ScopeLevel.CLUSTER,
                scope_id="cluster_platform",
            ),
            *_facts("dim_a", (2, 2, 2), period_id="y2025"),
        ]
    )
    outcome = _run(fake)
    assert outcome.stored_profiles == 3
    assert len({row["profile_id"] for row in fake.rows}) == 3


def test_low_confidence_profile_is_stored_when_policy_labels() -> None:
    """억제 정책이 표시만 하면 표본 미달 프로파일도 남는다(docs/metric-spec.md 2.4)."""
    fake = FakeProfiles(
        policy=_policy(minimum_n=100, suppression_policy="label_low_confidence"),
        facts=_facts("dim_a", (3, 2, 1)),
    )
    outcome = _run(fake)
    assert outcome.stored_profiles == 1
    assert outcome.suppressed_profiles == 0
    assert fake.rows[0]["evidence_support"]["sample_status"] == "low_confidence"


def test_hidden_profile_is_not_stored() -> None:
    """억제 정책이 값을 숨기면 프로파일을 만들지 않는다.

    `capability_depth_profiles` 에는 `sample_status` 컬럼이 없고 `expected_depth` 가
    NOT NULL 이므로 값을 비운 행으로 남길 자리가 없다.
    """
    fake = FakeProfiles(
        policy=_policy(minimum_n=100, suppression_policy="hide"),
        facts=_facts("dim_a", (3, 2, 1)),
    )
    outcome = _run(fake)
    assert outcome.stored_profiles == 0
    assert outcome.suppressed_profiles == 1
    assert fake.rows == []


def test_rerun_skips_existing_profiles() -> None:
    """같은 분석 버전의 같은 프로파일을 다시 만들지 않는다."""
    fake = FakeProfiles()
    first = _run(fake)
    second = _run(fake)
    assert first.stored_profiles == 1
    assert second.stored_profiles == 0
    assert second.skipped_profiles == 1
    assert len(fake.rows) == 1


def test_missing_policy_is_an_error() -> None:
    """정책 행이 없으면 임계값을 지어내지 않고 멈춘다."""
    fake = FakeProfiles(policy=None)
    outcome = _run(fake)
    assert outcome.stored_profiles == 0
    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE


def test_incomplete_measures_are_not_merged() -> None:
    """등급 하나가 빠진 차원은 프로파일의 입력이 되지 않는다."""
    facts = [row for row in _facts("dim_a", (3, 2, 1)) if row["measure"] != "tradeoff"]
    fake = FakeProfiles(facts=facts)
    outcome = _run(fake)
    assert outcome.stored_profiles == 0
    assert [reason for _, reason in outcome.missing_input]


def test_halts_without_active_taxonomy() -> None:
    """활성 분류체계 버전이 없으면 실행 전제가 깨진 것으로 남긴다."""
    outcome = _run(FakeProfiles(active=None))
    assert outcome.halted
    assert outcome.halted_reason == NO_ACTIVE_TAXONOMY


def test_halts_on_taxonomy_mismatch() -> None:
    """봉투의 분류체계 버전이 활성 버전과 다르면 섞어 합치지 않는다."""
    fake = FakeProfiles(active={**ACTIVE_TAXONOMY, "taxonomy_version_id": "tx_other"})
    outcome = _run(fake)
    assert outcome.halted
    assert outcome.halted_reason == TAXONOMY_MISMATCH


# ------------------------------------------------------------ 식별자와 권한
def test_profile_identifier_is_deterministic() -> None:
    """같은 분석 버전의 같은 키는 같은 식별자다."""
    envelope = Envelope(
        scope_level=ScopeLevel.OVERALL,
        scope_id=JOB_ROLE_ID,
        entry_segment=EntrySegment.ALL,
        period_id=PERIOD,
    )
    key = profile_key(CAPABILITY, envelope)
    assert profile_identifier(ANALYSIS_VERSION, key) == profile_identifier(
        ANALYSIS_VERSION, key
    )
    assert profile_identifier("an_other", key) != profile_identifier(
        ANALYSIS_VERSION, key
    )


def test_repository_writes_as_aggregation_component() -> None:
    """쓰기 주체는 집계 파이프라인이다(docs/permission-matrix.md 3장)."""
    assert DepthProfileRepository.component is Component.PIPE_AGGREGATE
    assert can_write(Component.PIPE_AGGREGATE, "capability_depth_profiles")
    assert not can_write(Component.AGENT_STATS, "capability_depth_profiles")


# ------------------------------------------------------------ 한도와 이어달리기
def test_limit_caps_the_profiles_made_in_one_run() -> None:
    """한도는 이번 실행이 만들 프로파일 수다."""
    fake = FakeProfiles(
        capabilities=[
            {"capability_id": "cap_a", "canonical_label": "가"},
            {"capability_id": "cap_b", "canonical_label": "나"},
        ],
        links=[
            {"capability_id": "cap_a", "dimension_id": "dim_a"},
            {"capability_id": "cap_b", "dimension_id": "dim_a"},
        ],
    )
    outcome = CapabilityDepthProfiles(fake).run(_context(), limit=1)  # type: ignore[arg-type]
    assert outcome.stored_profiles == 1
    assert outcome.limit_reached


def test_limited_profile_runs_move_forward_each_time() -> None:
    """이어 돌리면 남은 것부터 집는다. 같은 프로파일을 두 번 만들지 않는다."""
    fake = FakeProfiles(
        capabilities=[
            {"capability_id": "cap_a", "canonical_label": "가"},
            {"capability_id": "cap_b", "canonical_label": "나"},
        ],
        links=[
            {"capability_id": "cap_a", "dimension_id": "dim_a"},
            {"capability_id": "cap_b", "dimension_id": "dim_a"},
        ],
    )
    CapabilityDepthProfiles(fake).run(_context(), limit=1)  # type: ignore[arg-type]
    second = CapabilityDepthProfiles(fake).run(_context(), limit=1)  # type: ignore[arg-type]
    assert second.skipped_profiles == 1
    assert second.stored_profiles == 1
    assert len(fake.rows) == 2


def test_a_profile_run_without_a_limit_reports_no_limit() -> None:
    outcome = _run(FakeProfiles())
    assert not outcome.limit_reached


# ============================================================ 왕복 수
CAPABILITY_SCALE = 30
PROFILE_ENVELOPE_SCALE = 56
"""검사가 보는 규모.

봉투 56개는 13-1 이 찍은 수와 같다. 역량 수는 프로파일 수가 묶음 크기를 여러 번 넘도록
잡는다. 30 × 56 이면 1,680개이며 하나씩 넣던 때에는 왕복이 1,680번이었다.
"""


def _scaled_profiles() -> FakeProfiles:
    """역량 30개 × 봉투 56개의 대역."""
    capabilities = [
        {"capability_id": f"cap_{index:02d}", "canonical_label": f"역량{index}"}
        for index in range(CAPABILITY_SCALE)
    ]
    links = [
        {"capability_id": row["capability_id"], "dimension_id": "dim_a"}
        for row in capabilities
    ]
    facts: list[dict[str, Any]] = []
    for scope_level, scope_id in (
        (ScopeLevel.OVERALL, JOB_ROLE_ID),
        *((ScopeLevel.CLUSTER, f"cluster_{index}") for index in range(6)),
    ):
        for segment in EntrySegment:
            for period_id in ("y2025", "y2026"):
                facts.extend(
                    _facts(
                        "dim_a",
                        (30, 20, 10),
                        entry_segment=segment,
                        scope_level=scope_level,
                        scope_id=scope_id,
                        period_id=period_id,
                    )
                )
    return FakeProfiles(capabilities=capabilities, links=links, facts=facts)


def test_profiles_are_stored_in_batches() -> None:
    """프로파일마다 INSERT 하나가 아니라 묶음마다 하나다.

    회귀를 막는 자리다. 하나씩 넣는 코드가 다시 들어오면 문장 수가 프로파일 수로 튄다.
    """
    fake = _scaled_profiles()
    outcome = CapabilityDepthProfiles(fake).run(_context())  # type: ignore[arg-type]

    assert outcome.envelope_count == PROFILE_ENVELOPE_SCALE
    assert outcome.stored_profiles == CAPABILITY_SCALE * PROFILE_ENVELOPE_SCALE
    assert not outcome.errors
    assert sum(fake.inserts) == outcome.stored_profiles
    assert max(fake.inserts) <= INSERT_BATCH_SIZE
    lower_bound = -(-outcome.stored_profiles // INSERT_BATCH_SIZE)
    assert lower_bound <= len(fake.inserts) <= lower_bound + 1
    assert len(fake.inserts) * 100 < outcome.stored_profiles


def test_depth_facts_are_read_in_one_query() -> None:
    """입력은 한 조회로 읽는다. 봉투마다 다시 읽지 않는다."""
    fake = _scaled_profiles()
    CapabilityDepthProfiles(fake).run(_context())  # type: ignore[arg-type]
    assert len(fake.queried_periods) == 1


def test_batched_profiles_keep_the_same_values() -> None:
    """묶어 저장해도 프로파일의 분포·표본·기대 깊이가 같다."""
    fake = _scaled_profiles()
    CapabilityDepthProfiles(fake).run(_context())  # type: ignore[arg-type]

    merged = merge_dimensions(
        [DimensionDepth(
            dimension_id="dim_a",
            counts=dict(zip(DEPTH_MEASURES, (30, 20, 10))),
            denominator=60,
        )]
    )
    assert merged is not None
    level = expected_depth(merged)
    for row in fake.rows:
        assert row["depth_distribution"] == merged.distribution
        assert row["sample_size"] == merged.sample_size
        assert row["expected_depth"] == str(level)


# ============================================================ 진행 표시
def test_progress_reports_every_capability_and_envelope() -> None:
    """역량 × 봉투 하나마다 알린다. 간격을 정하는 것은 받는 쪽의 몫이다."""
    fake = _scaled_profiles()
    seen: list[tuple[int, int]] = []
    CapabilityDepthProfiles(fake).run(  # type: ignore[arg-type]
        _context(), progress=lambda done, total: seen.append((done, total))
    )
    assert len(seen) == CAPABILITY_SCALE * PROFILE_ENVELOPE_SCALE
    assert seen[0] == (1, len(seen))
    assert seen[-1] == (len(seen), len(seen))
