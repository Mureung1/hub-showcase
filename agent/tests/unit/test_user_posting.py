"""사용자 공고 직접 입력 검증.

계약은 ``agent/data/demo_seed/CONTRACT.md`` 5·6·7장이고 흐름은
docs/architecture.md 11장이다.

데이터베이스에 접속하지 않는다. 저장소는 `Protocol` 이므로 가짜 저장소를 넣어
흐름 전체를 돌린다. 모델도 부르지 않는다. 온디맨드 포트 역시 대역이다.
"""

from __future__ import annotations

from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from careersignal.api import routes_user_posting as routes
from careersignal.api.routes_user_posting import (
    AnalyzeOutcome,
    OnDemandChain,
    OnDemandRequest,
    UserPostingAnalyzeRequest,
    analyze_user_posting,
)
from careersignal.pipelines.user_posting import (
    MAX_CHAR_LENGTH,
    MIN_CHAR_LENGTH,
    OUTPUT_TYPES,
    content_hash,
    normalize_and_hash,
    normalize_posting_text,
    user_analysis_identifier,
    user_posting_identifier,
)
from careersignal.repositories.user_postings import (
    ANALYSIS_REPOSITORY,
    ANALYSIS_WRITER_COMPONENT,
    InterpretationUserPostingRepository,
    RoadmapUserPostingRepository,
    StrategyUserPostingRepository,
    UserPostingRepository,
    select_analysis_set,
)
from careersignal.domain.permissions import Component

JOB = "backend"
ACTIVE_VERSION = "an_demo_backend"
TAXONOMY_VERSION = "tx_demo_backend"


# ---------------------------------------------------------------------------
# 대역
# ---------------------------------------------------------------------------
class FakeStore:
    """`UserPostingStore` 의 대역. 호출한 자리를 기록한다."""

    def __init__(
        self,
        *,
        postings: dict[str, dict[str, Any]] | None = None,
        analyses: dict[str, list[dict[str, Any]]] | None = None,
        active: dict[str, Any] | None = None,
        overall: dict[str, Any] | None = None,
    ) -> None:
        self.postings = postings or {}
        self.analyses = analyses or {}
        self.active = active
        self.overall = overall or {}
        self.saved: list[dict[str, Any]] = []

    def find_user_posting(self, content_hash: str) -> dict[str, Any] | None:
        return self.postings.get(content_hash)

    def find_user_posting_analyses(self, user_posting_id: str) -> list[dict[str, Any]]:
        return list(self.analyses.get(user_posting_id, []))

    def active_analysis(self, job_role_id: str) -> dict[str, Any] | None:
        return self.active

    def overall_outputs(self, analysis_version: str) -> dict[str, Any]:
        return dict(self.overall)

    def add_user_posting(self, values: dict[str, Any]) -> None:
        self.saved.append(values)
        self.postings[values["content_hash"]] = values


class FakeInterpretation:
    def __init__(self, log: list[str]) -> None:
        self.log = log

    def run(self, request: OnDemandRequest) -> dict[str, Any]:
        self.log.append("interpretation")
        return {"job": request.job_role_id, "baseline": [], "source": "stored"}


class FakeStrategy:
    def __init__(self, log: list[str]) -> None:
        self.log = log

    def run(self, request: OnDemandRequest, interpretation: dict[str, Any]) -> dict[str, Any]:
        self.log.append("strategy")
        assert "baseline" in interpretation, "전략은 해석 결과를 받아야 한다"
        return {"job": request.job_role_id, "checklist": [], "source": "stored"}

class FakeRoadmap:
    def __init__(self, log: list[str]) -> None:
        self.log = log

    def run(
        self,
        request: OnDemandRequest,
        interpretation: dict[str, Any],
        strategy: dict[str, Any],
    ) -> dict[str, Any]:
        self.log.append("roadmap")
        assert "checklist" in strategy, "로드맵은 전략 결과를 받아야 한다"
        return {"job": request.job_role_id, "project_steps": [], "source": "stored"}


def full_chain() -> tuple[OnDemandChain, list[str]]:
    log: list[str] = []
    return (
        OnDemandChain(
            interpretation=FakeInterpretation(log),
            strategy=FakeStrategy(log),
            roadmap=FakeRoadmap(log),
        ),
        log,
    )


# ---------------------------------------------------------------------------
# 표본
# ---------------------------------------------------------------------------
RAW = """  백엔드 개발자 채용

    주요 업무
    - Spring Boot 기반   API 개발
    - 문의: recruit@example.com  또는 02-1234-5678


    자격 요건
    - Java 3년 이상
"""


def sample_request(job: str = JOB, raw: str = RAW) -> UserPostingAnalyzeRequest:
    """정직한 요청 하나. 해시가 원문과 맞는다."""
    normalized = normalize_and_hash(raw)
    return UserPostingAnalyzeRequest(
        content_hash=normalized.content_hash,
        normalized_text=normalized.normalized_text,
        job_role_id=job,
    )


def cached_store(request: UserPostingAnalyzeRequest, version: str = ACTIVE_VERSION) -> FakeStore:
    """캐시가 적중하는 저장소."""
    up_id = user_posting_identifier(request.content_hash)
    return FakeStore(
        postings={
            request.content_hash: {
                "user_posting_id": up_id,
                "content_hash": request.content_hash,
                "normalized_text": request.normalized_text,
                "char_length": len(request.normalized_text),
                "job_role_id": JOB,
                "detected_by": "user_selected",
            }
        },
        analyses={
            up_id: [
                {
                    "user_analysis_id": user_analysis_identifier(request.content_hash, output_type),
                    "analysis_version": version,
                    "output_type": output_type,
                    "payload": {"job": JOB, "source": "cache", output_type: []},
                }
                for output_type in OUTPUT_TYPES
            ]
        },
        active={
            "analysis_version": ACTIVE_VERSION,
            "taxonomy_version_id": TAXONOMY_VERSION,
        },
    )


# ---------------------------------------------------------------------------
# 1. 정규화와 해시 (CONTRACT 6.2)
# ---------------------------------------------------------------------------
def test_normalize_matches_seed_rule() -> None:
    """시드 생성기와 규칙이 정확히 같다.

    한 글자라도 갈리면 시드가 넣은 해시와 서버가 계산한 해시가 달라지고 데모의
    세 건이 전부 미적중이 된다. 두 함수를 같은 입력으로 돌려 맞춘다.
    """
    from scripts.demo_seed._csv import normalize_posting_text as seed_normalize
    from scripts.demo_seed._csv import sha256_hex as seed_hash

    samples = [
        RAW,
        "a@b.co 문의\r\n\r\n\r\n둘\t셋   넷\r끝 ",
        "연락처 010-1234-5678 과 031 234 5678",
        "주민번호 900101-1234567 입니다",
        "한글가 정규화",  # 자모 분리형. NFC 가 접는다
        "",
        "   ",
    ]
    for sample in samples:
        assert normalize_posting_text(sample) == seed_normalize(sample)
        assert content_hash(normalize_posting_text(sample)) == seed_hash(seed_normalize(sample))


def test_normalize_applies_every_contract_rule() -> None:
    """CONTRACT 6.2 의 여덟 항목이 모두 걸린다."""
    normalized = normalize_posting_text(RAW)
    assert not normalized.startswith(" ") and not normalized.endswith(" ")  # 1
    assert "\r" not in normalized  # 2
    assert all(line == line.strip() for line in normalized.split("\n"))  # 3
    assert "\n\n\n" not in normalized  # 4
    assert "  " not in normalized  # 5
    assert "recruit@example.com" not in normalized  # 6 이메일
    assert "02-1234-5678" not in normalized  # 6 전화
    # 6 주민등록번호. 전화번호 패턴이 먼저 걸리는 자리가 있어 남는 조각의 모양은
    # 입력마다 다르지만, 번호가 온전히 남지는 않는다. 시드 규칙과 같은 순서다.
    assert "900101-1234567" not in normalize_posting_text("주민번호 900101-1234567 입니다")
    assert normalize_posting_text("주민번호 851212-1234567") == "주민번호"


def test_normalize_is_deterministic_and_idempotent() -> None:
    """같은 원문은 언제나 같은 값이고, 정규화 결과를 다시 정규화해도 그대로다.

    멱등이 아니면 서버의 재검증(요구 3)이 정직한 요청을 400 으로 떨어뜨린다.
    """
    once = normalize_posting_text(RAW)
    assert once == normalize_posting_text(RAW)
    assert once == normalize_posting_text(once)
    assert content_hash(once) == content_hash(normalize_posting_text(once))


def test_hash_and_identifier_shape() -> None:
    """식별자 형식은 CONTRACT 6.1 이다."""
    normalized = normalize_and_hash(RAW)
    assert len(normalized.content_hash) == 64
    assert int(normalized.content_hash, 16) >= 0  # hex 다
    assert normalized.user_posting_id == f"up_{normalized.content_hash[:16]}"
    assert (
        user_analysis_identifier(normalized.content_hash, "roadmap")
        == f"ua_{normalized.content_hash[:16]}_roadmap"
    )
    assert normalized.char_length == len(normalized.normalized_text)
    with pytest.raises(ValueError):
        user_analysis_identifier(normalized.content_hash, "statistics")


def test_length_bounds_follow_contract() -> None:
    assert (MIN_CHAR_LENGTH, MAX_CHAR_LENGTH) == (200, 12000)
    assert normalize_and_hash("가" * 500).length_ok
    assert not normalize_and_hash("짧다").length_ok


# ---------------------------------------------------------------------------
# 2. 요청 재검증 (요구 3)
# ---------------------------------------------------------------------------
def test_hash_mismatch_is_rejected() -> None:
    """받은 `normalized_text` 를 그대로 믿지 않는다."""
    request = UserPostingAnalyzeRequest(
        content_hash="0" * 64,
        normalized_text="백엔드 개발자 채용",
        job_role_id=JOB,
    )
    store = FakeStore()
    outcome = analyze_user_posting(request, store)
    assert outcome.status_code == 400
    assert outcome.body["error"]["code"] == "CONTENT_HASH_MISMATCH"
    assert store.saved == []


def test_unnormalized_text_with_matching_hash_is_rejected() -> None:
    """정규화되지 않은 원문의 해시를 그대로 보내면 걸린다.

    해시가 원문과 짝이 맞아도 정규화 규칙을 거치지 않았으면 캐시의 열쇠가 아니다.
    """
    raw = "백엔드   개발자\r\n\r\n\r\n채용 "
    request = UserPostingAnalyzeRequest(
        content_hash=content_hash(raw), normalized_text=raw, job_role_id=JOB
    )
    outcome = analyze_user_posting(request, FakeStore())
    assert outcome.status_code == 400


# ---------------------------------------------------------------------------
# 3. 캐시 적중 (CONTRACT 6.3)
# ---------------------------------------------------------------------------
def test_cache_hit_returns_stored_three() -> None:
    request = sample_request()
    store = cached_store(request)
    outcome = analyze_user_posting(request, store)

    assert outcome.status_code == 200
    body = outcome.body
    assert body["job"] == JOB
    assert body["matched"] is True
    assert body["source"] == "cache"
    assert set(body) == {"job", "matched", "source", *OUTPUT_TYPES}
    for output_type in OUTPUT_TYPES:
        assert body[output_type]["source"] == "cache"
        assert body[output_type]["job"] == JOB
    assert store.saved == [], "적중이면 아무것도 쓰지 않는다"


def test_cache_hit_does_not_call_the_chain() -> None:
    """적중이면 온디맨드 체인에 닿지 않는다. 데모가 이 경로다."""
    request = sample_request()
    chain, log = full_chain()
    outcome = analyze_user_posting(request, cached_store(request), chain)
    assert outcome.status_code == 200
    assert outcome.body["source"] == "cache"
    assert log == []


def test_incomplete_cache_is_not_a_hit() -> None:
    """세 종이 다 있어야 적중이다. 하나가 비면 화면의 탭 하나가 빈다."""
    request = sample_request()
    store = cached_store(request)
    up_id = user_posting_identifier(request.content_hash)
    store.analyses[up_id] = [
        row for row in store.analyses[up_id] if row["output_type"] != "roadmap"
    ]
    outcome = analyze_user_posting(request, store)
    assert outcome.status_code == 503
    assert outcome.body["error"]["code"] == "ONDEMAND_UNAVAILABLE"
    assert outcome.body["matched"] is False


def test_cache_uses_job_from_stored_posting() -> None:
    """직무는 저장된 공고의 값을 쓴다. 요청이 다른 직무를 말해도 결과가 흔들리지 않는다."""
    request = sample_request(job="frontend")
    store = cached_store(request)
    outcome = analyze_user_posting(request, store)
    assert outcome.body["job"] == JOB


# ---------------------------------------------------------------------------
# 4. 온디맨드 미주입 (요구 2)
# ---------------------------------------------------------------------------
def test_missing_chain_returns_503_with_overall_payloads() -> None:
    request = sample_request()
    store = FakeStore(
        active={
            "analysis_version": ACTIVE_VERSION,
            "taxonomy_version_id": TAXONOMY_VERSION,
        },
        overall={
            output_type: {"job": JOB, "source": "stored", output_type: []}
            for output_type in OUTPUT_TYPES
        },
    )
    outcome = analyze_user_posting(request, store, None)

    assert outcome.status_code == 503
    body = outcome.body
    assert body["error"] == {
        "code": "ONDEMAND_UNAVAILABLE",
        "message": body["error"]["message"],
    }
    assert body["matched"] is False
    assert body["source"] == "stored"
    for output_type in OUTPUT_TYPES:
        assert body[output_type] is not None
        assert body[output_type]["source"] == "stored"
    assert store.saved == [], "실행하지 못했으면 아무것도 쓰지 않는다"


def test_partial_chain_is_not_available() -> None:
    """포트 하나만 주입된 체인은 열지 않는다. 세 탭 가운데 하나만 차면 안 된다."""
    log: list[str] = []
    chain = OnDemandChain(interpretation=FakeInterpretation(log))
    assert chain.available is False
    outcome = analyze_user_posting(sample_request(), FakeStore(active={
        "analysis_version": ACTIVE_VERSION, "taxonomy_version_id": TAXONOMY_VERSION,
    }), chain)
    assert outcome.status_code == 503
    assert outcome.body["error"]["code"] == "ONDEMAND_UNAVAILABLE"
    assert log == []


def test_no_active_analysis_is_reported() -> None:
    """활성 버전이 없으면 조용히 빈 배열을 내지 않는다(CONTRACT 7장)."""
    outcome = analyze_user_posting(sample_request(), FakeStore(active=None))
    assert outcome.status_code == 503
    assert outcome.body["error"]["code"] == "NO_ACTIVE_ANALYSIS"
    assert outcome.body["interpretation"] is None


# ---------------------------------------------------------------------------
# 5. 온디맨드 실행 (요구 1)
# ---------------------------------------------------------------------------
def test_chain_runs_in_order_and_registers_posting() -> None:
    request = sample_request()
    store = FakeStore(
        active={
            "analysis_version": ACTIVE_VERSION,
            "taxonomy_version_id": TAXONOMY_VERSION,
        }
    )
    chain, log = full_chain()
    outcome = analyze_user_posting(request, store, chain)

    assert outcome.status_code == 200
    assert log == ["interpretation", "strategy", "roadmap"]
    body = outcome.body
    assert body["matched"] is False
    assert body["source"] == "agent"
    for output_type in OUTPUT_TYPES:
        assert body[output_type]["source"] == "agent"

    assert len(store.saved) == 1
    saved = store.saved[0]
    assert saved["user_posting_id"] == user_posting_identifier(request.content_hash)
    assert saved["content_hash"] == request.content_hash
    assert saved["char_length"] == len(request.normalized_text)
    assert saved["job_role_id"] == JOB
    assert saved["detected_by"] == "user_selected"


def test_known_posting_without_results_is_not_registered_twice() -> None:
    """공고는 있는데 결과가 없으면 체인만 돌리고 공고를 다시 넣지 않는다."""
    request = sample_request()
    store = cached_store(request)
    store.analyses.clear()
    chain, log = full_chain()
    outcome = analyze_user_posting(request, store, chain)
    assert outcome.status_code == 200
    assert log == ["interpretation", "strategy", "roadmap"]
    assert store.saved == []


def test_chain_receives_active_version() -> None:
    """온디맨드는 활성 버전을 기준 삼는다. 값만 전달하며 계보에 끼어들지 않는다."""
    seen: list[OnDemandRequest] = []

    class Capture:
        def run(self, request: OnDemandRequest, *rest: Any) -> dict[str, Any]:
            seen.append(request)
            return {"job": request.job_role_id, "baseline": [], "checklist": []}

    request = sample_request()
    chain = OnDemandChain(interpretation=Capture(), strategy=Capture(), roadmap=Capture())
    store = FakeStore(
        active={
            "analysis_version": ACTIVE_VERSION,
            "taxonomy_version_id": TAXONOMY_VERSION,
        }
    )
    analyze_user_posting(request, store, chain)
    assert seen[0].analysis_version == ACTIVE_VERSION
    assert seen[0].taxonomy_version_id == TAXONOMY_VERSION
    assert seen[0].content_hash == request.content_hash
    assert seen[0].user_posting_id == user_posting_identifier(request.content_hash)


def test_chain_refuses_to_run_when_ports_are_missing() -> None:
    with pytest.raises(RuntimeError):
        OnDemandChain().run(
            OnDemandRequest(JOB, "up_x", "0" * 64, "본문", ACTIVE_VERSION, TAXONOMY_VERSION)
        )


# ---------------------------------------------------------------------------
# 6. 한 벌 고르기
# ---------------------------------------------------------------------------
def _rows(version: str, output_types: tuple[str, ...] = OUTPUT_TYPES) -> list[dict[str, Any]]:
    return [
        {"analysis_version": version, "output_type": t, "payload": {"v": version, "t": t}}
        for t in output_types
    ]


def test_select_prefers_active_version() -> None:
    rows = _rows("an_old") + _rows(ACTIVE_VERSION)
    chosen = select_analysis_set(rows, ACTIVE_VERSION)
    assert chosen is not None
    assert {p["v"] for p in chosen.values()} == {ACTIVE_VERSION}


def test_select_falls_back_to_a_complete_older_set() -> None:
    """활성 버전에 한 벌이 없으면 온전한 옛 벌을 낸다. 화면을 비우지 않는다."""
    rows = _rows(ACTIVE_VERSION, ("interpretation",)) + _rows("an_old")
    chosen = select_analysis_set(rows, ACTIVE_VERSION)
    assert chosen is not None
    assert {p["v"] for p in chosen.values()} == {"an_old"}


def test_select_never_mixes_versions() -> None:
    """종류마다 다른 버전을 섞지 않는다. 섞이면 편차 번호가 서로 어긋난다."""
    rows = (
        _rows("an_a", ("interpretation",))
        + _rows("an_b", ("strategy",))
        + _rows("an_c", ("roadmap",))
    )
    assert select_analysis_set(rows, ACTIVE_VERSION) is None
    assert select_analysis_set([], None) is None


# ---------------------------------------------------------------------------
# 7. 저장소 경계
# ---------------------------------------------------------------------------
def test_repository_components_match_migration_grants() -> None:
    """0026 의 GRANT 배분과 클래스의 role 이 같다."""
    assert UserPostingRepository.component is Component.ORCHESTRATOR
    assert InterpretationUserPostingRepository.component is Component.AGENT_INTERPRET
    assert StrategyUserPostingRepository.component is Component.AGENT_STRATEGY
    assert RoadmapUserPostingRepository.component is Component.AGENT_ROADMAP
    for output_type, klass in ANALYSIS_REPOSITORY.items():
        assert klass.output_type == output_type
        assert klass.component is ANALYSIS_WRITER_COMPONENT[output_type]


def test_analysis_repository_refuses_other_output_types() -> None:
    """해석 저장소에 로드맵 행을 넣는 호출은 거래를 열기도 전에 막힌다."""
    writer = InterpretationUserPostingRepository.__new__(InterpretationUserPostingRepository)
    with pytest.raises(ValueError):
        writer.add_analysis({"output_type": "roadmap", "payload": {}})


def test_repository_does_not_import_psycopg_in_routes() -> None:
    """라우터는 저장소 구현을 알지 못한다."""
    import inspect

    source = inspect.getsource(routes)
    assert "import psycopg" not in source


# ---------------------------------------------------------------------------
# 8. 라우터
# ---------------------------------------------------------------------------
@pytest.fixture()
def client() -> Any:
    """`router` 만 얹은 최소 앱. `api/__init__.py` 를 건드리지 않는다."""
    app = FastAPI()
    app.include_router(routes.router)
    with TestClient(app) as test_client:
        yield test_client
    routes.reset()


def test_route_is_registered_at_contract_path() -> None:
    paths = {route.path for route in routes.router.routes}  # type: ignore[attr-defined]
    assert paths == {"/postings/analyze"}


def test_route_returns_cache_hit(client: Any) -> None:
    request = sample_request()
    store = cached_store(request)

    class Session:
        def __enter__(self) -> FakeStore:
            return store

        def __exit__(self, *exc: Any) -> bool:
            return False

    routes.configure(store_factory=Session)
    response = client.post("/postings/analyze", json=request.model_dump())
    assert response.status_code == 200
    body = response.json()
    assert body["matched"] is True and body["source"] == "cache"
    assert set(body) == {"job", "matched", "source", *OUTPUT_TYPES}


def test_route_returns_503_envelope(client: Any) -> None:
    """503 본문이 `detail` 아래로 밀려 들어가지 않는다."""
    request = sample_request()
    store = FakeStore(
        active={
            "analysis_version": ACTIVE_VERSION,
            "taxonomy_version_id": TAXONOMY_VERSION,
        },
        overall={"interpretation": {"job": JOB, "source": "stored"}},
    )

    class Session:
        def __enter__(self) -> FakeStore:
            return store

        def __exit__(self, *exc: Any) -> bool:
            return False

    routes.configure(store_factory=Session)
    response = client.post("/postings/analyze", json=request.model_dump())
    assert response.status_code == 503
    body = response.json()
    assert "detail" not in body
    assert body["error"]["code"] == "ONDEMAND_UNAVAILABLE"
    assert body["interpretation"]["source"] == "stored"
    assert body["strategy"] is None


def test_route_rejects_unknown_fields(client: Any) -> None:
    response = client.post(
        "/postings/analyze",
        json={
            "content_hash": "0" * 64,
            "normalized_text": "본문",
            "job_role_id": JOB,
            "raw_text": "보내면 안 되는 값",
        },
    )
    assert response.status_code == 422


def test_outcome_shape() -> None:
    assert AnalyzeOutcome(200, {}).ok
    assert not AnalyzeOutcome(503, {}).ok
