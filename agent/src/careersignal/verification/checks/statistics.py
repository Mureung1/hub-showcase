"""검사 4. 수치 일관성 검사.

정의는 docs/agent-design.md 9장의 검사 4와 docs/statistics-model.md 10장을 따른다.
세부 규정은 docs/metric-spec.md 7장에 있다.

판정 규칙은 `metrics/verification.py` 의 순수 함수가 담고, 이 모듈은 대상 판별과
`CheckOutcome` 조립만 담당한다. 저장소는 대조할 행을 공급하기만 한다.

대상은 둘이다.

- `statistic_fact`: `statistics_facts` 한 행.
- `statistics_aggregation`: 한 분석 버전의 집계 산출물 전체.

집계 산출물에 행이 하나도 없으면 통과가 아니라 `skip` 이다. 검사한 결과 문제가
없는 것과 검사할 대상이 없는 것을 같은 값으로 기록하면, 집계가 아무것도 만들지
않은 실행이 통과로 읽힌다. 구분은 docs/agent-design.md 9.3의 세 경우를 따른다.
"""

from __future__ import annotations

from typing import Any, Protocol

from careersignal.contracts.check_result import CheckVerdict, RepairAction, Severity
from careersignal.metrics.verification import (
    REASON_NOT_APPLICABLE_COMPUTED,
    REASON_SEGMENT_NOT_APPLICABLE,
    FactAudit,
    Violation,
    audit_facts,
)
from careersignal.verification.protocol import (
    REASON_NOT_APPLICABLE,
    Check,
    CheckContext,
    CheckOutcome,
    passed,
)

TARGET_FACT = "statistic_fact"
"""`statistics_facts` 한 행. `retrieval_candidates.target_type` 과 같은 이름이다."""

TARGET_AGGREGATION = "statistics_aggregation"
"""한 분석 버전의 집계 산출물 전체. `target_id` 는 분석 버전이다."""

REASON_TARGET_NOT_FOUND = "TARGET_NOT_FOUND"
"""대상 행을 찾지 못했다. 없는 것을 통과로 두지 않는다."""

REASON_NO_FACTS = "STATISTICS_NO_FACTS"
"""집계 산출물에 검사할 행이 없다. `skip` 의 사유이며 위반이 아니다."""

DROP_REASONS: frozenset[str] = frozenset(
    {REASON_NOT_APPLICABLE_COMPUTED, REASON_SEGMENT_NOT_APPLICABLE}
)
"""행 자체가 존재하면 안 되는 위반. 다시 계산하지 않고 폐기한다.

근거는 docs/metric-spec.md 5장이다. 적용 불가로 표시된 조합은 계산 대상이 아니므로
값을 고치는 것으로 해소되지 않는다.
"""

MAX_REPORTED = 20
"""`detail` 에 담는 위반 수의 상한. 판정은 전수로 하고 기록만 자른다."""


class StatisticsReader(Protocol):
    """검사가 필요로 하는 조회. 저장소가 이 모양을 만족한다."""

    def fact_ids(self, analysis_version: str) -> list[str]: ...
    def fact_audit(self, fact_id: str) -> FactAudit | None: ...


def repair_action_for(violations: tuple[Violation, ...]) -> RepairAction:
    """위반에 대응하는 수리 동작. docs/agent-design.md 10장의 표를 따른다.

    존재하면 안 되는 행은 폐기하고, 나머지 수치 위반은 재계산한다. 통계 오류는
    낮은 신뢰도로 유지하지 않는다.
    """
    if any(v.reason_code in DROP_REASONS for v in violations):
        return RepairAction.DROP_CLAIM
    return RepairAction.RECOMPUTE_STAT


def _failure(violations: tuple[Violation, ...], scanned: int) -> CheckOutcome:
    """위반을 하나의 판정으로 접는다. 사유 코드는 첫 위반의 것을 쓴다.

    나머지 위반은 `detail` 에 함께 남긴다. 한 번의 실행이 결함 전체를 드러내야
    수리 지시를 한 번에 만들 수 있다.
    """
    return CheckOutcome(
        verdict=CheckVerdict.FAIL,
        severity=Severity.BLOCKING,
        reason_code=violations[0].reason_code,
        repair_action=repair_action_for(violations),
        detail={
            "fact_count": scanned,
            "violation_count": len(violations),
            "violations": [v.as_dict() for v in violations[:MAX_REPORTED]],
        },
    )


def _outcome(audits: list[FactAudit]) -> CheckOutcome:
    violations = audit_facts(audits)
    if violations:
        return _failure(violations, len(audits))
    return passed()


def _skip(reason: str, detail: dict[str, Any]) -> CheckOutcome:
    return CheckOutcome(
        verdict=CheckVerdict.SKIP, reason_code=reason, detail=detail
    )


def numerical_consistency_check(reader: StatisticsReader) -> Check:
    """검사 4의 구현을 만든다."""

    def check(context: CheckContext) -> CheckOutcome:
        if context.target_type == TARGET_FACT:
            audit = reader.fact_audit(context.target_id)
            if audit is None:
                return CheckOutcome(
                    verdict=CheckVerdict.FAIL,
                    severity=Severity.BLOCKING,
                    reason_code=REASON_TARGET_NOT_FOUND,
                    detail={"fact_id": context.target_id},
                )
            return _outcome([audit])

        if context.target_type == TARGET_AGGREGATION:
            fact_ids = reader.fact_ids(context.target_id)
            if not fact_ids:
                return _skip(
                    REASON_NO_FACTS,
                    {"analysis_version": context.target_id, "fact_count": 0},
                )
            audits: list[FactAudit] = []
            missing: list[str] = []
            for fact_id in fact_ids:
                audit = reader.fact_audit(fact_id)
                if audit is None:
                    missing.append(fact_id)
                else:
                    audits.append(audit)
            if missing:
                return CheckOutcome(
                    verdict=CheckVerdict.FAIL,
                    severity=Severity.BLOCKING,
                    reason_code=REASON_TARGET_NOT_FOUND,
                    detail={"fact_ids": sorted(missing)[:MAX_REPORTED]},
                )
            return _outcome(audits)

        return _skip(REASON_NOT_APPLICABLE, {"target_type": context.target_type})

    return check
