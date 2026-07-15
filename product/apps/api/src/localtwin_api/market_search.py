"""Limited market and store search backed by the product PostgreSQL database."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from localtwin_api.db_models import Market, MarketGeometry, StoreMarketLink, StorePoint

SUPPORTED_MARKET_CODES = ("3110562", "3120103", "3120101")


class MarketSearchResult(BaseModel):
    result_type: Literal["market", "store"]
    id: str
    name: str
    address: str | None
    category_code: str | None
    category_name: str | None
    longitude: float
    latitude: float
    market_id: str
    market_name: str


class MarketSearchResponse(BaseModel):
    query: str
    results: list[MarketSearchResult]


def escaped_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def text_matches(pattern: str, *columns: object):
    return or_(*(func.coalesce(column, "").ilike(pattern, escape="\\") for column in columns))


class MarketSearchRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def search(
        self, query: str, *, category: str | None = None, limit: int = 10
    ) -> list[MarketSearchResult]:
        pattern = f"%{escaped_like(query)}%"
        fetch_limit = min(limit * 4, 80)
        market_statement = (
            select(Market, MarketGeometry)
            .join(MarketGeometry, MarketGeometry.market_code == Market.market_code)
            .where(
                Market.market_code.in_(SUPPORTED_MARKET_CODES),
                text_matches(
                    pattern,
                    Market.market_name,
                    Market.district_name,
                    Market.admin_dong_name,
                ),
            )
            .order_by(Market.market_name, Market.market_code)
            .limit(fetch_limit)
        )
        market_rows = self.session.execute(market_statement).all()

        store_conditions = [
            StoreMarketLink.market_code.in_(SUPPORTED_MARKET_CODES),
            text_matches(
                pattern,
                StorePoint.name,
                StorePoint.branch_name,
                StorePoint.road_address,
                StorePoint.category_large_name,
                StorePoint.category_middle_name,
                StorePoint.category_small_name,
            ),
        ]
        if category:
            category_pattern = f"%{escaped_like(category)}%"
            store_conditions.append(
                text_matches(
                    category_pattern,
                    StorePoint.category_large_name,
                    StorePoint.category_middle_name,
                    StorePoint.category_small_name,
                )
            )
        store_statement = (
            select(StorePoint, StoreMarketLink, Market)
            .join(StoreMarketLink, StoreMarketLink.store_id == StorePoint.store_id)
            .join(Market, Market.market_code == StoreMarketLink.market_code)
            .where(*store_conditions)
            .order_by(StorePoint.name, StorePoint.store_id)
            .limit(fetch_limit)
        )
        store_rows = self.session.execute(store_statement).all()

        results = [
            MarketSearchResult(
                result_type="market",
                id=market.market_code,
                name=market.market_name,
                address=" ".join(
                    part for part in (market.district_name, market.admin_dong_name) if part
                )
                or None,
                category_code=None,
                category_name=market.market_type_name,
                longitude=geometry.center_longitude,
                latitude=geometry.center_latitude,
                market_id=market.market_code,
                market_name=market.market_name,
            )
            for market, geometry in market_rows
        ]
        results.extend(
            MarketSearchResult(
                result_type="store",
                id=store.store_id,
                name=store.name,
                address=store.road_address,
                category_code=(
                    store.category_small_code
                    or store.category_middle_code
                    or store.category_large_code
                ),
                category_name=(
                    store.category_small_name
                    or store.category_middle_name
                    or store.category_large_name
                ),
                longitude=store.longitude,
                latitude=store.latitude,
                market_id=market.market_code,
                market_name=market.market_name,
            )
            for store, _, market in store_rows
            if store.longitude is not None and store.latitude is not None
        )
        normalized_query = query.casefold()

        def result_rank(result: MarketSearchResult) -> tuple[int, int, str, str]:
            normalized_name = result.name.casefold()
            match_rank = (
                0
                if normalized_name == normalized_query
                else 1
                if normalized_name.startswith(normalized_query)
                else 2
            )
            type_rank = 0 if result.result_type == "market" else 1
            return match_rank, type_rank, normalized_name, result.id

        return sorted(results, key=result_rank)[:limit]
