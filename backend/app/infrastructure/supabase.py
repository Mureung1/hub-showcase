from supabase import Client, create_client

from app.core.config import settings


def create_admin_client() -> Client:
    """secret 키를 쓰는 클라이언트. RLS를 우회한다.

    사용자와 무관한 배치 작업(RSS 수집, 콘텐츠 저장)에만 쓴다.
    사용자 데이터를 다룰 때는 create_user_client를 쓴다.
    """
    return create_client(settings.supabase_url, settings.supabase_secret_key)


def create_user_client(access_token: str) -> Client:
    """사용자의 Supabase 세션 토큰으로 요청하는 클라이언트.

    publishable 키 + 사용자 JWT를 함께 보내므로 RLS가 그대로 적용된다.
    사용자 데이터(user_interests, mission_records)는 이 클라이언트로 접근한다.
    """
    client = create_client(settings.supabase_url, settings.supabase_publishable_key)
    client.postgrest.auth(access_token)
    return client
