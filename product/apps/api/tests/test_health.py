from fastapi.testclient import TestClient

from localtwin_api.config import Settings
from localtwin_api.main import app, create_app


def test_health() -> None:
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_scene_routes_are_hidden_by_default() -> None:
    client = TestClient(create_app(Settings(_env_file=None)))

    assert client.get("/api/v1/scenes/toolchain").status_code == 404
    assert client.post("/api/v1/scenes/jobs").status_code == 404
    assert client.get("/api/v1/scenes/jobs/example").status_code == 404
    assert client.post("/api/v1/scenes/jobs/example/run").status_code == 404
    assert client.get("/api/v1/scenes/jobs/example/asset").status_code == 404
    assert all("/api/v1/scenes" not in path for path in client.get("/openapi.json").json()["paths"])
    assert client.get("/health").status_code == 200

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
