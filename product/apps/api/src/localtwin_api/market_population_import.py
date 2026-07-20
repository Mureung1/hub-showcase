"""Import supported-market population metrics from Seoul API snapshots."""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sqlalchemy import Engine, func, select
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from localtwin_api.config import get_settings
from localtwin_api.database import create_database_engine
from localtwin_api.db_models import DataSource, Market, MarketPopulationMetric
from localtwin_api.postgres_seed import normalize_raw_path, validate_source_url
from localtwin_api.product_catalog import SUPPORTED_MARKET_CODES
from localtwin_api.seoul_open_data import SOURCES

SUPPORTED_MARKETS = set(SUPPORTED_MARKET_CODES)


class MarketPopulationImportError(RuntimeError):
    pass


@dataclass(frozen=True)
class MarketPopulationImportReport:
    period: str
    row_count: int
    market_codes: tuple[str, ...]


def _count(row: dict[str, Any], key: str) -> int:
    try:
        value = int(row[key])
    except (KeyError, TypeError, ValueError) as error:
        raise MarketPopulationImportError(f"Population field is invalid: {key}.") from error
    if value < 0:
        raise MarketPopulationImportError(f"Population field must not be negative: {key}.")
    return value


def _validate_demographics(row: dict[str, Any], *, kind: str) -> None:
    if kind == "resident":
        total_key = "TOT_REPOP_CO"
        male_key = "ML_REPOP_CO"
        female_key = "FML_REPOP_CO"
        age_suffix = "REPOP_CO"
    else:
        total_key = "TOT_WRC_POPLTN_CO"
        male_key = "ML_WRC_POPLTN_CO"
        female_key = "FML_WRC_POPLTN_CO"
        age_suffix = "WRC_POPLTN_CO"
    total = _count(row, total_key)
    if total != _count(row, male_key) + _count(row, female_key):
        raise MarketPopulationImportError(f"{kind} sex totals do not match the total.")
    age_keys = [f"AGRDE_{age}_{age_suffix}" for age in (10, 20, 30, 40, 50)] + [
        f"AGRDE_60_ABOVE_{age_suffix}"
    ]
    if total != sum(_count(row, key) for key in age_keys):
        raise MarketPopulationImportError(f"{kind} age totals do not match the total.")
    for sex in ("MAG", "FAG"):
        sex_total = _count(row, male_key if sex == "MAG" else female_key)
        sex_age_keys = [f"{sex}_{age}_{age_suffix}" for age in (10, 20, 30, 40, 50)] + [
            f"{sex}_60_ABOVE_{age_suffix}"
        ]
        if sex_total != sum(_count(row, key) for key in sex_age_keys):
            raise MarketPopulationImportError(f"{kind} {sex} age totals do not match the total.")


def _load(path: Path, service: str) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or payload.get("service") != service:
        raise MarketPopulationImportError("Seoul population snapshot contract changed.")
    rows = payload.get("rows")
    if not isinstance(rows, list) or not all(isinstance(row, dict) for row in rows):
        raise MarketPopulationImportError("Seoul population snapshot rows are invalid.")
    if payload.get("truncated") is not False or payload.get("saved_row_count") != len(rows):
        raise MarketPopulationImportError("Seoul population snapshot is incomplete.")
    return payload


def _source(path: Path, payload: dict[str, Any], slug: str) -> dict[str, object]:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    source = SOURCES[slug]
    raw_path = normalize_raw_path(str(path.resolve()))
    validate_source_url(source.dataset_url)
    return {
        "snapshot_id": f"seoul-{slug}-{digest[:16]}",
        "provider": "서울 열린데이터광장",
        "dataset": source.service,
        "source_type": source.source_type,
        "source_url": source.dataset_url,
        "collected_at": str(payload["collected_at"]),
        "period": None,
        "row_count": len(payload["rows"]),
        "sha256": digest,
        "raw_path": raw_path,
    }


def _upsert(connection: Any, model: type[Any], rows: list[dict[str, object]]) -> None:
    if connection.dialect.name == "postgresql":
        statement = postgresql_insert(model).values(rows)
    elif connection.dialect.name == "sqlite":
        statement = sqlite_insert(model).values(rows)
    else:
        raise MarketPopulationImportError("Population target dialect is unsupported.")
    keys = [column.name for column in model.__table__.primary_key.columns]
    updates = {
        column.name: getattr(statement.excluded, column.name)
        for column in model.__table__.columns
        if column.name not in keys
    }
    connection.execute(statement.on_conflict_do_update(index_elements=keys, set_=updates))


def import_market_population(
    snapshot_dir: Path, engine: Engine, period: str
) -> MarketPopulationImportReport:
    resident_path = snapshot_dir / "resident.json"
    worker_path = snapshot_dir / "workers.json"
    resident_payload = _load(resident_path, SOURCES["resident"].service)
    worker_payload = _load(worker_path, SOURCES["workers"].service)
    residents = {
        str(row["TRDAR_CD"]): row
        for row in resident_payload["rows"]
        if str(row.get("STDR_YYQU_CD")) == period and str(row.get("TRDAR_CD")) in SUPPORTED_MARKETS
    }
    workers = {
        str(row["TRDAR_CD"]): row
        for row in worker_payload["rows"]
        if str(row.get("STDR_YYQU_CD")) == period and str(row.get("TRDAR_CD")) in SUPPORTED_MARKETS
    }
    if set(residents) != SUPPORTED_MARKETS or set(workers) != SUPPORTED_MARKETS:
        raise MarketPopulationImportError("Supported market population rows are incomplete.")
    for row in residents.values():
        _validate_demographics(row, kind="resident")
    for row in workers.values():
        _validate_demographics(row, kind="worker")

    resident_source = _source(resident_path, resident_payload, "resident")
    worker_source = _source(worker_path, worker_payload, "workers")
    rows = [
        {
            "market_code": code,
            "period": period,
            "market_name": str(residents[code]["TRDAR_CD_NM"]),
            "resident_population": _count(residents[code], "TOT_REPOP_CO"),
            "worker_population": _count(workers[code], "TOT_WRC_POPLTN_CO"),
            "household_count": _count(residents[code], "TOT_HSHLD_CO"),
            "resident_source_snapshot_id": resident_source["snapshot_id"],
            "worker_source_snapshot_id": worker_source["snapshot_id"],
        }
        for code in sorted(SUPPORTED_MARKETS)
    ]
    with engine.begin() as connection:
        available = set(
            connection.scalars(
                select(Market.market_code).where(Market.market_code.in_(SUPPORTED_MARKETS))
            )
        )
        if available != SUPPORTED_MARKETS:
            raise MarketPopulationImportError("Supported markets are missing from the target DB.")
        _upsert(connection, DataSource, [resident_source, worker_source])
        _upsert(connection, MarketPopulationMetric, rows)
        count = int(
            connection.scalar(
                select(func.count())
                .select_from(MarketPopulationMetric)
                .where(
                    MarketPopulationMetric.period == period,
                    MarketPopulationMetric.market_code.in_(SUPPORTED_MARKETS),
                )
            )
            or 0
        )
        if count != len(SUPPORTED_MARKETS):
            raise MarketPopulationImportError("Market population import verification failed.")
    return MarketPopulationImportReport(period, count, tuple(sorted(SUPPORTED_MARKETS)))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshot_dir", type=Path)
    parser.add_argument("--period", default="20251")
    arguments = parser.parse_args()
    engine = create_database_engine(get_settings().require_database_url())
    try:
        report = import_market_population(arguments.snapshot_dir, engine, arguments.period)
    finally:
        engine.dispose()
    print(f"market_population_metrics: {report.row_count}")


if __name__ == "__main__":
    main()
