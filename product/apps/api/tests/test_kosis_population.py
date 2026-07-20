import json
from datetime import UTC, datetime
from pathlib import Path

import pytest
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session
from test_database import alembic_config

from alembic import command
from localtwin_api.database import create_database_engine
from localtwin_api.db_models import (
    AdminAreaPopulation,
    DataSource,
    Market,
    MarketAdminAreaCrosswalk,
)
from localtwin_api.kosis_population import (
    EXPECTED_ROW_COUNT,
    KOSIS_AGES,
    KOSIS_AREAS,
    KOSIS_ITEMS,
    KosisPopulationError,
    import_population_snapshot,
    load_population_snapshot,
    transform_population_rows,
    validate_population_rows,
    write_population_snapshot,
)

AGE_NAMES = {
    "0": "계",
    **{str(upper): f"{upper - 5} - {upper - 1}세" for upper in range(5, 105, 5)},
    "105": "100+",
}


def population_fixture() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for area_index, (area_code, area_name) in enumerate(KOSIS_AREAS.items(), start=1):
        for age_index, age_code in enumerate(KOSIS_AGES):
            total = area_index * 10_000 + age_index * 10
            for item_code, value in (("T2", total), ("T3", total // 2), ("T4", total - total // 2)):
                rows.append(
                    {
                        "ORG_ID": "101",
                        "TBL_ID": "DT_1B04005N",
                        "PRD_SE": "M",
                        "PRD_DE": "202512",
                        "C1": area_code,
                        "C1_NM": area_name,
                        "C2": age_code,
                        "C2_NM": AGE_NAMES[age_code],
                        "ITM_ID": item_code,
                        "DT": str(value),
                    }
                )
    return rows


def migrated_engine(path: Path):
    database_url = f"sqlite:///{path}"
    command.upgrade(alembic_config(database_url), "head")
    return create_database_engine(database_url, require_postgresql=False)


def seed_crosswalk_markets(engine: object) -> None:
    with Session(engine) as session:
        session.add(
            DataSource(
                snapshot_id="market-source",
                provider="test",
                dataset="markets",
                source_type="fixture",
                source_url="https://example.test/markets",
                collected_at="2026-07-16T00:00:00Z",
                period="20251",
                row_count=3,
                sha256="0" * 64,
                raw_path="data/fixtures/markets.json",
            )
        )
        for market_code, market_name, admin_code, admin_name in (
            ("3110562", "연남동 골목상권", "1144071000", "연남동"),
            ("3120103", "홍대입구역", "1144066000", "서교동"),
            ("3120101", "합정역", "1144068000", "합정동"),
        ):
            session.add(
                Market(
                    market_code=market_code,
                    market_name=market_name,
                    market_type_code="A",
                    market_type_name="골목상권",
                    district_code="11440",
                    district_name="마포구",
                    admin_dong_code=admin_code,
                    admin_dong_name=admin_name,
                    source_x=None,
                    source_y=None,
                    coordinate_system="EPSG:5181",
                    area_sqm=None,
                    source_snapshot_id="market-source",
                )
            )
        session.commit()


def test_contract_transforms_198_provider_rows_to_66_canonical_rows() -> None:
    rows = population_fixture()

    validate_population_rows(rows)
    transformed = transform_population_rows(rows)

    assert len(rows) == EXPECTED_ROW_COUNT == 198
    assert len(transformed) == 66
    first = transformed[0]
    assert first == {
        "admin_area_code": "1144066000",
        "period": "202512",
        "age_group_code": "0",
        "admin_area_name": "서교동",
        "age_group_name": "계",
        "total_population": 10_000,
        "male_population": 5_000,
        "female_population": 5_000,
    }


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (lambda rows: rows.pop(), "row count changed"),
        (lambda rows: rows.__setitem__(0, {**rows[0], "PRD_DE": "202511"}), "period contract"),
        (lambda rows: rows.__setitem__(0, {**rows[0], "C1": "0000000000"}), "admin-area"),
        (lambda rows: rows.__setitem__(0, {**rows[0], "DT": "-1"}), "must not be negative"),
    ],
)
def test_contract_rejects_missing_or_changed_dimensions(mutate: object, message: str) -> None:
    rows = population_fixture()
    mutate(rows)

    with pytest.raises(KosisPopulationError, match=message):
        validate_population_rows(rows)


def test_snapshot_is_sanitized_and_hash_verified(tmp_path: Path) -> None:
    secret = "never-write-this-kosis-key"
    snapshot_dir = write_population_snapshot(
        population_fixture(),
        tmp_path / "data" / "raw" / "kosis-population",
        product_root=tmp_path,
        collected_at=datetime(2026, 7, 16, 1, 2, 3, tzinfo=UTC),
    )

    manifest, rows = load_population_snapshot(snapshot_dir)
    combined = (snapshot_dir / "manifest.json").read_text(encoding="utf-8") + (
        snapshot_dir / "response.json"
    ).read_text(encoding="utf-8")
    assert len(rows) == 198
    assert manifest["raw_path"] == ("data/raw/kosis-population/20260716T010203Z/response.json")
    assert secret not in combined
    assert "apiKey" not in combined
    assert "?" not in str(manifest["source_url"])

    response_path = snapshot_dir / "response.json"
    response_path.write_text(response_path.read_text(encoding="utf-8") + " ", encoding="utf-8")
    with pytest.raises(KosisPopulationError, match="SHA-256"):
        load_population_snapshot(snapshot_dir)


def test_migration_and_import_are_idempotent(tmp_path: Path) -> None:
    engine = migrated_engine(tmp_path / "target.db")
    assert {
        "admin_area_population",
        "market_admin_area_crosswalk",
    }.issubset(inspect(engine).get_table_names())
    seed_crosswalk_markets(engine)
    snapshot_dir = write_population_snapshot(
        population_fixture(),
        tmp_path / "data" / "raw" / "kosis-population",
        product_root=tmp_path,
        collected_at=datetime(2026, 7, 16, 2, 0, 0, tzinfo=UTC),
    )

    first = import_population_snapshot(snapshot_dir, engine)
    second = import_population_snapshot(snapshot_dir, engine)

    assert first == second
    assert second.population_row_count == 66
    assert second.crosswalk_row_count == 3
    with Session(engine) as session:
        assert len(session.scalars(select(AdminAreaPopulation)).all()) == 66
        crosswalks = session.scalars(select(MarketAdminAreaCrosswalk)).all()
        assert len(crosswalks) == 3
        assert {row.mapping_method for row in crosswalks} == {"reference-only"}
    engine.dispose()


def test_missing_crosswalk_market_rolls_back_all_rows(tmp_path: Path) -> None:
    engine = migrated_engine(tmp_path / "rollback.db")
    snapshot_dir = write_population_snapshot(
        population_fixture(),
        tmp_path / "data" / "raw" / "kosis-population",
        product_root=tmp_path,
        collected_at=datetime(2026, 7, 16, 3, 0, 0, tzinfo=UTC),
    )

    with pytest.raises(KosisPopulationError, match="target markets are missing"):
        import_population_snapshot(snapshot_dir, engine)

    with Session(engine) as session:
        assert session.scalar(select(DataSource).where(DataSource.provider == "KOSIS")) is None
        assert session.scalars(select(AdminAreaPopulation)).all() == []
    engine.dispose()


def test_invalid_snapshot_shape_fails_without_exposing_payload(tmp_path: Path) -> None:
    snapshot_dir = tmp_path / "snapshot"
    snapshot_dir.mkdir()
    (snapshot_dir / "manifest.json").write_text(json.dumps({"sha256": "bad"}), encoding="utf-8")
    (snapshot_dir / "response.json").write_text("{}", encoding="utf-8")

    with pytest.raises(KosisPopulationError, match="shape is invalid"):
        load_population_snapshot(snapshot_dir)


def test_manifest_rejects_absolute_raw_path(tmp_path: Path) -> None:
    snapshot_dir = write_population_snapshot(
        population_fixture(),
        tmp_path / "data" / "raw" / "kosis-population",
        product_root=tmp_path,
        collected_at=datetime(2026, 7, 16, 4, 0, 0, tzinfo=UTC),
    )
    manifest_path = snapshot_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["raw_path"] = "C:/Users/example/private/response.json"
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    with pytest.raises(KosisPopulationError, match="provenance is unsafe"):
        load_population_snapshot(snapshot_dir)


def test_fixture_covers_exact_contract_sets() -> None:
    rows = population_fixture()

    assert {row["C1"] for row in rows} == set(KOSIS_AREAS)
    assert {row["C2"] for row in rows} == set(KOSIS_AGES)
    assert {row["ITM_ID"] for row in rows} == set(KOSIS_ITEMS)
