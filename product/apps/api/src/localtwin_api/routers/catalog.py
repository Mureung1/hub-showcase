from fastapi import APIRouter

from localtwin_api.product_catalog import ProductCatalogResponse, get_product_catalog

router = APIRouter(prefix="/api/v1", tags=["catalog"])


@router.get("/catalog", response_model=ProductCatalogResponse)
def product_catalog() -> ProductCatalogResponse:
    return get_product_catalog()
