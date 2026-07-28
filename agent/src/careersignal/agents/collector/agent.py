"""데이터 수집 에이전트의 실행 골격.

정의는 docs/agent-design.md 6장·7.1·11.1을 따른다.

이 모듈은 대상 목록을 받아 순서대로 가져오고 적재하며 종료 사유를 판정한다.
출처 발견은 하지 않는다. 발견까지 수행하는 A3 실구현은 Phase 26이며, 그때도
이 골격의 `SourceFetcher` 자리에 들어와 같은 적재 경로를 쓴다.

원문과 출처 평가를 분리해 저장한다. 스냅샷의 내용은 변경하지 않고 접근 결과와
출처 평가는 별도로 기록한다.
"""

from __future__ import annotations

from datetime import datetime

from careersignal.agents.collector.contract import (
    CollectionOutcome,
    CollectionTarget,
    SourceFetcher,
    TargetOutcome,
)
from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.pipelines.ingest import SourceIngestPipeline
from careersignal.repositories.sources import SourceRepository


class SourceCollector:
    """대상을 순서대로 수집해 적재한다."""

    def __init__(
        self,
        fetcher: SourceFetcher,
        ingest: SourceIngestPipeline,
        repository: SourceRepository,
    ) -> None:
        self._fetcher = fetcher
        self._ingest = ingest
        self._repository = repository

    def collect(
        self, context: RunContext, targets: tuple[CollectionTarget, ...]
    ) -> CollectionOutcome:
        """대상을 소진하거나 예산이 끝날 때까지 수집한다.

        가져오기가 실패해도 다음 대상으로 넘어간다. 한 출처의 실패가 나머지
        수집을 막지 않는다. 실패는 관찰로 기록되고 종료 사유에 반영된다.
        """
        results: list[TargetOutcome] = []
        attempted = 0
        budget_exhausted = False

        for target in targets:
            if attempted >= context.budget.max_tool_calls:
                budget_exhausted = True
                break
            attempted += 1
            results.append(self._collect_one(target, context.dataset_version))

        outcome_targets = tuple(results)
        return CollectionOutcome(
            agent_run_id=context.agent_run_id,
            stop_reason=_stop_reason(
                targets=targets,
                results=outcome_targets,
                budget_exhausted=budget_exhausted,
            ),
            attempted=attempted,
            targets=outcome_targets,
        )

    def _collect_one(
        self, target: CollectionTarget, dataset_version: str
    ) -> TargetOutcome:
        self._register(target)
        try:
            result = self._fetcher.fetch(target)
        except Exception as exc:
            # 가져오기 구현의 결함은 수집 실패와 다르다. 구분해서 남긴다.
            return TargetOutcome(
                source_id=target.source_id,
                research_request_id=target.research_request_id,
                error=f"{type(exc).__name__}: {exc}",
            )

        ingested = self._ingest.record(result, dataset_version)
        return TargetOutcome(
            source_id=target.source_id,
            research_request_id=target.research_request_id,
            snapshot_id=ingested.snapshot_id,
            created_snapshot=ingested.created_snapshot,
            reused_snapshot=ingested.reused_snapshot,
            recorded_observation=ingested.recorded,
            skipped_reason=ingested.skipped_reason,
        )

    def _register(self, target: CollectionTarget) -> None:
        """출처는 내용을 얻기 전에 등록한다.

        URL 은 알지만 내용을 한 번도 얻지 못한 상태를 스냅샷 없는 `sources` 행이
        표현한다. 근거는 docs/knowledge-schema.md 3.3이다.
        """
        if self._repository.find_source(target.source_id) is not None:
            return
        self._repository.register_source(
            {
                "source_id": target.source_id,
                "source_type": str(target.source_type),
                "url": target.url,
                "publisher": target.publisher,
                "author": target.author,
                "company_id": target.company_id,
                "job_role_ids": list(target.job_role_ids),
                "robots_policy": target.robots_policy,
                "license_note": target.license_note,
                "first_seen_at": datetime.now(),
            }
        )


def _stop_reason(
    targets: tuple[CollectionTarget, ...],
    results: tuple[TargetOutcome, ...],
    budget_exhausted: bool,
) -> StopReason:
    """docs/agent-design.md 11.1의 수집 종료 조건을 판정한다.

    순서가 의미를 갖는다. 예산이 끝나 대상을 남긴 실행을 전수 조사로 볼 수 없고,
    가져오기 구현이 깨진 실행을 근거 없음으로 볼 수 없다.
    """
    if budget_exhausted:
        return StopReason.BUDGET_EXHAUSTED
    if any(r.error for r in results):
        return StopReason.EXPLICIT_FAILURE
    if not targets:
        return StopReason.FRONTIER_EXHAUSTED
    if any(r.created_snapshot for r in results):
        return StopReason.SLOTS_FILLED
    return StopReason.NO_NEW_EVIDENCE
