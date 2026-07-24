from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentUserId, UserClient
from app.features.articles.schemas import ArticleDetail, TodayArticlesResponse
from app.features.articles.service import (
    CANDIDATE_EMPTY_MESSAGE,
    ONBOARDING_EMPTY_MESSAGE,
    get_article_detail as load_article_detail,
    get_today_articles as load_today_articles,
)

router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("/today", response_model=TodayArticlesResponse)
def get_today_articles(
    user_id: CurrentUserId,
    client: UserClient,
    limit: Annotated[int, Query(ge=1, le=3)] = 3,
) -> TodayArticlesResponse:
    return load_today_articles(client, user_id, limit)


@router.get("/{article_id}", response_model=ArticleDetail)
def get_article_detail(
    article_id: UUID,
    _user_id: CurrentUserId,
    client: UserClient,
) -> ArticleDetail:
    return load_article_detail(client, article_id)
