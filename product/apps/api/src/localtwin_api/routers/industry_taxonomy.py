"""Published raw-industry taxonomy for browse, counts, and map filtering."""

from collections.abc import Callable

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from localtwin_api.industry_taxonomy import (
    published_assignment_run_id,
    published_taxonomy_counts,
    published_taxonomy_nodes,
)
from localtwin_api.product_catalog import SUPPORTED_MARKET_CODES


class TaxonomyNodeResponse(BaseModel):
    id: str
    parent_path_key: str | None
    path_key: str
    level: int
    code: str
    name: str
    is_leaf: bool
    capability: str
    storefront_profile: str


class TaxonomyResponse(BaseModel):
    assignment_run_id: str
    nodes: list[TaxonomyNodeResponse]


class TaxonomyCountResponse(BaseModel):
    assignment_run_id: str
    market_id: str
    counts: dict[str, int]


def _capability(node: TaxonomyNodeResponse) -> str:
    # The four official commercial-analysis codes remain full analysis. All raw
    # taxonomy leaves are browseable; unsupported metrics are explicit instead
    # of inferred from a name at request time.
    if node.code in {
        "CS100010",
        "CS100001",
        "CS100002",
        "CS100003",
        "CS100004",
        "CS100005",
        "CS100006",
        "CS100007",
        "CS100008",
        "CS100009",
        "CS300002",
    }:
        return "FULL"
    return "PARTIAL" if node.is_leaf else "NONE"


def _storefront_profile(node: TaxonomyNodeResponse) -> str:
    code = node.code
    if code == "I21201":
        return "cafe-storefront"
    if code.startswith("I2"):
        return "restaurant-storefront"
    if code.startswith("S207"):
        return "beauty-storefront"
    if code.startswith(("G209", "S206")):
        return "apparel-storefront"
    if code.startswith("P10603") or code.startswith("S208"):
        return "sports-storefront"
    if code.startswith("P10"):
        return "academy-storefront"
    if code.startswith("I101"):
        return "lodging-storefront"
    return "generic-storefront"


def create_industry_taxonomy_router(
    get_session_factory: Callable[[], sessionmaker[Session]],
) -> APIRouter:
    router = APIRouter(prefix="/api/v1/industry-taxonomy", tags=["industry-taxonomy"])

    @router.get("", response_model=TaxonomyResponse)
    def taxonomy() -> TaxonomyResponse:
        try:
            with get_session_factory()() as session:
                run_id = published_assignment_run_id(session)
                if not run_id:
                    raise HTTPException(
                        status_code=503, detail="Industry taxonomy is not published."
                    )
                nodes = []
                for node in published_taxonomy_nodes(session):
                    base = TaxonomyNodeResponse(
                        id=node.id,
                        parent_path_key=node.parent_path_key,
                        path_key=node.path_key,
                        level=node.level,
                        code=node.source_code,
                        name=node.display_name,
                        is_leaf=node.is_leaf,
                        capability="NONE",
                        storefront_profile="generic-storefront",
                    )
                    nodes.append(
                        base.model_copy(
                            update={
                                "capability": _capability(base),
                                "storefront_profile": _storefront_profile(base),
                            }
                        )
                    )
                return TaxonomyResponse(assignment_run_id=run_id, nodes=nodes)
        except SQLAlchemyError:
            raise HTTPException(
                status_code=503, detail="Industry taxonomy is unavailable."
            ) from None

    @router.get("/markets/{market_id}/counts", response_model=TaxonomyCountResponse)
    def taxonomy_counts(market_id: str) -> TaxonomyCountResponse:
        if market_id not in SUPPORTED_MARKET_CODES:
            raise HTTPException(status_code=404, detail="Unsupported market.")
        try:
            with get_session_factory()() as session:
                run_id = published_assignment_run_id(session)
                if not run_id:
                    raise HTTPException(
                        status_code=503, detail="Industry taxonomy is not published."
                    )
                return TaxonomyCountResponse(
                    assignment_run_id=run_id,
                    market_id=market_id,
                    counts=published_taxonomy_counts(session, market_id),
                )
        except SQLAlchemyError:
            raise HTTPException(
                status_code=503, detail="Industry taxonomy is unavailable."
            ) from None

    return router
