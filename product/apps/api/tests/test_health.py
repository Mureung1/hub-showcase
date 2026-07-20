from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from test_database import alembic_config

from alembic import command
from localtwin_api.config import Settings
from localtwin_api.database import create_database_engine, create_session_factory
from localtwin_api.db_models import DataSource, Market
from localtwin_api.main import app, create_app


def test_health() -> None:
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_rejects_a_missing_database_configuration() -> None:
    response = TestClient(create_app(Settings(_env_file=None))).get("/ready")

    assert response.status_code == 503
    assert response.json() == {"detail": "Service is not ready."}


def test_readiness_requires_a_seeded_canonical_market(tmp_path: Path) -> None:
    database_url = f"sqlite:///{tmp_path / 'readiness.db'}"
    command.upgrade(alembic_config(database_url), "head")
    engine = create_database_engine(database_url, require_postgresql=False)
    factory = create_session_factory(engine)
    client = TestClient(create_app(Settings(_env_file=None), search_session_factory=factory))

    assert client.get("/ready").status_code == 503

    with Session(engine) as session:
        session.add(
            DataSource(
                snapshot_id="source-ready",
                provider="test",
                dataset="readiness",
                source_type="official",
                source_url="https://example.test/readiness",
                collected_at="2026-07-16T00:00:00Z",
                period="20251",
                row_count=1,
                sha256="0" * 64,
                raw_path="data/raw/readiness.csv",
            )
        )
        session.add(
            Market(
                market_code="3110562",
                market_name="연남 테스트 상권",
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
                source_snapshot_id="source-ready",
            )
        )
        session.commit()

    response = client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}
    engine.dispose()


def test_production_cors_allows_server_origin_and_rejects_local_origin() -> None:
    settings = Settings(
        _env_file=None,
        environment="production",
        cors_origins_server="https://localtwin-product.vercel.app",
    )
    client = TestClient(create_app(settings))
    headers = {"Access-Control-Request-Method": "GET"}

    server_response = client.options(
        "/health",
        headers={**headers, "Origin": "https://localtwin-product.vercel.app"},
    )
    local_response = client.options(
        "/health",
        headers={**headers, "Origin": "http://localhost:5173"},
    )

    assert server_response.headers["access-control-allow-origin"] == (
        "https://localtwin-product.vercel.app"
    )
    assert "access-control-allow-origin" not in local_response.headers


def test_scene_routes_are_hidden_by_default() -> None:
    client = TestClient(create_app(Settings(_env_file=None)))

    assert client.get("/api/v1/scenes/toolchain").status_code == 404
    assert client.post("/api/v1/scenes/jobs").status_code == 404
    assert client.get("/api/v1/scenes/jobs/example").status_code == 404
    assert client.post("/api/v1/scenes/jobs/example/run").status_code == 404
    assert client.get("/api/v1/scenes/jobs/example/asset").status_code == 404
    assert all("/api/v1/scenes" not in path for path in client.get("/openapi.json").json()["paths"])
    assert client.get("/health").status_code == 200
    assert client.get("/ready").status_code == 503

    paths = client.get("/openapi.json").json()["paths"]
    assert "/api/v1/scores/evaluate" in paths
    assert "/api/v1/markets/{market_id}" in paths


def test_scene_toolchain_contract_when_enabled() -> None:
    settings = Settings(_env_file=None, scene_api_enabled=True)
    response = TestClient(create_app(settings)).get("/api/v1/scenes/toolchain")

    assert response.status_code == 200
    payload = response.json()
    assert "ready" in payload
    assert "minimum_gpu_memory_mb" in payload
    assert {tool["name"] for tool in payload["tools"]} >= {"ffmpeg", "ns-train", "ns-export"}
