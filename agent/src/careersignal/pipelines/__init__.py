"""결정적 helper 파이프라인.

정의는 docs/architecture.md 2.2를 따른다.
같은 입력에 같은 출력을 내며 에이전트를 시작하지 않는다.
"""

from careersignal.pipelines.ingest import (
    NO_PRIOR_SNAPSHOT,
    FetchResult,
    IngestOutcome,
    SourceIngestPipeline,
    snapshot_identifier,
)

__all__ = [
    "NO_PRIOR_SNAPSHOT",
    "FetchResult",
    "IngestOutcome",
    "SourceIngestPipeline",
    "snapshot_identifier",
]
