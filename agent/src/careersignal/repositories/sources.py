"""원본 저장소.

수집 에이전트와 적재 파이프라인이 사용한다.
스냅샷과 관찰은 INSERT 만 허용한다. 트리거가 변경과 삭제를 막는다.
"""

from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Any

from careersignal.domain.permissions import Component
from careersignal.domain.source_policy import AllowedUse, SourceTier
from careersignal.repositories.base import Repository


def content_hash(raw: str) -> str:
    """스냅샷 중복 판정 기준. ERD 4.2의 SHA-256 hex 64자."""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class SourceRepository(Repository):
    component = Component.AGENT_COLLECT

    def register_source(self, values: dict[str, Any]) -> None:
        self.unit.insert("sources", values)

    def find_source(self, source_id: str) -> dict[str, Any] | None:
        return self.unit.fetch_one(
            "SELECT * FROM sources WHERE source_id = %s", (source_id,)
        )

    def pending_research_requests(
        self, analysis_version: str, limit: int = 50
    ) -> list[dict[str, Any]]:
        """수집이 소비할 조사 요청.

        읽기만 한다. 상태 갱신은 오케스트레이터의 몫이며 컬럼 단위 GRANT 가
        이 경계를 강제한다. 정의는 docs/permission-matrix.md 5.3이다.

        우선순위가 높은 요청부터 돌려준다.
        """
        return self.unit.fetch_all(
            """
            SELECT request_id, goal, needed_evidence_type, scope_level, scope_id,
                   status, priority
            FROM research_requests
            WHERE analysis_version = %s AND status IN ('open', 'scheduled')
            ORDER BY priority DESC, request_id
            LIMIT %s
            """,
            (analysis_version, limit),
        )

    def find_snapshot_by_hash(self, source_id: str, digest: str) -> str | None:
        """같은 내용이면 새 스냅샷을 만들지 않는다."""
        return self.unit.fetch_value(
            "SELECT snapshot_id FROM source_snapshots WHERE source_id = %s AND content_hash = %s",
            (source_id, digest),
        )

    def latest_snapshot(self, source_id: str) -> dict[str, Any] | None:
        """가장 최근 스냅샷. 새 내용이 오면 이 스냅샷을 대체한다."""
        return self.unit.fetch_one(
            """
            SELECT snapshot_id, content_hash, fetched_at
            FROM source_snapshots
            WHERE source_id = %s
            ORDER BY fetched_at DESC, snapshot_id DESC
            LIMIT 1
            """,
            (source_id,),
        )

    def add_snapshot(
        self,
        snapshot_id: str,
        source_id: str,
        raw_content: str,
        dataset_version: str,
        fetched_at: datetime | None = None,
        published_at: datetime | None = None,
        supersedes_snapshot_id: str | None = None,
    ) -> str:
        digest = content_hash(raw_content)
        existing = self.find_snapshot_by_hash(source_id, digest)
        if existing:
            return existing
        self.unit.insert(
            "source_snapshots",
            {
                "snapshot_id": snapshot_id,
                "source_id": source_id,
                "content_hash": digest,
                "raw_content": raw_content,
                "published_at": published_at,
                "fetched_at": fetched_at or datetime.now(),
                "dataset_version": dataset_version,
                "supersedes_snapshot_id": supersedes_snapshot_id,
            },
        )
        return snapshot_id

    def add_observation(
        self,
        observation_id: str,
        snapshot_id: str,
        fetch_status: str,
        canonical_url: str | None = None,
        http_status: int | None = None,
        notes: str | None = None,
        observed_at: datetime | None = None,
    ) -> None:
        self.unit.insert(
            "source_observations",
            {
                "observation_id": observation_id,
                "snapshot_id": snapshot_id,
                "observed_at": observed_at or datetime.now(),
                "fetch_status": fetch_status,
                "canonical_url": canonical_url,
                "http_status": http_status,
                "notes": notes,
            },
        )

    def find_assessment(
        self, snapshot_id: str, assessment_version: str
    ) -> str | None:
        """이 스냅샷이 이 버전으로 이미 평가되었는가.

        `UNIQUE (snapshot_id, assessment_version)` 이 같은 버전의 재평가를 막는다.
        수집을 나눠서 여러 번 실행해도 평가가 충돌하지 않도록 먼저 조회한다.
        """
        return self.unit.fetch_value(
            "SELECT assessment_id FROM source_assessments"
            " WHERE snapshot_id = %s AND assessment_version = %s",
            (snapshot_id, assessment_version),
        )

    def add_assessment(
        self,
        assessment_id: str,
        snapshot_id: str,
        tier: SourceTier,
        allowed_uses: frozenset[AllowedUse],
        assessment_version: str,
        reliability_score: float | None = None,
        assessed_by_run_id: str | None = None,
    ) -> None:
        """허용 용도는 자료 계층 정책을 지켜야 한다. 데이터베이스가 다시 검사한다."""
        from careersignal.domain.source_policy import violations

        bad = violations(tier, allowed_uses)
        if bad:
            raise PermissionError(
                f"{tier} 계층에 허용되지 않은 용도: {sorted(str(u) for u in bad)}"
            )
        self.unit.insert(
            "source_assessments",
            {
                "assessment_id": assessment_id,
                "snapshot_id": snapshot_id,
                "source_tier": str(tier),
                "allowed_uses": [str(u) for u in sorted(allowed_uses)],
                "reliability_score": reliability_score,
                "assessment_version": assessment_version,
                "assessed_at": datetime.now(),
                "assessed_by_run_id": assessed_by_run_id,
            },
        )


class IngestRepository(Repository):
    component = Component.PIPE_INGEST

    def add_posting(self, values: dict[str, Any]) -> None:
        self.unit.insert("postings", values)

    def add_posting_version(self, values: dict[str, Any]) -> None:
        self.unit.insert("posting_versions", values)

    def population(self, dataset_version: str, job_role_id: str) -> int:
        """모집단은 언제나 posting_version 단위로 센다."""
        return self.unit.fetch_value(
            """
            SELECT count(*) FROM posting_versions pv
            JOIN postings p ON p.posting_id = pv.posting_id
            WHERE pv.dataset_version = %s AND p.job_role_id = %s
            """,
            (dataset_version, job_role_id),
        )
