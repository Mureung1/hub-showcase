import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient
from test_database import alembic_config

from alembic import command
from localtwin_api.canonical_db import SCHEMA
from localtwin_api.config import Settings
from localtwin_api.database import create_database_engine, create_session_factory
from localtwin_api.main import create_app
from localtwin_api.market_analysis import (
    _enriched_peers,
    _percentile,
    _target_values,
    analyze_market,
)
from localtwin_api.postgres_seed import seed_canonical


def build_market_database(path: Path) -> None:
    with sqlite3.connect(path) as connection:
        connection.executescript(SCHEMA)
        for source_id, dataset in (
            ("stores", "서울시 상권분석서비스(점포-상권)"),
            ("sales", "서울시 상권분석서비스(추정매출-상권)"),
            ("flow", "서울시 상권분석서비스(길단위인구-상권)"),
        ):
            connection.execute(
                "INSERT INTO data_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    source_id,
                    "서울 열린데이터광장",
                    dataset,
                    "api",
                    f"https://data.seoul.go.kr/{source_id}",
                    "2026-07-11T00:00:00Z",
                    "20251",
                    3,
                    source_id,
                    f"raw/{source_id}.json",
                ),
            )
        for index, market_id in enumerate(("m1", "m2", "m3"), start=1):
            connection.execute(
                "INSERT INTO markets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    market_id,
                    f"시장 {index}",
                    "A",
                    "골목상권",
                    "11440",
                    "마포구",
                    "1",
                    "연남동",
                    0,
                    0,
                    "source",
                    100_000,
                    "stores",
                ),
            )
            connection.execute(
                "INSERT INTO store_metrics VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    market_id,
                    "20251",
                    "CS100010",
                    "커피-음료",
                    index * 10,
                    index * 9,
                    index,
                    5,
                    index + 1,
                    3,
                    index,
                    "stores",
                ),
            )
            connection.execute(
                "INSERT INTO sales_metrics VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    market_id,
                    "20251",
                    "CS100010",
                    "커피-음료",
                    index * 100_000_000,
                    index * 1_000,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    "sales",
                ),
            )
            connection.execute(
                "INSERT INTO flow_metrics VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    market_id,
                    "20251",
                    index * 1_000_000,
                    index * 100_000,
                    index * 120_000,
                    index * 150_000,
                    index * 180_000,
                    index * 250_000,
                    index * 200_000,
                    "flow",
                ),
            )
        connection.commit()


def test_percentile_uses_midrank_for_ties() -> None:
    assert _percentile([10, 20, 20, 40], 20) == 0.5


def test_peer_enrichment_and_target_values_do_not_need_a_database() -> None:
    row = {
        "market_code": "m1",
        "category_store_count": 10,
        "monthly_sales_amount": 1000,
        "total_flow": 500,
        "closure_count": 2,
        "opening_count": 4,
        "area_sqm": 1000,
    }

    enriched = _enriched_peers([row], {"m1": 20})
    values = _target_values(row, 10)

    assert enriched == [
        {
            "sales_per_store": 100,
            "foot_traffic": 500,
            "closure_rate": 20,
            "same_category_density": 1_000,
            "net_opening_rate": 20,
            "category_share": 0.5,
        }
    ]
    assert values["sales_per_store"] == 100
    assert values["net_opening_rate"] == 20


def test_market_analysis_returns_raw_values_score_and_sources(tmp_path: Path) -> None:
    database = tmp_path / "market.db"
    build_market_database(database)

    result = analyze_market("m2", "카페", database=database)

    assert result.market_name == "시장 2"
    assert result.raw.category_store_count == 20
    assert result.raw.total_flow == 2_000_000
    assert result.raw.flow_by_time[4] == 500_000
    assert [bucket.label for bucket in result.raw.flow_time_buckets] == [
        "00:00-06:00",
        "06:00-11:00",
        "11:00-14:00",
        "14:00-17:00",
        "17:00-21:00",
        "21:00-24:00",
    ]
    assert result.raw.flow_time_buckets[4].value == 500_000
    assert result.score.formula_version == "1.1.0"
    assert result.score.decision_status == "insufficient_evidence"
    assert result.score.data_coverage == 55
    assert "peer_sample_too_small" in result.score.decision_blockers
    assert "coverage_below_60" in result.score.decision_blockers
    assert all(row.sample_basis == "known" for row in result.score.metric_evidence)
    assert {evidence.metric for evidence in result.evidence} == {
        "점포·개폐업",
        "추정매출",
        "길단위인구",
    }
    same_type = next(group for group in result.rankings if group.id == "same_type")
    store_rank = next(
        metric for metric in same_type.metrics if metric.key == "category_store_count"
    )
    closure_rank = next(metric for metric in same_type.metrics if metric.key == "closure_count")
    assert store_rank.value == 20
    assert store_rank.rank == 2
    assert store_rank.peer_count == 3
    assert store_rank.percentile == 66.7
    assert store_rank.peer_group == "서울 골목상권"
    assert closure_rank.rank == 2
    assert closure_rank.direction == "descending"


def test_market_analysis_endpoint_reads_the_runtime_database(tmp_path: Path) -> None:
    canonical_database = tmp_path / "canonical.db"
    build_market_database(canonical_database)
    expected = analyze_market("m2", "카페", database=canonical_database)

    runtime_url = f"sqlite:///{tmp_path / 'runtime.db'}"
    command.upgrade(alembic_config(runtime_url), "head")
    engine = create_database_engine(runtime_url, require_postgresql=False)
    seed_canonical(canonical_database, engine)
    factory = create_session_factory(engine)
    client = TestClient(create_app(Settings(_env_file=None), search_session_factory=factory))

    periods = client.get("/api/v1/analysis/periods", params={"category": "카페"})
    assert periods.status_code == 200
    assert periods.json() == {
        "periods": ["20251"],
        "default_period": "20251",
        "policy": "latest_complete_quarter",
    }

    response = client.get("/api/v1/markets/m2", params={"category": "카페", "period": "20251"})

    assert response.status_code == 200
    assert response.json() == expected.model_dump(mode="json")
    missing = client.get("/api/v1/markets/unknown", params={"category": "카페", "period": "20251"})
    assert missing.status_code == 404
    engine.dispose()


def test_market_analysis_endpoint_hides_runtime_database_errors(tmp_path: Path) -> None:
    engine = create_database_engine(
        f"sqlite:///{tmp_path / 'missing-analysis-schema.db'}", require_postgresql=False
    )
    factory = create_session_factory(engine)
    client = TestClient(create_app(Settings(_env_file=None), search_session_factory=factory))

    response = client.get("/api/v1/markets/m2", params={"category": "카페", "period": "20251"})

    assert response.status_code == 503
    assert response.json() == {"detail": "Market analysis service is unavailable."}
    assert "sqlite" not in response.text.lower()
    engine.dispose()


def test_ranking_uses_competition_rank_for_ties_and_rejects_small_samples(tmp_path: Path) -> None:
    database = tmp_path / "market.db"
    build_market_database(database)
    with sqlite3.connect(database) as connection:
        connection.execute(
            "UPDATE store_metrics SET similar_store_count = 20 WHERE market_code = 'm3'"
        )
        connection.commit()

    tied = analyze_market("m2", "카페", database=database)
    tied_group = next(group for group in tied.rankings if group.id == "same_type")
    tied_rank = next(
        metric for metric in tied_group.metrics if metric.key == "category_store_count"
    )
    assert tied_rank.rank == 1
    assert tied_rank.peer_count == 3

    with sqlite3.connect(database) as connection:
        connection.execute(
            "UPDATE markets SET market_type_name = '발달상권' WHERE market_code = 'm3'"
        )
        connection.commit()

    result = analyze_market("m2", "카페", database=database)
    same_type = next(group for group in result.rankings if group.id == "same_type")
    store_rank = next(
        metric for metric in same_type.metrics if metric.key == "category_store_count"
    )

    assert store_rank.value == 20
    assert store_rank.rank is None
    assert store_rank.peer_count == 2
    assert store_rank.available is False
    assert store_rank.reason == "순위 표본이 3개 미만입니다."


def test_ranking_explains_missing_metric_instead_of_ranking_zero(tmp_path: Path) -> None:
    database = tmp_path / "market.db"
    build_market_database(database)
    with sqlite3.connect(database) as connection:
        connection.execute("DELETE FROM sales_metrics WHERE market_code = 'm2'")
        connection.commit()

    result = analyze_market("m2", "카페", database=database)
    same_type = next(group for group in result.rankings if group.id == "same_type")
    sales_rank = next(
        metric for metric in same_type.metrics if metric.key == "monthly_sales_amount"
    )

    assert sales_rank.value is None
    assert sales_rank.rank is None
    assert sales_rank.available is False
    assert sales_rank.reason == "선택 상권에 이 지표의 공식 데이터가 없습니다."
