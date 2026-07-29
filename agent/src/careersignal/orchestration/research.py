"""조사 요청 정책 검사와 수집 스케줄링.

흐름은 docs/architecture.md 5.1 이다. 근거가 부족한 분석 에이전트는 수집
에이전트를 직접 부르지 않고 `research_requests` 에 요청을 남긴다. 이 모듈이 그
요청을 읽어 출처 정책을 검사하고 수집 실행을 만든다.

정책은 docs/data-strategy.md 3장의 계층별 허용 용도이며 판정은
`domain/source_policy.py` 가 이미 갖고 있다. 여기서 표를 다시 적지 않는다. 표가 두
곳에 있으면 검증의 자료 정책 검사와 조사 요청의 사전 검사가 서로 다른 답을 내고,
그러면 수집이 끝난 뒤에야 못 쓰는 근거였다는 것을 알게 된다.

정책을 어긴 요청은 `rejected` 로 닫는다. `open` 으로 두면 다음 실행이 같은 검사를
다시 하고 같은 이유로 다시 막는다. 닫으면서 사유를 남기므로 왜 안 되는지가 요청을
낸 실행의 기록으로 남는다.

순수 함수다. 저장소와 생성 모델을 import 하지 않는다. 요청 목록을 받아 판정과
수집 실행 계획을 돌려주며 저장은 `orchestrator.py` 가 한다.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

from careersignal.contracts.research import ResearchRequest, ResearchStatus
from careersignal.domain.scope import Scope
from careersignal.domain.source_policy import (
    TIER_ALLOWED_USES,
    AllowedUse,
    SourceTier,
    is_allowed,
)

COLLECTOR_AGENT_NAME = "collector"
"""수집 실행의 `agent_runs.agent_name`."""

QUEUE_STATUSES: tuple[ResearchStatus, ...] = (
    ResearchStatus.OPEN,
    ResearchStatus.SCHEDULED,
)
"""아직 결말이 나지 않은 상태.

`0001_initial_schema.sql` 의 `idx_research_requests_queue` 와
`SourceRepository.pending_research_requests` 가 같은 두 상태를 본다. 나머지 셋은
결말이므로 다시 스케줄링하지 않는다.
"""

STATUS_RANK: dict[ResearchStatus, int] = {
    ResearchStatus.OPEN: 0,
    ResearchStatus.SCHEDULED: 1,
}
"""읽는 차례. 아직 한 번도 잡히지 않은 요청을 먼저 본다.

`scheduled` 는 이미 실행이 잡혔으나 아직 근거를 얻지 못한 요청이다. 같은 우선순위면
한 번도 잡히지 않은 쪽을 먼저 잡아야 요청 하나가 실행을 되풀이 차지하지 않는다.
"""

UNKNOWN_EVIDENCE_TYPE = "허용 용도 목록에 없는 근거 유형"
NO_TIER_ALLOWS = "요청한 자료 계층이 이 용도를 허용하지 않는다"


@dataclass(frozen=True, slots=True)
class ResearchDecision:
    """요청 하나의 판정."""

    request_id: str
    status: ResearchStatus
    reason: str | None = None
    allowed_tiers: tuple[SourceTier, ...] = ()
    """정책상 이 용도를 채울 수 있는 계층. 수집 대상을 고를 때 이 목록으로 거른다."""

    @property
    def rejected(self) -> bool:
        return self.status is ResearchStatus.REJECTED


@dataclass(frozen=True, slots=True)
class CollectionRun:
    """수집 에이전트를 시작할 실행 하나.

    범위와 회사가 같은 요청을 한 실행으로 묶는다. 요청마다 실행을 열면 같은 회사의
    같은 자료를 여러 실행이 겹쳐 가져오고, 계측에는 실행 수만 늘어난다.
    """

    analysis_version: str
    scope: Scope
    company_id: str | None
    request_ids: tuple[str, ...]
    allowed_tiers: tuple[SourceTier, ...]
    priority: int
    agent_name: str = COLLECTOR_AGENT_NAME


@dataclass(frozen=True, slots=True)
class ResearchPlan:
    """검사한 요청 전부의 판정과 그로부터 만든 수집 실행."""

    decisions: tuple[ResearchDecision, ...]
    runs: tuple[CollectionRun, ...]

    @property
    def rejected(self) -> tuple[ResearchDecision, ...]:
        return tuple(d for d in self.decisions if d.rejected)

    @property
    def scheduled(self) -> tuple[ResearchDecision, ...]:
        return tuple(
            d for d in self.decisions if d.status is ResearchStatus.SCHEDULED
        )


def needed_use(request: ResearchRequest) -> AllowedUse | None:
    """요청이 채우려는 용도. 허용 용도 목록에 없는 값이면 비운다.

    `needed_evidence_type` 은 자유 문자열 컬럼이지만 값의 뜻은
    `source_assessments.allowed_uses` 의 토큰과 같아야 한다. 같지 않으면 정책을
    검사할 기준이 없다.
    """
    try:
        return AllowedUse(request.needed_evidence_type)
    except ValueError:
        return None


def tiers_allowing(use: AllowedUse) -> tuple[SourceTier, ...]:
    """이 용도를 허용하는 계층. 계층 차례를 지킨다."""
    return tuple(t for t in SourceTier if use in TIER_ALLOWED_USES[t])


def usable_tiers(request: ResearchRequest) -> tuple[SourceTier, ...]:
    """요청이 실제로 쓸 수 있는 계층.

    계층을 지정하지 않은 요청은 그 용도를 허용하는 계층 전부를 쓴다. 지정한 요청은
    지정한 것 가운데 허용되는 것만 남긴다. 지정한 계층을 넘어서 넓히지 않는다.
    """
    use = needed_use(request)
    if use is None:
        return ()
    if not request.needed_tiers:
        return tiers_allowing(use)
    return tuple(t for t in SourceTier if t in request.needed_tiers and is_allowed(t, use))


def policy_violation(request: ResearchRequest) -> str | None:
    """정책 위반 사유. 지킬 수 있는 요청이면 비운다."""
    use = needed_use(request)
    if use is None:
        return f"{UNKNOWN_EVIDENCE_TYPE}: {request.needed_evidence_type!r}"
    if not usable_tiers(request):
        asked = ", ".join(str(t) for t in request.needed_tiers) or "지정 없음"
        return f"{NO_TIER_ALLOWS}. 용도 {use}, 요청 계층 {asked}"
    return None


def decide(request: ResearchRequest) -> ResearchDecision:
    """요청 하나를 검사해 `scheduled` 또는 `rejected` 로 판정한다."""
    reason = policy_violation(request)
    if reason is not None:
        return ResearchDecision(
            request_id=request.request_id,
            status=ResearchStatus.REJECTED,
            reason=reason,
        )
    return ResearchDecision(
        request_id=request.request_id,
        status=ResearchStatus.SCHEDULED,
        allowed_tiers=usable_tiers(request),
    )


def queue_order(
    requests: Iterable[ResearchRequest],
) -> tuple[ResearchRequest, ...]:
    """`status`·`priority` 차례로 읽는다. 결말이 난 요청은 뺀다.

    우선순위는 큰 값이 앞이다(`idx_research_requests_queue` 의 `priority DESC`).
    같은 우선순위는 `request_id` 로 갈라 실행마다 차례가 흔들리지 않게 한다.
    """
    queued = [r for r in requests if r.status in QUEUE_STATUSES]
    return tuple(
        sorted(
            queued,
            key=lambda r: (STATUS_RANK[r.status], -r.priority, r.request_id),
        )
    )


def plan_research(
    requests: Iterable[ResearchRequest], limit: int | None = None
) -> ResearchPlan:
    """조사 요청을 읽어 정책을 검사하고 수집 실행을 만든다.

    `limit` 은 한 번에 검사할 요청 수다. 넘어간 요청은 판정하지 않고 상태를 그대로
    둔다. 한 실행이 큐 전체를 소화하려 들면 예산이 앞의 몇 건에서 끝난다.

    판정은 검사한 요청 전부에 대해 돌려준다. 수집 실행은 통과한 요청으로만 만든다.
    """
    ordered = queue_order(requests)
    if limit is not None:
        if limit < 0:
            raise ValueError("limit 은 0 이상이어야 한다")
        ordered = ordered[:limit]

    decisions = tuple(decide(r) for r in ordered)
    passed = {d.request_id: d for d in decisions if not d.rejected}
    return ResearchPlan(
        decisions=decisions,
        runs=_group_runs(tuple(r for r in ordered if r.request_id in passed), passed),
    )


def _group_runs(
    requests: tuple[ResearchRequest, ...],
    decisions: dict[str, ResearchDecision],
) -> tuple[CollectionRun, ...]:
    """분석 버전·범위·회사가 같은 요청을 실행 하나로 묶는다.

    묶음의 우선순위는 가장 급한 요청의 우선순위이고 실행의 차례도 그 값으로 정한다.
    """
    grouped: dict[tuple[str, str, str], list[ResearchRequest]] = {}
    for request in requests:
        scope = Scope(request.job_role_id, request.scope_level, request.scope_id)
        key = (request.analysis_version, scope.key, request.company_id or "")
        grouped.setdefault(key, []).append(request)

    runs: list[CollectionRun] = []
    for members in grouped.values():
        head = members[0]
        tiers: list[SourceTier] = []
        for member in members:
            for tier in decisions[member.request_id].allowed_tiers:
                if tier not in tiers:
                    tiers.append(tier)
        runs.append(
            CollectionRun(
                analysis_version=head.analysis_version,
                scope=Scope(head.job_role_id, head.scope_level, head.scope_id),
                company_id=head.company_id,
                request_ids=tuple(m.request_id for m in members),
                allowed_tiers=tuple(sorted(tiers)),
                priority=max(m.priority for m in members),
            )
        )
    runs.sort(key=lambda r: (-r.priority, r.request_ids[0]))
    return tuple(runs)
