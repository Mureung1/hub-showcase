from fastapi import APIRouter

from localtwin_api.market_score import (
    MarketScoreRequest,
    MarketScoreResponse,
    evaluate_market_score,
)

router = APIRouter(prefix="/api/v1/scores", tags=["analysis"])


@router.post("/evaluate", response_model=MarketScoreResponse)
async def score_market(request: MarketScoreRequest) -> MarketScoreResponse:
    return evaluate_market_score(request)
