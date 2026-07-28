"""승격 심사 규칙과 결정 기록 검증.

규칙은 docs/statistics-model.md 3.4, 결정 행의 컬럼은 docs/erd.md 7.9 에서 온다.
저장소를 가짜로 대체하고 판정 차례, 임계값의 출처, 결정 행의 내용만 검사한다.
외부 호출과 데이터베이스 접근은 하지 않는다.
"""

from __future__ import annotations

from datetime import date
from typing import Any

import pytest

from careersignal.contracts import Budget, RunContext, StopReason
from careersignal.domain.permissions import Component, can_write
from careersignal.domain.scope import ScopeLevel
from careersignal.repositories.promotion import PromotionRepository
from careersignal.taxonomy import lifecycle
from careersignal.taxonomy.promotion import (
    EVAL_ABSENT,
    EVAL_CONFLICTING,
    EVAL_MATCHED,
    HOLD,
    MERGE,
    NO_ACTIVE_TAXONOMY,
    POLICIES,
    POLICY_V1,
    PROMOTE,
    REASON_DANGLING_RELATION,
    REASON_EVAL_CONFLICT,
    REASON_FEW_POSTINGS,
    REASON_ALIAS_CONFLICT,
    REASON_MISSING_NEAREST,
    REASON_NO_EVIDENCE,
    REASON_NO_LABEL,
    REASON_SINGLE_COMPANY,
    REASON_UNRELATED_TARGET,
    REJECT,
    ROUTE_ALIAS,
    ROUTE_NEW_DIMENSION,
    ROUTE_NONE,
    ROUTE_RELATION,
    TAXONOMY_MISMATCH,
    TRANSACTION_LOST,
    UNKNOWN_POLICY,
    UNGROUPED_PREFIX,
    CandidateEvidence,
    CandidateReview,
    EvalComparison,
    PromotionPolicy,
    choose_representative,
    compare_with_eval_set,
    decision_identifier,
    decision_row,
    group_candidates,
    hold_alias,
    judge_candidate,
    label_distance,
    label_group_key,
    policy_for,
)

TAXONOMY_ID = "tax_backend"
TAXONOMY_VERSION_ID = "tx_backend_v1"
POLICY_VERSION = "tp_v1"

STRICT = PromotionPolicy(
    taxonomy_policy_version="tp_strict",
    min_independent_postings=3,
    min_independent_companies=3,
)
"""임계값이 정책 버전에서 온다는 것을 보이는 두 번째 정책."""


class UniqueViolation(Exception):
    """기본키 중복. psycopg 의 같은 이름 예외를 이름만 흉내 낸다.

    거래를 죽이는 실패인지의 판정은 예외 클래스 이름과 메시지 문자열만 보므로
    (`repositories/base.py` 의 `is_transaction_fatal`) 대역도 같은 갈래를 지난다.
    """


class InFailedSqlTransaction(Exception):
    """거래가 이미 죽은 뒤의 명령. 이름이 판정의 재료다."""


def _evidence(**overrides: Any) -> CandidateEvidence:
    """임계값을 넉넉히 넘긴 후보. 검사마다 한 값씩 무너뜨린다."""
    values: dict[str, Any] = {
        "candidate_id": "cand_kafka",
        "proposed_label": "Kafka 운영 경험",
        "lifecycle_status": lifecycle.PROPOSED,
        "relation_judgment": "none",
        "independent_posting_count": 4,
        "independent_company_count": 3,
        "representative_sentences": ("Kafka 운영 경험",),
    }
    values.update(overrides)
    return CandidateEvidence(**values)


def _candidate(**overrides: Any) -> dict[str, Any]:
    row: dict[str, Any] = {
        "candidate_id": "cand_kafka",
        "proposed_label": "Kafka 운영 경험",
        "lifecycle_status": lifecycle.PROPOSED,
        "nearest_dimension_id": None,
        "relation_judgment": "none",
        "judged_against_taxonomy_version_id": TAXONOMY_VERSION_ID,
        "judgment_rationale": "기존 차원으로 설명되지 않는다",
        "nearest_label": None,
    }
    row.update(overrides)
    return row


class FakePromotionStore:
    """승격 저장소의 대역. SQL 을 실행하지 않는다."""

    def __init__(
        self,
        candidates: list[dict[str, Any]] | None = None,
        counts: dict[str, tuple[int, int]] | None = None,
        sentences: dict[str, list[str]] | None = None,
        expected: dict[str, Any] | None = None,
        active: dict[str, Any] | None = None,
        mention_counts: dict[str, int] | None = None,
        group_counts: dict[tuple[str, ...], tuple[int, int]] | None = None,
    ) -> None:
        self._candidates = candidates or []
        self._counts = counts or {}
        self._mention_counts = mention_counts or {}
        self._group_counts = group_counts or {}
        self._sentences = sentences or {}
        self._expected = expected or {"eval_set_id": None, "labels": ()}
        self._active = (
            active
            if active is not None
            else {
                "taxonomy_version_id": TAXONOMY_VERSION_ID,
                "taxonomy_id": TAXONOMY_ID,
                "version_number": 1,
                "taxonomy_policy_version": POLICY_VERSION,
            }
        )
        self.decisions: list[dict[str, Any]] = []
        self.lifecycles: list[tuple[str, str]] = []

    # ---------------------------------------------------------- 조회
    def active_taxonomy_version(self, job_role_id: str) -> dict[str, Any] | None:
        return dict(self._active) if self._active else None

    def candidates_to_review(
        self,
        taxonomy_id: str,
        taxonomy_version_id: str,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """이 버전에서 이미 결정을 받은 후보를 뺀다. 실제 저장소와 같은 규칙이다."""
        recorded = {row["decision_id"] for row in self.decisions}
        rows = [
            row
            for row in self._candidates
            if decision_identifier(row["candidate_id"], taxonomy_version_id)
            not in recorded
        ]
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
        return dict(self._expected)

    # ---------------------------------------------------------- 쓰기
    def add_decision(self, values: dict[str, Any]) -> None:
        """기본키 중복을 실제 데이터베이스처럼 막는다.

        `requirement_candidate_decisions.decision_id` 가 기본키다. 대역이 중복을
        받아 주면 실행 로그의 `UniqueViolation` 을 재현하지 못한다.
        """
        if any(row["decision_id"] == values["decision_id"] for row in self.decisions):
            raise UniqueViolation(
                "duplicate key value violates unique constraint "
                '"requirement_candidate_decisions_pkey"'
            )
        self.decisions.append(values)

    def set_candidate_lifecycle(self, candidate_id: str, lifecycle_status: str) -> None:
        self.lifecycles.append((candidate_id, lifecycle_status))


def _context(taxonomy_version_id: str | None = None) -> RunContext:
    return RunContext(
        agent_run_id="run_promotion_test",
        analysis_version="an_promotion_test",
        dataset_version="ds_test",
        taxonomy_version_id=taxonomy_version_id,
        job_role_id="backend",
        scope_level=ScopeLevel.OVERALL,
        as_of_date=date(2026, 7, 28),
        budget=Budget(),
    )


# ============================================================ 정책
def test_the_v1_policy_asks_for_two_postings_and_two_companies() -> None:
    assert POLICY_V1.min_independent_postings == 2
    assert POLICY_V1.min_independent_companies == 2
    assert POLICY_V1.taxonomy_policy_version == POLICY_VERSION


def test_the_registered_policy_answers_by_version() -> None:
    assert policy_for(POLICY_VERSION) is POLICY_V1


def test_an_unregistered_policy_version_is_not_guessed() -> None:
    """기본값으로 넘어가면 어떤 임계값으로 심사했는지 결정 행이 말하지 못한다."""
    with pytest.raises(KeyError):
        policy_for("tp_missing")


def test_a_policy_is_frozen() -> None:
    with pytest.raises(Exception):
        POLICY_V1.min_independent_companies = 1  # type: ignore[misc]


def test_the_threshold_comes_from_the_policy_not_the_code() -> None:
    """같은 근거가 정책 버전에 따라 다른 판정을 받는다."""
    evidence = _evidence(independent_posting_count=2, independent_company_count=2)

    assert judge_candidate(evidence, POLICY_V1).decision == PROMOTE
    assert judge_candidate(evidence, STRICT).decision == HOLD


def test_the_decision_records_the_policy_version_it_used() -> None:
    decision = judge_candidate(_evidence(), STRICT)

    assert decision.taxonomy_policy_version == "tp_strict"


# ============================================================ 임계값
def test_a_candidate_seen_at_one_company_is_not_promoted() -> None:
    """한 회사에서만 나타나는 표현은 그 회사의 특징이며 편차 해석이 다룬다."""
    evidence = _evidence(independent_posting_count=5, independent_company_count=1)

    decision = judge_candidate(evidence, POLICY_V1)

    assert decision.decision == HOLD
    assert decision.reason == REASON_SINGLE_COMPANY
    assert decision.route == ROUTE_NONE


def test_a_candidate_seen_at_two_companies_is_promoted() -> None:
    evidence = _evidence(independent_posting_count=2, independent_company_count=2)

    assert judge_candidate(evidence, POLICY_V1).decision == PROMOTE


def test_too_few_postings_hold_before_the_company_count_is_read() -> None:
    evidence = _evidence(independent_posting_count=1, independent_company_count=1)

    decision = judge_candidate(evidence, POLICY_V1)

    assert decision.decision == HOLD
    assert decision.reason == REASON_FEW_POSTINGS


def test_a_candidate_without_representative_sentences_is_held() -> None:
    evidence = _evidence(representative_sentences=())

    decision = judge_candidate(evidence, POLICY_V1)

    assert decision.decision == HOLD
    assert decision.reason == REASON_NO_EVIDENCE


# ============================================================ 기각
def test_an_empty_label_is_rejected() -> None:
    decision = judge_candidate(_evidence(proposed_label="   "), POLICY_V1)

    assert decision.decision == REJECT
    assert decision.reason == REASON_NO_LABEL


def test_a_relation_without_a_target_is_rejected() -> None:
    """근거가 쌓여도 짝이 맞지 않는 판정은 그대로다."""
    decision = judge_candidate(
        _evidence(relation_judgment="synonym", nearest_dimension_id=None), POLICY_V1
    )

    assert decision.decision == REJECT
    assert decision.reason == REASON_DANGLING_RELATION


def test_no_relation_pointing_at_a_dimension_is_rejected() -> None:
    decision = judge_candidate(
        _evidence(relation_judgment="none", nearest_dimension_id="dim_queue"),
        POLICY_V1,
    )

    assert decision.decision == REJECT
    assert decision.reason == REASON_UNRELATED_TARGET


def test_a_target_missing_from_the_active_version_is_held() -> None:
    """판정이 다른 버전 기준으로 나왔고 그 사이 상대 차원이 사라진 경우다."""
    decision = judge_candidate(
        _evidence(
            relation_judgment="synonym",
            nearest_dimension_id="dim_gone",
            nearest_label=None,
        ),
        POLICY_V1,
    )

    assert decision.decision == HOLD
    assert decision.reason == REASON_MISSING_NEAREST


# ============================================================ 경로
def test_a_synonym_becomes_an_alias() -> None:
    decision = judge_candidate(
        _evidence(
            relation_judgment="synonym",
            nearest_dimension_id="dim_queue",
            nearest_label="메시지 큐",
        ),
        POLICY_V1,
    )

    assert decision.decision == MERGE
    assert decision.route == ROUTE_ALIAS
    assert decision.target_lifecycle == lifecycle.MERGED


@pytest.mark.parametrize("relation", ["broader", "narrower", "related"])
def test_a_hierarchy_or_related_judgment_promotes_with_a_relation(
    relation: str,
) -> None:
    decision = judge_candidate(
        _evidence(
            relation_judgment=relation,
            nearest_dimension_id="dim_queue",
            nearest_label="메시지 큐",
        ),
        POLICY_V1,
    )

    assert decision.decision == PROMOTE
    assert decision.route == ROUTE_RELATION


def test_a_new_concept_promotes_as_a_dimension() -> None:
    decision = judge_candidate(_evidence(), POLICY_V1)

    assert decision.decision == PROMOTE
    assert decision.route == ROUTE_NEW_DIMENSION
    assert decision.target_lifecycle == lifecycle.ACTIVE


def test_only_promote_and_merge_enter_the_taxonomy() -> None:
    promoted = judge_candidate(_evidence(), POLICY_V1)
    held = judge_candidate(_evidence(independent_company_count=1), POLICY_V1)

    assert promoted.enters_taxonomy
    assert not held.enters_taxonomy
    assert held.target_lifecycle == lifecycle.COLLECTING_EVIDENCE


# ============================================================ 평가 세트 대조
def test_a_label_the_eval_set_does_not_carry_is_absent_not_a_conflict() -> None:
    """평가 세트는 전량을 담지 않는다."""
    comparison = compare_with_eval_set("Kafka 운영 경험", "none", ("메시지 큐",))

    assert comparison.status == EVAL_ABSENT
    assert comparison.matched_labels == ()


def test_a_label_the_eval_set_carries_matches() -> None:
    comparison = compare_with_eval_set("메시지큐", "none", ("메시지 큐",))

    assert comparison.status == EVAL_MATCHED
    assert comparison.matched_labels == ("메시지 큐",)


def test_folding_a_separate_expected_dimension_into_an_alias_conflicts() -> None:
    comparison = compare_with_eval_set("메시지 큐", "synonym", ("메시지 큐",))

    assert comparison.status == EVAL_CONFLICTING


def test_a_conflicting_comparison_holds_instead_of_merging() -> None:
    """판정이 틀렸을 수 있으므로 기각하지 않고 사람이 본다."""
    decision = judge_candidate(
        _evidence(
            relation_judgment="synonym",
            nearest_dimension_id="dim_queue",
            nearest_label="메시지 큐",
            eval_comparison=EvalComparison(
                eval_set_id="eval_backend_dimensions_v1",
                status=EVAL_CONFLICTING,
                matched_labels=("메시지 큐",),
            ),
        ),
        POLICY_V1,
    )

    assert decision.decision == HOLD
    assert decision.reason == REASON_EVAL_CONFLICT


def test_a_draft_eval_set_is_still_used_for_comparison() -> None:
    """세트가 사람 확정 전이어도 대조에 쓴다. 릴리스 게이트 판정은 별도 단위다."""
    comparison = compare_with_eval_set(
        "메시지 큐", "none", ("메시지 큐",), "eval_backend_dimensions_v1", True
    )

    assert comparison.is_draft
    assert comparison.status == EVAL_MATCHED
    assert comparison.as_json()["is_draft"] is True


def test_an_unknown_comparison_status_is_refused() -> None:
    with pytest.raises(Exception):
        EvalComparison(status="unknown")


# ============================================================ 거리
def test_the_distance_is_empty_without_a_neighbour() -> None:
    assert label_distance("Kafka 운영 경험", None) is None


def test_the_same_label_has_no_distance() -> None:
    assert label_distance("메시지 큐", "메시지큐") == 0.0


def test_a_different_label_has_a_distance() -> None:
    assert label_distance("Kubernetes", "메시지 큐") == 1.0


def test_the_distance_fits_the_numeric_column() -> None:
    """`distance_to_existing` 은 numeric(6,5) 다."""
    value = label_distance("메시지 브로커", "메시지 큐")

    assert value is not None
    assert 0.0 <= value <= 1.0
    assert len(str(value).split(".")[1]) <= 5


# ============================================================ 결정 행
def test_the_decision_row_fills_every_not_null_column() -> None:
    evidence = _evidence()
    decision = judge_candidate(evidence, POLICY_V1)

    row = decision_row(decision, evidence, "run_promotion_test", "tx_backend_v2")

    for column in (
        "decision_id",
        "candidate_id",
        "decision",
        "independent_posting_count",
        "independent_company_count",
        "representative_sentences",
        "decided_by",
        "taxonomy_policy_version",
    ):
        assert row[column] is not None


def test_a_promote_row_carries_the_version_it_entered() -> None:
    """CHECK (decision <> 'promote' OR promoted_to_version_id IS NOT NULL) 다."""
    evidence = _evidence()
    decision = judge_candidate(evidence, POLICY_V1)

    row = decision_row(decision, evidence, "run_promotion_test", "tx_backend_v2")

    assert row["decision"] == PROMOTE
    assert row["promoted_to_version_id"] == "tx_backend_v2"


def test_the_decision_row_carries_the_recorded_evidence() -> None:
    evidence = _evidence(
        representative_sentences=("Kafka 운영 경험", "kafka 운영경험"),
        nearest_dimension_id="dim_queue",
        nearest_label="메시지 큐",
        relation_judgment="related",
    )
    decision = judge_candidate(evidence, POLICY_V1)

    row = decision_row(decision, evidence, "run_promotion_test", "tx_backend_v2")

    assert row["representative_sentences"] == ["Kafka 운영 경험", "kafka 운영경험"]
    assert row["relation_judgment"] == "related"
    assert row["standard_mapping_status"] == "unmapped"
    assert row["distance_to_existing"] is not None
    assert row["eval_set_comparison"]["status"] == EVAL_ABSENT


def test_the_decision_row_names_the_run_that_decided() -> None:
    evidence = _evidence()
    decision = judge_candidate(evidence, POLICY_V1)

    row = decision_row(decision, evidence, "run_promotion_test", "tx_backend_v2")

    assert row["decided_by"] == "agent_stats:run_promotion_test"


def test_the_same_version_gives_the_same_decision_identifier() -> None:
    """같은 버전에서 다시 심사하면 같은 행이다. 실행 식별자는 재료가 아니다."""
    assert decision_identifier("cand_kafka", "tx_backend_v1") == decision_identifier(
        "cand_kafka", "tx_backend_v1"
    )


def test_a_new_version_gives_a_new_decision_identifier() -> None:
    """새 버전에서 심사하면 새 행이다. 후보당 여러 행이 허용된다(docs/erd.md 7.9)."""
    assert decision_identifier("cand_kafka", "tx_backend_v1") != decision_identifier(
        "cand_kafka", "tx_backend_v2"
    )


def test_the_decision_identifier_follows_the_review_basis_version() -> None:
    """결정 식별자는 심사 기준 버전을 따른다. 발행된 새 버전이 아니다."""
    evidence = _evidence(reviewed_against_taxonomy_version_id="tx_backend_v1")
    decision = judge_candidate(evidence, POLICY_V1)
    row = decision_row(decision, evidence, "run_promotion_test", "tx_backend_v2")
    assert row["decision_id"] == decision_identifier("cand_kafka", "tx_backend_v1")


# ============================================================ 재심사
def test_the_same_version_never_reviews_the_same_candidate_twice() -> None:
    """실행 로그의 `UniqueViolation` 갈래다. 두 번째 실행이 같은 행을 다시 넣지 않는다."""
    store = FakePromotionStore([_candidate()], counts={"cand_kafka": (1, 1)})
    review = CandidateReview(store)

    first = review.run(_context())
    assert first.counts.get(HOLD) == 1
    assert len(store.decisions) == 1

    second = review.run(_context())
    assert second.reviewed == 0
    assert second.errors == ()
    assert len(store.decisions) == 1


def test_a_new_version_reviews_the_held_candidate_again() -> None:
    """새 버전이 발행되면 보류 후보가 다시 올라오고 결정 행이 하나 더 남는다."""
    store = FakePromotionStore([_candidate()], counts={"cand_kafka": (1, 1)})
    review = CandidateReview(store)
    review.run(_context())

    store._active = {
        "taxonomy_version_id": "tx_backend_v2",
        "taxonomy_id": TAXONOMY_ID,
        "version_number": 2,
        "taxonomy_policy_version": POLICY_VERSION,
    }
    again = review.run(_context())

    assert again.reviewed == 1
    assert len(store.decisions) == 2
    assert store.decisions[0]["decision_id"] != store.decisions[1]["decision_id"]


# ============================================================ 저장 실패
class BrokenStore(FakePromotionStore):
    """정해진 후보의 저장만 실패하는 대역."""

    def __init__(self, *args: Any, failing: str = "", fatal: bool = False, **kw: Any):
        super().__init__(*args, **kw)
        self._failing = failing
        self._fatal = fatal
        self.attempts: list[str] = []

    def add_decision(self, values: dict[str, Any]) -> None:
        self.attempts.append(values["candidate_id"])
        if values["candidate_id"] == self._failing:
            raise UniqueViolation("duplicate key value violates unique constraint")
        if self._fatal and self.attempts[0] != values["candidate_id"]:
            raise InFailedSqlTransaction(
                "current transaction is aborted, commands ignored until end of "
                "transaction block"
            )
        super().add_decision(values)


def _held(candidate_id: str, label: str) -> dict[str, Any]:
    """임계값에 못 미쳐 보류가 되는 후보 한 줄."""
    return _candidate(candidate_id=candidate_id, proposed_label=label)


def test_one_failed_save_does_not_block_the_next_candidate() -> None:
    """한 항목의 실패가 뒤 항목의 저장을 막지 않는다."""
    rows = [_held(f"cand_{i}", f"요구 {i}") for i in range(4)]
    counts = {row["candidate_id"]: (1, 1) for row in rows}
    store = BrokenStore(rows, counts=counts, failing="cand_1")

    outcome = CandidateReview(store).run(_context())

    saved = [row["candidate_id"] for row in store.decisions]
    assert saved == ["cand_0", "cand_2", "cand_3"]
    assert len(outcome.errors) == 1


def test_a_dead_transaction_stops_instead_of_repeating_the_same_reason() -> None:
    """거래를 죽이는 오류를 만나면 같은 사유가 후보 수만큼 반복되지 않는다."""
    rows = [_held(f"cand_{i}", f"요구 {i}") for i in range(300)]
    counts = {row["candidate_id"]: (1, 1) for row in rows}
    store = BrokenStore(rows, counts=counts, fatal=True)

    outcome = CandidateReview(store).run(_context())

    reasons = [reason for _, reason in outcome.errors]
    assert TRANSACTION_LOST in reasons
    assert len(outcome.errors) <= 4
    assert len(store.attempts) <= 3
    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE


# ============================================================ 심사 실행
def test_the_review_records_a_hold_without_waiting_for_a_version() -> None:
    store = FakePromotionStore(
        [_candidate()], counts={"cand_kafka": (1, 1)}
    )

    outcome = CandidateReview(store).run(_context())

    assert outcome.counts == {HOLD: 1}
    assert outcome.recorded == 1
    assert store.decisions[0]["decision"] == HOLD
    assert store.decisions[0]["promoted_to_version_id"] is None


def test_the_review_leaves_the_promote_row_to_the_publication() -> None:
    """`promoted_to_version_id` 가 없으면 CHECK 제약을 어긴다."""
    store = FakePromotionStore([_candidate()])

    outcome = CandidateReview(store).run(_context())

    assert outcome.counts == {PROMOTE: 1}
    assert outcome.recorded == 0
    assert store.decisions == []
    assert outcome.promotable[0].candidate_id == "cand_kafka"


def test_a_held_candidate_moves_to_collecting_evidence() -> None:
    store = FakePromotionStore([_candidate()], counts={"cand_kafka": (1, 1)})

    CandidateReview(store).run(_context())

    assert store.lifecycles == [("cand_kafka", lifecycle.COLLECTING_EVIDENCE)]


def test_a_candidate_already_collecting_evidence_is_not_moved_again() -> None:
    store = FakePromotionStore(
        [_candidate(lifecycle_status=lifecycle.COLLECTING_EVIDENCE)],
        counts={"cand_kafka": (1, 1)},
    )

    CandidateReview(store).run(_context())

    assert store.lifecycles == []


def test_a_rejected_candidate_is_deprecated() -> None:
    store = FakePromotionStore([_candidate(proposed_label="  ")])

    CandidateReview(store).run(_context())

    assert store.lifecycles == [("cand_kafka", lifecycle.DEPRECATED)]


def test_the_review_reads_the_policy_from_the_active_version(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """임계값은 코드가 아니라 활성 버전이 적은 정책 버전에서 온다."""
    monkeypatch.setitem(POLICIES, STRICT.taxonomy_policy_version, STRICT)
    store = FakePromotionStore(
        [_candidate()],
        counts={"cand_kafka": (2, 2)},
        active={
            "taxonomy_version_id": TAXONOMY_VERSION_ID,
            "taxonomy_id": TAXONOMY_ID,
            "version_number": 1,
            "taxonomy_policy_version": STRICT.taxonomy_policy_version,
        },
    )

    outcome = CandidateReview(store).run(_context())

    assert outcome.taxonomy_policy_version == STRICT.taxonomy_policy_version
    assert outcome.counts == {HOLD: 1}


def test_an_unknown_policy_version_stops_the_review() -> None:
    store = FakePromotionStore(
        [_candidate()],
        active={
            "taxonomy_version_id": TAXONOMY_VERSION_ID,
            "taxonomy_id": TAXONOMY_ID,
            "version_number": 1,
            "taxonomy_policy_version": "tp_missing",
        },
    )

    outcome = CandidateReview(store).run(_context())

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.errors == (("backend", UNKNOWN_POLICY),)
    assert store.decisions == []


def test_a_missing_taxonomy_is_an_explicit_failure() -> None:
    store = FakePromotionStore([_candidate()], active={})

    outcome = CandidateReview(store).run(_context())

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.errors == (("backend", NO_ACTIVE_TAXONOMY),)


def test_a_pinned_version_other_than_the_active_one_is_refused() -> None:
    store = FakePromotionStore([_candidate()])

    outcome = CandidateReview(store).run(_context("tx_backend_v9"))

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.errors == (("backend", TAXONOMY_MISMATCH),)
    assert store.decisions == []


def test_no_candidate_stops_with_frontier_exhausted() -> None:
    outcome = CandidateReview(FakePromotionStore([])).run(_context())

    assert outcome.stop_reason is StopReason.FRONTIER_EXHAUSTED


def test_only_holds_stop_with_no_new_evidence() -> None:
    store = FakePromotionStore([_candidate()], counts={"cand_kafka": (1, 1)})

    outcome = CandidateReview(store).run(_context())

    assert outcome.stop_reason is StopReason.NO_NEW_EVIDENCE
    assert not outcome.gained_evidence


def test_a_promotable_candidate_stops_with_slots_filled() -> None:
    outcome = CandidateReview(FakePromotionStore([_candidate()])).run(_context())

    assert outcome.stop_reason is StopReason.SLOTS_FILLED
    assert outcome.gained_evidence


def test_a_stale_judgment_is_counted() -> None:
    store = FakePromotionStore(
        [_candidate(judged_against_taxonomy_version_id="tx_backend_v0")]
    )

    outcome = CandidateReview(store).run(_context())

    assert outcome.stale_judgments == 1


def test_the_evidence_travels_with_the_decision() -> None:
    """발행이 같은 실행에서 두 번 세지 않는다."""
    store = FakePromotionStore(
        [_candidate()], sentences={"cand_kafka": ["Kafka 운영 경험"]}
    )

    outcome = CandidateReview(store).run(_context())

    evidence = outcome.evidence_by_id["cand_kafka"]
    assert evidence.representative_sentences == ("Kafka 운영 경험",)
    assert evidence.judgment_rationale == "기존 차원으로 설명되지 않는다"


def test_one_broken_group_does_not_stop_the_others() -> None:
    """묶음 하나가 깨져도 다른 묶음의 심사는 끝까지 간다."""

    class Broken(FakePromotionStore):
        def representative_sentences(
            self, candidate_id: str, dataset_version: str, limit: int
        ) -> list[str]:
            if candidate_id == "cand_broken":
                raise RuntimeError("근거를 읽지 못했다")
            return super().representative_sentences(
                candidate_id, dataset_version, limit
            )

    store = Broken(
        [
            _candidate(candidate_id="cand_broken", proposed_label="Redis 운영 경험"),
            _candidate(),
        ]
    )

    outcome = CandidateReview(store).run(_context())

    assert outcome.reviewed == 1
    assert len(outcome.errors) == 1
    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE


# ============================================================ 저장 경로
def test_the_written_tables_are_inside_the_write_scope() -> None:
    for table in (
        "requirement_candidate_decisions",
        "requirement_candidates",
        "requirement_taxonomy_versions",
        "requirement_dimensions",
        "requirement_dimension_versions",
        "requirement_aliases",
        "requirement_dimension_relations",
    ):
        assert can_write(Component.AGENT_STATS, table)


def test_the_repository_belongs_to_the_statistics_agent() -> None:
    assert PromotionRepository.component is Component.AGENT_STATS


def test_the_company_count_is_deduplicated_by_company_not_by_posting() -> None:
    """공고 수를 회사 수로 대신 쓰면 한 회사의 특징이 차원으로 승격된다."""
    sql = PromotionRepository._CANDIDATE_EVIDENCE

    assert "count(DISTINCT p.company_id)" in sql
    assert "count(DISTINCT pv.posting_id)" in sql


def test_the_evidence_is_counted_through_postings_only() -> None:
    """A 계층 자료만 센다. 공고로 등록되지 않은 출처는 어느 쪽에도 없다."""
    sql = PromotionRepository._CANDIDATE_EVIDENCE

    assert "JOIN posting_versions pv" in sql
    assert "JOIN postings p" in sql
    assert "LEFT JOIN" not in sql


def test_a_candidate_with_a_terminal_decision_is_not_reviewed_again() -> None:
    sql = PromotionRepository._CANDIDATES_TO_REVIEW

    assert "d.decision <> 'hold'" in sql


class FakeUnit:
    """조회 결과만 돌려주는 거래 대역. SQL 을 실행하지 않는다."""

    component = Component.AGENT_STATS

    def __init__(self, candidates: list[dict[str, Any]], decision_ids: list[str]):
        self._candidates = candidates
        self._decision_ids = decision_ids

    def fetch_all(self, sql: str, params: Any = None) -> list[dict[str, Any]]:
        if "SELECT d.decision_id" in sql:
            return [{"decision_id": value} for value in self._decision_ids]
        return list(self._candidates)


def test_the_repository_drops_candidates_already_decided_in_this_version() -> None:
    """조회가 걸러야 심사도 세는 자리도 같은 수를 본다."""
    rows = [{"candidate_id": "cand_a"}, {"candidate_id": "cand_b"}]
    unit = FakeUnit(rows, [decision_identifier("cand_a", TAXONOMY_VERSION_ID)])
    repository = PromotionRepository(unit)  # type: ignore[arg-type]

    left = repository.candidates_to_review(TAXONOMY_ID, TAXONOMY_VERSION_ID)

    assert [row["candidate_id"] for row in left] == ["cand_b"]


def test_the_repository_keeps_candidates_decided_in_another_version() -> None:
    """새 버전에서는 같은 후보가 다시 올라온다."""
    rows = [{"candidate_id": "cand_a"}]
    unit = FakeUnit(rows, [decision_identifier("cand_a", TAXONOMY_VERSION_ID)])
    repository = PromotionRepository(unit)  # type: ignore[arg-type]

    left = repository.candidates_to_review(TAXONOMY_ID, "tx_backend_v2")

    assert [row["candidate_id"] for row in left] == ["cand_a"]


# ============================================================ 라벨 묶음
def test_two_wordings_of_one_concept_share_a_group_key() -> None:
    """개념 이름이 같으면 표현이 달라도 한 묶음이다."""
    assert label_group_key("Java", "cand_a") == label_group_key("java", "cand_b")


def test_a_label_that_normalises_to_nothing_stands_alone() -> None:
    """기호만 남은 이름을 한 묶음으로 모으면 무관한 후보가 한 대표 아래 접힌다."""
    left = label_group_key("···", "cand_a")
    right = label_group_key("---", "cand_b")

    assert left != right
    assert left.startswith(UNGROUPED_PREFIX)


def test_the_representative_is_the_candidate_with_the_most_mentions() -> None:
    assert choose_representative([("cand_b", 1), ("cand_a", 5)]) == "cand_a"


def test_a_tie_on_mentions_is_broken_by_the_identifier() -> None:
    """재실행이 같은 대표를 골라야 대표가 만드는 `dimension_id` 가 흔들리지 않는다."""
    assert choose_representative([("cand_b", 3), ("cand_a", 3)]) == "cand_a"
    assert choose_representative([("cand_a", 3), ("cand_b", 3)]) == "cand_a"


def test_grouping_is_deterministic_whatever_the_row_order() -> None:
    rows = [
        _candidate(candidate_id="cand_b", proposed_label="Java"),
        _candidate(candidate_id="cand_a", proposed_label="자바"),
        _candidate(candidate_id="cand_c", proposed_label="java"),
    ]
    counts = {"cand_a": 2, "cand_b": 2, "cand_c": 9}

    forward = group_candidates(rows, counts)
    backward = group_candidates(list(reversed(rows)), counts)

    assert forward == backward
    java = next(g for g in forward if g.group_key == "java")
    assert java.member_ids == ("cand_c", "cand_b")
    assert java.representative_id == "cand_c"


def test_a_group_counts_its_postings_and_companies_together() -> None:
    """후보마다 세면 표기가 갈린 근거가 나뉘어 어느 쪽도 임계값을 넘지 못한다."""
    store = FakePromotionStore(
        [
            _candidate(
                candidate_id="cand_java_a",
                proposed_label="Java",
            ),
            _candidate(
                candidate_id="cand_java_b",
                proposed_label="Java",
            ),
        ],
        counts={"cand_java_a": (1, 1), "cand_java_b": (1, 1)},
        group_counts={("cand_java_a", "cand_java_b"): (2, 2)},
        mention_counts={"cand_java_a": 3, "cand_java_b": 1},
    )

    outcome = CandidateReview(store).run(_context())

    assert len(outcome.groups) == 1
    assert outcome.grouped_candidates == 2
    lead = outcome.decisions[0]
    assert lead.candidate_id == "cand_java_a"
    assert lead.decision == PROMOTE
    assert lead.independent_posting_count == 2
    assert lead.independent_company_count == 2


def test_the_rest_of_a_group_becomes_an_alias_of_the_representative() -> None:
    store = FakePromotionStore(
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

    outcome = CandidateReview(store).run(_context())

    member = outcome.decisions[1]
    assert member.candidate_id == "cand_java_b"
    assert member.decision == MERGE
    assert member.route == ROUTE_ALIAS
    assert member.alias_of_candidate_id == "cand_java_a"
    assert member.alias_text == "자바 백엔드 경험"


def test_a_group_below_the_threshold_holds_every_member() -> None:
    """하나만 보류하고 나머지를 승격하면 같은 개념이 차원 여럿으로 갈린다."""
    store = FakePromotionStore(
        [
            _candidate(candidate_id="cand_java_a", proposed_label="Java"),
            _candidate(candidate_id="cand_java_b", proposed_label="Java"),
        ],
        counts={"cand_java_a": (1, 1), "cand_java_b": (1, 1)},
        mention_counts={"cand_java_a": 3, "cand_java_b": 1},
    )

    outcome = CandidateReview(store).run(_context())

    assert [d.decision for d in outcome.decisions] == [HOLD, HOLD]
    assert {d.reason for d in outcome.decisions} == {REASON_FEW_POSTINGS}
    assert outcome.recorded == 2


def test_every_member_of_a_group_keeps_its_own_decision_row() -> None:
    """후보는 발견의 기록이다. 묶었다고 결정 행을 합치지 않는다."""
    store = FakePromotionStore(
        [
            _candidate(candidate_id="cand_java_a", proposed_label="Java"),
            _candidate(candidate_id="cand_java_b", proposed_label="Java"),
        ],
        counts={"cand_java_a": (1, 1), "cand_java_b": (1, 1)},
        mention_counts={"cand_java_a": 3, "cand_java_b": 1},
    )

    CandidateReview(store).run(_context())

    assert [row["candidate_id"] for row in store.decisions] == [
        "cand_java_a",
        "cand_java_b",
    ]


def test_a_member_without_a_sentence_is_held_not_merged() -> None:
    """별칭을 만들 수 없는 후보를 `merged` 로 끝내면 그 근거가 어디에도 닿지 않는다."""
    store = FakePromotionStore(
        [
            _candidate(candidate_id="cand_java_a", proposed_label="Java"),
            _candidate(candidate_id="cand_java_b", proposed_label="Java"),
        ],
        sentences={"cand_java_a": ["Java 개발 경험"], "cand_java_b": []},
        mention_counts={"cand_java_a": 3, "cand_java_b": 1},
    )

    outcome = CandidateReview(store).run(_context())

    member = outcome.decisions[1]
    assert member.candidate_id == "cand_java_b"
    assert member.decision == HOLD
    assert member.reason == REASON_NO_EVIDENCE


def test_a_broken_member_is_rejected_without_taking_the_group_down() -> None:
    """결격은 후보마다의 성질이다. 묶음의 판단을 기다리지 않는다."""
    store = FakePromotionStore(
        [
            _candidate(candidate_id="cand_java_a", proposed_label="Java"),
            _candidate(
                candidate_id="cand_java_b",
                proposed_label="Java",
                relation_judgment="none",
                nearest_dimension_id="dim_queue",
                nearest_label="메시지 큐",
            ),
        ],
        mention_counts={"cand_java_a": 3, "cand_java_b": 1},
    )

    outcome = CandidateReview(store).run(_context())

    by_id = {d.candidate_id: d for d in outcome.decisions}
    assert by_id["cand_java_b"].decision == REJECT
    assert by_id["cand_java_b"].reason == REASON_UNRELATED_TARGET
    assert by_id["cand_java_a"].decision == PROMOTE


def test_the_decision_carries_the_group_key() -> None:
    store = FakePromotionStore([_candidate(proposed_label="Java")])

    outcome = CandidateReview(store).run(_context())

    assert outcome.decisions[0].group_key == "java"


def test_the_dimension_kind_travels_from_the_candidate_row() -> None:
    store = FakePromotionStore(
        [_candidate(proposed_dimension_kind="technology")]
    )

    outcome = CandidateReview(store).run(_context())

    assert outcome.decisions[0].proposed_dimension_kind == "technology"


def test_an_alias_conflict_turns_a_merge_into_a_hold() -> None:
    """기각이 아니다. 다음 버전에서 앞선 표기가 사라지면 결론이 바뀔 수 있다."""
    merged = judge_candidate(
        _evidence(
            relation_judgment="synonym",
            nearest_dimension_id="dim_queue",
            nearest_label="메시지 큐",
        ),
        POLICY_V1,
    )

    held = hold_alias(merged)

    assert merged.decision == MERGE
    assert held.decision == HOLD
    assert held.reason == REASON_ALIAS_CONFLICT
    assert held.route == ROUTE_NONE
    assert held.target_lifecycle == lifecycle.COLLECTING_EVIDENCE


def test_the_group_evidence_counts_a_list_of_candidates() -> None:
    """SQL 이 후보 목록 전체에 `DISTINCT` 를 건다."""
    sql = PromotionRepository._CANDIDATE_EVIDENCE

    assert "cm.candidate_id = ANY(%(candidate_ids)s)" in sql
