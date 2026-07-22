import io
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from localtwin_api.config import Settings
from localtwin_api.main import create_app
from localtwin_api.scene_pipeline import (
    SceneJobStore,
    SceneResourceLimitError,
    claim_scene_execution,
    cleanup_expired_scene_jobs,
    enforce_scene_creation_limits,
    release_scene_execution,
    retry_scene_job,
)


def create_scene_client(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, **settings: object
) -> TestClient:
    root = tmp_path / "jobs"
    monkeypatch.setattr("localtwin_api.routers.scenes.SceneJobStore", lambda: SceneJobStore(root))
    return TestClient(create_app(Settings(_env_file=None, scene_api_enabled=True, **settings)))


def test_scene_upload_limit_returns_413_and_removes_partial_job(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    client = create_scene_client(tmp_path, monkeypatch, scene_upload_max_bytes=4)

    response = client.post(
        "/api/v1/scenes/jobs",
        data={"scene_name": "too big", "capture_type": "images", "auto_run": "false"},
        files=[("files", ("capture.jpg", io.BytesIO(b"12345"), "image/jpeg"))],
    )

    assert response.status_code == 413
    assert list((tmp_path / "jobs").glob("*")) == []


def test_scene_rate_limit_returns_429(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    root = tmp_path / "jobs"
    store = SceneJobStore(root)
    store.create("already requested", "images")
    client = create_scene_client(tmp_path, monkeypatch, scene_max_jobs_per_window=1)

    response = client.post(
        "/api/v1/scenes/jobs",
        data={"scene_name": "second", "capture_type": "images", "auto_run": "false"},
        files=[("files", ("capture.jpg", io.BytesIO(b"ok"), "image/jpeg"))],
    )

    assert response.status_code == 429


def test_duplicate_scene_retry_is_blocked(tmp_path: Path) -> None:
    store = SceneJobStore(tmp_path / "jobs")
    job = store.create("queued", "images")
    job.status = "queued"
    store.save(job)

    with pytest.raises(SceneResourceLimitError, match="already queued"):
        retry_scene_job(store, job.id, cooldown_seconds=0)


def test_scene_worker_concurrency_gate_releases_capacity() -> None:
    first = "00000000-0000-0000-0000-000000000001"
    second = "00000000-0000-0000-0000-000000000002"

    assert claim_scene_execution(first, max_workers=1) is True
    assert claim_scene_execution(second, max_workers=1) is False
    release_scene_execution(first)
    assert claim_scene_execution(second, max_workers=1) is True
    release_scene_execution(second)


def test_scene_creation_capacity_and_cleanup(tmp_path: Path) -> None:
    store = SceneJobStore(tmp_path / "jobs")
    job = store.create("old", "images")
    job.status = "ready"
    store.save(job)

    with pytest.raises(SceneResourceLimitError, match="rate limit"):
        enforce_scene_creation_limits(
            store,
            max_storage_bytes=1_000_000,
            rate_window_seconds=60 * 60 * 24 * 365,
            max_jobs_per_window=1,
            max_active_jobs=1,
        )

    removed = cleanup_expired_scene_jobs(
        store,
        retention_hours=72,
        now=datetime.now(UTC) + timedelta(hours=73),
    )

    assert removed == [job.id]
    assert not store.job_dir(job.id).exists()
