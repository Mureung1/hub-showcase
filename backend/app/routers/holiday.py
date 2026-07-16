from fastapi import APIRouter

router = APIRouter(tags=["holiday"])


@router.get("/holiday")
def get_holiday():
    """오늘의 공휴일/기념일 정보 조회.

    TODO: 지금은 더미 응답. 나중에 공공데이터포털 특일정보 API로 교체 예정.
    응답 형태(키 이름)는 그대로 유지하고, 안의 값만 실제 API 응답으로 바꾸면 됨.
    """
    return {
        "is_special_day": True,
        "name": "삼겹살데이",
    }
