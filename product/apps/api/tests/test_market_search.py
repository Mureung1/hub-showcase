from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from test_database import alembic_config

from alembic import command
from localtwin_api.config import Settings
from localtwin_api.database import create_database_engine, create_session_factory
from localtwin_api.db_models import (
    DataSource,
    Market,
    MarketGeometry,
    StoreMarketLink,
    StorePoint,
)
from localtwin_api.main import create_app
from localtwin_api.market_search import MarketSearchResult, rank_results


@pytest.fixture
def search_client(tmp_path: Path):
    database_url = f"sqlite:///{tmp_path / 'search.db'}"
    command.upgrade(alembic_config(database_url), "head")
    engine = create_database_engine(database_url, require_postgresql=False)
    factory = create_session_factory(engine)
    with Session(engine) as session:
        session.add(
            DataSource(
                snapshot_id="source-1",
                provider="test",
                dataset="search",
                source_type="official",
                source_url="https://example.test/search",
                collected_at="2026-07-16T00:00:00Z",
                period="202603",
                row_count=3,
                sha256="0" * 64,
                raw_path="data/raw/search.csv",
            )
        )
        for market_code, market_name, longitude in (
            ("3110562", "연트럴파크", 126.9257),
            ("OUTSIDE", "검색 제외 상권", 127.0),
        ):
            session.add(
                Market(
                    market_code=market_code,
                    market_name=market_name,
                    market_type_code="A",
                    market_type_name="골목상권",
                    district_code="11440",
                    district_name="마포구",
                    admin_dong_code="A1",
                    admin_dong_name="연남동",
                    source_x=None,
                    source_y=None,
                    coordinate_system="EPSG:5181",
                    area_sqm=1000,
                    source_snapshot_id="source-1",
                )
            )
            session.add(
                MarketGeometry(
                    market_code=market_code,
                    geometry_geojson='{"type":"Polygon","coordinates":[]}',
                    center_longitude=longitude,
                    center_latitude=37.5661,
                    source_crs="EPSG:5181",
                    target_crs="EPSG:4326",
                    source_snapshot_id="source-1",
                )
            )
        for store_id, name, address, category, market_code in (
            ("S1", "연남 테스트 카페", "서울 마포구 동교로 1", "카페", "3110562"),
            ("S2", "검색 제외 점포", "서울 종로구 테스트로", "카페", "OUTSIDE"),
        ):
            session.add(
                StorePoint(
                    store_id=store_id,
                    name=name,
                    branch_name=None,
                    category_large_code="I2",
                    category_large_name="음식",
                    category_middle_code="I212",
                    category_middle_name="비알코올",
                    category_small_code="I21201",
                    category_small_name=category,
                    road_address=address,
                    longitude=126.926,
                    latitude=37.566,
                    coordinate_system="EPSG:4326",
                    source_snapshot_id="source-1",
                )
            )
            session.add(
                StoreMarketLink(
                    store_id=store_id,
                    market_code=market_code,
                    link_method="point_in_polygon",
                    is_boundary=False,
                    source_snapshot_id="source-1",
                )
            )
        session.commit()
    client = TestClient(create_app(Settings(_env_file=None), search_session_factory=factory))
    yield client
    engine.dispose()


@pytest.mark.parametrize("query", ["연남 테스트", "동교로 1", "카페"])
def test_search_finds_store_by_name_address_and_category(
    search_client: TestClient, query: str
) -> None:
    response = search_client.get("/api/v1/search", params={"query": query})

    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["result_type"] == "store"
    assert result["id"] == "S1"
    assert result["market_id"] == "3110562"
    assert result["longitude"] == 126.926


def test_search_finds_supported_market_and_excludes_other_markets(
    search_client: TestClient,
) -> None:
    supported = search_client.get("/api/v1/search", params={"query": "연트럴"})
    excluded = search_client.get("/api/v1/search", params={"query": "검색 제외"})

    assert supported.status_code == 200
    assert supported.json()["results"][0]["id"] == "3110562"
    assert excluded.status_code == 200
    assert excluded.json()["results"] == []


def test_search_distinguishes_blank_query_and_empty_results(search_client: TestClient) -> None:
    blank = search_client.get("/api/v1/search", params={"query": "   "})
    empty = search_client.get("/api/v1/search", params={"query": "없는 결과"})

    assert blank.status_code == 422
    assert empty.status_code == 200
    assert empty.json() == {"query": "없는 결과", "results": []}


def test_search_bounds_inputs_and_treats_wildcards_as_text(search_client: TestClient) -> None:
    too_many = search_client.get("/api/v1/search", params={"query": "연남", "limit": 21})
    wildcard = search_client.get("/api/v1/search", params={"query": "%"})

    assert too_many.status_code == 422
    assert wildcard.status_code == 200
    assert wildcard.json()["results"] == []


def test_search_failure_returns_generic_error_without_database_details(tmp_path: Path) -> None:
    engine = create_database_engine(
        f"sqlite:///{tmp_path / 'missing-schema.db'}", require_postgresql=False
    )
    client = TestClient(
        create_app(
            Settings(_env_file=None),
            search_session_factory=create_session_factory(engine),
        )
    )

    response = client.get("/api/v1/search", params={"query": "연남"})

    assert response.status_code == 503
    assert response.json() == {"detail": "Search service is unavailable."}
    assert "sqlite" not in response.text.lower()
    engine.dispose()


def test_rank_results_is_database_independent_and_prefers_exact_market_matches() -> None:
    results = [
        MarketSearchResult(
            result_type="store",
            id="store-1",
            name="연남 카페",
            address=None,
            category_code=None,
            category_name=None,
            longitude=126.9,
            latitude=37.5,
            market_id="3110562",
            market_name="연남",
        ),
        MarketSearchResult(
            result_type="market",
            id="market-1",
            name="연남",
            address=None,
            category_code=None,
            category_name=None,
            longitude=126.9,
            latitude=37.5,
            market_id="market-1",
            market_name="연남",
        ),
    ]

    ranked_ids = [result.id for result in rank_results(results, "연남", limit=10)]

    assert ranked_ids == ["market-1", "store-1"]
