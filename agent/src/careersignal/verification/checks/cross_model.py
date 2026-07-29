"""검사 6. 교차 모델 표본 감사.

정의는 docs/agent-design.md 9장의 검사 6과 9.1의 위험 기반 표본을 따른다.
자율성은 A1 이며 생성 계열과 다른 모델을 쓴다.

판정자 포트를 주입하지 않으면 `not_applicable()` 을 돌려준다. `CHECK_NOT_REGISTERED`
로 떨어지면 구현이 없다는 뜻이 되어 판정 자체가 막히고(docs/agent-design.md 9.3·9.4),
데모(agent/data/demo_seed/CONTRACT.md 11장)가 모델 호출 0회로 `gated` 까지 갈 수 없다.
구현은 있고 판정자만 비었다는 사실은 `skip` + `CHECK_NOT_APPLICABLE` 로 남긴다.

감사 모델은 `providers/models.py` 의 `NVIDIA_AUDIT_MODEL` 이다. 산출물을 만든 계열이
자기 산출물을 다시 판정하면 자기 선호가 그대로 통과로 남으므로 계열을 바꾼다.

표본 추출은 결정적이다. 후보를 정렬해 앞에서 `SAMPLE_SIZE` 개를 취한다. 무작위로
뽑으면 같은 봉투로 재실행해도 다른 주장이 감사되어, 통과한 실행을 다시 통과시키지
못한다. 검증 결과의 재현은 실행 봉투의 요구(docs/architecture.md 5장)에 속한다.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Protocol, runtime_checkable

from careersignal.contracts.check_result import CheckVerdict, RepairAction, Severity
from careersignal.providers.models import NVIDIA_AUDIT_MODEL
from careersignal.verification.protocol import (
    REASON_NOT_APPLICABLE,
    Check,
    CheckContext,
    CheckOutcome,
    not_applicable,
)

TARGET_CLAIM = "analysis_claim"

SAMPLE_SIZE = 20
"""한 분석 버전에서 교차 감사할 주장 수의 상한.

검사 6은 전건이 아니라 위험 표본에만 적용한다(docs/agent-design.md 9장). 위험 조건에
걸린 주장이 많아도 상한을 두는 이유는 이 검사만 다른 계열의 모델을 호출하기 때문이며,
20 은 위험 조건별로 몇 건씩 걸리는 규모에서 조건마다 실례가 남는 크기다.
"""

REASON_TARGET_NOT_FOUND = "TARGET_NOT_FOUND"

REASON_NOT_SAMPLED = "CROSS_MODEL_NOT_SAMPLED"
"""위험 표본에 들지 않았다. docs/agent-design.md 9.2가 요구하는 `skip` 이다."""

REASON_NO_EVIDENCE = "CROSS_MODEL_NO_EVIDENCE"
"""근거가 없어 재판정할 것이 없다. 근거 부족은 검사 3과 필수 슬롯 판정이 다룬다."""

REASON_DISAGREEMENT = "CROSS_MODEL_DISAGREEMENT"
"""다른 계열의 모델이 같은 근거로 다르게 판정했다. 판정 유형은 `contradicted` 다."""


@dataclass(frozen=True, slots=True)
class AuditJudgment:
    """감사 한 건. `agrees` 가 거짓이면 원 판정과 어긋난다."""

    agrees: bool
    rationale: str = ""
    model: str = ""


class CrossModelReader(Protocol):
    """검사가 필요로 하는 조회. 저장소가 이 모양을 만족한다.

    `risk_sample_candidates` 는 docs/agent-design.md 9.1의 위험 조건에 걸린 주장의
    식별자다. 조건 판정은 `verification/integrated.py` 의 순수 함수가 담고, 저장소는
    그 결과로 추린 목록을 공급한다.
    """

    def risk_sample_candidates(self, analysis_version: str) -> list[str]: ...
    def claim_statement(self, claim_id: str) -> str | None: ...
    def claim_evidence_texts(self, claim_id: str) -> list[str]: ...


@runtime_checkable
class CrossModelJudge(Protocol):
    """다른 모델 계열로 주장을 다시 판정하는 것."""

    def audit(self, statement: str, evidence: tuple[str, ...]) -> AuditJudgment: ...


def select_sample(
    candidates: Iterable[str], size: int = SAMPLE_SIZE
) -> tuple[str, ...]:
    """결정적 표본. 중복을 없애고 정렬한 뒤 앞에서 `size` 개를 취한다.

    같은 후보 목록이면 실행마다 같은 표본이 나온다. 순서가 저장소의 조회 순서에
    좌우되지 않도록 여기서 다시 정렬한다.
    """
    if size < 0:
        raise ValueError("표본 크기는 음수일 수 없다")
    return tuple(sorted(set(candidates))[:size])


def _model_of(judge: CrossModelJudge, judgment: AuditJudgment) -> str:
    """판정에 적힌 모델을 먼저 쓰고, 없으면 판정자가 선언한 것, 그다음이 기본값이다."""
    return judgment.model or getattr(judge, "model", None) or NVIDIA_AUDIT_MODEL


def cross_model_sample_audit_check(
    reader: CrossModelReader | None = None,
    judge: CrossModelJudge | None = None,
    sample_size: int = SAMPLE_SIZE,
) -> Check:
    """검사 6의 구현을 만든다.

    `judge` 가 없으면 조회도 하지 않고 `not_applicable` 로 끝낸다. 표본을 뽑기 위한
    왕복도 판정자가 없으면 쓸모가 없다.
    """

    def check(context: CheckContext) -> CheckOutcome:
        if judge is None:
            return not_applicable()
        if context.target_type != TARGET_CLAIM:
            return CheckOutcome(
                verdict=CheckVerdict.SKIP,
                reason_code=REASON_NOT_APPLICABLE,
                detail={"target_type": context.target_type},
            )
        if reader is None:
            raise ValueError("판정자를 주면 조회도 함께 줘야 한다")

        claim_id = context.target_id
        version = context.run.analysis_version
        sample = select_sample(reader.risk_sample_candidates(version), sample_size)
        if claim_id not in sample:
            return CheckOutcome(
                verdict=CheckVerdict.SKIP,
                reason_code=REASON_NOT_SAMPLED,
                detail={"claim_id": claim_id, "sample_size": len(sample)},
            )

        statement = reader.claim_statement(claim_id)
        if statement is None:
            return CheckOutcome(
                verdict=CheckVerdict.FAIL,
                severity=Severity.BLOCKING,
                reason_code=REASON_TARGET_NOT_FOUND,
                detail={"claim_id": claim_id},
            )

        evidence = tuple(reader.claim_evidence_texts(claim_id))
        if not evidence:
            return CheckOutcome(
                verdict=CheckVerdict.SKIP,
                reason_code=REASON_NO_EVIDENCE,
                detail={"claim_id": claim_id, "evidence_count": 0},
            )

        judgment = judge.audit(statement, evidence)
        model = _model_of(judge, judgment)
        detail = {
            "evidence_count": len(evidence),
            "sample_size": len(sample),
            "rationale": judgment.rationale,
        }
        if judgment.agrees:
            return CheckOutcome(
                verdict=CheckVerdict.PASS, judge_model=model, detail=detail
            )
        # 두 계열의 판정이 갈렸다. 어느 쪽이 옳은지는 반례 근거를 확보해 가린다.
        return CheckOutcome(
            verdict=CheckVerdict.FAIL,
            severity=Severity.BLOCKING,
            reason_code=REASON_DISAGREEMENT,
            repair_action=RepairAction.ADD_COUNTEREVIDENCE,
            judge_model=model,
            detail=detail,
        )

    return check
