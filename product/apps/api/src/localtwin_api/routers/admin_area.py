from collections.abc import Callable

from fastapi import APIRouter, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from localtwin_api.admin_area_analysis import (
    AdminAreaAnalysisRepository,
    AdminAreaBackgroundResponse,
)


def create_admin_area_router(get_session_factory: Callable[[], sessionmaker[Session]]) -> APIRouter:
    router = APIRouter(tags=["analysis"])

    @router.get(
        "/api/v1/markets/{market_id}/admin-area-background",
        response_model=AdminAreaBackgroundResponse,
    )
    def admin_area_background(market_id: str) -> AdminAreaBackgroundResponse:
        try:
            with get_session_factory()() as session:
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

    return router
