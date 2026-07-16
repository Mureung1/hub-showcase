from fastapi import APIRouter

from app.api.deps import CurrentUserId, UserClient
from app.schemas.user_interest import UserInterestItem, UserInterestsResponse

router = APIRouter(prefix="/user-interests", tags=["user-interests"])

# 저장 시점 이후 launch_status가 바뀌어도 조회에는 노출하되 selectable만 갱신한다.
SELECTABLE = {"active", "curated_only"}


@router.get("", response_model=UserInterestsResponse)
def get_user_interests(
    _: CurrentUserId,
    client: UserClient,
) -> UserInterestsResponse:
    """저장된 관심사와 온보딩 완료 여부를 반환한다.

    RLS가 user_id = auth.uid()로 본인 행만 반환하도록 보장한다.
    """
    result = (
        client.table("user_interests")
        .select("interests(id,name,display_order,launch_status)")
        .execute()
    )
    items = [
        UserInterestItem(
            **row["interests"],
            selectable=row["interests"]["launch_status"] in SELECTABLE,
        )
        for row in result.data or []
    ]
    items.sort(key=lambda item: (item.display_order, str(item.id)))
    return UserInterestsResponse(
        has_completed_onboarding=bool(items),
        interests=items,
    )
