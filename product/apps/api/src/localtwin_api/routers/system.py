from collections.abc import Callable
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from localtwin_api.db_models import Market


class HealthResponse(BaseModel):
    status: Literal["ok"]


class ReadinessResponse(BaseModel):
    status: Literal["ready"]


def create_system_router(get_session_factory: Callable[[], sessionmaker[Session]]) -> APIRouter:
    router = APIRouter(tags=["system"])

    @router.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return HealthResponse(status="ok")

    @router.get("/ready", response_model=ReadinessResponse)
    def readiness() -> ReadinessResponse:
        try:
            with get_session_factory()() as session:
                market_code = session.scalar(select(Market.market_code).limit(1))
            if market_code is None:
                raise RuntimeError("Canonical market data is empty.")
        except (RuntimeError, SQLAlchemyError):
            raise HTTPException(status_code=503, detail="Service is not ready.") from None
        return ReadinessResponse(status="ready")

    return router
