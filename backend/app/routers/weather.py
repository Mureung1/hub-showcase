from fastapi import APIRouter

from app.services.weather_client import get_current_weather

router = APIRouter(tags=["weather"])


@router.get("/weather")
def get_weather():
    """오늘의 날씨 정보 조회 (기상청 초단기실황 API 연동).

    외부 API가 실패해도 서버 전체가 죽지 않도록 예외를 잡아서 안전하게 폴백함.
    """
    try:
        return get_current_weather()
    except Exception as e:
        return {"label": "정보 없음", "temp": None, "error": str(e)}
