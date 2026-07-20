from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from alembic import command
from localtwin_api.config import Settings
from localtwin_api.database import create_database_engine, normalize_postgresql_url
from localtwin_api.db_models import DataSource, Market
from localtwin_api.repositories import CanonicalRepository


def alembic_config(database_url: str) -> Config:
    api_root = Path(__file__).resolve().parents[1]
    config = Config(str(api_root / "alembic.ini"))
    config.set_main_option("script_location", str(api_root / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def test_settings_requires_database_url_without_fallback() -> None:
    settings = Settings(_env_file=None, database_url=None)

    with pytest.raises(RuntimeError, match="DATABASE_URL is required"):
        settings.require_database_url()


def test_settings_rejects_sqlite_product_url() -> None:
    settings = Settings(_env_file=None, database_url="sqlite:///local.db")

    with pytest.raises(RuntimeError, match="must use PostgreSQL"):
        settings.require_database_url()


def test_product_engine_rejects_sqlite() -> None:
    with pytest.raises(ValueError, match="must use PostgreSQL"):
        create_database_engine("sqlite:///:memory:")


def test_plain_supabase_url_uses_psycopg3_driver() -> None:
    normalized = normalize_postgresql_url("postgresql://user:password@example.test/postgres")

    assert normalized == "postgresql+psycopg://user:password@example.test/postgres"


def test_alembic_upgrade_downgrade_and_reupgrade(tmp_path: Path) -> None:
    database_url = f"sqlite:///{tmp_path / 'migration.db'}"
    config = alembic_config(database_url)

    command.upgrade(config, "head")
    engine = create_database_engine(database_url, require_postgresql=False)
    inspector = inspect(engine)
    assert set(inspector.get_table_names()) >= {
        "alembic_version",
        "data_sources",
        "markets",
        "market_geometries",
        "store_metrics",
        "sales_metrics",
        "flow_metrics",
        "store_points",
        "store_market_links",
        "permit_businesses",
    }
    assert inspector.get_pk_constraint("store_metrics")["constrained_columns"] == [
        "market_code",
        "period",
        "category_code",
    ]
    engine.dispose()

    command.downgrade(config, "base")
    command.upgrade(config, "head")
    engine = create_database_engine(database_url, require_postgresql=False)
    assert "markets" in inspect(engine).get_table_names()
    engine.dispose()


def test_repository_reads_market_and_counts(tmp_path: Path) -> None:
    database_url = f"sqlite:///{tmp_path / 'repository.db'}"
    command.upgrade(alembic_config(database_url), "head")
    engine = create_database_engine(database_url, require_postgresql=False)

    with Session(engine) as session:
        session.add(
            DataSource(
                snapshot_id="source-1",
                provider="test",
                dataset="areas",
                source_type="official",
                source_url="https://example.test/areas",
                collected_at="2026-07-15T00:00:00Z",
                period=None,
                row_count=1,
                sha256="0" * 64,
                raw_path="data/raw/areas.json",
            )
        )
        session.add(
            Market(
                market_code="M1",
                market_name="테스트 상권",
                market_type_code="A",
                market_type_name="골목상권",
                district_code="11440",
                district_name="마포구",
                admin_dong_code="A1",
                admin_dong_name="연남동",
                source_x=190000,
                source_y=450000,
                coordinate_system="EPSG:5181",
                area_sqm=1000,
                source_snapshot_id="source-1",
            )
        )
        session.commit()

        repository = CanonicalRepository(session)
        assert repository.get_market_by_code("M1").market_name == "테스트 상권"
        assert repository.count_rows()["markets"] == 1
        assert repository.category_code_counts() == {
            "store_metrics": 0,
            "sales_metrics": 0,
        }

    engine.dispose()
