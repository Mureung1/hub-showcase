"""여러 source를 순차 수집하는 일괄 실행. docs/plan/engineering/content-pipeline.md 16장.

단일 source 수집 로직(service.run)은 그대로 두고, 대상 source를 순회하며 결과를 모으기만 한다.
"""

from __future__ import annotations

from app.content import repository, service
from app.content.models import BatchCollectionResult, PipelineError, SourceCollectionFailure


def run_collectable_sources(mode: str) -> BatchCollectionResult:
    """수집 대상 source를 순서대로 실행하고 결과를 모은다.

    한 source가 PipelineError로 실패해도 다음 source를 계속 실행한다.
    PipelineError가 아닌 예외는 잡지 않고 그대로 전파한다.
    """
    source_ids = repository.fetch_collectable_source_ids()

    plans = []
    failures = []
    for source_id in source_ids:
        try:
            plans.append(service.run(source_id, mode))
        except PipelineError as exc:
            failures.append(SourceCollectionFailure(source_id=source_id, error_code=exc.code))

    return BatchCollectionResult(mode=mode, plans=plans, failures=failures)
