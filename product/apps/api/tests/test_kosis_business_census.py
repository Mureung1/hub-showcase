import json
from datetime import UTC, datetime
from pathlib import Path

import pytest
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.orm import Session
from test_database import alembic_config

from alembic import command
from localtwin_api.database import create_database_engine
from localtwin_api.db_models import AdminAreaBusinessMetric, DataSource
from localtwin_api.kosis_business_census import (
    AREA_CROSSWALK,
    EXPECTED_COLUMN_COUNT,
    EXPECTED_INDUSTRY_CODES,
    EXPECTED_SELECTED_ROWS,
    SHEET_NAME,
    KosisBusinessCensusError,
    import_business_census_snapshot,
    load_business_census_snapshot,
    parse_business_census_workbook,
    write_business_census_manifest,
)


def write_workbook(path: Path, *, duplicate_first: bool = False) -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = SHEET_NAME
    sheet.append(["읍면동 산업대분류별 총괄"] + [None] * (EXPECTED_COLUMN_COUNT - 1))
    sheet.append([None] * EXPECTED_COLUMN_COUNT)
    sheet.append(
        ["지역", "산업분류", "사업체수", "종사자수", "종사자수", "종사자수"]
        + [f"group-{index}" for index in range(7, EXPECTED_COLUMN_COUNT + 1)]
    )
    sheet.append(
        ["", "", "", "계", "남", "여"]
        + [f"field-{index}" for index in range(7, EXPECTED_COLUMN_COUNT + 1)]
    )
    for area_index, (source_code, (_, area_name)) in enumerate(AREA_CROSSWALK.items(), start=1):
        for industry_index, industry_code in enumerate(EXPECTED_INDUSTRY_CODES):
            industry = "전산업" if industry_code == "TOTAL" else f"{industry_code}.테스트 산업"
            businesses = area_index * 100 + industry_index
            workers = businesses * 3
            male: int | str = workers // 2
            female: int | str = workers - int(male)
            if source_code == "11140660" and industry_code == "A":
                male = "X"
                female = "X"
            sheet.append(
                [
                    f"            {source_code}.{area_name}",
                    industry,
                    businesses,
                    workers,
                    male,
                    female,
                ]
                + [0] * (EXPECTED_COLUMN_COUNT - 6)
            )
    if duplicate_first:
        sheet.append(["11140660.서교동", "전산업", 1, 1, 1, 0] + [0] * (EXPECTED_COLUMN_COUNT - 6))
    workbook.save(path)
    workbook.close()


def migrated_engine(path: Path):
    database_url = f"sqlite:///{path}"
    command.upgrade(alembic_config(database_url), "head")
    return create_database_engine(database_url, require_postgresql=False)


def snapshot_fixture(tmp_path: Path) -> Path:
    snapshot_dir = tmp_path / "data" / "raw" / "kosis-business-census" / "20260716T050000Z"
    snapshot_dir.mkdir(parents=True)
    workbook_path = snapshot_dir / "workbook.xlsx"
    write_workbook(workbook_path)
    write_business_census_manifest(
        workbook_path,
        product_root=tmp_path,
        collected_at=datetime(2026, 7, 16, 5, 0, 0, tzinfo=UTC),
    )
    return snapshot_dir


def test_workbook_parser_maps_three_areas_and_preserves_suppression(tmp_path: Path) -> None:
    path = tmp_path / "workbook.xlsx"
    write_workbook(path)

    metadata, rows = parse_business_census_workbook(path)

    assert metadata.selected_rows == EXPECTED_SELECTED_ROWS == 66
    assert metadata.workbook_columns == 59
    assert {row["admin_area_code"] for row in rows} == {
        "1144066000",
        "1144068000",
        "1144071000",
    }
    suppressed = [row for row in rows if row["is_suppressed"]]
    assert len(suppressed) == 1
    assert suppressed[0]["male_worker_count"] is None
    assert suppressed[0]["female_worker_count"] is None
    assert suppressed[0]["worker_count"] is not None


def test_workbook_parser_rejects_duplicate_dimension(tmp_path: Path) -> None:
    path = tmp_path / "duplicate.xlsx"
    write_workbook(path, duplicate_first=True)

    with pytest.raises(KosisBusinessCensusError, match="duplicate dimension"):
        parse_business_census_workbook(path)


def test_snapshot_manifest_and_import_are_idempotent(tmp_path: Path) -> None:
    snapshot_dir = snapshot_fixture(tmp_path)
    manifest, metadata, rows = load_business_census_snapshot(snapshot_dir)
    engine = migrated_engine(tmp_path / "target.db")

    first = import_business_census_snapshot(snapshot_dir, engine)
    second = import_business_census_snapshot(snapshot_dir, engine)

    assert len(rows) == metadata.selected_rows == 66
    assert manifest["raw_path"] == ("data/raw/kosis-business-census/20260716T050000Z/workbook.xlsx")
    assert first == second
    assert second.imported_rows == 66
    assert second.suppressed_rows == 1
    with Session(engine) as session:
        metrics = session.scalars(select(AdminAreaBusinessMetric)).all()
        assert len(metrics) == 66
        sources = session.scalars(select(DataSource).where(DataSource.provider == "KOSIS")).all()
        assert len(sources) == 1
    engine.dispose()


def test_snapshot_rejects_hash_and_absolute_path_tampering(tmp_path: Path) -> None:
    snapshot_dir = snapshot_fixture(tmp_path)
    manifest_path = snapshot_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["raw_path"] = "C:/private/workbook.xlsx"
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(KosisBusinessCensusError, match="provenance is unsafe"):
        load_business_census_snapshot(snapshot_dir)

    write_business_census_manifest(
        snapshot_dir / "workbook.xlsx",
        product_root=tmp_path,
        collected_at=datetime(2026, 7, 16, 5, 0, 0, tzinfo=UTC),
    )
    with (snapshot_dir / "workbook.xlsx").open("ab") as stream:
        stream.write(b"tamper")
    with pytest.raises(KosisBusinessCensusError, match="SHA-256"):
        load_business_census_snapshot(snapshot_dir)
