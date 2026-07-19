from pathlib import Path
from types import SimpleNamespace

import pytest

import localtwin_api.production_promotion as promotion
from localtwin_api.production_promotion import (
    ProductionPromotionInputs,
    promote_production_database,
    validate_production_target,
    validate_promotion_inputs,
)

PROJECT_REF = "prodref1234"
DATABASE_URL = (
    "postgresql+psycopg://postgres:secret@db.prodref1234.supabase.co:5432/postgres?sslmode=require"
)


def build_inputs(tmp_path: Path) -> ProductionPromotionInputs:
    canonical = tmp_path / "localtwin.db"
    canonical.touch()
    population = tmp_path / "population"
    business = tmp_path / "business"
    market_population = tmp_path / "market-population"
    population.mkdir()
    business.mkdir()
    market_population.mkdir()
    return ProductionPromotionInputs(
        canonical_database=canonical,
        kosis_population_snapshot=population,
        kosis_business_snapshot=business,
        market_population_snapshot=market_population,
    )


def test_production_target_requires_matching_ref_and_confirmation() -> None:
    validate_production_target(DATABASE_URL, PROJECT_REF, PROJECT_REF)

    with pytest.raises(ValueError, match="confirmation does not match"):
        validate_production_target(DATABASE_URL, PROJECT_REF, "different-ref")
    with pytest.raises(ValueError, match="does not match the database target") as error:
        validate_production_target(DATABASE_URL, "otherref12", "otherref12")

    assert "secret" not in str(error.value)


def test_production_target_rejects_non_postgresql_urls() -> None:
    with pytest.raises(ValueError, match="must use PostgreSQL"):
        validate_production_target("sqlite:///production.db", PROJECT_REF, PROJECT_REF)


def test_production_target_requires_ssl() -> None:
    with pytest.raises(ValueError, match="must require SSL"):
        validate_production_target(
            "postgresql+psycopg://postgres:secret@db.prodref1234.supabase.co:5432/postgres",
            PROJECT_REF,
            PROJECT_REF,
        )


def test_promotion_inputs_require_all_verified_snapshots(tmp_path: Path) -> None:
    inputs = build_inputs(tmp_path)
    validate_promotion_inputs(inputs)

    inputs.canonical_database.unlink()
    with pytest.raises(FileNotFoundError):
        validate_promotion_inputs(inputs)


def test_promotion_runs_migration_then_all_idempotent_imports(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    inputs = build_inputs(tmp_path)
    calls: list[str] = []

    class FakeEngine:
        def dispose(self) -> None:
            calls.append("dispose")

    monkeypatch.setattr(
        promotion.command,
        "upgrade",
        lambda config, revision: calls.append(f"migration:{revision}"),
    )
    monkeypatch.setattr(
        promotion,
        "create_database_engine",
        lambda database_url: calls.append("engine") or FakeEngine(),
    )
    monkeypatch.setattr(
        promotion,
        "seed_canonical",
        lambda source, engine: (
            calls.append("canonical") or SimpleNamespace(target_counts={"markets": 3})
        ),
    )
    monkeypatch.setattr(
        promotion,
        "import_population_snapshot",
        lambda snapshot, engine: (
            calls.append("population")
            or SimpleNamespace(population_row_count=66, crosswalk_row_count=3)
        ),
    )
    monkeypatch.setattr(
        promotion,
        "import_business_census_snapshot",
        lambda snapshot, engine: (
            calls.append("business") or SimpleNamespace(imported_rows=6, suppressed_rows=1)
        ),
    )
    monkeypatch.setattr(
        promotion,
        "import_market_population",
        lambda snapshot, engine, period: (
            calls.append(f"market-population:{period}") or SimpleNamespace(row_count=3)
        ),
    )

    report = promote_production_database(DATABASE_URL, PROJECT_REF, PROJECT_REF, inputs)

    assert calls == [
        "migration:head",
        "engine",
        "canonical",
        "population",
        "business",
        "market-population:20251",
        "dispose",
    ]
    assert report.canonical_table_counts == {"markets": 3}
    assert report.population_rows == 66
    assert report.population_crosswalk_rows == 3
    assert report.business_rows == 6
    assert report.suppressed_business_rows == 1
    assert report.market_population_rows == 3
