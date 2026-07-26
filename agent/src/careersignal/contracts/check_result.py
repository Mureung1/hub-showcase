"""검사 결과 한 건.

정의는 docs/agent-design.md 9.2를 따른다.
판정은 단일 값이 아니라 검사별로 저장한다.
"""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class CheckName(StrEnum):
    """docs/agent-design.md 9장의 여덟 검사."""

    SCHEMA = "schema_validator"
    SOURCE_POLICY = "source_policy_validator"
    CITATION_SPAN = "citation_span_validator"
    NUMERICAL = "numerical_consistency"
    ENTAILMENT = "claim_evidence_entailment"
    CROSS_MODEL = "cross_model_sample_audit"
    CONTRADICTION = "contradiction_detector"
    TYPED_VERDICT = "typed_verdict"


class AutonomyLevel(StrEnum):
    """docs/architecture.md 2.1의 자율성 등급."""

    A0 = "A0"
    A1 = "A1"
    A2 = "A2"
    A3 = "A3"


CHECK_AUTONOMY: dict[CheckName, AutonomyLevel] = {
    CheckName.SCHEMA: AutonomyLevel.A0,
    CheckName.SOURCE_POLICY: AutonomyLevel.A0,
    CheckName.CITATION_SPAN: AutonomyLevel.A0,
    CheckName.NUMERICAL: AutonomyLevel.A0,
    CheckName.ENTAILMENT: AutonomyLevel.A1,
    CheckName.CROSS_MODEL: AutonomyLevel.A1,
    CheckName.CONTRADICTION: AutonomyLevel.A0,
    CheckName.TYPED_VERDICT: AutonomyLevel.A0,
}


class Severity(StrEnum):
    BLOCKING = "blocking"
    WARNING = "warning"
    INFO = "info"


class CheckVerdict(StrEnum):
    PASS = "pass"
    FAIL = "fail"
    SKIP = "skip"


class RepairAction(StrEnum):
    """docs/agent-design.md 10장의 수리 동작."""

    REQUERY = "requery"
    ADD_COUNTEREVIDENCE = "add_counterevidence"
    SWAP_EVIDENCE = "swap_evidence"
    DROP_CLAIM = "drop_claim"
    NARROW_SCOPE = "narrow_scope"
    LOWER_CONFIDENCE = "lower_confidence"
    RECOMPUTE_STAT = "recompute_stat"
    FIX_IDENTIFIER = "fix_identifier"
    REQUEST_RESEARCH = "request_research"


class CheckResult(BaseModel):
    """`verification_results` 한 행에 대응한다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    check: CheckName
    target_type: str
    target_id: str
    verdict: CheckVerdict
    severity: Severity = Severity.INFO
    reason_code: str | None = None
    repair_action: RepairAction | None = None
    judge_model: str | None = None
    detail: dict[str, object] | None = None

    @property
    def autonomy_level(self) -> AutonomyLevel:
        return CHECK_AUTONOMY[self.check]

    @property
    def blocks_publication(self) -> bool:
        return self.verdict is CheckVerdict.FAIL and self.severity is Severity.BLOCKING
