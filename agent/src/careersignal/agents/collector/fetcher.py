"""가져오기 구현.

`SourceFetcher` 계약의 스텁이다. 출처 발견과 웹 수집을 하지 않는다.
미리 준비한 원문을 계약에 맞춰 돌려주며, 지정 수집 경로와 Phase 26의 A3 실구현이
같은 계약으로 교체된다.

이 스텁이 있어야 뒤 Phase 들이 수집 실구현을 기다리지 않고 진행한다.
"""

from __future__ import annotations

from collections.abc import Mapping
from datetime import datetime

from careersignal.agents.collector.contract import CollectionTarget
from careersignal.domain.source_policy import FetchStatus
from careersignal.pipelines.ingest import FetchResult


class PreparedFetcher:
    """준비된 원문을 돌려준다.

    출처 식별자에 원문이 없으면 `not_found` 로 응답한다. 없는 것을 지어내지
    않으며, 실패도 결과이므로 예외를 던지지 않는다.
    """

    def __init__(
        self,
        documents: Mapping[str, str],
        published_at: Mapping[str, datetime] | None = None,
        fetched_at: datetime | None = None,
    ) -> None:
        self._documents = dict(documents)
        self._published_at = dict(published_at or {})
        self._fetched_at = fetched_at

    def fetch(self, target: CollectionTarget) -> FetchResult:
        content = self._documents.get(target.source_id)
        if content is None:
            return FetchResult(
                source_id=target.source_id,
                status=FetchStatus.NOT_FOUND,
                canonical_url=target.url,
                http_status=404,
                fetched_at=self._fetched_at,
            )
        return FetchResult(
            source_id=target.source_id,
            status=FetchStatus.OK,
            raw_content=content,
            canonical_url=target.url,
            http_status=200,
            published_at=self._published_at.get(target.source_id),
            fetched_at=self._fetched_at,
        )


class UnavailableFetcher:
    """모든 대상에 같은 실패를 돌려준다. 실패 경로 검증에 쓴다."""

    def __init__(
        self, status: FetchStatus = FetchStatus.FORBIDDEN, http_status: int = 403
    ) -> None:
        if status in (FetchStatus.OK, FetchStatus.CHANGED):
            raise ValueError("실패 상태만 받는다")
        self._status = status
        self._http_status = http_status

    def fetch(self, target: CollectionTarget) -> FetchResult:
        return FetchResult(
            source_id=target.source_id,
            status=self._status,
            canonical_url=target.url,
            http_status=self._http_status,
        )
