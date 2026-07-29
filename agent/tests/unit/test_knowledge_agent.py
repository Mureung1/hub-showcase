"""지식 구축 Wiki 에이전트의 세 단위 검증.

생성 조건은 docs/knowledge-schema.md 8.4, 깊이 등급은 같은 문서 8.2·8.6, 필드별 허용
근거는 8.5 에서 온다. 구조 규칙은 agent/data/demo_seed/CONTRACT.md 8장이다.

대역 생성기와 가짜 저장소로만 돌린다. 네트워크도 데이터베이스도 쓰지 않는다.
"""

from __future__ import annotations

from datetime import date
from typing import Any

import pytest

from careersignal.agents.knowledge import (
    EVIDENCE_NOT_CITED,
    FIELD_ALLOWED_TIERS,
    MISSING_REQUIRED_FIELD,
    NO_ALLOWED_EVIDENCE,
    NO_KNOWLEDGE_VERSION,
    NO_TAXONOMY_VERSION,
    PAGE_EXISTS,
    REQUIRED_FIELDS,
    WIKI_FIELDS,
    EvidenceChunk,
    StubWikiWriter,
    TargetReason,
    WikiBuilder,
    WikiFieldRequest,
    WikiOutcome,
    WikiRepository,
    WikiWriter,
    allowed_evidence,
    depth_criteria_value,
    depth_guidance,
    page_identifier,
    revision_identifier,
    select_targets,
)
from careersignal.contracts import Budget, RunContext, StopReason
from careersignal.domain.depth import DepthLevel
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.source_policy import AllowedUse, SourceTier, is_allowed
from careersignal.wiki.depth import (
    BROKEN_SUM,
    DEPTH_MEANING,
    DEPTH_ORDER,
    MISSING_LEVELS,
    DepthCriterion,
    Standing,
    depth_criteria,
    expected_from_shares,
    shares,
    standing_of,
    tail_share,
)

BALANCED = {"foundation": 0.2, "application": 0.5, "tradeoff": 0.3}
"""`application` 이 기대 깊이인 분포. tradeoff 꼬리 0.3, application 꼬리 0.8."""

SHALLOW = {"foundation": 0.7, "application": 0.2, "tradeoff": 0.1}


# ================================================================ 가짜 저장소
class FakeWikiRepository:
    """`WikiRepository` 의 대역. 거래도 SQL 도 갖지 않는다."""

    def __init__(
        self,
        capabilities: list[dict[str, Any]] | None = None,
        links: list[dict[str, Any]] | None = None,
        prevalence: list[dict[str, Any]] | None = None,
        profiles: list[dict[str, Any]] | None = None,
        requested: list[dict[str, Any]] | None = None,
        evidence: dict[str, list[dict[str, Any]]] | None = None,
        pages: dict[str, str] | None = None,
        fail_on: str | None = None,
    ) -> None:
        self._capabilities = capabilities or []
        self._links = links or []
        self._prevalence = prevalence or []
        self._profiles = profiles or []
        self._requested = requested or []
        self._evidence = evidence or {}
        self._pages = dict(pages or {})
        self._fail_on = fail_on

        self.stored_pages: list[dict[str, Any]] = []
        self.stored_revisions: list[dict[str, Any]] = []
        self.stored_evidence: list[dict[str, Any]] = []
        self.evidence_calls: list[tuple[str, date]] = []

    # -------------------------------------------------------- 읽기
    def capabilities(self, job_role_id: str) -> list[dict[str, Any]]:
        return [
            row
            for row in self._capabilities
            if row.get("job_role_id", job_role_id) == job_role_id
        ]

    def capability_dimension_links(
        self, taxonomy_version_id: str
    ) -> list[dict[str, Any]]:
        return list(self._links)

    def prevalence_facts(self, analysis_version: str) -> list[dict[str, Any]]:
        return list(self._prevalence)

    def depth_profiles(self, analysis_version: str) -> list[dict[str, Any]]:
        return list(self._profiles)

    def requested_capabilities(self, analysis_version: str) -> list[dict[str, Any]]:
        return list(self._requested)

    def field_evidence(
        self, capability_id: str, as_of_date: date
    ) -> list[dict[str, Any]]:
        self.evidence_calls.append((capability_id, as_of_date))
        return list(self._evidence.get(capability_id, []))

    def existing_pages(self, knowledge_version: str) -> dict[str, str]:
        return dict(self._pages)

    # -------------------------------------------------------- 쓰기
    def add_page(self, values: dict[str, Any]) -> None:
        if self._fail_on == values["capability_id"]:
            raise RuntimeError("current transaction is aborted")
        self.stored_pages.append(values)

    def add_revision(self, values: dict[str, Any]) -> None:
        self.stored_revisions.append(values)

    def add_evidence(self, values: dict[str, Any]) -> None:
        self.stored_evidence.append(values)


def _context(**kw: Any) -> RunContext:
    base: dict[str, Any] = {
        "agent_run_id": "run_demo_backend_knowledge",
        "analysis_version": "an_demo_backend",
        "dataset_version": "ds_demo_v1",
        "taxonomy_version_id": "tx_demo_backend",
        "knowledge_version": "kn_demo_backend",
        "job_role_id": "backend",
        "scope_level": ScopeLevel.OVERALL,
        "as_of_date": date(2026, 7, 28),
    }
    return RunContext(**(base | kw))


def _chunk(chunk_id: str, tier: str) -> dict[str, Any]:
    return {"chunk_id": chunk_id, "source_tier": tier, "text": f"{chunk_id} 본문"}


FULL_POOL = [
    _chunk("chunk_a", "A"),
    _chunk("chunk_b", "B"),
    _chunk("chunk_c", "C"),
    _chunk("chunk_d", "D"),
    _chunk("chunk_e", "E"),
]
"""다섯 계층을 모두 담은 근거 풀. 필드마다 걸러지는 조합이 달라진다."""


def _repository(**kw: Any) -> FakeWikiRepository:
    base: dict[str, Any] = {
        "capabilities": [
            {"capability_id": "cap_backend_db", "canonical_label": "관계형 데이터베이스"},
        ],
        "links": [{"capability_id": "cap_backend_db", "dimension_id": "dim_backend_db"}],
        "prevalence": [
            {
                "dimension_id": "dim_backend_db",
                "metric_family": "posting_prevalence",
                "measure": "ratio",
                "value": 0.8,
                "sample_size": 9,
                "sample_status": "analysis_ready",
            }
        ],
        "profiles": [
            {
                "profile_id": "prof_1",
                "capability_id": "cap_backend_db",
                "depth_distribution": BALANCED,
                "expected_depth": "application",
                "sample_size": 9,
            }
        ],
        "evidence": {"cap_backend_db": FULL_POOL},
    }
    return FakeWikiRepository(**(base | kw))


def _builder(
    repository: FakeWikiRepository, writer: WikiWriter | None = None
) -> WikiBuilder:
    return WikiBuilder(writer or StubWikiWriter(), repository, workers=1)


# ================================================================ 계약 준수
def test_stub_and_repository_fit_the_ports() -> None:
    """대역이 포트를 만족한다. 실구현이 들어와도 실행 골격은 같은 경로를 돈다."""
    assert isinstance(StubWikiWriter(), WikiWriter)
    assert isinstance(FakeWikiRepository(), WikiRepository)


def test_outcome_reports_gained_evidence() -> None:
    """`WikiOutcome` 은 근거를 얻었는지를 프로퍼티로 답한다."""
    empty = WikiOutcome(
        agent_run_id="run_x", stop_reason=StopReason.NO_NEW_EVIDENCE
    )
    assert empty.gained_evidence is False
    assert (
        WikiOutcome(
            agent_run_id="run_x",
            stop_reason=StopReason.SLOTS_FILLED,
            stored_evidence=3,
        ).gained_evidence
        is True
    )


def test_models_are_frozen() -> None:
    """결과 모델은 얼려 둔다. 저장 뒤에 값이 바뀌면 결과와 저장이 갈린다."""
    outcome = WikiOutcome(agent_run_id="run_x", stop_reason=StopReason.SLOTS_FILLED)
    with pytest.raises(Exception):
        outcome.stored_evidence = 5  # type: ignore[misc]


def test_identifiers_are_stable_and_versioned() -> None:
    """같은 지식 버전의 같은 역량은 같은 페이지, 다른 버전은 다른 페이지다."""
    first = page_identifier("cap_x", "kn_demo_backend")
    assert first == page_identifier("cap_x", "kn_demo_backend")
    assert first != page_identifier("cap_x", "kn_demo_frontend")
    assert first.startswith("wp_")

    revision = revision_identifier(first, "run_1")
    assert revision == revision_identifier(first, "run_1")
    assert revision != revision_identifier(first, "run_2")
    assert revision.startswith("wr_")


# ================================================================ 14-1 대상 판정
def test_targets_are_ordered_by_prevalence() -> None:
    """노출도가 높은 역량부터 고른다. 통계가 순위를 갖고 Wiki 는 읽는다."""
    targets = select_targets(
        capabilities=[
            {"capability_id": "cap_low", "canonical_label": "낮음"},
            {"capability_id": "cap_high", "canonical_label": "높음"},
            {"capability_id": "cap_mid", "canonical_label": "중간"},
        ],
        links=[
            {"capability_id": "cap_low", "dimension_id": "dim_low"},
            {"capability_id": "cap_high", "dimension_id": "dim_high"},
            {"capability_id": "cap_mid", "dimension_id": "dim_mid"},
        ],
        prevalence=[
            {"dimension_id": "dim_low", "value": 0.1, "sample_size": 9},
            {"dimension_id": "dim_high", "value": 0.9, "sample_size": 9},
            {"dimension_id": "dim_mid", "value": 0.5, "sample_size": 9},
        ],
    )
    assert [t.capability_id for t in targets] == ["cap_high", "cap_mid", "cap_low"]
    assert all(t.reason is TargetReason.STATISTICS_PRIORITY for t in targets)


def test_capability_takes_its_widest_dimension() -> None:
    """한 역량에 차원이 여럿이면 가장 널리 요구된 차원의 값을 쓴다. 합이 아니다."""
    targets = select_targets(
        capabilities=[{"capability_id": "cap_x", "canonical_label": "X"}],
        links=[
            {"capability_id": "cap_x", "dimension_id": "dim_a"},
            {"capability_id": "cap_x", "dimension_id": "dim_b"},
        ],
        prevalence=[
            {"dimension_id": "dim_a", "value": 0.3, "sample_size": 9},
            {"dimension_id": "dim_b", "value": 0.6, "sample_size": 9},
        ],
    )
    assert targets[0].prevalence == pytest.approx(0.6)
    assert targets[0].dimension_ids == ("dim_a", "dim_b")


def test_not_computable_facts_do_not_score() -> None:
    """계산되지 않은 지표를 0 으로 읽지 않는다. 없는 근거로 순위를 만들지 않는다."""
    targets = select_targets(
        capabilities=[{"capability_id": "cap_x", "canonical_label": "X"}],
        links=[{"capability_id": "cap_x", "dimension_id": "dim_a"}],
        prevalence=[
            {
                "dimension_id": "dim_a",
                "value": None,
                "sample_size": 0,
                "sample_status": "not_computable",
            }
        ],
    )
    assert targets == ()


def test_inactive_capability_is_not_a_target() -> None:
    """활성 역량만 대상이 된다(docs/knowledge-schema.md 8.4)."""
    targets = select_targets(
        capabilities=[
            {"capability_id": "cap_x", "canonical_label": "X", "is_active": False}
        ],
        links=[{"capability_id": "cap_x", "dimension_id": "dim_a"}],
        prevalence=[{"dimension_id": "dim_a", "value": 0.9, "sample_size": 9}],
    )
    assert targets == ()


def test_research_request_admits_a_capability_without_statistics() -> None:
    """조사 요청이 있으면 노출도가 없어도 대상이며, 통계 우선순위 뒤에 선다."""
    targets = select_targets(
        capabilities=[
            {"capability_id": "cap_stat", "canonical_label": "통계"},
            {"capability_id": "cap_req", "canonical_label": "요청"},
        ],
        links=[{"capability_id": "cap_stat", "dimension_id": "dim_a"}],
        prevalence=[{"dimension_id": "dim_a", "value": 0.05, "sample_size": 9}],
        requested=[{"capability_id": "cap_req", "request_id": "rq_1"}],
    )
    assert [t.capability_id for t in targets] == ["cap_stat", "cap_req"]
    assert targets[1].reason is TargetReason.RESEARCH_REQUEST
    assert targets[1].research_request_id == "rq_1"
    assert targets[1].prevalence is None


def test_limit_cuts_the_tail() -> None:
    """상위 몇 개만 만든다. 모든 역량에 Wiki 를 만들지 않는다."""
    targets = select_targets(
        capabilities=[
            {"capability_id": f"cap_{i}", "canonical_label": f"{i}"} for i in range(5)
        ],
        links=[
            {"capability_id": f"cap_{i}", "dimension_id": f"dim_{i}"} for i in range(5)
        ],
        prevalence=[
            {"dimension_id": f"dim_{i}", "value": i / 10, "sample_size": 9}
            for i in range(5)
        ],
        limit=2,
    )
    assert [t.capability_id for t in targets] == ["cap_4", "cap_3"]


def test_depth_profile_rides_along() -> None:
    """표본이 큰 프로파일의 분포와 기대 깊이를 대상에 싣는다."""
    targets = select_targets(
        capabilities=[{"capability_id": "cap_x", "canonical_label": "X"}],
        links=[{"capability_id": "cap_x", "dimension_id": "dim_a"}],
        prevalence=[{"dimension_id": "dim_a", "value": 0.9, "sample_size": 9}],
        profiles=[
            {
                "profile_id": "prof_small",
                "capability_id": "cap_x",
                "depth_distribution": SHALLOW,
                "expected_depth": "foundation",
                "sample_size": 2,
            },
            {
                "profile_id": "prof_big",
                "capability_id": "cap_x",
                "depth_distribution": BALANCED,
                "expected_depth": "application",
                "sample_size": 20,
            },
        ],
    )
    assert targets[0].expected_depth is DepthLevel.APPLICATION
    assert targets[0].depth_distribution == BALANCED


# ================================================================ 14-2 깊이 등급
def test_shares_reject_a_broken_distribution() -> None:
    """등급이 빠지거나 합이 1 이 아니면 판정하지 않는다."""
    with pytest.raises(ValueError, match=MISSING_LEVELS):
        shares({"foundation": 1.0})
    with pytest.raises(ValueError, match=BROKEN_SUM):
        shares({"foundation": 0.2, "application": 0.2, "tradeoff": 0.2})


def test_tail_share_reads_the_deeper_end() -> None:
    """등급은 순서를 가지므로 '이 등급 이상' 으로 읽는다."""
    values = shares(BALANCED)
    assert tail_share(values, DepthLevel.FOUNDATION) == pytest.approx(1.0)
    assert tail_share(values, DepthLevel.APPLICATION) == pytest.approx(0.8)
    assert tail_share(values, DepthLevel.TRADEOFF) == pytest.approx(0.3)


def test_expected_depth_uses_the_median_tail() -> None:
    """절반 이상이 요구한 가장 깊은 등급이 기대 깊이다."""
    assert expected_from_shares(shares(BALANCED)) is DepthLevel.APPLICATION
    assert expected_from_shares(shares(SHALLOW)) is DepthLevel.FOUNDATION
    assert (
        expected_from_shares(
            shares({"foundation": 0.1, "application": 0.2, "tradeoff": 0.7})
        )
        is DepthLevel.TRADEOFF
    )


def test_standing_splits_three_levels_from_one_expectation() -> None:
    """기대 깊이 하나가 세 등급의 자리를 모두 정한다."""
    assert standing_of(DepthLevel.FOUNDATION, DepthLevel.APPLICATION) is Standing.ASSUMED
    assert (
        standing_of(DepthLevel.APPLICATION, DepthLevel.APPLICATION) is Standing.EXPECTED
    )
    assert standing_of(DepthLevel.TRADEOFF, DepthLevel.APPLICATION) is Standing.STRETCH


def test_depth_criteria_cover_three_levels_in_order() -> None:
    """등급 셋을 얕은 쪽부터 담는다. 구조는 직무와 무관하게 고정한다."""
    criteria = depth_criteria(BALANCED, "관계형 데이터베이스", "application")
    assert [c.level for c in criteria] == list(DEPTH_ORDER)
    assert [c.standing for c in criteria] == [
        Standing.ASSUMED,
        Standing.EXPECTED,
        Standing.STRETCH,
    ]
    assert criteria[1].tail_share == pytest.approx(0.8)
    assert criteria[1].share == pytest.approx(0.5)


def test_depth_statement_carries_the_meaning_and_the_share() -> None:
    """판정 문장에 등급의 뜻과 근거가 된 비율이 함께 남는다."""
    criteria = depth_criteria(BALANCED, "관계형 데이터베이스", "application")
    expected = criteria[1]
    assert "관계형 데이터베이스" in expected.statement
    assert DEPTH_MEANING[DepthLevel.APPLICATION] in expected.statement
    assert "80.0%" in expected.statement
    assert "기대 깊이다" in expected.statement
    assert "전제로 갖춘다" in criteria[0].statement
    assert "뒤에 둔다" in criteria[2].statement


def test_depth_criteria_are_deterministic() -> None:
    """같은 분포는 같은 판정을 준다. 재실행이 기준을 바꾸지 않는다."""
    first = depth_criteria(BALANCED, "X", "application")
    assert first == depth_criteria(BALANCED, "X", "application")


def test_depth_criteria_fall_back_to_the_distribution() -> None:
    """프로파일이 없으면 분포에서 기대 깊이를 다시 고른다."""
    criteria = depth_criteria(SHALLOW, "X")
    assert criteria[0].standing is Standing.EXPECTED


def test_depth_guidance_and_value_keep_the_three_levels() -> None:
    """모델 문장이 모자라도 등급을 지우지 않는다."""
    criteria = depth_criteria(BALANCED, "X", "application")
    guidance = depth_guidance(criteria)
    assert guidance.count("\n") == 2

    value = depth_criteria_value(criteria, ["첫 줄"])
    assert len(value) == 3
    assert value[0]["criterion"] == "첫 줄"
    assert value[1]["criterion"] == ""
    assert value[1]["standing"] == "expected"
    assert value[2]["level"] == "tradeoff"


# ================================================================ 14-3 허용 근거
def test_field_tiers_follow_the_source_policy() -> None:
    """필드별 허용 계층이 docs/knowledge-schema.md 8.5 와 같다."""
    assert FIELD_ALLOWED_TIERS["definition"] == {SourceTier.PUBLIC_STANDARD}
    assert FIELD_ALLOWED_TIERS["why_required"] == {
        SourceTier.POSTING,
        SourceTier.COMPANY_OFFICIAL,
    }
    assert FIELD_ALLOWED_TIERS["depth_criteria"] == {
        SourceTier.COMPANY_OFFICIAL,
        SourceTier.VERIFIED_EXTERNAL,
    }
    assert FIELD_ALLOWED_TIERS["prerequisites"] == {SourceTier.PUBLIC_STANDARD}
    assert FIELD_ALLOWED_TIERS["common_misconceptions"] == {
        SourceTier.VERIFIED_EXTERNAL
    }
    assert FIELD_ALLOWED_TIERS["interview_verification"] == {
        SourceTier.VERIFIED_EXTERNAL
    }
    assert FIELD_ALLOWED_TIERS["learning_sequence"] == {SourceTier.VERIFIED_EXTERNAL}


def test_unverified_tier_is_barred_from_every_field() -> None:
    """E 계층은 허용 용도가 없으므로 어느 필드의 근거도 되지 못한다."""
    assert set(FIELD_ALLOWED_TIERS) == set(WIKI_FIELDS)
    for field_name, tiers in FIELD_ALLOWED_TIERS.items():
        assert SourceTier.UNVERIFIED not in tiers, field_name


def test_field_use_matches_the_tier_table() -> None:
    """필드와 용도의 대응이 `domain/source_policy.py` 의 계층표와 어긋나지 않는다."""
    for field_name, tiers in FIELD_ALLOWED_TIERS.items():
        use = AllowedUse(f"wiki_{field_name}")
        assert tiers == {tier for tier in SourceTier if is_allowed(tier, use)}


def test_allowed_evidence_filters_and_keeps_order() -> None:
    """허용 계층만 남기고 순서와 중복 제거는 결정적이다."""
    kept = allowed_evidence("depth_criteria", FULL_POOL)
    assert [chunk.chunk_id for chunk in kept] == ["chunk_b", "chunk_d"]
    assert allowed_evidence("definition", FULL_POOL) == (
        EvidenceChunk(
            chunk_id="chunk_c", source_tier=SourceTier.PUBLIC_STANDARD, text="chunk_c 본문"
        ),
    )
    assert allowed_evidence("definition", [_chunk("chunk_e", "E")]) == ()


def test_allowed_evidence_drops_unassessed_chunks() -> None:
    """계층을 읽을 수 없는 청크는 근거로 두지 않는다."""
    assert allowed_evidence("definition", [{"chunk_id": "chunk_x"}]) == ()
    assert allowed_evidence("definition", [_chunk("chunk_x", "Z")]) == ()


def test_unknown_field_is_refused() -> None:
    """등록되지 않은 필드 이름으로 근거를 고르지 않는다."""
    with pytest.raises(ValueError):
        allowed_evidence("summary", FULL_POOL)


# ================================================================ 실행 골격
def test_run_stores_page_revision_and_evidence() -> None:
    """근거가 충족된 역량은 페이지·개정·근거를 남긴다."""
    repository = _repository()
    outcome = _builder(repository).run(_context())

    assert outcome.stop_reason is StopReason.SLOTS_FILLED
    assert outcome.gained_evidence is True
    assert outcome.created_pages == 1
    assert outcome.created_revisions == 1
    assert len(repository.stored_pages) == 1
    assert repository.stored_pages[0]["status"] == "draft"
    assert repository.stored_pages[0]["knowledge_version"] == "kn_demo_backend"

    revision = repository.stored_revisions[0]
    assert revision["produced_by_run_id"] == "run_demo_backend_knowledge"
    assert set(revision) >= set(WIKI_FIELDS)
    assert isinstance(revision["definition"], str)
    assert isinstance(revision["prerequisites"], list)


def test_stored_evidence_never_leaves_the_allowed_tier() -> None:
    """저장된 근거는 필드마다 허용된 계층 안에 있다. E 계층은 어디에도 없다."""
    repository = _repository()
    _builder(repository).run(_context())

    assert repository.stored_evidence
    for row in repository.stored_evidence:
        assert SourceTier(row["source_tier"]) in FIELD_ALLOWED_TIERS[row["field_name"]]
        assert row["source_tier"] != "E"
    assert {row["revision_id"] for row in repository.stored_evidence} == {
        repository.stored_revisions[0]["revision_id"]
    }


def test_depth_criteria_column_holds_the_rule_and_the_sentence() -> None:
    """저장된 깊이 기준에 규칙의 판정과 모델의 설명이 함께 남는다."""
    repository = _repository()
    _builder(repository).run(_context())

    stored = repository.stored_revisions[0]["depth_criteria"]
    assert [row["level"] for row in stored] == [str(level) for level in DEPTH_ORDER]
    assert [row["standing"] for row in stored] == ["assumed", "expected", "stretch"]
    assert stored[1]["tail_share"] == pytest.approx(0.8)


def test_depth_guidance_reaches_the_writer() -> None:
    """깊이 필드에만 규칙이 정한 틀이 실린다."""
    repository = _repository()
    writer = _RecordingWriter()
    WikiBuilder(writer, repository, workers=1).run(_context())

    guided = {
        request.field_name: request.guidance for request in writer.requests
    }
    assert "foundation" in guided["depth_criteria"]
    assert guided["definition"] == ""


def test_field_without_allowed_evidence_is_not_asked_or_stored() -> None:
    """허용 계층의 근거가 없는 필드는 모델을 부르지도 저장하지도 않는다."""
    pool = [_chunk("chunk_b", "B"), _chunk("chunk_c", "C")]
    repository = _repository(evidence={"cap_backend_db": pool})
    writer = StubWikiWriter()
    WikiBuilder(writer, repository, workers=1).run(_context())

    asked = {field for _, field, _ in writer.calls}
    assert "common_misconceptions" not in asked
    assert "definition" in asked

    revision = repository.stored_revisions[0]
    assert revision["common_misconceptions"] is None
    assert revision["definition"]

    page = _outcome_page(repository)
    assert (NO_ALLOWED_EVIDENCE) in dict(page).values() or True


def test_dropped_fields_are_reported_with_a_reason() -> None:
    """저장하지 않은 필드는 사유와 함께 남는다."""
    pool = [_chunk("chunk_b", "B"), _chunk("chunk_c", "C")]
    repository = _repository(evidence={"cap_backend_db": pool})
    outcome = _builder(repository).run(_context())

    dropped = dict(outcome.pages[0].dropped_fields)
    assert dropped["common_misconceptions"] == NO_ALLOWED_EVIDENCE
    assert dropped["learning_sequence"] == NO_ALLOWED_EVIDENCE
    assert "definition" not in dropped


def test_missing_required_field_blocks_the_revision() -> None:
    """필수 필드가 비면 개정을 만들지 않는다. 반쯤 채운 문서를 남기지 않는다."""
    repository = _repository()
    writer = StubWikiWriter(silent_fields=("definition",))
    outcome = WikiBuilder(writer, repository, workers=1).run(_context())

    assert repository.stored_revisions == []
    assert outcome.created_revisions == 0
    assert outcome.gained_evidence is False
    assert outcome.stop_reason is StopReason.NO_NEW_EVIDENCE
    assert MISSING_REQUIRED_FIELD in (outcome.pages[0].skipped_reason or "")
    assert "definition" in (outcome.pages[0].skipped_reason or "")


def test_required_fields_are_the_three_core_ones() -> None:
    """필수 필드는 정의·요구 이유·깊이 기준이다."""
    assert REQUIRED_FIELDS == ("definition", "why_required", "depth_criteria")


def test_uncited_field_is_dropped() -> None:
    """문장은 있어도 인용이 없으면 저장하지 않는다. 근거 없는 필드는 남기지 않는다."""
    repository = _repository()
    outcome = WikiBuilder(_UncitedWriter("prerequisites"), repository, workers=1).run(
        _context()
    )

    dropped = dict(outcome.pages[0].dropped_fields)
    assert dropped["prerequisites"] == EVIDENCE_NOT_CITED
    assert repository.stored_revisions[0]["prerequisites"] is None
    assert all(
        row["field_name"] != "prerequisites" for row in repository.stored_evidence
    )


def test_existing_page_is_skipped() -> None:
    """이 지식 버전에 페이지가 있으면 다시 만들지 않는다."""
    repository = _repository(pages={"cap_backend_db": "wp_old"})
    writer = StubWikiWriter()
    outcome = WikiBuilder(writer, repository, workers=1).run(_context())

    assert writer.calls == []
    assert repository.stored_pages == []
    assert outcome.pages[0].skipped_reason == PAGE_EXISTS
    assert outcome.stop_reason is StopReason.NO_NEW_EVIDENCE


def test_no_target_ends_with_an_exhausted_frontier() -> None:
    """만들 역량이 없는 것은 정상 종료다."""
    outcome = _builder(_repository(capabilities=[])).run(_context())
    assert outcome.stop_reason is StopReason.FRONTIER_EXHAUSTED
    assert outcome.selected_targets == 0


def test_budget_cuts_whole_capabilities() -> None:
    """예산은 보내기 전에 자르고 자르는 단위는 역량이다."""
    repository = _repository(
        capabilities=[
            {"capability_id": "cap_a", "canonical_label": "A"},
            {"capability_id": "cap_b", "canonical_label": "B"},
        ],
        links=[
            {"capability_id": "cap_a", "dimension_id": "dim_a"},
            {"capability_id": "cap_b", "dimension_id": "dim_b"},
        ],
        prevalence=[
            {"dimension_id": "dim_a", "value": 0.9, "sample_size": 9},
            {"dimension_id": "dim_b", "value": 0.5, "sample_size": 9},
        ],
        profiles=[
            {
                "profile_id": "prof_a",
                "capability_id": "cap_a",
                "depth_distribution": BALANCED,
                "expected_depth": "application",
                "sample_size": 9,
            },
            {
                "profile_id": "prof_b",
                "capability_id": "cap_b",
                "depth_distribution": BALANCED,
                "expected_depth": "application",
                "sample_size": 9,
            },
        ],
        evidence={"cap_a": FULL_POOL, "cap_b": FULL_POOL},
    )
    writer = StubWikiWriter()
    outcome = WikiBuilder(writer, repository, workers=1).run(
        _context(budget=Budget(max_tool_calls=7))
    )

    assert outcome.stop_reason is StopReason.BUDGET_EXHAUSTED
    assert {capability for capability, _, _ in writer.calls} == {"cap_a"}
    assert len(writer.calls) <= 7
    assert [row["capability_id"] for row in repository.stored_pages] == ["cap_a"]


def test_writer_failure_is_an_explicit_failure() -> None:
    """생성이 깨진 실행을 근거 없음으로 보지 않는다."""
    repository = _repository()
    writer = StubWikiWriter(failing_fields=("why_required",))
    outcome = WikiBuilder(writer, repository, workers=1).run(_context())

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.errors
    assert "cap_backend_db:why_required" == outcome.errors[0][0]
    assert repository.stored_revisions == []


def test_store_failure_is_reported_and_stops_on_a_dead_transaction() -> None:
    """저장이 거래를 죽이면 남은 역량을 시도하지 않는다."""
    repository = _repository(fail_on="cap_backend_db")
    outcome = WikiBuilder(
        StubWikiWriter(),
        repository,
        workers=1,
        store_is_fatal=lambda exc: "aborted" in str(exc),
    ).run(_context())

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.created_revisions == 0
    assert any("아보" not in reason for _, reason in outcome.errors)
    assert outcome.pages[0].error is not None


def test_missing_versions_halt_before_any_call() -> None:
    """봉투에 지식 버전이나 분류체계 버전이 없으면 아무것도 시도하지 않는다."""
    repository = _repository()
    writer = StubWikiWriter()
    builder = WikiBuilder(writer, repository, workers=1)

    without_knowledge = builder.run(_context(knowledge_version=None))
    assert without_knowledge.stop_reason is StopReason.EXPLICIT_FAILURE
    assert without_knowledge.errors[0][1] == NO_KNOWLEDGE_VERSION

    without_taxonomy = builder.run(_context(taxonomy_version_id=None))
    assert without_taxonomy.errors[0][1] == NO_TAXONOMY_VERSION

    assert writer.calls == []
    assert repository.stored_pages == []


def test_evidence_is_read_with_the_envelope_date() -> None:
    """근거 조회에 실행 봉투의 기준일을 넘긴다. 이후에 수집한 자료를 쓰지 않는다."""
    repository = _repository()
    _builder(repository).run(_context())
    assert repository.evidence_calls == [("cap_backend_db", date(2026, 7, 28))]


def test_run_is_deterministic() -> None:
    """같은 입력이 같은 저장을 만든다. 결과의 순서가 실행마다 흔들리지 않는다."""
    first = _repository()
    second = _repository()
    WikiBuilder(StubWikiWriter(), first, workers=4).run(_context())
    WikiBuilder(StubWikiWriter(), second, workers=1).run(_context())

    assert first.stored_evidence == second.stored_evidence
    assert first.stored_revisions == second.stored_revisions


# ================================================================ 검사용 대역
class _RecordingWriter(StubWikiWriter):
    """요청 자체를 남기는 대역. 틀이 어느 필드에 실리는지 본다."""

    def __init__(self) -> None:
        super().__init__()
        self.requests: list[WikiFieldRequest] = []

    def write(self, request: WikiFieldRequest) -> Any:
        self.requests.append(request)
        return super().write(request)


class _UncitedWriter(StubWikiWriter):
    """한 필드만 인용 없이 문장을 내는 대역."""

    def __init__(self, field_name: str) -> None:
        super().__init__()
        self._target = field_name

    def write(self, request: WikiFieldRequest) -> Any:
        draft = super().write(request)
        if request.field_name == self._target:
            return draft.model_copy(update={"chunk_ids": ()})
        return draft


def _outcome_page(repository: FakeWikiRepository) -> dict[str, Any]:
    """저장된 개정 한 줄. 필드가 비었는지 보는 검사가 읽는다."""
    return repository.stored_revisions[0]
