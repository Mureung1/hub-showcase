"""검색 결과에서 근거 집합을 조립하는 층의 검증.

`graph/evidence.py` 의 판정 자체는 `test_evidence_set.py` 가 검사한다. 여기서는
융합 후보를 판정 대상으로 옮기는 변환, 판정 순서가 유지되는지, 그리고 이 층이
더하는 독립 회사 하한 판정을 본다. 데이터베이스에 붙지 않는다.
"""

from __future__ import annotations

from careersignal.contracts.evidence import RetrievalStrategy
from careersignal.contracts.objective import EvidenceSlot, ObjectiveContract
from careersignal.domain.source_policy import AllowedUse, SourceTier
from careersignal.graph.evidence import (
    NO_POSTING_ANCHOR,
    REASON_DUPLICATE_TARGET,
    REASON_TIER_OUT_OF_SCOPE,
)
from careersignal.retrieval.evidence_set import (
    REASON_COMPANY_MINIMUM,
    REASON_SLOT_MINIMUM,
    assemble,
    assemble_from_fused,
    candidate_identifier,
    option_from_fused,
    options_from,
    slot_companies,
    unmet_company_minimums,
)
from careersignal.retrieval.fusion import FusedCandidate

QUERY = "rq_test"

POSTING_SLOT = EvidenceSlot(
    slot="cluster_support",
    support_type="posting_evidence",
    minimum=2,
    minimum_independent_companies=2,
)


def _objective(*slots: EvidenceSlot) -> ObjectiveContract:
    return ObjectiveContract(
        objective_id="obj_1",
        objective="기업군 편차 해석",
        required_evidence_slots=slots or (POSTING_SLOT,),
    )


def _fused(
    target_id: str,
    fusion_score: float = 0.5,
    tier: str | None = "A",
    company_id: str | None = "co_1",
    snapshot_id: str | None = None,
    reliability_score: float | None = None,
    lexical_score: float | None = 1.5,
) -> FusedCandidate:
    payload: dict[str, object] = {"section": "requirements"}
    if tier is not None:
        payload["source_tier"] = tier
    if company_id is not None:
        payload["company_id"] = company_id
    if snapshot_id is not None:
        payload["snapshot_id"] = snapshot_id
    if reliability_score is not None:
        payload["reliability_score"] = reliability_score
    return FusedCandidate(
        target_id=target_id,
        fusion_score=fusion_score,
        strategy_ranks={"keyword": 1},
        strategy_scores={"keyword": lexical_score},
        lexical_score=lexical_score,
        payload=payload,
    )


# ============================================================ 변환
def test_융합_후보가_계측_행의_모양으로_옮겨진다():
    option = option_from_fused(_fused("chunk_1", fusion_score=0.25), QUERY, 3)

    candidate = option.candidate
    assert candidate.target_type == "chunk"
    assert candidate.target_id == "chunk_1"
    assert candidate.strategy is RetrievalStrategy.FUSION
    assert candidate.strategy_rank == 3
    assert candidate.fusion_score == 0.25
    assert candidate.lexical_score == 1.5
    assert candidate.source_tier is SourceTier.POSTING
    assert candidate.company_id == "co_1"


def test_판정에_필요한_부가_사실을_payload_에서_읽는다():
    option = option_from_fused(
        _fused("chunk_1", tier="D", snapshot_id="snap_1", reliability_score=0.8),
        QUERY,
        1,
    )

    assert option.snapshot_id == "snap_1"
    assert option.reliability_score == 0.8


def test_계층을_모르는_값은_비운다():
    """모르는 값을 A 계층으로 보면 정책 검사가 무너진다."""
    unknown = option_from_fused(_fused("chunk_1", tier="Z"), QUERY, 1)
    missing = option_from_fused(_fused("chunk_2", tier=None), QUERY, 1)

    assert unknown.tier is None
    assert missing.tier is None


def test_융합_순위가_후보_순위가_된다():
    options = options_from(
        (_fused("chunk_a", 0.9), _fused("chunk_b", 0.5), _fused("chunk_c", 0.1)), QUERY
    )

    assert [o.candidate.strategy_rank for o in options] == [1, 2, 3]


def test_같은_질의의_같은_대상은_같은_후보_식별자다():
    first = candidate_identifier(QUERY, "chunk", "chunk_1")
    second = candidate_identifier(QUERY, "chunk", "chunk_1")
    other = candidate_identifier("rq_other", "chunk", "chunk_1")

    assert first == second
    assert first != other
    assert first.startswith("cand_")


# ============================================================ 판정 순서
def test_자료_계층_정책이_먼저_적용된다():
    """통계 근거 집합에 D 계층이 섞이지 않는다. 순위가 높아도 마찬가지다."""
    slot = EvidenceSlot(slot="overall_baseline", support_type="chunk", minimum=1)
    fused = (
        _fused("chunk_d", 0.9, tier="D", reliability_score=0.9),
        _fused("chunk_a", 0.1, tier="A"),
    )

    plan = assemble_from_fused(
        _objective(slot), fused, QUERY, AllowedUse.STATISTICS
    )

    assert [m.target_id for m in plan.members] == ["chunk_a"]
    assert plan.outcome.rejection_counts()[REASON_TIER_OUT_OF_SCOPE] == 1


def test_질의_둘이_만난_같은_청크를_두_번_담지_않는다():
    """질의가 다르면 후보 식별자가 갈리지만 가리키는 대상은 하나다."""
    options = (
        *options_from((_fused("chunk_1", 0.9, company_id="co_1"),), QUERY),
        *options_from((_fused("chunk_1", 0.5, company_id="co_2"),), "rq_other"),
        *options_from((_fused("chunk_2", 0.4, company_id="co_2"),), "rq_other"),
    )

    plan = assemble(_objective(), options, AllowedUse.INTERPRETATION_CONTEXT)

    assert [m.target_id for m in plan.members] == ["chunk_1", "chunk_2"]
    assert plan.outcome.rejection_counts()[REASON_DUPLICATE_TARGET] == 1
    assert plan.complete


def test_해석_집합에_A_계층이_없으면_완료가_아니다():
    fused = (
        _fused("chunk_b", 0.9, tier="B", company_id="co_1"),
        _fused("chunk_c", 0.5, tier="C", company_id="co_2"),
    )

    plan = assemble_from_fused(
        _objective(), fused, QUERY, AllowedUse.INTERPRETATION_CONTEXT
    )

    assert plan.unmet_conditions == (NO_POSTING_ANCHOR,)
    assert not plan.complete


# ============================================================ 독립 회사 하한
def test_한_회사의_근거로_채운_슬롯은_미충족으로_남는다():
    """개수는 찼으나 기업군 일반화의 근거가 한 회사에 있다."""
    fused = (
        _fused("chunk_1", 0.9, company_id="co_1"),
        _fused("chunk_2", 0.5, company_id="co_1"),
    )

    plan = assemble_from_fused(
        _objective(), fused, QUERY, AllowedUse.INTERPRETATION_CONTEXT
    )

    assert plan.evidence_set.filled_counts() == {"cluster_support": 2}
    assert plan.unmet_slots == ("cluster_support",)
    assert plan.company_short_slots == ("cluster_support",)
    assert not plan.complete


def test_회사_둘을_채우면_미충족이_없다():
    fused = (
        _fused("chunk_1", 0.9, company_id="co_1"),
        _fused("chunk_2", 0.5, company_id="co_2"),
    )

    plan = assemble_from_fused(
        _objective(), fused, QUERY, AllowedUse.INTERPRETATION_CONTEXT
    )

    assert plan.unmet_slots == ()
    assert plan.company_short_slots == ()
    assert plan.complete
    assert slot_companies(plan.evidence_set, "cluster_support") == {"co_1", "co_2"}


def test_하한을_선언하지_않은_슬롯은_회사를_보지_않는다():
    slot = EvidenceSlot(slot="cluster_support", support_type="chunk", minimum=1)
    fused = (_fused("chunk_1", 0.9, company_id=None),)

    plan = assemble_from_fused(
        _objective(slot), fused, QUERY, AllowedUse.INTERPRETATION_CONTEXT
    )

    assert unmet_company_minimums(_objective(slot), plan.evidence_set) == ()
    assert plan.unmet_slots == ()


def test_미충족_사유가_개수와_회사를_구분한다():
    """다음 검색이 달라진다. 앞은 아무 근거나, 뒤는 다른 회사의 근거만 자리를 채운다."""
    company_short = assemble_from_fused(
        _objective(),
        (
            _fused("chunk_1", 0.9, company_id="co_1"),
            _fused("chunk_2", 0.5, company_id="co_1"),
        ),
        QUERY,
        AllowedUse.INTERPRETATION_CONTEXT,
    )
    count_short = assemble_from_fused(
        _objective(),
        (_fused("chunk_1", 0.9, company_id="co_1"),),
        QUERY,
        AllowedUse.INTERPRETATION_CONTEXT,
    )

    assert company_short.shortfalls() == (("cluster_support", REASON_COMPANY_MINIMUM),)
    assert count_short.shortfalls() == (("cluster_support", REASON_SLOT_MINIMUM),)


# ============================================================ 기록할 모양
def test_판정_결과가_후보_전부에_새겨진다():
    fused = (
        _fused("chunk_1", 0.9, company_id="co_1"),
        _fused("chunk_2", 0.5, company_id="co_2"),
        _fused("chunk_e", 0.1, tier="E", company_id="co_3"),
    )

    plan = assemble_from_fused(
        _objective(), fused, QUERY, AllowedUse.INTERPRETATION_CONTEXT
    )

    assert len(plan.candidates) == 3
    marks = {c.target_id: (c.selected, c.rejection_reason) for c in plan.candidates}
    assert marks["chunk_1"] == (True, None)
    assert marks["chunk_e"][0] is False
    assert marks["chunk_e"][1] == REASON_TIER_OUT_OF_SCOPE


def test_구성원_행이_후보와_슬롯의_쌍이다():
    fused = (
        _fused("chunk_1", 0.9, company_id="co_1"),
        _fused("chunk_2", 0.5, company_id="co_2"),
    )

    plan = assemble_from_fused(
        _objective(), fused, QUERY, AllowedUse.INTERPRETATION_CONTEXT
    )

    rows = plan.member_rows()
    assert len(rows) == 2
    assert {slot for _, slot in rows} == {"cluster_support"}
    assert {candidate_id for candidate_id, _ in rows} == {
        m.candidate_id for m in plan.members
    }


def test_같은_입력에_같은_출력을_낸다():
    fused = (
        _fused("chunk_1", 0.9, company_id="co_1"),
        _fused("chunk_2", 0.5, company_id="co_2"),
    )
    objective = _objective()

    first = assemble(
        objective, options_from(fused, QUERY), AllowedUse.INTERPRETATION_CONTEXT
    )
    second = assemble(
        objective,
        options_from(tuple(reversed(fused)), QUERY),
        AllowedUse.INTERPRETATION_CONTEXT,
    )

    assert first.evidence_set.evidence_set_id == second.evidence_set.evidence_set_id
    assert first.unmet_slots == second.unmet_slots


def test_후보가_없으면_슬롯이_비어_있다():
    plan = assemble(_objective(), (), AllowedUse.INTERPRETATION_CONTEXT)

    assert plan.members == ()
    assert plan.candidates == ()
    assert plan.unmet_slots == ("cluster_support",)
    assert not plan.complete
