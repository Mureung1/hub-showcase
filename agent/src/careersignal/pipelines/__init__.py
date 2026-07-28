"""결정적 helper 파이프라인.

정의는 docs/architecture.md 2.2를 따른다.
같은 입력에 같은 출력을 내며 에이전트를 시작하지 않는다.
"""

from careersignal.pipelines.chunking import (
    ChunkIndexer,
    ChunkOutcome,
    Section,
    chunk_identifier,
    split_sections,
    token_estimate,
)
from careersignal.pipelines.embedding import (
    COUNT_MISMATCH,
    DIMENSION_MISMATCH,
    EMPTY_TEXT,
    EmbeddingIndexer,
    EmbeddingOutcome,
)
from careersignal.pipelines.ingest import (
    NO_PRIOR_SNAPSHOT,
    FetchResult,
    IngestOutcome,
    SourceIngestPipeline,
    snapshot_identifier,
)
from careersignal.pipelines.postings import (
    NO_SNAPSHOT,
    PostingDraft,
    PostingRegistrar,
    RegisterOutcome,
    posting_identifier,
    posting_version_identifier,
)

__all__ = [
    "ChunkIndexer",
    "ChunkOutcome",
    "Section",
    "chunk_identifier",
    "split_sections",
    "token_estimate",
    "NO_PRIOR_SNAPSHOT",
    "NO_SNAPSHOT",
    "PostingDraft",
    "PostingRegistrar",
    "RegisterOutcome",
    "FetchResult",
    "IngestOutcome",
    "SourceIngestPipeline",
    "posting_identifier",
    "posting_version_identifier",
    "snapshot_identifier",
    "COUNT_MISMATCH",
    "DIMENSION_MISMATCH",
    "EMPTY_TEXT",
    "EmbeddingIndexer",
    "EmbeddingOutcome",
]
