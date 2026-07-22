import shutil
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from localtwin_api.config import Settings
from localtwin_api.scene_pipeline import (
    CaptureType,
    SceneJob,
    SceneJobStore,
    SceneResourceLimitError,
    ToolchainStatus,
    enforce_scene_creation_limits,
    run_scene_job,
    save_uploads,
    toolchain_status,
)
from localtwin_api.scene_pipeline import (
    retry_scene_job as retry_stored_scene_job,
)


async def create_stored_scene_job(
    settings: Settings,
    background_tasks: BackgroundTasks,
    scene_name: str,
    capture_type: CaptureType,
    files: list[UploadFile],
    auto_run: bool,
) -> SceneJob:
    store = SceneJobStore()
    try:
        enforce_scene_creation_limits(
            store,
            max_storage_bytes=settings.scene_storage_quota_bytes,
            rate_window_seconds=settings.scene_rate_window_seconds,
            max_jobs_per_window=settings.scene_max_jobs_per_window,
            max_active_jobs=settings.scene_max_active_jobs,
        )
    except SceneResourceLimitError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    job = store.create(scene_name, capture_type)
    try:
        await save_uploads(
            store,
            job,
            files,
            max_total_bytes=settings.scene_upload_max_bytes,
            max_storage_bytes=settings.scene_storage_quota_bytes,
        )
    except SceneResourceLimitError as error:
        shutil.rmtree(store.job_dir(job.id), ignore_errors=True)
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    except ValueError as error:
        shutil.rmtree(store.job_dir(job.id), ignore_errors=True)
        raise HTTPException(status_code=422, detail=str(error)) from error
    if auto_run:
        job.status = "queued"
        store.save(job)
        background_tasks.add_task(
            run_scene_job, job.id, max_workers=settings.scene_worker_concurrency
        )
    return job


def get_stored_scene_job(job_id: str) -> SceneJob:
    try:
        return SceneJobStore().load(job_id)
    except (FileNotFoundError, ValueError):
        raise HTTPException(status_code=404, detail="Scene job not found.") from None


def queue_scene_retry(
    settings: Settings, background_tasks: BackgroundTasks, job_id: str
) -> SceneJob:
    store = SceneJobStore()
    try:
        job = retry_stored_scene_job(
            store,
            job_id,
            cooldown_seconds=settings.scene_retry_cooldown_seconds,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Scene job not found.") from None
    except SceneResourceLimitError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    background_tasks.add_task(run_scene_job, job.id, max_workers=settings.scene_worker_concurrency)
    return job


def get_approved_scene_asset(job_id: str) -> FileResponse:
    try:
        store = SceneJobStore()
        job = store.load(job_id)
        directory = store.job_dir(job_id)
    except (FileNotFoundError, ValueError):
        raise HTTPException(status_code=404, detail="Scene asset not found.") from None
    asset = directory / "asset" / "scene.ply"
    if (
        job.status != "ready"
        or job.privacy_review_status != "approved"
        or not job.is_anonymized
        or not asset.is_file()
    ):
        raise HTTPException(status_code=404, detail="Scene asset is not ready.")
    return FileResponse(asset, media_type="application/octet-stream", filename="scene.ply")


def create_scene_router(settings: Settings) -> APIRouter:
    router = APIRouter(prefix="/api/v1/scenes", tags=["scenes"])

    async def require_scene_api() -> None:
        if not settings.scene_api_enabled:
            raise HTTPException(status_code=404, detail="Not Found")

    route_options = {
        "dependencies": [Depends(require_scene_api)],
        "include_in_schema": settings.scene_api_enabled,
    }

    @router.get("/toolchain", response_model=ToolchainStatus, **route_options)
    async def scene_toolchain() -> ToolchainStatus:
        return toolchain_status()

    @router.post("/jobs", response_model=SceneJob, **route_options)
    async def create_scene_job(
        background_tasks: BackgroundTasks,
        scene_name: Annotated[str, Form()],
        capture_type: Annotated[CaptureType, Form()],
        files: Annotated[list[UploadFile], File()],
        auto_run: Annotated[bool, Form()] = True,
    ) -> SceneJob:
        return await create_stored_scene_job(
            settings, background_tasks, scene_name, capture_type, files, auto_run
        )

    @router.get("/jobs/{job_id}", response_model=SceneJob, **route_options)
    async def get_scene_job(job_id: str) -> SceneJob:
        return get_stored_scene_job(job_id)

    @router.post("/jobs/{job_id}/run", response_model=SceneJob, **route_options)
    async def retry_scene_job(job_id: str, background_tasks: BackgroundTasks) -> SceneJob:
        return queue_scene_retry(settings, background_tasks, job_id)

    @router.get("/jobs/{job_id}/asset", **route_options)
    async def get_scene_asset(job_id: str) -> FileResponse:
        return get_approved_scene_asset(job_id)

    return router
