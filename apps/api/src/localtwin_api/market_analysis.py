"""Canonical SQLite market summaries backed by official Seoul snapshots."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Literal

from pydantic import BaseModel

from localtwin_api.market_score import (
    MarketScoreRequest,
    MarketScoreResponse,
    ScoreMetric,
    evaluate_market_score,
)
from localtwin_api.seoul_open_data import repository_root

Category = Literal["카페", "음식점", "베이커리", "편의점"]

CATEGORY_CODES: dict[Category, tuple[str, ...]] = {
    "카페": ("CS100010",),
    "음식점": (
        "CS100001",
        "CS100002",
        "CS100003",
        "CS100004",
        "CS100006",
        "CS100007",
        "CS100008",
        "CS100009",
    ),
    "베이커리": ("CS100005",),
    "편의점": ("CS300002",),
}


class MarketEvidence(BaseModel):
    metric: str
    source_name: str
    source_url: str
    period: str
    source_type: Literal["official", "derived"]


class MarketRawSummary(BaseModel):
    category_store_count: int
    total_store_count: int
    opening_count: int
    closure_count: int
    monthly_sales_amount: float | None
    monthly_sales_count: float | None
    total_flow: float | None
    flow_by_time: list[float]
    area_sqm: float | None


class MarketAnalysisResponse(BaseModel):
    market_id: str
    market_name: str
    market_type: str | None
    district_name: str | None
    admin_dong_name: str | None
    category: Category
    period: str
    score: MarketScoreResponse
    raw: MarketRawSummary
    evidence: list[MarketEvidence]


def default_database_path() -> Path:
    return repository_root() / "data" / "processed" / "localtwin.db"


def _percentile(values: list[float], value: float) -> float:
    if len(values) <= 1:
        return 0.5
    ordered = sorted(values)
    less = sum(candidate < value for candidate in ordered)
    equal = sum(candidate == value for candidate in ordered)
    rank = (less + max(0, equal - 1) / 2) / (len(ordered) - 1)
    return min(1.0, max(0.0, rank))


def _category_rows(
    connection: sqlite3.Connection, period: str, codes: tuple[str, ...]
) -> list[sqlite3.Row]:
    placeholders = ",".join("?" for _ in codes)
    return connection.execute(
        f"""
        SELECT
          m.market_code,
          m.market_name,
          m.market_type_name,
          m.district_name,
          m.admin_dong_name,
          m.area_sqm,
          SUM(COALESCE(sm.similar_store_count, 0)) AS category_store_count,
          SUM(COALESCE(sm.opening_count, 0)) AS opening_count,
          SUM(COALESCE(sm.closure_count, 0)) AS closure_count,
          SUM(COALESCE(s.monthly_sales_amount, 0)) AS monthly_sales_amount,
          SUM(COALESCE(s.monthly_sales_count, 0)) AS monthly_sales_count,
          f.total_flow,
          f.flow_00_06,
          f.flow_06_11,
          f.flow_11_14,
          f.flow_14_17,
          f.flow_17_21,
          f.flow_21_24,
          sm.source_snapshot_id AS store_source_id,
          s.source_snapshot_id AS sales_source_id,
          f.source_snapshot_id AS flow_source_id
        FROM markets m
        JOIN store_metrics sm
          ON sm.market_code = m.market_code AND sm.period = ?
        LEFT JOIN sales_metrics s
          ON s.market_code = sm.market_code
         AND s.period = sm.period
         AND s.category_code = sm.category_code
        LEFT JOIN flow_metrics f
          ON f.market_code = m.market_code AND f.period = sm.period
        WHERE sm.category_code IN ({placeholders})
        GROUP BY m.market_code
        """,
        (period, *codes),
    ).fetchall()


def _total_stores(connection: sqlite3.Connection, market_id: str, period: str) -> int:
    row = connection.execute(
        """
        SELECT SUM(COALESCE(similar_store_count, 0))
        FROM store_metrics WHERE market_code = ? AND period = ?
        """,
        (market_id, period),
    ).fetchone()
    return int(row[0] or 0)


def _source(connection: sqlite3.Connection, snapshot_id: str | None) -> tuple[str, str]:
    if not snapshot_id:
        return "서울 열린데이터광장", "https://data.seoul.go.kr/"
    row = connection.execute(
        "SELECT dataset, source_url FROM data_sources WHERE snapshot_id = ?",
        (snapshot_id,),
    ).fetchone()
    return (
        (str(row[0]), str(row[1]))
        if row
        else (
            "서울 열린데이터광장",
            "https://data.seoul.go.kr/",
        )
    )


def analyze_market(
    market_id: str,
    category: Category,
    period: str = "20251",
    database: Path | None = None,
) -> MarketAnalysisResponse:
    database_path = database or default_database_path()
    if not database_path.exists():
        raise FileNotFoundError(database_path)
    with sqlite3.connect(database_path) as connection:
        connection.row_factory = sqlite3.Row
        rows = _category_rows(connection, period, CATEGORY_CODES[category])
        target = next((row for row in rows if row["market_code"] == market_id), None)
        if target is None:
            raise LookupError((market_id, category, period))

        total_store_count = _total_stores(connection, market_id, period)
        category_store_count = int(target["category_store_count"] or 0)
        if total_store_count <= 0 or category_store_count <= 0:
            raise LookupError((market_id, category, period))

        enriched: list[dict[str, float]] = []
        for row in rows:
            peer_total = _total_stores(connection, row["market_code"], period)
            peer_category = float(row["category_store_count"] or 0)
            if peer_total <= 0 or peer_category <= 0:
                continue
            sales = float(row["monthly_sales_amount"] or 0)
            area = float(row["area_sqm"] or 0)
            enriched.append(
                {
                    "sales_per_store": sales / peer_category if sales else 0,
                    "foot_traffic": float(row["total_flow"] or 0),
                    "closure_rate": float(row["closure_count"] or 0) / peer_category * 100,
                    "same_category_density": peer_category / max(area / 1_000_000, 0.01),
                    "net_opening_rate": (
                        float(row["opening_count"] or 0) - float(row["closure_count"] or 0)
                    )
                    / peer_category
                    * 100,
                    "category_share": peer_category / peer_total,
                }
            )

        sales_per_store = float(target["monthly_sales_amount"] or 0) / category_store_count
        foot_traffic = float(target["total_flow"] or 0)
        closure_rate = float(target["closure_count"] or 0) / category_store_count
        area_sqm = float(target["area_sqm"] or 0)
        density = category_store_count / max(area_sqm / 1_000_000, 0.01)
        net_opening_rate = (
            float(target["opening_count"] or 0) - float(target["closure_count"] or 0)
        ) / category_store_count

        store_source = _source(connection, target["store_source_id"])
        sales_source = _source(connection, target["sales_source_id"])
        flow_source = _source(connection, target["flow_source_id"])

        def metric(
            key: str,
            value: float,
            unit: str,
            source_name: str,
            source_url: str,
            source_type: Literal["official", "derived"],
        ) -> ScoreMetric:
            return ScoreMetric(
                value=value,
                percentile=_percentile([row[key] for row in enriched], value),
                unit=unit,
                source_name=source_name,
                source_url=source_url,
                source_type=source_type,
                period=period,
                sample_size=len(enriched),
                age_days=90,
            )

        metrics = {
            "sales_per_store": metric(
                "sales_per_store", sales_per_store, "원/분기", *sales_source, "derived"
            ),
            "foot_traffic": metric(
                "foot_traffic", foot_traffic, "명/분기", *flow_source, "official"
            ),
            "closure_rate": metric(
                "closure_rate", closure_rate * 100, "%", *store_source, "derived"
            ),
            "same_category_density": metric(
                "same_category_density", density, "개/km²", *store_source, "derived"
            ),
            "net_opening_rate": metric(
                "net_opening_rate", net_opening_rate * 100, "%", *store_source, "derived"
            ),
        }
        peer_category_share = sum(row["category_share"] for row in enriched) / len(enriched)
        score = evaluate_market_score(
            MarketScoreRequest(
                market_id=market_id,
                market_name=str(target["market_name"]),
                category=category,
                peer_group=f"서울 {target['market_type_name']} 2025.1Q",
                local_category_store_count=category_store_count,
                local_total_store_count=total_store_count,
                peer_category_share=peer_category_share,
                metrics=metrics,
            )
        )
        flow_by_time = [
            float(target[key] or 0)
            for key in (
                "flow_00_06",
                "flow_06_11",
                "flow_11_14",
                "flow_14_17",
                "flow_17_21",
                "flow_21_24",
            )
        ]
        return MarketAnalysisResponse(
            market_id=market_id,
            market_name=str(target["market_name"]),
            market_type=target["market_type_name"],
            district_name=target["district_name"],
            admin_dong_name=target["admin_dong_name"],
            category=category,
            period=period,
            score=score,
            raw=MarketRawSummary(
                category_store_count=category_store_count,
                total_store_count=total_store_count,
                opening_count=int(target["opening_count"] or 0),
                closure_count=int(target["closure_count"] or 0),
                monthly_sales_amount=float(target["monthly_sales_amount"] or 0) or None,
                monthly_sales_count=float(target["monthly_sales_count"] or 0) or None,
                total_flow=foot_traffic or None,
                flow_by_time=flow_by_time,
                area_sqm=area_sqm or None,
            ),
            evidence=[
                MarketEvidence(
                    metric="점포·개폐업",
                    source_name=store_source[0],
                    source_url=store_source[1],
                    period=period,
                    source_type="official",
                ),
                MarketEvidence(
                    metric="추정매출",
                    source_name=sales_source[0],
                    source_url=sales_source[1],
                    period=period,
                    source_type="official",
                ),
                MarketEvidence(
                    metric="길단위인구",
                    source_name=flow_source[0],
                    source_url=flow_source[1],
                    period=period,
                    source_type="official",
                ),
            ],
        )
