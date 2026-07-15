"""Import verified bulk store files into the canonical SQLite database."""

from __future__ import annotations

import argparse
import codecs
import csv
import hashlib
import json
import sqlite3
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from localtwin_api.canonical_db import SCHEMA, integer, number, table_counts
from localtwin_api.seoul_open_data import repository_root

SBIZ_SOURCE_URL = "https://www.data.go.kr/data/15083033/fileData.do"
SEOUL_STORE_SOURCE_URL = "https://data.seoul.go.kr/dataList/OA-15577/S/1/datasetView.do"
SBIZ_REQUIRED_COLUMNS = {
    "상가업소번호",
    "상호명",
    "지점명",
    "상권업종대분류코드",
    "상권업종대분류명",
    "상권업종중분류코드",
    "상권업종중분류명",
    "상권업종소분류코드",
    "상권업종소분류명",
    "도로명주소",
    "경도",
    "위도",
}
SEOUL_STORE_REQUIRED_COLUMNS = {
    "stdr_yyqu_cd",
    "trdar_cd",
    "svc_induty_cd",
    "svc_induty_cd_nm",
    "stor_co",
}


@dataclass(frozen=True)
class ImportQuality:
    input_rows: int = 0
    accepted_rows: int = 0
    duplicate_keys: int = 0
    missing_required: int = 0
    invalid_coordinates: int = 0
    unknown_market_codes: int = 0


@dataclass(frozen=True)
class BulkImportReport:
    before: dict[str, int]
    after: dict[str, int]
    sbiz: ImportQuality
    seoul_store_metrics: ImportQuality


def detect_csv_encoding(path: Path) -> str:
    sample = path.read_bytes()[:65536]
    for encoding in ("utf-8-sig", "cp949"):
        try:
            decoder = codecs.getincrementaldecoder(encoding)()
            decoder.decode(sample, final=False)
        except UnicodeDecodeError:
            continue
        return encoding
    raise ValueError(f"Unsupported CSV encoding: {path}")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def collected_at(path: Path) -> str:
    value = datetime.fromtimestamp(path.stat().st_mtime, UTC).replace(microsecond=0)
    return value.isoformat().replace("+00:00", "Z")


def raw_path(path: Path) -> str:
    try:
        relative = path.resolve().relative_to(repository_root().resolve())
    except ValueError as exc:
        raise ValueError("Bulk source must be stored under product/data/raw.") from exc
    if relative.parts[:2] != ("data", "raw"):
        raise ValueError("Bulk source must be stored under product/data/raw.")
    return relative.as_posix()


def clean(value: Any) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def upsert_source(
    connection: sqlite3.Connection,
    *,
    snapshot_id: str,
    provider: str,
    dataset: str,
    source_url: str,
    period: str,
    row_count: int,
    path: Path,
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
            snapshot_id,
            provider,
            dataset,
            "official_bulk_csv",
            source_url,
            collected_at(path),
            period,
            row_count,
            snapshot_id,
            raw_path(path),
        ),
    )


def require_columns(path: Path, columns: list[str] | None, required: set[str]) -> None:
    actual = set(columns or [])
    missing = sorted(required - actual)
    if missing:
        raise ValueError(f"{path} is missing required columns: {', '.join(missing)}")


def valid_wgs84(longitude: float | None, latitude: float | None) -> bool:
    return (
        longitude is not None
        and latitude is not None
        and 124.0 <= longitude <= 132.0
        and 33.0 <= latitude <= 39.0
    )


def import_sbiz_stores(
    connection: sqlite3.Connection, path: Path, *, chunk_size: int = 2_000
) -> ImportQuality:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero.")
    snapshot_id = sha256_file(path)
    upsert_source(
        connection,
        snapshot_id=snapshot_id,
        provider="소상공인시장진흥공단",
        dataset="상가(상권)정보_20260331",
        source_url=SBIZ_SOURCE_URL,
        period="202603",
        row_count=0,
        path=path,
    )
    statement = """
        INSERT INTO store_points (
          store_id, name, branch_name, category_large_code, category_large_name,
          category_middle_code, category_middle_name, category_small_code,
          category_small_name, road_address, longitude, latitude, coordinate_system,
          source_snapshot_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(store_id) DO UPDATE SET
          name=excluded.name,
          branch_name=excluded.branch_name,
          category_large_code=excluded.category_large_code,
          category_large_name=excluded.category_large_name,
          category_middle_code=excluded.category_middle_code,
          category_middle_name=excluded.category_middle_name,
          category_small_code=excluded.category_small_code,
          category_small_name=excluded.category_small_name,
          road_address=excluded.road_address,
          longitude=excluded.longitude,
          latitude=excluded.latitude,
          coordinate_system=excluded.coordinate_system,
          source_snapshot_id=excluded.source_snapshot_id
    """
    input_rows = accepted_rows = duplicate_keys = missing_required = invalid_coordinates = 0
    seen: set[str] = set()
    batch: list[tuple[Any, ...]] = []
    encoding = detect_csv_encoding(path)
    with path.open("r", encoding=encoding, newline="") as handle:
        reader = csv.DictReader(handle)
        require_columns(path, reader.fieldnames, SBIZ_REQUIRED_COLUMNS)
        for row in reader:
            input_rows += 1
            store_id = clean(row.get("상가업소번호"))
            name = clean(row.get("상호명"))
            if not store_id or not name:
                missing_required += 1
                continue
            longitude = number(row.get("경도"))
            latitude = number(row.get("위도"))
            if not valid_wgs84(longitude, latitude):
                invalid_coordinates += 1
                continue
            if store_id in seen:
                duplicate_keys += 1
            seen.add(store_id)
            batch.append(
                (
                    store_id,
                    name,
                    clean(row.get("지점명")),
                    clean(row.get("상권업종대분류코드")),
                    clean(row.get("상권업종대분류명")),
                    clean(row.get("상권업종중분류코드")),
                    clean(row.get("상권업종중분류명")),
                    clean(row.get("상권업종소분류코드")),
                    clean(row.get("상권업종소분류명")),
                    clean(row.get("도로명주소")),
                    longitude,
                    latitude,
                    "EPSG:4326",
                    snapshot_id,
                )
            )
            accepted_rows += 1
            if len(batch) >= chunk_size:
                connection.executemany(statement, batch)
                batch.clear()
    if batch:
        connection.executemany(statement, batch)
    connection.execute(
        """
        DELETE FROM store_points
        WHERE source_snapshot_id IN (
          SELECT snapshot_id FROM data_sources
          WHERE provider='공공데이터포털' AND dataset='stores'
        )
        """
    )
    connection.execute(
        "UPDATE data_sources SET row_count=? WHERE snapshot_id=?",
        (input_rows, snapshot_id),
    )
    return ImportQuality(
        input_rows=input_rows,
        accepted_rows=accepted_rows,
        duplicate_keys=duplicate_keys,
        missing_required=missing_required,
        invalid_coordinates=invalid_coordinates,
    )


def import_seoul_store_metrics(
    connection: sqlite3.Connection, path: Path, *, chunk_size: int = 2_000
) -> ImportQuality:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero.")
    snapshot_id = sha256_file(path)
    upsert_source(
        connection,
        snapshot_id=snapshot_id,
        provider="서울 열린데이터광장",
        dataset="서울시 상권분석서비스(점포-상권)_2025년",
        source_url=SEOUL_STORE_SOURCE_URL,
        period="2025",
        row_count=0,
        path=path,
    )
    known_markets = {
        market_code for (market_code,) in connection.execute("SELECT market_code FROM markets")
    }
    statement = """
        INSERT INTO store_metrics (
          market_code, period, category_code, category_name, similar_store_count,
          store_count, franchise_store_count, opening_rate, opening_count,
          closure_rate, closure_count, source_snapshot_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(market_code, period, category_code) DO UPDATE SET
          category_name=excluded.category_name,
          similar_store_count=excluded.similar_store_count,
          store_count=excluded.store_count,
          franchise_store_count=excluded.franchise_store_count,
          opening_rate=excluded.opening_rate,
          opening_count=excluded.opening_count,
          closure_rate=excluded.closure_rate,
          closure_count=excluded.closure_count,
          source_snapshot_id=excluded.source_snapshot_id
    """
    input_rows = accepted_rows = duplicate_keys = missing_required = unknown_market_codes = 0
    seen: set[tuple[str, str, str]] = set()
    batch: list[tuple[Any, ...]] = []
    encoding = detect_csv_encoding(path)
    with path.open("r", encoding=encoding, newline="") as handle:
        reader = csv.DictReader(handle)
        require_columns(path, reader.fieldnames, SEOUL_STORE_REQUIRED_COLUMNS)
        for row in reader:
            input_rows += 1
            period = clean(row.get("stdr_yyqu_cd"))
            market_code = clean(row.get("trdar_cd"))
            category_code = clean(row.get("svc_induty_cd"))
            category_name = clean(row.get("svc_induty_cd_nm"))
            if not period or not market_code or not category_code or not category_name:
                missing_required += 1
                continue
            if market_code not in known_markets:
                unknown_market_codes += 1
                continue
            key = (market_code, period, category_code)
            if key in seen:
                duplicate_keys += 1
            seen.add(key)
            batch.append(
                (
                    market_code,
                    period,
                    category_code,
                    category_name,
                    integer(row.get("similr_induty_stor_co")),
                    integer(row.get("stor_co")),
                    integer(row.get("frc_stor_co")),
                    number(row.get("opbiz_rt")),
                    integer(row.get("opbiz_stor_co")),
                    number(row.get("clsbiz_rt")),
                    integer(row.get("clsbiz_stor_co")),
                    snapshot_id,
                )
            )
            accepted_rows += 1
            if len(batch) >= chunk_size:
                connection.executemany(statement, batch)
                batch.clear()
    if batch:
        connection.executemany(statement, batch)
    connection.execute(
        "UPDATE data_sources SET row_count=? WHERE snapshot_id=?",
        (input_rows, snapshot_id),
    )
    return ImportQuality(
        input_rows=input_rows,
        accepted_rows=accepted_rows,
        duplicate_keys=duplicate_keys,
        missing_required=missing_required,
        unknown_market_codes=unknown_market_codes,
    )


def find_seoul_sbiz_csv() -> Path:
    base = repository_root() / "data/raw/bulk-downloads/sbiz-stores/20260331/extracted"
    for path in sorted(base.glob("*/*.csv")):
        with path.open("r", encoding=detect_csv_encoding(path), newline="") as handle:
            reader = csv.DictReader(handle)
            first = next(reader, None)
        if first and clean(first.get("시도코드")) == "11":
            return path
    raise FileNotFoundError("Seoul SBDC bulk CSV was not found.")


def find_seoul_market_csv() -> Path:
    base = repository_root() / "data/raw/bulk-downloads/seoul-market-stores/2025/extracted"
    paths = sorted(base.glob("*.csv"))
    if len(paths) != 1:
        raise FileNotFoundError(f"Expected one Seoul market CSV under {base}, found {len(paths)}.")
    return paths[0]


def import_bulk_files(
    database: Path,
    sbiz_csv: Path,
    market_csv: Path,
    *,
    chunk_size: int = 2_000,
) -> BulkImportReport:
    database.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(database) as connection:
        connection.executescript(SCHEMA)
        before = table_counts(connection)
        sbiz = import_sbiz_stores(connection, sbiz_csv, chunk_size=chunk_size)
        market = import_seoul_store_metrics(connection, market_csv, chunk_size=chunk_size)
        connection.commit()
        after = table_counts(connection)
        if connection.execute("PRAGMA foreign_key_check").fetchall():
            raise ValueError("Canonical SQLite contains foreign key violations after bulk import.")
    return BulkImportReport(before=before, after=after, sbiz=sbiz, seoul_store_metrics=market)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--database",
        type=Path,
        default=repository_root() / "data/processed/localtwin.db",
    )
    parser.add_argument("--sbiz-csv", type=Path)
    parser.add_argument("--market-csv", type=Path)
    parser.add_argument("--chunk-size", type=int, default=2_000)
    return parser


def main() -> int:
    arguments = build_parser().parse_args()
    report = import_bulk_files(
        arguments.database,
        arguments.sbiz_csv or find_seoul_sbiz_csv(),
        arguments.market_csv or find_seoul_market_csv(),
        chunk_size=arguments.chunk_size,
    )
    print(json.dumps(asdict(report), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
