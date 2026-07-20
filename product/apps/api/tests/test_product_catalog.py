from fastapi.testclient import TestClient

from localtwin_api.config import Settings
from localtwin_api.main import create_app
from localtwin_api.product_catalog import get_product_catalog


def test_product_catalog_has_unique_stable_identifiers() -> None:
    catalog = get_product_catalog()

    assert len({market.key for market in catalog.markets}) == len(catalog.markets)
    assert len({market.market_id for market in catalog.markets}) == len(catalog.markets)
    assert len({category.name for category in catalog.categories}) == len(catalog.categories)
    assert catalog.radii == (100, 300, 500)


def test_product_catalog_endpoint_does_not_require_database() -> None:
    response = TestClient(create_app(Settings(_env_file=None))).get("/api/v1/catalog")

    assert response.status_code == 200
    payload = response.json()
    assert [market["key"] for market in payload["markets"]] == ["연남", "홍대", "합정"]
    assert [category["name"] for category in payload["categories"]] == [
        "카페",
        "음식점",
        "베이커리",
        "편의점",
    ]
