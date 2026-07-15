import csv
import sqlite3
from pathlib import Path

from localtwin_api.bulk_import import detect_csv_encoding, import_bulk_files
from localtwin_api.canonical_db import SCHEMA


def write_sbiz_csv(path: Path) -> None:
    columns = [
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
    ]
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerow(
            {
                "상가업소번호": "S1",
                "상호명": "테스트 카페",
                "상권업종대분류코드": "I2",
                "상권업종대분류명": "음식",
                "상권업종중분류코드": "I212",
                "상권업종중분류명": "비알코올",
                "상권업종소분류코드": "I21201",
                "상권업종소분류명": "카페",
                "도로명주소": "서울 마포구 테스트로 1",
                "경도": "126.92",
                "위도": "37.56",
            }
        )
        writer.writerow(
            {
                "상가업소번호": "S2",
                "상호명": "좌표 오류",
                "경도": "0",
                "위도": "0",
            }
        )


def write_market_csv(path: Path) -> None:
    columns = [
        "stdr_yyqu_cd",
        "trdar_cd",
        "svc_induty_cd",
        "svc_induty_cd_nm",
        "similr_induty_stor_co",
        "stor_co",
        "frc_stor_co",
        "opbiz_rt",
        "opbiz_stor_co",
        "clsbiz_rt",
        "clsbiz_stor_co",
    ]
    with path.open("w", encoding="cp949", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerow(
            {
                "stdr_yyqu_cd": "20254",
                "trdar_cd": "M1",
                "svc_induty_cd": "CS100010",
                "svc_induty_cd_nm": "카페",
                "similr_induty_stor_co": "5",
                "stor_co": "4",
                "frc_stor_co": "1",
                "opbiz_rt": "2.5",
                "opbiz_stor_co": "1",
                "clsbiz_rt": "1.2",
                "clsbiz_stor_co": "0",
            }
        )
        writer.writerow(
            {
                "stdr_yyqu_cd": "20254",
                "trdar_cd": "UNKNOWN",
                "svc_induty_cd": "CS100010",
                "svc_induty_cd_nm": "카페",
                "stor_co": "1",
            }
        )


def seed_market(database: Path) -> None:
    database.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(database) as connection:
        connection.executescript(SCHEMA)
        connection.execute(
            "INSERT INTO data_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "area-source",
                "서울",
                "areas",
                "fixture",
                "https://example.test/areas",
                "2026-07-15T00:00:00Z",
                None,
                1,
                "area-source",
                "data/raw/areas.json",
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
                "EPSG:5181",
                None,
                "area-source",
            ),
        )


def test_bulk_import_is_idempotent_and_reports_quality(tmp_path: Path, monkeypatch: object) -> None:
    monkeypatch.setattr("localtwin_api.bulk_import.repository_root", lambda: tmp_path)
    raw_dir = tmp_path / "data/raw"
    raw_dir.mkdir(parents=True)
    sbiz_csv = raw_dir / "sbiz.csv"
    market_csv = raw_dir / "market.csv"
    database = tmp_path / "data/processed/localtwin.db"
    write_sbiz_csv(sbiz_csv)
    write_market_csv(market_csv)
    seed_market(database)

    first = import_bulk_files(database, sbiz_csv, market_csv, chunk_size=1)
    second = import_bulk_files(database, sbiz_csv, market_csv, chunk_size=1)

    assert first.after == second.after
    assert second.after["store_points"] == 1
    assert second.after["store_metrics"] == 1
    assert second.sbiz.input_rows == 2
    assert second.sbiz.accepted_rows == 1
    assert second.sbiz.invalid_coordinates == 1
    assert second.seoul_store_metrics.input_rows == 2
    assert second.seoul_store_metrics.accepted_rows == 1
    assert second.seoul_store_metrics.unknown_market_codes == 1


def test_encoding_detection_accepts_utf8_sample_ending_mid_character(tmp_path: Path) -> None:
    path = tmp_path / "utf8.csv"
    path.write_bytes((b"a" * 65535) + "가".encode() + b"\n")

    assert detect_csv_encoding(path) == "utf-8-sig"
