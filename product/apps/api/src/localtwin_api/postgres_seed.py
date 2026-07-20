"""Seed the product database from the verified canonical SQLite snapshot."""

from __future__ import annotations

import argparse
import sqlite3
from collections.abc import Iterator, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any
from urllib.parse import urlparse

from sqlalchemy import Connection, Engine, func, select
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from localtwin_api.config import get_settings
from localtwin_api.database import create_database_engine
from localtwin_api.db_models import CANONICAL_MODELS, SalesMetric, StoreMetric
from localtwin_api.seoul_open_data import repository_root

TABLE_ORDER = tuple(model.__tablename__ for model in CANONICAL_MODELS)
MODEL_BY_TABLE = {model.__tablename__: model for model in CANONICAL_MODELS}
POSTGRESQL_PARAMETER_BUDGET = 60_000
SQLITE_PARAMETER_BUDGET = 30_000


@dataclass(frozen=True)
class SeedReport:
    source_counts: dict[str, int]
    target_counts: dict[str, int]
    source_category_counts: dict[str, int]
    target_category_counts: dict[str, int]


def default_source_path() -> Path:
    return repository_root() / "data" / "processed" / "localtwin.db"


def normalize_raw_path(value: str) -> str:
    normalized = value.replace("\\", "/")
    marker = "/data/raw/"
    marker_index = normalized.lower().rfind(marker)
    if marker_index >= 0:
        normalized = normalized[marker_index + 1 :]
    path = PurePosixPath(normalized)
    if path.is_absolute() or PureWindowsPath(normalized).is_absolute() or ".." in path.parts:
        raise ValueError("data_sources.raw_path must be repository-relative.")
    if not normalized or normalized.startswith("./"):
        normalized = normalized.removeprefix("./")
    if not normalized:
        raise ValueError("data_sources.raw_path must not be empty.")
    return normalized


def validate_source_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("data_sources.source_url must be an absolute HTTP(S) URL.")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("data_sources.source_url must not contain credentials or query secrets.")
    return value


def source_table_counts(connection: sqlite3.Connection) -> dict[str, int]:
    return {
        table: int(connection.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0])
        for table in TABLE_ORDER
    }


def source_category_counts(connection: sqlite3.Connection) -> dict[str, int]:
    return {
        table: int(
            connection.execute(f'SELECT COUNT(DISTINCT category_code) FROM "{table}"').fetchone()[0]
        )
        for table in ("store_metrics", "sales_metrics")
    }


def target_table_counts(connection: Connection) -> dict[str, int]:
    return {
        table: int(connection.scalar(select(func.count()).select_from(model)) or 0)
        for table, model in MODEL_BY_TABLE.items()
    }


def target_category_counts(connection: Connection) -> dict[str, int]:
    return {
        "store_metrics": int(
            connection.scalar(select(func.count(func.distinct(StoreMetric.category_code)))) or 0
        ),
        "sales_metrics": int(
            connection.scalar(select(func.count(func.distinct(SalesMetric.category_code)))) or 0
        ),
    }


def iter_source_rows(
    connection: sqlite3.Connection, table: str, *, chunk_size: int
) -> Iterator[list[dict[str, Any]]]:
    cursor = connection.execute(f'SELECT * FROM "{table}"')
    while rows := cursor.fetchmany(chunk_size):
        yield [dict(row) for row in rows]


def effective_chunk_size(table: str, requested: int, dialect_name: str) -> int:
    parameter_budget = (
        POSTGRESQL_PARAMETER_BUDGET if dialect_name == "postgresql" else SQLITE_PARAMETER_BUDGET
    )
    column_count = len(MODEL_BY_TABLE[table].__table__.columns)
    return min(requested, max(1, parameter_budget // column_count))


def prepare_rows(table: str, rows: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    prepared = [dict(row) for row in rows]
    if table == "data_sources":
        for row in prepared:
            row["source_url"] = validate_source_url(str(row["source_url"]))
            row["raw_path"] = normalize_raw_path(str(row["raw_path"]))
    return prepared


def upsert_rows(connection: Connection, table: str, rows: Sequence[Mapping[str, Any]]) -> None:
    if not rows:
        return
    model = MODEL_BY_TABLE[table]
    if connection.dialect.name == "postgresql":
        statement = postgresql_insert(model).values(list(rows))
    elif connection.dialect.name == "sqlite":
        statement = sqlite_insert(model).values(list(rows))
    else:
        raise ValueError(f"Unsupported seed target dialect: {connection.dialect.name}")
    primary_keys = [column.name for column in model.__table__.primary_key.columns]
    update_values = {
        column.name: getattr(statement.excluded, column.name)
        for column in model.__table__.columns
        if column.name not in primary_keys
    }
    statement = statement.on_conflict_do_update(index_elements=primary_keys, set_=update_values)
    connection.execute(statement)


def seed_canonical(
    source_path: Path,
    engine: Engine,
    *,
    chunk_size: int = 1_000,
    tables: Sequence[str] | None = None,
) -> SeedReport:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero.")
    selected_tables = tuple(tables) if tables is not None else TABLE_ORDER
    unknown_tables = sorted(set(selected_tables) - set(TABLE_ORDER))
    if unknown_tables:
        raise ValueError(f"Unknown canonical table: {unknown_tables[0]}")
    selected_tables = tuple(table for table in TABLE_ORDER if table in selected_tables)
    if not selected_tables:
        raise ValueError("At least one canonical table must be selected.")
    resolved_source = source_path.resolve()
    if not resolved_source.is_file():
        raise FileNotFoundError(resolved_source)

    source_url = f"file:{resolved_source.as_posix()}?mode=ro"
    with sqlite3.connect(source_url, uri=True) as source:
        source.row_factory = sqlite3.Row
        if source.execute("PRAGMA foreign_key_check").fetchall():
            raise ValueError("Canonical SQLite contains foreign key violations.")
        source_counts = source_table_counts(source)
        source_categories = source_category_counts(source)

        with engine.begin() as target:
            for table in selected_tables:
                table_chunk_size = effective_chunk_size(table, chunk_size, target.dialect.name)
                for rows in iter_source_rows(source, table, chunk_size=table_chunk_size):
                    upsert_rows(target, table, prepare_rows(table, rows))
            target_counts = target_table_counts(target)
            target_categories = target_category_counts(target)
            if target_counts != source_counts:
                raise ValueError("Target table counts do not match canonical SQLite.")
            if target_categories != source_categories:
                raise ValueError("Target category counts do not match canonical SQLite.")

    return SeedReport(
        source_counts=source_counts,
        target_counts=target_counts,
        source_category_counts=source_categories,
        target_category_counts=target_categories,
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=default_source_path())
    parser.add_argument("--chunk-size", type=int, default=1_000)
    parser.add_argument("--tables", nargs="+", choices=TABLE_ORDER)
    return parser


def main() -> None:
    arguments = build_parser().parse_args()
    database_url = get_settings().require_database_url()
    engine = create_database_engine(database_url)
    try:
        report = seed_canonical(
            arguments.source,
            engine,
            chunk_size=arguments.chunk_size,
            tables=arguments.tables,
        )
    finally:
        engine.dispose()
    for table, count in report.target_counts.items():
        print(f"{table}: {count}")
    for table, count in report.target_category_counts.items():
        print(f"{table}.category_codes: {count}")


if __name__ == "__main__":
    main()
