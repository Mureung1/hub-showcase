import sqlite3
from pathlib import Path

import shapefile
from pyproj import CRS

from localtwin_api.canonical_db import SCHEMA
from localtwin_api.spatial_import import import_market_spatial_links, read_market_snapshot


def write_market_shapefile(path: Path) -> None:
    path.parent.mkdir(parents=True)
    with shapefile.Writer(str(path)) as writer:
        writer.field("TRDAR_CD", "C", size=20)
        writer.poly(
            [
                [
                    [126.9, 37.5],
                    [126.905, 37.51],
                    [126.91, 37.5],
                    [126.9, 37.5],
                ]
            ]
        )
        writer.record("M1")
    path.with_suffix(".prj").write_text(CRS.from_epsg(4326).to_wkt(), encoding="utf-8")
    path.with_suffix(".cpg").write_text("UTF-8", encoding="ascii")


def seed_canonical(path: Path) -> None:
    path.parent.mkdir(parents=True)
    with sqlite3.connect(path) as connection:
        connection.executescript(SCHEMA)
        connection.execute(
            "INSERT INTO data_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "store-source",
                "test",
                "stores",
                "official",
                "https://example.test/stores",
                "2026-07-16T00:00:00Z",
                "202603",
                3,
                "0" * 64,
                "data/raw/stores.csv",
            ),
        )
        connection.execute(
            "INSERT INTO markets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "M1",
                "테스트 상권",
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
                "store-source",
            ),
        )
        stores = (
            ("inside", "내부 점포", 126.905, 37.505),
            ("boundary", "경계 점포", 126.9, 37.5),
            ("outside", "bbox 내부 polygon 외부", 126.901, 37.509),
        )
        connection.executemany(
            """
            INSERT INTO store_points VALUES
            (?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, 'EPSG:4326', ?)
            """,
            [
                (store_id, name, longitude, latitude, "store-source")
                for store_id, name, longitude, latitude in stores
            ],
        )


def test_read_market_snapshot_validates_selected_geometry_without_a_database(
    tmp_path: Path,
) -> None:
    shapefile_path = tmp_path / "data/raw/areas/markets.shp"
    write_market_shapefile(shapefile_path)

    snapshot = read_market_snapshot(shapefile_path, ("M1",))

    assert snapshot.source_crs == "EPSG:4326"
    assert snapshot.target_crs == "EPSG:4326"
    assert snapshot.source_row_count == 1
    assert tuple(snapshot.geometries) == ("M1",)
    assert snapshot.geometries["M1"].geom_type == "Polygon"


def test_spatial_import_links_inside_and_boundary_points_idempotently(
    tmp_path: Path, monkeypatch: object
) -> None:
    root = tmp_path / "product"
    shapefile_path = root / "data/raw/areas/markets.shp"
    database = root / "data/processed/localtwin.db"
    write_market_shapefile(shapefile_path)
    seed_canonical(database)
    monkeypatch.setattr("localtwin_api.spatial_import.repository_root", lambda: root)
    monkeypatch.setattr("localtwin_api.bulk_import.repository_root", lambda: root)

    first = import_market_spatial_links(database, shapefile_path, market_codes=("M1",))
    second = import_market_spatial_links(database, shapefile_path, market_codes=("M1",))

    assert first == second
    assert second.source_crs == "EPSG:4326"
    assert second.geometry_count == 1
    assert second.considered_store_count == 3
    assert second.linked_store_count == 2
    assert second.boundary_store_count == 1
    assert second.unmatched_bbox_store_count == 1
    assert second.linked_by_market == {"M1": 2}
    with sqlite3.connect(database) as connection:
        assert connection.execute("SELECT COUNT(*) FROM market_geometries").fetchone()[0] == 1
        assert connection.execute("SELECT COUNT(*) FROM store_market_links").fetchone()[0] == 2
        assert connection.execute("PRAGMA foreign_key_check").fetchall() == []
