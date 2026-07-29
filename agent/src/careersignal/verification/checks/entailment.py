"""검사 5. 근거-주장 함의 검사.

정의는 docs/agent-design.md 9장의 검사 5를 따른다. 자율성은 A1 이며 생성 모델을 쓴다.

판정자 포트를 주입하지 않으면 `not_applicable()` 을 돌려준다. 이유는 두 가지다.

- 러너의 `CHECK_NOT_REGISTERED` 는 구현이 없다는 뜻이고, 그 상태는 판정을 막는다
  (docs/agent-design.md 9.3·9.4). 구현은 있는데 판정자만 없는 상태를 그 값으로
  기록하면 파이프라인의 결함과 구분되지 않고 분석 버전이 늘 `failed` 로 떨어진다.
- 데모(agent/data/demo_seed/CONTRACT.md 11장)는 모델 호출 0회로 돌아야 한다.
  판정자를 비워 둔 채로 검사를 등록해도 `skip` + `CHECK_NOT_APPLICABLE` 로 남아,
  검사 1~4 의 결과만으로 `gated` 까지 갈 수 있다.

판정은 세 값이다. 근거가 주장을 지지하면 통과, 지지하지만 주장이 근거보다 넓으면
과잉 일반화라 범위를 좁히는 경고, 지지하지 않으면 근거를 갈아야 하는 차단이다.
과잉 일반화를 차단으로 두지 않는 이유는 근거 자체는 살아 있어 범위 축소로 해소되기
때문이다. 근거가 아예 받치지 못하는 것과 같은 무게로 다루지 않는다.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol, runtime_checkable

from careersignal.contracts.check_result import CheckVerdict, RepairAction, Severity
from careersignal.verification.protocol import (
    REASON_NOT_APPLICABLE,
    Check,
    CheckContext,
    CheckOutcome,
    not_applicable,
)

TARGET_CLAIM = "analysis_claim"

REASON_TARGET_NOT_FOUND = "TARGET_NOT_FOUND"
"""대상 주장을 찾지 못했다. 없는 것을 통과로 두지 않는다."""

REASON_NO_EVIDENCE = "ENTAILMENT_NO_EVIDENCE"
"""근거 연결이 없어 함의를 따질 것이 없다. 위반이 아니라 대상이 아니다.

근거 부족 자체는 검사 3과 필수 슬롯 판정이 다룬다. 여기서 다시 실패로 세면 같은
결함이 두 검사에서 나와 수리 지시가 겹친다.
"""

REASON_NOT_ENTAILED = "ENTAILMENT_NOT_SUPPORTED"
REASON_OVERGENERALIZED = "ENTAILMENT_OVERGENERALIZED"


class EntailmentLabel(StrEnum):
    """판정자가 돌려주는 세 값."""

    ENTAILED = "entailed"
    OVERGENERALIZED = "overgeneralized"
    NOT_ENTAILED = "not_entailed"


@dataclass(frozen=True, slots=True)
class EntailmentJudgment:
    """판정 한 건. `model` 은 실제로 판정한 모델 식별자다."""

    label: EntailmentLabel
    rationale: str = ""
    model: str = ""


class EntailmentReader(Protocol):
    """검사가 필요로 하는 조회. 저장소가 이 모양을 만족한다."""

    def claim_statement(self, claim_id: str) -> str | None: ...
    def claim_evidence_texts(self, claim_id: str) -> list[str]: ...


@runtime_checkable
class EntailmentJudge(Protocol):
    """주장 문장과 근거 문장을 받아 함의를 판정하는 것."""

    def judge(
        self, statement: str, evidence: tuple[str, ...]
    ) -> EntailmentJudgment: ...


def _model_of(judge: EntailmentJudge, judgment: EntailmentJudgment) -> str | None:
    """판정에 적힌 모델을 먼저 쓰고, 없으면 판정자가 선언한 것을 쓴다."""
    return judgment.model or getattr(judge, "model", None)


def claim_evidence_entailment_check(
    reader: EntailmentReader | None = None,
    judge: EntailmentJudge | None = None,
) -> Check:
    """검사 5의 구현을 만든다.

    `judge` 가 없으면 조회도 하지 않고 `not_applicable` 로 끝낸다. 판정자가 없는데
    저장소를 읽으면 쓰지 않을 값을 위해 왕복이 붙는다.
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

        judgment = judge.judge(statement, evidence)
        model = _model_of(judge, judgment)
        detail = {
            "evidence_count": len(evidence),
            "label": str(judgment.label),
            "rationale": judgment.rationale,
        }

        if judgment.label is EntailmentLabel.ENTAILED:
            return CheckOutcome(
                verdict=CheckVerdict.PASS, judge_model=model, detail=detail
            )
        if judgment.label is EntailmentLabel.OVERGENERALIZED:
            # 근거는 살아 있고 주장이 넓다. 범위를 좁히면 해소되므로 공개를 막지 않는다.
            return CheckOutcome(
                verdict=CheckVerdict.FAIL,
                severity=Severity.WARNING,
                reason_code=REASON_OVERGENERALIZED,
                repair_action=RepairAction.NARROW_SCOPE,
                judge_model=model,
                detail=detail,
            )
        return CheckOutcome(
            verdict=CheckVerdict.FAIL,
            severity=Severity.BLOCKING,
            reason_code=REASON_NOT_ENTAILED,
            repair_action=RepairAction.SWAP_EVIDENCE,
            judge_model=model,
            detail=detail,
        )

    return check
