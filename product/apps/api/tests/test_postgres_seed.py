import sqlite3
from pathlib import Path

import pytest
from sqlalchemy import text
from test_database import alembic_config

from alembic import command
from localtwin_api.canonical_db import SCHEMA
from localtwin_api.database import create_database_engine
from localtwin_api.postgres_seed import (
    effective_chunk_size,
    normalize_raw_path,
    seed_canonical,
    validate_source_url,
)


def make_source_database(path: Path, raw_path: str) -> None:
    with sqlite3.connect(path) as connection:
        connection.executescript(SCHEMA)
        connection.execute(
            "INSERT INTO data_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "source-1",
                "test",
                "areas",
                "official",
                "https://example.test/areas",
                "2026-07-15T00:00:00Z",
                "20251",
                1,
                "0" * 64,
                raw_path,
            ),
        )
        connection.execute(
            "INSERT INTO markets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "M1",
                "테스트 상권",
                "A",
                "골목상권",
                "11440",
                "마포구",
                "A1",
                "연남동",
                190000,
                450000,
                "EPSG:5181",
                1000,
                "source-1",
            ),
        )
        connection.execute(
            "INSERT INTO store_metrics VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("M1", "20251", "CS100010", "카페", 5, 4, 1, 2.5, 1, 1.2, 0, "source-1"),
        )
        connection.execute(
            "INSERT INTO sales_metrics VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "M1",
                "20251",
                "CS100010",
                "카페",
                1000,
                10,
                700,
                300,
                10,
                20,
                30,
                40,
                50,
                60,
                "source-1",
            ),
        )
        connection.execute(
            "INSERT INTO flow_metrics VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("M1", "20251", 120, 10, 20, 30, 20, 20, 20, "source-1"),
        )
        connection.execute(
            "INSERT INTO store_points VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "S1",
                "가게",
                None,
                "L1",
                "생활",
                "M1",
                "음식",
                "S1",
                "카페",
                "서울시 마포구",
                126.9,
                37.5,
                "EPSG:4326",
                "source-1",
            ),
        )
        connection.execute(
            "INSERT INTO permit_businesses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "restaurants",
                "P1",
                "식당",
                "01",
                "영업",
                "20260715",
                None,
                "서울시 마포구",
                190000,
                450000,
                "EPSG:5174",
                "source-1",
            ),
        )
        connection.execute(
            "INSERT INTO market_geometries VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                "M1",
                '{"type":"Polygon","coordinates":[]}',
                126.9,
                37.5,
                "EPSG:5181",
                "EPSG:4326",
                "source-1",
            ),
        )
        connection.execute(
            "INSERT INTO store_market_links VALUES (?, ?, ?, ?, ?)",
            ("S1", "M1", "point_in_polygon", 0, "source-1"),
        )
        connection.commit()


def migrated_engine(path: Path):
    database_url = f"sqlite:///{path}"
    command.upgrade(alembic_config(database_url), "head")
    return create_database_engine(database_url, require_postgresql=False)


def test_seed_is_idempotent_and_normalizes_provenance(tmp_path: Path) -> None:
    source_path = tmp_path / "source.db"
    raw_path = str(tmp_path / "data" / "raw" / "areas.json")
    make_source_database(source_path, raw_path)
    engine = migrated_engine(tmp_path / "target.db")

    first = seed_canonical(source_path, engine, chunk_size=1)
    second = seed_canonical(source_path, engine, chunk_size=2)

    assert (
        first.target_counts
        == second.target_counts
        == {
            "data_sources": 1,
            "markets": 1,
            "market_geometries": 1,
            "store_metrics": 1,
            "sales_metrics": 1,
            "flow_metrics": 1,
            "store_points": 1,
            "store_market_links": 1,
            "permit_businesses": 1,
        }
    )
    assert second.target_category_counts == {"store_metrics": 1, "sales_metrics": 1}
    with engine.connect() as connection:
        assert connection.scalar(text("SELECT raw_path FROM data_sources")) == (
            "data/raw/areas.json"
        )
    engine.dispose()


def test_unsafe_absolute_raw_path_rolls_back_seed(tmp_path: Path) -> None:
    source_path = tmp_path / "source.db"
    make_source_database(source_path, "C:/private/areas.json")
    engine = migrated_engine(tmp_path / "target.db")

    with pytest.raises(ValueError, match="repository-relative"):
        seed_canonical(source_path, engine)

    with engine.connect() as connection:
        assert connection.scalar(text("SELECT COUNT(*) FROM data_sources")) == 0
        assert connection.scalar(text("SELECT COUNT(*) FROM markets")) == 0
    engine.dispose()


def test_provenance_validation_rejects_secret_urls_and_parent_paths() -> None:
    with pytest.raises(ValueError, match="query secrets"):
        validate_source_url("https://example.test/data?serviceKey=secret")
    with pytest.raises(ValueError, match="repository-relative"):
        normalize_raw_path("../private/data.json")


def test_large_requested_chunk_is_capped_by_statement_parameter_budget() -> None:
    assert effective_chunk_size("sales_metrics", 5_000, "postgresql") == 4_000
    assert effective_chunk_size("store_points", 5_000, "postgresql") == 4_285
    assert effective_chunk_size("markets", 100, "postgresql") == 100


def test_incremental_seed_restores_selected_tables_and_checks_all_counts(tmp_path: Path) -> None:
    source_path = tmp_path / "source.db"
    make_source_database(source_path, "data/raw/areas.json")
    engine = migrated_engine(tmp_path / "target.db")
    seed_canonical(source_path, engine)
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM store_market_links"))
        connection.execute(text("DELETE FROM market_geometries"))

    report = seed_canonical(
        source_path,
        engine,
        tables=("market_geometries", "store_market_links"),
    )

    assert report.target_counts == report.source_counts
    assert report.target_counts["market_geometries"] == 1
    assert report.target_counts["store_market_links"] == 1
    engine.dispose()
