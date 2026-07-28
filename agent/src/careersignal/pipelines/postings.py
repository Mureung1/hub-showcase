"""모집단 등록.

원문 스냅샷 가운데 채용공고를 골라 `postings` 와 `posting_versions` 로 등록한다.
모든 지표의 분모가 `posting_versions` 이므로 이 단계 없이는 어떤 지표도 성립하지 않는다.
근거는 docs/metric-spec.md 2.1이다.

결정적 helper 다. 같은 매니페스트와 같은 스냅샷에서 같은 공고 집합을 얻는다.

한 출처가 모집분야를 여럿 담으면 분야마다 공고가 나오고, 같은 직무의 모집분야는 하나로
합친다. 규칙은 docs/metric-spec.md 2.8이다. 공고를 출처와 직무의 짝으로 식별하면 이
규칙이 식별자에서 저절로 지켜진다.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import date, datetime

from careersignal.repositories.sources import IngestRepository


def posting_identifier(source_id: str, job_role_id: str) -> str:
    """같은 출처의 같은 직무는 하나의 공고다.

    모집분야가 여럿이어도 직무가 같으면 같은 식별자가 나온다. 나누면 같은 요구가
    두 번 세어져 분자와 분모가 함께 부푼다.
    """
    material = f"{source_id}:{job_role_id}".encode()
    return f"post_{hashlib.sha256(material).hexdigest()[:24]}"


def posting_version_identifier(posting_id: str, snapshot_id: str) -> str:
    """공고 하나의 특정 내용. `UNIQUE (posting_id, snapshot_id)` 와 짝을 이룬다."""
    material = f"{posting_id}:{snapshot_id}".encode()
    return f"pv_{hashlib.sha256(material).hexdigest()[:24]}"


@dataclass(frozen=True, slots=True)
class PostingDraft:
    """모집단에 들어갈 공고 하나.

    매니페스트가 만드는 값이며 저장소를 모른다.
    """

    source_id: str
    company_id: str
    job_role_id: str
    title: str
    entry_label: str
    entry_label_raw: str | None = None
    platform_bound: bool = False

    @property
    def posting_id(self) -> str:
        return posting_identifier(self.source_id, self.job_role_id)


@dataclass(frozen=True, slots=True)
class RegisterOutcome:
    """등록 한 번의 결과."""

    created_postings: int = 0
    created_versions: int = 0
    existing_postings: int = 0
    existing_versions: int = 0
    skipped: tuple[tuple[str, str], ...] = ()
    """등록하지 못한 공고. `(출처 식별자, 사유)` 다."""

    @property
    def population(self) -> int:
        return self.created_versions + self.existing_versions


NO_SNAPSHOT = "스냅샷이 없다"
"""원문을 한 번도 얻지 못한 출처는 모집단에 들어가지 않는다."""


class PostingRegistrar:
    """공고 초안을 모집단으로 등록한다."""

    def __init__(self, repository: IngestRepository) -> None:
        self._repository = repository

    def register(
        self,
        drafts: tuple[PostingDraft, ...],
        snapshot_of: dict[str, str],
        dataset_version: str,
        posted_at: date,
    ) -> RegisterOutcome:
        """초안을 등록한다.

        `snapshot_of` 는 출처 식별자에서 최신 스냅샷 식별자로 가는 대응이다.
        스냅샷이 없는 출처는 건너뛰고 사유를 남긴다.

        `posted_at` 은 공고가 게시일을 밝히지 않을 때 쓰는 값이다. 기간 축이 이 값으로
        갈리므로 호출하는 쪽이 무엇을 넣는지 알고 넣어야 한다. 정의는
        docs/metric-spec.md 2.1이다.
        """
        created_p = existing_p = created_v = existing_v = 0
        skipped: list[tuple[str, str]] = []
        seen: set[str] = set()
        moment = datetime.combine(posted_at, datetime.min.time())

        for draft in drafts:
            snapshot_id = snapshot_of.get(draft.source_id)
            if snapshot_id is None:
                skipped.append((draft.source_id, NO_SNAPSHOT))
                continue

            posting_id = draft.posting_id
            if posting_id in seen:
                pass
            elif self._repository.find_posting(posting_id) is not None:
                existing_p += 1
                seen.add(posting_id)
            else:
                self._repository.add_posting(
                    {
                        "posting_id": posting_id,
                        "source_id": draft.source_id,
                        "company_id": draft.company_id,
                        "job_role_id": draft.job_role_id,
                        "first_posted_at": moment,
                    }
                )
                created_p += 1
                seen.add(posting_id)

            version_id = posting_version_identifier(posting_id, snapshot_id)
            if self._repository.find_posting_version(version_id) is not None:
                existing_v += 1
                continue
            self._repository.add_posting_version(
                {
                    "posting_version_id": version_id,
                    "posting_id": posting_id,
                    "snapshot_id": snapshot_id,
                    "title": draft.title,
                    "entry_label_raw": draft.entry_label_raw,
                    "entry_label": draft.entry_label,
                    "posted_at": moment,
                    "dataset_version": dataset_version,
                }
            )
            created_v += 1

        return RegisterOutcome(
            created_postings=created_p,
            created_versions=created_v,
            existing_postings=existing_p,
            existing_versions=existing_v,
            skipped=tuple(skipped),
        )
