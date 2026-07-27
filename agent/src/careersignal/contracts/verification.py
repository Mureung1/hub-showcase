"""검증 판정.

정의는 docs/agent-design.md 9.4를 따른다.
공개 여부는 docs/architecture.md 8.1의 공개 정책을 따른다.
"""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict

from careersignal.contracts.check_result import CheckResult, CheckVerdict, Severity


class TypedVerdict(StrEnum):
    VERIFIED = "verified"
    VERIFIED_WITH_WARNING = "verified_with_warning"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    CONTRADICTED = "contradicted"
    POLICY_VIOLATION = "policy_violation"
    SCHEMA_INVALID = "schema_invalid"
    NEEDS_RESEARCH = "needs_research"


PUBLISHABLE: frozenset[TypedVerdict] = frozenset(
    {TypedVerdict.VERIFIED, TypedVerdict.VERIFIED_WITH_WARNING}
)


def is_publishable(verdict: TypedVerdict) -> bool:
    return verdict in PUBLISHABLE


class VerificationResult(BaseModel):
    """한 산출물에 대한 검사 결과 묶음과 최종 판정."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    target_type: str
    target_id: str
    analysis_version: str
    checks: tuple[CheckResult, ...]
    verdict: TypedVerdict

    @property
    def failed(self) -> tuple[CheckResult, ...]:
        return tuple(c for c in self.checks if c.verdict is CheckVerdict.FAIL)

    @property
    def blocking(self) -> tuple[CheckResult, ...]:
        return tuple(c for c in self.checks if c.blocks_publication)

    @property
    def warnings(self) -> tuple[CheckResult, ...]:
        return tuple(
            c
            for c in self.checks
            if c.verdict is CheckVerdict.FAIL and c.severity is Severity.WARNING
        )

    @property
    def publishable(self) -> bool:
        return is_publishable(self.verdict)
