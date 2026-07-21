"""Import selected Seoul market polygons and link store points by containment."""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
from dataclasses import asdict, dataclass
from pathlib import Path

import shapefile
from pyproj import CRS, Transformer
from shapely import make_valid
from shapely.geometry import Point, mapping, shape
from shapely.ops import transform, unary_union

from localtwin_api.bulk_import import collected_at, raw_path
from localtwin_api.canonical_db import SCHEMA
from localtwin_api.product_catalog import SUPPORTED_MARKET_CODES
from localtwin_api.seoul_open_data import SOURCES, repository_root

REQUIRED_COMPONENTS = (".shp", ".shx", ".dbf", ".prj")


@dataclass(frozen=True)
class SpatialLinkReport:
    source_snapshot_id: str
    source_crs: str
    target_crs: str
    geometry_count: int
    considered_store_count: int
    linked_store_count: int
    boundary_store_count: int
    unmatched_bbox_store_count: int
    linked_by_market: dict[str, int]


@dataclass(frozen=True)
class SpatialSnapshot:
    snapshot_id: str
    source_crs: str
    target_crs: str
    source_row_count: int
    geometries: dict[str, object]


def find_market_shapefile() -> Path:
    base = repository_root() / "data/raw/bulk-downloads/seoul-market-areas/20231023/extracted"
    paths = sorted(base.rglob("*.shp"))
    if len(paths) != 1:
        raise FileNotFoundError(
            f"Expected one Seoul market Shapefile under {base}, found {len(paths)}."
        )
    return paths[0]


def shapefile_components(shapefile_path: Path) -> list[Path]:
    components = [shapefile_path.with_suffix(suffix) for suffix in REQUIRED_COMPONENTS]
    optional_cpg = shapefile_path.with_suffix(".cpg")
    if optional_cpg.is_file():
        components.append(optional_cpg)
    missing = [path for path in components if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"Shapefile component is missing: {missing[0]}")
    return components


def sha256_bundle(paths: list[Path]) -> str:
    digest = hashlib.sha256()
    for path in sorted(paths, key=lambda item: item.suffix):
        digest.update(path.suffix.encode("ascii"))
        with path.open("rb") as handle:
            while chunk := handle.read(1024 * 1024):
                digest.update(chunk)
    return digest.hexdigest()


def crs_label(crs: CRS) -> str:
    authority = crs.to_authority()
    return f"{authority[0]}:{authority[1]}" if authority else crs.name


def polygon_only(geometry: object):
    valid = make_valid(geometry)
    if valid.geom_type in {"Polygon", "MultiPolygon"}:
        return valid
    polygons = [
        item
        for item in getattr(valid, "geoms", ())
        if item.geom_type in {"Polygon", "MultiPolygon"}
    ]
    if not polygons:
        raise ValueError("Market geometry does not contain a polygon.")
    return unary_union(polygons)


def validate_market_codes(market_codes: tuple[str, ...]) -> None:
    if not market_codes or len(set(market_codes)) != len(market_codes):
        raise ValueError("market_codes must contain unique values.")


def read_market_snapshot(shapefile_path: Path, market_codes: tuple[str, ...]) -> SpatialSnapshot:
    """Read and validate selected market polygons without opening the canonical DB."""
    validate_market_codes(market_codes)
    components = shapefile_components(shapefile_path)
    snapshot_id = sha256_bundle(components)
    source_crs = CRS.from_wkt(shapefile_path.with_suffix(".prj").read_text(encoding="utf-8"))
    target_crs = CRS.from_epsg(4326)
    transformer = Transformer.from_crs(source_crs, target_crs, always_xy=True)

    reader = shapefile.Reader(str(shapefile_path), encoding="utf-8")
    source_row_count = len(reader)
    selected: dict[str, object] = {}
    try:
        for shape_record in reader.iterShapeRecords():
            record = shape_record.record.as_dict()
            market_code = str(record.get("TRDAR_CD", "")).strip()
            if market_code not in market_codes:
                continue
            source_geometry = shape(shape_record.shape.__geo_interface__)
            selected[market_code] = polygon_only(transform(transformer.transform, source_geometry))
    finally:
        reader.close()

    missing_codes = sorted(set(market_codes) - selected.keys())
    if missing_codes:
        raise ValueError(f"Market polygon is missing for: {', '.join(missing_codes)}")
    return SpatialSnapshot(
        snapshot_id=snapshot_id,
        source_crs=crs_label(source_crs),
        target_crs=crs_label(target_crs),
        source_row_count=source_row_count,
        geometries=selected,
    )


def _validate_canonical_markets(
    connection: sqlite3.Connection, market_codes: tuple[str, ...]
) -> None:
    placeholders = ",".join("?" * len(market_codes))
    known_codes = {
        row[0]
        for row in connection.execute(
            f"SELECT market_code FROM markets WHERE market_code IN ({placeholders})", market_codes
        )
    }
    unknown_codes = sorted(set(market_codes) - known_codes)
    if unknown_codes:
        raise ValueError(f"Canonical market row is missing for: {', '.join(unknown_codes)}")


def _persist_snapshot_source(
    connection: sqlite3.Connection, snapshot: SpatialSnapshot, shapefile_path: Path
) -> None:
    connection.execute(
        """
        INSERT INTO data_sources (
          snapshot_id, provider, dataset, source_type, source_url, collected_at,
          period, row_count, sha256, raw_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(snapshot_id) DO UPDATE SET
          row_count=excluded.row_count,
          raw_path=excluded.raw_path
        """,
        (
            snapshot.snapshot_id,
            "서울 열린데이터광장",
            "서울시 상권분석서비스(영역-상권) Shapefile",
            "official_bulk_shapefile",
            SOURCES["areas"].dataset_url,
            collected_at(shapefile_path),
            "20231023",
            snapshot.source_row_count,
            snapshot.snapshot_id,
            raw_path(shapefile_path),
        ),
    )


def _geometry_rows(
    snapshot: SpatialSnapshot, market_codes: tuple[str, ...]
) -> list[tuple[object, ...]]:
    rows: list[tuple[object, ...]] = []
    for market_code in market_codes:
        geometry = snapshot.geometries[market_code]
        center = geometry.representative_point()
        rows.append(
            (
                market_code,
                json.dumps(mapping(geometry), ensure_ascii=False, separators=(",", ":")),
                center.x,
                center.y,
                snapshot.source_crs,
                snapshot.target_crs,
                snapshot.snapshot_id,
            )
        )
    return rows


def _persist_geometries(
    connection: sqlite3.Connection, snapshot: SpatialSnapshot, market_codes: tuple[str, ...]
) -> None:
    connection.executemany(
        """
        INSERT INTO market_geometries VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(market_code) DO UPDATE SET
          geometry_geojson=excluded.geometry_geojson,
          center_longitude=excluded.center_longitude,
          center_latitude=excluded.center_latitude,
          source_crs=excluded.source_crs,
          target_crs=excluded.target_crs,
          source_snapshot_id=excluded.source_snapshot_id
        """,
        _geometry_rows(snapshot, market_codes),
    )


def _store_link_candidates(
    connection: sqlite3.Connection, snapshot: SpatialSnapshot, market_codes: tuple[str, ...]
) -> tuple[set[str], dict[str, tuple[float, str, bool]]]:
    considered_store_ids: set[str] = set()
    candidates: dict[str, tuple[float, str, bool]] = {}
    for market_code in market_codes:
        geometry = snapshot.geometries[market_code]
        min_longitude, min_latitude, max_longitude, max_latitude = geometry.bounds
        stores = connection.execute(
            """
            SELECT store_id, longitude, latitude
            FROM store_points
            WHERE longitude BETWEEN ? AND ? AND latitude BETWEEN ? AND ?
            """,
            (min_longitude, max_longitude, min_latitude, max_latitude),
        )
        for store_id, longitude, latitude in stores:
            considered_store_ids.add(store_id)
            point = Point(longitude, latitude)
            if not geometry.covers(point):
                continue
            candidate = (geometry.area, market_code, not geometry.contains(point))
            if store_id not in candidates or candidate[:2] < candidates[store_id][:2]:
                candidates[store_id] = candidate
    return considered_store_ids, candidates


def _persist_store_links(
    connection: sqlite3.Connection,
    market_codes: tuple[str, ...],
    snapshot_id: str,
    candidates: dict[str, tuple[float, str, bool]],
) -> None:
    placeholders = ",".join("?" * len(market_codes))
    connection.execute(
        f"DELETE FROM store_market_links WHERE market_code IN ({placeholders})", market_codes
    )
    connection.executemany(
        """
        INSERT INTO store_market_links (
          store_id, market_code, link_method, is_boundary, source_snapshot_id
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(store_id) DO UPDATE SET
          market_code=excluded.market_code,
          link_method=excluded.link_method,
          is_boundary=excluded.is_boundary,
          source_snapshot_id=excluded.source_snapshot_id
        """,
        [
            (store_id, market_code, "point_in_polygon", int(is_boundary), snapshot_id)
            for store_id, (_, market_code, is_boundary) in sorted(candidates.items())
        ],
    )


def _build_report(
    snapshot: SpatialSnapshot,
    considered_store_ids: set[str],
    candidates: dict[str, tuple[float, str, bool]],
    market_codes: tuple[str, ...],
) -> SpatialLinkReport:
    linked_by_market = {market_code: 0 for market_code in market_codes}
    for _, market_code, _ in candidates.values():
        linked_by_market[market_code] += 1
    boundary_count = sum(1 for _, _, is_boundary in candidates.values() if is_boundary)
    return SpatialLinkReport(
        source_snapshot_id=snapshot.snapshot_id,
        source_crs=snapshot.source_crs,
        target_crs=snapshot.target_crs,
        geometry_count=len(snapshot.geometries),
        considered_store_count=len(considered_store_ids),
        linked_store_count=len(candidates),
        boundary_store_count=boundary_count,
        unmatched_bbox_store_count=len(considered_store_ids - set(candidates)),
        linked_by_market=linked_by_market,
    )


def import_market_spatial_links(
    database: Path,
    shapefile_path: Path,
    *,
    market_codes: tuple[str, ...] = SUPPORTED_MARKET_CODES,
) -> SpatialLinkReport:
    snapshot = read_market_snapshot(shapefile_path, market_codes)

    database.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(database) as connection:
        connection.executescript(SCHEMA)
        _validate_canonical_markets(connection, market_codes)
        _persist_snapshot_source(connection, snapshot, shapefile_path)
        _persist_geometries(connection, snapshot, market_codes)
        considered_store_ids, candidates = _store_link_candidates(
            connection, snapshot, market_codes
        )
        _persist_store_links(connection, market_codes, snapshot.snapshot_id, candidates)
        connection.commit()
        if connection.execute("PRAGMA foreign_key_check").fetchall():
            raise ValueError(
                "Canonical SQLite contains foreign key violations after spatial import."
            )
    return _build_report(snapshot, considered_store_ids, candidates, market_codes)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--database",
        type=Path,
        default=repository_root() / "data/processed/localtwin.db",
    )
    parser.add_argument("--shapefile", type=Path, default=find_market_shapefile())
    arguments = parser.parse_args()
    report = import_market_spatial_links(arguments.database, arguments.shapefile)
    print(json.dumps(asdict(report), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
