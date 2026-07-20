from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, sessionmaker

from localtwin_api.config import Settings, get_settings
from localtwin_api.database import create_database_engine, create_session_factory
from localtwin_api.routers.catalog import router as catalog_router
from localtwin_api.routers.market import create_market_router
from localtwin_api.routers.scenes import create_scene_router
from localtwin_api.routers.scores import router as scores_router
from localtwin_api.routers.system import create_system_router


def create_app(
    settings: Settings | None = None,
    *,
    search_session_factory: sessionmaker[Session] | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title=settings.app_name)
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

    app.include_router(catalog_router)
    app.include_router(scores_router)
    app.include_router(create_system_router(get_search_session_factory))
    app.include_router(create_market_router(get_search_session_factory))
    app.include_router(create_scene_router(settings))
    return app


app = create_app()
