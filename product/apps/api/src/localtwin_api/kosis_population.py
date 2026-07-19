"""Collect and import a fixed KOSIS admin-area population snapshot."""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from sqlalchemy import Engine, func, select
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from localtwin_api.db_models import (
    AdminAreaPopulation,
    DataSource,
    Market,
    MarketAdminAreaCrosswalk,
)
from localtwin_api.postgres_seed import normalize_raw_path, validate_source_url
from localtwin_api.product_catalog import MARKET_BY_KEY
from localtwin_api.seoul_open_data import repository_root

KOSIS_ENDPOINT = "https://kosis.kr/openapi/Param/statisticsParameterData.do"
KOSIS_ORG_ID = "101"
KOSIS_TABLE_ID = "DT_1B04005N"
KOSIS_PERIOD = "202512"
KOSIS_PERIOD_TYPE = "M"
KOSIS_AREAS = {
    "1144066000": "서교동",
    "1144068000": "합정동",
    "1144071000": "연남동",
}
KOSIS_ITEMS = {"T2": "total_population", "T3": "male_population", "T4": "female_population"}
KOSIS_AGES = ("0", *(str(value) for value in range(5, 106, 5)))
EXPECTED_ROW_COUNT = len(KOSIS_AREAS) * len(KOSIS_ITEMS) * len(KOSIS_AGES)
MAX_RESPONSE_ROWS = 40_000
REQUIRED_FIELDS = {
    "ORG_ID",
    "TBL_ID",
    "PRD_SE",
    "PRD_DE",
    "C1",
    "C1_NM",
    "C2",
    "C2_NM",
    "ITM_ID",
    "DT",
}
CROSSWALKS = (
    (MARKET_BY_KEY["연남"].market_id, "1144071000", "연남동"),
    (MARKET_BY_KEY["홍대"].market_id, "1144066000", "서교동"),
    (MARKET_BY_KEY["합정"].market_id, "1144068000", "합정동"),
)
BOUNDARY_NOTE = "서울시 상권 polygon과 행정동 경계는 다르며 인구를 상권에 배분하지 않는다."


class KosisPopulationError(RuntimeError):
    """A sanitized KOSIS collection or import failure."""


@dataclass(frozen=True)
class ImportReport:
    snapshot_id: str
    raw_row_count: int
    population_row_count: int
    crosswalk_row_count: int
    sha256: str


def build_request_params(api_key: str) -> dict[str, str]:
    if not api_key.strip():
        raise KosisPopulationError("KOSIS_API_KEY is required.")
    return {
        "method": "getList",
        "apiKey": api_key,
        "itmId": "+".join(KOSIS_ITEMS) + "+",
        "objL1": "+".join(KOSIS_AREAS) + "+",
        "objL2": "+".join(KOSIS_AGES) + "+",
        **{f"objL{index}": "" for index in range(3, 9)},
        "format": "json",
        "jsonVD": "Y",
        "prdSe": KOSIS_PERIOD_TYPE,
        "startPrdDe": KOSIS_PERIOD,
        "endPrdDe": KOSIS_PERIOD,
        "orgId": KOSIS_ORG_ID,
        "tblId": KOSIS_TABLE_ID,
    }


def _population_value(value: object) -> int:
    if isinstance(value, bool):
        raise KosisPopulationError("KOSIS population value is invalid.")
    normalized = str(value).replace(",", "").strip()
    try:
        parsed = int(normalized)
    except (TypeError, ValueError) as error:
        raise KosisPopulationError("KOSIS population value is invalid.") from error
    if parsed < 0:
        raise KosisPopulationError("KOSIS population value must not be negative.")
    return parsed


def validate_population_rows(rows: list[dict[str, object]]) -> None:
    if not rows:
        raise KosisPopulationError("KOSIS response is empty.")
    if len(rows) > MAX_RESPONSE_ROWS:
        raise KosisPopulationError("KOSIS response exceeds the 40,000-row safety limit.")
    if len(rows) != EXPECTED_ROW_COUNT:
        raise KosisPopulationError(
            f"KOSIS response row count changed: expected {EXPECTED_ROW_COUNT}, got {len(rows)}."
        )

    keys: set[tuple[str, str, str]] = set()
    for row in rows:
        missing = REQUIRED_FIELDS - row.keys()
        if missing:
            raise KosisPopulationError(f"KOSIS response is missing field: {sorted(missing)[0]}.")
        if row["ORG_ID"] != KOSIS_ORG_ID or row["TBL_ID"] != KOSIS_TABLE_ID:
            raise KosisPopulationError("KOSIS organization or table contract changed.")
        if row["PRD_SE"] != KOSIS_PERIOD_TYPE or row["PRD_DE"] != KOSIS_PERIOD:
            raise KosisPopulationError("KOSIS period contract changed.")
        area_code = str(row["C1"])
        age_code = str(row["C2"])
        item_code = str(row["ITM_ID"])
        if KOSIS_AREAS.get(area_code) != row["C1_NM"]:
            raise KosisPopulationError("KOSIS admin-area contract changed.")
        if age_code not in KOSIS_AGES:
            raise KosisPopulationError("KOSIS age-group contract changed.")
        if item_code not in KOSIS_ITEMS:
            raise KosisPopulationError("KOSIS item contract changed.")
        key = (area_code, age_code, item_code)
        if key in keys:
            raise KosisPopulationError("KOSIS response contains a duplicate dimension row.")
        keys.add(key)
        _population_value(row["DT"])

    expected_keys = {
        (area_code, age_code, item_code)
        for area_code in KOSIS_AREAS
        for age_code in KOSIS_AGES
        for item_code in KOSIS_ITEMS
    }
    if keys != expected_keys:
        raise KosisPopulationError("KOSIS response dimension set changed.")


def fetch_population_rows(
    api_key: str, *, timeout_seconds: float = 30.0
) -> list[dict[str, object]]:
    request_url = f"{KOSIS_ENDPOINT}?{urlencode(build_request_params(api_key))}"
    try:
        with urlopen(request_url, timeout=timeout_seconds) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, UnicodeDecodeError, json.JSONDecodeError):
        raise KosisPopulationError("KOSIS request failed without a usable JSON response.") from None
    if isinstance(payload, dict):
        raise KosisPopulationError("KOSIS provider returned an error response.")
    if not isinstance(payload, list) or not all(isinstance(row, dict) for row in payload):
        raise KosisPopulationError("KOSIS response shape is invalid.")
    rows = [dict(row) for row in payload]
    validate_population_rows(rows)
    return rows


def _atomic_write(path: Path, content: bytes) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_bytes(content)
    os.replace(temporary, path)


def _repository_relative(path: Path, product_root: Path) -> str:
    try:
        return path.resolve().relative_to(product_root.resolve()).as_posix()
    except ValueError as error:
        raise KosisPopulationError(
            "KOSIS snapshot must stay inside the product directory."
        ) from error


def write_population_snapshot(
    rows: list[dict[str, object]],
    output_root: Path,
    *,
    product_root: Path | None = None,
    collected_at: datetime | None = None,
) -> Path:
    validate_population_rows(rows)
    root = product_root or repository_root()
    collected = collected_at or datetime.now(UTC)
    run_dir = output_root / collected.strftime("%Y%m%dT%H%M%SZ")
    run_dir.mkdir(parents=True, exist_ok=False)

    response_json = json.dumps(rows, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    response_bytes = response_json.encode()
    response_path = run_dir / "response.json"
    response_sha256 = hashlib.sha256(response_bytes).hexdigest()
    raw_path = _repository_relative(response_path, root)
    manifest = {
        "provider": "KOSIS",
        "dataset": KOSIS_TABLE_ID,
        "source_type": "official",
        "source_url": KOSIS_ENDPOINT,
        "collected_at": collected.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "period": KOSIS_PERIOD,
        "row_count": len(rows),
        "sha256": response_sha256,
        "raw_path": raw_path,
        "request_contract": {
            "org_id": KOSIS_ORG_ID,
            "table_id": KOSIS_TABLE_ID,
            "period_type": KOSIS_PERIOD_TYPE,
            "period": KOSIS_PERIOD,
            "area_codes": list(KOSIS_AREAS),
            "age_group_codes": list(KOSIS_AGES),
            "item_codes": list(KOSIS_ITEMS),
        },
    }
    manifest_bytes = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode()
    _atomic_write(response_path, response_bytes)
    _atomic_write(run_dir / "manifest.json", manifest_bytes)
    return run_dir


def load_population_snapshot(
    snapshot_dir: Path,
) -> tuple[dict[str, object], list[dict[str, object]]]:
    try:
        manifest = json.loads((snapshot_dir / "manifest.json").read_text(encoding="utf-8"))
        response_bytes = (snapshot_dir / "response.json").read_bytes()
        rows = json.loads(response_bytes.decode("utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise KosisPopulationError("KOSIS snapshot files are missing or invalid.") from error
    if not isinstance(manifest, dict) or not isinstance(rows, list):
        raise KosisPopulationError("KOSIS snapshot shape is invalid.")
    if not all(isinstance(row, dict) for row in rows):
        raise KosisPopulationError("KOSIS response rows are invalid.")
    expected_manifest = {
        "provider": "KOSIS",
        "dataset": KOSIS_TABLE_ID,
        "source_type": "official",
        "source_url": KOSIS_ENDPOINT,
        "period": KOSIS_PERIOD,
    }
    if any(manifest.get(key) != value for key, value in expected_manifest.items()):
        raise KosisPopulationError("KOSIS manifest contract changed.")
    try:
        validate_source_url(str(manifest["source_url"]))
        normalized_raw_path = normalize_raw_path(str(manifest["raw_path"]))
    except (KeyError, ValueError) as error:
        raise KosisPopulationError("KOSIS manifest provenance is unsafe.") from error
    if normalized_raw_path != manifest["raw_path"] or not normalized_raw_path.endswith(
        "/response.json"
    ):
        raise KosisPopulationError("KOSIS manifest raw path is invalid.")
    expected_sha256 = str(manifest.get("sha256", ""))
    if hashlib.sha256(response_bytes).hexdigest() != expected_sha256:
        raise KosisPopulationError("KOSIS snapshot SHA-256 does not match the manifest.")
    if manifest.get("row_count") != len(rows):
        raise KosisPopulationError("KOSIS snapshot row count does not match the manifest.")
    validate_population_rows(rows)
    return manifest, [dict(row) for row in rows]


def transform_population_rows(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    validate_population_rows(rows)
    grouped: dict[tuple[str, str, str], dict[str, object]] = {}
    for row in rows:
        key = (str(row["C1"]), str(row["PRD_DE"]), str(row["C2"]))
        target = grouped.setdefault(
            key,
            {
                "admin_area_code": key[0],
                "period": key[1],
                "age_group_code": key[2],
                "admin_area_name": str(row["C1_NM"]),
                "age_group_name": str(row["C2_NM"]),
            },
        )
        target[KOSIS_ITEMS[str(row["ITM_ID"])]] = _population_value(row["DT"])
    required_values = set(KOSIS_ITEMS.values())
    if any(not required_values.issubset(row) for row in grouped.values()):
        raise KosisPopulationError("KOSIS population item set is incomplete.")
    return [grouped[key] for key in sorted(grouped, key=lambda item: (item[0], int(item[2])))]


def _upsert(connection: Any, model: type[Any], rows: list[dict[str, object]]) -> None:
    if connection.dialect.name == "postgresql":
        statement = postgresql_insert(model).values(rows)
    elif connection.dialect.name == "sqlite":
        statement = sqlite_insert(model).values(rows)
    else:
        raise KosisPopulationError("KOSIS import target must be PostgreSQL or test SQLite.")
    primary_keys = [column.name for column in model.__table__.primary_key.columns]
    updates = {
        column.name: getattr(statement.excluded, column.name)
        for column in model.__table__.columns
        if column.name not in primary_keys
    }
    connection.execute(statement.on_conflict_do_update(index_elements=primary_keys, set_=updates))


def import_population_snapshot(snapshot_dir: Path, engine: Engine) -> ImportReport:
    manifest, raw_rows = load_population_snapshot(snapshot_dir)
    population_rows = transform_population_rows(raw_rows)
    sha256 = str(manifest["sha256"])
    snapshot_id = f"kosis-{KOSIS_TABLE_ID}-{KOSIS_PERIOD}-{sha256[:16]}"
    source_row = {
        "snapshot_id": snapshot_id,
        "provider": "KOSIS",
        "dataset": KOSIS_TABLE_ID,
        "source_type": "official",
        "source_url": KOSIS_ENDPOINT,
        "collected_at": str(manifest["collected_at"]),
        "period": KOSIS_PERIOD,
        "row_count": len(raw_rows),
        "sha256": sha256,
        "raw_path": str(manifest["raw_path"]),
    }
    for row in population_rows:
        row["source_snapshot_id"] = snapshot_id
    crosswalk_rows = [
        {
            "market_code": market_code,
            "admin_area_code": area_code,
            "admin_area_name": area_name,
            "mapping_method": "reference-only",
            "mapping_version": "v1",
            "boundary_note": BOUNDARY_NOTE,
        }
        for market_code, area_code, area_name in CROSSWALKS
    ]

    with engine.begin() as connection:
        _upsert(connection, DataSource, [source_row])
        _upsert(connection, AdminAreaPopulation, population_rows)
        market_codes = tuple(row[0] for row in CROSSWALKS)
        market_query = select(Market.market_code).where(Market.market_code.in_(market_codes))
        available_markets = set(connection.scalars(market_query))
        expected_markets = {row[0] for row in CROSSWALKS}
        if available_markets != expected_markets:
            raise KosisPopulationError("KOSIS crosswalk target markets are missing.")
        _upsert(connection, MarketAdminAreaCrosswalk, crosswalk_rows)
        population_count = int(
            connection.scalar(
                select(func.count())
                .select_from(AdminAreaPopulation)
                .where(AdminAreaPopulation.source_snapshot_id == snapshot_id)
            )
            or 0
        )
        crosswalk_count = int(
            connection.scalar(select(func.count()).select_from(MarketAdminAreaCrosswalk)) or 0
        )
        if population_count != len(population_rows) or crosswalk_count < len(crosswalk_rows):
            raise KosisPopulationError("KOSIS import verification failed.")

    return ImportReport(
        snapshot_id=snapshot_id,
        raw_row_count=len(raw_rows),
        population_row_count=len(population_rows),
        crosswalk_row_count=len(crosswalk_rows),
        sha256=sha256,
    )
