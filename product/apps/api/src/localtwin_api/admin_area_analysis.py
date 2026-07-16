"""Administrative-area background statistics for supported LocalTwin markets."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from localtwin_api.db_models import (
    AdminAreaBusinessMetric,
    AdminAreaPopulation,
    DataSource,
    Market,
    MarketAdminAreaCrosswalk,
    MarketPopulationMetric,
)


class RankedValue(BaseModel):
    value: float
    rank: int
    peer_count: int
    percentile: float
    unit: str
    period: str
    peer_group: str


class BackgroundEvidence(BaseModel):
    metric: Literal[
        "market_resident_population",
        "market_workers",
        "resident_population",
        "businesses",
        "workers",
    ]
    source_name: str
    source_url: str
    period: str
    geography: Literal["market", "administrative_area"]
    collected_at: str
    status: Literal["historical"] = "historical"


class AdminAreaBackgroundResponse(BaseModel):
    market_id: str
    admin_area_code: str
    admin_area_name: str
    mapping_method: str
    boundary_note: str
    market_resident_population: RankedValue
    market_workers: RankedValue
    market_resident_density: RankedValue
    market_worker_density: RankedValue
    resident_population: RankedValue
    businesses: RankedValue
    workers: RankedValue
    evidence: list[BackgroundEvidence]


def _rank(
    values: list[float], target: float, *, unit: str, period: str, peer_group: str
) -> RankedValue:
    rank = 1 + sum(value > target for value in values)
    return RankedValue(
        value=target,
        rank=rank,
        peer_count=len(values),
        percentile=round(rank / len(values) * 100, 1),
        unit=unit,
        period=period,
        peer_group=peer_group,
    )


class AdminAreaAnalysisRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, market_id: str) -> AdminAreaBackgroundResponse:
        crosswalk = self.session.get(
            MarketAdminAreaCrosswalk,
            {"market_code": market_id, "admin_area_code": self._area_code(market_id)},
        )
        if crosswalk is None:
            raise LookupError(market_id)

        populations = self.session.scalars(
            select(AdminAreaPopulation).where(AdminAreaPopulation.age_group_code == "0")
        ).all()
        businesses = self.session.scalars(
            select(AdminAreaBusinessMetric).where(AdminAreaBusinessMetric.industry_code == "TOTAL")
        ).all()
        population = next(
            (row for row in populations if row.admin_area_code == crosswalk.admin_area_code), None
        )
        business = next(
            (row for row in businesses if row.admin_area_code == crosswalk.admin_area_code), None
        )
        if population is None or business is None:
            raise LookupError(market_id)
        if business.business_count is None or business.worker_count is None:
            raise LookupError(market_id)

        market_populations = self.session.scalars(
            select(MarketPopulationMetric).where(MarketPopulationMetric.period == "20251")
        ).all()
        market_population = next(
            (row for row in market_populations if row.market_code == market_id), None
        )
        if market_population is None:
            raise LookupError(market_id)
        markets = self.session.scalars(
            select(Market).where(
                Market.market_code.in_(row.market_code for row in market_populations)
            )
        ).all()
        areas = {
            row.market_code: row.area_sqm
            for row in markets
            if row.area_sqm is not None and row.area_sqm > 0
        }
        if set(areas) != {row.market_code for row in market_populations}:
            raise LookupError(market_id)

        population_source = self.session.get(DataSource, population.source_snapshot_id)
        business_source = self.session.get(DataSource, business.source_snapshot_id)
        market_resident_source = self.session.get(
            DataSource, market_population.resident_source_snapshot_id
        )
        market_worker_source = self.session.get(
            DataSource, market_population.worker_source_snapshot_id
        )
        if (
            population_source is None
            or business_source is None
            or market_resident_source is None
            or market_worker_source is None
        ):
            raise LookupError(market_id)

        population_values = [row.total_population for row in populations]
        business_values = [
            row.business_count for row in businesses if row.business_count is not None
        ]
        worker_values = [row.worker_count for row in businesses if row.worker_count is not None]
        market_resident_values = [row.resident_population for row in market_populations]
        market_worker_values = [row.worker_population for row in market_populations]
        market_resident_densities = [
            row.resident_population / (areas[row.market_code] / 1_000_000)
            for row in market_populations
        ]
        market_worker_densities = [
            row.worker_population / (areas[row.market_code] / 1_000_000)
            for row in market_populations
        ]
        target_area_sqkm = areas[market_id] / 1_000_000
        return AdminAreaBackgroundResponse(
            market_id=market_id,
            admin_area_code=crosswalk.admin_area_code,
            admin_area_name=crosswalk.admin_area_name,
            mapping_method=crosswalk.mapping_method,
            boundary_note=crosswalk.boundary_note,
            market_resident_population=_rank(
                market_resident_values,
                market_population.resident_population,
                unit="명",
                period=market_population.period,
                peer_group="현재 지원 상권",
            ),
            market_workers=_rank(
                market_worker_values,
                market_population.worker_population,
                unit="명",
                period=market_population.period,
                peer_group="현재 지원 상권",
            ),
            market_resident_density=_rank(
                market_resident_densities,
                market_population.resident_population / target_area_sqkm,
                unit="명/km²",
                period=market_population.period,
                peer_group="현재 지원 상권",
            ),
            market_worker_density=_rank(
                market_worker_densities,
                market_population.worker_population / target_area_sqkm,
                unit="명/km²",
                period=market_population.period,
                peer_group="현재 지원 상권",
            ),
            resident_population=_rank(
                population_values,
                population.total_population,
                unit="명",
                period=population.period,
                peer_group="현재 지원 행정동",
            ),
            businesses=_rank(
                business_values,
                business.business_count,
                unit="개",
                period=business.period,
                peer_group="현재 지원 행정동",
            ),
            workers=_rank(
                worker_values,
                business.worker_count,
                unit="명",
                period=business.period,
                peer_group="현재 지원 행정동",
            ),
            evidence=[
                BackgroundEvidence(
                    metric="market_resident_population",
                    source_name="서울시 상권분석서비스 상주인구",
                    source_url=market_resident_source.source_url,
                    period=market_population.period,
                    geography="market",
                    collected_at=market_resident_source.collected_at,
                ),
                BackgroundEvidence(
                    metric="market_workers",
                    source_name="서울시 상권분석서비스 직장인구",
                    source_url=market_worker_source.source_url,
                    period=market_population.period,
                    geography="market",
                    collected_at=market_worker_source.collected_at,
                ),
                BackgroundEvidence(
                    metric="resident_population",
                    source_name="KOSIS 주민등록인구",
                    source_url=population_source.source_url,
                    period=population.period,
                    geography="administrative_area",
                    collected_at=population_source.collected_at,
                ),
                BackgroundEvidence(
                    metric="businesses",
                    source_name="KOSIS 전국사업체조사",
                    source_url=business_source.source_url,
                    period=business.period,
                    geography="administrative_area",
                    collected_at=business_source.collected_at,
                ),
                BackgroundEvidence(
                    metric="workers",
                    source_name="KOSIS 전국사업체조사",
                    source_url=business_source.source_url,
                    period=business.period,
                    geography="administrative_area",
                    collected_at=business_source.collected_at,
                ),
            ],
        )

    def _area_code(self, market_id: str) -> str:
        area_code = self.session.scalar(
            select(MarketAdminAreaCrosswalk.admin_area_code).where(
                MarketAdminAreaCrosswalk.market_code == market_id
            )
        )
        if area_code is None:
            raise LookupError(market_id)
        return area_code
