from pathlib import Path

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
