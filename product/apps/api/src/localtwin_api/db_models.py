"""Canonical SQLAlchemy models shared by migrations, seed, and repositories."""

from __future__ import annotations

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Float,
    ForeignKey,
    Index,
    Integer,
    PrimaryKeyConstraint,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from localtwin_api.database import Base


class DataSource(Base):
    __tablename__ = "data_sources"
    __table_args__ = (UniqueConstraint("provider", "dataset", "collected_at"),)

    snapshot_id: Mapped[str] = mapped_column(String, primary_key=True)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    dataset: Mapped[str] = mapped_column(String, nullable=False)
    source_type: Mapped[str] = mapped_column(String, nullable=False)
    source_url: Mapped[str] = mapped_column(String, nullable=False)
    collected_at: Mapped[str] = mapped_column(String, nullable=False)
    period: Mapped[str | None] = mapped_column(String)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String, nullable=False)
    raw_path: Mapped[str] = mapped_column(String, nullable=False)


class Market(Base):
    __tablename__ = "markets"

    market_code: Mapped[str] = mapped_column(String, primary_key=True)
    market_name: Mapped[str] = mapped_column(String, nullable=False)
    market_type_code: Mapped[str | None] = mapped_column(String)
    market_type_name: Mapped[str | None] = mapped_column(String)
    district_code: Mapped[str | None] = mapped_column(String)
    district_name: Mapped[str | None] = mapped_column(String)
    admin_dong_code: Mapped[str | None] = mapped_column(String)
    admin_dong_name: Mapped[str | None] = mapped_column(String)
    source_x: Mapped[float | None] = mapped_column(Float)
    source_y: Mapped[float | None] = mapped_column(Float)
    coordinate_system: Mapped[str] = mapped_column(String, nullable=False)
    area_sqm: Mapped[float | None] = mapped_column(Float)
    source_snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("data_sources.snapshot_id"), nullable=False
    )


class MarketGeometry(Base):
    __tablename__ = "market_geometries"

    market_code: Mapped[str] = mapped_column(ForeignKey("markets.market_code"), primary_key=True)
    geometry_geojson: Mapped[str] = mapped_column(Text, nullable=False)
    center_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    center_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    source_crs: Mapped[str] = mapped_column(String, nullable=False)
    target_crs: Mapped[str] = mapped_column(String, nullable=False)
    source_snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("data_sources.snapshot_id"), nullable=False
    )


class StoreMetric(Base):
    __tablename__ = "store_metrics"
    __table_args__ = (PrimaryKeyConstraint("market_code", "period", "category_code"),)

    market_code: Mapped[str] = mapped_column(ForeignKey("markets.market_code"))
    period: Mapped[str] = mapped_column(String)
    category_code: Mapped[str] = mapped_column(String)
    category_name: Mapped[str] = mapped_column(String, nullable=False)
    similar_store_count: Mapped[int | None] = mapped_column(Integer)
    store_count: Mapped[int | None] = mapped_column(Integer)
    franchise_store_count: Mapped[int | None] = mapped_column(Integer)
    opening_rate: Mapped[float | None] = mapped_column(Float)
    opening_count: Mapped[int | None] = mapped_column(Integer)
    closure_rate: Mapped[float | None] = mapped_column(Float)
    closure_count: Mapped[int | None] = mapped_column(Integer)
    source_snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("data_sources.snapshot_id"), nullable=False
    )


class SalesMetric(Base):
    __tablename__ = "sales_metrics"
    __table_args__ = (PrimaryKeyConstraint("market_code", "period", "category_code"),)

    market_code: Mapped[str] = mapped_column(ForeignKey("markets.market_code"))
    period: Mapped[str] = mapped_column(String)
    category_code: Mapped[str] = mapped_column(String)
    category_name: Mapped[str] = mapped_column(String, nullable=False)
    monthly_sales_amount: Mapped[float | None] = mapped_column(Float)
    monthly_sales_count: Mapped[float | None] = mapped_column(Float)
    weekday_sales_amount: Mapped[float | None] = mapped_column(Float)
    weekend_sales_amount: Mapped[float | None] = mapped_column(Float)
    sales_00_06: Mapped[float | None] = mapped_column(Float)
    sales_06_11: Mapped[float | None] = mapped_column(Float)
    sales_11_14: Mapped[float | None] = mapped_column(Float)
    sales_14_17: Mapped[float | None] = mapped_column(Float)
    sales_17_21: Mapped[float | None] = mapped_column(Float)
    sales_21_24: Mapped[float | None] = mapped_column(Float)
    source_snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("data_sources.snapshot_id"), nullable=False
    )


class FlowMetric(Base):
    __tablename__ = "flow_metrics"
    __table_args__ = (PrimaryKeyConstraint("market_code", "period"),)

    market_code: Mapped[str] = mapped_column(ForeignKey("markets.market_code"))
    period: Mapped[str] = mapped_column(String)
    total_flow: Mapped[float | None] = mapped_column(Float)
    flow_00_06: Mapped[float | None] = mapped_column(Float)
    flow_06_11: Mapped[float | None] = mapped_column(Float)
    flow_11_14: Mapped[float | None] = mapped_column(Float)
    flow_14_17: Mapped[float | None] = mapped_column(Float)
    flow_17_21: Mapped[float | None] = mapped_column(Float)
    flow_21_24: Mapped[float | None] = mapped_column(Float)
    source_snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("data_sources.snapshot_id"), nullable=False
    )


class StorePoint(Base):
    __tablename__ = "store_points"
    __table_args__ = (
        Index("ix_store_points_longitude_latitude", "longitude", "latitude"),
        Index("ix_store_points_latitude_longitude", "latitude", "longitude"),
    )

    store_id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    branch_name: Mapped[str | None] = mapped_column(String)
    category_large_code: Mapped[str | None] = mapped_column(String)
    category_large_name: Mapped[str | None] = mapped_column(String)
    category_middle_code: Mapped[str | None] = mapped_column(String)
    category_middle_name: Mapped[str | None] = mapped_column(String)
    category_small_code: Mapped[str | None] = mapped_column(String)
    category_small_name: Mapped[str | None] = mapped_column(String)
    road_address: Mapped[str | None] = mapped_column(String)
    longitude: Mapped[float | None] = mapped_column(Float)
    latitude: Mapped[float | None] = mapped_column(Float)
    coordinate_system: Mapped[str] = mapped_column(String, nullable=False)
    source_snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("data_sources.snapshot_id"), nullable=False
    )


class StoreMarketLink(Base):
    __tablename__ = "store_market_links"
    __table_args__ = (Index("ix_store_market_links_market_code", "market_code"),)

    store_id: Mapped[str] = mapped_column(ForeignKey("store_points.store_id"), primary_key=True)
    market_code: Mapped[str] = mapped_column(ForeignKey("markets.market_code"), nullable=False)
    link_method: Mapped[str] = mapped_column(String, nullable=False)
    is_boundary: Mapped[bool] = mapped_column(Boolean, nullable=False)
    source_snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("data_sources.snapshot_id"), nullable=False
    )


class PermitBusiness(Base):
    __tablename__ = "permit_businesses"
    __table_args__ = (PrimaryKeyConstraint("dataset", "management_no"),)

    dataset: Mapped[str] = mapped_column(String)
    management_no: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String, nullable=False)
    status_code: Mapped[str | None] = mapped_column(String)
    status_name: Mapped[str | None] = mapped_column(String)
    license_date: Mapped[str | None] = mapped_column(String)
    closure_date: Mapped[str | None] = mapped_column(String)
    road_address: Mapped[str | None] = mapped_column(String)
    source_x: Mapped[float | None] = mapped_column(Float)
    source_y: Mapped[float | None] = mapped_column(Float)
    coordinate_system: Mapped[str] = mapped_column(String, nullable=False)
    source_snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("data_sources.snapshot_id"), nullable=False
    )


class AdminAreaPopulation(Base):
    __tablename__ = "admin_area_population"
    __table_args__ = (
        PrimaryKeyConstraint("admin_area_code", "period", "age_group_code"),
        CheckConstraint("total_population >= 0", name="total_population_nonnegative"),
        CheckConstraint("male_population >= 0", name="male_population_nonnegative"),
        CheckConstraint("female_population >= 0", name="female_population_nonnegative"),
    )

    admin_area_code: Mapped[str] = mapped_column(String)
    period: Mapped[str] = mapped_column(String)
    age_group_code: Mapped[str] = mapped_column(String)
    admin_area_name: Mapped[str] = mapped_column(String, nullable=False)
    age_group_name: Mapped[str] = mapped_column(String, nullable=False)
    total_population: Mapped[int] = mapped_column(Integer, nullable=False)
    male_population: Mapped[int] = mapped_column(Integer, nullable=False)
    female_population: Mapped[int] = mapped_column(Integer, nullable=False)
    source_snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("data_sources.snapshot_id"), nullable=False
    )


class MarketAdminAreaCrosswalk(Base):
    __tablename__ = "market_admin_area_crosswalk"
    __table_args__ = (PrimaryKeyConstraint("market_code", "admin_area_code"),)

    market_code: Mapped[str] = mapped_column(ForeignKey("markets.market_code"))
    admin_area_code: Mapped[str] = mapped_column(String)
    admin_area_name: Mapped[str] = mapped_column(String, nullable=False)
    mapping_method: Mapped[str] = mapped_column(String, nullable=False)
    mapping_version: Mapped[str] = mapped_column(String, nullable=False)
    boundary_note: Mapped[str] = mapped_column(Text, nullable=False)


class AdminAreaBusinessMetric(Base):
    __tablename__ = "admin_area_business_metrics"
    __table_args__ = (PrimaryKeyConstraint("admin_area_code", "period", "industry_code"),)

    admin_area_code: Mapped[str] = mapped_column(String)
    period: Mapped[str] = mapped_column(String)
    industry_code: Mapped[str] = mapped_column(String)
    admin_area_name: Mapped[str] = mapped_column(String, nullable=False)
    source_admin_area_code: Mapped[str] = mapped_column(String, nullable=False)
    industry_name: Mapped[str] = mapped_column(String, nullable=False)
    business_count: Mapped[int | None] = mapped_column(Integer)
    worker_count: Mapped[int | None] = mapped_column(Integer)
    male_worker_count: Mapped[int | None] = mapped_column(Integer)
    female_worker_count: Mapped[int | None] = mapped_column(Integer)
    is_suppressed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    source_snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("data_sources.snapshot_id"), nullable=False
    )


class MarketPopulationMetric(Base):
    __tablename__ = "market_population_metrics"
    __table_args__ = (PrimaryKeyConstraint("market_code", "period"),)

    market_code: Mapped[str] = mapped_column(ForeignKey("markets.market_code"))
    period: Mapped[str] = mapped_column(String)
    market_name: Mapped[str] = mapped_column(String, nullable=False)
    resident_population: Mapped[int] = mapped_column(Integer, nullable=False)
    worker_population: Mapped[int] = mapped_column(Integer, nullable=False)
    household_count: Mapped[int | None] = mapped_column(Integer)
    resident_source_snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("data_sources.snapshot_id"), nullable=False
    )
    worker_source_snapshot_id: Mapped[str] = mapped_column(
        ForeignKey("data_sources.snapshot_id"), nullable=False
    )


CANONICAL_MODELS = (
    DataSource,
    Market,
    MarketGeometry,
    StoreMetric,
    SalesMetric,
    FlowMetric,
    StorePoint,
    StoreMarketLink,
    PermitBusiness,
)

KOSIS_BACKGROUND_MODELS = (
    AdminAreaPopulation,
    MarketAdminAreaCrosswalk,
    AdminAreaBusinessMetric,
)
