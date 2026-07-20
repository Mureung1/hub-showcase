from fastapi import APIRouter

from app.services.holiday_client import get_today_holiday

router = APIRouter(tags=["holiday"])


@router.get("/holiday")
def get_holiday():
    """오늘의 공휴일/기념일 정보 조회 (공공데이터포털 특일정보 API 연동).

    외부 API가 실패해도 서버 전체가 죽지 않도록 예외를 잡아서
    "오늘은 특별한 날 아님" 정도로 안전하게 폴백함.
    """
    try:
        name = get_today_holiday()
    except Exception as e:
        return {"is_special_day": False, "name": None, "error": str(e)}

    return {
        "is_special_day": name is not None,
        "name": name,
    }
