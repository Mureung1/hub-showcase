"""차원 후보 발견 검증.

규칙은 docs/statistics-model.md 3장과 docs/erd.md 7.7·7.8에서 온다. 생성 모델을
대역으로 대체하고 이중 경로 분리, 표현 묶기, 관계 판정의 저장, 증분 재실행만
검사한다. 외부 호출은 하지 않는다.
"""

from __future__ import annotations

import json
from datetime import date
from types import SimpleNamespace
from typing import Any

import pytest
from pydantic import ValidationError

from careersignal.agents.statistics.judge import (
    JUDGEMENT_RESPONSE_SCHEMA,
    JUDGEMENT_TASK,
    NO_RELATION,
    RELATIONS,
    DimensionOption,
    OpenAIRelationJudge,
    RelationJudge,
    RelationJudgment,
    StubRelationJudge,
)
from careersignal.contracts import Budget, RunContext, StopReason
from careersignal.domain.permissions import Component, can_write
from careersignal.domain.scope import ScopeLevel
from careersignal.providers.models import TASK_TIER, Tier, chat_model
from careersignal.taxonomy import (
    NO_ACTIVE_TAXONOMY,
    PROPOSED,
    TAXONOMY_MISMATCH,
    UNNORMALIZABLE,
    CandidateDiscovery,
    DimensionEntry,
    DiscoveryOutcome,
    Vocabulary,
    candidate_identifier,
    normalize_expression,
)

TAXONOMY_ID = "tax_backend"
TAXONOMY_VERSION_ID = "tx_backend_v1"


def _dimension(
    dimension_id: str = "dim_queue",
    label: str = "메시지 큐",
    kind: str = "technology",
    definition: str | None = "메시지 브로커로 작업을 비동기로 전달한다",
) -> dict[str, Any]:
    return {
        "dimension_id": dimension_id,
        "dimension_kind": kind,
        "internal_canonical_label": label,
        "display_label": label,
        "definition": definition,
    }


def _alias(alias_text: str, dimension_id: str = "dim_queue") -> dict[str, Any]:
    return {
        "alias_id": f"alias_{alias_text}",
        "dimension_id": dimension_id,
        "alias_text": alias_text,
        "alias_source": "discovered",
    }


def _mention(
    mention_id: str,
    raw_expression: str,
    posting_version_id: str = "pv_1",
) -> dict[str, Any]:
    return {
        "mention_id": mention_id,
        "raw_expression": raw_expression,
        "posting_version_id": posting_version_id,
        "section": "자격요건",
        "stated_requiredness": "자격요건",
    }


class FakeStats:
    """통계 저장소의 대역. SQL 을 실행하지 않는다."""

    def __init__(
        self,
        mentions: list[dict[str, Any]] | None = None,
        dimensions: list[dict[str, Any]] | None = None,
        aliases: list[dict[str, Any]] | None = None,
        active: dict[str, Any] | None = None,
    ) -> None:
        self._mentions = mentions or []
        self._dimensions = dimensions or []
        self._aliases = aliases or []
        self._active = (
            active
            if active is not None
            else {
                "taxonomy_version_id": TAXONOMY_VERSION_ID,
                "taxonomy_id": TAXONOMY_ID,
                "version_number": 1,
                "taxonomy_policy_version": "tp_v1",
            }
        )
        self.candidates: list[dict[str, Any]] = []
        self.links: list[tuple[str, str]] = []
        self.linked: set[str] = set()
        self.existing: set[str] = set()

    def active_taxonomy_version(self, job_role_id: str) -> dict[str, Any] | None:
        return dict(self._active) if self._active else None

    def active_dimensions(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return list(self._dimensions)

    def active_aliases(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return list(self._aliases)

    def mentions_to_discover(
        self, dataset_version: str, job_role_id: str, limit: int | None = None
    ) -> list[dict[str, Any]]:
        return list(self._mentions if limit is None else self._mentions[:limit])

    def candidate_mentions(self, dataset_version: str) -> set[str]:
        return set(self.linked)

    def candidate_ids(self, taxonomy_id: str) -> set[str]:
        return set(self.existing)

    def add_candidate(self, values: dict[str, Any]) -> None:
        self.candidates.append(values)

    def link_candidate_mention(self, candidate_id: str, mention_id: str) -> None:
        self.links.append((candidate_id, mention_id))


class Exploding:
    """예외를 던지는 판정 구현. 구현 결함과 근거 없음을 가른다."""

    def judge(
        self,
        expression: str,
        options: tuple[DimensionOption, ...] = (),
        examples: tuple[str, ...] = (),
    ) -> RelationJudgment:
        raise RuntimeError("판정 응답을 읽지 못했다")


class FakeOpenAI:
    """OpenAI 클라이언트의 대역. 요청을 기록하고 정해 둔 답을 준다."""

    def __init__(self, payload: dict[str, Any]) -> None:
        self.requests: list[dict[str, Any]] = []
        self._payload = payload
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs: Any) -> Any:
        self.requests.append(kwargs)
        content = json.dumps(self._payload, ensure_ascii=False)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
        )


def _context(
    max_tool_calls: int = 40, taxonomy_version_id: str | None = None
) -> RunContext:
    return RunContext(
        agent_run_id="run_discovery_test",
        analysis_version="an_discovery_test",
        dataset_version="ds_test",
        taxonomy_version_id=taxonomy_version_id,
        job_role_id="backend",
        scope_level=ScopeLevel.OVERALL,
        as_of_date=date(2026, 7, 28),
        budget=Budget(max_tool_calls=max_tool_calls),
    )


# ============================================================ 정규화
def test_spacing_variants_share_one_key() -> None:
    """한국어 띄어쓰기는 공고마다 흔들리며 요구의 차이가 아니다."""
    assert normalize_expression("메시지 큐") == normalize_expression("메시지큐")


def test_case_and_full_width_variants_share_one_key() -> None:
    assert normalize_expression("Kafka") == normalize_expression("ｋａｆｋａ")


def test_bracketed_punctuation_does_not_change_the_words() -> None:
    assert normalize_expression("CI/CD 구축") == normalize_expression("CI-CD 구축")


def test_a_trailing_period_does_not_split_a_key() -> None:
    assert normalize_expression("Node.js 경험.") == normalize_expression("Node.js 경험")


def test_a_leading_dot_is_part_of_the_name() -> None:
    assert normalize_expression(".NET") != normalize_expression("NET")


@pytest.mark.parametrize(
    ("left", "right"),
    [
        ("C++", "C#"),
        ("C++", "C"),
        ("메시지 큐", "비동기 처리"),
        ("Java 8", "Java 17"),
        ("Kafka 운영 경험", "Kafka 이해"),
    ],
)
def test_normalization_does_not_merge_different_concepts(left: str, right: str) -> None:
    """의미가 가까운 표현을 합치면 서로 다른 요구가 한 숫자로 뭉개진다."""
    assert normalize_expression(left) != normalize_expression(right)


def test_symbols_alone_have_no_key() -> None:
    assert normalize_expression("- ·") == ""


# ============================================================ 어휘
def test_an_empty_vocabulary_matches_nothing() -> None:
    """첫 실행의 활성 분류체계에는 차원이 없다."""
    vocabulary = Vocabulary(TAXONOMY_VERSION_ID)

    assert vocabulary.is_empty
    assert vocabulary.match("Kafka 운영 경험") is None
    assert vocabulary.neighbours("Kafka 운영 경험") == ()


def test_a_label_matches_across_spacing() -> None:
    vocabulary = Vocabulary.from_rows(TAXONOMY_VERSION_ID, [_dimension()])

    match = vocabulary.match("메시지큐")

    assert match is not None
    assert match.dimension_id == "dim_queue"


def test_an_alias_matches_its_dimension() -> None:
    vocabulary = Vocabulary.from_rows(
        TAXONOMY_VERSION_ID, [_dimension()], [_alias("Message Queue")]
    )

    match = vocabulary.match("message queue")

    assert match is not None
    assert match.dimension_id == "dim_queue"


def test_a_key_claimed_by_two_dimensions_matches_neither() -> None:
    """어느 쪽에 붙일지 정할 근거가 없는 표현을 임의로 붙이지 않는다."""
    vocabulary = Vocabulary.from_rows(
        TAXONOMY_VERSION_ID,
        [_dimension(), _dimension("dim_async", "비동기 처리")],
        [_alias("메시지큐", "dim_async")],
    )

    assert vocabulary.match("메시지 큐") is None
    assert "메시지큐" in vocabulary.conflicts


def test_an_alias_of_an_unknown_dimension_is_ignored() -> None:
    vocabulary = Vocabulary.from_rows(
        TAXONOMY_VERSION_ID, [_dimension()], [_alias("Kafka", "dim_missing")]
    )

    assert vocabulary.match("Kafka") is None


def test_neighbours_rank_by_overlap_and_keep_order() -> None:
    """점수는 판정의 입력을 고르는 수단이며 결론이 아니다."""
    vocabulary = Vocabulary.from_rows(
        TAXONOMY_VERSION_ID,
        [_dimension(), _dimension("dim_async", "비동기 처리")],
    )

    neighbours = vocabulary.neighbours("메시지 큐 운영")

    assert [n.dimension_id for n in neighbours] == ["dim_queue"]


def test_neighbours_drop_dimensions_with_nothing_in_common() -> None:
    vocabulary = Vocabulary.from_rows(TAXONOMY_VERSION_ID, [_dimension()])

    assert vocabulary.neighbours("Kubernetes") == ()


def test_a_display_label_is_registered_beside_the_canonical_one() -> None:
    vocabulary = Vocabulary.from_rows(
        TAXONOMY_VERSION_ID,
        [
            {
                "dimension_id": "dim_queue",
                "dimension_kind": "technology",
                "internal_canonical_label": "message_queue",
                "display_label": "메시지 큐",
                "definition": None,
            }
        ],
    )

    assert vocabulary.match("message queue") is not None
    assert vocabulary.match("메시지 큐") is not None


def test_a_dimension_entry_lists_one_label_when_both_are_equal() -> None:
    entry = DimensionEntry("dim_queue", "technology", "메시지 큐", "메시지 큐")

    assert entry.labels == ("메시지 큐",)


# ============================================================ 판정 계약
@pytest.mark.parametrize("relation", ["synonym", "broader", "narrower", "related"])
def test_a_relation_needs_a_dimension(relation: str) -> None:
    with pytest.raises(ValidationError):
        RelationJudgment(proposed_label="메시지 브로커", relation=relation)


def test_no_relation_carries_no_dimension() -> None:
    with pytest.raises(ValidationError):
        RelationJudgment(
            proposed_label="메시지 브로커",
            relation=NO_RELATION,
            nearest_dimension_id="dim_queue",
        )


def test_a_candidate_label_is_required() -> None:
    with pytest.raises(ValidationError):
        RelationJudgment(proposed_label="")


def test_the_judgement_task_is_placed_on_the_middle_tier() -> None:
    """docs/agent-design.md 13장의 배치를 코드가 따른다."""
    assert TASK_TIER[JUDGEMENT_TASK] is Tier.STANDARD
    assert TASK_TIER["dimension_naming"] is Tier.STANDARD
    assert OpenAIRelationJudge(FakeOpenAI({})).model == chat_model(JUDGEMENT_TASK)


def test_the_stub_satisfies_the_port() -> None:
    assert isinstance(StubRelationJudge(), RelationJudge)


def test_the_stub_rejects_a_value_outside_the_check() -> None:
    with pytest.raises(ValueError):
        StubRelationJudge("merged")


def test_the_stub_judges_none_without_options() -> None:
    judgment = StubRelationJudge().judge("Kafka 운영 경험")

    assert judgment.relation == NO_RELATION
    assert judgment.nearest_dimension_id is None


# ============================================================ OpenAI 어댑터
def _payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "proposed_label": "메시지 브로커 운영",
        "relation": "related",
        "nearest_dimension_id": "dim_queue",
        "rationale": "함께 나타나지만 준비할 것이 다르다",
        "confidence": 0.7,
    }
    payload.update(overrides)
    return payload


def _option() -> tuple[DimensionOption, ...]:
    return (DimensionOption(dimension_id="dim_queue", label="메시지 큐"),)


def test_the_adapter_asks_for_structured_output() -> None:
    client = FakeOpenAI(_payload())

    OpenAIRelationJudge(client).judge("메시지 브로커 운영 경험", _option())

    request = client.requests[0]["response_format"]
    assert request["type"] == "json_schema"
    assert request["json_schema"]["strict"] is True
    assert request["json_schema"]["schema"] == JUDGEMENT_RESPONSE_SCHEMA


def test_the_adapter_returns_the_judged_relation() -> None:
    judge = OpenAIRelationJudge(FakeOpenAI(_payload()))

    judgment = judge.judge("메시지 브로커 운영 경험", _option())

    assert judgment.relation == "related"
    assert judgment.nearest_dimension_id == "dim_queue"


def test_a_dimension_outside_the_options_falls_back_to_none() -> None:
    """없는 차원에 후보를 붙이면 외래키가 끊긴다. 새 후보로 남기는 쪽이 되돌릴 수 있다."""
    judge = OpenAIRelationJudge(FakeOpenAI(_payload(nearest_dimension_id="dim_ghost")))

    judgment = judge.judge("메시지 브로커 운영 경험", _option())

    assert judgment.relation == NO_RELATION
    assert judgment.nearest_dimension_id is None


def test_an_empty_label_falls_back_to_the_expression() -> None:
    judge = OpenAIRelationJudge(FakeOpenAI(_payload(proposed_label="   ")))

    judgment = judge.judge("메시지 브로커 운영 경험", _option())

    assert judgment.proposed_label == "메시지 브로커 운영 경험"


def test_an_empty_expression_is_not_sent() -> None:
    client = FakeOpenAI(_payload())

    with pytest.raises(ValueError):
        OpenAIRelationJudge(client).judge("   ")

    assert client.requests == []


# ============================================================ 식별자
def test_the_same_expression_gives_the_same_candidate() -> None:
    assert candidate_identifier(TAXONOMY_ID, "kafka운영경험") == candidate_identifier(
        TAXONOMY_ID, "kafka운영경험"
    )


def test_a_different_expression_gives_a_different_candidate() -> None:
    assert candidate_identifier(TAXONOMY_ID, "kafka운영경험") != candidate_identifier(
        TAXONOMY_ID, "kafka이해"
    )


def test_the_same_expression_in_two_taxonomies_gives_two_candidates() -> None:
    """백엔드의 배포 자동화와 디자이너의 배포 자동화는 다른 후보다."""
    assert candidate_identifier(TAXONOMY_ID, "배포자동화") != candidate_identifier(
        "tax_designer", "배포자동화"
    )


def test_the_candidate_identifier_carries_its_prefix() -> None:
    assert candidate_identifier(TAXONOMY_ID, "배포자동화").startswith("cand_")


# ============================================================ 이중 경로
def test_a_cold_start_sends_every_expression_to_the_residual_path() -> None:
    """시드가 차원을 만들지 않으므로 첫 실행은 어휘가 비어 있다."""
    store = FakeStats(
        [_mention("mention_1", "Kafka 운영 경험"), _mention("mention_2", "Redis 사용 경험")]
    )

    outcome = CandidateDiscovery(StubRelationJudge(), store).run(_context())

    assert outcome.vocabulary_size == 0
    assert outcome.known_mentions == 0
    assert outcome.residual_mentions == 2
    assert outcome.created_candidates == 2
    assert {c["relation_judgment"] for c in store.candidates} == {NO_RELATION}


def test_a_known_expression_does_not_become_a_candidate() -> None:
    """이미 확정된 차원을 개방 어휘로 다시 발견하지 않는다."""
    store = FakeStats(
        [_mention("mention_1", "메시지큐"), _mention("mention_2", "Redis 사용 경험")],
        [_dimension()],
    )

    outcome = CandidateDiscovery(StubRelationJudge(), store).run(_context())

    assert outcome.known_mentions == 1
    assert outcome.residual_mentions == 1
    assert outcome.known_assignments == (("mention_1", "dim_queue"),)
    assert len(store.candidates) == 1


def test_every_visited_expression_takes_exactly_one_path() -> None:
    store = FakeStats(
        [
            _mention("mention_1", "메시지큐"),
            _mention("mention_2", "Redis 사용 경험"),
            _mention("mention_3", "- ·"),
        ],
        [_dimension()],
    )

    outcome = CandidateDiscovery(StubRelationJudge(), store).run(_context())

    assert outcome.visited_mentions == 3
    assert (
        outcome.known_mentions + outcome.residual_mentions + len(outcome.discarded)
        == outcome.visited_mentions
    )
    assert outcome.discarded == (("mention_3", UNNORMALIZABLE),)


# ============================================================ 표현 묶기
def test_the_same_expression_in_two_postings_makes_one_candidate() -> None:
    """후보 하나에 근거 mention 이 여럿 붙는다."""
    store = FakeStats(
        [
            _mention("mention_1", "Kafka 운영 경험", "pv_1"),
            _mention("mention_2", "kafka 운영경험", "pv_2"),
        ]
    )

    outcome = CandidateDiscovery(StubRelationJudge(), store).run(_context())

    assert outcome.created_candidates == 1
    assert outcome.linked_mentions == 2
    assert {mention for _, mention in store.links} == {"mention_1", "mention_2"}


def test_the_most_common_wording_becomes_the_label() -> None:
    """재실행이 같은 표현을 고르고 라벨이 흔들리지 않는다."""
    store = FakeStats(
        [
            _mention("mention_1", "kafka 운영경험"),
            _mention("mention_2", "Kafka 운영 경험"),
            _mention("mention_3", "Kafka 운영 경험"),
        ]
    )

    CandidateDiscovery(StubRelationJudge(), store).run(_context())

    assert store.candidates[0]["proposed_label"] == "Kafka 운영 경험"


def test_other_wordings_are_given_to_the_judge() -> None:
    judge = StubRelationJudge()
    store = FakeStats(
        [
            _mention("mention_1", "Kafka 운영 경험"),
            _mention("mention_2", "kafka 운영경험"),
        ]
    )

    CandidateDiscovery(judge, store).run(_context())

    expression, _, examples = judge.calls[0]
    assert expression == "Kafka 운영 경험"
    assert examples == ("kafka 운영경험",)


def test_two_close_expressions_stay_two_candidates() -> None:
    """문자열이 가깝다고 하나로 합치지 않는다."""
    store = FakeStats(
        [_mention("mention_1", "C++ 경험"), _mention("mention_2", "C# 경험")]
    )

    outcome = CandidateDiscovery(StubRelationJudge(), store).run(_context())

    assert outcome.created_candidates == 2


# ============================================================ 관계 판정
@pytest.mark.parametrize("relation", ["synonym", "broader", "narrower", "related"])
def test_each_relation_reaches_the_candidate_row(relation: str) -> None:
    store = FakeStats([_mention("mention_1", "메시지 브로커 운영 경험")], [_dimension()])

    outcome = CandidateDiscovery(StubRelationJudge(relation), store).run(_context())

    assert store.candidates[0]["relation_judgment"] == relation
    assert store.candidates[0]["nearest_dimension_id"] == "dim_queue"
    assert outcome.relations == {relation: 1}


def test_a_new_concept_is_stored_without_a_nearest_dimension() -> None:
    store = FakeStats([_mention("mention_1", "Kubernetes 운영")], [_dimension()])

    outcome = CandidateDiscovery(StubRelationJudge(), store).run(_context())

    assert store.candidates[0]["relation_judgment"] == NO_RELATION
    assert store.candidates[0]["nearest_dimension_id"] is None
    assert outcome.relations == {NO_RELATION: 1}


def test_the_relation_judgment_values_match_the_check() -> None:
    assert set(RELATIONS) == {"synonym", "broader", "narrower", "related", "none"}


def test_a_synonym_judgment_still_stays_a_proposal() -> None:
    """판정은 후보를 proposed 로 두는 데 그친다. 승격은 심사를 거친다."""
    store = FakeStats([_mention("mention_1", "메시지 브로커 운영 경험")], [_dimension()])

    CandidateDiscovery(StubRelationJudge("synonym"), store).run(_context())

    assert store.candidates[0]["lifecycle_status"] == PROPOSED


def test_the_judge_only_sees_dimensions_worth_judging() -> None:
    judge = StubRelationJudge()
    store = FakeStats(
        [_mention("mention_1", "Kubernetes 운영")],
        [_dimension(), _dimension("dim_async", "비동기 처리")],
    )

    CandidateDiscovery(judge, store).run(_context())

    assert judge.calls[0][1] == ()


# ============================================================ 저장
@pytest.mark.parametrize(
    "column",
    [
        "candidate_id",
        "taxonomy_id",
        "proposed_label",
        "lifecycle_status",
        "relation_judgment",
        "discovered_in_run_id",
    ],
)
def test_every_not_null_column_is_filled(column: str) -> None:
    store = FakeStats([_mention("mention_1", "Kafka 운영 경험")])

    CandidateDiscovery(StubRelationJudge(), store).run(_context())

    assert store.candidates[0][column] is not None


def test_the_written_tables_are_inside_the_write_scope() -> None:
    """발견이 쓰는 표는 둘뿐이다. 승격과 할당의 표는 이 실행이 건드리지 않는다."""
    assert can_write(Component.AGENT_STATS, "requirement_candidates")
    assert can_write(Component.AGENT_STATS, "requirement_candidate_mentions")


def test_the_candidate_records_the_run_that_found_it() -> None:
    store = FakeStats([_mention("mention_1", "Kafka 운영 경험")])

    CandidateDiscovery(StubRelationJudge(), store).run(_context())

    assert store.candidates[0]["discovered_in_run_id"] == "run_discovery_test"
    assert store.candidates[0]["taxonomy_id"] == TAXONOMY_ID


def test_the_outcome_summarises_each_candidate() -> None:
    store = FakeStats([_mention("mention_1", "메시지 브로커 운영 경험")], [_dimension()])

    outcome: DiscoveryOutcome = CandidateDiscovery(
        StubRelationJudge("related"), store
    ).run(_context())

    summary = outcome.candidates[0]
    assert summary.candidate_id == store.candidates[0]["candidate_id"]
    assert summary.mention_count == 1
    assert summary.rationale
    assert outcome.gained_evidence
    assert outcome.taxonomy_version_id == TAXONOMY_VERSION_ID


# ============================================================ 증분 재실행
def test_a_mention_already_linked_is_skipped() -> None:
    store = FakeStats([_mention("mention_1", "Kafka 운영 경험")])
    store.linked = {"mention_1"}

    outcome = CandidateDiscovery(StubRelationJudge(), store).run(_context())

    assert outcome.skipped_mentions == 1
    assert outcome.created_candidates == 0
    assert store.links == []


def test_a_new_wording_of_an_existing_candidate_only_adds_evidence() -> None:
    """재실행이 판정을 다시 부르지 않는다."""
    judge = StubRelationJudge()
    store = FakeStats([_mention("mention_2", "Kafka 운영 경험")])
    store.existing = {candidate_identifier(TAXONOMY_ID, normalize_expression("Kafka 운영 경험"))}

    outcome = CandidateDiscovery(judge, store).run(_context())

    assert outcome.created_candidates == 0
    assert outcome.reused_candidates == 1
    assert outcome.linked_mentions == 1
    assert judge.calls == []
    assert store.candidates == []


def test_running_twice_creates_the_same_identifiers() -> None:
    first = FakeStats([_mention("mention_1", "Kafka 운영 경험")])
    second = FakeStats([_mention("mention_1", "Kafka 운영 경험")])
    CandidateDiscovery(StubRelationJudge(), first).run(_context())
    CandidateDiscovery(StubRelationJudge(), second).run(_context())

    assert [c["candidate_id"] for c in first.candidates] == [
        c["candidate_id"] for c in second.candidates
    ]


# ============================================================ 종료 조건
def test_no_mention_stops_with_frontier_exhausted() -> None:
    outcome = CandidateDiscovery(StubRelationJudge(), FakeStats([])).run(_context())

    assert outcome.stop_reason is StopReason.FRONTIER_EXHAUSTED


def test_finding_a_candidate_stops_with_slots_filled() -> None:
    store = FakeStats([_mention("mention_1", "Kafka 운영 경험")])

    outcome = CandidateDiscovery(StubRelationJudge(), store).run(_context())

    assert outcome.stop_reason is StopReason.SLOTS_FILLED


def test_only_known_expressions_stop_with_no_new_evidence() -> None:
    store = FakeStats([_mention("mention_1", "메시지큐")], [_dimension()])

    outcome = CandidateDiscovery(StubRelationJudge(), store).run(_context())

    assert outcome.stop_reason is StopReason.NO_NEW_EVIDENCE
    assert not outcome.gained_evidence


def test_a_broken_judge_stops_with_explicit_failure() -> None:
    """구현 결함을 근거 없음으로 보지 않는다."""
    store = FakeStats([_mention("mention_1", "Kafka 운영 경험")])

    outcome = CandidateDiscovery(Exploding(), store).run(_context())

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.errors[0][0] == normalize_expression("Kafka 운영 경험")
    assert store.candidates == []


def test_a_broken_judge_does_not_stop_the_other_candidates() -> None:
    class OnceExploding:
        def __init__(self) -> None:
            self.seen = 0

        def judge(
            self,
            expression: str,
            options: tuple[DimensionOption, ...] = (),
            examples: tuple[str, ...] = (),
        ) -> RelationJudgment:
            self.seen += 1
            if self.seen == 1:
                raise RuntimeError("판정 응답을 읽지 못했다")
            return RelationJudgment(proposed_label=expression)

    store = FakeStats(
        [_mention("mention_1", "Kafka 운영 경험"), _mention("mention_2", "Redis 사용 경험")]
    )

    outcome = CandidateDiscovery(OnceExploding(), store).run(_context())

    assert outcome.created_candidates == 1
    assert len(outcome.errors) == 1


def test_the_budget_stops_the_run() -> None:
    store = FakeStats(
        [
            _mention("mention_1", "Kafka 운영 경험"),
            _mention("mention_2", "Redis 사용 경험"),
            _mention("mention_3", "Kubernetes 운영"),
        ]
    )

    outcome = CandidateDiscovery(StubRelationJudge(), store).run(_context(2))

    assert outcome.judged == 2
    assert outcome.created_candidates == 2
    assert outcome.stop_reason is StopReason.BUDGET_EXHAUSTED


def test_a_missing_taxonomy_is_an_explicit_failure() -> None:
    store = FakeStats([_mention("mention_1", "Kafka 운영 경험")], active={})

    outcome = CandidateDiscovery(StubRelationJudge(), store).run(_context())

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.errors == (("backend", NO_ACTIVE_TAXONOMY),)


def test_a_pinned_version_other_than_the_active_one_is_refused() -> None:
    """버전이 다른 판정을 한 후보 집합에 섞지 않는다."""
    store = FakeStats([_mention("mention_1", "Kafka 운영 경험")])

    outcome = CandidateDiscovery(StubRelationJudge(), store).run(
        _context(taxonomy_version_id="tx_backend_v2")
    )

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.errors == (("backend", TAXONOMY_MISMATCH),)
    assert store.candidates == []
