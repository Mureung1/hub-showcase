"""수집 매니페스트.

출처 목록과 메타데이터를 저장소에 두고 원문은 두지 않는다. 매니페스트가
재현의 기준이며, 같은 목록으로 다시 수집하면 같은 자료 범위를 얻는다.

원문을 저장소에 두지 않는 이유는 기업 채용공고와 외부 자료의 이용 조건 때문이다.
원문은 데이터베이스 스냅샷에만 들어간다.

정의는 docs/data-strategy.md 5장·8장을 따른다.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from careersignal.agents.collector.contract import CollectionTarget, SourceType
from careersignal.domain.segment import EntryLabel
from careersignal.domain.source_policy import AllowedUse, SourceTier


class ManifestPosition(BaseModel):
    """출처 하나가 담는 모집분야 하나.

    한 출처가 모집분야를 여럿 담으면 분야마다 공고가 하나씩 나온다. 규칙은
    docs/metric-spec.md 2.8이다. 분야별 요구사항 본문이 분리된 출처에만 쓴다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    position_name: str
    job_role_ids: tuple[str, ...] = ("backend",)
    job_role_raw: str | None = None
    platform_bound: bool = False
    entry_label_raw: str | None = None
    entry_label: EntryLabel | None = None


class ManifestEntry(BaseModel):
    """수집 대상 하나의 기록.

    `content_file` 은 저장소 밖의 원문 파일 이름이다. 파일이 없으면 다시 수집한다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    source_id: str
    url: str
    source_type: SourceType
    tier: SourceTier
    allowed_uses: tuple[AllowedUse, ...]

    publisher: str | None = None
    company_id: str | None = None
    cluster_id: str | None = None
    job_role_ids: tuple[str, ...] = ("backend",)

    title: str | None = None
    job_role_raw: str | None = None
    """직무 판정에 사용한 원문 표기. 판정 규칙은 docs/metric-spec.md 2.8이다."""

    platform_bound: bool = False
    """패키지나 SaaS 플랫폼 위에서 서버 로직을 구현하는 공고인가.

    모집단에는 들어가되 요구 차원의 성격이 다르다. 정의는 docs/metric-spec.md 2.8이다.
    """

    entry_label_raw: str | None = None
    entry_label: EntryLabel | None = None
    posted_at: date | None = None
    closed_at: date | None = None

    robots_policy: str | None = None
    license_note: str | None = None
    collected_on: date | None = None
    content_file: str | None = None
    note: str | None = None

    positions: tuple[ManifestPosition, ...] = ()
    """출처가 담는 모집분야 목록. 비어 있으면 이 항목 자체가 공고 하나다."""

    def posting_count(self) -> int:
        """이 출처에서 나오는 공고 수."""
        return len(self.positions) or 1

    def entry_labels(self) -> tuple[EntryLabel, ...]:
        """이 출처가 만드는 공고들의 대상군 표기. 판정하지 못한 값은 빼고 돌려준다."""
        if self.positions:
            return tuple(p.entry_label for p in self.positions if p.entry_label is not None)
        return (self.entry_label,) if self.entry_label is not None else ()

    def to_target(self) -> CollectionTarget:
        return CollectionTarget(
            source_id=self.source_id,
            url=self.url,
            source_type=self.source_type,
            publisher=self.publisher,
            company_id=self.company_id,
            job_role_ids=self.job_role_ids,
            robots_policy=self.robots_policy,
            license_note=self.license_note,
        )


class SourceManifest(BaseModel):
    """한 직무의 수집 대상 전체."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    job_role_id: str
    dataset_version: str
    as_of_date: date
    entries: tuple[ManifestEntry, ...] = ()
    unreachable: tuple[dict[str, str], ...] = Field(default_factory=tuple)
    """접근하지 못한 출처. 왜 못 했는지를 남겨 다음 수집이 같은 시도를 반복하지 않는다."""

    access_notes: tuple[dict[str, str], ...] = Field(default_factory=tuple)
    """출처별 접근 방법.

    접근 방법은 직무와 무관하다. 직무를 확장할 때 `unreachable` 과 함께 직무별
    파일에서 공용 파일로 분리한다. 분리 시점은 docs/backlog.md 의 Phase 28이다.
    """

    @classmethod
    def load(cls, path: Path) -> SourceManifest:
        return cls.model_validate_json(path.read_text(encoding="utf-8"))

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(
                self.model_dump(mode="json", exclude_none=True),
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

    def by_tier(self, tier: SourceTier) -> tuple[ManifestEntry, ...]:
        return tuple(e for e in self.entries if e.tier is tier)

    def by_cluster(self, cluster_id: str) -> tuple[ManifestEntry, ...]:
        return tuple(e for e in self.entries if e.cluster_id == cluster_id)

    def posting_count(self) -> int:
        """매니페스트가 만드는 공고 수.

        출처 수와 다르다. 한 출처가 모집분야를 여럿 담으면 공고가 여럿 나오고,
        채용공고가 아닌 출처는 공고를 만들지 않는다. 공공 표준과 회사 공식 자료는
        모집단에 들어가지 않는다. 근거는 docs/metric-spec.md 2.1이다.
        """
        return sum(
            e.posting_count()
            for e in self.entries
            if e.source_type is SourceType.JOB_POSTING
        )

    def segment_counts(self) -> dict[str, int]:
        """대상군 분포. 기준선을 낼 수 있는지 판단하는 값이며 공고 단위로 센다."""
        from careersignal.domain.segment import segment_of

        counts: dict[str, int] = {}
        for entry in self.entries:
            for label in entry.entry_labels():
                key = str(segment_of(label))
                counts[key] = counts.get(key, 0) + 1
        return counts
