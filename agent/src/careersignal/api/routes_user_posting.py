"""`POST /postings/analyze` — 사용자가 직접 입력한 공고 한 건의 개별 분석.

계약은 ``agent/data/demo_seed/CONTRACT.md`` 6.3·7장이고 흐름은
docs/architecture.md 11장이다.

```
Express  { raw_text, job }            길이·빈도 검사, 정규화, SHA-256
  → FastAPI { content_hash, normalized_text, job_role_id }
      user_postings 조회
        적중  → user_posting_analyses 3종을 그대로,  source = "cache"
        미적중 → 온디맨드 체인 실행 후 저장,          source = "agent"
```

이 라우터가 지키는 것 셋.

1. **받은 `normalized_text` 를 믿지 않는다.** 다시 정규화하고 해시를 다시 계산해
   요청의 `content_hash` 와 다르면 400 이다. 해시는 캐시의 열쇠이므로, 클라이언트가
   보낸 값을 그대로 열쇠로 쓰면 남의 공고 자리에 다른 원문을 얹거나 저장된 결과를
   엉뚱한 원문에 붙일 수 있다.
2. **온디맨드 체인은 모델을 부르지 않는다.** 에이전트 3종을 `Protocol` 포트로
   주입받는다. 주입되지 않았으면 503 과 `ONDEMAND_UNAVAILABLE` 을 내되, 그 직무의
   일반 결과(활성 분석 버전의 overall payload)를 함께 실어 화면이 빈 채로 서지
   않게 한다. 조용히 빈 배열을 반환하지 않는다(CONTRACT 7장).
3. **저장소는 `Protocol` 로 받는다.** `psycopg` 를 import 하지 않으며 단위 시험은
   가짜 저장소로 흐름 전체를 돌린다.

데모에서는 A10 이 넣은 샘플 세 건이 항상 적중하므로 온디맨드 경로에 닿지 않는다.
"""

from __future__ import annotations

from collections.abc import Callable, Iterator, Mapping
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Protocol

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from careersignal.domain.permissions import Component
from careersignal.pipelines.user_posting import (
    OUTPUT_TYPES,
    normalize_and_hash,
    user_posting_identifier,
)
from careersignal.repositories.base import unit_of_work
from careersignal.repositories.user_postings import (
    UserPostingRepository,
    UserPostingStore,
    select_analysis_set,
)

DETECTED_BY = "user_selected"
"""`user_postings.detected_by`. 직무는 사용자가 화면에서 고른 값이다."""

PRODUCED_BY_AGENT = "agent"
"""`user_posting_analyses.produced_by`. 시드가 넣은 행만 `seed` 다."""

SOURCE_CACHE = "cache"
SOURCE_AGENT = "agent"
SOURCE_STORED = "stored"
"""payload 의 `source` 값(CONTRACT 5장 B). `fixture` 는 더 쓰지 않는다."""


# ================================================================ 요청·응답
class UserPostingAnalyzeRequest(BaseModel):
    """Express 가 보내는 요청. 형태는 CONTRACT 6.3 이다."""

    model_config = ConfigDict(extra="forbid")

    content_hash: str = Field(min_length=64, max_length=64)
    normalized_text: str = Field(min_length=1)
    job_role_id: str = Field(min_length=1)


@dataclass(frozen=True, slots=True)
class AnalyzeOutcome:
    """라우터가 낼 응답 하나. 상태 부호와 본문을 함께 담는다.

    `HTTPException` 을 쓰지 않는다. 온디맨드 불가(503)는 오류 봉투와 직무 일반
    결과를 **같은 층에** 실어야 하는데, `HTTPException` 은 본문을 `detail` 아래로
    한 겹 밀어 넣어 화면이 보는 키가 달라진다. 시험도 이 값을 그대로 읽는다.
    """

    status_code: int
    body: dict[str, Any]

    @property
    def ok(self) -> bool:
        return self.status_code == 200


def _error(code: str, message: str) -> dict[str, Any]:
    """오류 봉투. 형태는 CONTRACT 7장의 `NO_ACTIVE_ANALYSIS` 와 같다."""
    return {"error": {"code": code, "message": message}}


# ================================================================ 온디맨드 포트
@dataclass(frozen=True, slots=True)
class OnDemandRequest:
    """체인 한 번의 입력. 어느 활성 버전을 기준 삼는지까지 담는다."""

    job_role_id: str
    user_posting_id: str
    content_hash: str
    normalized_text: str
    analysis_version: str
    taxonomy_version_id: str


class InterpretationPort(Protocol):
    """채용공고 해석. payload 는 CONTRACT 5장 B 다."""

    def run(self, request: OnDemandRequest) -> Mapping[str, Any]:
        ...


class StrategyPort(Protocol):
    """합격 전략. 해석 결과를 받는다. payload 는 CONTRACT 5장 C 다."""

    def run(
        self, request: OnDemandRequest, interpretation: Mapping[str, Any]
    ) -> Mapping[str, Any]:
        ...


class RoadmapPort(Protocol):
    """준비 로드맵. 해석과 전략을 받는다. payload 는 CONTRACT 5장 D 다."""

    def run(
        self,
        request: OnDemandRequest,
        interpretation: Mapping[str, Any],
        strategy: Mapping[str, Any],
    ) -> Mapping[str, Any]:
        ...


@dataclass(frozen=True, slots=True)
class OnDemandChain:
    """해석 → 전략 → 로드맵. 순서가 계약이다.

    전략은 해석의 편차를 받아 체크리스트를 짜고 로드맵은 그 체크리스트를 채운다.
    (CONTRACT 8장의 입력 열). 그래서 셋을 한꺼번에 던지지 않고 차례로 잇는다.

    세 포트가 모두 있어야 체인이 성립한다. 하나만 주입해 두면 화면의 세 탭 가운데
    하나만 차므로, 부분 주입을 허용하지 않고 `available` 이 셋을 함께 본다.

    **이 모듈은 모델을 부르지 않는다.** 포트의 구현은 에이전트 갈래가 낸다.
    """

    interpretation: InterpretationPort | None = None
    strategy: StrategyPort | None = None
    roadmap: RoadmapPort | None = None

    @property
    def available(self) -> bool:
        return None not in (self.interpretation, self.strategy, self.roadmap)

    def run(self, request: OnDemandRequest) -> dict[str, Any]:
        """세 payload 를 낸다. 포트가 비어 있으면 부르는 쪽이 먼저 걸러야 한다."""
        if not self.available:
            raise RuntimeError("온디맨드 포트가 주입되지 않았다")
        assert self.interpretation is not None
        assert self.strategy is not None
        assert self.roadmap is not None
        interpretation = dict(self.interpretation.run(request))
        strategy = dict(self.strategy.run(request, interpretation))
        roadmap = dict(self.roadmap.run(request, interpretation, strategy))
        return {
            "interpretation": interpretation,
            "strategy": strategy,
            "roadmap": roadmap,
        }


# ================================================================ 흐름
def _stamp(payload: Any, job_role_id: str, source: str) -> Any:
    """payload 의 `source` 와 `job` 을 응답 사실에 맞춘다.

    저장된 payload 는 만들어질 때의 값을 담고 있다. 같은 payload 가 캐시로 나갈
    때와 직무 일반 결과로 나갈 때 화면이 붙이는 꼬리표가 달라야 하므로, 내보내는
    자리에서 한 번 덮어쓴다. payload 를 제자리에서 고치지 않고 복사한다.
    """
    if not isinstance(payload, dict):
        return payload
    stamped = dict(payload)
    stamped["source"] = source
    stamped.setdefault("job", job_role_id)
    return stamped


def _response(
    job_role_id: str, matched: bool, source: str, payloads: Mapping[str, Any]
) -> dict[str, Any]:
    """응답 본문. 키 순서와 이름은 CONTRACT 6.3 이 정한다."""
    body: dict[str, Any] = {"job": job_role_id, "matched": matched, "source": source}
    for output_type in OUTPUT_TYPES:
        body[output_type] = _stamp(payloads.get(output_type), job_role_id, source)
    return body


def analyze_user_posting(
    request: UserPostingAnalyzeRequest,
    store: UserPostingStore,
    chain: OnDemandChain | None = None,
) -> AnalyzeOutcome:
    """CONTRACT 6.3 의 흐름 전체. 저장소와 체인은 주입받는다."""
    # 1. 받은 원문을 다시 정규화해 해시를 확인한다.
    recomputed = normalize_and_hash(request.normalized_text)
    if recomputed.content_hash != request.content_hash:
        return AnalyzeOutcome(
            400,
            _error(
                "CONTENT_HASH_MISMATCH",
                "normalized_text 를 다시 정규화한 해시가 content_hash 와 다르다",
            ),
        )

    content_hash = recomputed.content_hash

    # 2. 활성 분석 버전. 캐시가 어느 버전의 결과인지 가르고, 온디맨드의 기준이 되며,
    #    체인을 못 열 때 내보낼 직무 일반 결과의 출처이기도 하다.
    active = store.active_analysis(request.job_role_id)
    active_version = active["analysis_version"] if active else None

    # 3. 캐시 조회.
    posting = store.find_user_posting(content_hash)
    if posting is not None:
        rows = store.find_user_posting_analyses(posting["user_posting_id"])
        cached = select_analysis_set(rows, active_version)
        if cached is not None:
            job_role_id = posting["job_role_id"] or request.job_role_id
            return AnalyzeOutcome(
                200, _response(job_role_id, True, SOURCE_CACHE, cached)
            )

    # 4. 미적중. 여기부터는 활성 버전이 반드시 있어야 한다.
    if active is None:
        return AnalyzeOutcome(
            503,
            _error(
                "NO_ACTIVE_ANALYSIS",
                f"{request.job_role_id} 의 활성 분석 버전이 없다",
            )
            | _response(request.job_role_id, False, SOURCE_STORED, {}),
        )

    analysis_version = active["analysis_version"]
    taxonomy_version_id = active["taxonomy_version_id"]

    # 5. 온디맨드 포트가 없으면 직무 일반 결과를 대신 낸다.
    if chain is None or not chain.available:
        overall = store.overall_outputs(analysis_version)
        return AnalyzeOutcome(
            503,
            _error(
                "ONDEMAND_UNAVAILABLE",
                "온디맨드 분석 체인이 주입되지 않았다. 직무 일반 결과를 대신 낸다",
            )
            | _response(request.job_role_id, False, SOURCE_STORED, overall),
        )

    # 6. 체인 실행과 저장.
    on_demand = OnDemandRequest(
        job_role_id=request.job_role_id,
        user_posting_id=user_posting_identifier(content_hash),
        content_hash=content_hash,
        normalized_text=recomputed.normalized_text,
        analysis_version=analysis_version,
        taxonomy_version_id=taxonomy_version_id,
    )
    payloads = chain.run(on_demand)

    if posting is None:
        # 공고 등록은 체인을 연 오케스트레이터가 한다(0026 의 GRANT).
        # 결과 세 행은 종류를 만든 에이전트가 자기 role 로 각각 넣는다
        # (`repositories/user_postings.py` 의 저장소 갈래). 여기서 대신 넣으면
        # 한 role 이 두 표를 쓰게 되어 데이터베이스 권한과 어긋난다.
        store.add_user_posting(
            {
                "user_posting_id": on_demand.user_posting_id,
                "content_hash": content_hash,
                "normalized_text": recomputed.normalized_text,
                "char_length": recomputed.char_length,
                "job_role_id": request.job_role_id,
                "detected_by": DETECTED_BY,
            }
        )

    return AnalyzeOutcome(
        200, _response(request.job_role_id, False, SOURCE_AGENT, payloads)
    )


# ================================================================ 조립
StoreFactory = Callable[[], Any]
"""저장소 거래를 여는 컨텍스트 매니저 팩토리."""


@contextmanager
def _default_store() -> Iterator[UserPostingStore]:
    """기본 조립. 오케스트레이터 role 로 거래 하나를 연다."""
    with unit_of_work(Component.ORCHESTRATOR) as unit:
        yield UserPostingRepository(unit)


_store_factory: StoreFactory = _default_store
_chain: OnDemandChain | None = None


def configure(
    *, store_factory: StoreFactory | None = None, chain: OnDemandChain | None = None
) -> None:
    """저장소 팩토리와 온디맨드 체인을 갈아 끼운다.

    `api/__init__.py` 를 고치지 않고 조립을 바꿀 수 있는 자리다. 시험은 가짜
    저장소를, 배포는 에이전트 구현을 여기로 넣는다. `None` 을 주면 그 자리는
    바뀌지 않는다. 체인을 지우려면 `reset()` 을 쓴다.
    """
    global _store_factory, _chain
    if store_factory is not None:
        _store_factory = store_factory
    if chain is not None:
        _chain = chain


def reset() -> None:
    """기본 조립으로 되돌린다. 시험이 서로 새지 않게 한다."""
    global _store_factory, _chain
    _store_factory = _default_store
    _chain = None


router = APIRouter(tags=["user-posting"])
"""`api/__init__.py` 가 `try/except ImportError` 로 등록한다."""


@router.post("/postings/analyze")
def analyze(request: UserPostingAnalyzeRequest) -> JSONResponse:
    """사용자 입력 공고 한 건의 해석·전략·로드맵."""
    with _store_factory() as store:
        outcome = analyze_user_posting(request, store, _chain)
    return JSONResponse(status_code=outcome.status_code, content=outcome.body)
