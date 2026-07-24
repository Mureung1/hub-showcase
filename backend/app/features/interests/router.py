from fastapi import APIRouter

from app.infrastructure.supabase import create_admin_client
from app.features.interests.schemas import Interest

router = APIRouter(tags=["interests"])

# 사용자가 선택할 수 있는 관심사만 노출한다.
# hidden과 preparing은 응답에 포함하지 않는다. 프론트에서 숨기면
# 네트워크 응답에는 그대로 실려 나가므로 백엔드에서 걸러야 한다.
SELECTABLE_LAUNCH_STATUSES = ["active", "curated_only"]


@router.get("/interests", response_model=list[Interest])
def list_interests() -> list[Interest]:
    """선택 가능한 관심사 목록을 display_order 순으로 반환한다.

    interests는 공개 마스터 데이터라 사용자 인증이 필요 없다.
    """
    client = create_admin_client()
    response = (
        client.table("interests")
        .select("*")
        .in_("launch_status", SELECTABLE_LAUNCH_STATUSES)
        .order("display_order")
        .execute()
    )
    return [Interest(**row) for row in response.data]
