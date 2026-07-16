from typing import Annotated

from fastapi import APIRouter, Query
from supabase import Client

from app.api.deps import CurrentUserId, UserClient
from app.schemas.article import InterestTag, TodayArticle, TodayArticlesResponse

router = APIRouter(prefix="/articles", tags=["articles"])

ONBOARDING_EMPTY_MESSAGE = "관심사를 먼저 선택하면 오늘의 깸을 볼 수 있어요."
CANDIDATE_EMPTY_MESSAGE = "관심사에 맞는 글을 아직 준비하지 못했어요."

ARTICLE_SELECT = (
    "id,title,translated_title,canonical_url,published_at,official_excerpt,"
    "translated_excerpt,thumbnail_url,reading_time_minutes,language,access_type,"
    "content_type,source_type,sources(name),"
    "content_interest_tags(confidence,interests(id,name,display_order))"
)


def fetch_selected_interests(client: Client) -> list[dict]:
    """사용자가 저장한 관심사를 (display_order, id) 순으로 반환한다."""
    result = (
        client.table("user_interests")
        .select("interests(id,name,display_order,empty_state_message)")
        .execute()
    )
    interests = [row["interests"] for row in result.data or []]
    interests.sort(key=lambda item: (item["display_order"], str(item["id"])))
    return interests


def pick_empty_message(selected_interests: list[dict]) -> str:
    for interest in selected_interests:
        message = interest.get("empty_state_message")
        if message:
            return message
    return CANDIDATE_EMPTY_MESSAGE


def choose_reason_tag(tags: list[dict], selected_ids: set[str]) -> dict | None:
    matches = [tag for tag in tags if tag["id"] in selected_ids]
    return min(
        matches,
        key=lambda tag: (
            -float(tag.get("confidence", 0)),
            int(tag["display_order"]),
            str(tag["id"]),
        ),
        default=None,
    )


def recommendation_reason(tag: dict | None) -> str:
    return (
        f"{tag['name']} 관심사와 맞는 글이에요."
        if tag is not None
        else "관심사와 맞는 글이에요."
    )


def fetch_article_cards(client: Client, article_ids: list[str]) -> list[dict]:
    result = (
        client.table("articles")
        .select(ARTICLE_SELECT)
        .in_("id", article_ids)
        .execute()
    )
    return result.data or []


def build_card(row: dict, selected_ids: set[str]) -> TodayArticle:
    tags = [
        {
            "id": tag["interests"]["id"],
            "name": tag["interests"]["name"],
            "display_order": tag["interests"]["display_order"],
            "confidence": tag["confidence"],
        }
        for tag in row["content_interest_tags"]
    ]
    reason_tag = choose_reason_tag(tags, selected_ids)
    return TodayArticle(
        id=row["id"],
        title=row["title"],
        translated_title=row["translated_title"],
        source_name=row["sources"]["name"],
        source_type=row["source_type"],
        content_type=row["content_type"],
        published_at=row["published_at"],
        interest_tags=[InterestTag(id=tag["id"], name=tag["name"]) for tag in tags],
        official_excerpt=row["official_excerpt"],
        translated_excerpt=row["translated_excerpt"],
        thumbnail_url=row["thumbnail_url"],
        reading_time_minutes=row["reading_time_minutes"],
        language=row["language"],
        access_type=row["access_type"],
        original_url=row["canonical_url"],
        recommendation_reason=recommendation_reason(reason_tag),
    )


@router.get("/today", response_model=TodayArticlesResponse)
def get_today_articles(
    user_id: CurrentUserId,
    client: UserClient,
    limit: Annotated[int, Query(ge=1, le=3)] = 3,
) -> TodayArticlesResponse:
    selected = fetch_selected_interests(client)
    if not selected:
        return TodayArticlesResponse(items=[], empty_state_message=ONBOARDING_EMPTY_MESSAGE)

    ranked = (
        client.rpc(
            "get_recommended_articles",
            {"p_user_id": user_id, "p_limit": limit},
        )
        .execute()
        .data
        or []
    )
    ranked_ids = [row["article_id"] for row in ranked]
    if not ranked_ids:
        return TodayArticlesResponse(
            items=[],
            empty_state_message=pick_empty_message(selected),
        )

    rows = fetch_article_cards(client, ranked_ids)
    by_id = {row["id"]: row for row in rows}
    selected_ids = {str(interest["id"]) for interest in selected}
    items = [
        build_card(by_id[article_id], selected_ids)
        for article_id in ranked_ids
        if article_id in by_id
    ]
    return TodayArticlesResponse(items=items, empty_state_message=None)
