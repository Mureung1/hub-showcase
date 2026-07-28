"""근거 집합 최적화 검증.

규칙은 docs/agent-design.md 5.3, docs/data-strategy.md 3장,
docs/adr/0010-third-party-interpretation-scope.md 에서 온다. 후보를 손으로 만들어
넣고 판정만 검사한다. 데이터베이스에 붙지 않는다.
"""

from __future__ import annotations

from careersignal.contracts import EvidenceCandidate, RetrievalStrategy
from careersignal.contracts.objective import EvidenceSlot, ObjectiveContract
from careersignal.domain.permissions import Component, can_write
from careersignal.domain.source_policy import AllowedUse, SourceTier
from careersignal.graph.evidence import (
    NO_POSTING_ANCHOR,
    OPTIMIZATION_POLICY_V1,
    PICK_COMPANY_DIVERSITY,
    REASON_BUDGET_EXHAUSTED,
    REASON_COMPANY_CONCENTRATION,
    REASON_DUPLICATE_TARGET,
    REASON_NO_MATCHING_SLOT,
    REASON_RELIABILITY_MISSING,
    REASON_SLOT_SATISFIED,
    REASON_SOURCE_CONCENTRATION,
    REASON_TIER_OUT_OF_SCOPE,
    REASON_TIER_UNKNOWN,
    TIER_SCOPE,
    EvidenceOption,
    evidence_set_identifier,
    optimization_policy_for,
    optimize,
)

POSTING_SLOT = EvidenceSlot(
    slot="cluster_support",
    support_type="posting_evidence",
    minimum=2,
    minimum_independent_companies=2,
)

STATISTIC_SLOT = EvidenceSlot(
    slot="overall_baseline", support_type="statistic_fact", minimum=1
)


def _objective(*slots: EvidenceSlot) -> ObjectiveContract:
    return ObjectiveContract(
        objective_id="obj_1",
        objective="기업군 편차 해석",
        required_evidence_slots=slots or (POSTING_SLOT,),
    )


def _option(
    candidate_id: str,
    target_id: str | None = None,
    target_type: str = "chunk",
    tier: SourceTier | None = SourceTier.POSTING,
    company_id: str | None = "co_1",
    snapshot_id: str | None = None,
    rank: int = 1,
    fusion_score: float | None = None,
    reliability_score: float | None = None,
) -> EvidenceOption:
    return EvidenceOption(
        candidate=EvidenceCandidate(
            candidate_id=candidate_id,
            target_type=target_type,
            target_id=target_id or f"chunk_{candidate_id}",
            strategy=RetrievalStrategy.FUSION,
            strategy_rank=rank,
            fusion_score=fusion_score,
            source_tier=tier,
            company_id=company_id,
        ),
        snapshot_id=snapshot_id,
        reliability_score=reliability_score,
    )


# ============================================================ 빈 입력
def test_후보가_없으면_빈_집합이다():
    outcome = optimize(_objective(), (), AllowedUse.INTERPRETATION_CONTEXT)

    assert outcome.members == ()
    assert outcome.unmet_slots == ("cluster_support",)
    assert not outcome.complete


# ============================================================ 자료 계층
def test_통계_주장의_근거_집합에_D_계층이_섞이지_않는다():
    options = (
        _option("cand_a", target_type="statistic_fact", target_id="fact_1"),
        _option(
            "cand_d",
            target_type="statistic_fact",
            target_id="fact_2",
            tier=SourceTier.VERIFIED_EXTERNAL,
            reliability_score=0.9,
            rank=2,
        ),
    )

    outcome = optimize(
        _objective(STATISTIC_SLOT), options, AllowedUse.STATISTICS
    )

    assert [member.candidate_id for member in outcome.members] == ["cand_a"]
    assert outcome.rejection_counts()[REASON_TIER_OUT_OF_SCOPE] == 1
    assert TIER_SCOPE[AllowedUse.STATISTICS] == frozenset({SourceTier.POSTING})


def test_해석은_D_계층을_보강_근거로_받는다():
    """ADR 0010이 D 계층의 해석 용도를 사용으로 둔다."""
    assert SourceTier.VERIFIED_EXTERNAL in TIER_SCOPE[AllowedUse.INTERPRETATION_CONTEXT]

    options = (
        _option("cand_a", company_id="co_1"),
        _option(
            "cand_d",
            tier=SourceTier.VERIFIED_EXTERNAL,
            company_id="co_2",
            reliability_score=0.7,
            rank=2,
        ),
    )

    outcome = optimize(
        _objective(), options, AllowedUse.INTERPRETATION_CONTEXT
    )

    assert {member.candidate_id for member in outcome.members} == {"cand_a", "cand_d"}


def test_신뢰도가_없는_D_계층은_떨어진다():
    options = (
        _option("cand_d", tier=SourceTier.VERIFIED_EXTERNAL, reliability_score=None),
    )

    outcome = optimize(_objective(), options, AllowedUse.STRATEGY)

    assert outcome.members == ()
    assert outcome.rejections[0].reason_code == REASON_RELIABILITY_MISSING


def test_E_계층은_어느_용도에도_들어가지_않는다():
    options = (_option("cand_e", tier=SourceTier.UNVERIFIED),)

    for purpose in (
        AllowedUse.STATISTICS,
        AllowedUse.INTERPRETATION_CONTEXT,
        AllowedUse.STRATEGY,
        AllowedUse.ROADMAP,
    ):
        outcome = optimize(_objective(), options, purpose)
        assert outcome.members == ()
        assert outcome.rejections[0].reason_code == REASON_TIER_OUT_OF_SCOPE


def test_계층을_모르는_후보는_떨어진다():
    options = (_option("cand_x", tier=None),)

    outcome = optimize(_objective(), options, AllowedUse.STRATEGY)

    assert outcome.rejections[0].reason_code == REASON_TIER_UNKNOWN


def test_해석_집합에_A_계층이_없으면_미충족_조건이_남는다():
    options = (
        _option(
            "cand_b", tier=SourceTier.COMPANY_OFFICIAL, company_id="co_1", rank=1
        ),
        _option(
            "cand_c", tier=SourceTier.PUBLIC_STANDARD, company_id="co_2", rank=2
        ),
    )

    outcome = optimize(_objective(), options, AllowedUse.INTERPRETATION_CONTEXT)

    assert outcome.unmet_conditions == (NO_POSTING_ANCHOR,)
    assert not outcome.complete


# ============================================================ 중복
def test_같은_청크를_두_번_담지_않는다():
    options = (
        _option("cand_a", target_id="chunk_1", company_id="co_1"),
        _option("cand_b", target_id="chunk_1", company_id="co_2", rank=2),
    )

    outcome = optimize(_objective(), options, AllowedUse.INTERPRETATION_CONTEXT)

    assert [member.target_id for member in outcome.members] == ["chunk_1"]
    assert outcome.rejection_counts()[REASON_DUPLICATE_TARGET] == 1


def test_같은_스냅샷의_반복이_한도에서_끊긴다():
    options = tuple(
        _option(
            f"cand_{i}",
            target_id=f"chunk_{i}",
            company_id=f"co_{i}",
            snapshot_id="snap_1",
            rank=i + 1,
        )
        for i in range(4)
    )
    objective = _objective(
        EvidenceSlot(slot="cluster_support", support_type="posting_evidence", minimum=4)
    )

    outcome = optimize(objective, options, AllowedUse.INTERPRETATION_CONTEXT)

    assert len(outcome.members) == OPTIMIZATION_POLICY_V1.max_per_source
    assert REASON_SOURCE_CONCENTRATION in outcome.rejection_counts()


# ============================================================ 출처 다양성
def test_한_회사에_쏠리지_않는다():
    options = tuple(
        _option(f"cand_{i}", target_id=f"chunk_{i}", company_id="co_1", rank=i + 1)
        for i in range(4)
    )
    objective = _objective(
        EvidenceSlot(slot="cluster_support", support_type="posting_evidence", minimum=4)
    )

    outcome = optimize(objective, options, AllowedUse.INTERPRETATION_CONTEXT)

    assert len(outcome.members) == OPTIMIZATION_POLICY_V1.max_per_company
    assert REASON_COMPANY_CONCENTRATION in outcome.rejection_counts()


def test_독립_회사_최소_수를_먼저_채운다():
    """상위 후보가 같은 회사여도 다른 회사의 후보가 자리를 얻는다."""
    options = (
        _option("cand_a", target_id="chunk_a", company_id="co_1", rank=1),
        _option("cand_b", target_id="chunk_b", company_id="co_1", rank=2),
        _option("cand_c", target_id="chunk_c", company_id="co_2", rank=3),
    )

    outcome = optimize(_objective(), options, AllowedUse.INTERPRETATION_CONTEXT)

    assert outcome.evidence_set.independent_companies() == 2
    picks = {s.candidate_id: s.reason_code for s in outcome.selections}
    assert picks["cand_c"] == PICK_COMPANY_DIVERSITY


# ============================================================ 슬롯
def test_필수_슬롯을_채우면_완료다():
    options = (
        _option("cand_a", target_id="chunk_a", company_id="co_1"),
        _option("cand_b", target_id="chunk_b", company_id="co_2", rank=2),
    )

    outcome = optimize(_objective(), options, AllowedUse.INTERPRETATION_CONTEXT)

    assert outcome.unmet_slots == ()
    assert outcome.complete
    assert outcome.evidence_set.filled_counts() == {"cluster_support": 2}


def test_슬롯의_근거_종류가_맞아야_들어간다():
    options = (
        _option("cand_fact", target_type="statistic_fact", target_id="fact_1"),
        _option("cand_chunk", target_id="chunk_1", rank=2),
    )

    outcome = optimize(
        _objective(STATISTIC_SLOT), options, AllowedUse.INTERPRETATION_CONTEXT
    )

    assert [member.candidate_id for member in outcome.members] == ["cand_fact"]
    assert outcome.rejections[0].reason_code == REASON_NO_MATCHING_SLOT


def test_슬롯의_허용_계층_밖_후보는_들어가지_않는다():
    slot = EvidenceSlot(
        slot="official_context",
        support_type="chunk",
        minimum=1,
        allowed_tiers=(SourceTier.COMPANY_OFFICIAL,),
    )
    options = (_option("cand_a", target_id="chunk_a"),)

    outcome = optimize(_objective(slot), options, AllowedUse.INTERPRETATION_CONTEXT)

    assert outcome.members == ()
    assert outcome.unmet_slots == ("official_context",)


def test_선택_슬롯은_남은_예산으로_채운다():
    optional = EvidenceSlot(
        slot="official_context", support_type="statistic_fact", minimum=1, required=False
    )
    options = (
        _option("cand_a", target_id="chunk_a", company_id="co_1"),
        _option("cand_b", target_id="chunk_b", company_id="co_2", rank=2),
        _option(
            "cand_fact",
            target_type="statistic_fact",
            target_id="fact_1",
            company_id="co_3",
            rank=3,
        ),
    )

    outcome = optimize(
        _objective(POSTING_SLOT, optional), options, AllowedUse.INTERPRETATION_CONTEXT
    )

    assert outcome.evidence_set.filled_counts()["official_context"] == 1


# ============================================================ 예산과 탈락 이유
def test_예산_상한을_넘으면_담지_않는다():
    policy = OPTIMIZATION_POLICY_V1.model_copy(
        update={"max_members": 1, "max_per_company": 4}
    )
    options = (
        _option("cand_a", target_id="chunk_a", company_id="co_1"),
        _option("cand_b", target_id="chunk_b", company_id="co_1", rank=2),
    )
    objective = _objective(
        EvidenceSlot(slot="cluster_support", support_type="posting_evidence", minimum=2)
    )

    outcome = optimize(
        objective, options, AllowedUse.INTERPRETATION_CONTEXT, policy=policy
    )

    assert len(outcome.members) == 1
    assert outcome.rejections[0].reason_code == REASON_BUDGET_EXHAUSTED


def test_탈락_이유가_모든_후보에_남는다():
    options = (
        _option("cand_a", target_id="chunk_a", company_id="co_1"),
        _option("cand_b", target_id="chunk_b", company_id="co_2", rank=2),
        _option("cand_c", target_id="chunk_c", company_id="co_3", rank=3),
        _option("cand_e", target_id="chunk_e", tier=SourceTier.UNVERIFIED, rank=4),
    )

    outcome = optimize(_objective(), options, AllowedUse.INTERPRETATION_CONTEXT)

    chosen = {member.candidate_id for member in outcome.members}
    rejected = {rejection.candidate_id for rejection in outcome.rejections}
    assert chosen | rejected == {"cand_a", "cand_b", "cand_c", "cand_e"}
    assert not chosen & rejected


def test_슬롯이_이미_찼으면_그_사유로_남는다():
    options = (
        _option("cand_a", target_id="chunk_a", company_id="co_1"),
        _option("cand_b", target_id="chunk_b", company_id="co_2", rank=2),
        _option("cand_c", target_id="chunk_c", company_id="co_3", rank=3),
    )

    outcome = optimize(_objective(), options, AllowedUse.INTERPRETATION_CONTEXT)

    reasons = {r.candidate_id: r.reason_code for r in outcome.rejections}
    assert reasons["cand_c"] == REASON_SLOT_SATISFIED


def test_고른_이유가_남는다():
    options = (
        _option("cand_a", target_id="chunk_a", company_id="co_1"),
        _option("cand_b", target_id="chunk_b", company_id="co_2", rank=2),
    )

    outcome = optimize(_objective(), options, AllowedUse.INTERPRETATION_CONTEXT)

    assert len(outcome.selections) == len(outcome.members)
    assert all(selection.slot == "cluster_support" for selection in outcome.selections)


# ============================================================ 결정성
def test_같은_입력에_같은_출력을_낸다():
    options = [
        _option("cand_a", target_id="chunk_a", company_id="co_1", rank=1),
        _option("cand_b", target_id="chunk_b", company_id="co_2", rank=2),
        _option("cand_c", target_id="chunk_c", company_id="co_3", rank=3),
    ]

    first = optimize(_objective(), tuple(options), AllowedUse.INTERPRETATION_CONTEXT)
    second = optimize(
        _objective(), tuple(reversed(options)), AllowedUse.INTERPRETATION_CONTEXT
    )

    assert first.evidence_set == second.evidence_set
    assert first.selections == second.selections


def test_집합_식별자가_구성원에서_나온다():
    first = evidence_set_identifier("obj_1", "ev_v1", ["cand_b", "cand_a"])
    second = evidence_set_identifier("obj_1", "ev_v1", ["cand_a", "cand_b"])
    other = evidence_set_identifier("obj_1", "ev_v1", ["cand_a"])

    assert first == second
    assert first != other
    assert first.startswith("eset_")


def test_등록되지_않은_정책_버전은_예외다():
    try:
        optimization_policy_for("ev_없음")
    except KeyError:
        return
    raise AssertionError("등록되지 않은 정책 버전이 통과했다")


# ============================================================ 권한
def test_근거_집합은_전_구성요소가_기록한다():
    for component in (
        Component.AGENT_INTERPRET,
        Component.AGENT_STRATEGY,
        Component.PIPE_LINEAGE,
    ):
        assert can_write(component, "evidence_sets")
        assert can_write(component, "evidence_set_members")
