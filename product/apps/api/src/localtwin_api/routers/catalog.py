from collections.abc import Callable

from fastapi import APIRouter
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from localtwin_api.product_catalog import (
    ProductCatalogResponse,
    get_product_catalog,
    rank_product_categories,
)


def create_catalog_router(
    get_session_factory: Callable[[], sessionmaker[Session]] | None = None,
) -> APIRouter:
    router = APIRouter(prefix="/api/v1", tags=["catalog"])

    @router.get("/catalog", response_model=ProductCatalogResponse)
    def product_catalog() -> ProductCatalogResponse:
        if get_session_factory is None:
            return get_product_catalog()
        try:
            with get_session_factory()() as session:
                categories = rank_product_categories(session)
                return get_product_catalog(categories or None)
        except (RuntimeError, SQLAlchemyError):
            return get_product_catalog()

    return router


router = create_catalog_router()
