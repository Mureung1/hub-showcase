import sqlite3
from pathlib import Path

from localtwin_api.canonical_db import SCHEMA
from localtwin_api.market_analysis import _percentile, analyze_market


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


def test_market_analysis_returns_raw_values_score_and_sources(tmp_path: Path) -> None:
    database = tmp_path / "market.db"
    build_market_database(database)

    result = analyze_market("m2", "카페", database=database)

    assert result.market_name == "시장 2"
    assert result.raw.category_store_count == 20
    assert result.raw.total_flow == 2_000_000
    assert result.raw.flow_by_time[4] == 500_000
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
