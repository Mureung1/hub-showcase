"""Safe, repeatable promotion of verified LocalTwin data to production PostgreSQL."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from alembic.config import Config
from sqlalchemy.engine import make_url

from alembic import command
from localtwin_api.database import create_database_engine
from localtwin_api.kosis_business_census import import_business_census_snapshot
from localtwin_api.kosis_population import import_population_snapshot
from localtwin_api.market_population_import import import_market_population
from localtwin_api.postgres_seed import seed_canonical

PROJECT_REF_PATTERN = re.compile(r"^[a-z0-9]{8,40}$")
API_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class ProductionPromotionInputs:
    canonical_database: Path
    kosis_population_snapshot: Path
    kosis_business_snapshot: Path
    market_population_snapshot: Path
    period: str = "20251"


@dataclass(frozen=True)
class ProductionPromotionReport:
    canonical_table_counts: dict[str, int]
    population_rows: int
    population_crosswalk_rows: int
    business_rows: int
    suppressed_business_rows: int
    market_population_rows: int


def validate_production_target(database_url: str, project_ref: str, confirmation: str) -> None:
    normalized_ref = project_ref.strip().lower()
    if not PROJECT_REF_PATTERN.fullmatch(normalized_ref):
        raise ValueError("Production project ref has an invalid format.")
    if confirmation.strip().lower() != normalized_ref:
        raise ValueError("Production project confirmation does not match.")

    url = make_url(database_url.strip())
    if not url.drivername.startswith("postgresql"):
        raise ValueError("Production database must use PostgreSQL.")
    if not url.host or not url.username or url.password is None:
        raise ValueError("Production database URL is incomplete.")
    if str(url.query.get("sslmode", "")).lower() != "require":
        raise ValueError("Production database URL must require SSL.")
    target_identity = f"{url.host} {url.username}".lower()
    if normalized_ref not in target_identity:
        raise ValueError("Production project ref does not match the database target.")


def validate_promotion_inputs(inputs: ProductionPromotionInputs) -> None:
    if not inputs.canonical_database.resolve().is_file():
        raise FileNotFoundError(inputs.canonical_database.resolve())
    for snapshot in (
        inputs.kosis_population_snapshot,
        inputs.kosis_business_snapshot,
        inputs.market_population_snapshot,
    ):
        if not snapshot.resolve().is_dir():
            raise FileNotFoundError(snapshot.resolve())
    if not re.fullmatch(r"\d{5,6}", inputs.period):
        raise ValueError("Market population period must contain 5 or 6 digits.")


def alembic_config(database_url: str) -> Config:
    config = Config(str(API_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(API_ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
    return config


def promote_production_database(
    database_url: str,
    project_ref: str,
    confirmation: str,
    inputs: ProductionPromotionInputs,
) -> ProductionPromotionReport:
    validate_production_target(database_url, project_ref, confirmation)
    validate_promotion_inputs(inputs)
    command.upgrade(alembic_config(database_url), "head")

    engine = create_database_engine(database_url)
    try:
        canonical = seed_canonical(inputs.canonical_database, engine)
        population = import_population_snapshot(inputs.kosis_population_snapshot, engine)
        business = import_business_census_snapshot(inputs.kosis_business_snapshot, engine)
        market_population = import_market_population(
            inputs.market_population_snapshot, engine, inputs.period
        )
    finally:
        engine.dispose()

    return ProductionPromotionReport(
        canonical_table_counts=canonical.target_counts,
        population_rows=population.population_row_count,
        population_crosswalk_rows=population.crosswalk_row_count,
        business_rows=business.imported_rows,
        suppressed_business_rows=business.suppressed_rows,
        market_population_rows=market_population.row_count,
    )
