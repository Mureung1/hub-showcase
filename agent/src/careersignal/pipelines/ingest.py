"""적재 파이프라인.

정의는 docs/knowledge-schema.md 3장과 docs/data-strategy.md 7장을 따른다.
결정적 helper 다. 에이전트를 시작하지 않고 생성 모델을 쓰지 않는다.

원본을 네 가지로 나눠 기록한다.

| 표 | 담는 것 |
| --- | --- |
| `sources` | URL 과 발행자로 식별되는 논리적 출처 |
| `source_snapshots` | 특정 시점의 내용. 변경하지 않는다 |
| `source_observations` | 수집 시도와 결과 |
| `source_assessments` | 자료 계층과 허용 용도의 버전별 평가 |

나누는 이유는 셋이 서로 다른 속도로 바뀌기 때문이다. 내용은 바뀌면 새 스냅샷이
되고, 접근 가능 여부는 수집할 때마다 달라지며, 평가 기준은 별도 버전을 갖는다.
한 표에 담으면 접근 실패를 기록하려고 원문을 건드려야 한다.
"""

from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass
from datetime import datetime

from careersignal.domain.source_policy import (
    AllowedUse,
    FetchStatus,
    SourceTier,
    retrieved,
)
from careersignal.repositories.sources import SourceRepository, content_hash


def snapshot_identifier(source_id: str, digest: str) -> str:
    """같은 출처의 같은 내용은 같은 식별자를 갖는다.

    적재는 A0 이므로 같은 입력에 같은 결과를 내야 한다. 스냅샷은 내용으로
    식별되지만, 다른 출처의 같은 내용은 다른 스냅샷이므로 출처를 함께 넣는다.
    """
    material = f"{source_id}:{digest}".encode()
    return f"snap_{hashlib.sha256(material).hexdigest()[:32]}"


@dataclass(frozen=True, slots=True)
class FetchResult:
    """수집 시도 한 건의 결과.

    수집 방법은 담지 않는다. 수동 큐레이션과 에이전트 수집이 같은 모양으로 들어온다.
    """

    source_id: str
    status: FetchStatus
    raw_content: str | None = None
    canonical_url: str | None = None
    http_status: int | None = None
    published_at: datetime | None = None
    notes: str | None = None
    fetched_at: datetime | None = None

    def __post_init__(self) -> None:
        if retrieved(self.status) and self.raw_content is None:
            raise ValueError(f"{self.status} 는 원문이 있어야 한다")
        if not retrieved(self.status) and self.raw_content is not None:
            raise ValueError(f"{self.status} 는 원문을 갖지 않는다")


@dataclass(frozen=True, slots=True)
class IngestOutcome:
    """적재 한 건의 결과."""

    snapshot_id: str | None
    observation_id: str | None
    created_snapshot: bool = False
    reused_snapshot: bool = False
    superseded_snapshot_id: str | None = None
    skipped_reason: str | None = None

    @property
    def recorded(self) -> bool:
        return self.observation_id is not None


NO_PRIOR_SNAPSHOT = "NO_PRIOR_SNAPSHOT"
"""첫 수집이 실패해 관찰을 붙일 스냅샷이 없다.

`source_observations.snapshot_id` 는 NOT NULL 이다. 관찰은 특정 내용에 대한
관찰이므로 내용이 한 번도 없었으면 기록할 대상이 없다.
"""


class SourceIngestPipeline:
    """수집 결과를 원본 네 표에 나눠 기록한다."""

    def __init__(self, repository: SourceRepository) -> None:
        self._repository = repository

    def record(self, result: FetchResult, dataset_version: str) -> IngestOutcome:
        """수집 결과 하나를 적재한다.

        내용을 얻었으면 해시로 중복을 판정한다. 같은 내용이면 새 스냅샷을 만들지
        않고 관찰만 남긴다. 다르면 새 스냅샷을 만들고 직전 스냅샷을 가리킨다.

        접근에 실패했으면 새 내용이 없으므로 직전 스냅샷에 관찰만 붙인다.
        접근할 수 없게 된 자료의 스냅샷과 관찰을 보존하기 위해서다.
        """
        observed_at = result.fetched_at or datetime.now()
        previous = self._repository.latest_snapshot(result.source_id)

        if not retrieved(result.status):
            if previous is None:
                return IngestOutcome(
                    snapshot_id=None,
                    observation_id=None,
                    skipped_reason=NO_PRIOR_SNAPSHOT,
                )
            observation_id = self._observe(previous["snapshot_id"], result, observed_at)
            return IngestOutcome(
                snapshot_id=previous["snapshot_id"], observation_id=observation_id
            )

        assert result.raw_content is not None
        digest = content_hash(result.raw_content)
        existing = self._repository.find_snapshot_by_hash(result.source_id, digest)

        if existing is not None:
            observation_id = self._observe(existing, result, observed_at)
            return IngestOutcome(
                snapshot_id=existing,
                observation_id=observation_id,
                reused_snapshot=True,
            )

        supersedes = previous["snapshot_id"] if previous else None
        snapshot_id = self._repository.add_snapshot(
            snapshot_id=snapshot_identifier(result.source_id, digest),
            source_id=result.source_id,
            raw_content=result.raw_content,
            dataset_version=dataset_version,
            fetched_at=observed_at,
            published_at=result.published_at,
            supersedes_snapshot_id=supersedes,
        )
        observation_id = self._observe(snapshot_id, result, observed_at)
        return IngestOutcome(
            snapshot_id=snapshot_id,
            observation_id=observation_id,
            created_snapshot=True,
            superseded_snapshot_id=supersedes,
        )

    def assess(
        self,
        snapshot_id: str,
        tier: SourceTier,
        allowed_uses: frozenset[AllowedUse],
        assessment_version: str,
        reliability_score: float | None = None,
        assessed_by_run_id: str | None = None,
    ) -> str:
        """스냅샷의 자료 계층과 허용 용도를 기록한다.

        평가는 스냅샷과 분리한다. 기준이 바뀌면 새 `assessment_version` 으로 다시
        평가하고 이전 평가를 보존한다. 계층에 허용되지 않은 용도는 저장소가 막는다.
        """
        assessment_id = f"assess_{uuid.uuid4().hex}"
        self._repository.add_assessment(
            assessment_id=assessment_id,
            snapshot_id=snapshot_id,
            tier=tier,
            allowed_uses=allowed_uses,
            assessment_version=assessment_version,
            reliability_score=reliability_score,
            assessed_by_run_id=assessed_by_run_id,
        )
        return assessment_id

    def _observe(
        self, snapshot_id: str, result: FetchResult, observed_at: datetime
    ) -> str:
        observation_id = f"obs_{uuid.uuid4().hex}"
        self._repository.add_observation(
            observation_id=observation_id,
            snapshot_id=snapshot_id,
            fetch_status=str(result.status),
            canonical_url=result.canonical_url,
            http_status=result.http_status,
            notes=result.notes,
            observed_at=observed_at,
        )
        return observation_id
