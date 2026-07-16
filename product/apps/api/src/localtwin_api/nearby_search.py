"""Nearby store analysis for a confirmed point inside a supported market area."""

from __future__ import annotations

import json
import math
from collections import Counter
from typing import Literal

from pydantic import BaseModel
from shapely import make_valid
from shapely.errors import ShapelyError
from shapely.geometry import Point, shape
from sqlalchemy import select
from sqlalchemy.orm import Session

from localtwin_api.db_models import Market, MarketGeometry, StorePoint
from localtwin_api.market_search import SUPPORTED_MARKET_CODES

NearbyRadius = Literal[100, 300, 500, 1000]
ALLOWED_NEARBY_RADII = (100, 300, 500, 1000)
EARTH_RADIUS_METERS = 6_371_000
MAX_RETURNED_STORES = 200
CATEGORY_ALIASES = {
    "카페": ("카페", "커피"),
    "음식점": ("음식점", "한식", "중식", "일식", "분식", "주점"),
    "베이커리": ("베이커리", "제과", "빵", "도넛"),
    "편의점": ("편의점",),
}


class NearbyCenter(BaseModel):
    latitude: float
    longitude: float


class NearbyStore(BaseModel):
    id: str
    name: str
    address: str | None
    category_code: str | None
    category_name: str | None
    distance_meters: float
    latitude: float
    longitude: float
    source_snapshot_id: str


class NearbyStoreResponse(BaseModel):
    center: NearbyCenter
    radius: NearbyRadius
    market_id: str
    market_name: str
    total_count: int
    same_category_count: int
    category_counts: dict[str, int]
    returned_count: int
    truncated: bool
    stores: list[NearbyStore]
    aggregation_scope: Literal["radius"] = "radius"


class UnsupportedAnalysisAreaError(ValueError):
    """Raised when the confirmed center is outside every supported market polygon."""


def haversine_distance_meters(
    from_longitude: float,
    from_latitude: float,
    to_longitude: float,
    to_latitude: float,
) -> float:
    latitude_delta = math.radians(to_latitude - from_latitude)
    longitude_delta = math.radians(to_longitude - from_longitude)
    from_latitude_radians = math.radians(from_latitude)
    to_latitude_radians = math.radians(to_latitude)
    haversine = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(from_latitude_radians)
        * math.cos(to_latitude_radians)
        * math.sin(longitude_delta / 2) ** 2
    )
    return 2 * EARTH_RADIUS_METERS * math.asin(math.sqrt(haversine))


def category_name(store: StorePoint) -> str | None:
    return store.category_small_name or store.category_middle_name or store.category_large_name


def category_code(store: StorePoint) -> str | None:
    return store.category_small_code or store.category_middle_code or store.category_large_code


def category_matches(store: StorePoint, requested_category: str | None) -> bool:
    if not requested_category:
        return False
    normalized = requested_category.casefold()
    search_terms = CATEGORY_ALIASES.get(normalized, (normalized,))
    return any(
        any(term in value.casefold() for term in search_terms)
        for value in (
            store.category_large_name,
            store.category_middle_name,
            store.category_small_name,
        )
        if value
    )


class NearbyStoreRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def supported_market_for_center(
        self, longitude: float, latitude: float
    ) -> tuple[Market, MarketGeometry]:
        statement = (
            select(Market, MarketGeometry)
            .join(MarketGeometry, MarketGeometry.market_code == Market.market_code)
            .where(Market.market_code.in_(SUPPORTED_MARKET_CODES))
            .order_by(Market.market_code)
        )
        point = Point(longitude, latitude)
        try:
            for market, geometry in self.session.execute(statement).all():
                polygon = make_valid(shape(json.loads(geometry.geometry_geojson)))
                if polygon.covers(point):
                    return market, geometry
        except (json.JSONDecodeError, ShapelyError, TypeError) as error:
            raise RuntimeError("Supported market geometry is invalid.") from error
        raise UnsupportedAnalysisAreaError

    def nearby(
        self,
        *,
        longitude: float,
        latitude: float,
        radius: NearbyRadius,
        category: str | None = None,
    ) -> NearbyStoreResponse:
        market, _ = self.supported_market_for_center(longitude, latitude)
        latitude_delta = radius / 111_320
        longitude_delta = radius / (111_320 * math.cos(math.radians(latitude)))
        candidates = self.session.scalars(
            select(StorePoint).where(
                StorePoint.longitude.is_not(None),
                StorePoint.latitude.is_not(None),
                StorePoint.longitude.between(
                    longitude - longitude_delta,
                    longitude + longitude_delta,
                ),
                StorePoint.latitude.between(
                    latitude - latitude_delta,
                    latitude + latitude_delta,
                ),
            )
        ).all()

        within_radius: list[tuple[float, StorePoint]] = []
        for store in candidates:
            if store.longitude is None or store.latitude is None:
                continue
            distance = haversine_distance_meters(
                longitude,
                latitude,
                store.longitude,
                store.latitude,
            )
            if distance <= radius:
                within_radius.append((distance, store))
        within_radius.sort(key=lambda item: (item[0], item[1].store_id))

        category_counter = Counter(
            category_name(store) or "업종 미분류" for _, store in within_radius
        )
        same_category_count = sum(
            category_matches(store, category) for _, store in within_radius
        )
        returned = within_radius[:MAX_RETURNED_STORES]
        stores = [
            NearbyStore(
                id=store.store_id,
                name=store.name,
                address=store.road_address,
                category_code=category_code(store),
                category_name=category_name(store),
                distance_meters=round(distance, 1),
                latitude=store.latitude,
                longitude=store.longitude,
                source_snapshot_id=store.source_snapshot_id,
            )
            for distance, store in returned
            if store.latitude is not None and store.longitude is not None
        ]
        return NearbyStoreResponse(
            center=NearbyCenter(latitude=latitude, longitude=longitude),
            radius=radius,
            market_id=market.market_code,
            market_name=market.market_name,
            total_count=len(within_radius),
            same_category_count=same_category_count,
            category_counts=dict(sorted(category_counter.items())),
            returned_count=len(stores),
            truncated=len(within_radius) > len(stores),
            stores=stores,
        )
