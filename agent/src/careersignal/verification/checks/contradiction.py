"""검사 7. 상충 근거와 부재 확인.

정의는 docs/agent-design.md 9장의 검사 7을 따른다. 두 부분으로 나뉜다.

- 상충 근거: `contradiction_status` 가 `unresolved` 면 차단한다. 규칙 판정(A0)이다.
- 부재 확인: "이 요구는 없다"는 주장은 근거의 부재를 주장하므로, 반례를 찾지 못했다는
  사실만으로는 참이 되지 않는다. 부재를 확인하는 판정(A1)이 필요하다.

판정자 포트를 주입하지 않으면 검사 전체가 `not_applicable()` 이다. 규칙 부분만
따로 돌리지 않는 이유는 두 가지다. 첫째, 한 검사가 실행 여부를 반씩 갖는 결과를
남기면 `verification_results` 한 행이 무엇을 검사했는지 읽을 수 없다. 둘째,
데모(agent/data/demo_seed/CONTRACT.md 11장)는 검사 5·6·7 을 모두 `not_applicable`
로 기록하기로 정했고, 그 값이라야 러너의 `CHECK_NOT_REGISTERED` 와 구분되어
분석 버전이 검사 1~4 만으로 `gated` 에 이른다(docs/agent-design.md 9.3·9.4).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable

from careersignal.contracts.check_result import CheckVerdict, RepairAction, Severity
from careersignal.domain.confidence import ContradictionStatus
from careersignal.verification.protocol import (
    REASON_NOT_APPLICABLE,
    Check,
    CheckContext,
    CheckOutcome,
    not_applicable,
)

TARGET_CLAIM = "analysis_claim"

ABSENCE_CLAIM_TYPES: frozenset[str] = frozenset({"absence", "no_deviation"})
"""근거의 부재를 주장하는 유형.

`domain/confidence.py` 의 `ClaimType.ABSENCE` 와 자료 정책 검사가 쓰는
`no_deviation` 을 함께 받는다. 두 이름이 같은 것을 가리키므로 한쪽만 보면
어휘가 다른 저장 경로에서 부재 확인이 통째로 빠진다.
"""

REASON_TARGET_NOT_FOUND = "TARGET_NOT_FOUND"
"""대상 주장을 찾지 못했다. 상충 여부를 알 수 없는 것을 통과로 두지 않는다."""

REASON_UNRESOLVED = "CONTRADICTION_UNRESOLVED"
"""상충 근거가 해소되지 않았다. 판정 유형은 `contradicted` 다."""

REASON_ABSENCE_REFUTED = "CONTRADICTION_ABSENCE_REFUTED"
"""부재 주장인데 판정자가 부재를 확인하지 못했다. 반증된 부재 주장은 폐기한다."""


@dataclass(frozen=True, slots=True)
class AbsenceJudgment:
    """부재 확인 한 건. `confirmed` 가 참이면 부재가 확인된 것이다."""

    confirmed: bool
    rationale: str = ""
    model: str = ""


class ContradictionReader(Protocol):
    """검사가 필요로 하는 조회. 저장소가 이 모양을 만족한다."""

    def claim_type(self, claim_id: str) -> str | None: ...
    def claim_statement(self, claim_id: str) -> str | None: ...
    def contradiction_status(self, claim_id: str) -> ContradictionStatus | None: ...
    def counterevidence_texts(self, claim_id: str) -> list[str]: ...


@runtime_checkable
class AbsenceJudge(Protocol):
    """부재 주장이 실제로 부재인지 판정하는 것."""

    def confirm_absence(
        self, statement: str, counterevidence: tuple[str, ...]
    ) -> AbsenceJudgment: ...


def _model_of(judge: AbsenceJudge, judgment: AbsenceJudgment) -> str | None:
    return judgment.model or getattr(judge, "model", None)


def contradiction_detector_check(
    reader: ContradictionReader | None = None,
    judge: AbsenceJudge | None = None,
) -> Check:
    """검사 7의 구현을 만든다.

    `judge` 가 없으면 조회도 하지 않고 `not_applicable` 로 끝낸다.
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
        status = reader.contradiction_status(claim_id)
        if status is None:
            return CheckOutcome(
                verdict=CheckVerdict.FAIL,
                severity=Severity.BLOCKING,
                reason_code=REASON_TARGET_NOT_FOUND,
                detail={"claim_id": claim_id},
            )

        counter = tuple(reader.counterevidence_texts(claim_id))
        if status is ContradictionStatus.UNRESOLVED:
            # 반례를 더 모아 어느 쪽이 맞는지 가려야 해소된다.
            return CheckOutcome(
                verdict=CheckVerdict.FAIL,
                severity=Severity.BLOCKING,
                reason_code=REASON_UNRESOLVED,
                repair_action=RepairAction.ADD_COUNTEREVIDENCE,
                detail={
                    "claim_id": claim_id,
                    "contradiction_status": str(status),
                    "counterevidence_count": len(counter),
                },
            )

        claim_type = reader.claim_type(claim_id)
        if claim_type not in ABSENCE_CLAIM_TYPES:
            return CheckOutcome(
                verdict=CheckVerdict.PASS,
                detail={
                    "contradiction_status": str(status),
                    "counterevidence_count": len(counter),
                },
            )

        statement = reader.claim_statement(claim_id)
        if statement is None:
            return CheckOutcome(
                verdict=CheckVerdict.FAIL,
                severity=Severity.BLOCKING,
                reason_code=REASON_TARGET_NOT_FOUND,
                detail={"claim_id": claim_id},
            )

        judgment = judge.confirm_absence(statement, counter)
        detail = {
            "claim_type": claim_type,
            "contradiction_status": str(status),
            "counterevidence_count": len(counter),
            "rationale": judgment.rationale,
        }
        if judgment.confirmed:
            return CheckOutcome(
                verdict=CheckVerdict.PASS,
                judge_model=_model_of(judge, judgment),
                detail=detail,
            )
        # 없다고 한 것이 있었다. 범위를 좁혀도 남지 않으므로 폐기한다.
        return CheckOutcome(
            verdict=CheckVerdict.FAIL,
            severity=Severity.BLOCKING,
            reason_code=REASON_ABSENCE_REFUTED,
            repair_action=RepairAction.DROP_CLAIM,
            judge_model=_model_of(judge, judgment),
            detail=detail,
        )

    return check


__all__ = [
    "ABSENCE_CLAIM_TYPES",
    "REASON_ABSENCE_REFUTED",
    "REASON_TARGET_NOT_FOUND",
    "REASON_UNRESOLVED",
    "AbsenceJudge",
    "AbsenceJudgment",
    "ContradictionReader",
    "contradiction_detector_check",
]
