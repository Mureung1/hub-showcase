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

from collections import Counter
from collections.abc import Callable, Iterable, Sequence
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

REASON_PARTIAL_SCAN = "STATISTICS_PARTIAL_SCAN"
"""한도에 걸려 산출물의 일부만 대조했다. 위반이 없어도 통과가 아니다.

전수로 훑지 않은 실행을 `pass` 로 남기면 검사하지 않은 행이 통과로 읽힌다. 구분은
docs/agent-design.md 9.3의 세 경우와 같은 이유다. 남은 행 수를 `detail` 에 적어
다음 실행이 얼마나 남았는지 알 수 있게 한다.
"""

FACT_PAGE_SIZE = 500
"""한 묶음으로 읽는 지표 행 수.

행마다 한 번씩 읽으면 왕복이 행 수만큼 붙고, 전부를 한 번에 읽으면 산출물 전체와 그
재료가 동시에 메모리에 올라온다. 500 은 21,676행 기준 왕복 44번이라 왕복 비용이 이미
무시할 만하면서, 한 묶음이 들고 있는 행이 저장소가 한 번에 실어 보내기에 작다. 재료
가운데 크기가 큰 원자 행은 묶음과 무관하게 거래마다 한 벌만 캐시된다.
"""

DROP_REASONS: frozenset[str] = frozenset(
    {REASON_NOT_APPLICABLE_COMPUTED, REASON_SEGMENT_NOT_APPLICABLE}
)
"""행 자체가 존재하면 안 되는 위반. 다시 계산하지 않고 폐기한다.

근거는 docs/metric-spec.md 5장이다. 적용 불가로 표시된 조합은 계산 대상이 아니므로
값을 고치는 것으로 해소되지 않는다.
"""

MAX_REPORTED = 20
"""`detail` 에 담는 위반 수의 상한. 판정은 전수로 하고 기록만 자른다."""

UNKNOWN_FAMILY = "unknown"
"""지표 family 를 적지 않은 위반의 자리. 세는 표에서 빠지지 않게 이름을 준다."""


def counted(values: Iterable[str]) -> dict[str, int]:
    """값별 건수. 많은 것부터, 같으면 이름 순이다.

    차례를 정해 두는 이유는 실행마다 같은 줄이 같은 자리에 나와야 두 실행의 출력을
    눈으로 견줄 수 있기 때문이다.
    """
    counts = Counter(values)
    return dict(sorted(counts.items(), key=lambda item: (-item[1], item[0])))


def violation_breakdown(
    violations: Sequence[Violation],
) -> dict[str, dict[str, int]]:
    """위반을 지표 family 별·사유별로 센다.

    사유 코드 하나와 총 건수 하나만 남기면 어느 family 가 틀렸는지 알 수 없다. 판정은
    `_failure` 가 첫 위반의 사유 코드로 접으므로, 나머지 사유가 몇 건인지는 이 표에만
    남는다. 산출물이 2만 행이면 이 표가 없을 때 원인을 좁히는 유일한 방법이 행을 다시
    읽는 것이다.

    두 축을 곱해 교차표로 만들지 않는다. 어느 family 가 문제인지와 어느 규칙이 깨졌는지
    를 각각 한 줄로 읽는 것이 먼저이고, 둘을 함께 봐야 하는 자리는 예시가 채운다.
    """
    return {
        "by_family": counted(
            str(v.detail.get("metric_family", UNKNOWN_FAMILY)) for v in violations
        ),
        "by_reason": counted(v.reason_code for v in violations),
        "by_check": counted(str(v.detail.get("check", UNKNOWN_FAMILY)) for v in violations),
    }


class StatisticsReader(Protocol):
    """검사가 필요로 하는 조회. 저장소가 이 모양을 만족한다.

    집계 산출물 전체를 대조할 때는 `fact_count` 로 대상 수를 세고 `fact_audit_page`
    로 묶어 읽는다. `fact_audit` 은 행 하나를 대상으로 부르는 검사가 쓴다.
    """

    def fact_ids(self, analysis_version: str) -> list[str]: ...
    def fact_audit(self, fact_id: str) -> FactAudit | None: ...
    def fact_count(self, analysis_version: str) -> int: ...
    def fact_audit_page(
        self, analysis_version: str, after: str, size: int
    ) -> list[tuple[str, FactAudit | None]]: ...


Progress = Callable[[int, int], None]
"""`(검사한 행 수, 이번 실행이 대조할 행 수)`. 묶음마다 부른다.

검사가 화면을 모르므로 찍는 일은 호출자가 한다. 21,676행을 대조하는 동안 아무것도
나오지 않으면 멈춘 실행과 구분되지 않는다.
"""


def repair_action_for(violations: tuple[Violation, ...]) -> RepairAction:
    """위반에 대응하는 수리 동작. docs/agent-design.md 10장의 표를 따른다.

    존재하면 안 되는 행은 폐기하고, 나머지 수치 위반은 재계산한다. 통계 오류는
    낮은 신뢰도로 유지하지 않는다.
    """
    if any(v.reason_code in DROP_REASONS for v in violations):
        return RepairAction.DROP_CLAIM
    return RepairAction.RECOMPUTE_STAT


def _failure(
    violations: tuple[Violation, ...], scanned: int, remaining: int = 0
) -> CheckOutcome:
    """위반을 하나의 판정으로 접는다. 사유 코드는 첫 위반의 것을 쓴다.

    나머지 위반은 `detail` 에 함께 남긴다. 한 번의 실행이 결함 전체를 드러내야
    수리 지시를 한 번에 만들 수 있다.

    사유 코드 하나로는 산출물 전체의 결함을 말할 수 없으므로 family 별·사유별 건수를
    함께 담는다. 위반 행 수도 따로 센다. 한 행이 검사 여섯 개에서 각각 걸리면 위반
    건수가 행 수보다 커지고, 그 둘을 같은 수로 읽으면 결함 규모를 잘못 본다.
    """
    return CheckOutcome(
        verdict=CheckVerdict.FAIL,
        severity=Severity.BLOCKING,
        reason_code=violations[0].reason_code,
        repair_action=repair_action_for(violations),
        detail={
            "fact_count": scanned,
            "remaining_count": remaining,
            "violation_count": len(violations),
            "violated_fact_count": len(
                {str(v.detail.get("fact_id", "")) for v in violations}
            ),
            **violation_breakdown(violations),
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


def _scan(
    reader: StatisticsReader,
    analysis_version: str,
    budget: int,
    progress: Progress | None,
) -> tuple[tuple[Violation, ...], list[str], int]:
    """지표 행을 묶음으로 읽어 묶음마다 판정한다.

    돌려주는 값은 `(위반, 재료가 빈 행, 읽은 행 수)` 다. 묶음이 `size` 보다 적게 오면
    그 묶음이 마지막이다. 읽은 행 수를 따로 세는 이유는 재료가 빈 행도 검사한 행이기
    때문이다.

    판정을 묶음 안에서 끝내고 재료를 놓는다. `audit_facts` 가 행끼리 견주지 않고 행
    하나씩 판정하므로 산출물 전체의 재료를 동시에 들고 있을 이유가 없다. 남기는 것은
    위반뿐이며, 위반이 없는 실행은 묶음 하나만큼만 메모리를 쓴다.
    """
    violations: list[Violation] = []
    missing: list[str] = []
    after = ""
    scanned = 0
    while scanned < budget:
        size = min(FACT_PAGE_SIZE, budget - scanned)
        page = reader.fact_audit_page(analysis_version, after, size)
        if not page:
            break
        batch: list[FactAudit] = []
        for fact_id, audit in page:
            after = fact_id
            scanned += 1
            if audit is None:
                missing.append(fact_id)
            else:
                batch.append(audit)
        violations.extend(audit_facts(batch))
        if progress is not None:
            progress(scanned, budget)
        if len(page) < size:
            break
    return tuple(violations), missing, scanned


def numerical_consistency_check(
    reader: StatisticsReader,
    limit: int | None = None,
    progress: Progress | None = None,
) -> Check:
    """검사 4의 구현을 만든다.

    `limit` 은 이번 실행이 대조할 행 수의 상한이다. 주면 산출물의 앞에서부터 그만큼만
    훑고, 남은 행이 있으면 위반이 없어도 통과로 남기지 않는다. `progress` 는 묶음마다
    진행 상황을 받는다.
    """

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
            total = reader.fact_count(context.target_id)
            if not total:
                return _skip(
                    REASON_NO_FACTS,
                    {"analysis_version": context.target_id, "fact_count": 0},
                )
            budget = total if limit is None else min(limit, total)
            violations, missing, scanned = _scan(
                reader, context.target_id, budget, progress
            )
            remaining = max(total - scanned, 0)
            if missing:
                return CheckOutcome(
                    verdict=CheckVerdict.FAIL,
                    severity=Severity.BLOCKING,
                    reason_code=REASON_TARGET_NOT_FOUND,
                    detail={
                        "fact_ids": sorted(missing)[:MAX_REPORTED],
                        "fact_count": scanned,
                        "remaining_count": remaining,
                    },
                )
            if violations:
                return _failure(violations, scanned, remaining)
            if remaining:
                return _skip(
                    REASON_PARTIAL_SCAN,
                    {
                        "analysis_version": context.target_id,
                        "fact_count": scanned,
                        "remaining_count": remaining,
                        "total_count": total,
                    },
                )
            return CheckOutcome(
                verdict=CheckVerdict.PASS,
                detail={"fact_count": scanned, "remaining_count": 0},
            )

        return _skip(REASON_NOT_APPLICABLE, {"target_type": context.target_type})

    return check
