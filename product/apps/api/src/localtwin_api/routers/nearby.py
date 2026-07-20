from collections.abc import Callable
from typing import Annotated, cast

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from localtwin_api.nearby_search import (
    ALLOWED_NEARBY_RADII,
    NearbyRadius,
    NearbyStoreRepository,
    NearbyStoreResponse,
    UnsupportedAnalysisAreaError,
)


def create_nearby_router(get_session_factory: Callable[[], sessionmaker[Session]]) -> APIRouter:
    router = APIRouter(tags=["analysis"])

    @router.get("/api/v1/stores/nearby", response_model=NearbyStoreResponse)
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
            with get_session_factory()() as session:
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

    return router
