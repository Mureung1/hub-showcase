from collections.abc import Callable
from time import perf_counter
from typing import Annotated, Literal, cast

from fastapi import APIRouter, HTTPException, Query, Response
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
        response: Response,
        radius: Annotated[int, Query()] = 300,
        category: Annotated[str | None, Query(max_length=60)] = None,
        scope: Annotated[Literal["radius", "market"], Query()] = "radius",
        market_id: Annotated[str | None, Query(max_length=32)] = None,
        taxonomy_node_id: Annotated[str | None, Query(max_length=64)] = None,
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
                repository = NearbyStoreRepository(session)
                started = perf_counter()
                if scope == "market":
                    if not market_id:
                        raise HTTPException(
                            status_code=422,
                            detail="market_id is required when scope is market.",
                        )
                    result = repository.market(
                        market_id=market_id,
                        latitude=latitude,
                        longitude=longitude,
                        radius=validated_radius,
                        category=normalized_category,
                        taxonomy_node_id=taxonomy_node_id,
                    )
                else:
                    result = repository.nearby(
                        latitude=latitude,
                        longitude=longitude,
                        radius=validated_radius,
                        category=normalized_category,
                    )
                response.headers["Server-Timing"] = ", ".join(
                    [
                        f"db;dur={repository.server_timing.get('db', 0):.1f}",
                        f"build;dur={repository.server_timing.get('build', 0):.1f}",
                        f"total;dur={(perf_counter() - started) * 1000:.1f}",
                    ]
                )
                return result
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
