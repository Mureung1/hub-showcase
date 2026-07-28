"""분류체계 버전 발행과 승계 검증.

절차는 docs/statistics-model.md 3.3·3.5, 제약은 docs/erd.md 7.2~7.6 에서 온다.
저장소를 가짜로 대체하고 발행 차례, 승계, 판정별 저장 경로만 검사한다. 외부
호출과 데이터베이스 접근은 하지 않는다.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

import pytest
from psycopg.types.json import Jsonb

from careersignal.contracts import RunContext, StopReason
from careersignal.domain.permissions import Component
from careersignal.domain.scope import ScopeLevel
from careersignal.repositories.promotion import PromotionRepository
from careersignal.taxonomy import lifecycle
from careersignal.taxonomy.promotion import CandidateReview
from careersignal.taxonomy.publication import (
    DEFAULT_DIMENSION_KIND,
    TaxonomyPublication,
    alias_identifier,
    dimension_identifier,
    dimension_version_identifier,
    relation_identifier,
    taxonomy_version_identifier,
)

TAXONOMY_ID = "tax_backend"
ACTIVE_VERSION = "tx_backend_v1"
NEXT_VERSION = "tx_backend_v2"
POLICY_VERSION = "tp_v1"
MOMENT = datetime(2026, 7, 28, 9, 0, tzinfo=UTC)


def _candidate(**overrides: Any) -> dict[str, Any]:
    row: dict[str, Any] = {
        "candidate_id": "cand_kafka",
        "proposed_label": "Kafka 운영 경험",
        "lifecycle_status": lifecycle.PROPOSED,
        "nearest_dimension_id": None,
        "relation_judgment": "none",
        "proposed_dimension_kind": None,
        "judged_against_taxonomy_version_id": ACTIVE_VERSION,
        "judgment_rationale": "기존 차원으로 설명되지 않는다",
        "nearest_label": None,
    }
    row.update(overrides)
    return row


def _dimension_version(
    dimension_id: str = "dim_queue",
    label: str = "메시지 큐",
    lifecycle_status: str = lifecycle.ACTIVE,
) -> dict[str, Any]:
    return {
        "dimension_id": dimension_id,
        "internal_canonical_label": label,
        "display_label": label,
        "definition": "메시지 브로커로 작업을 비동기로 전달한다",
        "lifecycle_status": lifecycle_status,
        "standard_mapping_status": "unmapped",
        "standard_id": None,
        "mapping_confidence": None,
        "mapping_evidence": None,
        "review_status": "promoted",
        "role_boundary_eligible": False,
    }


class FakePublicationStore:
    """승격 저장소의 대역. SQL 을 실행하지 않는다."""

    def __init__(
        self,
        candidates: list[dict[str, Any]] | None = None,
        counts: dict[str, tuple[int, int]] | None = None,
        dimension_versions: list[dict[str, Any]] | None = None,
        aliases: list[dict[str, Any]] | None = None,
        relations: list[dict[str, Any]] | None = None,
        active: dict[str, Any] | None = None,
        version_number: int = 1,
        sentences: dict[str, list[str]] | None = None,
        mention_counts: dict[str, int] | None = None,
        group_counts: dict[tuple[str, ...], tuple[int, int]] | None = None,
    ) -> None:
        self._candidates = candidates or []
        self._counts = counts or {}
        self._sentences = sentences or {}
        self._mention_counts = mention_counts or {}
        self._group_counts = group_counts or {}
        self._dimension_versions = dimension_versions or []
        self._aliases = aliases or []
        self._relations = relations or []
        self._version_number = version_number
        self._active = (
            active
            if active is not None
            else {
                "taxonomy_version_id": ACTIVE_VERSION,
                "taxonomy_id": TAXONOMY_ID,
                "version_number": 1,
                "taxonomy_policy_version": POLICY_VERSION,
            }
        )
        self.published: list[dict[str, Any]] = []
        self.superseded = 0
        self.decisions: list[dict[str, Any]] = []
        self.lifecycles: list[tuple[str, str]] = []
        self.written_dimensions: list[dict[str, Any]] = []
        self.written_dimension_versions: list[dict[str, Any]] = []
        self.written_aliases: list[dict[str, Any]] = []
        self.written_relations: list[dict[str, Any]] = []

    # ---------------------------------------------------------- 심사
    def active_taxonomy_version(self, job_role_id: str) -> dict[str, Any] | None:
        return dict(self._active) if self._active else None

    def candidates_to_review(
        self, taxonomy_id: str, taxonomy_version_id: str, limit: int | None = None
    ) -> list[dict[str, Any]]:
        rows = list(self._candidates)
        return rows if limit is None else rows[:limit]

    def group_evidence(
        self, candidate_ids, dataset_version: str
    ) -> dict[str, int]:
        """묶음 전체에서 센 두 수. 후보마다의 수를 합치지 않고 최대를 취한다.

        실제 SQL 은 `DISTINCT` 로 공고와 회사를 세므로 같은 공고를 두 후보가 함께
        증명해도 하나다. 대역은 후보별 수를 미리 받아 두고 그중 가장 큰 값을 쓰되,
        묶음마다의 값을 따로 정하고 싶으면 `group_counts` 에 적는다.
        """
        key = tuple(sorted(candidate_ids))
        if key in self._group_counts:
            postings, companies = self._group_counts[key]
            return {
                "independent_posting_count": postings,
                "independent_company_count": companies,
            }
        counted = [self._counts.get(cid, (4, 3)) for cid in candidate_ids]
        return {
            "independent_posting_count": max((c[0] for c in counted), default=0),
            "independent_company_count": max((c[1] for c in counted), default=0),
        }

    def candidate_mention_counts(
        self, candidate_ids, dataset_version: str
    ) -> dict[str, int]:
        return {
            cid: self._mention_counts.get(cid, 1)
            for cid in candidate_ids
            if cid in self._mention_counts or True
        }

    def candidate_evidence(
        self, candidate_id: str, dataset_version: str
    ) -> dict[str, int]:
        postings, companies = self._counts.get(candidate_id, (4, 3))
        return {
            "independent_posting_count": postings,
            "independent_company_count": companies,
        }

    def representative_sentences(
        self, candidate_id: str, dataset_version: str, limit: int
    ) -> list[str]:
        return list(self._sentences.get(candidate_id, ["Kafka 운영 경험"]))[:limit]

    def expected_dimension_labels(self, job_role_id: str) -> dict[str, Any]:
        return {"eval_set_id": None, "labels": ()}

    def add_decision(self, values: dict[str, Any]) -> None:
        self.decisions.append(values)

    def set_candidate_lifecycle(self, candidate_id: str, lifecycle_status: str) -> None:
        self.lifecycles.append((candidate_id, lifecycle_status))

    # ---------------------------------------------------------- 발행
    def next_version_number(self, taxonomy_id: str) -> int:
        return self._version_number + 1

    def publish_version(self, values: dict[str, Any], published_at: Any) -> int:
        self.published.append(values)
        self.superseded = 1 if self._active else 0
        return self.superseded

    def dimension_versions(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self._dimension_versions]

    def aliases(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self._aliases]

    def relations(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self._relations]

    def add_dimension(self, values: dict[str, Any]) -> None:
        self.written_dimensions.append(values)

    def add_dimension_version(self, values: dict[str, Any]) -> None:
        self.written_dimension_versions.append(values)

    def add_alias(self, values: dict[str, Any]) -> None:
        self.written_aliases.append(values)

    def add_relation(self, values: dict[str, Any]) -> None:
        self.written_relations.append(values)


class RecordingUnit:
    """거래의 대역. 실행한 문장의 차례만 기록한다."""

    component = Component.AGENT_STATS

    def __init__(self) -> None:
        self.calls: list[tuple[str, str, dict[str, Any]]] = []

    def update(
        self, table: str, values: dict[str, Any], where: str, params: dict[str, Any]
    ) -> int:
        self.calls.append(("update", table, {"values": values, "where": where}))
        return 1

    def insert(self, table: str, values: dict[str, Any]) -> None:
        self.calls.append(("insert", table, values))

    def fetch_value(self, sql: str, params: Any = None) -> Any:
        return 1


def _context() -> RunContext:
    return RunContext(
        agent_run_id="run_publication_test",
        analysis_version="an_publication_test",
        dataset_version="ds_test",
        job_role_id="backend",
        scope_level=ScopeLevel.OVERALL,
        as_of_date=date(2026, 7, 28),
    )


def _publish(store: FakePublicationStore) -> Any:
    return TaxonomyPublication(CandidateReview(store), store).run(
        _context(), published_at=MOMENT
    )


# ============================================================ 식별자
def test_the_new_version_follows_the_seed_naming() -> None:
    assert taxonomy_version_identifier(TAXONOMY_ID, 2) == NEXT_VERSION


def test_the_version_identifier_carries_its_prefix() -> None:
    assert taxonomy_version_identifier("tax_frontend", 1).startswith("tx_")


def test_one_candidate_always_makes_the_same_dimension() -> None:
    """라벨이 바뀌어도 `dimension_id` 는 유지된다."""
    assert dimension_identifier(TAXONOMY_ID, "cand_kafka") == dimension_identifier(
        TAXONOMY_ID, "cand_kafka"
    )
    assert dimension_identifier(TAXONOMY_ID, "cand_kafka").startswith("dim_")


def test_a_dimension_has_one_row_per_version() -> None:
    first = dimension_version_identifier("dim_queue", ACTIVE_VERSION)
    second = dimension_version_identifier("dim_queue", NEXT_VERSION)

    assert first != second


def test_alias_and_relation_identifiers_match_their_unique_keys() -> None:
    assert alias_identifier(NEXT_VERSION, "MQ") != alias_identifier(
        ACTIVE_VERSION, "MQ"
    )
    assert relation_identifier(NEXT_VERSION, "dim_a", "dim_b", "broader") != (
        relation_identifier(NEXT_VERSION, "dim_a", "dim_b", "related")
    )


# ============================================================ 발행
def test_publishing_supersedes_the_previous_active_version() -> None:
    """부분 유니크 인덱스가 직무마다 활성 버전을 하나로 강제한다."""
    unit = RecordingUnit()
    PromotionRepository(unit).publish_version(
        {
            "taxonomy_version_id": NEXT_VERSION,
            "taxonomy_id": TAXONOMY_ID,
            "version_number": 2,
            "taxonomy_policy_version": POLICY_VERSION,
            "published_at": MOMENT,
        },
        MOMENT,
    )

    kinds = [call[0] for call in unit.calls]
    assert kinds == ["update", "insert"]


def test_the_supersede_condition_matches_the_partial_unique_index() -> None:
    unit = RecordingUnit()
    PromotionRepository(unit).publish_version(
        {"taxonomy_version_id": NEXT_VERSION, "taxonomy_id": TAXONOMY_ID},
        MOMENT,
    )

    _, table, payload = unit.calls[0]
    assert table == "requirement_taxonomy_versions"
    assert "published_at IS NOT NULL" in payload["where"]
    assert "superseded_at IS NULL" in payload["where"]
    assert payload["values"] == {"superseded_at": MOMENT}


def test_the_run_publishes_the_next_version_number() -> None:
    store = FakePublicationStore([_candidate()])

    outcome = _publish(store)

    assert outcome.published
    assert outcome.taxonomy_version_id == NEXT_VERSION
    assert outcome.version_number == 2
    assert outcome.previous_taxonomy_version_id == ACTIVE_VERSION
    assert outcome.superseded == 1
    assert store.published[0]["taxonomy_policy_version"] == POLICY_VERSION


def test_nothing_is_published_without_a_promotable_candidate() -> None:
    """내용이 같은 버전을 발행하면 재할당 비용만 늘어난다."""
    store = FakePublicationStore([_candidate()], counts={"cand_kafka": (1, 1)})

    outcome = _publish(store)

    assert not outcome.published
    assert store.published == []
    assert outcome.stop_reason is StopReason.NO_NEW_EVIDENCE
    assert outcome.held == 1


def test_a_failed_review_publishes_nothing() -> None:
    store = FakePublicationStore([_candidate()], active={})

    outcome = _publish(store)

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert store.published == []


# ============================================================ 승계
def test_a_carried_dimension_gets_a_row_in_the_new_version() -> None:
    """`(dimension_id, taxonomy_version_id)` 가 UNIQUE 이므로 버전마다 행이 하나다."""
    store = FakePublicationStore(
        [_candidate()], dimension_versions=[_dimension_version()]
    )

    outcome = _publish(store)

    carried = [
        row
        for row in store.written_dimension_versions
        if row["dimension_id"] == "dim_queue"
    ]
    assert len(carried) == 1
    assert carried[0]["taxonomy_version_id"] == NEXT_VERSION
    assert carried[0]["lifecycle_status"] == lifecycle.ACTIVE
    assert outcome.carried_dimensions == 1


def test_a_carried_dimension_keeps_its_identity() -> None:
    """정체성 행은 버전을 갖지 않는다. 승계는 버전 행만 만든다."""
    store = FakePublicationStore(
        [_candidate()], dimension_versions=[_dimension_version()]
    )

    _publish(store)

    assert "dim_queue" not in {row["dimension_id"] for row in store.written_dimensions}


def test_a_terminal_dimension_is_not_carried() -> None:
    store = FakePublicationStore(
        [_candidate()],
        dimension_versions=[
            _dimension_version(),
            _dimension_version("dim_old", "옛 차원", lifecycle.DEPRECATED),
        ],
    )

    outcome = _publish(store)

    carried = {row["dimension_id"] for row in store.written_dimension_versions}
    assert "dim_old" not in carried
    assert outcome.carried_dimensions == 1


def test_aliases_are_carried_so_the_vocabulary_survives() -> None:
    store = FakePublicationStore(
        [_candidate()],
        dimension_versions=[_dimension_version()],
        aliases=[
            {
                "dimension_id": "dim_queue",
                "alias_text": "Message Queue",
                "alias_source": "discovered",
            }
        ],
    )

    outcome = _publish(store)

    assert outcome.carried_aliases == 1
    assert store.written_aliases[0]["taxonomy_version_id"] == NEXT_VERSION


def test_an_alias_of_a_dropped_dimension_is_not_carried() -> None:
    store = FakePublicationStore(
        [_candidate()],
        dimension_versions=[_dimension_version("dim_old", "옛", lifecycle.DEPRECATED)],
        aliases=[
            {
                "dimension_id": "dim_old",
                "alias_text": "옛 표기",
                "alias_source": "discovered",
            }
        ],
    )

    outcome = _publish(store)

    assert outcome.carried_aliases == 0
    assert store.written_aliases == []


def test_relations_are_carried_when_both_endpoints_survive() -> None:
    store = FakePublicationStore(
        [_candidate()],
        dimension_versions=[
            _dimension_version(),
            _dimension_version("dim_async", "비동기 처리"),
        ],
        relations=[
            {
                "src_dimension_id": "dim_queue",
                "dst_dimension_id": "dim_async",
                "relation_type": "related",
            }
        ],
    )

    outcome = _publish(store)

    assert outcome.carried_relations == 1
    assert store.written_relations[0]["taxonomy_version_id"] == NEXT_VERSION


def test_a_relation_losing_an_endpoint_is_not_carried() -> None:
    store = FakePublicationStore(
        [_candidate()],
        dimension_versions=[_dimension_version()],
        relations=[
            {
                "src_dimension_id": "dim_queue",
                "dst_dimension_id": "dim_async",
                "relation_type": "related",
            }
        ],
    )

    outcome = _publish(store)

    assert outcome.carried_relations == 0


# ============================================================ 판정별 경로
def _three_route_store() -> FakePublicationStore:
    return FakePublicationStore(
        [
            _candidate(),
            _candidate(
                candidate_id="cand_broker",
                proposed_label="메시지 브로커",
                relation_judgment="broader",
                nearest_dimension_id="dim_queue",
                nearest_label="메시지 큐",
            ),
            _candidate(
                candidate_id="cand_mq",
                proposed_label="MQ",
                relation_judgment="synonym",
                nearest_dimension_id="dim_queue",
                nearest_label="메시지 큐",
            ),
        ],
        dimension_versions=[_dimension_version()],
    )


def test_a_synonym_writes_only_to_the_alias_table() -> None:
    store = _three_route_store()

    _publish(store)

    added = [row for row in store.written_aliases if row["alias_text"] == "MQ"]
    assert len(added) == 1
    assert added[0]["dimension_id"] == "dim_queue"
    assert added[0]["alias_source"] == "discovered"
    assert "cand_mq" not in {
        row["dimension_id"] for row in store.written_dimensions
    }


def test_a_broader_judgment_writes_a_dimension_and_a_relation() -> None:
    store = _three_route_store()

    outcome = _publish(store)

    source = dimension_identifier(TAXONOMY_ID, "cand_broker")
    relation = [
        row for row in store.written_relations if row["src_dimension_id"] == source
    ]
    assert len(relation) == 1
    assert relation[0]["dst_dimension_id"] == "dim_queue"
    assert relation[0]["relation_type"] == "broader"
    assert outcome.created_relations == 1


def test_a_new_concept_writes_a_dimension_without_a_relation() -> None:
    store = _three_route_store()

    outcome = _publish(store)

    created = {row["dimension_id"] for row in store.written_dimensions}
    assert dimension_identifier(TAXONOMY_ID, "cand_kafka") in created
    assert outcome.created_dimensions == 2
    assert outcome.created_aliases == 1


def test_each_route_touches_a_different_table() -> None:
    store = _three_route_store()

    outcome = _publish(store)

    assert (outcome.created_dimensions, outcome.created_relations) == (2, 1)
    assert outcome.created_aliases == 1
    assert outcome.promoted == 2
    assert outcome.merged == 1


# ============================================================ 새 차원 행
def test_a_promoted_dimension_enters_as_active() -> None:
    """`active` 인 차원만 집계에 들어간다."""
    store = FakePublicationStore([_candidate()])

    _publish(store)

    row = store.written_dimension_versions[0]
    assert row["lifecycle_status"] == lifecycle.ACTIVE
    assert row["taxonomy_version_id"] == NEXT_VERSION


def test_a_promoted_dimension_starts_unmapped() -> None:
    """CHECK (standard_mapping_status = 'unmapped' OR standard_id IS NOT NULL) 다."""
    store = FakePublicationStore([_candidate()])

    _publish(store)

    row = store.written_dimension_versions[0]
    assert row["standard_mapping_status"] == "unmapped"
    assert row["standard_id"] is None


def test_a_promoted_dimension_fills_every_not_null_column() -> None:
    store = FakePublicationStore([_candidate()])

    _publish(store)

    row = store.written_dimension_versions[0]
    for column in (
        "dimension_version_id",
        "dimension_id",
        "taxonomy_version_id",
        "internal_canonical_label",
        "display_label",
        "definition",
        "lifecycle_status",
        "standard_mapping_status",
        "review_status",
    ):
        assert row[column]
    assert row["role_boundary_eligible"] is False


def test_the_dimension_kind_stays_inside_the_check() -> None:
    assert DEFAULT_DIMENSION_KIND in (
        "technology",
        "practice",
        "domain",
        "collaboration",
        "tooling",
    )
    store = FakePublicationStore([_candidate()])

    _publish(store)

    assert store.written_dimensions[0]["dimension_kind"] == DEFAULT_DIMENSION_KIND


def test_the_definition_comes_from_the_judgment_rationale() -> None:
    store = FakePublicationStore([_candidate()])

    _publish(store)

    assert (
        store.written_dimension_versions[0]["definition"]
        == "기존 차원으로 설명되지 않는다"
    )


# ============================================================ 결정과 생명주기
def test_a_promote_decision_names_the_version_it_entered() -> None:
    store = FakePublicationStore([_candidate()])

    _publish(store)

    assert store.decisions[0]["decision"] == "promote"
    assert store.decisions[0]["promoted_to_version_id"] == NEXT_VERSION


def test_a_promoted_candidate_becomes_active() -> None:
    store = FakePublicationStore([_candidate()])

    _publish(store)

    assert store.lifecycles == [("cand_kafka", lifecycle.ACTIVE)]


def test_a_merged_candidate_becomes_merged() -> None:
    store = FakePublicationStore(
        [
            _candidate(
                candidate_id="cand_mq",
                proposed_label="MQ",
                relation_judgment="synonym",
                nearest_dimension_id="dim_queue",
                nearest_label="메시지 큐",
            )
        ],
        dimension_versions=[_dimension_version()],
    )

    _publish(store)

    assert store.lifecycles == [("cand_mq", lifecycle.MERGED)]


def test_the_decision_row_keeps_the_evidence_the_review_read() -> None:
    store = FakePublicationStore([_candidate()])

    _publish(store)

    row = store.decisions[0]
    assert row["representative_sentences"] == ["Kafka 운영 경험"]
    assert row["independent_company_count"] == 3
    assert row["taxonomy_policy_version"] == POLICY_VERSION


def test_the_publication_stops_with_slots_filled() -> None:
    outcome = _publish(FakePublicationStore([_candidate()]))

    assert outcome.stop_reason is StopReason.SLOTS_FILLED
    assert outcome.gained_evidence
    assert outcome.recorded_decisions == 1


def test_the_active_dimension_count_adds_carried_and_created() -> None:
    store = FakePublicationStore(
        [_candidate()], dimension_versions=[_dimension_version()]
    )

    outcome = _publish(store)

    assert outcome.active_dimensions == 2


# ============================================================ jsonb
def test_the_decision_columns_are_written_as_jsonb() -> None:
    unit = RecordingUnit()
    PromotionRepository(unit).add_decision(
        {
            "decision_id": "dec_1",
            "candidate_id": "cand_kafka",
            "decision": "hold",
            "independent_posting_count": 1,
            "independent_company_count": 1,
            "representative_sentences": ["Kafka 운영 경험"],
            "eval_set_comparison": {"status": "absent"},
            "decided_by": "agent_stats:run_x",
            "taxonomy_policy_version": POLICY_VERSION,
        }
    )

    _, table, values = unit.calls[0]
    assert table == "requirement_candidate_decisions"
    assert isinstance(values["representative_sentences"], Jsonb)
    assert isinstance(values["eval_set_comparison"], Jsonb)


def test_a_repository_refuses_a_transaction_of_another_component() -> None:
    class Other(RecordingUnit):
        component = Component.AGENT_INTERPRET

    with pytest.raises(PermissionError):
        PromotionRepository(Other())


# ============================================================ 라벨 묶음
def test_the_rest_of_a_group_becomes_an_alias_of_the_new_dimension() -> None:
    """같은 개념의 표기가 한 차원에 모여야 다음 기지 추출이 그 표기를 맞힌다."""
    store = FakePublicationStore(
        [
            _candidate(candidate_id="cand_java_a", proposed_label="Java"),
            _candidate(candidate_id="cand_java_b", proposed_label="Java"),
        ],
        sentences={
            "cand_java_a": ["Java 개발 경험"],
            "cand_java_b": ["자바 백엔드 경험"],
        },
        mention_counts={"cand_java_a": 3, "cand_java_b": 1},
    )

    outcome = _publish(store)

    assert outcome.created_dimensions == 1
    assert outcome.created_aliases == 1
    alias = store.written_aliases[0]
    assert alias["alias_text"] == "자바 백엔드 경험"
    assert alias["dimension_id"] == dimension_identifier(TAXONOMY_ID, "cand_java_a")


def test_the_representative_is_written_before_the_members() -> None:
    """대표의 차원이 아직 없으면 나머지가 붙을 곳이 없다."""
    store = FakePublicationStore(
        [
            _candidate(candidate_id="cand_java_z", proposed_label="Java"),
            _candidate(candidate_id="cand_java_a", proposed_label="Java"),
        ],
        sentences={
            "cand_java_z": ["Java 개발 경험"],
            "cand_java_a": ["자바 백엔드 경험"],
        },
        mention_counts={"cand_java_z": 9, "cand_java_a": 1},
    )

    outcome = _publish(store)

    assert outcome.created_dimensions == 1
    assert store.written_dimensions[0]["dimension_id"] == dimension_identifier(
        TAXONOMY_ID, "cand_java_z"
    )
    assert store.written_aliases[0]["dimension_id"] == dimension_identifier(
        TAXONOMY_ID, "cand_java_z"
    )


def test_an_alias_already_taken_by_another_dimension_falls_to_hold() -> None:
    """`UNIQUE (taxonomy_version_id, alias_text)` 가 한 표기를 한 차원에만 허용한다."""
    store = FakePublicationStore(
        [
            _candidate(candidate_id="cand_java_a", proposed_label="Java"),
            _candidate(candidate_id="cand_java_b", proposed_label="Java"),
        ],
        sentences={
            "cand_java_a": ["Java 개발 경험"],
            "cand_java_b": ["옛 표기"],
        },
        mention_counts={"cand_java_a": 3, "cand_java_b": 1},
        dimension_versions=[_dimension_version()],
        aliases=[
            {
                "dimension_id": "dim_queue",
                "alias_text": "옛 표기",
                "alias_source": "discovered",
            }
        ],
    )

    outcome = _publish(store)

    assert outcome.carried_aliases == 1
    assert outcome.created_aliases == 0
    assert outcome.alias_conflicts == 1
    assert outcome.merged == 0
    assert outcome.held == 1
    held = [row for row in store.decisions if row["candidate_id"] == "cand_java_b"]
    assert held[0]["decision"] == "hold"
    assert ("cand_java_b", lifecycle.COLLECTING_EVIDENCE) in store.lifecycles


# ============================================================ 차원 종류
def test_the_dimension_kind_comes_from_the_judgment() -> None:
    """`Technology` 그래프 노드는 이 값이 `technology` 인 차원에서만 만들어진다."""
    store = FakePublicationStore(
        [_candidate(proposed_dimension_kind="technology")]
    )

    outcome = _publish(store)

    assert store.written_dimensions[0]["dimension_kind"] == "technology"
    assert outcome.defaulted_dimension_kinds == 0


def test_a_candidate_without_a_kind_falls_back_to_practice() -> None:
    store = FakePublicationStore([_candidate(proposed_dimension_kind=None)])

    outcome = _publish(store)

    assert store.written_dimensions[0]["dimension_kind"] == DEFAULT_DIMENSION_KIND
    assert outcome.defaulted_dimension_kinds == 1


# ============================================================ 실데이터 모사
def test_three_postings_naming_one_concept_promote_once_with_two_aliases() -> None:
    """서로 다른 세 공고가 같은 개념을 다르게 적고 판정이 셋 다 `Java` 로 이름 짓는다.

    관측된 실행은 이 자리에서 후보 셋을 각각 독립 공고 1 로 세어 전부 보류했다.
    묶음으로 세면 독립 공고 3, 독립 회사 3 이 되어 승격이 일어나고, 대표가 아닌 둘의
    표기가 그 차원의 별칭이 된다.
    """
    store = FakePublicationStore(
        [
            _candidate(candidate_id="cand_java_1", proposed_label="Java"),
            _candidate(candidate_id="cand_java_2", proposed_label="Java"),
            _candidate(candidate_id="cand_java_3", proposed_label="java"),
        ],
        counts={
            "cand_java_1": (1, 1),
            "cand_java_2": (1, 1),
            "cand_java_3": (1, 1),
        },
        group_counts={("cand_java_1", "cand_java_2", "cand_java_3"): (3, 3)},
        sentences={
            "cand_java_1": ["Java 개발 경험"],
            "cand_java_2": ["Java 기반 서버 개발"],
            "cand_java_3": ["자바 백엔드 경험"],
        },
        mention_counts={"cand_java_1": 3, "cand_java_2": 2, "cand_java_3": 1},
    )

    outcome = _publish(store)

    assert outcome.promoted == 1
    assert outcome.merged == 2
    assert outcome.created_dimensions == 1
    assert outcome.created_aliases == 2
    assert outcome.held == 0

    dimension_id = dimension_identifier(TAXONOMY_ID, "cand_java_1")
    assert store.written_dimension_versions[0]["display_label"] == "Java"
    assert {row["alias_text"] for row in store.written_aliases} == {
        "Java 기반 서버 개발",
        "자바 백엔드 경험",
    }
    assert {row["dimension_id"] for row in store.written_aliases} == {dimension_id}
    assert [row["candidate_id"] for row in store.decisions] == [
        "cand_java_1",
        "cand_java_2",
        "cand_java_3",
    ]


def test_a_group_whose_representative_is_a_synonym_folds_into_that_dimension() -> None:
    """대표가 차원을 만들지 않으면 나머지는 대표가 붙은 기존 차원에 붙는다."""
    store = FakePublicationStore(
        [
            _candidate(
                candidate_id="cand_mq_a",
                proposed_label="MQ",
                relation_judgment="synonym",
                nearest_dimension_id="dim_queue",
                nearest_label="메시지 큐",
            ),
            _candidate(
                candidate_id="cand_mq_b",
                proposed_label="MQ",
                relation_judgment="synonym",
                nearest_dimension_id="dim_queue",
                nearest_label="메시지 큐",
            ),
        ],
        sentences={
            "cand_mq_a": ["MQ 운영 경험"],
            "cand_mq_b": ["메시지큐 사용 경험"],
        },
        mention_counts={"cand_mq_a": 3, "cand_mq_b": 1},
        dimension_versions=[_dimension_version()],
    )

    outcome = _publish(store)

    assert outcome.created_dimensions == 0
    assert outcome.created_aliases == 2
    assert {row["dimension_id"] for row in store.written_aliases} == {"dim_queue"}
    assert {row["alias_text"] for row in store.written_aliases} == {
        "MQ",
        "메시지큐 사용 경험",
    }
