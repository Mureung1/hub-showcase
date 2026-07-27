"""데이터 수집 에이전트의 계약.

정의는 docs/agent-design.md 6장·7.1과 docs/data-strategy.md 8장을 따른다.

수집 방법은 계약에 담지 않는다. 출처를 지정해 가져오는 경로와 출처 발견까지
수행하는 A3 실구현이 같은 계약으로 들어와 같은 적재 파이프라인을 쓴다.

수집 에이전트는 `research_requests` 를 읽지만 상태를 바꾸지 않는다. 무엇을
채웠는지 결과로 보고하고 상태 전이는 오케스트레이터가 수행한다. 근거는
docs/permission-matrix.md 5.3의 컬럼 단위 GRANT 다.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Protocol

from pydantic import BaseModel, ConfigDict, Field

from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.pipelines.ingest import FetchResult


class SourceType(StrEnum):
    """`sources.source_type` 의 값 집합."""

    JOB_POSTING = "job_posting"
    COMPANY_OFFICIAL = "company_official"
    PUBLIC_STANDARD = "public_standard"
    EXTERNAL_EXPERT = "external_expert"
    LEARNING_MATERIAL = "learning_material"


class CollectionTarget(BaseModel):
    """수집 대상 하나.

    `research_request_id` 는 이 대상이 어느 조사 요청에서 나왔는지 가리킨다.
    정기 수집처럼 요청 없이 시작한 대상은 비어 있다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    source_id: str
    url: str
    source_type: SourceType
    publisher: str | None = None
    company_id: str | None = None
    job_role_ids: tuple[str, ...] = ()
    robots_policy: str | None = None
    license_note: str | None = None
    research_request_id: str | None = None


class SourceFetcher(Protocol):
    """원문을 가져오는 구현이 지켜야 하는 모양.

    P5-4의 지정 수집과 Phase 26의 출처 발견 실구현이 이 자리에 들어간다.
    실패도 결과이므로 예외가 아니라 `FetchResult` 로 돌려준다.
    """

    def fetch(self, target: CollectionTarget) -> FetchResult: ...


class TargetOutcome(BaseModel):
    """대상 하나의 수집 결과."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    source_id: str
    research_request_id: str | None = None
    snapshot_id: str | None = None
    created_snapshot: bool = False
    reused_snapshot: bool = False
    recorded_observation: bool = False
    skipped_reason: str | None = None
    error: str | None = None


class CollectionOutcome(BaseModel):
    """수집 실행 하나의 결과.

    조사 요청의 상태를 담지 않는다. `fulfilled_request_ids` 는 새 근거를 얻은
    요청을 알려줄 뿐이고, 요청을 `fulfilled` 로 바꾸는 것은 오케스트레이터다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    agent_run_id: str
    stop_reason: StopReason
    attempted: int = Field(default=0, ge=0)
    targets: tuple[TargetOutcome, ...] = ()

    @property
    def new_snapshots(self) -> tuple[str, ...]:
        return tuple(
            t.snapshot_id
            for t in self.targets
            if t.created_snapshot and t.snapshot_id is not None
        )

    @property
    def fulfilled_request_ids(self) -> tuple[str, ...]:
        """새 근거를 얻은 조사 요청. 중복 없이 등장 순서를 지킨다."""
        seen: dict[str, None] = {}
        for target in self.targets:
            if target.created_snapshot and target.research_request_id:
                seen.setdefault(target.research_request_id, None)
        return tuple(seen)

    @property
    def gained_evidence(self) -> bool:
        return bool(self.new_snapshots)


class CollectorAgent(Protocol):
    """수집 에이전트의 실행 계약."""

    def collect(
        self, context: RunContext, targets: tuple[CollectionTarget, ...]
    ) -> CollectionOutcome: ...
