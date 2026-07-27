"""검사 8. 판정 집계와 상태 전이.

정의는 docs/agent-design.md 9.4와 docs/architecture.md 8장을 따른다.

이 단계는 앞선 일곱 검사의 결과를 입력으로 받으므로 러너가 실행하지 않는다.
개별 검사와 입력이 다르기 때문이다.

판정하지 않는 경우가 있다. 선언된 검사가 모두 실행되지 않았으면 산출물의 상태를
알 수 없다. 일곱 판정은 검증이 끝난 산출물의 결과를 나타내는 값이므로, 끝나지
않은 것에 이름을 붙이지 않고 None 을 돌려준다.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence

from careersignal.contracts.check_result import (
    CheckName,
    CheckResult,
    RepairAction,
)
from careersignal.contracts.verification import (
    TypedVerdict,
    VerificationResult,
    is_publishable,
)
from careersignal.domain.versioning import AnalysisVersionStatus, require_transition
from careersignal.verification.runner import CheckRunReport

VERDICT_BY_CHECK: dict[CheckName, TypedVerdict] = {
    CheckName.SCHEMA: TypedVerdict.SCHEMA_INVALID,
    CheckName.SOURCE_POLICY: TypedVerdict.POLICY_VIOLATION,
    CheckName.CONTRADICTION: TypedVerdict.CONTRADICTED,
    # 재계산 값이 다르거나 다른 모델이 다르게 판정했다는 것은 어긋나는 판정이 있다는 뜻이다.
    CheckName.NUMERICAL: TypedVerdict.CONTRADICTED,
    CheckName.CROSS_MODEL: TypedVerdict.CONTRADICTED,
    # 인용 위치가 원문과 다르거나 근거가 주장을 지지하지 않으면 받치는 것이 없다.
    CheckName.CITATION_SPAN: TypedVerdict.INSUFFICIENT_EVIDENCE,
    CheckName.ENTAILMENT: TypedVerdict.INSUFFICIENT_EVIDENCE,
}
"""차단 판정이 난 검사를 판정 유형으로 옮긴다."""

VERDICT_PRIORITY: tuple[TypedVerdict, ...] = (
    TypedVerdict.SCHEMA_INVALID,
    TypedVerdict.POLICY_VIOLATION,
    TypedVerdict.CONTRADICTED,
    TypedVerdict.NEEDS_RESEARCH,
    TypedVerdict.INSUFFICIENT_EVIDENCE,
)
"""문제가 근본적인 순서. 구조가 깨졌으면 근거의 함의를 따질 수 없다.

`needs_research` 가 `insufficient_evidence` 보다 앞이다. 두 판정은 후속 동작이
다르다. `needs_research` 는 조사 요청을 발행하고 `insufficient_evidence` 는
비공개로 끝난다. 순서를 바꾸면 외부 자료로 해결할 수 있는 실패가 요청 없이 묻힌다.
"""


def _blocking_verdicts(checks: Sequence[CheckResult]) -> set[TypedVerdict]:
    found: set[TypedVerdict] = set()
    for check in checks:
        if not check.blocks_publication:
            continue
        if check.repair_action is RepairAction.REQUEST_RESEARCH:
            found.add(TypedVerdict.NEEDS_RESEARCH)
            continue
        mapped = VERDICT_BY_CHECK.get(check.check)
        if mapped is not None:
            found.add(mapped)
    return found


def decide(
    report: CheckRunReport, unmet_slots: Sequence[str] = ()
) -> TypedVerdict | None:
    """검사 결과를 판정 유형 하나로 접는다.

    `unmet_slots` 는 목표 계약의 미충족 필수 슬롯이다. 에이전트가 목표 계약을
    선언하기 전에는 비어 있다.

    선언된 검사가 모두 실행되지 않았으면 None 을 돌려준다.
    """
    if not report.complete:
        return None

    candidates = _blocking_verdicts(report.results)
    if unmet_slots:
        candidates.add(TypedVerdict.INSUFFICIENT_EVIDENCE)

    for verdict in VERDICT_PRIORITY:
        if verdict in candidates:
            return verdict

    if report.warnings:
        return TypedVerdict.VERIFIED_WITH_WARNING
    return TypedVerdict.VERIFIED


def summarize(
    report: CheckRunReport, unmet_slots: Sequence[str] = ()
) -> VerificationResult | None:
    """판정과 검사 결과를 한 묶음으로 만든다. 판정 불가면 None 이다."""
    verdict = decide(report, unmet_slots)
    if verdict is None:
        return None
    return VerificationResult(
        target_type=report.target_type,
        target_id=report.target_id,
        analysis_version=report.analysis_version,
        checks=report.results,
        verdict=verdict,
    )


def publishable(report: CheckRunReport, unmet_slots: Sequence[str] = ()) -> bool:
    """공개 후보 여부. 판정 불가는 공개하지 않는다."""
    verdict = decide(report, unmet_slots)
    return verdict is not None and is_publishable(verdict)


def validation_outcome(
    reports: Sequence[CheckRunReport],
    unmet: Mapping[str, Sequence[str]] | None = None,
) -> AnalysisVersionStatus:
    """`validating` 다음 상태를 정한다.

    하나라도 공개할 수 없으면 버전 전체가 `failed` 다. 한 화면만 새 버전인 상태를
    허용하지 않기 때문이다. 근거는 docs/architecture.md 8장이다.

    검사한 산출물이 없으면 통과가 아니라 `failed` 다. 검증하지 않은 버전을
    수용 평가로 넘기지 않는다.
    """
    slots = unmet or {}
    passed_all = bool(reports) and all(
        publishable(r, slots.get(r.target_id, ())) for r in reports
    )
    target = (
        AnalysisVersionStatus.GATED if passed_all else AnalysisVersionStatus.FAILED
    )
    require_transition(AnalysisVersionStatus.VALIDATING, target)
    return target
