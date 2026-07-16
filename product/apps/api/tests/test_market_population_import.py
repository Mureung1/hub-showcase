import json
from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from test_database import alembic_config

from alembic import command
from localtwin_api.database import create_database_engine
from localtwin_api.db_models import DataSource, Market, MarketPopulationMetric
from localtwin_api.market_population_import import (
    SUPPORTED_MARKETS,
    MarketPopulationImportError,
    _validate_demographics,
    import_market_population,
)
from localtwin_api.seoul_open_data import SOURCES


def test_market_population_import_is_complete_and_idempotent(tmp_path: Path) -> None:
    database_url = f"sqlite:///{tmp_path / 'target.db'}"
    command.upgrade(alembic_config(database_url), "head")
    engine = create_database_engine(database_url, require_postgresql=False)
    with Session(engine) as session:
        session.add(
            DataSource(
                snapshot_id="market-source",
                provider="test",
                dataset="markets",
                source_type="official",
                source_url="https://example.test/markets",
                collected_at="2026-07-16T00:00:00Z",
                period="20251",
                row_count=3,
                sha256="0" * 64,
                raw_path="data/raw/markets.json",
            )
        )
        for code in sorted(SUPPORTED_MARKETS):
            session.add(
                Market(
                    market_code=code,
                    market_name=code,
                    market_type_code="A",
                    market_type_name="골목상권",
                    district_code="11440",
                    district_name="마포구",
                    admin_dong_code=None,
                    admin_dong_name=None,
                    source_x=None,
                    source_y=None,
                    coordinate_system="EPSG:5181",
                    area_sqm=1000,
                    source_snapshot_id="market-source",
                )
            )
        session.commit()

    snapshot_dir = tmp_path / "data" / "raw" / "seoul-market" / "snapshot"
    snapshot_dir.mkdir(parents=True)
    base_rows = [
        {"STDR_YYQU_CD": "20251", "TRDAR_CD": code, "TRDAR_CD_NM": code}
        for code in sorted(SUPPORTED_MARKETS)
    ]
    for slug in ("resident", "workers"):
        rows = []
        for index, row in enumerate(base_rows, 1):
            total = index * 600
            if slug == "resident":
                fields = {
                    "TOT_REPOP_CO": total,
                    "ML_REPOP_CO": total // 2,
                    "FML_REPOP_CO": total // 2,
                    "TOT_HSHLD_CO": index * 10,
                }
                suffix = "REPOP_CO"
            else:
                fields = {
                    "TOT_WRC_POPLTN_CO": total,
                    "ML_WRC_POPLTN_CO": total // 2,
                    "FML_WRC_POPLTN_CO": total // 2,
                    "TOT_HSHLD_CO": index * 10,
                }
                suffix = "WRC_POPLTN_CO"
            for age in (10, 20, 30, 40, 50):
                fields[f"AGRDE_{age}_{suffix}"] = index * 100
                fields[f"MAG_{age}_{suffix}"] = index * 50
                fields[f"FAG_{age}_{suffix}"] = index * 50
            fields[f"AGRDE_60_ABOVE_{suffix}"] = index * 100
            fields[f"MAG_60_ABOVE_{suffix}"] = index * 50
            fields[f"FAG_60_ABOVE_{suffix}"] = index * 50
            rows.append({**row, **fields})
        payload = {
            "service": SOURCES[slug].service,
            "source_name": SOURCES[slug].title,
            "source_type": SOURCES[slug].source_type,
            "source_url": SOURCES[slug].dataset_url,
            "period": "20251",
            "collected_at": "2026-07-16T00:00:00Z",
            "list_total_count": 3,
            "saved_row_count": 3,
            "truncated": False,
            "rows": rows,
        }
        (snapshot_dir / f"{slug}.json").write_text(
            json.dumps(payload, ensure_ascii=False), encoding="utf-8"
        )

    first = import_market_population(snapshot_dir, engine, "20251")
    second = import_market_population(snapshot_dir, engine, "20251")

    assert first == second
    assert second.row_count == 3
    with Session(engine) as session:
        rows = session.scalars(select(MarketPopulationMetric)).all()
        assert len(rows) == 3
        assert {row.period for row in rows} == {"20251"}
        assert all(row.household_count is not None for row in rows)
    engine.dispose()


def test_demographic_total_mismatch_is_rejected() -> None:
    with pytest.raises(MarketPopulationImportError, match="sex totals"):
        _validate_demographics(
            {"TOT_REPOP_CO": 10, "ML_REPOP_CO": 6, "FML_REPOP_CO": 5},
            kind="resident",
        )
