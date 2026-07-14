from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """백엔드 설정. backend/.env에서 읽는다."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str

    # RLS를 우회한다. 사용자와 무관한 배치 작업(RSS 수집 등)에만 쓴다.
    supabase_secret_key: str

    # 사용자 요청을 대신 보낼 때 사용자 JWT와 함께 쓴다. RLS가 적용된다.
    supabase_publishable_key: str


settings = Settings()
