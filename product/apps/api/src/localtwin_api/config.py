from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import parse_qs, urlparse

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

PRODUCT_ROOT = Path(__file__).resolve().parents[4]
PRODUCT_ENV_FILE = PRODUCT_ROOT / ".env"


class Settings(BaseSettings):
    app_name: str = "LocalTwin API"
    environment: Literal["development", "test", "staging", "production"] = "development"
    database_url: SecretStr | None = None
    cors_origins_local: str = "http://127.0.0.1:5173,http://localhost:5173"
    cors_origins_server: str = ""
    public_data_service_key: SecretStr | None = None
    seoul_open_data_key: SecretStr | None = None
    kosis_api_key: SecretStr | None = None
    scene_api_enabled: bool = False
    scene_worker_mode: Literal["host", "docker"] = "host"
    scene_docker_image: str = "ghcr.io/nerfstudio-project/nerfstudio:1.1.5"

    model_config = SettingsConfigDict(
        env_file=PRODUCT_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        server_environment = self.environment in {"staging", "production"}
        configured_origins = (
            self.cors_origins_server if server_environment else self.cors_origins_local
        )
        origins = [
            origin.strip().rstrip("/") for origin in configured_origins.split(",") if origin.strip()
        ]
        if server_environment and not origins:
            raise RuntimeError("CORS_ORIGINS_SERVER is required outside local development.")
        for origin in origins:
            parsed = urlparse(origin)
            if parsed.scheme not in {"http", "https"} or not parsed.hostname:
                raise RuntimeError(f"Invalid CORS origin: {origin}")
            if server_environment and parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
                raise RuntimeError("CORS_ORIGINS_SERVER must not include a local origin.")
        return origins

    def require_database_url(self) -> str:
        if self.database_url is None or not self.database_url.get_secret_value().strip():
            raise RuntimeError("DATABASE_URL is required for PostgreSQL operations.")
        database_url = self.database_url.get_secret_value()
        if not database_url.strip().lower().startswith(("postgresql://", "postgresql+psycopg://")):
            raise RuntimeError("DATABASE_URL must use PostgreSQL for product operations.")
        if self.environment in {"staging", "production"}:
            ssl_modes = parse_qs(urlparse(database_url).query).get("sslmode", [])
            if "require" not in {mode.lower() for mode in ssl_modes}:
                raise RuntimeError("DATABASE_URL must require SSL outside local development.")
        return database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
