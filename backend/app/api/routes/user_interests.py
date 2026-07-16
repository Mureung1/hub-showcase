from fastapi import APIRouter

from app.api.deps import CurrentUserId, UserClient
from app.core.errors import ApiError
from app.schemas.user_interest import (
    ReplaceUserInterestsRequest,
    ReplaceUserInterestsResponse,
    UserInterestItem,
    UserInterestsResponse,
)

router = APIRouter(prefix="/user-interests", tags=["user-interests"])

# 저장 시점 이후 launch_status가 바뀌어도 조회에는 노출하되 selectable만 갱신한다.
SELECTABLE = {"active", "curated_only"}

# RPC가 raise하는 검증 오류 마커. SQL 원문·내부 메시지는 그대로 노출하지 않고 422로 변환한다.
RPC_VALIDATION_ERRORS = {
    "INTEREST_COUNT_OUT_OF_RANGE",
    "INTEREST_IDS_DUPLICATED",
    "INTEREST_NOT_SELECTABLE",
}


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


@router.post("", response_model=ReplaceUserInterestsResponse, status_code=201)
def replace_user_interests(
    body: ReplaceUserInterestsRequest,
    _: CurrentUserId,
    client: UserClient,
) -> ReplaceUserInterestsResponse:
    """관심사를 전체 교체한다. 최초 저장과 재저장 모두 이 RPC를 쓴다.

    user_id는 RPC 인자로 보내지 않는다. RPC 내부에서 auth.uid()로 얻는다.
    """
    ids = [str(value) for value in body.interest_ids]
    try:
        result = client.rpc(
            "replace_user_interests",
            {"p_interest_ids": ids},
        ).execute()
    except Exception as exc:  # noqa: BLE001 - RPC 검증 오류를 422로 변환
        marker = next(
            (value for value in RPC_VALIDATION_ERRORS if value in str(exc)),
            None,
        )
        if marker is not None:
            raise ApiError(422) from exc
        raise
    return ReplaceUserInterestsResponse(interest_ids=result.data or ids)
