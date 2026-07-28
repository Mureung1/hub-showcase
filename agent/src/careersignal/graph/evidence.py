"""근거 집합 최적화.

정의는 docs/agent-design.md 5.3이고 자료 계층의 허용 용도는 docs/data-strategy.md
3장, D 계층의 해석 사용 범위는 docs/adr/0010-third-party-interpretation-scope.md
다. 결과가 담기는 표는 docs/erd.md 12장의 `evidence_sets` 와
`evidence_set_members` 다.

개별 후보를 각각 점수화해 상위 항목을 담지 않는다. 상위 결과가 모두 같은 회사에서
나오면 기업군 일반화 주장의 근거로 쓸 수 없으며, 이 조건은 개별 점수로 판정되지
않는다. 그래서 묶음 전체를 판정한다.

순수 함수다. 저장소와 생성 모델을 import 하지 않는다. 고른 이유와 탈락 이유를 모두
남긴다. 근거 집합은 사용자에게 보이는 산출물의 뿌리이므로 왜 이 근거인지 되짚을 수
있어야 한다.
"""

from __future__ import annotations

import hashlib
from collections.abc import Sequence
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from careersignal.contracts.evidence import EvidenceCandidate, EvidenceSet
from careersignal.contracts.objective import EvidenceSlot, ObjectiveContract
from careersignal.domain.source_policy import AllowedUse, SourceTier

SET_PREFIX = "eset_"
"""`evidence_sets.evidence_set_id` 의 접두사. docs/erd.md 2.2에 자리가 없어 표 이름을 따른다."""

DIGEST_LENGTH = 24
MATERIAL_SEPARATOR = ":"
MEMBER_SEPARATOR = ","

REASON_TIER_UNKNOWN = "EVIDENCE_TIER_UNKNOWN"
"""자료 계층이 기록되지 않은 후보. 허용 용도를 판정할 수 없으므로 쓰지 않는다."""

REASON_TIER_OUT_OF_SCOPE = "EVIDENCE_TIER_OUT_OF_SCOPE"
"""이 용도에 허용되지 않은 계층. 통계 근거의 D 계층과 모든 용도의 E 계층이다."""

REASON_RELIABILITY_MISSING = "EVIDENCE_RELIABILITY_MISSING"
"""신뢰도가 기록되지 않은 D 계층. 근거로 사용하지 않는다(ADR 0009·0010)."""

REASON_DUPLICATE_CANDIDATE = "EVIDENCE_DUPLICATE_CANDIDATE"
"""같은 후보 식별자가 두 번 들어왔다."""

REASON_DUPLICATE_TARGET = "EVIDENCE_DUPLICATE_TARGET"
"""같은 대상을 가리키는 후보가 이미 있다. 같은 청크를 두 번 담지 않는다."""

REASON_COMPANY_CONCENTRATION = "EVIDENCE_COMPANY_CONCENTRATION"
"""한 회사의 근거가 한도를 넘었다. 기업군 일반화의 근거가 한 회사에 쏠리지 않게 한다."""

REASON_SOURCE_CONCENTRATION = "EVIDENCE_SOURCE_CONCENTRATION"
"""한 스냅샷의 근거가 한도를 넘었다. 같은 출처의 반복을 막는다."""

REASON_BUDGET_EXHAUSTED = "EVIDENCE_BUDGET_EXHAUSTED"
"""집합 크기 상한에 닿아 더 담지 않았다."""

REASON_SLOT_SATISFIED = "EVIDENCE_SLOT_SATISFIED"
"""맞는 슬롯이 이미 최소를 채웠다. 근거로 쓸 수 있으나 묶음에 넣지 않는다."""

REASON_NO_MATCHING_SLOT = "EVIDENCE_NO_MATCHING_SLOT"
"""이 목표의 어느 슬롯에도 맞지 않는 대상 유형이거나 계층이다."""

PICK_SLOT_MINIMUM = "EVIDENCE_SLOT_MINIMUM"
"""필수 슬롯의 최소 개수를 채우려고 골랐다."""

PICK_COMPANY_DIVERSITY = "EVIDENCE_COMPANY_DIVERSITY"
"""슬롯의 독립 회사 최소 수를 채우려고 골랐다."""

PICK_OPTIONAL_SLOT = "EVIDENCE_OPTIONAL_SLOT"
"""선택 슬롯을 남은 예산으로 채웠다."""

NO_POSTING_ANCHOR = "EVIDENCE_NO_POSTING_ANCHOR"
"""해석 근거 집합에 A 계층이 없다.

추론의 출발점은 공고 표현이며 D 계층 근거만으로 추론 요구를 세우지 않는다
(ADR 0010). 미충족 조건으로 남기고 집합을 만들되 완료로 보지 않는다.
"""

TIER_SCOPE: dict[AllowedUse, frozenset[SourceTier]] = {
    AllowedUse.STATISTICS: frozenset({SourceTier.POSTING}),
    AllowedUse.INTERPRETATION_CONTEXT: frozenset(
        {
            SourceTier.POSTING,
            SourceTier.COMPANY_OFFICIAL,
            SourceTier.PUBLIC_STANDARD,
            SourceTier.VERIFIED_EXTERNAL,
        }
    ),
    AllowedUse.STRATEGY: frozenset(
        {
            SourceTier.POSTING,
            SourceTier.COMPANY_OFFICIAL,
            SourceTier.PUBLIC_STANDARD,
            SourceTier.VERIFIED_EXTERNAL,
        }
    ),
    AllowedUse.ROADMAP: frozenset(
        {
            SourceTier.POSTING,
            SourceTier.COMPANY_OFFICIAL,
            SourceTier.PUBLIC_STANDARD,
            SourceTier.VERIFIED_EXTERNAL,
        }
    ),
}
"""용도별 허용 계층. docs/data-strategy.md 3장의 표를 근거 집합의 판정으로 옮긴다.

통계는 A 계층만 분자와 분모에 들어간다. 해석은 D 계층을 보강 근거로 받으며 이
범위는 ADR 0010이 정한다. E 계층은 후보 탐색에만 쓰므로 어느 용도에도 없다.

Wiki 용도는 필드마다 허용 근거가 다르고(docs/knowledge-schema.md 8.5) 근거 집합이
아니라 필드 단위로 판정하므로 이 표에 두지 않는다.
"""

ANCHOR_REQUIRED: frozenset[AllowedUse] = frozenset({AllowedUse.INTERPRETATION_CONTEXT})
"""A 계층 근거가 하나 이상 있어야 하는 용도. 해석의 출발점은 공고 표현이다."""

SUPPORT_TYPE_TARGETS: dict[str, frozenset[str]] = {
    "statistic_fact": frozenset({"statistic_fact"}),
    "posting_evidence": frozenset({"chunk"}),
    "chunk": frozenset({"chunk"}),
    "graph_path": frozenset({"graph_path"}),
    "wiki_revision": frozenset({"wiki_revision"}),
}
"""슬롯이 요구하는 근거 종류에서 `retrieval_candidates.target_type` 으로 가는 대응.

슬롯은 목표 계약의 말로 쓰이고(docs/agent-design.md 5.1) 후보는 계측 표의 값으로
쓰인다. 목록에 없는 종류는 대상 유형과 이름이 같다고 본다.
"""


def target_types_for(support_type: str) -> frozenset[str]:
    return SUPPORT_TYPE_TARGETS.get(support_type, frozenset({support_type}))


class OptimizationPolicy(BaseModel):
    """근거 집합의 예산과 쏠림 한도 한 벌.

    정책 버전 하나가 값 전부를 정한다. `evidence_sets.optimization_policy_version`
    에 그대로 들어가므로 어떤 한도로 고른 묶음인지 행만 보고 알 수 있다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    optimization_policy_version: str

    max_members: int = Field(ge=1)
    """집합에 담을 근거의 최대 수. 토큰 비용의 상한이다."""

    max_per_company: int = Field(ge=1)
    """한 회사에서 담을 최대 수. 회사를 모르는 후보에는 적용하지 않는다."""

    max_per_source: int = Field(ge=1)
    """한 스냅샷에서 담을 최대 수. 같은 출처의 반복을 막는다."""


OPTIMIZATION_POLICY_V1 = OptimizationPolicy(
    optimization_policy_version="ev_v1",
    max_members=8,
    max_per_company=2,
    max_per_source=2,
)
"""백엔드 v1 의 근거 집합 정책.

공고 30건 규모에서 한 회사 둘, 한 스냅샷 둘을 상한으로 둔다. 한도를 1로 두면 같은
공고의 서로 다른 문장을 함께 인용하지 못하고, 3 이상이면 회사 셋의 근거를 요구하는
슬롯이 한 회사만으로 채워진다.
"""

OPTIMIZATION_POLICIES: dict[str, OptimizationPolicy] = {
    OPTIMIZATION_POLICY_V1.optimization_policy_version: OPTIMIZATION_POLICY_V1
}
"""등록된 정책 버전. 근거 집합 행이 적은 값을 여기서 찾는다."""

UNKNOWN_POLICY = "등록되지 않은 근거 집합 정책 버전이다"


def optimization_policy_for(optimization_policy_version: str) -> OptimizationPolicy:
    """정책 버전 하나의 예산과 한도. 등록되지 않은 버전은 예외다."""
    policy = OPTIMIZATION_POLICIES.get(optimization_policy_version)
    if policy is None:
        raise KeyError(f"{UNKNOWN_POLICY}: {optimization_policy_version}")
    return policy


class EvidenceOption(BaseModel):
    """후보 하나와 판정에 필요한 부가 사실.

    `EvidenceCandidate` 는 계측 표의 컬럼만 담는다(docs/erd.md 12장). 출처 쏠림과
    신뢰도 판정은 스냅샷과 `source_assessments.reliability_score` 를 봐야 하므로
    여기서 함께 받는다. 조회는 부르는 쪽이 한다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    candidate: EvidenceCandidate

    snapshot_id: str | None = None
    """근거가 나온 스냅샷. 같은 출처의 반복을 세는 단위다."""

    reliability_score: float | None = None
    """D 계층 편입 판정의 값. 기록되지 않은 D 계층 자료는 근거로 쓰지 않는다."""

    @property
    def candidate_id(self) -> str:
        return self.candidate.candidate_id

    @property
    def target_key(self) -> tuple[str, str]:
        """같은 대상을 가리키는지 세는 단위."""
        return (self.candidate.target_type, self.candidate.target_id)

    @property
    def tier(self) -> SourceTier | None:
        return self.candidate.source_tier


def option_sort_key(option: EvidenceOption) -> tuple[Any, ...]:
    """후보 하나의 정렬 자리.

    재정렬 점수, 융합 점수, 전략 순위, 후보 식별자 순이다. 점수가 없는 후보는 0으로
    보아 뒤로 밀리고, 마지막 자리가 언제나 순서를 하나로 정한다. `set` 순회 순서에
    기대지 않는다.
    """
    candidate = option.candidate
    return (
        -(candidate.rerank_score or 0.0),
        -(candidate.fusion_score or 0.0),
        candidate.strategy_rank,
        candidate.candidate_id,
    )


class EvidenceRejection(BaseModel):
    """탈락한 후보 하나와 사유."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    candidate_id: str
    reason_code: str
    detail: dict[str, Any] = Field(default_factory=dict)


class EvidenceSelection(BaseModel):
    """고른 후보 하나와 어느 슬롯을 채웠는지, 왜 골랐는지."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    candidate_id: str
    slot: str
    reason_code: str


class EvidenceSetOutcome(BaseModel):
    """근거 집합 최적화 한 번의 결과."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    evidence_set: EvidenceSet
    selections: tuple[EvidenceSelection, ...] = ()
    rejections: tuple[EvidenceRejection, ...] = ()

    unmet_slots: tuple[str, ...] = ()
    """최소 개수를 채우지 못한 필수 슬롯."""

    unmet_conditions: tuple[str, ...] = ()
    """슬롯 밖의 미충족 조건. 해석 근거의 A 계층 부재가 여기 온다."""

    @property
    def complete(self) -> bool:
        """필수 슬롯과 용도별 조건을 모두 채웠는가."""
        return not self.unmet_slots and not self.unmet_conditions

    @property
    def members(self) -> tuple[EvidenceCandidate, ...]:
        return self.evidence_set.members

    def rejection_counts(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for rejection in self.rejections:
            counts[rejection.reason_code] = counts.get(rejection.reason_code, 0) + 1
        return counts


def evidence_set_identifier(
    objective_id: str,
    optimization_policy_version: str,
    candidate_ids: Sequence[str],
) -> str:
    """같은 목표에서 같은 정책으로 고른 같은 묶음은 같은 식별자다.

    재료를 정렬해 넣는다. 고른 순서가 아니라 구성원이 묶음의 정체성이다.
    """
    material = MATERIAL_SEPARATOR.join(
        (
            objective_id,
            optimization_policy_version,
            MEMBER_SEPARATOR.join(sorted(candidate_ids)),
        )
    )
    return SET_PREFIX + hashlib.sha256(material.encode()).hexdigest()[:DIGEST_LENGTH]


class _Basket:
    """고르는 중인 묶음. 결과가 아니므로 값 모델로 두지 않는다."""

    def __init__(self, policy: OptimizationPolicy) -> None:
        self._policy = policy
        self.chosen: list[EvidenceOption] = []
        self.slots: dict[str, list[str]] = {}
        self.selections: list[EvidenceSelection] = []
        self._per_company: dict[str, int] = {}
        self._per_source: dict[str, int] = {}
        self._companies_by_slot: dict[str, set[str]] = {}

    @property
    def full(self) -> bool:
        return len(self.chosen) >= self._policy.max_members

    def blocked(self, option: EvidenceOption) -> str | None:
        """쏠림 한도에 걸리면 사유를, 걸리지 않으면 비운다."""
        company = option.candidate.company_id
        if company and self._per_company.get(company, 0) >= self._policy.max_per_company:
            return REASON_COMPANY_CONCENTRATION
        snapshot = option.snapshot_id
        if snapshot and self._per_source.get(snapshot, 0) >= self._policy.max_per_source:
            return REASON_SOURCE_CONCENTRATION
        return None

    def companies_of(self, slot: str) -> set[str]:
        return self._companies_by_slot.setdefault(slot, set())

    def add(self, option: EvidenceOption, slot: str, reason_code: str) -> None:
        self.chosen.append(option)
        self.slots.setdefault(slot, []).append(option.candidate_id)
        self.selections.append(
            EvidenceSelection(
                candidate_id=option.candidate_id, slot=slot, reason_code=reason_code
            )
        )
        company = option.candidate.company_id
        if company:
            self._per_company[company] = self._per_company.get(company, 0) + 1
            self.companies_of(slot).add(company)
        snapshot = option.snapshot_id
        if snapshot:
            self._per_source[snapshot] = self._per_source.get(snapshot, 0) + 1

    def filled(self) -> dict[str, int]:
        return {slot: len(ids) for slot, ids in self.slots.items()}


def optimize(
    objective: ObjectiveContract,
    options: Sequence[EvidenceOption],
    purpose: AllowedUse,
    policy: OptimizationPolicy = OPTIMIZATION_POLICY_V1,
) -> EvidenceSetOutcome:
    """최소하고 충분한 근거 집합을 고른다.

    판정 순서가 결과를 정한다. 먼저 떨어뜨리고 그다음에 채운다.

    1. 자료 계층 정책. 계층을 모르는 후보, 용도 밖 계층, 신뢰도 없는 D 계층을
       떨어뜨린다. 정책 위반은 다른 어떤 장점으로도 덮이지 않으므로 가장 먼저 본다.
    2. 중복. 같은 후보 식별자와 같은 대상을 두 번 담지 않는다.
    3. 필수 슬롯. 선언 순서대로 채운다. 슬롯 안에서는 독립 회사 최소 수를 먼저
       채우고 그다음 최소 개수를 채운다. 쏠림 한도에 걸린 후보는 건너뛴다.
    4. 선택 슬롯. 남은 예산 안에서 채운다.
    5. 남은 후보. 맞는 슬롯이 이미 찼거나 예산이 없어 담지 않은 사실을 남긴다.

    같은 입력에 같은 출력을 낸다. 후보 정렬이 고정되어 있고 `set` 순회 순서에
    기대지 않는다.
    """
    admitted, rejections = _screen(options, purpose)
    basket = _Basket(policy)

    for slot in objective.required_slots:
        _fill(basket, slot, admitted, required=True)
    for slot in objective.required_evidence_slots:
        if slot.required:
            continue
        _fill(basket, slot, admitted, required=False)

    chosen_ids = {option.candidate_id for option in basket.chosen}
    for option in admitted:
        if option.candidate_id in chosen_ids:
            continue
        rejections.append(_leftover(basket, objective, option, policy))

    filled = basket.filled()
    unmet_conditions: list[str] = []
    if purpose in ANCHOR_REQUIRED and not any(
        option.tier is SourceTier.POSTING for option in basket.chosen
    ):
        unmet_conditions.append(NO_POSTING_ANCHOR)

    members = tuple(
        option.candidate.model_copy(update={"selected": True})
        for option in basket.chosen
    )
    evidence_set = EvidenceSet(
        evidence_set_id=evidence_set_identifier(
            objective.objective_id,
            policy.optimization_policy_version,
            [option.candidate_id for option in basket.chosen],
        ),
        objective_id=objective.objective_id,
        optimization_policy_version=policy.optimization_policy_version,
        members=members,
        slot_assignment={slot: tuple(ids) for slot, ids in basket.slots.items()},
    )
    return EvidenceSetOutcome(
        evidence_set=evidence_set,
        selections=tuple(basket.selections),
        rejections=tuple(rejections),
        unmet_slots=objective.unmet(filled),
        unmet_conditions=tuple(unmet_conditions),
    )


# ------------------------------------------------------------ 내부
def _screen(
    options: Sequence[EvidenceOption], purpose: AllowedUse
) -> tuple[list[EvidenceOption], list[EvidenceRejection]]:
    """정책과 중복으로 후보를 거른다. 통과한 목록은 정렬되어 있다."""
    allowed = TIER_SCOPE.get(purpose, frozenset())
    rejections: list[EvidenceRejection] = []
    admitted: list[EvidenceOption] = []
    seen_ids: set[str] = set()
    seen_targets: set[tuple[str, str]] = set()

    for option in sorted(options, key=option_sort_key):
        candidate_id = option.candidate_id
        if candidate_id in seen_ids:
            rejections.append(
                EvidenceRejection(
                    candidate_id=candidate_id, reason_code=REASON_DUPLICATE_CANDIDATE
                )
            )
            continue
        seen_ids.add(candidate_id)

        tier = option.tier
        if tier is None:
            rejections.append(
                EvidenceRejection(
                    candidate_id=candidate_id, reason_code=REASON_TIER_UNKNOWN
                )
            )
            continue
        if tier not in allowed:
            rejections.append(
                EvidenceRejection(
                    candidate_id=candidate_id,
                    reason_code=REASON_TIER_OUT_OF_SCOPE,
                    detail={"tier": str(tier), "purpose": str(purpose)},
                )
            )
            continue
        if tier is SourceTier.VERIFIED_EXTERNAL and option.reliability_score is None:
            rejections.append(
                EvidenceRejection(
                    candidate_id=candidate_id, reason_code=REASON_RELIABILITY_MISSING
                )
            )
            continue

        if option.target_key in seen_targets:
            rejections.append(
                EvidenceRejection(
                    candidate_id=candidate_id,
                    reason_code=REASON_DUPLICATE_TARGET,
                    detail={
                        "target_type": option.candidate.target_type,
                        "target_id": option.candidate.target_id,
                    },
                )
            )
            continue
        seen_targets.add(option.target_key)
        admitted.append(option)

    return admitted, rejections


def _matches(slot: EvidenceSlot, option: EvidenceOption) -> bool:
    """후보가 이 슬롯의 근거 종류와 계층 조건에 맞는가."""
    if option.candidate.target_type not in target_types_for(slot.support_type):
        return False
    if slot.allowed_tiers and option.tier not in slot.allowed_tiers:
        return False
    return True


def _fill(
    basket: _Basket,
    slot: EvidenceSlot,
    admitted: Sequence[EvidenceOption],
    required: bool,
) -> None:
    """슬롯 하나를 채운다.

    독립 회사 최소 수를 먼저 채운다. 회사 셋을 요구하는 슬롯을 최소 개수부터 채우면
    같은 회사의 상위 후보가 자리를 먼저 차지해 다양성 조건이 남지 않는다.
    """
    chosen_ids = {option.candidate_id for option in basket.chosen}
    matching = [
        option
        for option in admitted
        if option.candidate_id not in chosen_ids and _matches(slot, option)
    ]

    if slot.minimum_independent_companies:
        for option in matching:
            if len(basket.companies_of(slot.slot)) >= slot.minimum_independent_companies:
                break
            if basket.full:
                break
            company = option.candidate.company_id
            if not company or company in basket.companies_of(slot.slot):
                continue
            if basket.blocked(option) is not None:
                continue
            basket.add(option, slot.slot, PICK_COMPANY_DIVERSITY)

    reason = PICK_SLOT_MINIMUM if required else PICK_OPTIONAL_SLOT
    for option in matching:
        if len(basket.slots.get(slot.slot, ())) >= slot.minimum:
            break
        if basket.full:
            break
        if option.candidate_id in {o.candidate_id for o in basket.chosen}:
            continue
        if basket.blocked(option) is not None:
            continue
        basket.add(option, slot.slot, reason)


def _leftover(
    basket: _Basket,
    objective: ObjectiveContract,
    option: EvidenceOption,
    policy: OptimizationPolicy,
) -> EvidenceRejection:
    """묶음에 들어가지 못한 후보의 사유를 정한다.

    쏠림 한도, 예산, 슬롯 충족, 맞는 슬롯 없음 순으로 본다. 앞의 사유가 뒤의 사유를
    가리므로 실제로 무엇이 막았는지가 남는다.
    """
    blocked = basket.blocked(option)
    if blocked is not None:
        return EvidenceRejection(candidate_id=option.candidate_id, reason_code=blocked)

    fits = [
        slot for slot in objective.required_evidence_slots if _matches(slot, option)
    ]
    if not fits:
        return EvidenceRejection(
            candidate_id=option.candidate_id,
            reason_code=REASON_NO_MATCHING_SLOT,
            detail={"target_type": option.candidate.target_type},
        )
    if basket.full:
        return EvidenceRejection(
            candidate_id=option.candidate_id,
            reason_code=REASON_BUDGET_EXHAUSTED,
            detail={"max_members": policy.max_members},
        )
    return EvidenceRejection(
        candidate_id=option.candidate_id,
        reason_code=REASON_SLOT_SATISFIED,
        detail={"slots": [slot.slot for slot in fits]},
    )


__all__ = [
    "ANCHOR_REQUIRED",
    "NO_POSTING_ANCHOR",
    "OPTIMIZATION_POLICIES",
    "OPTIMIZATION_POLICY_V1",
    "PICK_COMPANY_DIVERSITY",
    "PICK_OPTIONAL_SLOT",
    "PICK_SLOT_MINIMUM",
    "REASON_BUDGET_EXHAUSTED",
    "REASON_COMPANY_CONCENTRATION",
    "REASON_DUPLICATE_CANDIDATE",
    "REASON_DUPLICATE_TARGET",
    "REASON_NO_MATCHING_SLOT",
    "REASON_RELIABILITY_MISSING",
    "REASON_SLOT_SATISFIED",
    "REASON_SOURCE_CONCENTRATION",
    "REASON_TIER_OUT_OF_SCOPE",
    "REASON_TIER_UNKNOWN",
    "SET_PREFIX",
    "TIER_SCOPE",
    "UNKNOWN_POLICY",
    "EvidenceOption",
    "EvidenceRejection",
    "EvidenceSelection",
    "EvidenceSetOutcome",
    "OptimizationPolicy",
    "evidence_set_identifier",
    "optimization_policy_for",
    "optimize",
    "option_sort_key",
    "target_types_for",
]
