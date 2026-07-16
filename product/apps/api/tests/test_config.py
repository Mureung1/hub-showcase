from pathlib import Path

import pytest
from pydantic import SecretStr

from localtwin_api.config import PRODUCT_ENV_FILE, Settings


def test_product_env_path_is_anchored_to_product_root() -> None:
    expected = Path(__file__).resolve().parents[3] / ".env"

    assert PRODUCT_ENV_FILE == expected


def test_kosis_api_key_is_server_only_secret() -> None:
    settings = Settings(_env_file=None, kosis_api_key="test-only-key")

    assert isinstance(settings.kosis_api_key, SecretStr)
    assert settings.kosis_api_key.get_secret_value() == "test-only-key"
    assert "test-only-key" not in repr(settings)


def test_development_uses_only_local_cors_origins() -> None:
    settings = Settings(
        _env_file=None,
        environment="development",
        cors_origins_local="http://127.0.0.1:5173,http://localhost:5173/",
        cors_origins_server="https://localtwin-product.vercel.app",
    )

    assert settings.cors_origin_list == [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ]


def test_production_uses_only_server_cors_origins() -> None:
    settings = Settings(
        _env_file=None,
        environment="production",
        cors_origins_local="http://localhost:5173",
        cors_origins_server="https://localtwin-product.vercel.app/",
    )

    assert settings.cors_origin_list == ["https://localtwin-product.vercel.app"]


@pytest.mark.parametrize(
    "server_origins",
    ["", "http://localhost:5173", "http://127.0.0.1:5173", "*"],
)
def test_production_rejects_missing_local_or_invalid_server_origins(
    server_origins: str,
) -> None:
    settings = Settings(
        _env_file=None,
        environment="production",
        cors_origins_server=server_origins,
    )

    with pytest.raises(RuntimeError):
        _ = settings.cors_origin_list
