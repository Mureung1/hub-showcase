"""검사 구현이 지켜야 하는 모양.

정의는 docs/agent-design.md 9.3을 따른다.

검사는 자기 판정만 돌려주고 대상 식별자를 다시 쓰지 않는다. 러너가 문맥의
식별자로 `CheckResult` 를 조립하므로 검사가 대상을 잘못 적을 경로가 없다.
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from pydantic import BaseModel, ConfigDict, Field, model_validator

from careersignal.contracts.check_result import CheckVerdict, RepairAction, Severity
from careersignal.contracts.run_context import RunContext

REASON_NOT_REGISTERED = "CHECK_NOT_REGISTERED"
"""선언된 검사에 구현이 없다. 산출물의 결함이 아니라 파이프라인의 결함이다."""

REASON_NOT_APPLICABLE = "CHECK_NOT_APPLICABLE"
"""검사의 적용 대상이 아니다. 검사 6은 위험 표본이 아닌 산출물에 이 값을 쓴다."""

REASON_CHECK_ERROR = "CHECK_ERROR"
"""검사가 예외로 끝나 판정을 알 수 없다. 모르는 것은 통과로 두지 않는다."""


class CheckContext(BaseModel):
    """검사 한 번의 입력."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    run: RunContext
    target_type: str
    target_id: str
    payload: dict[str, Any] = Field(default_factory=dict)
    """검사 대상 산출물. 저장소에서 읽어 온 값을 그대로 담는다."""


class CheckOutcome(BaseModel):
    """검사 하나의 판정. 대상 식별자는 담지 않는다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    verdict: CheckVerdict
    severity: Severity = Severity.INFO
    reason_code: str | None = None
    repair_action: RepairAction | None = None
    judge_model: str | None = None
    detail: dict[str, Any] | None = None

    @model_validator(mode="after")
    def _reason_required(self) -> CheckOutcome:
        """통과가 아닌 판정은 이유를 남긴다. 이유 없는 실패는 수리할 수 없다."""
        if self.verdict is not CheckVerdict.PASS and not self.reason_code:
            raise ValueError(f"{self.verdict} 판정은 reason_code 가 필요하다")
        if self.verdict is CheckVerdict.PASS and self.repair_action is not None:
            raise ValueError("pass 판정은 repair_action 을 갖지 않는다")
        return self


@runtime_checkable
class Check(Protocol):
    """검사 구현의 시그니처."""

    def __call__(self, context: CheckContext) -> CheckOutcome: ...


def passed() -> CheckOutcome:
    return CheckOutcome(verdict=CheckVerdict.PASS)


def not_applicable(reason: str = REASON_NOT_APPLICABLE) -> CheckOutcome:
    return CheckOutcome(verdict=CheckVerdict.SKIP, reason_code=reason)
