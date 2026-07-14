from fastapi import APIRouter

from app.db.supabase import create_admin_client
from app.schemas.interest import Interest

router = APIRouter(tags=["interests"])


@router.get("/interests", response_model=list[Interest])
def list_interests() -> list[Interest]:
    """관심사 목록을 display_order 순으로 반환한다.

    interests는 공개 마스터 데이터라 사용자 인증이 필요 없다.
    """
    client = create_admin_client()
    response = client.table("interests").select("*").order("display_order").execute()
    return [Interest(**row) for row in response.data]
