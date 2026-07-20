from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from localtwin_api.config import Settings
from localtwin_api.scene_pipeline import (
    CaptureType,
    SceneJob,
    SceneJobStore,
    ToolchainStatus,
    run_scene_job,
    save_uploads,
    toolchain_status,
)


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
        store = SceneJobStore()
        job = store.create(scene_name, capture_type)
        try:
            await save_uploads(store, job, files)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        if auto_run:
            job.status = "queued"
            store.save(job)
            background_tasks.add_task(run_scene_job, job.id)
        return job

    @router.get("/jobs/{job_id}", response_model=SceneJob, **route_options)
    async def get_scene_job(job_id: str) -> SceneJob:
        try:
            return SceneJobStore().load(job_id)
        except (FileNotFoundError, ValueError):
            raise HTTPException(status_code=404, detail="Scene job not found.") from None

    @router.post("/jobs/{job_id}/run", response_model=SceneJob, **route_options)
    async def retry_scene_job(job_id: str, background_tasks: BackgroundTasks) -> SceneJob:
        store = SceneJobStore()
        try:
            job = store.load(job_id)
        except (FileNotFoundError, ValueError):
            raise HTTPException(status_code=404, detail="Scene job not found.") from None
        job.status = "queued"
        job.blocked_reason = None
        job.next_action = None
        store.save(job)
        background_tasks.add_task(run_scene_job, job.id)
        return job

    @router.get("/jobs/{job_id}/asset", **route_options)
    async def get_scene_asset(job_id: str) -> FileResponse:
        try:
            directory = SceneJobStore().job_dir(job_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="Scene asset not found.") from None
        asset = directory / "asset" / "scene.ply"
        if not asset.exists() or not asset.is_file():
            raise HTTPException(status_code=404, detail="Scene asset is not ready.")
        return FileResponse(asset, media_type="application/octet-stream", filename="scene.ply")

    return router
