"""File-backed Gaussian Splat jobs with a fixed Nerfstudio command pipeline."""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4

from fastapi import UploadFile
from pydantic import BaseModel, Field

from localtwin_api.config import get_settings
from localtwin_api.seoul_open_data import repository_root

CaptureType = Literal[
    "images",
    "video",
    "equirectangular_images",
    "equirectangular_video",
    "gaussian_ply",
]
JobStatus = Literal["uploaded", "queued", "running", "blocked", "failed", "ready"]
StageStatus = Literal["pending", "running", "passed", "blocked", "failed"]
WorkerMode = Literal["host", "docker"]

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".heic"}
VIDEO_SUFFIXES = {".mp4", ".mov", ".mkv"}
CHUNK_SIZE = 1024 * 1024
MAX_TOTAL_BYTES = 8 * 1024 * 1024 * 1024
MIN_GPU_MEMORY_MB = 6_000


class SceneInputFile(BaseModel):
    name: str
    content_type: str | None
    size_bytes: int = Field(ge=1)
    sha256: str


class SceneStage(BaseModel):
    name: str
    status: StageStatus = "pending"
    started_at: str | None = None
    finished_at: str | None = None
    message: str | None = None


class SceneCameraPose(BaseModel):
    position: tuple[float, float, float]
    target: tuple[float, float, float]
    up: tuple[float, float, float]


class SceneJob(BaseModel):
    id: str
    scene_name: str
    capture_type: CaptureType
    status: JobStatus
    created_at: str
    updated_at: str
    files: list[SceneInputFile]
    stages: list[SceneStage]
    blocked_reason: str | None = None
    next_action: str | None = None
    asset_url: str | None = None
    camera_pose: SceneCameraPose | None = None
    commands: list[list[str]] = Field(default_factory=list)


class ToolStatus(BaseModel):
    name: str
    available: bool
    path: str | None = None


class ToolchainStatus(BaseModel):
    ready: bool
    mode: WorkerMode
    image: str | None
    tools: list[ToolStatus]
    gpu_name: str | None
    gpu_memory_mb: int | None
    minimum_gpu_memory_mb: int
    blockers: list[str]


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def default_scene_root() -> Path:
    return repository_root() / "data" / "scenes" / "jobs"


def safe_name(filename: str | None, index: int) -> str:
    source = Path(filename or f"upload-{index}").name
    clean = re.sub(r"[^A-Za-z0-9._-]+", "-", source).strip(".-")
    return clean or f"upload-{index}"


def allowed_suffixes(capture_type: CaptureType) -> set[str]:
    if capture_type == "gaussian_ply":
        return {".ply"}
    return VIDEO_SUFFIXES if capture_type.endswith("video") else IMAGE_SUFFIXES


def validate_file_set(capture_type: CaptureType, filenames: list[str]) -> None:
    if not filenames:
        raise ValueError("At least one capture file is required.")
    if (capture_type.endswith("video") or capture_type == "gaussian_ply") and len(filenames) != 1:
        raise ValueError("Video and Gaussian PLY inputs accept exactly one file.")
    allowed = allowed_suffixes(capture_type)
    invalid = [name for name in filenames if Path(name).suffix.lower() not in allowed]
    if invalid:
        raise ValueError(f"Unsupported capture file type: {', '.join(invalid)}")


def validate_gaussian_ply(path: Path) -> None:
    with path.open("rb") as stream:
        header = stream.read(64 * 1024)
    if not header.startswith(b"ply\n") or b"end_header" not in header:
        raise ValueError("Asset is not a valid PLY file.")
    required = (
        b"element vertex",
        b"property float opacity",
        b"property float scale_0",
        b"property float rot_0",
    )
    missing = [item.decode("ascii") for item in required if item not in header]
    if missing:
        raise ValueError(f"PLY is missing Gaussian properties: {', '.join(missing)}")


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(CHUNK_SIZE):
            digest.update(chunk)
    return digest.hexdigest()


def load_nerfstudio_camera_pose(
    transforms_path: Path,
    dataparser_transforms_path: Path,
) -> SceneCameraPose:
    transforms = json.loads(transforms_path.read_text(encoding="utf-8"))
    dataparser = json.loads(dataparser_transforms_path.read_text(encoding="utf-8"))
    frames = transforms.get("frames", [])
    transform = dataparser.get("transform")
    scale = float(dataparser.get("scale", 1.0))
    if not frames or not isinstance(transform, list) or len(transform) != 3:
        raise ValueError("Nerfstudio camera metadata is incomplete.")
    camera_to_world = frames[0].get("transform_matrix")
    if not isinstance(camera_to_world, list) or len(camera_to_world) != 4:
        raise ValueError("Nerfstudio camera transform is invalid.")
    applied = transforms.get("applied_transform")
    if isinstance(applied, list) and len(applied) == 3:
        rotation = [[float(applied[row][column]) for column in range(3)] for row in range(3)]
        translation = [float(applied[row][3]) for row in range(3)]
        inverse_applied = [
            [rotation[column][row] for column in range(3)]
            + [-sum(rotation[column][row] * translation[column] for column in range(3))]
            for row in range(3)
        ]
        inverse_applied.append([0.0, 0.0, 0.0, 1.0])
        camera_to_world = [
            [
                sum(
                    float(inverse_applied[row][index]) * float(camera_to_world[index][column])
                    for index in range(4)
                )
                for column in range(4)
            ]
            for row in range(4)
        ]
    oriented = [
        [
            sum(
                float(transform[row][index]) * float(camera_to_world[index][column])
                for index in range(4)
            )
            for column in range(4)
        ]
        for row in range(3)
    ]
    position = tuple(oriented[row][3] * scale for row in range(3))
    forward = tuple(-oriented[row][2] for row in range(3))
    target = tuple(position[row] + forward[row] for row in range(3))
    up = tuple(oriented[row][1] for row in range(3))
    return SceneCameraPose(position=position, target=target, up=up)


def import_gaussian_asset(
    source: Path,
    scene_name: str,
    root: Path | None = None,
    camera_pose: SceneCameraPose | None = None,
) -> SceneJob:
    source = source.resolve()
    if not source.is_file():
        raise FileNotFoundError(source)
    validate_gaussian_ply(source)
    store = SceneJobStore(root)
    job = store.create(scene_name, "gaussian_ply")
    destination = store.job_dir(job.id) / "asset" / "scene.ply"
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    job.files = [
        SceneInputFile(
            name="scene.ply",
            content_type="application/octet-stream",
            size_bytes=destination.stat().st_size,
            sha256=file_sha256(destination),
        )
    ]
    for stage in job.stages:
        stage.status = "passed"
        stage.finished_at = utc_now()
        stage.message = "Completed on an external GPU worker."
    job.status = "ready"
    job.asset_url = f"/api/v1/scenes/jobs/{job.id}/asset"
    job.camera_pose = camera_pose
    return store.save(job)


class SceneJobStore:
    def __init__(self, root: Path | None = None) -> None:
        self.root = root or default_scene_root()

    def job_dir(self, job_id: str) -> Path:
        canonical = str(UUID(job_id))
        return self.root / canonical

    def save(self, job: SceneJob) -> SceneJob:
        directory = self.job_dir(job.id)
        directory.mkdir(parents=True, exist_ok=True)
        job.updated_at = utc_now()
        (directory / "job.json").write_text(job.model_dump_json(indent=2) + "\n", encoding="utf-8")
        return job

    def load(self, job_id: str) -> SceneJob:
        path = self.job_dir(job_id) / "job.json"
        if not path.exists():
            raise FileNotFoundError(job_id)
        return SceneJob.model_validate_json(path.read_text(encoding="utf-8"))

    def create(self, scene_name: str, capture_type: CaptureType) -> SceneJob:
        job_id = str(uuid4())
        now = utc_now()
        job = SceneJob(
            id=job_id,
            scene_name=scene_name.strip() or "Untitled scene",
            capture_type=capture_type,
            status="uploaded",
            created_at=now,
            updated_at=now,
            files=[],
            stages=[
                SceneStage(name="validate"),
                SceneStage(name="preprocess"),
                SceneStage(name="train"),
                SceneStage(name="export"),
            ],
        )
        (self.job_dir(job_id) / "input").mkdir(parents=True, exist_ok=False)
        return self.save(job)

    def set_stage(
        self, job: SceneJob, name: str, status: StageStatus, message: str | None = None
    ) -> SceneJob:
        stage = next(stage for stage in job.stages if stage.name == name)
        now = utc_now()
        if status == "running":
            stage.started_at = now
        if status in {"passed", "blocked", "failed"}:
            stage.finished_at = now
        stage.status = status
        stage.message = message
        return self.save(job)


async def save_uploads(
    store: SceneJobStore,
    job: SceneJob,
    uploads: list[UploadFile],
) -> SceneJob:
    names = [safe_name(upload.filename, index) for index, upload in enumerate(uploads, start=1)]
    validate_file_set(job.capture_type, names)
    total_size = 0
    destination = store.job_dir(job.id) / "input"
    saved: list[SceneInputFile] = []
    try:
        for index, (upload, name) in enumerate(zip(uploads, names, strict=True), start=1):
            path = destination / f"{index:03d}-{name}"
            digest = hashlib.sha256()
            size = 0
            with path.open("wb") as stream:
                while chunk := await upload.read(CHUNK_SIZE):
                    size += len(chunk)
                    total_size += len(chunk)
                    if total_size > MAX_TOTAL_BYTES:
                        raise ValueError("Capture files exceed the 8GB job limit.")
                    digest.update(chunk)
                    stream.write(chunk)
            if size == 0:
                raise ValueError(f"Capture file is empty: {name}")
            saved.append(
                SceneInputFile(
                    name=path.name,
                    content_type=upload.content_type,
                    size_bytes=size,
                    sha256=digest.hexdigest(),
                )
            )
    except Exception:
        shutil.rmtree(destination, ignore_errors=True)
        destination.mkdir(parents=True, exist_ok=True)
        raise
    job.files = saved
    store.set_stage(job, "validate", "passed", f"Validated {len(saved)} input file(s).")
    return store.save(job)


def toolchain_status(
    which: Callable[[str], str | None] = shutil.which,
    mode: WorkerMode | None = None,
    image: str | None = None,
) -> ToolchainStatus:
    settings = get_settings()
    selected_mode = mode or settings.scene_worker_mode
    selected_image = image or settings.scene_docker_image
    tool_names = (
        ["docker", "nvidia-smi"]
        if selected_mode == "docker"
        else ["ffmpeg", "ns-process-data", "ns-train", "ns-export", "nvidia-smi"]
    )
    tools = [
        ToolStatus(name=name, available=bool(path := which(name)), path=path) for name in tool_names
    ]
    blockers = [f"missing_tool:{tool.name}" for tool in tools if not tool.available]
    if selected_mode == "docker" and not blockers and selected_image:
        docker = next(tool for tool in tools if tool.name == "docker")
        result = subprocess.run(
            [docker.path or "docker", "image", "inspect", selected_image],
            capture_output=True,
            text=True,
            check=False,
            timeout=15,
        )
        if result.returncode != 0:
            blockers.append("missing_docker_image")
    gpu_name: str | None = None
    gpu_memory_mb: int | None = None
    nvidia = next(tool for tool in tools if tool.name == "nvidia-smi")
    if nvidia.available:
        result = subprocess.run(
            [
                nvidia.path or "nvidia-smi",
                "--query-gpu=name,memory.total",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            check=False,
            timeout=10,
        )
        if result.returncode == 0 and result.stdout.strip():
            first = result.stdout.splitlines()[0]
            name, _, memory = first.rpartition(",")
            gpu_name = name.strip()
            try:
                gpu_memory_mb = int(memory.strip())
            except ValueError:
                blockers.append("unreadable_gpu_memory")
    if gpu_memory_mb is not None and gpu_memory_mb < MIN_GPU_MEMORY_MB:
        blockers.append("gpu_memory_below_minimum")
    return ToolchainStatus(
        ready=not blockers,
        mode=selected_mode,
        image=selected_image if selected_mode == "docker" else None,
        tools=tools,
        gpu_name=gpu_name,
        gpu_memory_mb=gpu_memory_mb,
        minimum_gpu_memory_mb=MIN_GPU_MEMORY_MB,
        blockers=blockers,
    )


def build_pipeline_commands(job: SceneJob, directory: Path) -> list[list[str]]:
    if job.capture_type == "gaussian_ply":
        raise ValueError("Imported Gaussian PLY assets do not run the capture pipeline.")
    input_dir = directory / "input"
    processed_dir = directory / "processed"
    training_dir = directory / "training"
    source_kind = "video" if job.capture_type.endswith("video") else "images"
    data_path = input_dir / job.files[0].name if source_kind == "video" else input_dir
    preprocess = [
        "ns-process-data",
        source_kind,
        "--data",
        str(data_path),
        "--output-dir",
        str(processed_dir),
    ]
    if job.capture_type.startswith("equirectangular"):
        preprocess.extend(["--camera-type", "equirectangular", "--images-per-equirect", "8"])
        if source_kind == "video":
            preprocess.extend(["--num-frames-target", "240"])
    train = [
        "ns-train",
        "splatfacto",
        "--output-dir",
        str(training_dir),
        "--data",
        str(processed_dir),
    ]
    return [preprocess, train]


def build_execution_command(
    command: list[str], directory: Path, mode: WorkerMode, image: str
) -> list[str]:
    if mode == "host":
        return command
    root = str(directory.resolve())
    mapped = [
        argument.replace(root, "/workspace").replace(os.sep, "/")
        if argument.startswith(root)
        else argument
        for argument in command
    ]
    return [
        "docker",
        "run",
        "--rm",
        "--gpus",
        "all",
        "--shm-size=12gb",
        "-v",
        f"{root}:/workspace",
        image,
        *mapped,
    ]


def run_command(
    command: list[str],
    cwd: Path,
    log_path: Path,
    mode: WorkerMode = "host",
    image: str = "ghcr.io/nerfstudio-project/nerfstudio:1.1.5",
) -> None:
    execution_command = build_execution_command(command, cwd, mode, image)
    with log_path.open("a", encoding="utf-8") as log:
        log.write(f"\n$ {' '.join(execution_command)}\n")
        subprocess.run(
            execution_command,
            cwd=cwd,
            stdout=log,
            stderr=subprocess.STDOUT,
            text=True,
            check=True,
        )


def run_scene_job(job_id: str, root: Path | None = None) -> SceneJob:
    store = SceneJobStore(root)
    job = store.load(job_id)
    capability = toolchain_status()
    if not capability.ready:
        job.status = "blocked"
        job.blocked_reason = ", ".join(capability.blockers)
        job.next_action = (
            "Run this job on a CUDA worker with FFmpeg, Nerfstudio and at least 6GB VRAM."
        )
        store.set_stage(job, "preprocess", "blocked", job.blocked_reason)
        return store.save(job)

    directory = store.job_dir(job.id)
    log_path = directory / "pipeline.log"
    commands = build_pipeline_commands(job, directory)
    job.commands = commands
    job.status = "running"
    store.save(job)
    try:
        store.set_stage(job, "preprocess", "running")
        run_command(
            commands[0],
            directory,
            log_path,
            capability.mode,
            capability.image or "",
        )
        store.set_stage(job, "preprocess", "passed")

        store.set_stage(job, "train", "running")
        run_command(
            commands[1],
            directory,
            log_path,
            capability.mode,
            capability.image or "",
        )
        configs = sorted((directory / "training").rglob("config.yml"))
        if not configs:
            raise RuntimeError("Nerfstudio training finished without config.yml.")
        store.set_stage(job, "train", "passed")

        export_dir = directory / "asset"
        export_command = [
            "ns-export",
            "gaussian-splat",
            "--load-config",
            str(configs[-1]),
            "--output-dir",
            str(export_dir),
        ]
        job.commands.append(export_command)
        store.set_stage(job, "export", "running")
        run_command(
            export_command,
            directory,
            log_path,
            capability.mode,
            capability.image or "",
        )
        ply_files = sorted(export_dir.rglob("*.ply"))
        if not ply_files:
            raise RuntimeError("Nerfstudio export finished without a PLY asset.")
        final_asset = export_dir / "scene.ply"
        if ply_files[0] != final_asset:
            shutil.copy2(ply_files[0], final_asset)
        store.set_stage(job, "export", "passed")
        job.status = "ready"
        job.asset_url = f"/api/v1/scenes/jobs/{job.id}/asset"
        return store.save(job)
    except (subprocess.CalledProcessError, OSError, RuntimeError) as error:
        running_stage = next((stage for stage in job.stages if stage.status == "running"), None)
        if running_stage:
            store.set_stage(job, running_stage.name, "failed", str(error))
        job.status = "failed"
        job.next_action = "Inspect pipeline.log, fix the worker environment, and retry the job."
        return store.save(job)
