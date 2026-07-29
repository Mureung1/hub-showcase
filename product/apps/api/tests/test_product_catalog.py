from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from localtwin_api.config import Settings
from localtwin_api.main import create_app
from localtwin_api.product_catalog import (
    classify_category_group,
    get_product_catalog,
    rank_product_categories,
)


def test_product_catalog_has_unique_stable_identifiers() -> None:
    catalog = get_product_catalog()

    assert len({market.key for market in catalog.markets}) == len(catalog.markets)
    assert len({market.market_id for market in catalog.markets}) == len(catalog.markets)
    assert len({category.name for category in catalog.categories}) == len(catalog.categories)
    assert catalog.radii == (100, 300, 500)
    assert catalog.ranking_basis == "bootstrap"


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
    assert payload["ranking_basis"] == "bootstrap"


def test_pilates_academy_is_classified_as_exercise() -> None:
    store = SimpleNamespace(
        store_id="P1",
        category_small_name="요가/필라테스 학원",
        category_middle_name="기타 교육",
        category_large_name="교육",
    )

    assert classify_category_group(store) == "체육"


def test_ranked_categories_use_unique_stores_and_per_market_counts() -> None:
    def store(store_id: str, small_name: str):
        return SimpleNamespace(
            store_id=store_id,
            category_small_name=small_name,
            category_middle_name=None,
            category_large_name=None,
        )

    session = MagicMock()
    session.execute.return_value.all.return_value = [
        (store("C1", "카페"), "3110562"),
        (store("C2", "커피 전문점"), "3120103"),
        (store("C2", "커피 전문점"), "3120103"),
        (store("H1", "미용실"), "3110562"),
        (store("H2", "헤어숍"), "3120103"),
        (store("H3", "네일숍"), "3120101"),
        (store("P1", "요가/필라테스 학원"), "3110562"),
        (store("P2", "필라테스"), "3110562"),
        (store("P2", "필라테스"), "3120103"),
        (store("F1", "한식 음식점"), "3110562"),
    ]

    ranked = rank_product_categories(session, limit=4)

    assert [category.name for category in ranked] == ["미용", "카페", "체육", "음식점"]
    assert ranked[0].store_count == 3
    assert ranked[0].market_count == 3
    assert ranked[0].store_counts_by_market == {"연남": 1, "홍대": 1, "합정": 1}
    assert ranked[0].coverage == "partial"
    assert ranked[0].analysis_category is None
    assert ranked[1].store_count == 2
    assert ranked[1].store_counts_by_market == {"연남": 1, "홍대": 1}
    assert ranked[1].coverage == "full"
    assert ranked[1].analysis_category == "카페"
    assert ranked[2].store_count == 2
    assert ranked[2].store_counts_by_market == {"연남": 2, "홍대": 1}
    assert ranked[2].coverage == "partial"
