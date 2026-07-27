"""파일에서 읽는 가져오기 구현.

출처를 지정해 수집한 원문이 파일로 있을 때 쓴다. `SourceFetcher` 계약을 지키므로
Phase 26의 출처 발견 실구현과 같은 자리에 들어가고, 적재 경로는 공유한다.

원문 파일은 저장소에 두지 않는다. 파일이 없으면 지어내지 않고 `not_found` 로
응답해 매니페스트에 남은 대상이 아직 비어 있음을 드러낸다.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from careersignal.agents.collector.contract import CollectionTarget
from careersignal.agents.collector.manifest import ManifestEntry
from careersignal.domain.source_policy import FetchStatus
from careersignal.pipelines.ingest import FetchResult


class FileFetcher:
    """매니페스트가 가리키는 원문 파일을 읽는다."""

    def __init__(
        self, content_root: Path, entries: tuple[ManifestEntry, ...]
    ) -> None:
        self._root = content_root
        self._entries = {e.source_id: e for e in entries}

    def fetch(self, target: CollectionTarget) -> FetchResult:
        entry = self._entries.get(target.source_id)
        path = self._path(entry)

        if path is None or not path.exists():
            return FetchResult(
                source_id=target.source_id,
                status=FetchStatus.NOT_FOUND,
                canonical_url=target.url,
                notes="원문 파일이 없다",
            )

        published = None
        if entry is not None and entry.posted_at is not None:
            published = datetime.combine(entry.posted_at, datetime.min.time())

        collected = None
        if entry is not None and entry.collected_on is not None:
            collected = datetime.combine(entry.collected_on, datetime.min.time())

        return FetchResult(
            source_id=target.source_id,
            status=FetchStatus.OK,
            raw_content=path.read_text(encoding="utf-8"),
            canonical_url=target.url,
            published_at=published,
            fetched_at=collected,
        )

    def _path(self, entry: ManifestEntry | None) -> Path | None:
        if entry is None or entry.content_file is None:
            return None
        return self._root / entry.content_file

    def missing(self) -> tuple[str, ...]:
        """원문이 아직 없는 출처. 수집 진행 상황을 보는 값이다."""
        return tuple(
            source_id
            for source_id, entry in self._entries.items()
            if (path := self._path(entry)) is None or not path.exists()
        )
