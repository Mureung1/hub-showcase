from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    """서버가 정상적으로 떠 있는지 확인용 엔드포인트"""
    return {"status": "ok"}
