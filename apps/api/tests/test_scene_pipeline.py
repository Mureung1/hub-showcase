import asyncio
import io
from pathlib import Path

import pytest
from fastapi import UploadFile

from localtwin_api.scene_pipeline import (
    SceneInputFile,
    SceneJobStore,
    ToolchainStatus,
    build_execution_command,
    build_pipeline_commands,
    run_scene_job,
    safe_name,
    save_uploads,
    toolchain_status,
    validate_file_set,
)


def test_safe_name_removes_path_and_shell_characters() -> None:
    assert safe_name("../../front;rm -rf.mp4", 1) == "front-rm--rf.mp4"


def test_capture_type_rejects_mixed_or_multiple_video_files() -> None:
    with pytest.raises(ValueError, match="exactly one"):
        validate_file_set("video", ["a.mp4", "b.mp4"])
    with pytest.raises(ValueError, match="Unsupported"):
        validate_file_set("images", ["capture.exe"])


def test_equirectangular_video_command_uses_official_split_options(tmp_path: Path) -> None:
    store = SceneJobStore(tmp_path)
    job = store.create("360 street", "equirectangular_video")
    job.files = [
        SceneInputFile(
            name="001-street.mp4", content_type="video/mp4", size_bytes=10, sha256="a" * 64
        )
    ]

    commands = build_pipeline_commands(job, store.job_dir(job.id))

    assert commands[0][0:2] == ["ns-process-data", "video"]
    assert "--camera-type" in commands[0]
    assert "equirectangular" in commands[0]
    assert "--images-per-equirect" in commands[0]
    assert commands[1][0:2] == ["ns-train", "splatfacto"]


def test_toolchain_reports_missing_fixed_tools() -> None:
    status = toolchain_status(
        which=lambda name: "C:/ffmpeg.exe" if name == "ffmpeg" else None,
        mode="host",
    )

    assert status.ready is False
    assert "missing_tool:ns-process-data" in status.blockers
    assert "missing_tool:ns-train" in status.blockers


def test_docker_command_mounts_only_the_job_directory(tmp_path: Path) -> None:
    job_dir = tmp_path / "job"
    input_path = job_dir / "input" / "capture.mp4"

    command = build_execution_command(
        ["ns-process-data", "video", "--data", str(input_path)],
        job_dir,
        "docker",
        "ghcr.io/nerfstudio-project/nerfstudio:1.1.5",
    )

    assert command[:6] == ["docker", "run", "--rm", "--gpus", "all", "--shm-size=12gb"]
    assert command[6:9] == [
        "-v",
        f"{job_dir.resolve()}:/workspace",
        "ghcr.io/nerfstudio-project/nerfstudio:1.1.5",
    ]
    assert command[-1] == "/workspace/input/capture.mp4"
    assert "shell" not in command


def test_job_store_rejects_path_traversal(tmp_path: Path) -> None:
    store = SceneJobStore(tmp_path)
    with pytest.raises(ValueError):
        store.job_dir("../outside")


def test_upload_saves_hash_and_bytes_in_job_directory(tmp_path: Path) -> None:
    store = SceneJobStore(tmp_path)
    job = store.create("shop", "images")
    upload = UploadFile(filename="../shop image.jpg", file=io.BytesIO(b"capture"))

    saved = asyncio.run(save_uploads(store, job, [upload]))

    assert saved.files[0].name == "001-shop-image.jpg"
    assert saved.files[0].size_bytes == 7
    assert len(saved.files[0].sha256) == 64
    assert (store.job_dir(job.id) / "input" / saved.files[0].name).read_bytes() == b"capture"


def test_job_blocks_before_training_when_worker_is_not_ready(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    store = SceneJobStore(tmp_path)
    job = store.create("shop", "images")
    upload = UploadFile(filename="shop.jpg", file=io.BytesIO(b"capture"))
    asyncio.run(save_uploads(store, job, [upload]))
    unavailable = ToolchainStatus(
        ready=False,
        mode="host",
        image=None,
        tools=[],
        gpu_name="NVIDIA GeForce MX450",
        gpu_memory_mb=2_048,
        minimum_gpu_memory_mb=6_000,
        blockers=["missing_tool:ns-train", "gpu_memory_below_minimum"],
    )
    monkeypatch.setattr("localtwin_api.scene_pipeline.toolchain_status", lambda: unavailable)

    blocked = run_scene_job(job.id, tmp_path)

    assert blocked.status == "blocked"
    assert blocked.stages[0].status == "passed"
    assert blocked.stages[1].status == "blocked"
    assert blocked.blocked_reason == "missing_tool:ns-train, gpu_memory_below_minimum"
    assert "CUDA worker" in (blocked.next_action or "")
