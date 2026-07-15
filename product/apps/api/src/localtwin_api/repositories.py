"""Small SQLAlchemy query boundary for the PostgreSQL product database."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from localtwin_api.db_models import CANONICAL_MODELS, Market, SalesMetric, StoreMetric

MODEL_BY_TABLE = {model.__tablename__: model for model in CANONICAL_MODELS}


class CanonicalRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_market_by_code(self, market_code: str) -> Market | None:
        return self.session.get(Market, market_code)

    def count_rows(self) -> dict[str, int]:
        return {
            table_name: int(self.session.scalar(select(func.count()).select_from(model)) or 0)
            for table_name, model in MODEL_BY_TABLE.items()
        }

    def category_code_counts(self) -> dict[str, int]:
        return {
            "store_metrics": int(
                self.session.scalar(select(func.count(func.distinct(StoreMetric.category_code))))
                or 0
            ),
            "sales_metrics": int(
                self.session.scalar(select(func.count(func.distinct(SalesMetric.category_code))))
                or 0
            ),
        }
