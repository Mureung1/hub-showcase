from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from localtwin_api.market_search import MarketSearchRepository, MarketSearchResponse


def create_search_router(get_session_factory: Callable[[], sessionmaker[Session]]) -> APIRouter:
    router = APIRouter(tags=["search"])

    @router.get("/api/v1/search", response_model=MarketSearchResponse)
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
            with get_session_factory()() as session:
                results = MarketSearchRepository(session).search(
                    normalized_query,
                    category=normalized_category,
                    limit=limit,
                )
        except (RuntimeError, SQLAlchemyError):
            raise HTTPException(status_code=503, detail="Search service is unavailable.") from None
        return MarketSearchResponse(query=normalized_query, results=results)

    return router
