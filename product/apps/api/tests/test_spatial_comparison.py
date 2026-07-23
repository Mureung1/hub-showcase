import sqlite3
from pathlib import Path

from localtwin_api.canonical_db import SCHEMA
from localtwin_api.spatial_comparison import compare_spatial_to_official, format_markdown_report


def seed_comparison_database(path: Path) -> None:
    with sqlite3.connect(path) as connection:
        connection.executescript(SCHEMA)
        connection.execute(
            "INSERT INTO data_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "source",
                "test",
                "fixture",
                "fixture",
                "https://example.test",
                "2026-07-23T00:00:00Z",
                "20254",
                1,
                "0" * 64,
                "data/raw/fixture.csv",
            ),
        )
        connection.execute(
            "INSERT INTO markets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "M1",
                "테스트",
                None,
                None,
                None,
                None,
                None,
                None,
                None,
                None,
                "EPSG:4326",
                None,
                "source",
            ),
        )
        connection.executemany(
            """
            INSERT INTO store_points VALUES
            (?, ?, NULL, NULL, ?, NULL, ?, NULL, ?, NULL, ?, ?, 'EPSG:4326', ?)
            """,
            [
                ("cafe", "카페", "음식", "비알코올", "카페", 126.9, 37.5, "source"),
                ("bakery", "빵집", "음식", "제과", "베이커리", 126.91, 37.51, "source"),
            ],
        )
        connection.executemany(
            "INSERT INTO store_market_links VALUES (?, 'M1', 'point_in_polygon', 0, 'source')",
            [("cafe",), ("bakery",)],
        )
        connection.executemany(
            """
            INSERT INTO store_metrics VALUES
            ('M1', '20254', ?, ?, NULL, ?, NULL, NULL, NULL, NULL, NULL, 'source')
            """,
            [("CS100010", "카페", 3), ("CS100005", "베이커리", 1)],
        )


def test_spatial_comparison_reports_matching_categories_and_limitations(tmp_path: Path) -> None:
    database = tmp_path / "canonical.db"
    seed_comparison_database(database)

    report = compare_spatial_to_official(database, "20254", market_codes=("M1",))

    assert report.linked_store_count == 2
    rows = {(row.market_code, row.category): row for row in report.rows}
    assert rows[("M1", "카페")].spatial_store_count == 1
    assert rows[("M1", "카페")].official_store_count == 3
    assert rows[("M1", "카페")].difference == -2
    assert rows[("M1", "베이커리")].difference == 0
    assert "공식 집계" in format_markdown_report(report)
