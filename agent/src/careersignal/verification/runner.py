"""검사 실행.

정의는 docs/agent-design.md 9.3을 따른다.

러너는 판정하지 않는다. 선언된 순서대로 검사를 돌리고 결과를 그대로 모은다.
판정 유형과 상태 전이는 집계 단계가 담당한다.

세 가지를 러너가 직접 처리한다.

- 구현이 없는 검사는 `skip` 과 `CHECK_NOT_REGISTERED` 로 기록한다.
  실행하지 않은 사실이 기록에 남아야 릴리스 게이트가 이를 볼 수 있다.
- 검사가 예외로 끝나면 `fail` 과 `CHECK_ERROR` 로 기록하고 나머지 검사를 계속한다.
  검사 하나의 결함이 다른 검사의 결과를 가리지 않게 한다.
- 대상 식별자는 문맥에서 가져와 조립한다. 검사가 대상을 바꿀 수 없다.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from careersignal.contracts.check_result import (
    CheckName,
    CheckResult,
    CheckVerdict,
    Severity,
)
from careersignal.verification.protocol import (
    REASON_CHECK_ERROR,
    REASON_NOT_REGISTERED,
    CheckContext,
    CheckOutcome,
)
from careersignal.verification.registry import CheckRegistry


class CheckRunReport(BaseModel):
    """한 산출물에 대한 검사 실행 결과.

    `CheckResult` 목록만으로는 선언된 검사가 전부 실행됐는지 알 수 없다.
    `complete` 가 그 사실을 함께 전달한다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    target_type: str
    target_id: str
    analysis_version: str
    results: tuple[CheckResult, ...]

    @property
    def executed(self) -> tuple[CheckResult, ...]:
        return tuple(r for r in self.results if r.verdict is not CheckVerdict.SKIP)

    @property
    def skipped(self) -> tuple[CheckResult, ...]:
        return tuple(r for r in self.results if r.verdict is CheckVerdict.SKIP)

    @property
    def failed(self) -> tuple[CheckResult, ...]:
        return tuple(r for r in self.results if r.verdict is CheckVerdict.FAIL)

    @property
    def blocking(self) -> tuple[CheckResult, ...]:
        return tuple(r for r in self.results if r.blocks_publication)

    @property
    def unregistered(self) -> tuple[CheckName, ...]:
        """구현이 없어 실행하지 못한 검사."""
        return tuple(
            r.check for r in self.results if r.reason_code == REASON_NOT_REGISTERED
        )

    @property
    def errored(self) -> tuple[CheckName, ...]:
        return tuple(r.check for r in self.results if r.reason_code == REASON_CHECK_ERROR)

    @property
    def complete(self) -> bool:
        """선언된 검사가 모두 실행됐다. 거짓이면 검증이 끝난 것이 아니다."""
        return not self.unregistered


class CheckRunner:
    """등록된 검사를 선언 순서대로 실행한다."""

    def __init__(self, registry: CheckRegistry | None = None) -> None:
        self._registry = registry or CheckRegistry()

    @property
    def registry(self) -> CheckRegistry:
        return self._registry

    def run(self, context: CheckContext) -> CheckRunReport:
        results: list[CheckResult] = []
        for spec in self._registry.executable():
            outcome = self._outcome(spec.check, context)
            results.append(
                CheckResult(
                    check=spec.check,
                    target_type=context.target_type,
                    target_id=context.target_id,
                    verdict=outcome.verdict,
                    severity=outcome.severity,
                    reason_code=outcome.reason_code,
                    repair_action=outcome.repair_action,
                    judge_model=outcome.judge_model,
                    detail=outcome.detail,
                )
            )
        return CheckRunReport(
            target_type=context.target_type,
            target_id=context.target_id,
            analysis_version=context.run.analysis_version,
            results=tuple(results),
        )

    def _outcome(self, check: CheckName, context: CheckContext) -> CheckOutcome:
        implementation = self._registry.implementation(check)
        if implementation is None:
            return CheckOutcome(
                verdict=CheckVerdict.SKIP,
                severity=Severity.BLOCKING,
                reason_code=REASON_NOT_REGISTERED,
            )
        try:
            outcome = implementation(context)
        except Exception as exc:
            return self._error(exc)
        if not isinstance(outcome, CheckOutcome):
            return self._error(
                TypeError(f"{check} 가 CheckOutcome 이 아닌 {type(outcome).__name__} 을 돌려줬다")
            )
        return outcome

    @staticmethod
    def _error(exc: Exception) -> CheckOutcome:
        """검사가 터지면 판정을 알 수 없다. 모르는 것은 통과로 두지 않는다.

        `repair_action` 은 비운다. 검사기의 결함은 에이전트가 수리할 대상이 아니다.
        """
        return CheckOutcome(
            verdict=CheckVerdict.FAIL,
            severity=Severity.BLOCKING,
            reason_code=REASON_CHECK_ERROR,
            detail={"error": type(exc).__name__, "message": str(exc)},
        )
