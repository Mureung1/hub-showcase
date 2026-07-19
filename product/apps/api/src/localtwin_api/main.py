from pathlib import Path
from typing import Annotated, Literal, cast

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from localtwin_api.admin_area_analysis import (
    AdminAreaAnalysisRepository,
    AdminAreaBackgroundResponse,
)
from localtwin_api.config import Settings, get_settings
from localtwin_api.database import create_database_engine, create_session_factory
from localtwin_api.db_models import Market
from localtwin_api.market_analysis import (
    AnalysisPeriodsResponse,
    MarketAnalysisRepository,
    MarketAnalysisResponse,
)
from localtwin_api.market_search import (
    MarketSearchRepository,
    MarketSearchResponse,
)
from localtwin_api.nearby_search import (
    ALLOWED_NEARBY_RADII,
    NearbyRadius,
    NearbyStoreRepository,
    NearbyStoreResponse,
    UnsupportedAnalysisAreaError,
)
from localtwin_api.product_catalog import Category
from localtwin_api.routers.catalog import router as catalog_router
from localtwin_api.routers.scores import router as scores_router
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


class ReadinessResponse(BaseModel):
    status: Literal["ready"]


def create_app(
    settings: Settings | None = None,
    *,
    search_session_factory: sessionmaker[Session] | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title=settings.app_name)
    app.include_router(catalog_router)
    app.include_router(scores_router)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    resolved_search_factory = search_session_factory

    def get_search_session_factory() -> sessionmaker[Session]:
        nonlocal resolved_search_factory
        if resolved_search_factory is None:
            engine = create_database_engine(settings.require_database_url())
            resolved_search_factory = create_session_factory(engine)
            app.state.search_engine = engine
        return resolved_search_factory

    @app.get("/health", response_model=HealthResponse, tags=["system"])
    async def health() -> HealthResponse:
        return HealthResponse(status="ok")

    @app.get("/ready", response_model=ReadinessResponse, tags=["system"])
    def readiness() -> ReadinessResponse:
        try:
            factory = get_search_session_factory()
            with factory() as session:
                market_code = session.scalar(select(Market.market_code).limit(1))
            if market_code is None:
                raise RuntimeError("Canonical market data is empty.")
        except (RuntimeError, SQLAlchemyError):
            raise HTTPException(status_code=503, detail="Service is not ready.") from None
        return ReadinessResponse(status="ready")

    @app.get(
        "/api/v1/analysis/periods",
        response_model=AnalysisPeriodsResponse,
        tags=["analysis"],
    )
    def analysis_periods(category: Category) -> AnalysisPeriodsResponse:
        try:
            factory = get_search_session_factory()
            with factory() as session:
                return MarketAnalysisRepository(session).available_periods(category)
        except LookupError:
            raise HTTPException(
                status_code=404, detail="No complete analysis period is available."
            ) from None
        except (RuntimeError, SQLAlchemyError):
            raise HTTPException(
                status_code=503, detail="Analysis period service is unavailable."
            ) from None

    @app.get(
        "/api/v1/markets/{market_id}",
        response_model=MarketAnalysisResponse,
        tags=["analysis"],
    )
    async def market_analysis(
        market_id: str,
        category: Category,
        period: Annotated[str, Query(pattern=r"^\d{5}$")],
    ) -> MarketAnalysisResponse:
        try:
            factory = get_search_session_factory()
            with factory() as session:
                return MarketAnalysisRepository(session).get(market_id, category, period)
        except LookupError:
            raise HTTPException(
                status_code=404, detail="Market analysis is not available for this input."
            ) from None
        except (RuntimeError, SQLAlchemyError):
            raise HTTPException(
                status_code=503, detail="Market analysis service is unavailable."
            ) from None

    @app.get(
        "/api/v1/search",
        response_model=MarketSearchResponse,
        tags=["search"],
    )
    def search_markets_and_stores(
        query: Annotated[str, Query(min_length=1, max_length=80)],
        category: Annotated[str | None, Query(max_length=60)] = None,
        limit: Annotated[int, Query(ge=1, le=20)] = 10,
    ) -> MarketSearchResponse:
        normalized_query = query.strip()
        if not normalized_query:
            raise HTTPException(status_code=422, detail="Search query must not be blank.")
        normalized_category = category.strip() if category and category.strip() else None
        try:
            factory = get_search_session_factory()
            with factory() as session:
                results = MarketSearchRepository(session).search(
                    normalized_query,
                    category=normalized_category,
                    limit=limit,
                )
        except (RuntimeError, SQLAlchemyError):
            raise HTTPException(status_code=503, detail="Search service is unavailable.") from None
        return MarketSearchResponse(query=normalized_query, results=results)

    @app.get(
        "/api/v1/stores/nearby",
        response_model=NearbyStoreResponse,
        tags=["analysis"],
    )
    def nearby_stores(
        latitude: Annotated[float, Query(ge=-90, le=90)],
        longitude: Annotated[float, Query(ge=-180, le=180)],
        radius: Annotated[int, Query()] = 300,
        category: Annotated[str | None, Query(max_length=60)] = None,
    ) -> NearbyStoreResponse:
        normalized_category = category.strip() if category and category.strip() else None
        if radius not in ALLOWED_NEARBY_RADII:
            raise HTTPException(
                status_code=422,
                detail="Radius must be one of 100, 300, or 500 meters.",
            )
        validated_radius = cast(NearbyRadius, radius)
        try:
            factory = get_search_session_factory()
            with factory() as session:
                return NearbyStoreRepository(session).nearby(
                    latitude=latitude,
                    longitude=longitude,
                    radius=validated_radius,
                    category=normalized_category,
                )
        except UnsupportedAnalysisAreaError:
            raise HTTPException(
                status_code=422,
                detail="Analysis center is outside the supported area.",
            ) from None
        except (RuntimeError, SQLAlchemyError):
            raise HTTPException(
                status_code=503,
                detail="Nearby analysis service is unavailable.",
            ) from None

    @app.get(
        "/api/v1/markets/{market_id}/admin-area-background",
        response_model=AdminAreaBackgroundResponse,
        tags=["analysis"],
    )
    def admin_area_background(market_id: str) -> AdminAreaBackgroundResponse:
        try:
            factory = get_search_session_factory()
            with factory() as session:
                return AdminAreaAnalysisRepository(session).get(market_id)
        except LookupError:
            raise HTTPException(
                status_code=404,
                detail="Administrative-area background is not available for this market.",
            ) from None
        except (RuntimeError, SQLAlchemyError):
            raise HTTPException(
                status_code=503,
                detail="Administrative-area analysis service is unavailable.",
            ) from None

    async def require_scene_api() -> None:
        if not settings.scene_api_enabled:
            raise HTTPException(status_code=404, detail="Not Found")

    @app.get(
        "/api/v1/scenes/toolchain",
        response_model=ToolchainStatus,
        tags=["scenes"],
        dependencies=[Depends(require_scene_api)],
        include_in_schema=settings.scene_api_enabled,
    )
    async def scene_toolchain() -> ToolchainStatus:
        return toolchain_status()

    @app.post(
        "/api/v1/scenes/jobs",
        response_model=SceneJob,
        tags=["scenes"],
        dependencies=[Depends(require_scene_api)],
        include_in_schema=settings.scene_api_enabled,
    )
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

    @app.get(
        "/api/v1/scenes/jobs/{job_id}",
        response_model=SceneJob,
        tags=["scenes"],
        dependencies=[Depends(require_scene_api)],
        include_in_schema=settings.scene_api_enabled,
    )
    async def get_scene_job(job_id: str) -> SceneJob:
        try:
            return SceneJobStore().load(job_id)
        except (FileNotFoundError, ValueError):
            raise HTTPException(status_code=404, detail="Scene job not found.") from None

    @app.post(
        "/api/v1/scenes/jobs/{job_id}/run",
        response_model=SceneJob,
        tags=["scenes"],
        dependencies=[Depends(require_scene_api)],
        include_in_schema=settings.scene_api_enabled,
    )
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

    @app.get(
        "/api/v1/scenes/jobs/{job_id}/asset",
        tags=["scenes"],
        dependencies=[Depends(require_scene_api)],
        include_in_schema=settings.scene_api_enabled,
    )
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
