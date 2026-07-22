from pathlib import Path

from fastapi.testclient import TestClient

from localtwin_api.config import Settings
from localtwin_api.main import create_app
from localtwin_api.scene_pipeline import (
    SceneJobStore,
    approve_anonymized_asset,
    import_gaussian_asset,
)


def write_gaussian_ply(path: Path) -> None:
    path.write_bytes(
        b"ply\nformat binary_little_endian 1.0\n"
        b"element vertex 1\n"
        b"property float opacity\n"
        b"property float scale_0\n"
        b"property float rot_0\n"
        b"end_header\n"
        b"placeholder"
    )


def test_scene_asset_requires_approved_anonymized_job(tmp_path: Path, monkeypatch: object) -> None:
    source = tmp_path / "fixture.ply"
    root = tmp_path / "jobs"
    write_gaussian_ply(source)
    job = import_gaussian_asset(source, "fixture", root)
    monkeypatch.setattr("localtwin_api.routers.scenes.SceneJobStore", lambda: SceneJobStore(root))
    client = TestClient(create_app(Settings(_env_file=None, scene_api_enabled=True)))

    blocked = client.get(f"/api/v1/scenes/jobs/{job.id}/asset")

    assert blocked.status_code == 404
    approved = approve_anonymized_asset(SceneJobStore(root), job.id)
    accepted = client.get(f"/api/v1/scenes/jobs/{approved.id}/asset")

    assert accepted.status_code == 200
    assert accepted.content == source.read_bytes()
