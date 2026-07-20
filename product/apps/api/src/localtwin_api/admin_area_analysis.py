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


def _market_rankings(
    market_population: MarketPopulationMetric,
    market_populations: list[MarketPopulationMetric],
    areas: dict[str, float],
) -> dict[str, RankedValue]:
    resident_values = [row.resident_population for row in market_populations]
    worker_values = [row.worker_population for row in market_populations]
    resident_densities = [
        row.resident_population / (areas[row.market_code] / 1_000_000) for row in market_populations
    ]
    worker_densities = [
        row.worker_population / (areas[row.market_code] / 1_000_000) for row in market_populations
    ]
    target_area_sqkm = areas[market_population.market_code] / 1_000_000
    return {
        "market_resident_population": _rank(
            resident_values,
            market_population.resident_population,
            unit="명",
            period=market_population.period,
            peer_group="현재 지원 상권",
        ),
        "market_workers": _rank(
            worker_values,
            market_population.worker_population,
            unit="명",
            period=market_population.period,
            peer_group="현재 지원 상권",
        ),
        "market_resident_density": _rank(
            resident_densities,
            market_population.resident_population / target_area_sqkm,
            unit="명/km²",
            period=market_population.period,
            peer_group="현재 지원 상권",
        ),
        "market_worker_density": _rank(
            worker_densities,
            market_population.worker_population / target_area_sqkm,
            unit="명/km²",
            period=market_population.period,
            peer_group="현재 지원 상권",
        ),
    }


def _admin_area_rankings(
    population: AdminAreaPopulation,
    business: AdminAreaBusinessMetric,
    populations: list[AdminAreaPopulation],
    businesses: list[AdminAreaBusinessMetric],
) -> dict[str, RankedValue]:
    business_values = [row.business_count for row in businesses if row.business_count is not None]
    worker_values = [row.worker_count for row in businesses if row.worker_count is not None]
    return {
        "resident_population": _rank(
            [row.total_population for row in populations],
            population.total_population,
            unit="명",
            period=population.period,
            peer_group="현재 지원 행정동",
        ),
        "businesses": _rank(
            business_values,
            business.business_count or 0,
            unit="개",
            period=business.period,
            peer_group="현재 지원 행정동",
        ),
        "workers": _rank(
            worker_values,
            business.worker_count or 0,
            unit="명",
            period=business.period,
            peer_group="현재 지원 행정동",
        ),
    }


def _background_evidence(
    population: AdminAreaPopulation,
    business: AdminAreaBusinessMetric,
    market_population: MarketPopulationMetric,
    population_source: DataSource,
    business_source: DataSource,
    market_resident_source: DataSource,
    market_worker_source: DataSource,
) -> list[BackgroundEvidence]:
    return [
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
    ]


def build_admin_area_background(
    market_id: str,
    crosswalk: MarketAdminAreaCrosswalk,
    population: AdminAreaPopulation,
    business: AdminAreaBusinessMetric,
    market_population: MarketPopulationMetric,
    populations: list[AdminAreaPopulation],
    businesses: list[AdminAreaBusinessMetric],
    market_populations: list[MarketPopulationMetric],
    areas: dict[str, float],
    population_source: DataSource,
    business_source: DataSource,
    market_resident_source: DataSource,
    market_worker_source: DataSource,
) -> AdminAreaBackgroundResponse:
    rankings = {
        **_market_rankings(market_population, market_populations, areas),
        **_admin_area_rankings(population, business, populations, businesses),
    }
    return AdminAreaBackgroundResponse(
        market_id=market_id,
        admin_area_code=crosswalk.admin_area_code,
        admin_area_name=crosswalk.admin_area_name,
        mapping_method=crosswalk.mapping_method,
        boundary_note=crosswalk.boundary_note,
        **rankings,
        evidence=_background_evidence(
            population,
            business,
            market_population,
            population_source,
            business_source,
            market_resident_source,
            market_worker_source,
        ),
    )


class AdminAreaAnalysisRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, market_id: str) -> AdminAreaBackgroundResponse:
        crosswalk = self._crosswalk(market_id)
        population, business, populations, businesses = self._admin_area_metrics(
            market_id, crosswalk.admin_area_code
        )
        market_population, market_populations, areas = self._market_population_metrics(market_id)
        return build_admin_area_background(
            market_id,
            crosswalk,
            population,
            business,
            market_population,
            populations,
            businesses,
            market_populations,
            areas,
            self._source(population.source_snapshot_id, market_id),
            self._source(business.source_snapshot_id, market_id),
            self._source(market_population.resident_source_snapshot_id, market_id),
            self._source(market_population.worker_source_snapshot_id, market_id),
        )

    def _crosswalk(self, market_id: str) -> MarketAdminAreaCrosswalk:
        crosswalk = self.session.scalar(
            select(MarketAdminAreaCrosswalk).where(
                MarketAdminAreaCrosswalk.market_code == market_id
            )
        )
        if crosswalk is None:
            raise LookupError(market_id)
        return crosswalk

    def _admin_area_metrics(
        self, market_id: str, area_code: str
    ) -> tuple[
        AdminAreaPopulation,
        AdminAreaBusinessMetric,
        list[AdminAreaPopulation],
        list[AdminAreaBusinessMetric],
    ]:
        populations = self.session.scalars(
            select(AdminAreaPopulation).where(AdminAreaPopulation.age_group_code == "0")
        ).all()
        businesses = self.session.scalars(
            select(AdminAreaBusinessMetric).where(AdminAreaBusinessMetric.industry_code == "TOTAL")
        ).all()
        population = next((row for row in populations if row.admin_area_code == area_code), None)
        business = next((row for row in businesses if row.admin_area_code == area_code), None)
        if population is None or business is None:
            raise LookupError(market_id)
        if business.business_count is None or business.worker_count is None:
            raise LookupError(market_id)
        return population, business, populations, businesses

    def _market_population_metrics(
        self, market_id: str
    ) -> tuple[MarketPopulationMetric, list[MarketPopulationMetric], dict[str, float]]:
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
        return market_population, market_populations, areas

    def _source(self, snapshot_id: str | None, market_id: str) -> DataSource:
        source = self.session.get(DataSource, snapshot_id)
        if source is None:
            raise LookupError(market_id)
        return source
