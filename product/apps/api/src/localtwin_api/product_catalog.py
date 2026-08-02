"""Versioned product scope shared by API repositories and Web clients."""

from collections import defaultdict
from typing import Literal

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from localtwin_api.db_models import StoreMarketLink, StorePoint
from localtwin_api.industry_taxonomy import published_assignment_run_id, published_taxonomy_nodes

AnalysisCategory = Literal["카페", "음식점", "베이커리", "편의점"]
Category = AnalysisCategory
NearbyRadius = Literal[100, 300, 500]
CategoryCoverage = Literal["full", "partial"]

CATEGORY_CODES: dict[AnalysisCategory, tuple[str, ...]] = {
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

CATEGORY_NAME_TERMS: dict[AnalysisCategory, tuple[str, ...]] = {
    "카페": ("카페", "커피"),
    "음식점": ("음식점", "한식", "중식", "일식", "분식", "주점"),
    "베이커리": ("베이커리", "제과", "빵", "도넛"),
    "편의점": ("편의점",),
}

# User-facing groups considered for the data-driven Top 7. The order is also
# the classification priority, so one store is counted in exactly one group.
# Specific user intent such as Pilates must precede a generic word like academy.
# Broad food terms stay last to avoid swallowing cafe and bakery stores.
CATEGORY_FILTER_TERMS: dict[str, tuple[str, ...]] = {
    "카페": CATEGORY_NAME_TERMS["카페"],
    "베이커리": CATEGORY_NAME_TERMS["베이커리"],
    "편의점": CATEGORY_NAME_TERMS["편의점"],
    "미용": ("미용", "헤어", "네일", "피부관리", "이발"),
    "의류": ("의류", "의복", "패션", "옷", "신발"),
    "체육": ("체육", "헬스", "피트니스", "스포츠", "요가", "필라테스"),
    "학원": ("학원", "교습", "교육원"),
    "숙박": ("숙박", "호텔", "모텔", "여관", "게스트하우스"),
    "부동산": ("부동산", "공인중개"),
    "약국": ("약국",),
    "병원": ("병원", "의원", "치과", "한의원"),
    "세탁": ("세탁", "수선"),
    "생활용품": ("생활용품", "잡화", "문구"),
    "음식점": CATEGORY_NAME_TERMS["음식점"],
}


class SupportedMarket(BaseModel):
    key: str
    market_id: str
    name: str
    address: str
    center: tuple[float, float]


SUPPORTED_MARKETS = (
    SupportedMarket(
        key="연남",
        market_id="3110562",
        name="연남동 골목상권",
        address="마포구 동교로 38길 일대",
        center=(126.922787722224, 37.5634957461626),
    ),
    SupportedMarket(
        key="홍대",
        market_id="3120103",
        name="홍대입구역 상권",
        address="마포구 양화로 일대",
        center=(126.919317433833, 37.5527848842777),
    ),
    SupportedMarket(
        key="합정",
        market_id="3120101",
        name="합정역 상권",
        address="마포구 양화로 45 일대",
        center=(126.91324192136, 37.5492309987762),
    ),
)

SUPPORTED_MARKET_CODES = tuple(market.market_id for market in SUPPORTED_MARKETS)
MARKET_BY_KEY = {market.key: market for market in SUPPORTED_MARKETS}
MARKET_BY_ID = {market.market_id: market for market in SUPPORTED_MARKETS}
SUPPORTED_RADII: tuple[NearbyRadius, ...] = (100, 300, 500)


class ProductCategory(BaseModel):
    name: str
    codes: tuple[str, ...] = ()
    coverage: CategoryCoverage
    analysis_category: AnalysisCategory | None = None
    rank: int | None = None
    store_count: int | None = None
    market_count: int | None = None
    store_counts_by_market: dict[str, int] = Field(default_factory=dict)


BOOTSTRAP_CATEGORIES = tuple(
    ProductCategory(
        name=name,
        codes=codes,
        coverage="full",
        analysis_category=name,
    )
    for name, codes in CATEGORY_CODES.items()
)


class ProductCatalogResponse(BaseModel):
    markets: tuple[SupportedMarket, ...]
    categories: tuple[ProductCategory, ...]
    radii: tuple[NearbyRadius, ...]
    ranking_basis: Literal["supported_market_unique_store_count", "bootstrap"]


def classify_category_group(store: StorePoint) -> str | None:
    """Map one source store to one user-facing category group."""

    values = (
        store.category_small_name,
        store.category_middle_name,
        store.category_large_name,
    )
    for value in values:
        if not value:
            continue
        normalized = value.casefold()
        for group, terms in CATEGORY_FILTER_TERMS.items():
            if any(term.casefold() in normalized for term in terms):
                return group
    return None


def published_leaf_ids_for_category(session: Session, category: str | None) -> list[str]:
    """Resolve a legacy Top-7 preset from published raw taxonomy nodes.

    Only the small taxonomy table is inspected here; the resulting IDs are used
    in SQL against store assignments. This preserves the original small → middle
    → large-name priority without rereading or classifying market store rows.
    """

    if not category:
        return [node.id for node in published_taxonomy_nodes(session) if node.is_leaf]
    nodes = published_taxonomy_nodes(session)
    names_by_path = {node.path_key: node.display_name for node in nodes}
    leaf_ids: list[str] = []
    for node in nodes:
        if not node.is_leaf:
            continue
        middle_path = node.parent_path_key
        large_path = middle_path.rsplit("/", 1)[0] if middle_path and "/" in middle_path else None

        class Candidate:
            category_small_name = node.display_name
            category_middle_name = names_by_path.get(middle_path) if middle_path else None
            category_large_name = names_by_path.get(large_path) if large_path else None

        if classify_category_group(Candidate()) == category:
            leaf_ids.append(node.id)
    return leaf_ids


def rank_product_categories(session: Session, limit: int = 7) -> tuple[ProductCategory, ...]:
    """Rank groups globally and retain unique-store counts for each market."""

    run_id = published_assignment_run_id(session)
    if run_id:
        return _rank_published_categories(session, run_id, limit)

    rows = session.execute(
        select(StorePoint, StoreMarketLink.market_code)
        .join(StoreMarketLink, StoreMarketLink.store_id == StorePoint.store_id)
        .where(StoreMarketLink.market_code.in_(SUPPORTED_MARKET_CODES))
        .order_by(StorePoint.store_id)
    ).all()
    stores_by_group: dict[str, set[str]] = defaultdict(set)
    markets_by_group: dict[str, set[str]] = defaultdict(set)
    stores_by_group_and_market: dict[str, dict[str, set[str]]] = defaultdict(
        lambda: defaultdict(set)
    )
    for store, market_code in rows:
        group = classify_category_group(store)
        if group is None:
            continue
        stores_by_group[group].add(store.store_id)
        markets_by_group[group].add(market_code)
        stores_by_group_and_market[group][market_code].add(store.store_id)

    ranked_names = sorted(
        stores_by_group,
        key=lambda name: (-len(stores_by_group[name]), -len(markets_by_group[name]), name),
    )[:limit]
    return tuple(
        ProductCategory(
            name=name,
            codes=CATEGORY_CODES.get(name, ()),  # type: ignore[arg-type]
            coverage="full" if name in CATEGORY_CODES else "partial",
            analysis_category=name if name in CATEGORY_CODES else None,  # type: ignore[arg-type]
            rank=index,
            store_count=len(stores_by_group[name]),
            market_count=len(markets_by_group[name]),
            store_counts_by_market={
                MARKET_BY_ID[market_code].key: len(store_ids)
                for market_code, store_ids in stores_by_group_and_market[name].items()
                if market_code in MARKET_BY_ID
            },
        )
        for index, name in enumerate(ranked_names, start=1)
    )


def _rank_published_categories(session: Session, run_id: str, limit: int) -> tuple[ProductCategory, ...]:
    from localtwin_api.db_models import StoreTaxonomyAssignment

    stores: dict[str, set[str]] = defaultdict(set)
    by_market: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    for group in CATEGORY_FILTER_TERMS:
        rows = session.execute(
            select(StoreMarketLink.market_code, StoreTaxonomyAssignment.store_id)
            .join(StoreTaxonomyAssignment, StoreTaxonomyAssignment.store_id == StoreMarketLink.store_id)
            .where(StoreTaxonomyAssignment.assignment_run_id == run_id,
                   StoreTaxonomyAssignment.leaf_node_id.in_(published_leaf_ids_for_category(session, group)),
                   StoreMarketLink.market_code.in_(SUPPORTED_MARKET_CODES))
        ).all()
        for market_code, store_id in rows:
            stores[group].add(store_id)
            by_market[group][market_code].add(store_id)
    names = sorted(stores, key=lambda name: (-len(stores[name]), name))[:limit]
    return tuple(ProductCategory(name=name, codes=CATEGORY_CODES.get(name, ()),
        coverage="full" if name in CATEGORY_CODES else "partial",
        analysis_category=name if name in CATEGORY_CODES else None, rank=index, # type: ignore[arg-type]
        store_count=len(stores[name]), market_count=len(by_market[name]),
        store_counts_by_market={MARKET_BY_ID[key].key: len(value) for key, value in by_market[name].items() if key in MARKET_BY_ID})
        for index, name in enumerate(names, start=1))


def get_product_catalog(
    categories: tuple[ProductCategory, ...] | None = None,
) -> ProductCatalogResponse:
    resolved = categories or BOOTSTRAP_CATEGORIES
    return ProductCatalogResponse(
        markets=SUPPORTED_MARKETS,
        categories=resolved,
        radii=SUPPORTED_RADII,
        ranking_basis=(
            "supported_market_unique_store_count" if categories is not None else "bootstrap"
        ),
    )
