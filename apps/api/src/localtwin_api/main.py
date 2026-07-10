from pathlib import Path
from typing import Annotated, Literal

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from localtwin_api.config import get_settings
from localtwin_api.market_score import (
    MarketScoreRequest,
    MarketScoreResponse,
    evaluate_market_score,
)
from localtwin_api.scene_pipeline import (
    CaptureType,
    SceneJob,
    SceneJobStore,
    ToolchainStatus,
    run_scene_job,
    save_uploads,
    toolchain_status,
)


class HealthResponse(BaseModel):
    status: Literal["ok"]


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", response_model=HealthResponse, tags=["system"])
    async def health() -> HealthResponse:
        return HealthResponse(status="ok")

    @app.post(
        "/api/v1/scores/evaluate",
        response_model=MarketScoreResponse,
        tags=["analysis"],
    )
    async def score_market(request: MarketScoreRequest) -> MarketScoreResponse:
        return evaluate_market_score(request)

    @app.get("/api/v1/scenes/toolchain", response_model=ToolchainStatus, tags=["scenes"])
    async def scene_toolchain() -> ToolchainStatus:
        return toolchain_status()

    @app.post("/api/v1/scenes/jobs", response_model=SceneJob, tags=["scenes"])
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

    @app.get("/api/v1/scenes/jobs/{job_id}", response_model=SceneJob, tags=["scenes"])
    async def get_scene_job(job_id: str) -> SceneJob:
        try:
            return SceneJobStore().load(job_id)
        except (FileNotFoundError, ValueError):
            raise HTTPException(status_code=404, detail="Scene job not found.") from None

    @app.post("/api/v1/scenes/jobs/{job_id}/run", response_model=SceneJob, tags=["scenes"])
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

    @app.get("/api/v1/scenes/jobs/{job_id}/asset", tags=["scenes"])
    async def get_scene_asset(job_id: str) -> FileResponse:
        try:
            directory = SceneJobStore().job_dir(job_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="Scene asset not found.") from None
        asset = directory / "asset" / "scene.ply"
        if not asset.exists() or not asset.is_file():
            raise HTTPException(status_code=404, detail="Scene asset is not ready.")
        return FileResponse(
            Path(asset), media_type="application/octet-stream", filename="scene.ply"
        )

    return app


app = create_app()
