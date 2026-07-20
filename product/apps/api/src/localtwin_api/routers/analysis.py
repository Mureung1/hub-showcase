from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from localtwin_api.market_analysis import (
    AnalysisPeriodsResponse,
    MarketAnalysisRepository,
    MarketAnalysisResponse,
)
from localtwin_api.product_catalog import Category


def create_analysis_router(get_session_factory: Callable[[], sessionmaker[Session]]) -> APIRouter:
    router = APIRouter(tags=["analysis"])

    @router.get("/api/v1/analysis/periods", response_model=AnalysisPeriodsResponse)
    def analysis_periods(category: Category) -> AnalysisPeriodsResponse:
        try:
            with get_session_factory()() as session:
                return MarketAnalysisRepository(session).available_periods(category)
        except LookupError:
            raise HTTPException(
                status_code=404, detail="No complete analysis period is available."
            ) from None
        except (RuntimeError, SQLAlchemyError):
            raise HTTPException(
                status_code=503, detail="Analysis period service is unavailable."
            ) from None

    @router.get("/api/v1/markets/{market_id}", response_model=MarketAnalysisResponse)
    async def market_analysis(
        market_id: str,
        category: Category,
        period: Annotated[str, Query(pattern=r"^\d{5}$")],
    ) -> MarketAnalysisResponse:
        try:
            with get_session_factory()() as session:
                return MarketAnalysisRepository(session).get(market_id, category, period)
        except LookupError:
            raise HTTPException(
                status_code=404, detail="Market analysis is not available for this input."
            ) from None
        except (RuntimeError, SQLAlchemyError):
            raise HTTPException(
                status_code=503, detail="Market analysis service is unavailable."
            ) from None

    return router
