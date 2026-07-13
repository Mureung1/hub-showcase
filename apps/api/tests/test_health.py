from fastapi.testclient import TestClient

from localtwin_api.main import app


def test_health() -> None:
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_scene_toolchain_contract() -> None:
    response = TestClient(app).get("/api/v1/scenes/toolchain")

    assert response.status_code == 200
    payload = response.json()
    assert "ready" in payload
    assert "minimum_gpu_memory_mb" in payload
    assert {tool["name"] for tool in payload["tools"]} >= {"ffmpeg", "ns-train", "ns-export"}
