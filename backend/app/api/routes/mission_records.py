from datetime import date as Date
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter
from supabase import Client

from app.api.deps import CurrentUserId, UserClient
from app.core.errors import ApiError
from app.missions import MISSION_PROMPTS
from app.schemas.article import InterestTag
from app.schemas.mission_record import (
    MissionRecordListItem,
    MissionRecordRequest,
    MissionRecordResponse,
)

router = APIRouter(prefix="/mission-records", tags=["mission-records"])

KST = ZoneInfo("Asia/Seoul")


def kst_day_bounds_utc(day: Date) -> tuple[datetime, datetime]:
    """KST 기준 하루(day)를 UTC [시작, 끝) 반개구간으로 변환한다."""
    start_kst = datetime(day.year, day.month, day.day, tzinfo=KST)
    end_kst = start_kst + timedelta(days=1)
    return start_kst.astimezone(ZoneInfo("UTC")), end_kst.astimezone(ZoneInfo("UTC"))

MISSION_RECORD_LIST_SELECT = (
    "id,article_id,mission_type,mission_prompt,user_answer,created_at,"
    "articles(title,canonical_url,url_status,sources(name),"
    "content_interest_tags(interests(id,name)))"
)


def article_exists(client: Client, article_id: str) -> bool:
    result = client.table("articles").select("id").eq("id", article_id).execute()
    return bool(result.data)


@router.post("", response_model=MissionRecordResponse, status_code=201)
def create_mission_record(
    body: MissionRecordRequest,
    user_id: CurrentUserId,
    client: UserClient,
) -> MissionRecordResponse:
    article_id = str(body.article_id)
    if not article_exists(client, article_id):
        raise ApiError(404)

    payload = {
        "user_id": user_id,
        "article_id": article_id,
        "mission_type": body.mission_type,
        "mission_prompt": MISSION_PROMPTS[body.mission_type],
        "user_answer": body.user_answer,
        "selected_quote": None,
        "anchor_type": "whole_content",
    }
    result = client.table("mission_records").insert(payload).execute()
    row = result.data[0]
    return MissionRecordResponse(
        id=row["id"],
        article_id=row["article_id"],
        mission_type=row["mission_type"],
        mission_prompt=row["mission_prompt"],
        user_answer=row["user_answer"],
        selected_quote=row["selected_quote"],
        anchor_type=row["anchor_type"],
        created_at=row["created_at"],
    )


def build_mission_record_list_item(row: dict) -> MissionRecordListItem:
    article = row["articles"]
    tags = [
        InterestTag(id=tag["interests"]["id"], name=tag["interests"]["name"])
        for tag in article["content_interest_tags"]
    ]
    return MissionRecordListItem(
        id=row["id"],
        article_id=row["article_id"],
        article_title=article["title"],
        source_name=article["sources"]["name"],
        interest_tags=tags,
        mission_type=row["mission_type"],
        mission_prompt=row["mission_prompt"],
        user_answer=row["user_answer"],
        created_at=row["created_at"],
        original_url=article["canonical_url"],
        url_status=article["url_status"],
    )


@router.get("", response_model=list[MissionRecordListItem])
def list_mission_records(
    user_id: CurrentUserId,
    client: UserClient,
    date: Date,
) -> list[MissionRecordListItem]:
    start_utc, end_utc = kst_day_bounds_utc(date)
    result = (
        client.table("mission_records")
        .select(MISSION_RECORD_LIST_SELECT)
        .eq("user_id", user_id)
        .gte("created_at", start_utc.isoformat())
        .lt("created_at", end_utc.isoformat())
        .order("created_at", desc=True)
        .order("id", desc=True)
        .execute()
    )
    return [build_mission_record_list_item(row) for row in result.data or []]
