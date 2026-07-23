import asyncio
import io
import subprocess
from pathlib import Path

import pytest
from fastapi import UploadFile
from fastapi.testclient import TestClient

from localtwin_api.config import Settings
from localtwin_api.main import create_app
from localtwin_api.scene_pipeline import (
    SceneJobStore,
    probe_video_file,
    save_uploads,
    validate_capture_content,
)


def create_scene_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    root = tmp_path / "jobs"
    monkeypatch.setattr("localtwin_api.routers.scenes.SceneJobStore", lambda: SceneJobStore(root))
    return TestClient(create_app(Settings(_env_file=None, scene_api_enabled=True)))


def test_renamed_text_jpg_returns_422(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    client = create_scene_client(tmp_path, monkeypatch)

    response = client.post(
        "/api/v1/scenes/jobs",
        data={"scene_name": "fake image", "capture_type": "images", "auto_run": "false"},
        files=[("files", ("fake.jpg", io.BytesIO(b"not a jpeg"), "image/jpeg"))],
    )

    assert response.status_code == 422
    assert list((tmp_path / "jobs").glob("*")) == []


def test_jpeg_signature_fixture_is_accepted(tmp_path: Path) -> None:
    store = SceneJobStore(tmp_path / "jobs")
    job = store.create("valid image", "images")

    saved = asyncio.run(
        save_uploads(
            store,
            job,
            [UploadFile(filename="capture.jpg", file=io.BytesIO(b"\xff\xd8\xfffixture"))],
        )
    )

    assert saved.files[0].name == "001-capture.jpg"


def test_invalid_video_and_truncated_ply_are_rejected_before_worker(tmp_path: Path) -> None:
    video = tmp_path / "fake.mp4"
    video.write_bytes(b"not a video")
    truncated_ply = tmp_path / "truncated.ply"
    truncated_ply.write_bytes(
        b"ply\nformat binary_little_endian 1.0\n"
        b"element vertex 2\n"
        b"property float opacity\n"
        b"property float scale_0\n"
        b"property float rot_0\n"
        b"end_header\n" + b"\x00" * 16
    )

    with pytest.raises(ValueError, match="does not match"):
        validate_capture_content(video, "video")
    with pytest.raises(ValueError, match="shorter"):
        validate_capture_content(truncated_ply, "gaussian_ply")


def test_video_probe_timeout_is_rejected(tmp_path: Path) -> None:
    video = tmp_path / "capture.mp4"
    video.write_bytes(b"\x00\x00\x00\x18ftypisom")

    def timeout_runner(*args: object, **kwargs: object) -> subprocess.CompletedProcess[str]:
        raise subprocess.TimeoutExpired(cmd=args[0], timeout=kwargs["timeout"])

    with pytest.raises(ValueError, match="timed out"):
        probe_video_file(video, timeout_seconds=1, runner=timeout_runner)
