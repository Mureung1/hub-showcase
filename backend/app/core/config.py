from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """백엔드 설정. backend/.env에서 읽는다."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str

    # RLS를 우회한다. 사용자와 무관한 배치 작업(RSS 수집 등)에만 쓴다.
    supabase_secret_key: str

    # 사용자 요청을 대신 보낼 때 사용자 JWT와 함께 쓴다. RLS가 적용된다.
    supabase_publishable_key: str

    # CORS 허용 오리진. 개발 중엔 Vite 프록시를 쓰므로 CORS가 거의 필요 없지만,
    # 프론트가 프록시 없이 직접 호출하는 경우를 위해 열어둔다. 쉼표로 구분한다.
    cors_allow_origins: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]


settings = Settings()
