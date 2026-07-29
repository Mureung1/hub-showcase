"""지식 구축 Wiki 에이전트의 실행 골격.

정의는 docs/agent-design.md 6장·7.2·11장과 docs/knowledge-schema.md 8장을 따른다.

세 단위를 한 실행에 담는다.

1. 통계 우선순위 기반 생성 대상 판정. 모든 역량에 Wiki 를 만들지 않는다.
   `select_targets` 가 순수 함수로 그 판정을 갖는다.
2. 깊이 등급 기준. `capability_depth_profiles.depth_distribution` 에서 등급별 판정
   문장을 만드는 규칙은 `careersignal.wiki.depth` 에 있다.
3. 필드별 허용 근거를 적용한 생성. 필드마다 쓸 수 있는 자료 계층이 다르며 미검증
   자료(E)는 어느 필드의 근거도 되지 못한다.

저장소를 `Protocol` 로 받는다. 이 모듈은 psycopg 를 import 하지 않는다. 되돌림 지점과
거래 사망 판정도 마찬가지다. 둘 다 `repositories/base.py` 에 있고 그 모듈이 psycopg 를
끌어오므로, 판정을 실행 스크립트가 `store_is_fatal` 로 넣어 준다. `stop_when` 이
`agents/statistics/agent.py` 에서 같은 이유로 주입되는 것과 같다.

모델 호출은 `providers/concurrency.map_ordered` 로 묶는다. 호출의 단위는 역량이 아니라
필드 하나이며, 필드는 서로 다른 자료 계층을 근거로 삼으므로 한 요청에 묶지 않는다.
저장은 돌아온 결과를 주 갈래에서 입력 순서대로 수행한다. 저장소는 psycopg 연결 하나를
감싸며 스레드 안전하지 않다.
"""

from __future__ import annotations

import hashlib
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from careersignal.agents.knowledge.contract import (
    EVIDENCE_NOT_CITED,
    MISSING_REQUIRED_FIELD,
    NO_ALLOWED_EVIDENCE,
    NO_CONTENT,
    NO_KNOWLEDGE_VERSION,
    NO_TAXONOMY_VERSION,
    PAGE_EXISTS,
    REQUIRED_FIELDS,
    TEXT_FIELDS,
    TRANSACTION_LOST,
    WIKI_FIELDS,
    EvidenceChunk,
    PageOutcome,
    TargetReason,
    WikiFieldDraft,
    WikiFieldRequest,
    WikiOutcome,
    WikiRepository,
    WikiTarget,
    WikiWriter,
    allowed_evidence,
)
from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.domain.depth import DepthLevel
from careersignal.domain.sampling import SampleStatus
from careersignal.metrics.expansion import MetricFamily
from careersignal.providers.concurrency import DEFAULT_WORKERS, map_ordered
from careersignal.wiki.depth import DepthCriterion, depth_criteria

PREVALENCE_FAMILY = str(MetricFamily.POSTING_PREVALENCE)
"""생성 대상의 우선순위를 정하는 지표(docs/metric-spec.md 3.1).

무엇을 얼마나 자주 요구하는지는 통계가 갖는다. Wiki 는 그 순위를 읽어 위에서부터
만들 뿐이고 순위를 스스로 계산하지 않는다.
"""

DRAFT_STATUS = "draft"
"""새로 만든 페이지의 상태. 발행은 검증을 거친 뒤 오케스트레이터가 정한다."""


# ================================================================ 식별자
def page_identifier(capability_id: str, knowledge_version: str) -> str:
    """같은 지식 버전의 같은 역량은 같은 페이지다.

    재료가 `wiki_pages` 의 유일 조건 `(capability_id, knowledge_version)` 과 같으므로
    다시 돌려도 같은 행을 가리키고, 지식 버전이 다르면 다른 페이지가 된다.
    """
    material = f"{capability_id}:{knowledge_version}".encode()
    return f"wp_{hashlib.sha256(material).hexdigest()[:24]}"


def revision_identifier(page_id: str, agent_run_id: str) -> str:
    """한 실행이 한 페이지에 남기는 개정은 하나다.

    개정은 페이지와 달리 쌓인다. 실행 식별자를 재료에 넣어 같은 실행의 재시도가 행을
    늘리지 않게 하고, 다음 실행은 새 개정을 만든다.
    """
    material = f"{page_id}:{agent_run_id}".encode()
    return f"wr_{hashlib.sha256(material).hexdigest()[:24]}"


# ================================================================ 14-1 대상 판정
def select_targets(
    capabilities: Sequence[Mapping[str, Any]],
    links: Sequence[Mapping[str, Any]] = (),
    prevalence: Sequence[Mapping[str, Any]] = (),
    profiles: Sequence[Mapping[str, Any]] = (),
    requested: Sequence[Mapping[str, Any]] = (),
    limit: int | None = None,
    minimum_prevalence: float = 0.0,
) -> tuple[WikiTarget, ...]:
    """Wiki 를 만들 역량을 통계 우선순위로 고른다. 순수 함수다.

    판정은 docs/knowledge-schema.md 8.4 다.

    ```text
    활성 capability AND (통계적 우선순위 상위 OR research_request 존재)
    ```

    필수 필드의 근거 충족은 여기서 보지 않는다. 근거는 역량마다 조회해야 알 수 있고,
    그 조회는 대상이 정해진 뒤에 한다. 근거가 모자란 역량은 개정을 만들지 않고 그
    사유를 결과에 남긴다.

    역량의 노출도는 그 역량에 걸린 차원 가운데 가장 높은 `posting_prevalence` 다. 합이
    아니다. 한 역량에 차원이 여럿 붙으면(docs/erd.md 7.11) 합은 같은 공고를 여러 번
    세고, 최댓값은 "이 역량을 가장 널리 요구한 차원" 이라는 뜻을 유지한다.

    `not_computable` 인 행은 값을 쓰지 않는다. 표본이 없어 계산하지 못한 것을 0 으로
    읽으면 순위가 아래로 밀리는 것이 아니라 없는 근거로 밀린다.

    조사 요청이 있는 역량은 노출도와 무관하게 대상이 된다. 다만 통계 우선순위로 들어온
    역량 뒤에 둔다. 예산이 잘릴 때 무엇을 먼저 만드는지가 뒤집히지 않게 한다.

    정렬은 노출도 내림차순, 표본 수 내림차순, 역량 식별자 사전순이다. 같은 입력이 같은
    순서를 준다.
    """
    active = [row for row in capabilities if row.get("is_active", True)]
    if not active:
        return ()

    labels = {
        str(row["capability_id"]): str(row.get("canonical_label") or row["capability_id"])
        for row in active
    }

    dimensions = _linked_dimensions(links, set(labels))
    scores = _dimension_prevalence(prevalence)
    depth = _depth_by_capability(profiles)
    requests = _requests_by_capability(requested)

    targets: list[WikiTarget] = []
    for capability_id, label in labels.items():
        linked = dimensions.get(capability_id, ())
        best = _best_score(linked, scores)
        request_id = requests.get(capability_id)

        if best is not None and best[0] >= minimum_prevalence:
            reason = TargetReason.STATISTICS_PRIORITY
        elif request_id is not None:
            reason = TargetReason.RESEARCH_REQUEST
        else:
            continue

        distribution, expected = depth.get(capability_id, (None, None))
        targets.append(
            WikiTarget(
                capability_id=capability_id,
                canonical_label=label,
                reason=reason,
                prevalence=best[0] if best is not None else None,
                sample_size=best[1] if best is not None else 0,
                dimension_ids=linked,
                research_request_id=request_id,
                depth_distribution=distribution,
                expected_depth=expected,
            )
        )

    targets.sort(key=_priority)
    return tuple(targets[:limit] if limit is not None else targets)


def _priority(target: WikiTarget) -> tuple[int, float, int, str]:
    """정렬 키. 통계 우선순위가 앞이고 그 안에서 노출도가 높은 것이 앞이다."""
    statistics_first = 0 if target.reason is TargetReason.STATISTICS_PRIORITY else 1
    return (
        statistics_first,
        -(target.prevalence or 0.0),
        -target.sample_size,
        target.capability_id,
    )


def _linked_dimensions(
    links: Sequence[Mapping[str, Any]], known: set[str]
) -> dict[str, tuple[str, ...]]:
    """역량마다 붙은 차원. 모르는 역량의 연결은 버린다."""
    found: dict[str, list[str]] = {}
    for row in links:
        capability_id = str(row.get("capability_id") or "")
        dimension_id = str(row.get("dimension_id") or "")
        if capability_id not in known or not dimension_id:
            continue
        found.setdefault(capability_id, []).append(dimension_id)
    return {key: tuple(sorted(set(value))) for key, value in found.items()}


def _dimension_prevalence(
    rows: Sequence[Mapping[str, Any]],
) -> dict[str, tuple[float, int]]:
    """차원마다 `(노출도, 표본 수)`. 계산되지 않은 행은 담지 않는다."""
    scores: dict[str, tuple[float, int]] = {}
    for row in rows:
        family = row.get("metric_family")
        if family is not None and str(family) != PREVALENCE_FAMILY:
            continue
        if str(row.get("sample_status") or "") == str(SampleStatus.NOT_COMPUTABLE):
            continue
        dimension_id = row.get("dimension_id")
        value = row.get("value")
        if not dimension_id or value is None:
            continue
        sample_size = int(row.get("sample_size") or 0)
        current = scores.get(str(dimension_id))
        candidate = (float(value), sample_size)
        if current is None or candidate > current:
            scores[str(dimension_id)] = candidate
    return scores


def _best_score(
    dimension_ids: Sequence[str], scores: Mapping[str, tuple[float, int]]
) -> tuple[float, int] | None:
    """이 역량을 가장 널리 요구한 차원의 값."""
    found = [scores[dimension_id] for dimension_id in dimension_ids if dimension_id in scores]
    return max(found) if found else None


def _depth_by_capability(
    profiles: Sequence[Mapping[str, Any]],
) -> dict[str, tuple[dict[str, float] | None, DepthLevel | None]]:
    """역량마다 `(깊이 분포, 기대 깊이)`. 표본이 큰 프로파일을 남긴다.

    한 역량에 봉투가 여럿이면 프로파일도 여럿이다(docs/erd.md 10.6). Wiki 페이지는
    역량마다 하나이므로 표본이 가장 큰 봉투의 분포를 쓴다. 표본이 같으면 프로파일
    식별자의 사전 순이 가른다.
    """
    best: dict[str, tuple[int, str]] = {}
    found: dict[str, tuple[dict[str, float] | None, DepthLevel | None]] = {}
    for row in profiles:
        capability_id = str(row.get("capability_id") or "")
        if not capability_id:
            continue
        key = (-int(row.get("sample_size") or 0), str(row.get("profile_id") or ""))
        current = best.get(capability_id)
        if current is not None and key >= current:
            continue
        distribution = row.get("depth_distribution")
        expected = row.get("expected_depth")
        best[capability_id] = key
        found[capability_id] = (
            {str(k): float(v) for k, v in distribution.items()} if distribution else None,
            DepthLevel(expected) if expected else None,
        )
    return found


def _requests_by_capability(rows: Sequence[Mapping[str, Any]]) -> dict[str, str]:
    """역량마다 조사 요청 하나. 같은 역량에 요청이 여럿이면 식별자가 앞선 것을 쓴다."""
    found: dict[str, str] = {}
    for row in rows:
        capability_id = str(row.get("capability_id") or "")
        request_id = str(row.get("request_id") or "")
        if not capability_id or not request_id:
            continue
        current = found.get(capability_id)
        if current is None or request_id < current:
            found[capability_id] = request_id
    return found


# ================================================================ 14-2 깊이 틀
def depth_guidance(criteria: Sequence[DepthCriterion]) -> str:
    """등급별 판정 문장을 모델에 줄 틀로 옮긴다.

    어느 등급이 기대되는지는 규칙이 이미 정했다. 모델은 그 판정을 다시 하지 않고 각
    등급에서 요구되는 행동을 이 역량의 말로 옮긴다. 판정을 모델에 맡기면 같은 분포에서
    실행마다 다른 기대 깊이가 나온다.
    """
    return "\n".join(
        f"{index}. {criterion.statement}"
        for index, criterion in enumerate(criteria, start=1)
    )


def depth_criteria_value(
    criteria: Sequence[DepthCriterion], lines: Sequence[str]
) -> list[dict[str, Any]]:
    """`wiki_revisions.depth_criteria` jsonb 에 담을 값.

    규칙이 만든 판정과 모델이 쓴 설명을 한 자리에 담는다. 규칙만 담으면 등급이 이
    역량에서 무엇을 뜻하는지가 빠지고, 모델의 문장만 담으면 그 판정이 어느 분포에서
    나왔는지를 되짚을 수 없다.

    문장이 등급 수보다 적으면 남은 등급의 설명은 비운다. 등급을 지우지 않는다. 세 등급의
    구조는 직무와 무관하게 고정한다(docs/knowledge-schema.md 8.2).
    """
    return [
        {
            "level": str(criterion.level),
            "standing": str(criterion.standing),
            "share": criterion.share,
            "tail_share": criterion.tail_share,
            "statement": criterion.statement,
            "criterion": lines[index] if index < len(lines) else "",
        }
        for index, criterion in enumerate(criteria)
    ]


# ================================================================ 실행
class WikiBuilder:
    """생성 대상을 고르고 필드를 써서 Wiki 개정을 남긴다."""

    def __init__(
        self,
        writer: WikiWriter,
        repository: WikiRepository,
        workers: int = DEFAULT_WORKERS,
        stop_when: Callable[[BaseException], bool] | None = None,
        store_is_fatal: Callable[[BaseException], bool] | None = None,
    ) -> None:
        """`workers` 는 동시에 보낼 모델 요청 수다. 1 이면 하나씩 부른다.

        `stop_when` 은 되살릴 수 없는 생성 실패를 가르는 판정이다. 참이면 아직 보내지
        않은 필드를 더 보내지 않는다. `store_is_fatal` 은 저장 실패가 거래를 죽였는지를
        가른다. 참이면 남은 페이지를 시도하지 않는다. 두 판정 모두 psycopg 를 아는
        모듈에 있으므로 실행 스크립트가 넣어 준다.
        """
        self._writer = writer
        self._repository = repository
        self._workers = workers
        self._stop_when = stop_when
        self._store_is_fatal = store_is_fatal

    def run(self, context: RunContext, limit: int | None = None) -> WikiOutcome:
        """대상을 고르고 예산이 허락하는 만큼 개정을 만든다.

        한 역량의 실패가 나머지를 막지 않는다. 이미 이 지식 버전에 페이지가 있는 역량은
        건너뛴다. 페이지는 `(capability_id, knowledge_version)` 로 유일하므로 다시
        만들면 저장이 거절된다.
        """
        if not context.knowledge_version:
            return self._halt(context, NO_KNOWLEDGE_VERSION)
        if not context.taxonomy_version_id:
            return self._halt(context, NO_TAXONOMY_VERSION)

        targets = select_targets(
            capabilities=self._repository.capabilities(context.job_role_id),
            links=self._repository.capability_dimension_links(
                context.taxonomy_version_id
            ),
            prevalence=self._repository.prevalence_facts(context.analysis_version),
            profiles=self._repository.depth_profiles(context.analysis_version),
            requested=self._repository.requested_capabilities(context.analysis_version),
            limit=limit,
        )
        selected = len(targets)

        existing = self._repository.existing_pages(context.knowledge_version)
        pages: list[PageOutcome] = []
        pending: list[WikiTarget] = []
        for target in targets:
            if target.capability_id in existing:
                pages.append(
                    PageOutcome(
                        capability_id=target.capability_id,
                        page_id=existing[target.capability_id],
                        skipped_reason=PAGE_EXISTS,
                    )
                )
                continue
            pending.append(target)

        plans, budget_exhausted = self._plan(pending, context)

        requests = [request for plan in plans for request in plan.requests]
        results = map_ordered(
            self._writer.write, requests, self._workers, self._stop_when
        )

        drafts: dict[tuple[str, str], WikiFieldDraft] = {}
        errors: list[tuple[str, str]] = []
        for record in results:
            request = record.item
            if record.error is not None:
                error = record.error
                errors.append(
                    (
                        f"{request.capability_id}:{request.field_name}",
                        f"{type(error).__name__}: {error}",
                    )
                )
                continue
            if record.value is not None:
                drafts[(request.capability_id, request.field_name)] = record.value

        # 시도한 역량만 센다. 요청을 하나도 보내지 못한 역량은 자국이 없으므로 다음
        # 실행이 같은 자리에서 다시 집는다.
        attempted = {request.capability_id for request in requests[: len(results)]}

        created_pages = 0
        created_revisions = 0
        stored_evidence = 0
        for plan in plans:
            # 요청이 하나도 없던 역량도 결과를 남긴다. 허용 근거가 없어 필드를 모두
            # 버린 것과 예산에 잘려 시도하지 못한 것은 다른 상태다.
            if plan.requests and plan.target.capability_id not in attempted:
                continue
            outcome, failure = self._store(context, plan, drafts)
            pages.append(outcome)
            if failure is not None:
                errors.append(
                    (
                        plan.target.capability_id,
                        f"{type(failure).__name__}: {failure}",
                    )
                )
                if self._store_is_fatal is not None and self._store_is_fatal(failure):
                    errors.append((plan.target.capability_id, TRANSACTION_LOST))
                    break
                continue
            created_pages += int(outcome.created_page)
            created_revisions += int(outcome.revision_id is not None)
            stored_evidence += outcome.evidence_rows

        return WikiOutcome(
            agent_run_id=context.agent_run_id,
            stop_reason=_stop_reason(
                selected=selected,
                created=created_revisions,
                errors=bool(errors),
                budget_exhausted=budget_exhausted,
            ),
            selected_targets=selected,
            visited_targets=len(attempted),
            created_pages=created_pages,
            created_revisions=created_revisions,
            stored_evidence=stored_evidence,
            pages=tuple(pages),
            errors=tuple(errors),
        )

    # ------------------------------------------------------------ 계획
    def _plan(
        self, targets: Sequence[WikiTarget], context: RunContext
    ) -> tuple[list[_Plan], bool]:
        """역량마다 보낼 요청을 만들고 예산 안에서 자른다.

        예산은 보내기 전에 자른다. 보낸 뒤에 세면 동시 실행이 한도를 넘는다. 자르는
        단위는 필드가 아니라 역량이다. 한 역량의 필드 일부만 보내면 필수 필드가 비어
        개정이 만들어지지 않고, 그만큼의 호출이 결과 없이 나간다.
        """
        plans: list[_Plan] = []
        spent = 0
        budget_exhausted = False
        for target in targets:
            plan = self._plan_one(target, context)
            if not plan.requests:
                plans.append(plan)
                continue
            if spent + len(plan.requests) > context.budget.max_tool_calls:
                budget_exhausted = True
                break
            spent += len(plan.requests)
            plans.append(plan)
        return plans, budget_exhausted

    def _plan_one(self, target: WikiTarget, context: RunContext) -> _Plan:
        """역량 하나의 필드별 요청. 허용 근거가 없는 필드는 요청을 만들지 않는다."""
        pool = self._repository.field_evidence(
            target.capability_id, context.as_of_date
        )
        criteria = (
            depth_criteria(
                target.depth_distribution,
                target.canonical_label,
                target.expected_depth,
            )
            if target.depth_distribution
            else ()
        )

        requests: list[WikiFieldRequest] = []
        dropped: list[tuple[str, str]] = []
        evidence: dict[str, tuple[EvidenceChunk, ...]] = {}
        for field_name in WIKI_FIELDS:
            usable = allowed_evidence(field_name, pool)
            if not usable:
                dropped.append((field_name, NO_ALLOWED_EVIDENCE))
                continue
            evidence[field_name] = usable
            requests.append(
                WikiFieldRequest(
                    capability_id=target.capability_id,
                    canonical_label=target.canonical_label,
                    field_name=field_name,
                    evidence=usable,
                    guidance=(
                        depth_guidance(criteria)
                        if field_name == "depth_criteria"
                        else ""
                    ),
                )
            )
        return _Plan(
            target=target,
            criteria=criteria,
            evidence=evidence,
            requests=tuple(requests),
            dropped=tuple(dropped),
        )

    # ------------------------------------------------------------ 저장
    def _store(
        self,
        context: RunContext,
        plan: _Plan,
        drafts: Mapping[tuple[str, str], WikiFieldDraft],
    ) -> tuple[PageOutcome, BaseException | None]:
        """역량 하나의 페이지·개정·근거를 남긴다.

        근거가 없는 필드는 저장하지 않는다(docs/knowledge-schema.md 8.3). 필수 필드가
        하나라도 비면 개정 자체를 만들지 않는다. 반쯤 채운 개정을 남기면 다음 실행이
        그것을 완성된 문서로 읽는다.

        저장 실패는 예외 객체째로 함께 돌려준다. 거래가 죽었는지의 판정은 예외의 클래스
        이름과 메시지를 함께 보므로(`repositories/base.is_transaction_fatal`) 문자열로
        옮긴 뒤에는 같은 판정을 할 수 없다.
        """
        target = plan.target
        values: dict[str, Any] = {}
        evidence_rows: list[tuple[str, str, str]] = []
        stored: list[str] = []
        dropped = list(plan.dropped)

        for field_name in WIKI_FIELDS:
            if field_name not in plan.evidence:
                continue
            draft = drafts.get((target.capability_id, field_name))
            if draft is None or draft.empty:
                dropped.append((field_name, NO_CONTENT))
                continue
            if not draft.chunk_ids:
                dropped.append((field_name, EVIDENCE_NOT_CITED))
                continue

            values[field_name] = _field_value(field_name, draft, plan.criteria)
            stored.append(field_name)
            tiers = {chunk.chunk_id: chunk.source_tier for chunk in plan.evidence[field_name]}
            evidence_rows.extend(
                (field_name, chunk_id, str(tiers[chunk_id]))
                for chunk_id in draft.chunk_ids
                if chunk_id in tiers
            )

        missing = [field for field in REQUIRED_FIELDS if field not in values]
        if missing:
            return (
                PageOutcome(
                    capability_id=target.capability_id,
                    stored_fields=tuple(stored),
                    dropped_fields=tuple(dropped),
                    skipped_reason=f"{MISSING_REQUIRED_FIELD}: {', '.join(missing)}",
                ),
                None,
            )

        page_id = page_identifier(target.capability_id, context.knowledge_version or "")
        revision_id = revision_identifier(page_id, context.agent_run_id)
        try:
            self._repository.add_page(
                {
                    "page_id": page_id,
                    "capability_id": target.capability_id,
                    "knowledge_version": context.knowledge_version,
                    "status": DRAFT_STATUS,
                }
            )
            self._repository.add_revision(
                {
                    "revision_id": revision_id,
                    "page_id": page_id,
                    "produced_by_run_id": context.agent_run_id,
                }
                | {field: values.get(field) for field in WIKI_FIELDS}
            )
            for field_name, chunk_id, tier in evidence_rows:
                self._repository.add_evidence(
                    {
                        "revision_id": revision_id,
                        "field_name": field_name,
                        "chunk_id": chunk_id,
                        "source_tier": tier,
                    }
                )
        except Exception as exc:  # noqa: BLE001 - 예외를 결과로 옮긴다
            return (
                PageOutcome(
                    capability_id=target.capability_id,
                    stored_fields=tuple(stored),
                    dropped_fields=tuple(dropped),
                    error=f"{type(exc).__name__}: {exc}",
                ),
                exc,
            )

        return (
            PageOutcome(
                capability_id=target.capability_id,
                page_id=page_id,
                revision_id=revision_id,
                created_page=True,
                stored_fields=tuple(stored),
                dropped_fields=tuple(dropped),
                evidence_rows=len(evidence_rows),
            ),
            None,
        )

    # ------------------------------------------------------------ 보조
    def _halt(self, context: RunContext, reason: str) -> WikiOutcome:
        """봉투가 모자라 아무것도 시도하지 못한 실행."""
        return WikiOutcome(
            agent_run_id=context.agent_run_id,
            stop_reason=StopReason.EXPLICIT_FAILURE,
            errors=((context.job_role_id, reason),),
        )


@dataclass(frozen=True, slots=True)
class _Plan:
    """역량 하나의 실행 계획.

    요청과 그 요청이 쓴 근거를 함께 나른다. 저장할 때 다시 조회하지 않으므로 보낸
    근거와 저장하는 근거가 갈리지 않는다.
    """

    target: WikiTarget
    criteria: tuple[DepthCriterion, ...]
    evidence: dict[str, tuple[EvidenceChunk, ...]]
    requests: tuple[WikiFieldRequest, ...]
    dropped: tuple[tuple[str, str], ...]


def _field_value(
    field_name: str, draft: WikiFieldDraft, criteria: Sequence[DepthCriterion]
) -> Any:
    """필드 하나가 컬럼에 들어갈 모양으로 바꾼다.

    `definition` 과 `why_required` 는 text 컬럼이라 문장을 이어 붙이고, 나머지 다섯은
    jsonb 라 목록으로 담는다. `depth_criteria` 만 규칙의 판정을 함께 담는다.
    """
    if field_name in TEXT_FIELDS:
        return "\n".join(draft.lines)
    if field_name == "depth_criteria":
        return depth_criteria_value(criteria, draft.lines)
    return list(draft.lines)


def _stop_reason(
    selected: int, created: int, errors: bool, budget_exhausted: bool
) -> StopReason:
    """docs/agent-design.md 11.3 의 종료 조건을 판정한다.

    순서가 의미를 갖는다. 예산이 끝나 역량을 남긴 실행을 전수 조사로 볼 수 없고, 생성이
    깨진 실행을 근거 없음으로 볼 수 없다.
    """
    if budget_exhausted:
        return StopReason.BUDGET_EXHAUSTED
    if errors:
        return StopReason.EXPLICIT_FAILURE
    if not selected:
        return StopReason.FRONTIER_EXHAUSTED
    if created:
        return StopReason.SLOTS_FILLED
    return StopReason.NO_NEW_EVIDENCE


__all__ = [
    "DRAFT_STATUS",
    "PREVALENCE_FAMILY",
    "WikiBuilder",
    "depth_criteria_value",
    "depth_guidance",
    "page_identifier",
    "revision_identifier",
    "select_targets",
]
