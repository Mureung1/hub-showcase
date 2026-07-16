from fastapi import APIRouter

router = APIRouter(tags=["weather"])


@router.get("/weather")
def get_weather():
    """오늘의 날씨 정보 조회.

    TODO: 지금은 더미 응답. 나중에 기상청 단기예보 API로 교체 예정.
    위경도 → 격자좌표 변환 로직도 이 자리에 추가될 예정.
    """
    return {
        "label": "흐리고 비",
        "temp": "18°C",
    }
