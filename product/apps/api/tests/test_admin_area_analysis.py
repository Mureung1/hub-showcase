from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from test_database import alembic_config

from alembic import command
from localtwin_api.config import Settings
from localtwin_api.database import create_database_engine, create_session_factory
from localtwin_api.db_models import (
    AdminAreaBusinessMetric,
    AdminAreaPopulation,
    DataSource,
    Market,
    MarketAdminAreaCrosswalk,
    MarketPopulationMetric,
)
from localtwin_api.main import create_app


def test_admin_area_background_returns_ranked_kosis_values(tmp_path: Path) -> None:
    database_url = f"sqlite:///{tmp_path / 'analysis.db'}"
    command.upgrade(alembic_config(database_url), "head")
    engine = create_database_engine(database_url, require_postgresql=False)
    factory = create_session_factory(engine)
    with Session(engine) as session:
        session.add_all(
            [
                DataSource(
                    snapshot_id="population-source",
                    provider="KOSIS",
                    dataset="population",
                    source_type="official",
                    source_url="https://kosis.kr/population",
                    collected_at="2026-07-16T00:00:00Z",
                    period="202512",
                    row_count=3,
                    sha256="0" * 64,
                    raw_path="data/raw/population.json",
                ),
                DataSource(
                    snapshot_id="business-source",
                    provider="KOSIS",
                    dataset="business",
                    source_type="official",
                    source_url="https://kosis.kr/business",
                    collected_at="2026-07-16T00:00:00Z",
                    period="2024",
                    row_count=3,
                    sha256="1" * 64,
                    raw_path="data/raw/business.xlsx",
                ),
            ]
        )
        for index, (market_id, area_code, area_name, population, stores, workers) in enumerate(
            (
                ("3110562", "A1", "연남동", 13000, 3000, 9000),
                ("3120103", "A2", "서교동", 23000, 13000, 62000),
                ("3120101", "A3", "합정동", 15000, 3800, 14000),
            )
        ):
            session.add(
                Market(
                    market_code=market_id,
                    market_name=area_name,
                    market_type_code="A",
                    market_type_name="골목상권",
                    district_code="11440",
                    district_name="마포구",
                    admin_dong_code=area_code,
                    admin_dong_name=area_name,
                    source_x=None,
                    source_y=None,
                    coordinate_system="EPSG:5181",
                    area_sqm=1000 + index,
                    source_snapshot_id="population-source",
                )
            )
            session.add(
                MarketAdminAreaCrosswalk(
                    market_code=market_id,
                    admin_area_code=area_code,
                    admin_area_name=area_name,
                    mapping_method="reference-only",
                    mapping_version="v1",
                    boundary_note="상권 경계와 행정동 경계는 다릅니다.",
                )
            )
            session.add(
                AdminAreaPopulation(
                    admin_area_code=area_code,
                    period="202512",
                    age_group_code="0",
                    admin_area_name=area_name,
                    age_group_name="계",
                    total_population=population,
                    male_population=population // 2,
                    female_population=population - population // 2,
                    source_snapshot_id="population-source",
                )
            )
            session.add(
                AdminAreaBusinessMetric(
                    admin_area_code=area_code,
                    period="2024",
                    industry_code="TOTAL",
                    admin_area_name=area_name,
                    source_admin_area_code=area_code,
                    industry_name="전산업",
                    business_count=stores,
                    worker_count=workers,
                    male_worker_count=None,
                    female_worker_count=None,
                    is_suppressed=False,
                    source_snapshot_id="business-source",
                )
            )
            session.add(
                MarketPopulationMetric(
                    market_code=market_id,
                    period="20251",
                    market_name=area_name,
                    resident_population=population // 5,
                    worker_population=workers // 2,
                    household_count=population // 10,
                    resident_source_snapshot_id="population-source",
                    worker_source_snapshot_id="business-source",
                )
            )
        session.commit()

    client = TestClient(create_app(Settings(_env_file=None), search_session_factory=factory))
    response = client.get("/api/v1/markets/3110562/admin-area-background")

    assert response.status_code == 200
    payload = response.json()
    assert payload["admin_area_name"] == "연남동"
    assert payload["resident_population"]["value"] == 13000
    assert payload["resident_population"]["rank"] == 3
    assert payload["market_resident_population"]["value"] == 2600
    assert payload["market_resident_density"]["unit"] == "명/km²"
    assert payload["market_resident_density"]["peer_count"] == 3
    assert payload["workers"]["rank"] == 3
    assert {item["geography"] for item in payload["evidence"]} == {
        "market",
        "administrative_area",
    }

    missing = client.get("/api/v1/markets/unknown/admin-area-background")
    assert missing.status_code == 404
    engine.dispose()
