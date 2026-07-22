from fastapi import APIRouter
from pydantic import BaseModel

from app.services.temperature_suggester import suggest_temperature

router = APIRouter(tags=["suggest"])


class SuggestRequest(BaseModel):
    complaint: str


@router.post("/suggest-temperature")
def suggest(request: SuggestRequest):
    """하소연 내용을 분석해 어울리는 감정 온도를 1차 제안 (반복 회피 로직 포함).

    외부 API가 실패해도 서버가 죽지 않도록 예외를 잡아서 기본값(50도)으로 폴백함.
    """
    try:
        return suggest_temperature(request.complaint)
    except Exception as e:
        return {"suggested_temperature": 50, "category": "mid", "reason": None, "error": str(e)}
