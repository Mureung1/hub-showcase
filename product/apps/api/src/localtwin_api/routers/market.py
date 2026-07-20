from collections.abc import Callable

from fastapi import APIRouter
from sqlalchemy.orm import Session, sessionmaker

from localtwin_api.routers.admin_area import create_admin_area_router
from localtwin_api.routers.analysis import create_analysis_router
from localtwin_api.routers.nearby import create_nearby_router
from localtwin_api.routers.search import create_search_router


def create_market_router(get_session_factory: Callable[[], sessionmaker[Session]]) -> APIRouter:
    router = APIRouter()
    router.include_router(create_analysis_router(get_session_factory))
    router.include_router(create_search_router(get_session_factory))
    router.include_router(create_nearby_router(get_session_factory))
    router.include_router(create_admin_area_router(get_session_factory))
    return router
