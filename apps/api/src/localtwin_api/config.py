from functools import lru_cache
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "LocalTwin API"
    environment: str = "development"
    database_url: str = "sqlite:///./data/localtwin.db"
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    public_data_service_key: SecretStr | None = None
    seoul_open_data_key: SecretStr | None = None
    scene_api_enabled: bool = False
    scene_worker_mode: Literal["host", "docker"] = "host"
    scene_docker_image: str = "ghcr.io/nerfstudio-project/nerfstudio:1.1.5"

    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
