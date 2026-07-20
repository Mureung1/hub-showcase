"""Import official raw snapshots into a small canonical SQLite database."""

from __future__ import annotations

import argparse
import json
import sqlite3
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from localtwin_api.seoul_open_data import repository_root

SCHEMA = """
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS data_sources (
  snapshot_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  dataset TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  period TEXT,
  row_count INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  raw_path TEXT NOT NULL,
  UNIQUE(provider, dataset, collected_at)
);
CREATE TABLE IF NOT EXISTS markets (
  market_code TEXT PRIMARY KEY,
  market_name TEXT NOT NULL,
  market_type_code TEXT,
  market_type_name TEXT,
  district_code TEXT,
  district_name TEXT,
  admin_dong_code TEXT,
  admin_dong_name TEXT,
  source_x REAL,
  source_y REAL,
  coordinate_system TEXT NOT NULL,
  area_sqm REAL,
  source_snapshot_id TEXT NOT NULL REFERENCES data_sources(snapshot_id)
);
CREATE TABLE IF NOT EXISTS market_geometries (
  market_code TEXT PRIMARY KEY REFERENCES markets(market_code),
  geometry_geojson TEXT NOT NULL,
  center_longitude REAL NOT NULL,
  center_latitude REAL NOT NULL,
  source_crs TEXT NOT NULL,
  target_crs TEXT NOT NULL,
  source_snapshot_id TEXT NOT NULL REFERENCES data_sources(snapshot_id)
);
CREATE TABLE IF NOT EXISTS store_metrics (
  market_code TEXT NOT NULL REFERENCES markets(market_code),
  period TEXT NOT NULL,
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  similar_store_count INTEGER,
  store_count INTEGER,
  franchise_store_count INTEGER,
  opening_rate REAL,
  opening_count INTEGER,
  closure_rate REAL,
  closure_count INTEGER,
  source_snapshot_id TEXT NOT NULL REFERENCES data_sources(snapshot_id),
  PRIMARY KEY (market_code, period, category_code)
);
CREATE TABLE IF NOT EXISTS sales_metrics (
  market_code TEXT NOT NULL REFERENCES markets(market_code),
  period TEXT NOT NULL,
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  monthly_sales_amount REAL,
  monthly_sales_count REAL,
  weekday_sales_amount REAL,
  weekend_sales_amount REAL,
  sales_00_06 REAL,
  sales_06_11 REAL,
  sales_11_14 REAL,
  sales_14_17 REAL,
  sales_17_21 REAL,
  sales_21_24 REAL,
  source_snapshot_id TEXT NOT NULL REFERENCES data_sources(snapshot_id),
  PRIMARY KEY (market_code, period, category_code)
);
CREATE TABLE IF NOT EXISTS flow_metrics (
  market_code TEXT NOT NULL REFERENCES markets(market_code),
  period TEXT NOT NULL,
  total_flow REAL,
  flow_00_06 REAL,
  flow_06_11 REAL,
  flow_11_14 REAL,
  flow_14_17 REAL,
  flow_17_21 REAL,
  flow_21_24 REAL,
  source_snapshot_id TEXT NOT NULL REFERENCES data_sources(snapshot_id),
  PRIMARY KEY (market_code, period)
);
CREATE TABLE IF NOT EXISTS store_points (
  store_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  branch_name TEXT,
  category_large_code TEXT,
  category_large_name TEXT,
  category_middle_code TEXT,
  category_middle_name TEXT,
  category_small_code TEXT,
  category_small_name TEXT,
  road_address TEXT,
  longitude REAL,
  latitude REAL,
  coordinate_system TEXT NOT NULL,
  source_snapshot_id TEXT NOT NULL REFERENCES data_sources(snapshot_id)
);
CREATE TABLE IF NOT EXISTS store_market_links (
  store_id TEXT PRIMARY KEY REFERENCES store_points(store_id),
  market_code TEXT NOT NULL REFERENCES markets(market_code),
  link_method TEXT NOT NULL,
  is_boundary INTEGER NOT NULL CHECK (is_boundary IN (0, 1)),
  source_snapshot_id TEXT NOT NULL REFERENCES data_sources(snapshot_id)
);
CREATE INDEX IF NOT EXISTS ix_store_market_links_market_code
  ON store_market_links(market_code);
CREATE TABLE IF NOT EXISTS permit_businesses (
  dataset TEXT NOT NULL,
  management_no TEXT NOT NULL,
  name TEXT NOT NULL,
  status_code TEXT,
  status_name TEXT,
  license_date TEXT,
  closure_date TEXT,
  road_address TEXT,
  source_x REAL,
  source_y REAL,
  coordinate_system TEXT NOT NULL,
  source_snapshot_id TEXT NOT NULL REFERENCES data_sources(snapshot_id),
  PRIMARY KEY (dataset, management_no)
);
"""


def number(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(str(value).replace(",", ""))
    except ValueError:
        return None


def integer(value: Any) -> int | None:
    numeric = number(value)
    return int(numeric) if numeric is not None else None


def load_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{path} must contain a JSON object.")
    return payload


def source_id(source: dict[str, Any]) -> str:
    return str(source["sha256"])


def add_source(
    connection: sqlite3.Connection,
    manifest: dict[str, Any],
    source: dict[str, Any],
    raw_dir: Path,
    provider: str,
) -> str:
    snapshot_id = source_id(source)
    connection.execute(
        """
        INSERT INTO data_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(snapshot_id) DO UPDATE SET row_count=excluded.row_count
        """,
        (
            snapshot_id,
            provider,
            source["source"],
            source["source_type"],
            source.get("source_url", manifest.get("source_url", "")),
            manifest["collected_at"],
            manifest.get("period"),
            source["saved_row_count"],
            source["sha256"],
            str((raw_dir / source["path"]).resolve()),
        ),
    )
    return snapshot_id


def rows(payload: dict[str, Any]) -> list[dict[str, Any]]:
    result = payload.get("rows", [])
    if not isinstance(result, list) or not all(isinstance(row, dict) for row in result):
        raise ValueError("Snapshot rows must be a list of objects.")
    return result


def import_seoul(connection: sqlite3.Connection, snapshot_dir: Path) -> dict[str, int]:
    manifest = load_json(snapshot_dir / "manifest.json")
    sources = {source["source"]: source for source in manifest["sources"]}
    source_ids = {
        slug: add_source(connection, manifest, source, snapshot_dir, "서울 열린데이터광장")
        for slug, source in sources.items()
    }

    for row in rows(load_json(snapshot_dir / sources["areas"]["path"])):
        connection.execute(
            """
            INSERT OR REPLACE INTO markets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["TRDAR_CD"],
                row["TRDAR_CD_NM"],
                row.get("TRDAR_SE_CD"),
                row.get("TRDAR_SE_CD_NM"),
                row.get("SIGNGU_CD"),
                row.get("SIGNGU_CD_NM"),
                row.get("ADSTRD_CD"),
                row.get("ADSTRD_CD_NM"),
                number(row.get("XCNTS_VALUE")),
                number(row.get("YDNTS_VALUE")),
                "Seoul source coordinate (not WGS84)",
                number(row.get("RELM_AR")),
                source_ids["areas"],
            ),
        )

    known_market_codes = {
        market_code for (market_code,) in connection.execute("SELECT market_code FROM markets")
    }
    for row in rows(load_json(snapshot_dir / sources["stores"]["path"])):
        if row["TRDAR_CD"] not in known_market_codes:
            continue
        connection.execute(
            """
            INSERT OR REPLACE INTO store_metrics VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["TRDAR_CD"],
                str(row["STDR_YYQU_CD"]),
                row["SVC_INDUTY_CD"],
                row["SVC_INDUTY_CD_NM"],
                integer(row.get("SIMILR_INDUTY_STOR_CO")),
                integer(row.get("STOR_CO")),
                integer(row.get("FRC_STOR_CO")),
                number(row.get("OPBIZ_RT")),
                integer(row.get("OPBIZ_STOR_CO")),
                number(row.get("CLSBIZ_RT")),
                integer(row.get("CLSBIZ_STOR_CO")),
                source_ids["stores"],
            ),
        )

    for row in rows(load_json(snapshot_dir / sources["sales"]["path"])):
        if row["TRDAR_CD"] not in known_market_codes:
            continue
        connection.execute(
            """
            INSERT OR REPLACE INTO sales_metrics VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["TRDAR_CD"],
                str(row["STDR_YYQU_CD"]),
                row["SVC_INDUTY_CD"],
                row["SVC_INDUTY_CD_NM"],
                number(row.get("THSMON_SELNG_AMT")),
                number(row.get("THSMON_SELNG_CO")),
                number(row.get("MDWK_SELNG_AMT")),
                number(row.get("WKEND_SELNG_AMT")),
                number(row.get("TMZON_00_06_SELNG_AMT")),
                number(row.get("TMZON_06_11_SELNG_AMT")),
                number(row.get("TMZON_11_14_SELNG_AMT")),
                number(row.get("TMZON_14_17_SELNG_AMT")),
                number(row.get("TMZON_17_21_SELNG_AMT")),
                number(row.get("TMZON_21_24_SELNG_AMT")),
                source_ids["sales"],
            ),
        )

    for row in rows(load_json(snapshot_dir / sources["flow"]["path"])):
        if row["TRDAR_CD"] not in known_market_codes:
            continue
        connection.execute(
            """
            INSERT OR REPLACE INTO flow_metrics VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["TRDAR_CD"],
                str(row["STDR_YYQU_CD"]),
                number(row.get("TOT_FLPOP_CO")),
                number(row.get("TMZON_00_06_FLPOP_CO")),
                number(row.get("TMZON_06_11_FLPOP_CO")),
                number(row.get("TMZON_11_14_FLPOP_CO")),
                number(row.get("TMZON_14_17_FLPOP_CO")),
                number(row.get("TMZON_17_21_FLPOP_CO")),
                number(row.get("TMZON_21_24_FLPOP_CO")),
                source_ids["flow"],
            ),
        )
    return table_counts(connection)


def import_public(connection: sqlite3.Connection, snapshot_dir: Path) -> dict[str, int]:
    manifest = load_json(snapshot_dir / "manifest.json")
    for source in manifest["sources"]:
        snapshot_id = add_source(connection, manifest, source, snapshot_dir, "공공데이터포털")
        payload = load_json(snapshot_dir / source["path"])
        if source["source"] == "stores":
            for row in rows(payload):
                store_id = row.get("bizesId") or row.get("BIZES_ID")
                name = row.get("bizesNm") or row.get("BIZES_NM")
                if not store_id or not name:
                    continue
                connection.execute(
                    """
                    INSERT OR REPLACE INTO store_points VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        store_id,
                        name,
                        row.get("brchNm"),
                        row.get("indsLclsCd"),
                        row.get("indsLclsNm"),
                        row.get("indsMclsCd"),
                        row.get("indsMclsNm"),
                        row.get("indsSclsCd"),
                        row.get("indsSclsNm"),
                        row.get("rdnmAdr"),
                        number(row.get("lon")),
                        number(row.get("lat")),
                        "EPSG:4326",
                        snapshot_id,
                    ),
                )
        else:
            for row in rows(payload):
                management_no = row.get("MNG_NO")
                name = row.get("BPLC_NM")
                if not management_no or not name:
                    continue
                connection.execute(
                    """
                    INSERT OR REPLACE INTO permit_businesses VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        source["source"],
                        management_no,
                        name,
                        row.get("SALS_STTS_CD"),
                        row.get("SALS_STTS_NM"),
                        row.get("LCPMT_YMD"),
                        row.get("CLSBIZ_YMD"),
                        row.get("ROAD_NM_ADDR"),
                        number(row.get("CRD_INFO_X")),
                        number(row.get("CRD_INFO_Y")),
                        "EPSG:5174",
                        snapshot_id,
                    ),
                )
    return table_counts(connection)


def table_counts(connection: sqlite3.Connection) -> dict[str, int]:
    tables: Iterable[str] = (
        "data_sources",
        "markets",
        "market_geometries",
        "store_metrics",
        "sales_metrics",
        "flow_metrics",
        "store_points",
        "store_market_links",
        "permit_businesses",
    )
    return {
        table: connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] for table in tables
    }


def latest_snapshot(root: Path, name: str) -> Path | None:
    manifests = sorted((root / name).glob("*/manifest.json"))
    return manifests[-1].parent if manifests else None


def main() -> int:
    parser = argparse.ArgumentParser(description="Import LocalTwin snapshots into SQLite.")
    parser.add_argument(
        "--database",
        type=Path,
        default=repository_root() / "data" / "processed" / "localtwin.db",
    )
    parser.add_argument("--seoul-snapshot", type=Path)
    parser.add_argument("--public-snapshot", type=Path)
    parser.add_argument("--stats", action="store_true")
    args = parser.parse_args()
    args.database.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(args.database) as connection:
        connection.executescript(SCHEMA)
        if not args.stats:
            seoul = args.seoul_snapshot or latest_snapshot(
                repository_root() / "data" / "raw", "seoul-market"
            )
            public = args.public_snapshot or latest_snapshot(
                repository_root() / "data" / "raw", "public-data"
            )
            if seoul:
                import_seoul(connection, seoul)
            if public:
                import_public(connection, public)
            connection.commit()
        print(json.dumps(table_counts(connection), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
