from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from localtwin_api.config import get_settings
from localtwin_api.market_score import (
    MarketScoreRequest,
    MarketScoreResponse,
    evaluate_market_score,
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

    return app


app = create_app()
