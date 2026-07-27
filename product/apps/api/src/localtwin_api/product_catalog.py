"""Versioned product scope shared by API repositories and Web clients."""

from typing import Literal

from pydantic import BaseModel

Category = Literal["카페", "음식점", "베이커리", "편의점"]
NearbyRadius = Literal[100, 300, 500]

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

# Categories with complete Seoul commercial-analysis metrics.
CATEGORY_NAME_TERMS: dict[Category, tuple[str, ...]] = {
    "카페": ("카페", "커피"),
    "음식점": ("음식점", "한식", "중식", "일식", "분식", "주점"),
    "베이커리": ("베이커리", "제과", "빵", "도넛"),
    "편의점": ("편의점",),
}

# User-facing groups considered when ranking the most common store categories.
# Groups outside CATEGORY_CODES are intentionally exposed as partial support.
CATEGORY_FILTER_TERMS: dict[str, tuple[str, ...]] = {
    **CATEGORY_NAME_TERMS,
    "주점": ("주점", "호프", "포차", "술집", "와인바", "칵테일바"),
    "의류": ("의류", "의복", "패션", "옷", "신발"),
    "미용": ("미용", "헤어", "네일", "피부관리", "이발"),
    "학원": ("학원", "교습", "교육원"),
    "숙박": ("숙박", "호텔", "모텔", "여관", "게스트하우스"),
    "부동산": ("부동산", "공인중개"),
    "약국": ("약국",),
    "병원": ("병원", "의원", "치과", "한의원"),
    "체육": ("체육", "헬스", "피트니스", "스포츠", "요가", "필라테스"),
    "세탁": ("세탁", "수선"),
    "생활용품": ("생활용품", "잡화", "문구"),
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
    codes: tuple[str, ...]


BOOTSTRAP_CATEGORIES = tuple(
    ProductCategory(name=name, codes=codes) for name, codes in CATEGORY_CODES.items()
)


class ProductCatalogResponse(BaseModel):
    markets: tuple[SupportedMarket, ...]
    categories: tuple[ProductCategory, ...]
    radii: tuple[NearbyRadius, ...]


def get_product_catalog(
    categories: tuple[ProductCategory, ...] | None = None,
) -> ProductCatalogResponse:
    return ProductCatalogResponse(
        markets=SUPPORTED_MARKETS,
        categories=categories or BOOTSTRAP_CATEGORIES,
        radii=SUPPORTED_RADII,
    )
