"""검색 결과에서 근거 집합을 조립한다.

Phase 12-4 다. 판정 규칙은 docs/agent-design.md 5.3, 계층별 허용 용도는
docs/data-strategy.md 3장, 결과가 담기는 표는 docs/erd.md 12장의 `evidence_sets`
와 `evidence_set_members` 다.

`retrieval/fusion.py` 가 만든 융합 후보는 계측 표의 컬럼을 아직 갖고 있지 않다. 이
모듈이 후보를 `EvidenceCandidate` 로 옮기고 판정에 필요한 부가 사실을 붙여
`graph/evidence.py` 의 `optimize` 에 넘긴다. 판정 규칙을 여기서 다시 쓰지 않는다.
규칙이 두 벌이 되면 검색 경로로 만든 묶음과 그래프 경로로 만든 묶음이 서로 다른
기준으로 판정된다.

판정 순서는 `optimize` 가 정한 그대로다. 자료 계층 정책을 먼저 적용하고, 중복을
지운 뒤, 목표 계약의 슬롯을 채운다. 이 순서를 바꾸면 정책 위반 후보가 슬롯을 먼저
차지하고 뒤에서 빠져 슬롯이 빈 채로 완료 판정이 난다.

`optimize` 가 남기지 않는 판정 하나를 이 층이 더한다. 슬롯의 독립 회사 하한이다.
`ObjectiveContract.unmet` 은 슬롯의 최소 개수만 보므로, 한 회사에서만 나온 근거
둘로 `minimum=2, minimum_independent_companies=2` 인 슬롯이 채워진 것으로 보인다.
기업군 일반화 주장의 근거가 한 회사에 있는 상태이므로 미충족으로 남긴다.

순수 함수다. 저장소와 생성 모델을 import 하지 않는다. 기록은
`telemetry/retrieval.py` 가 한다.
"""

from __future__ import annotations

import hashlib
from collections.abc import Mapping, Sequence
from typing import Any

from pydantic import BaseModel, ConfigDict

from careersignal.contracts.evidence import (
    EvidenceCandidate,
    EvidenceSet,
    RetrievalStrategy,
)
from careersignal.contracts.objective import ObjectiveContract
from careersignal.domain.source_policy import AllowedUse, SourceTier
from careersignal.graph.evidence import (
    OPTIMIZATION_POLICY_V1,
    EvidenceOption,
    EvidenceRejection,
    EvidenceSelection,
    EvidenceSetOutcome,
    OptimizationPolicy,
    optimize,
)
from careersignal.retrieval.fusion import FusedCandidate
from careersignal.retrieval.search import TARGET_TYPE

CANDIDATE_PREFIX = "cand_"
"""`retrieval_candidates.candidate_id` 의 접두사. docs/erd.md 2.2에 자리가 없어 표 이름을 따른다."""

DIGEST_LENGTH = 24
MATERIAL_SEPARATOR = ":"

PAYLOAD_TIER = "source_tier"
PAYLOAD_COMPANY = "company_id"
PAYLOAD_SNAPSHOT = "snapshot_id"
PAYLOAD_RELIABILITY = "reliability_score"
"""융합 후보의 `payload` 에서 판정에 쓰는 열 이름.

`retrieval/search.py` 가 저장소 행의 나머지 열을 그대로 실어 보내므로(`_candidates`)
판정에 필요한 값은 조회를 다시 하지 않고 여기서 꺼낸다. 열이 없으면 비운다.
"""

REASON_COMPANY_MINIMUM = "EVIDENCE_COMPANY_MINIMUM"
"""슬롯의 독립 회사 하한을 채우지 못했다. 최소 개수는 찼으나 회사가 모자라다."""

REASON_SLOT_MINIMUM = "EVIDENCE_SLOT_MINIMUM_UNMET"
"""슬롯의 최소 개수를 채우지 못했다."""


def candidate_identifier(query_id: str, target_type: str, target_id: str) -> str:
    """같은 질의에서 같은 대상은 같은 후보다.

    질의를 재료에 넣는다. 한 실행이 같은 청크를 여러 질의로 만나면 질의마다 순위와
    점수가 다르므로 `retrieval_candidates` 의 행도 갈라져야 한다.
    """
    material = MATERIAL_SEPARATOR.join((query_id, target_type, target_id))
    return CANDIDATE_PREFIX + hashlib.sha256(material.encode()).hexdigest()[:DIGEST_LENGTH]


def _tier_of(value: Any) -> SourceTier | None:
    """자료 계층 값을 열거로 옮긴다. 모르는 값은 비운다.

    비운 값은 `optimize` 가 `EVIDENCE_TIER_UNKNOWN` 으로 떨어뜨린다. 여기서 기본
    계층을 정하지 않는다. 모르는 것을 A 계층으로 보면 정책 검사가 무너진다.
    """
    if value is None:
        return None
    if isinstance(value, SourceTier):
        return value
    try:
        return SourceTier(str(value))
    except ValueError:
        return None


def _score_of(value: Any) -> float | None:
    if value is None:
        return None
    return float(value)


def option_from_fused(
    fused: FusedCandidate,
    query_id: str,
    strategy_rank: int,
    target_type: str = TARGET_TYPE,
    strategy: RetrievalStrategy = RetrievalStrategy.FUSION,
) -> EvidenceOption:
    """융합 후보 하나를 판정 대상으로 옮긴다.

    전략별 원래 점수를 함께 옮긴다. 융합 점수만 남기면 어느 전략이 이 후보를
    올렸는지 되짚을 수 없다(docs/erd.md 12장의 `retrieval_candidates`).
    """
    payload: Mapping[str, Any] = fused.payload
    return EvidenceOption(
        candidate=EvidenceCandidate(
            candidate_id=candidate_identifier(query_id, target_type, fused.target_id),
            target_type=target_type,
            target_id=fused.target_id,
            strategy=strategy,
            strategy_rank=strategy_rank,
            lexical_score=fused.lexical_score,
            vector_score=fused.vector_score,
            fusion_score=fused.fusion_score,
            source_tier=_tier_of(payload.get(PAYLOAD_TIER)),
            company_id=(
                None
                if payload.get(PAYLOAD_COMPANY) is None
                else str(payload[PAYLOAD_COMPANY])
            ),
        ),
        snapshot_id=(
            None
            if payload.get(PAYLOAD_SNAPSHOT) is None
            else str(payload[PAYLOAD_SNAPSHOT])
        ),
        reliability_score=_score_of(payload.get(PAYLOAD_RELIABILITY)),
    )


def options_from(
    fused: Sequence[FusedCandidate],
    query_id: str,
    target_type: str = TARGET_TYPE,
    strategy: RetrievalStrategy = RetrievalStrategy.FUSION,
) -> tuple[EvidenceOption, ...]:
    """융합 순위를 판정 대상 목록으로 옮긴다. 목록의 순서가 곧 순위다."""
    return tuple(
        option_from_fused(candidate, query_id, rank, target_type, strategy)
        for rank, candidate in enumerate(fused, start=1)
    )


def slot_companies(evidence_set: EvidenceSet, slot: str) -> frozenset[str]:
    """슬롯 하나를 채운 근거의 독립 회사. 회사를 모르는 근거는 세지 않는다."""
    assigned = set(evidence_set.slot_assignment.get(slot, ()))
    return frozenset(
        member.company_id
        for member in evidence_set.members
        if member.candidate_id in assigned and member.company_id
    )


def unmet_company_minimums(
    objective: ObjectiveContract, evidence_set: EvidenceSet
) -> tuple[str, ...]:
    """독립 회사 하한을 채우지 못한 필수 슬롯.

    최소 개수와 따로 본다. 한 회사의 근거 둘로 채운 슬롯은 개수 조건을 지키지만
    기업군 일반화의 근거가 되지 못한다.
    """
    return tuple(
        slot.slot
        for slot in objective.required_slots
        if slot.minimum_independent_companies
        and len(slot_companies(evidence_set, slot.slot))
        < slot.minimum_independent_companies
    )


class EvidenceSetPlan(BaseModel):
    """근거 집합 조립 한 번의 결과.

    `graph/evidence.py` 의 결과에 독립 회사 하한 판정을 더한 것이다. 기록과 판정이
    이 객체 하나만 보면 되도록 후보 전체를 함께 담는다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    outcome: EvidenceSetOutcome
    unmet_slots: tuple[str, ...] = ()
    """`verdict.decide` 의 `unmet_slots` 인자로 그대로 들어간다.

    최소 개수 미달과 독립 회사 하한 미달을 합친 목록이며 슬롯 이름은 한 번만 나온다.
    """

    company_short_slots: tuple[str, ...] = ()
    """독립 회사 하한만 모자란 슬롯. 왜 미충족인지 되짚는 자리다."""

    candidates: tuple[EvidenceCandidate, ...] = ()
    """판정을 마친 후보 전부. `selected` 와 `rejection_reason` 이 채워져 있다."""

    @property
    def evidence_set(self) -> EvidenceSet:
        return self.outcome.evidence_set

    @property
    def members(self) -> tuple[EvidenceCandidate, ...]:
        return self.outcome.members

    @property
    def selections(self) -> tuple[EvidenceSelection, ...]:
        return self.outcome.selections

    @property
    def rejections(self) -> tuple[EvidenceRejection, ...]:
        return self.outcome.rejections

    @property
    def unmet_conditions(self) -> tuple[str, ...]:
        return self.outcome.unmet_conditions

    @property
    def complete(self) -> bool:
        """필수 슬롯과 용도별 조건을 모두 채웠는가. 회사 하한 미달은 완료가 아니다."""
        return not self.unmet_slots and not self.unmet_conditions

    def shortfalls(self) -> tuple[tuple[str, str], ...]:
        """미충족 슬롯과 사유. 수리 지시가 무엇을 더 찾아야 하는지 정하는 자리다.

        개수가 모자란 슬롯과 회사가 모자란 슬롯은 다음 검색이 달라진다. 앞은 아무
        근거나 더 필요하고 뒤는 다른 회사의 근거만 자리를 채운다. 둘 다 모자라면
        개수를 사유로 남긴다. 개수를 채우는 과정에서 회사도 늘어난다.
        """
        short_counts = set(self.outcome.unmet_slots)
        return tuple(
            (
                slot,
                REASON_SLOT_MINIMUM if slot in short_counts else REASON_COMPANY_MINIMUM,
            )
            for slot in self.unmet_slots
        )

    def member_rows(self) -> tuple[tuple[str, str], ...]:
        """`evidence_set_members` 에 넣을 `(candidate_id, slot_name)` 목록.

        기본키가 `(evidence_set_id, candidate_id)` 이므로 한 후보는 슬롯 하나만
        채운다. 고른 순서를 그대로 쓴다.
        """
        return tuple(
            (selection.candidate_id, selection.slot) for selection in self.selections
        )


def annotate(
    options: Sequence[EvidenceOption], outcome: EvidenceSetOutcome
) -> tuple[EvidenceCandidate, ...]:
    """판정 결과를 후보에 새긴다.

    `retrieval_candidates` 는 고른 후보만이 아니라 검색이 만난 후보 전부를 담는다.
    담기지 않은 후보에 사유가 없으면 `citation_utilization` 의 분모가 실제 검색량과
    달라지고, 왜 이 근거가 아닌지 되짚을 수 없다.

    입력 순서를 그대로 지킨다. 순위를 다시 매기지 않는다.
    """
    selected = {member.candidate_id for member in outcome.members}
    reasons = {
        rejection.candidate_id: rejection.reason_code
        for rejection in outcome.rejections
    }
    return tuple(
        option.candidate.model_copy(
            update={
                "selected": option.candidate_id in selected,
                "rejection_reason": reasons.get(option.candidate_id),
            }
        )
        for option in options
    )


def assemble(
    objective: ObjectiveContract,
    options: Sequence[EvidenceOption],
    purpose: AllowedUse,
    policy: OptimizationPolicy = OPTIMIZATION_POLICY_V1,
) -> EvidenceSetPlan:
    """최소하고 충분한 근거 집합 하나와 미충족 슬롯을 낸다.

    판정은 `optimize` 가 하고 이 함수는 독립 회사 하한을 더한 뒤 기록에 필요한
    모양으로 묶는다. 같은 입력에 같은 출력을 낸다.
    """
    outcome = optimize(objective, options, purpose, policy=policy)
    short = unmet_company_minimums(objective, outcome.evidence_set)
    unmet = tuple(dict.fromkeys((*outcome.unmet_slots, *short)))
    return EvidenceSetPlan(
        outcome=outcome,
        unmet_slots=unmet,
        company_short_slots=short,
        candidates=annotate(options, outcome),
    )


def assemble_from_fused(
    objective: ObjectiveContract,
    fused: Sequence[FusedCandidate],
    query_id: str,
    purpose: AllowedUse,
    target_type: str = TARGET_TYPE,
    policy: OptimizationPolicy = OPTIMIZATION_POLICY_V1,
) -> EvidenceSetPlan:
    """융합 순위에서 곧바로 근거 집합을 만든다. 검색 경로의 진입점이다."""
    return assemble(
        objective,
        options_from(fused, query_id, target_type=target_type),
        purpose,
        policy=policy,
    )


__all__ = [
    "CANDIDATE_PREFIX",
    "PAYLOAD_COMPANY",
    "PAYLOAD_RELIABILITY",
    "PAYLOAD_SNAPSHOT",
    "PAYLOAD_TIER",
    "REASON_COMPANY_MINIMUM",
    "REASON_SLOT_MINIMUM",
    "EvidenceSetPlan",
    "annotate",
    "assemble",
    "assemble_from_fused",
    "candidate_identifier",
    "option_from_fused",
    "options_from",
    "slot_companies",
    "unmet_company_minimums",
]
