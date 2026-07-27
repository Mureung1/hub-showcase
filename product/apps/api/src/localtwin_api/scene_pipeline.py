"""File-backed Gaussian Splat jobs with a fixed Nerfstudio command pipeline."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import re
import shutil
import subprocess
import threading
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4

from fastapi import UploadFile
from pydantic import BaseModel, Field

from localtwin_api.config import get_settings
from localtwin_api.scene_anonymization import (
    OpenCvHogPersonDetector,
    SceneAnonymizationPolicy,
    SceneAnonymizationReport,
    prepare_anonymized_dataset,
)
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
PrivacyReviewStatus = Literal["pending", "approved", "rejected"]

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".heic"}
VIDEO_SUFFIXES = {".mp4", ".mov", ".mkv"}
CHUNK_SIZE = 1024 * 1024
MAX_TOTAL_BYTES = 8 * 1024 * 1024 * 1024
MIN_GPU_MEMORY_MB = 6_000
MAX_PLY_HEADER_BYTES = 64 * 1024
MAX_PLY_VERTICES = 50_000_000
MEDIA_PROBE_TIMEOUT_SECONDS = 10
TERMINAL_JOB_STATUSES = {"blocked", "failed", "ready"}
_execution_lock = threading.Lock()
_active_scene_jobs: set[str] = set()


class SceneResourceLimitError(ValueError):
    """A public Scene request exceeded an intentionally small service limit."""

    status_code: int = 429


class SceneUploadTooLargeError(SceneResourceLimitError):
    status_code = 413


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
    privacy_review_status: PrivacyReviewStatus = "pending"
    is_anonymized: bool = False
    privacy_reviewed_at: str | None = None
    anonymization_report: SceneAnonymizationReport | None = None
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
        header = stream.read(MAX_PLY_HEADER_BYTES)
    header_end = header.find(b"end_header\n")
    if not header.startswith(b"ply\n") or header_end < 0:
        raise ValueError("Asset is not a valid PLY file.")
    if b"format binary_little_endian 1.0" not in header:
        raise ValueError("PLY must use binary_little_endian format.")
    vertex_match = re.search(rb"^element vertex (\d+)$", header, flags=re.MULTILINE)
    if vertex_match is None:
        raise ValueError("PLY is missing an element vertex declaration.")
    vertex_count = int(vertex_match.group(1))
    if vertex_count < 1 or vertex_count > MAX_PLY_VERTICES:
        raise ValueError("PLY vertex count is outside the supported limit.")
    required = (
        b"element vertex",
        b"property float opacity",
        b"property float scale_0",
        b"property float rot_0",
    )
    missing = [item.decode("ascii") for item in required if item not in header]
    if missing:
        raise ValueError(f"PLY is missing Gaussian properties: {', '.join(missing)}")
    minimum_payload_bytes = vertex_count * len(required) * 4
    if path.stat().st_size < header_end + len(b"end_header\n") + minimum_payload_bytes:
        raise ValueError("PLY payload is shorter than its declared Gaussian vertex data.")


def validate_capture_content(path: Path, capture_type: CaptureType) -> None:
    """Reject renamed text/binary files before a GPU worker receives them."""
    if capture_type == "gaussian_ply":
        validate_gaussian_ply(path)
        return
    with path.open("rb") as stream:
        header = stream.read(32)
    suffix = path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        valid = header.startswith(b"\xff\xd8\xff")
    elif suffix == ".png":
        valid = header.startswith(b"\x89PNG\r\n\x1a\n")
    elif suffix == ".heic":
        valid = header[4:8] == b"ftyp" and header[8:12] in {b"heic", b"heix", b"hevc", b"hevx"}
    elif suffix in {".mp4", ".mov"}:
        valid = header[4:8] == b"ftyp"
    elif suffix == ".mkv":
        valid = header.startswith(b"\x1aE\xdf\xa3")
    else:
        valid = False
    if not valid:
        raise ValueError(f"Capture content does not match {suffix or 'the declared'} file type.")


def probe_video_file(
    path: Path,
    *,
    timeout_seconds: int = MEDIA_PROBE_TIMEOUT_SECONDS,
    runner: Callable[..., subprocess.CompletedProcess[str]] = subprocess.run,
) -> None:
    """Use ffprobe with a bounded subprocess call before a video reaches Nerfstudio."""
    command = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_type,width,height,nb_frames",
        "-of",
        "json",
        str(path),
    ]
    try:
        result = runner(
            command, capture_output=True, text=True, timeout=timeout_seconds, check=False
        )
    except subprocess.TimeoutExpired as error:
        raise ValueError("Video probe timed out.") from error
    except OSError as error:
        raise ValueError("Video probe is unavailable.") from error
    if result.returncode != 0:
        raise ValueError("Video decoder probe rejected the capture.")


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
    job.camera_pose = camera_pose
    return store.save(job)


def approve_anonymized_asset(store: SceneJobStore, job_id: str) -> SceneJob:
    """Publish a ready asset only after a trusted privacy review has approved it."""
    job = store.load(job_id)
    asset = store.job_dir(job.id) / "asset" / "scene.ply"
    if job.status != "ready" or not asset.is_file():
        raise ValueError("Only ready jobs with a generated asset can be approved.")
    job.privacy_review_status = "approved"
    job.is_anonymized = True
    job.privacy_reviewed_at = utc_now()
    job.asset_url = f"/api/v1/scenes/jobs/{job.id}/asset"
    return store.save(job)


def reject_scene_asset(store: SceneJobStore, job_id: str) -> SceneJob:
    """Record a privacy rejection without leaving a public asset URL behind."""
    job = store.load(job_id)
    job.privacy_review_status = "rejected"
    job.is_anonymized = False
    job.privacy_reviewed_at = utc_now()
    job.asset_url = None
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
                SceneStage(name="anonymize"),
                SceneStage(name="train"),
                SceneStage(name="export"),
            ],
        )
        (self.job_dir(job_id) / "input").mkdir(parents=True, exist_ok=False)
        return self.save(job)

    def list_jobs(self) -> list[SceneJob]:
        if not self.root.exists():
            return []
        jobs: list[SceneJob] = []
        for directory in self.root.iterdir():
            if not directory.is_dir():
                continue
            try:
                jobs.append(self.load(directory.name))
            except (FileNotFoundError, ValueError):
                continue
        return jobs

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
    *,
    max_total_bytes: int = MAX_TOTAL_BYTES,
    max_storage_bytes: int | None = None,
) -> SceneJob:
    names = [safe_name(upload.filename, index) for index, upload in enumerate(uploads, start=1)]
    validate_file_set(job.capture_type, names)
    total_size = 0
    existing_storage = scene_storage_bytes(store)
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
                    if total_size > max_total_bytes:
                        raise SceneUploadTooLargeError(
                            "Capture files exceed the configured job limit."
                        )
                    if (
                        max_storage_bytes is not None
                        and existing_storage + total_size > max_storage_bytes
                    ):
                        raise SceneResourceLimitError("Scene storage quota reached. Retry later.")
                    digest.update(chunk)
                    stream.write(chunk)
            if size == 0:
                raise ValueError(f"Capture file is empty: {name}")
            validate_capture_content(path, job.capture_type)
            if job.capture_type.endswith("video"):
                probe_video_file(path)
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


def parse_job_time(value: str) -> datetime:
    return datetime.fromisoformat(value).astimezone(UTC)


def scene_storage_bytes(store: SceneJobStore) -> int:
    if not store.root.exists():
        return 0
    return sum(path.stat().st_size for path in store.root.rglob("*") if path.is_file())


def enforce_scene_creation_limits(
    store: SceneJobStore,
    *,
    max_storage_bytes: int,
    rate_window_seconds: int,
    max_jobs_per_window: int,
    max_active_jobs: int,
    now: datetime | None = None,
) -> None:
    """Apply anonymous service limits until owner-based quotas can be enforced."""
    current = now or datetime.now(UTC)
    jobs = store.list_jobs()
    window_start = current - timedelta(seconds=rate_window_seconds)
    recent_count = sum(parse_job_time(job.created_at) >= window_start for job in jobs)
    if recent_count >= max_jobs_per_window:
        raise SceneResourceLimitError("Scene job rate limit reached. Retry later.")
    active_count = sum(job.status in {"queued", "running"} for job in jobs)
    if active_count >= max_active_jobs:
        raise SceneResourceLimitError("Scene job capacity reached. Retry later.")
    if scene_storage_bytes(store) >= max_storage_bytes:
        raise SceneResourceLimitError("Scene storage quota reached. Retry later.")


def retry_scene_job(
    store: SceneJobStore,
    job_id: str,
    *,
    cooldown_seconds: int,
    now: datetime | None = None,
) -> SceneJob:
    job = store.load(job_id)
    if job.status in {"queued", "running"}:
        raise SceneResourceLimitError("Scene job is already queued or running.")
    if job.status not in {"blocked", "failed"}:
        raise ValueError("Only blocked or failed Scene jobs can be retried.")
    current = now or datetime.now(UTC)
    if current < parse_job_time(job.updated_at) + timedelta(seconds=cooldown_seconds):
        raise SceneResourceLimitError("Scene job retry cooldown is active. Retry later.")
    job.status = "queued"
    job.blocked_reason = None
    job.next_action = None
    return store.save(job)


def cleanup_expired_scene_jobs(
    store: SceneJobStore,
    *,
    retention_hours: int,
    now: datetime | None = None,
) -> list[str]:
    current = now or datetime.now(UTC)
    cutoff = current - timedelta(hours=retention_hours)
    removed: list[str] = []
    for job in store.list_jobs():
        if job.status in TERMINAL_JOB_STATUSES and parse_job_time(job.updated_at) < cutoff:
            shutil.rmtree(store.job_dir(job.id), ignore_errors=True)
            removed.append(job.id)
    return removed


def claim_scene_execution(job_id: str, *, max_workers: int) -> bool:
    with _execution_lock:
        if job_id in _active_scene_jobs or len(_active_scene_jobs) >= max_workers:
            return False
        _active_scene_jobs.add(job_id)
        return True


def release_scene_execution(job_id: str) -> None:
    with _execution_lock:
        _active_scene_jobs.discard(job_id)


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
    tools.append(
        ToolStatus(
            name="opencv",
            available=importlib.util.find_spec("cv2") is not None,
            path=None,
        )
    )
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
    anonymized_dir = directory / "anonymized"
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
        str(anonymized_dir),
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


def block_scene_job(store: SceneJobStore, job: SceneJob, capability: ToolchainStatus) -> SceneJob:
    job.status = "blocked"
    job.blocked_reason = ", ".join(capability.blockers)
    job.next_action = "Run this job on a CUDA worker with FFmpeg, Nerfstudio and at least 6GB VRAM."
    store.set_stage(job, "preprocess", "blocked", job.blocked_reason)
    return store.save(job)


def run_pipeline_stage(
    store: SceneJobStore,
    job: SceneJob,
    stage_name: str,
    command: list[str],
    directory: Path,
    log_path: Path,
    capability: ToolchainStatus,
) -> None:
    store.set_stage(job, stage_name, "running")
    run_command(command, directory, log_path, capability.mode, capability.image or "")
    store.set_stage(job, stage_name, "passed")


def run_anonymization_stage(store: SceneJobStore, job: SceneJob, directory: Path) -> None:
    settings = get_settings()
    store.set_stage(job, "anonymize", "running")
    report = prepare_anonymized_dataset(
        directory / "processed",
        directory / "anonymized",
        OpenCvHogPersonDetector(),
        SceneAnonymizationPolicy(
            action=settings.scene_anonymization_action,
            confidence_threshold=settings.scene_person_confidence_threshold,
            bbox_margin=settings.scene_person_bbox_margin,
        ),
    )
    job.anonymization_report = report
    store.set_stage(
        job,
        "anonymize",
        "passed",
        (
            f"Sanitized {report.processed_frames} frame(s); "
            f"excluded {report.excluded_frames}; detections {report.detection_count}."
        ),
    )
    store.save(job)


def export_scene_asset(
    store: SceneJobStore,
    job: SceneJob,
    directory: Path,
    log_path: Path,
    capability: ToolchainStatus,
) -> None:
    configs = sorted((directory / "training").rglob("config.yml"))
    if not configs:
        raise RuntimeError("Nerfstudio training finished without config.yml.")
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
    run_pipeline_stage(store, job, "export", export_command, directory, log_path, capability)
    ply_files = sorted(export_dir.rglob("*.ply"))
    if not ply_files:
        raise RuntimeError("Nerfstudio export finished without a PLY asset.")
    final_asset = export_dir / "scene.ply"
    if ply_files[0] != final_asset:
        shutil.copy2(ply_files[0], final_asset)


def run_scene_job(
    job_id: str, root: Path | None = None, *, max_workers: int | None = None
) -> SceneJob:
    store = SceneJobStore(root)
    worker_limit = max_workers or get_settings().scene_worker_concurrency
    if not claim_scene_execution(job_id, max_workers=worker_limit):
        job = store.load(job_id)
        job.status = "blocked"
        job.blocked_reason = "scene_worker_capacity_reached"
        job.next_action = "Retry after another Scene job completes."
        return store.save(job)
    try:
        return _run_scene_job(store, job_id)
    finally:
        release_scene_execution(job_id)


def _run_scene_job(store: SceneJobStore, job_id: str) -> SceneJob:
    job = store.load(job_id)
    capability = toolchain_status()
    if not capability.ready:
        return block_scene_job(store, job, capability)

    directory = store.job_dir(job.id)
    log_path = directory / "pipeline.log"
    commands = build_pipeline_commands(job, directory)
    job.commands = commands
    job.status = "running"
    store.save(job)
    try:
        run_pipeline_stage(store, job, "preprocess", commands[0], directory, log_path, capability)
        run_anonymization_stage(store, job, directory)
        run_pipeline_stage(store, job, "train", commands[1], directory, log_path, capability)
        export_scene_asset(store, job, directory, log_path, capability)
        job.status = "ready"
        return store.save(job)
    except (subprocess.CalledProcessError, OSError, RuntimeError, ValueError) as error:
        running_stage = next((stage for stage in job.stages if stage.status == "running"), None)
        if running_stage:
            store.set_stage(job, running_stage.name, "failed", str(error))
        job.status = "failed"
        job.next_action = "Inspect pipeline.log, fix the worker environment, and retry the job."
        return store.save(job)
