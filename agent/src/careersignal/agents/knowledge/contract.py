"""지식 구축 Wiki 에이전트의 계약.

정의는 docs/agent-design.md 6장·7.2 와 docs/knowledge-schema.md 8장을 따른다.
구조 규칙은 `agent/data/demo_seed/CONTRACT.md` 8장이다.

이 모듈은 입출력 모델과 포트만 갖는다. 생성 구현은 `adapter.py`, 실행 순서는
`agent.py` 다. 계약이 저장소와 모델 제공자를 모르므로 대역만으로 모든 갈래를
검사할 수 있다.

Wiki 는 개별 공고를 복제하지 않는다. 공고 원문은 D0 에 있고 여기서는 역량을 어느
깊이까지 다뤄야 하는지의 기준만 만든다.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import date
from enum import StrEnum
from typing import Any, Protocol, runtime_checkable

from pydantic import BaseModel, ConfigDict, Field

from careersignal.contracts.run_context import StopReason
from careersignal.domain.depth import DepthLevel
from careersignal.domain.source_policy import AllowedUse, SourceTier, is_allowed

# ================================================================ 필드와 근거 정책
WIKI_FIELDS: tuple[str, ...] = (
    "definition",
    "why_required",
    "depth_criteria",
    "prerequisites",
    "common_misconceptions",
    "interview_verification",
    "learning_sequence",
)
"""`wiki_evidence.field_name` 의 값 집합. 순서는 docs/knowledge-schema.md 8.3 이다."""

TEXT_FIELDS: frozenset[str] = frozenset({"definition", "why_required"})
"""`wiki_revisions` 에서 text 컬럼인 필드. 나머지 다섯은 jsonb 다(docs/erd.md 9.x)."""

REQUIRED_FIELDS: tuple[str, ...] = (
    "definition",
    "why_required",
    "depth_criteria",
)
"""필수 필드. 셋의 근거가 모두 충족되어야 개정을 만든다(docs/knowledge-schema.md 8.4).

Wiki 의 책임은 역량을 어느 깊이까지 다뤄야 하는지의 기준이다(같은 문서 8.1). 정의가
없으면 무엇에 대한 기준인지 말할 수 없고, 요구 이유가 없으면 그 기준을 왜 그 자리에
두는지 말할 수 없으며, 깊이 기준이 없으면 이 문서가 존재할 이유가 없다. 나머지 네
필드는 근거가 있으면 담고 없으면 비운다.
"""

FIELD_USE: dict[str, AllowedUse] = {
    "definition": AllowedUse.WIKI_DEFINITION,
    "why_required": AllowedUse.WIKI_WHY_REQUIRED,
    "depth_criteria": AllowedUse.WIKI_DEPTH_CRITERIA,
    "prerequisites": AllowedUse.WIKI_PREREQUISITES,
    "common_misconceptions": AllowedUse.WIKI_COMMON_MISCONCEPTIONS,
    "interview_verification": AllowedUse.WIKI_INTERVIEW_VERIFICATION,
    "learning_sequence": AllowedUse.WIKI_LEARNING_SEQUENCE,
}
"""필드 하나가 근거에 요구하는 용도. 필드와 용도는 일대일로 대응한다.

같은 표가 검사 2(`verification/checks/source_policy.py`)에도 있다. 검증은 저장된
개정을 사후에 보고 이 계약은 저장 전에 근거를 고르므로, 두 계층이 서로를 import 하지
않고 각자 docs/knowledge-schema.md 8.5 를 따른다. 표가 갈리면 저장은 되고 검증에서
막히므로 어긋남이 실행 결과로 드러난다.
"""

FIELD_ALLOWED_TIERS: dict[str, frozenset[SourceTier]] = {
    field: frozenset(tier for tier in SourceTier if is_allowed(tier, use))
    for field, use in FIELD_USE.items()
}
"""필드별로 근거가 될 수 있는 자료 계층. 계층표는 `domain/source_policy.py` 가 갖는다.

자료 계층은 품질의 단일 순서가 아니라 허용 용도의 구분이다. 외부 전문가 자료(D)는
준비 방법과 면접 관점에 쓰고 기업의 요구사항 집계에 쓰지 않으며, 미검증 자료(E)는
허용 용도가 하나도 없으므로 어느 필드의 근거도 되지 못한다.
"""


class TargetReason(StrEnum):
    """생성 대상이 된 이유. docs/knowledge-schema.md 8.4 의 OR 두 갈래다."""

    STATISTICS_PRIORITY = "statistics_priority"
    RESEARCH_REQUEST = "research_request"


# ================================================================ 탈락 사유
NO_ALLOWED_EVIDENCE = "허용 계층의 근거가 없다"
"""이 필드가 쓸 수 있는 계층의 청크가 하나도 없다. 모델을 부르지 않는다."""

NO_CONTENT = "모델이 내용을 내지 않았다"
EVIDENCE_NOT_CITED = "인용한 청크가 허용 근거 목록에 없다"
MISSING_REQUIRED_FIELD = "필수 필드의 근거가 충족되지 않았다"
NO_KNOWLEDGE_VERSION = "실행 봉투에 knowledge_version 이 없다"
NO_TAXONOMY_VERSION = "실행 봉투에 taxonomy_version_id 가 없다"
PAGE_EXISTS = "이 지식 버전에 이미 페이지가 있다"
TRANSACTION_LOST = "거래가 죽어 남은 페이지를 저장하지 못한다"
"""저장이 거래를 죽이는 실패를 냈다. 남은 페이지를 시도하지 않고 멈춘 사유다.

PostgreSQL 은 거래 안에서 오류가 나면 남은 명령을 전부 거부한다. 죽은 거래에 계속
저장하면 같은 사유의 실패 줄이 페이지 수만큼 쌓인다.
"""


# ================================================================ 입력 모델
class EvidenceChunk(BaseModel):
    """근거가 될 수 있는 청크 하나.

    `wiki_evidence` 는 청크와 계층만 남기므로 저장에 필요한 것은 둘뿐이다. `text` 는
    모델에 보낼 발췌이며 저장하지 않는다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    chunk_id: str
    source_tier: SourceTier
    text: str = ""
    snapshot_id: str | None = None


class WikiTarget(BaseModel):
    """Wiki 를 만들 역량 하나.

    `prevalence` 는 이 역량에 걸린 차원 가운데 가장 널리 요구된 값이다. 조사 요청만으로
    들어온 역량은 비어 있을 수 있다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    capability_id: str
    canonical_label: str
    reason: TargetReason
    prevalence: float | None = Field(default=None, ge=0.0, le=1.0)
    sample_size: int = Field(default=0, ge=0)
    dimension_ids: tuple[str, ...] = ()
    research_request_id: str | None = None
    depth_distribution: dict[str, float] | None = None
    expected_depth: DepthLevel | None = None


class WikiFieldRequest(BaseModel):
    """필드 하나의 생성 요청. 모델 호출 한 번의 단위다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    capability_id: str
    canonical_label: str
    field_name: str
    evidence: tuple[EvidenceChunk, ...]
    guidance: str = ""
    """규칙이 미리 정한 틀. `depth_criteria` 는 등급별 판정 문장이 여기에 들어간다."""

    @property
    def allowed_chunk_ids(self) -> frozenset[str]:
        return frozenset(chunk.chunk_id for chunk in self.evidence)


class WikiFieldDraft(BaseModel):
    """필드 하나의 생성 결과.

    `wiki_revisions` 한 행이 아니라 필드 하나다. 개정 행은 필드 일곱의 결과를 모아
    `agent.py` 가 만든다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    field_name: str
    lines: tuple[str, ...] = ()
    """문장 목록. text 필드는 줄바꿈으로 이어 붙이고 jsonb 필드는 그대로 담는다."""

    chunk_ids: tuple[str, ...] = ()
    """이 필드가 인용한 청크. `wiki_evidence` 한 줄씩이 된다."""

    @property
    def empty(self) -> bool:
        return not any(line.strip() for line in self.lines)


# ================================================================ 출력 모델
class PageOutcome(BaseModel):
    """역량 하나의 생성 결과."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    capability_id: str
    page_id: str | None = None
    revision_id: str | None = None
    created_page: bool = False
    stored_fields: tuple[str, ...] = ()
    dropped_fields: tuple[tuple[str, str], ...] = ()
    """저장하지 않은 필드와 사유. 근거가 없는 필드는 저장하지 않는다."""

    evidence_rows: int = 0
    skipped_reason: str | None = None
    error: str | None = None


class WikiOutcome(BaseModel):
    """Wiki 실행 하나의 결과."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    agent_run_id: str
    stop_reason: StopReason
    selected_targets: int = 0
    visited_targets: int = 0
    created_pages: int = 0
    created_revisions: int = 0
    stored_evidence: int = 0
    pages: tuple[PageOutcome, ...] = ()
    errors: tuple[tuple[str, str], ...] = ()
    """생성 구현이나 저장이 던진 예외. `(역량 또는 필드, 사유)` 다."""

    @property
    def gained_evidence(self) -> bool:
        """이 실행이 새 근거를 남겼는가.

        개정 행이 아니라 `wiki_evidence` 행을 센다. 근거가 없는 필드는 저장하지
        않으므로(docs/knowledge-schema.md 8.3) 근거 0 개의 개정은 없다.
        """
        return self.stored_evidence > 0


# ================================================================ 포트
@runtime_checkable
class WikiWriter(Protocol):
    """필드 하나의 문장을 쓰는 것.

    허용 계층으로 이미 걸러진 근거만 받는다. 자료 정책은 이 포트 밖에서 강제하며
    구현은 받은 근거 안에서만 쓴다.
    """

    def write(self, request: WikiFieldRequest) -> WikiFieldDraft: ...


@runtime_checkable
class WikiRepository(Protocol):
    """Wiki 실행이 읽고 쓰는 자리.

    `agent.py` 는 이 모양만 알고 psycopg 를 import 하지 않는다. 실구현은
    `repositories/` 에 있고 대역은 단위 검사에 있다.
    """

    # -------------------------------------------------------- 생성 대상 판정
    def capabilities(self, job_role_id: str) -> list[dict[str, Any]]: ...

    def capability_dimension_links(
        self, taxonomy_version_id: str
    ) -> list[dict[str, Any]]: ...

    def prevalence_facts(self, analysis_version: str) -> list[dict[str, Any]]: ...

    def depth_profiles(self, analysis_version: str) -> list[dict[str, Any]]: ...

    def requested_capabilities(self, analysis_version: str) -> list[dict[str, Any]]: ...

    # -------------------------------------------------------- 근거
    def field_evidence(
        self, capability_id: str, as_of_date: date
    ) -> list[dict[str, Any]]: ...

    # -------------------------------------------------------- 저장
    def existing_pages(self, knowledge_version: str) -> dict[str, str]: ...

    def add_page(self, values: dict[str, Any]) -> None: ...

    def add_revision(self, values: dict[str, Any]) -> None: ...

    def add_evidence(self, values: dict[str, Any]) -> None: ...


# ================================================================ 순수 도우미
def allowed_evidence(
    field_name: str, pool: Sequence[Mapping[str, Any] | EvidenceChunk]
) -> tuple[EvidenceChunk, ...]:
    """필드 하나가 쓸 수 있는 근거만 남긴다. 순수 함수다.

    계층을 읽을 수 없는 청크는 버린다. 모르는 자료를 근거로 두지 않는다는 규칙은
    검사 2 의 `POLICY_NOT_ASSESSED` 와 같은 판단이며, 저장 전에 거르면 검증에서
    막힐 개정을 애초에 만들지 않는다.

    순서는 받은 순서를 지킨다. 같은 입력이 같은 근거 목록을 주어야 개정 하나를 다시
    만들었을 때 `wiki_evidence` 가 흔들리지 않는다.
    """
    if field_name not in FIELD_ALLOWED_TIERS:
        raise ValueError(f"등록되지 않은 Wiki 필드: {field_name}")

    tiers = FIELD_ALLOWED_TIERS[field_name]
    kept: list[EvidenceChunk] = []
    seen: set[str] = set()
    for item in pool:
        chunk = item if isinstance(item, EvidenceChunk) else _as_chunk(item)
        if chunk is None or chunk.source_tier not in tiers:
            continue
        if chunk.chunk_id in seen:
            continue
        seen.add(chunk.chunk_id)
        kept.append(chunk)
    return tuple(kept)


def _as_chunk(row: Mapping[str, Any]) -> EvidenceChunk | None:
    """저장소 한 줄을 근거 청크로 옮긴다. 계층을 읽지 못하면 비운다."""
    tier = row.get("source_tier")
    chunk_id = row.get("chunk_id")
    if tier is None or not chunk_id:
        return None
    try:
        source_tier = SourceTier(tier)
    except ValueError:
        return None
    return EvidenceChunk(
        chunk_id=str(chunk_id),
        source_tier=source_tier,
        text=str(row.get("text") or ""),
        snapshot_id=row.get("snapshot_id"),
    )


__all__ = [
    "EVIDENCE_NOT_CITED",
    "FIELD_ALLOWED_TIERS",
    "FIELD_USE",
    "MISSING_REQUIRED_FIELD",
    "NO_ALLOWED_EVIDENCE",
    "NO_CONTENT",
    "NO_KNOWLEDGE_VERSION",
    "NO_TAXONOMY_VERSION",
    "PAGE_EXISTS",
    "REQUIRED_FIELDS",
    "TEXT_FIELDS",
    "TRANSACTION_LOST",
    "WIKI_FIELDS",
    "EvidenceChunk",
    "PageOutcome",
    "TargetReason",
    "WikiFieldDraft",
    "WikiFieldRequest",
    "WikiOutcome",
    "WikiRepository",
    "WikiTarget",
    "WikiWriter",
    "allowed_evidence",
]
