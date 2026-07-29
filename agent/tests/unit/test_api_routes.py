"""FastAPI 라우트 검증.

`fastapi.testclient` 와 가짜 저장소로 돌린다. 데이터베이스에도 네트워크에도 닿지
않으므로, 서빙 경로의 규칙(저장된 payload 를 그대로 낸다·폴백·빈 결과 거절·로드맵
재조합)을 실행 환경 없이 검사한다.

`deps.serving_repository` 하나만 갈아 끼운다. 거래를 여는 자리가 의존성 하나로
모여 있어서 그 자리를 대체하면 라우트 전체가 대역 위에서 돈다.
"""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from careersignal.agents.statistics.extractor import StubMentionExtractor
from careersignal.api import app
from careersignal.api.deps import (
    NO_ACTIVE_ANALYSIS,
    NO_EXTRACTOR,
    mention_extractor,
    serving_repository,
)
from careersignal.domain.permissions import Component
from careersignal.domain.scope import ScopeLevel
from careersignal.repositories.serving import (
    OUTPUT_INTERPRETATION,
    OUTPUT_ROADMAP,
    OUTPUT_STRATEGY,
    ServedOutput,
    ServingRepository,
)

JOB = "backend"
CLUSTER_ID = "cluster_fintech"
CLUSTER_NAME = "핀테크·금융"
POSTING_ID = "dp_backend_01"
VERSION = "an_demo_backend"


# ---------------------------------------------------------------- 대역
class FakeUnit:
    """`Unit` 의 대역. SQL 을 실행하지 않고 미리 심어 둔 행을 돌려준다.

    `rows` 의 키는 조회 이름이다. 문장을 파싱하지 않고 어느 조회인지만 가른다 —
    검사가 SQL 글자에 매이면 문장을 다듬을 때마다 검사가 깨진다.
    """

    component = Component.SERVING

    def __init__(
        self,
        active: str | None = VERSION,
        payloads: dict[tuple[str, str, str], dict[str, Any]] | None = None,
        clusters: dict[str, dict[str, Any]] | None = None,
        posting_cluster: dict[str, Any] | None = None,
    ) -> None:
        self.active = active
        self.payloads = payloads or {}
        self.clusters = clusters or {}
        self.posting_cluster = posting_cluster
        self.asked: list[tuple[str, str, str]] = []

    def fetch_value(self, sql: str, params: dict[str, Any] | None = None) -> Any:
        assert "active_analysis_versions" in sql
        return self.active

    def fetch_one(
        self, sql: str, params: dict[str, Any] | None = None
    ) -> dict[str, Any] | None:
        params = params or {}
        if "FROM analysis_outputs" in sql:
            key = (params["scope_level"], params["scope_id"], params["output_type"])
            self.asked.append(key)
            payload = self.payloads.get(key)
            return None if payload is None else {"payload": payload}
        if "FROM postings" in sql:
            return self.posting_cluster
        if "display_name = " in sql:
            return self.clusters.get(params["display_name"])
        if "cluster_id = " in sql:
            return self.clusters.get(params["cluster_id"])
        raise AssertionError(f"검사가 모르는 조회다: {sql}")


class FakeServing:
    """라우트에 주입하는 저장소 대역. `resolve` 하나만 흉내 낸다."""

    def __init__(self, served: ServedOutput | None) -> None:
        self.served = served
        self.calls: list[dict[str, Any]] = []

    def resolve(self, **kwargs: Any) -> ServedOutput | None:
        self.calls.append(kwargs)
        return self.served


def _client(
    served: ServedOutput | None, extractor: object | None = None
) -> tuple[TestClient, FakeServing]:
    fake = FakeServing(served)
    app.dependency_overrides[serving_repository] = lambda: fake
    app.dependency_overrides[mention_extractor] = lambda: extractor
    return TestClient(app), fake


@pytest.fixture(autouse=True)
def _clear_overrides() -> Any:
    yield
    app.dependency_overrides.clear()


# ---------------------------------------------------------------- payload 대역
def _interpretation_payload(scope: dict[str, Any]) -> dict[str, Any]:
    return {
        "job": JOB,
        "scope": scope,
        "baseline": [
            {
                "item_id": "cc_backend_crud-api",
                "title": "CRUD REST API 완성",
                "desc": "한 도메인을 배포까지 완성한 경험.",
                "freq_pct": 68,
                "required_ratio": 92,
            }
        ],
        "deviations": [],
        "unchanged": [],
        "posting": None,
        "agent_version": "1.0.0",
        "source": "stored",
    }


def _strategy_payload(scope: dict[str, Any]) -> dict[str, Any]:
    return {
        "job": JOB,
        "scope": scope,
        "checklist": [
            {
                "item_id": "cc_backend_crud-api",
                "title": "CRUD REST API 프로젝트",
                "subtitle": "배포까지 완성한 한 도메인",
                "reason": "baseline · 공고 68%",
                "evidence_needed": "배포 URL + README",
                "channels": ["portfolio"],
                "kind": "project",
                "is_deviation": False,
                "dev_n": None,
                "required": True,
                "have": False,
            }
        ],
        "portfolio": {"highlights": [], "intro_orders": []},
        "essay": [],
        "interview": [],
        "agent_version": "1.0.0",
        "source": "stored",
    }


def _step(n: int, item_id: str, priority: str = "vhigh") -> dict[str, Any]:
    return {
        "n": n,
        "phase": f"STEP {n:02d} · 3주",
        "weeks": 3,
        "priority": priority,
        "title": f"{item_id} 단계",
        "body": "본문",
        "deliverable": "산출물",
        "fills": [{"item_id": item_id, "label": item_id, "kind": "normal"}],
        "reason_title": "왜 이 순서인가요?",
        "reason": "근거",
        "tags": [],
    }


def _roadmap_payload(scope: dict[str, Any]) -> dict[str, Any]:
    return {
        "job": JOB,
        "scope": scope,
        "project_steps": [_step(1, "cc_backend_crud-api"), _step(2, "cc_backend_tx")],
        "study_tracks": [],
        "check_rows": [
            {
                "item_id": "cc_backend_crud-api",
                "title": "CRUD REST API",
                "kind": "project",
                "is_deviation": False,
                "dev_n": None,
                "required": True,
                "source_step": "STEP 01",
            },
            {
                "item_id": "cc_backend_tx",
                "title": "트랜잭션 심화",
                "kind": "project",
                "is_deviation": True,
                "dev_n": 1,
                "required": True,
                "source_step": "STEP 02",
            },
        ],
        "agent_version": "1.0.0",
        "source": "stored",
    }


OVERALL_SCOPE = {"level": "overall", "cluster_tag": None, "posting_id": None}
CLUSTER_SCOPE = {"level": "cluster", "cluster_tag": CLUSTER_NAME, "posting_id": None}


def _scope_body(level: str, **kw: Any) -> dict[str, Any]:
    body = {"level": level, "cluster_tag": None, "posting_id": None}
    body.update(kw)
    return body


# ================================================================ /health
def test_health_reports_the_service() -> None:
    client, _ = _client(None)
    assert client.get("/health").json() == {"status": "ok", "service": "agent"}


# ================================================================ /reverse
def test_reverse_returns_the_stored_payload() -> None:
    served = ServedOutput(
        payload=_interpretation_payload(OVERALL_SCOPE), level=ScopeLevel.OVERALL
    )
    client, fake = _client(served)

    response = client.post(
        "/reverse",
        json={"job": JOB, "scope": _scope_body("overall"), "items": [], "baseline": []},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "stored"
    assert body["baseline"][0]["item_id"] == "cc_backend_crud-api"
    assert fake.calls[0]["output_type"] == OUTPUT_INTERPRETATION


def test_reverse_does_not_read_the_request_items() -> None:
    """화면이 보낸 통계로 저장된 해석을 다시 계산하지 않는다."""
    served = ServedOutput(
        payload=_interpretation_payload(OVERALL_SCOPE), level=ScopeLevel.OVERALL
    )
    client, _ = _client(served)

    noisy = client.post(
        "/reverse",
        json={
            "job": JOB,
            "scope": _scope_body("overall"),
            "items": [{"item_id": "made-up", "name": "지어낸 항목"}],
            "baseline": [{"item_id": "made-up"}],
        },
    ).json()

    assert [item["item_id"] for item in noisy["baseline"]] == ["cc_backend_crud-api"]


def test_reverse_shows_the_fallback_in_the_scope() -> None:
    """공고 범위 요청이 기업군 행으로 떨어지면 응답의 범위가 그것을 말한다."""
    served = ServedOutput(
        payload=_interpretation_payload(CLUSTER_SCOPE),
        level=ScopeLevel.CLUSTER,
        cluster_tag=CLUSTER_NAME,
    )
    client, _ = _client(served)

    body = client.post(
        "/reverse",
        json={
            "job": JOB,
            "scope": _scope_body("posting", posting_id=POSTING_ID),
            "items": [],
            "baseline": [],
        },
    ).json()

    assert body["scope"] == {
        "level": "cluster",
        "cluster_tag": CLUSTER_NAME,
        "posting_id": None,
    }
    assert body["source"] == "stored"  # 폴백이 source 를 바꾸지 않는다
    assert set(body) == {
        "job",
        "scope",
        "baseline",
        "deviations",
        "unchanged",
        "posting",
        "agent_version",
        "source",
    }


def test_reverse_refuses_when_nothing_is_stored() -> None:
    client, _ = _client(None)

    response = client.post(
        "/reverse",
        json={"job": JOB, "scope": _scope_body("overall"), "items": [], "baseline": []},
    )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == NO_ACTIVE_ANALYSIS


# ================================================================ /conditions
def test_conditions_returns_the_stored_strategy() -> None:
    served = ServedOutput(
        payload=_strategy_payload(CLUSTER_SCOPE),
        level=ScopeLevel.CLUSTER,
        cluster_tag=CLUSTER_NAME,
    )
    client, fake = _client(served)

    body = client.post(
        "/conditions",
        json={
            "job": JOB,
            "scope": _scope_body("cluster", cluster_tag=CLUSTER_NAME),
            "reverse": {},
        },
    ).json()

    assert fake.calls[0]["output_type"] == OUTPUT_STRATEGY
    assert body["checklist"][0]["item_id"] == "cc_backend_crud-api"
    assert body["portfolio"] == {"highlights": [], "intro_orders": []}


def test_conditions_refuses_when_nothing_is_stored() -> None:
    client, _ = _client(None)

    response = client.post(
        "/conditions", json={"job": JOB, "scope": _scope_body("overall"), "reverse": {}}
    )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == NO_ACTIVE_ANALYSIS


# ================================================================ /roadmap
def _roadmap_body(checks: dict[str, bool]) -> dict[str, Any]:
    return {
        "job": JOB,
        "scope": _scope_body("overall"),
        "conditions": {},
        "checks": checks,
    }


def test_roadmap_without_checks_keeps_the_stored_order() -> None:
    served = ServedOutput(
        payload=_roadmap_payload(OVERALL_SCOPE), level=ScopeLevel.OVERALL
    )
    client, fake = _client(served)

    body = client.post("/roadmap", json=_roadmap_body({})).json()

    assert fake.calls[0]["output_type"] == OUTPUT_ROADMAP
    assert [step["title"] for step in body["project_steps"]] == [
        "cc_backend_crud-api 단계",
        "cc_backend_tx 단계",
    ]


def test_roadmap_recomposes_with_the_checks() -> None:
    """보유로 표시한 개념을 채우는 단계는 뒤로 밀리고 순위가 한 칸 내려간다."""
    served = ServedOutput(
        payload=_roadmap_payload(OVERALL_SCOPE), level=ScopeLevel.OVERALL
    )
    client, _ = _client(served)

    body = client.post(
        "/roadmap", json=_roadmap_body({"cc_backend_crud-api": True})
    ).json()

    steps = body["project_steps"]
    assert [step["title"] for step in steps] == [
        "cc_backend_tx 단계",
        "cc_backend_crud-api 단계",
    ]
    assert [step["n"] for step in steps] == [1, 2]
    assert steps[0]["phase"] == "STEP 01 · 3주"
    assert steps[1]["priority"] == "high"  # vhigh 에서 한 칸 내려간다
    rows = {row["item_id"]: row["source_step"] for row in body["check_rows"]}
    assert rows["cc_backend_crud-api"] == "보유"
    assert rows["cc_backend_tx"] == "STEP 01"


def test_roadmap_ignores_checks_that_are_false() -> None:
    served = ServedOutput(
        payload=_roadmap_payload(OVERALL_SCOPE), level=ScopeLevel.OVERALL
    )
    client, _ = _client(served)

    body = client.post(
        "/roadmap", json=_roadmap_body({"cc_backend_crud-api": False})
    ).json()

    assert body["project_steps"][0]["title"] == "cc_backend_crud-api 단계"


def test_roadmap_refuses_when_nothing_is_stored() -> None:
    client, _ = _client(None)

    response = client.post("/roadmap", json=_roadmap_body({}))

    assert response.status_code == 503
    assert response.json()["error"]["code"] == NO_ACTIVE_ANALYSIS


# ================================================================ /extract
def test_extract_refuses_without_an_extractor() -> None:
    client, _ = _client(None)

    response = client.post(
        "/extract", json={"posting_id": POSTING_ID, "raw_text": "- Java 개발 경험"}
    )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == NO_EXTRACTOR


def test_extract_uses_the_injected_port() -> None:
    extractor = StubMentionExtractor()
    client, _ = _client(None, extractor=extractor)

    body = client.post(
        "/extract",
        json={
            "posting_id": POSTING_ID,
            "raw_text": "- Java/Spring 서버 개발 경험\n- RDB 모델링 경험\n회사 소개",
        },
    ).json()

    assert [skill["name"] for skill in body["skills"]] == [
        "Java/Spring 서버 개발 경험",
        "RDB 모델링 경험",
    ]
    assert body["posting_id"] == POSTING_ID
    assert body["confidence"] == "low"  # 대역이 신뢰도를 적지 않는다
    assert body["out_of_role_tags"] == []
    assert len(extractor.calls) == 1  # 원문 한 벌을 한 번 넘긴다


def test_extract_keeps_korean_expressions_apart() -> None:
    """ASCII 낱말이 없는 표현끼리 같은 슬러그로 접히지 않는다."""
    client, _ = _client(None, extractor=StubMentionExtractor())

    body = client.post(
        "/extract",
        json={
            "posting_id": POSTING_ID,
            "raw_text": "- 대용량 트래픽 처리\n- 테스트 코드 작성",
        },
    ).json()

    slugs = [skill["slug"] for skill in body["skills"]]
    assert len(set(slugs)) == 2
    assert all(slugs)


# ================================================================ 저장소 폴백
def _serving(unit: FakeUnit) -> ServingRepository:
    return ServingRepository(unit)  # type: ignore[arg-type]


def test_repository_returns_the_requested_scope_first() -> None:
    payload = _interpretation_payload({"level": "posting"})
    unit = FakeUnit(
        payloads={("posting", POSTING_ID, OUTPUT_INTERPRETATION): payload}
    )

    served = _serving(unit).resolve(
        JOB, OUTPUT_INTERPRETATION, "posting", posting_id=POSTING_ID
    )

    assert served is not None
    assert served.level is ScopeLevel.POSTING
    assert served.posting_id == POSTING_ID


def test_repository_falls_from_posting_to_the_cluster() -> None:
    payload = _strategy_payload(CLUSTER_SCOPE)
    unit = FakeUnit(
        payloads={("cluster", CLUSTER_ID, OUTPUT_STRATEGY): payload},
        posting_cluster={"cluster_id": CLUSTER_ID, "display_name": CLUSTER_NAME},
    )

    served = _serving(unit).resolve(
        JOB, OUTPUT_STRATEGY, "posting", posting_id=POSTING_ID
    )

    assert served is not None
    assert served.level is ScopeLevel.CLUSTER
    assert served.cluster_tag == CLUSTER_NAME
    assert served.posting_id is None
    assert served.with_scope()["scope"] == {
        "level": "cluster",
        "cluster_tag": CLUSTER_NAME,
        "posting_id": None,
    }
    assert unit.asked[0] == ("posting", POSTING_ID, OUTPUT_STRATEGY)


def test_repository_falls_all_the_way_to_overall() -> None:
    payload = _strategy_payload(OVERALL_SCOPE)
    unit = FakeUnit(
        payloads={("overall", JOB, OUTPUT_STRATEGY): payload},
        posting_cluster=None,
    )

    served = _serving(unit).resolve(
        JOB, OUTPUT_STRATEGY, "posting", posting_id=POSTING_ID
    )

    assert served is not None
    assert served.level is ScopeLevel.OVERALL
    assert served.cluster_tag is None
    assert unit.asked == [
        ("posting", POSTING_ID, OUTPUT_STRATEGY),
        ("overall", JOB, OUTPUT_STRATEGY),
    ]


def test_repository_maps_the_cluster_display_name_to_its_id() -> None:
    payload = _strategy_payload(CLUSTER_SCOPE)
    unit = FakeUnit(
        payloads={("cluster", CLUSTER_ID, OUTPUT_STRATEGY): payload},
        clusters={
            CLUSTER_NAME: {"cluster_id": CLUSTER_ID, "display_name": CLUSTER_NAME}
        },
    )

    served = _serving(unit).resolve(
        JOB, OUTPUT_STRATEGY, "cluster", cluster_tag=CLUSTER_NAME
    )

    assert served is not None
    assert served.level is ScopeLevel.CLUSTER
    assert unit.asked[0] == ("cluster", CLUSTER_ID, OUTPUT_STRATEGY)


def test_repository_is_empty_without_an_active_version() -> None:
    unit = FakeUnit(active=None)

    assert _serving(unit).resolve(JOB, OUTPUT_INTERPRETATION, "overall") is None
    assert unit.asked == []


def test_repository_does_not_invent_a_payload() -> None:
    unit = FakeUnit(payloads={})

    assert _serving(unit).resolve(JOB, OUTPUT_ROADMAP, "overall") is None


def test_served_output_does_not_change_the_stored_payload() -> None:
    payload = _interpretation_payload(OVERALL_SCOPE)
    served = ServedOutput(payload=payload, level=ScopeLevel.CLUSTER, cluster_tag="X")

    served.with_scope()

    assert payload["scope"] == OVERALL_SCOPE


def test_serving_repository_refuses_another_component() -> None:
    """서빙 저장소는 서빙 거래에서만 선다."""

    class OtherUnit(FakeUnit):
        component = Component.AGENT_INTERPRET

    with pytest.raises(PermissionError):
        ServingRepository(OtherUnit())  # type: ignore[arg-type]
