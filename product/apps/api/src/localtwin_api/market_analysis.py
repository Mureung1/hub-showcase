"""Market summaries shared by the canonical baseline and product runtime DB."""

from __future__ import annotations

import sqlite3
from collections.abc import Mapping
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from localtwin_api.db_models import DataSource, FlowMetric, Market, SalesMetric, StoreMetric
from localtwin_api.market_score import (
    MarketScoreRequest,
    MarketScoreResponse,
    ScoreMetric,
    evaluate_market_score,
)
from localtwin_api.product_catalog import CATEGORY_CODES, SUPPORTED_MARKET_CODES, Category
from localtwin_api.seoul_open_data import repository_root

SOURCE_LABELS = {
    "stores": "서울시 상권분석서비스 점포",
    "sales": "서울시 상권분석서비스 추정매출",
    "flow": "서울시 상권분석서비스 길단위인구",
}

FLOW_TIME_BUCKETS = (
    ("00:00-06:00", "flow_00_06"),
    ("06:00-11:00", "flow_06_11"),
    ("11:00-14:00", "flow_11_14"),
    ("14:00-17:00", "flow_14_17"),
    ("17:00-21:00", "flow_17_21"),
    ("21:00-24:00", "flow_21_24"),
)


class MarketEvidence(BaseModel):
    metric: str
    source_name: str
    source_url: str
    period: str
    source_type: Literal["official", "derived"]


class FlowTimeBucket(BaseModel):
    label: str
    value: float | None


class MarketRawSummary(BaseModel):
    category_store_count: int
    total_store_count: int
    opening_count: int
    closure_count: int
    monthly_sales_amount: float | None
    monthly_sales_count: float | None
    total_flow: float | None
    flow_by_time: list[float]
    flow_time_buckets: list[FlowTimeBucket]
    area_sqm: float | None


class MarketMetricRanking(BaseModel):
    key: str
    label: str
    value: float | None
    unit: str
    rank: int | None
    peer_count: int
    percentile: float | None
    period: str
    peer_group: str
    direction: Literal["descending"] = "descending"
    available: bool
    reason: str | None = None


class MarketRankingGroup(BaseModel):
    id: Literal["same_type", "supported"]
    label: str
    metrics: list[MarketMetricRanking]


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
    rankings: list[MarketRankingGroup]


class AnalysisPeriodsResponse(BaseModel):
    periods: list[str]
    default_period: str
    policy: Literal["latest_complete_quarter"] = "latest_complete_quarter"


MIN_RANKING_SAMPLE = 3
RANKING_METRICS = (
    ("category_store_count", "동일 업종 점포", "개"),
    ("same_category_density", "동일 업종 밀도", "개/km²"),
    ("monthly_sales_amount", "분기 추정매출", "원/분기"),
    ("sales_per_store", "점포당 추정매출", "원/분기"),
    ("opening_count", "개업 수", "개/분기"),
    ("closure_count", "폐업 수", "개/분기"),
    ("net_opening_count", "순증 점포", "개/분기"),
    ("total_flow", "유동인구", "명/분기"),
    ("flow_density", "유동인구 밀도", "명/km²/분기"),
)


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
    if row:
        dataset = str(row[0])
        return SOURCE_LABELS.get(dataset, dataset), str(row[1])
    return "서울 열린데이터광장", "https://data.seoul.go.kr/"


AnalysisRow = Mapping[str, Any]


def _ranking_values(row: AnalysisRow) -> dict[str, float | None]:
    category_store_count = float(row["category_store_count"] or 0)
    area = float(row["area_sqm"] or 0)
    sales = float(row["monthly_sales_amount"] or 0) if row["sales_source_id"] is not None else None
    flow = float(row["total_flow"] or 0) if row["flow_source_id"] is not None else None
    return {
        "category_store_count": category_store_count,
        "same_category_density": (
            category_store_count / max(area / 1_000_000, 0.01) if area > 0 else None
        ),
        "monthly_sales_amount": sales,
        "sales_per_store": (
            sales / category_store_count if sales is not None and category_store_count > 0 else None
        ),
        "opening_count": float(row["opening_count"] or 0),
        "closure_count": float(row["closure_count"] or 0),
        "net_opening_count": float(row["opening_count"] or 0) - float(row["closure_count"] or 0),
        "total_flow": flow,
        "flow_density": flow / (area / 1_000_000) if flow is not None and area > 0 else None,
    }


def _ranking_group(
    group_id: Literal["same_type", "supported"],
    label: str,
    rows: list[AnalysisRow],
    target_market_id: str,
    period: str,
) -> MarketRankingGroup:
    target = next((row for row in rows if row["market_code"] == target_market_id), None)
    metrics: list[MarketMetricRanking] = []
    for key, metric_label, unit in RANKING_METRICS:
        peers = [value for row in rows if (value := _ranking_values(row)[key]) is not None]
        target_value = _ranking_values(target)[key] if target is not None else None
        if target_value is None:
            reason = "선택 상권에 이 지표의 공식 데이터가 없습니다."
        elif len(peers) < MIN_RANKING_SAMPLE:
            reason = f"순위 표본이 {MIN_RANKING_SAMPLE}개 미만입니다."
        else:
            reason = None
        available = reason is None
        rank = 1 + sum(value > target_value for value in peers) if available else None
        metrics.append(
            MarketMetricRanking(
                key=key,
                label=metric_label,
                value=target_value,
                unit=unit,
                rank=rank,
                peer_count=len(peers),
                percentile=round(rank / len(peers) * 100, 1) if rank is not None else None,
                period=period,
                peer_group=label,
                available=available,
                reason=reason,
            )
        )
    return MarketRankingGroup(id=group_id, label=label, metrics=metrics)


def _enriched_peers(
    rows: list[AnalysisRow], totals: Mapping[str, int]
) -> list[dict[str, float]]:
    enriched: list[dict[str, float]] = []
    for row in rows:
        peer_total = totals.get(str(row["market_code"]), 0)
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
    return enriched


def _target_values(target: AnalysisRow, category_store_count: int) -> dict[str, float]:
    sales_per_store = float(target["monthly_sales_amount"] or 0) / category_store_count
    foot_traffic = float(target["total_flow"] or 0)
    area_sqm = float(target["area_sqm"] or 0)
    return {
        "sales_per_store": sales_per_store,
        "foot_traffic": foot_traffic,
        "closure_rate": float(target["closure_count"] or 0) / category_store_count * 100,
        "same_category_density": category_store_count / max(area_sqm / 1_000_000, 0.01),
        "net_opening_rate": (
            float(target["opening_count"] or 0) - float(target["closure_count"] or 0)
        )
        / category_store_count
        * 100,
        "area_sqm": area_sqm,
    }


def _score_metric(
    key: str,
    value: float,
    unit: str,
    source: tuple[str, str],
    source_type: Literal["official", "derived"],
    enriched: list[dict[str, float]],
    period: str,
) -> ScoreMetric:
    return ScoreMetric(
        value=value,
        percentile=_percentile([row[key] for row in enriched], value),
        unit=unit,
        source_name=source[0],
        source_url=source[1],
        source_type=source_type,
        period=period,
        sample_size=len(enriched),
        sample_basis="known",
        age_days=90,
    )


def _score_metrics(
    values: Mapping[str, float],
    sources: Mapping[str, tuple[str, str]],
    target: AnalysisRow,
    enriched: list[dict[str, float]],
    period: str,
) -> dict[str, ScoreMetric]:
    fallback_source = ("서울 열린데이터광장", "https://data.seoul.go.kr/")
    store_source = sources.get(str(target["store_source_id"]), fallback_source)
    sales_source = sources.get(str(target["sales_source_id"]), fallback_source)
    flow_source = sources.get(str(target["flow_source_id"]), fallback_source)
    return {
        "sales_per_store": _score_metric(
            "sales_per_store",
            values["sales_per_store"],
            "원/분기",
            sales_source,
            "derived",
            enriched,
            period,
        ),
        "foot_traffic": _score_metric(
            "foot_traffic",
            values["foot_traffic"],
            "명/분기",
            flow_source,
            "official",
            enriched,
            period,
        ),
        "closure_rate": _score_metric(
            "closure_rate", values["closure_rate"], "%", store_source, "derived", enriched, period
        ),
        "same_category_density": _score_metric(
            "same_category_density",
            values["same_category_density"],
            "개/km²",
            store_source,
            "derived",
            enriched,
            period,
        ),
        "net_opening_rate": _score_metric(
            "net_opening_rate",
            values["net_opening_rate"],
            "%",
            store_source,
            "derived",
            enriched,
            period,
        ),
    }


def _evidence(
    target: AnalysisRow, sources: Mapping[str, tuple[str, str]], period: str
) -> list[MarketEvidence]:
    fallback_source = ("서울 열린데이터광장", "https://data.seoul.go.kr/")
    source_rows = (
        ("점포·개폐업", "store_source_id"),
        ("추정매출", "sales_source_id"),
        ("길단위인구", "flow_source_id"),
    )
    return [
        MarketEvidence(
            metric=metric,
            source_name=(source := sources.get(str(target[source_key]), fallback_source))[0],
            source_url=source[1],
            period=period,
            source_type="official",
        )
        for metric, source_key in source_rows
    ]


def _raw_summary(
    target: AnalysisRow,
    category_store_count: int,
    total_store_count: int,
    values: Mapping[str, float],
) -> MarketRawSummary:
    flow_time_buckets = [
        FlowTimeBucket(label=label, value=float(target[key]) if target[key] is not None else None)
        for label, key in FLOW_TIME_BUCKETS
    ]
    return MarketRawSummary(
        category_store_count=category_store_count,
        total_store_count=total_store_count,
        opening_count=int(target["opening_count"] or 0),
        closure_count=int(target["closure_count"] or 0),
        monthly_sales_amount=float(target["monthly_sales_amount"] or 0) or None,
        monthly_sales_count=float(target["monthly_sales_count"] or 0) or None,
        total_flow=values["foot_traffic"] or None,
        flow_by_time=[bucket.value or 0 for bucket in flow_time_buckets],
        flow_time_buckets=flow_time_buckets,
        area_sqm=values["area_sqm"] or None,
    )


def _build_analysis(
    rows: list[AnalysisRow],
    totals: Mapping[str, int],
    sources: Mapping[str, tuple[str, str]],
    market_id: str,
    category: Category,
    period: str,
) -> MarketAnalysisResponse:
    target = next((row for row in rows if row["market_code"] == market_id), None)
    if target is None:
        raise LookupError((market_id, category, period))

    total_store_count = totals.get(market_id, 0)
    category_store_count = int(target["category_store_count"] or 0)
    if total_store_count <= 0 or category_store_count <= 0:
        raise LookupError((market_id, category, period))

    enriched = _enriched_peers(rows, totals)
    values = _target_values(target, category_store_count)
    metrics = _score_metrics(values, sources, target, enriched, period)
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
            peer_sample_size=len(enriched),
            metrics=metrics,
        )
    )
    same_type_rows = [row for row in rows if row["market_type_name"] == target["market_type_name"]]
    supported_rows = [row for row in rows if row["market_code"] in SUPPORTED_MARKET_CODES]
    return MarketAnalysisResponse(
        market_id=market_id,
        market_name=str(target["market_name"]),
        market_type=target["market_type_name"],
        district_name=target["district_name"],
        admin_dong_name=target["admin_dong_name"],
        category=category,
        period=period,
        score=score,
        raw=_raw_summary(target, category_store_count, total_store_count, values),
        evidence=_evidence(target, sources, period),
        rankings=[
            _ranking_group(
                "same_type",
                f"서울 {target['market_type_name']}",
                same_type_rows,
                market_id,
                period,
            ),
            _ranking_group(
                "supported",
                "현재 지원 상권",
                supported_rows,
                market_id,
                period,
            ),
        ],
    )


class MarketAnalysisRepository:
    """Read market analysis inputs from the product SQLAlchemy session."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, market_id: str, category: Category, period: str) -> MarketAnalysisResponse:
        rows = self._category_rows(period, CATEGORY_CODES[category])
        totals = self._total_stores(period)
        source_ids = {
            str(row[key])
            for row in rows
            for key in ("store_source_id", "sales_source_id", "flow_source_id")
            if row[key] is not None
        }
        sources = {
            source.snapshot_id: (
                SOURCE_LABELS.get(source.dataset, source.dataset),
                source.source_url,
            )
            for source in self.session.scalars(
                select(DataSource).where(DataSource.snapshot_id.in_(source_ids))
            )
        }
        return _build_analysis(rows, totals, sources, market_id, category, period)

    def available_periods(self, category: Category) -> AnalysisPeriodsResponse:
        codes = CATEGORY_CODES[category]
        statement = (
            select(StoreMetric.period)
            .join(Market, Market.market_code == StoreMetric.market_code)
            .join(
                SalesMetric,
                and_(
                    SalesMetric.market_code == StoreMetric.market_code,
                    SalesMetric.period == StoreMetric.period,
                    SalesMetric.category_code == StoreMetric.category_code,
                ),
            )
            .join(
                FlowMetric,
                and_(
                    FlowMetric.market_code == StoreMetric.market_code,
                    FlowMetric.period == StoreMetric.period,
                ),
            )
            .where(
                StoreMetric.category_code.in_(codes),
            )
            .distinct()
        )
        periods = sorted(self.session.scalars(statement).all(), reverse=True)
        if not periods:
            raise LookupError("No complete analysis period is available.")
        return AnalysisPeriodsResponse(periods=periods, default_period=periods[0])

    def _category_rows(self, period: str, codes: tuple[str, ...]) -> list[AnalysisRow]:
        statement = (
            select(
                Market.market_code.label("market_code"),
                Market.market_name.label("market_name"),
                Market.market_type_name.label("market_type_name"),
                Market.district_name.label("district_name"),
                Market.admin_dong_name.label("admin_dong_name"),
                Market.area_sqm.label("area_sqm"),
                func.sum(func.coalesce(StoreMetric.similar_store_count, 0)).label(
                    "category_store_count"
                ),
                func.sum(func.coalesce(StoreMetric.opening_count, 0)).label("opening_count"),
                func.sum(func.coalesce(StoreMetric.closure_count, 0)).label("closure_count"),
                func.sum(func.coalesce(SalesMetric.monthly_sales_amount, 0)).label(
                    "monthly_sales_amount"
                ),
                func.sum(func.coalesce(SalesMetric.monthly_sales_count, 0)).label(
                    "monthly_sales_count"
                ),
                FlowMetric.total_flow.label("total_flow"),
                FlowMetric.flow_00_06.label("flow_00_06"),
                FlowMetric.flow_06_11.label("flow_06_11"),
                FlowMetric.flow_11_14.label("flow_11_14"),
                FlowMetric.flow_14_17.label("flow_14_17"),
                FlowMetric.flow_17_21.label("flow_17_21"),
                FlowMetric.flow_21_24.label("flow_21_24"),
                func.max(StoreMetric.source_snapshot_id).label("store_source_id"),
                func.max(SalesMetric.source_snapshot_id).label("sales_source_id"),
                FlowMetric.source_snapshot_id.label("flow_source_id"),
            )
            .join(StoreMetric, StoreMetric.market_code == Market.market_code)
            .outerjoin(
                SalesMetric,
                and_(
                    SalesMetric.market_code == StoreMetric.market_code,
                    SalesMetric.period == StoreMetric.period,
                    SalesMetric.category_code == StoreMetric.category_code,
                ),
            )
            .outerjoin(
                FlowMetric,
                and_(
                    FlowMetric.market_code == Market.market_code,
                    FlowMetric.period == StoreMetric.period,
                ),
            )
            .where(StoreMetric.period == period, StoreMetric.category_code.in_(codes))
            .group_by(
                Market.market_code,
                Market.market_name,
                Market.market_type_name,
                Market.district_name,
                Market.admin_dong_name,
                Market.area_sqm,
                FlowMetric.total_flow,
                FlowMetric.flow_00_06,
                FlowMetric.flow_06_11,
                FlowMetric.flow_11_14,
                FlowMetric.flow_14_17,
                FlowMetric.flow_17_21,
                FlowMetric.flow_21_24,
                FlowMetric.source_snapshot_id,
            )
        )
        return [dict(row._mapping) for row in self.session.execute(statement)]

    def _total_stores(self, period: str) -> dict[str, int]:
        statement = (
            select(
                StoreMetric.market_code,
                func.sum(func.coalesce(StoreMetric.similar_store_count, 0)).label(
                    "total_store_count"
                ),
            )
            .where(StoreMetric.period == period)
            .group_by(StoreMetric.market_code)
        )
        return {
            str(row.market_code): int(row.total_store_count or 0)
            for row in self.session.execute(statement)
        }


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
        rows = [dict(row) for row in _category_rows(connection, period, CATEGORY_CODES[category])]
        totals = {
            str(row["market_code"]): _total_stores(connection, str(row["market_code"]), period)
            for row in rows
        }
        source_ids = {
            str(row[key])
            for row in rows
            for key in ("store_source_id", "sales_source_id", "flow_source_id")
            if row[key] is not None
        }
        sources = {source_id: _source(connection, source_id) for source_id in source_ids}
        return _build_analysis(rows, totals, sources, market_id, category, period)
