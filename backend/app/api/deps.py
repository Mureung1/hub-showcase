"""요청 의존성. 인증과 사용자 클라이언트를 제공한다."""

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client

from app.core.errors import ApiError
from app.db.supabase import create_admin_client, create_user_client

# auto_error=False로 두어 토큰 누락도 우리 공통 에러 형식(401)으로 처리한다.
_bearer_scheme = HTTPBearer(auto_error=False)


def get_access_token(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)
    ],
) -> str:
    if credentials is None or not credentials.credentials:
        raise ApiError(401)
    return credentials.credentials


def get_current_user_id(token: Annotated[str, Depends(get_access_token)]) -> str:
    """access token을 Supabase Auth로 검증하고 사용자 id를 반환한다.

    익명 사용자도 정식 사용자와 동일하게 검증된다.
    토큰이 없거나 만료·위조면 401.
    """
    client = create_admin_client()
    try:
        response = client.auth.get_user(token)
    except Exception as exc:  # noqa: BLE001 - Supabase 인증 오류를 401로 변환
        raise ApiError(401) from exc

    if response is None or response.user is None:
        raise ApiError(401)

    return response.user.id


def get_user_client(token: Annotated[str, Depends(get_access_token)]) -> Client:
    """사용자 JWT가 적용된 Supabase 클라이언트. RLS가 그대로 적용된다.

    사용자 데이터(user_interests, mission_records) 접근에 쓴다.
    """
    return create_user_client(token)


CurrentUserId = Annotated[str, Depends(get_current_user_id)]
UserClient = Annotated[Client, Depends(get_user_client)]
