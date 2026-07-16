import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from test_database import alembic_config

from alembic import command
from localtwin_api.config import Settings
from localtwin_api.database import create_database_engine, create_session_factory
from localtwin_api.db_models import DataSource, Market, MarketGeometry, StorePoint
from localtwin_api.main import create_app
from localtwin_api.nearby_search import haversine_distance_meters

CENTER_LONGITUDE = 126.9257
CENTER_LATITUDE = 37.5661


@pytest.fixture
def nearby_client(tmp_path: Path):
    database_url = f"sqlite:///{tmp_path / 'nearby.db'}"
    command.upgrade(alembic_config(database_url), "head")
    engine = create_database_engine(database_url, require_postgresql=False)
    factory = create_session_factory(engine)
    polygon = {
        "type": "Polygon",
        "coordinates": [
            [
                [126.91, 37.55],
                [126.94, 37.55],
                [126.94, 37.58],
                [126.91, 37.58],
                [126.91, 37.55],
            ]
        ],
    }
    with Session(engine) as session:
        session.add(
            DataSource(
                snapshot_id="source-nearby",
                provider="test",
                dataset="nearby",
                source_type="official",
                source_url="https://example.test/nearby",
                collected_at="2026-07-16T00:00:00Z",
                period="202603",
                row_count=4,
                sha256="0" * 64,
                raw_path="data/raw/nearby.csv",
            )
        )
        session.add(
            Market(
                market_code="3110562",
                market_name="연트럴파크",
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
                source_snapshot_id="source-nearby",
            )
        )
        session.add(
            MarketGeometry(
                market_code="3110562",
                geometry_geojson=json.dumps(polygon),
                center_longitude=CENTER_LONGITUDE,
                center_latitude=CENTER_LATITUDE,
                source_crs="EPSG:5181",
                target_crs="EPSG:4326",
                source_snapshot_id="source-nearby",
            )
        )
        for store_id, name, category, longitude, latitude in (
            ("S0", "중심 카페", "카페", CENTER_LONGITUDE, CENTER_LATITUDE),
            ("S1", "가까운 카페", "카페", CENTER_LONGITUDE + 0.0005, CENTER_LATITUDE),
            ("S2", "도보 빵집", "빵/도넛", CENTER_LONGITUDE + 0.002, CENTER_LATITUDE),
            ("S3", "먼 점포", "편의점", CENTER_LONGITUDE + 0.006, CENTER_LATITUDE),
        ):
            session.add(
                StorePoint(
                    store_id=store_id,
                    name=name,
                    branch_name=None,
                    category_large_code="I2",
                    category_large_name="음식",
                    category_middle_code="I21",
                    category_middle_name="음식점",
                    category_small_code=f"C-{store_id}",
                    category_small_name=category,
                    road_address="서울 마포구 테스트로",
                    longitude=longitude,
                    latitude=latitude,
                    coordinate_system="EPSG:4326",
                    source_snapshot_id="source-nearby",
                )
            )
        session.commit()
    client = TestClient(create_app(Settings(_env_file=None), search_session_factory=factory))
    yield client
    engine.dispose()


def test_nearby_query_returns_stable_distance_order_and_counts(
    nearby_client: TestClient,
) -> None:
    response = nearby_client.get(
        "/api/v1/stores/nearby",
        params={
            "longitude": CENTER_LONGITUDE,
            "latitude": CENTER_LATITUDE,
            "radius": 300,
            "category": "카페",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["market_id"] == "3110562"
    assert payload["total_count"] == 3
    assert payload["same_category_count"] == 2
    assert payload["returned_count"] == 3
    assert payload["truncated"] is False
    assert [store["id"] for store in payload["stores"]] == ["S0", "S1", "S2"]
    assert payload["stores"][0]["distance_meters"] == 0
    assert payload["aggregation_scope"] == "radius"
    assert payload["evidence"] == [
        {
            "source_snapshot_id": "source-nearby",
            "provider": "test",
            "dataset": "nearby",
            "source_url": "https://example.test/nearby",
            "period": "202603",
            "collected_at": "2026-07-16T00:00:00Z",
        }
    ]
    assert payload["category_coverage"] == {
        "status": "full",
        "requested_category": "카페",
        "analysis_category": "카페",
        "available_metrics": [
            "store_points",
            "competition",
            "market_stores",
            "sales",
            "flow",
            "score",
        ],
        "unavailable_metrics": [],
        "reason": "선택 업종은 현재 상권 분석 지표를 모두 지원합니다.",
    }


def test_nearby_query_changes_with_radius(nearby_client: TestClient) -> None:
    parameters = {"longitude": CENTER_LONGITUDE, "latitude": CENTER_LATITUDE}

    near = nearby_client.get("/api/v1/stores/nearby", params=parameters | {"radius": 100})
    wide = nearby_client.get("/api/v1/stores/nearby", params=parameters | {"radius": 500})

    assert near.status_code == 200
    assert wide.status_code == 200
    assert near.json()["total_count"] == 2
    assert wide.json()["total_count"] == 3


def test_nearby_query_maps_product_categories_to_official_category_names(
    nearby_client: TestClient,
) -> None:
    response = nearby_client.get(
        "/api/v1/stores/nearby",
        params={
            "longitude": CENTER_LONGITUDE,
            "latitude": CENTER_LATITUDE,
            "radius": 300,
            "category": "베이커리",
        },
    )

    assert response.status_code == 200
    assert response.json()["same_category_count"] == 1
    assert response.json()["category_coverage"]["status"] == "full"


def test_nearby_query_marks_a_specific_store_category_as_partial(
    nearby_client: TestClient,
) -> None:
    response = nearby_client.get(
        "/api/v1/stores/nearby",
        params={
            "longitude": CENTER_LONGITUDE,
            "latitude": CENTER_LATITUDE,
            "radius": 300,
            "category": "빵/도넛",
        },
    )

    assert response.status_code == 200
    assert response.json()["same_category_count"] == 1
    assert response.json()["category_coverage"] == {
        "status": "partial",
        "requested_category": "빵/도넛",
        "analysis_category": "베이커리",
        "available_metrics": ["store_points", "competition"],
        "unavailable_metrics": ["market_stores", "sales", "flow", "score"],
        "reason": "해당 세부 업종은 점포 위치와 반경 경쟁 지표만 제공합니다.",
    }


def test_nearby_query_rejects_invalid_radius_and_unsupported_center(
    nearby_client: TestClient,
) -> None:
    invalid_radius = nearby_client.get(
        "/api/v1/stores/nearby",
        params={"longitude": CENTER_LONGITUDE, "latitude": CENTER_LATITUDE, "radius": 1000},
    )
    unsupported = nearby_client.get(
        "/api/v1/stores/nearby",
        params={"longitude": 127.1, "latitude": 37.4, "radius": 300},
    )

    assert invalid_radius.status_code == 422
    assert unsupported.status_code == 422
    assert unsupported.json() == {"detail": "Analysis center is outside the supported area."}


def test_nearby_query_returns_an_explicit_empty_result(nearby_client: TestClient) -> None:
    response = nearby_client.get(
        "/api/v1/stores/nearby",
        params={"longitude": 126.911, "latitude": 37.551, "radius": 100},
    )

    assert response.status_code == 200
    assert response.json()["total_count"] == 0
    assert response.json()["stores"] == []


def test_haversine_includes_an_exact_radius_boundary() -> None:
    longitude_delta = 100 / (111_195 * 0.792)
    distance = haversine_distance_meters(
        CENTER_LONGITUDE,
        CENTER_LATITUDE,
        CENTER_LONGITUDE + longitude_delta,
        CENTER_LATITUDE,
    )

    assert distance == pytest.approx(100, abs=0.5)


def test_nearby_failure_is_generic(tmp_path: Path) -> None:
    engine = create_database_engine(
        f"sqlite:///{tmp_path / 'missing-nearby-schema.db'}", require_postgresql=False
    )
    client = TestClient(
        create_app(
            Settings(_env_file=None),
            search_session_factory=create_session_factory(engine),
        )
    )

    response = client.get(
        "/api/v1/stores/nearby",
        params={"longitude": CENTER_LONGITUDE, "latitude": CENTER_LATITUDE, "radius": 300},
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Nearby analysis service is unavailable."}
    assert "sqlite" not in response.text.lower()
    engine.dispose()
