"""계측 지표 계산.

Phase 24-2 다. 정의는 docs/architecture.md 14.2를 그대로 따른다.

| 지표 | 정의 |
| --- | --- |
| `citation_utilization` | 검색 결과 중 `unused` 외의 사용 목적이 기록된 비율 |
| `citation_precision` | 인용한 근거가 주장을 지지하는 비율 |
| `claim_coverage` | 허용된 근거가 연결된 주장의 비율 |
| `marginal_utility` | 특정 근거나 검색 전략을 제거했을 때의 결과 변화 |

앞의 세 지표는 계측 표의 조인으로 계산한다. 조인은 저장소가 하고 이 모듈은 그
결과 행만 받는다. 순수 함수이며 `psycopg` 를 import 하지 않는다.

`citation_utilization` 의 분자는 인용이 아니라 기여다. 검색 결과는 최종 인용 외에도
반례 검사, 용어 정규화, 다음 검색 계획, 부재 확인에 기여하므로(docs/architecture.md
14.2) 인용 여부만으로 검색의 가치를 판정하지 않는다. 기여로 세는 용도 목록은
`contracts/evidence.py` 의 `CONTRIBUTING_USAGES` 다.

`marginal_utility` 는 인터페이스만 둔다. 제거 실험은 평가 세트 표본에서 측정하며
계측 표의 조인으로는 계산할 수 없다. 실행은 평가 쪽의 일이다.

분모가 0 이면 값을 비운다. 0.0 으로 두면 아직 재지 않은 것과 재었더니 0 인 것을
구분할 수 없다. 억제와 같은 이유이며 근거는 docs/statistics-model.md 의 표본 상태
판정이다.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from pydantic import BaseModel, ConfigDict

from careersignal.contracts.evidence import CONTRIBUTING_USAGES, UsageType
from careersignal.domain.source_policy import AllowedUse, SourceTier
from careersignal.graph.evidence import TIER_SCOPE

VALUE_DIGITS = 6
"""`evaluation_metrics.value` 가 numeric(12,6) 이다. 저장 자리보다 긴 값을 만들지 않는다."""

CITING_USAGES: frozenset[UsageType] = frozenset(
    {UsageType.SUPPORTS_CLAIM, UsageType.CONTRADICTS_CLAIM}
)
"""주장에 인용한 용도. `citation_precision` 의 분모다.

반박도 인용이다. 근거를 주장에 붙였다는 점이 같고, 그중 지지한 비율이 정밀도다.
검증 전용·정규화·계획·부재 확인은 주장에 붙지 않으므로 분모에 들어가지 않는다.
"""


class CandidateUsageRow(BaseModel):
    """`retrieval_candidates` 와 `evidence_usages` 를 왼쪽 조인한 한 행.

    사용 기록이 없는 후보는 `usage_type` 이 비어 있다. 그 후보도 분모에 들어간다.
    검색이 만났으나 아무 데도 쓰이지 않은 결과가 분모에서 빠지면
    `citation_utilization` 이 언제나 1 에 가깝다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    candidate_id: str
    usage_type: UsageType | None = None
    used_claim_id: str | None = None


class ClaimEvidenceRow(BaseModel):
    """주장과 그 주장에 연결된 근거 한 쌍.

    근거가 하나도 없는 주장은 `candidate_id` 와 `source_tier` 가 비어 있다. 그
    주장도 분모에 들어간다. 근거 없는 주장이 분모에서 빠지면 `claim_coverage` 가
    연결 여부가 아니라 연결된 것들의 계층 분포를 재게 된다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    claim_id: str
    candidate_id: str | None = None
    source_tier: SourceTier | None = None
    usage_type: UsageType | None = None


def ratio(numerator: int, denominator: int) -> float | None:
    """비율 하나. 분모가 0 이면 비운다."""
    if denominator <= 0:
        return None
    if numerator < 0 or numerator > denominator:
        raise ValueError(f"분자 {numerator} 가 분모 {denominator} 와 맞지 않는다")
    return round(numerator / denominator, VALUE_DIGITS)


def citation_utilization(rows: Sequence[CandidateUsageRow]) -> float | None:
    """검색 결과 중 `unused` 외의 사용 목적이 기록된 비율.

    후보 단위로 센다. 한 후보에 사용 기록이 여러 줄이면 조인 결과가 그만큼 늘어나
    행 단위로 세면 많이 쓰인 후보가 분모를 부풀린다.
    """
    seen: set[str] = set()
    contributing: set[str] = set()
    for row in rows:
        seen.add(row.candidate_id)
        if row.usage_type in CONTRIBUTING_USAGES:
            contributing.add(row.candidate_id)
    return ratio(len(contributing), len(seen))


def citation_precision(rows: Sequence[CandidateUsageRow]) -> float | None:
    """인용한 근거가 주장을 지지하는 비율.

    분모는 주장에 붙은 인용이고 분자는 그중 지지다. `(후보, 주장)` 쌍으로 세어 한
    후보가 여러 주장에 붙은 경우를 각각 센다. 한 쌍이 지지이면서 반박일 수 없으므로
    쌍의 수가 분모다.
    """
    cited: set[tuple[str, str | None]] = set()
    supporting: set[tuple[str, str | None]] = set()
    for row in rows:
        if row.usage_type not in CITING_USAGES:
            continue
        pair = (row.candidate_id, row.used_claim_id)
        cited.add(pair)
        if row.usage_type is UsageType.SUPPORTS_CLAIM:
            supporting.add(pair)
    return ratio(len(supporting), len(cited))


def claim_coverage(
    rows: Sequence[ClaimEvidenceRow], purpose: AllowedUse
) -> float | None:
    """허용된 근거가 연결된 주장의 비율.

    허용 판정은 자료 계층과 용도로 한다. 표는 `graph/evidence.py` 의 `TIER_SCOPE`
    이며 근거 집합을 고를 때 쓴 표와 같다. 계산이 다른 표를 보면 근거 집합에 들어갈
    수 없는 자료가 보고에서는 연결로 세어진다.

    계층을 모르는 근거는 연결로 세지 않는다. 허용 여부를 판정할 수 없기 때문이다.
    """
    allowed_tiers = TIER_SCOPE.get(purpose, frozenset())
    claims: set[str] = set()
    covered: set[str] = set()
    for row in rows:
        claims.add(row.claim_id)
        if row.candidate_id is None or row.source_tier is None:
            continue
        if row.source_tier in allowed_tiers:
            covered.add(row.claim_id)
    return ratio(len(covered), len(claims))


class InstrumentationReport(BaseModel):
    """계측 지표 한 벌.

    분모를 함께 담는다. 비율만 남기면 후보 넷 중 셋과 후보 400 중 300 이 같은 값이
    되어 표본이 작아 흔들린 값을 알아볼 수 없다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    citation_utilization: float | None = None
    citation_precision: float | None = None
    claim_coverage: float | None = None

    candidates: int = 0
    """`citation_utilization` 의 분모. 검색이 만난 후보 수다."""

    citations: int = 0
    """`citation_precision` 의 분모. 주장에 붙은 인용 수다."""

    claims: int = 0
    """`claim_coverage` 의 분모. 판정한 주장 수다."""

    def values(self) -> dict[str, float | None]:
        """지표 이름에서 값으로 가는 대응. `evaluation_metrics` 의 모양이다."""
        return {
            "citation_utilization": self.citation_utilization,
            "citation_precision": self.citation_precision,
            "claim_coverage": self.claim_coverage,
        }


def report(
    usage_rows: Sequence[CandidateUsageRow],
    claim_rows: Sequence[ClaimEvidenceRow] = (),
    purpose: AllowedUse = AllowedUse.INTERPRETATION_CONTEXT,
) -> InstrumentationReport:
    """조인 결과 두 벌에서 지표 세 개를 낸다. 같은 입력에 같은 출력을 낸다."""
    citations = {
        (row.candidate_id, row.used_claim_id)
        for row in usage_rows
        if row.usage_type in CITING_USAGES
    }
    return InstrumentationReport(
        citation_utilization=citation_utilization(usage_rows),
        citation_precision=citation_precision(usage_rows),
        claim_coverage=claim_coverage(claim_rows, purpose),
        candidates=len({row.candidate_id for row in usage_rows}),
        citations=len(citations),
        claims=len({row.claim_id for row in claim_rows}),
    )


# ------------------------------------------------------------ 제거 실험
ABLATION_NOT_RUN = "제거 실험은 이 모듈이 실행하지 않는다"
"""`marginal_utility` 는 평가 세트 표본에서 측정한다(docs/architecture.md 14.2).

계측 표의 조인으로는 계산할 수 없다. 근거 하나를 뺀 실행을 다시 돌려야 결과 변화가
나오며, 그 실행은 평가 세트를 가진 쪽의 일이다. 여기서는 인터페이스만 둔다.
"""


class AblationCase(BaseModel):
    """무엇을 빼고 다시 돌리는지 한 건.

    근거 하나를 빼는 경우와 검색 전략 하나를 빼는 경우를 같은 모양으로 적는다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    removed_kind: str
    """`candidate` 또는 `strategy`. 무엇을 뺐는지."""

    removed_id: str
    """뺀 대상의 식별자. 후보 식별자이거나 전략 이름이다."""

    eval_set_id: str | None = None
    """표본을 고른 평가 세트. 표본 없이 잰 변화는 그 실행 하나의 우연일 수 있다."""


class AblationRunner(Protocol):
    """제거 실험을 실제로 돌리는 쪽의 자리.

    구현을 두지 않는다. 평가 세트 표본에서 다시 돌리는 일이며 이 모듈은 순수 함수만
    갖는다. 구현이 생기면 이 규약을 만족하면 된다.
    """

    def ablate(self, case: AblationCase) -> InstrumentationReport: ...


def marginal_utility(
    baseline: InstrumentationReport, ablated: InstrumentationReport
) -> dict[str, float | None]:
    """제거 전후의 결과 변화. 지표마다 `기준 - 제거 후` 다.

    양수면 뺀 것이 기여하고 있었다는 뜻이다. 한쪽 값이 비어 있으면 그 지표의 변화도
    비운다. 재지 못한 값과 변화가 없는 것을 0 으로 뭉치지 않는다.

    실험 자체는 돌리지 않는다. 두 보고를 받아 차이만 낸다.
    """
    before = baseline.values()
    after = ablated.values()
    delta: dict[str, float | None] = {}
    for name, value in before.items():
        other = after.get(name)
        delta[name] = (
            None
            if value is None or other is None
            else round(value - other, VALUE_DIGITS)
        )
    return delta


__all__ = [
    "ABLATION_NOT_RUN",
    "CITING_USAGES",
    "VALUE_DIGITS",
    "AblationCase",
    "AblationRunner",
    "CandidateUsageRow",
    "ClaimEvidenceRow",
    "InstrumentationReport",
    "citation_precision",
    "citation_utilization",
    "claim_coverage",
    "marginal_utility",
    "ratio",
    "report",
]
