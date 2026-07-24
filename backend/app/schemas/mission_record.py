import re
from datetime import date as Date
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel

from app.missions import MissionType
from app.schemas.article import InterestTag

BLOCKED_ANSWERS = {"네", "아니요", "ㅇㅇ", "ㄴㄴ", "몰라", "모름"}


class MissionRecordRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )

    article_id: UUID
    mission_type: MissionType
    user_answer: str

    @field_validator("user_answer")
    @classmethod
    def normalize_and_reject_lazy_answer(cls, value: str) -> str:
        normalized = re.sub(r"\s+", " ", value.strip())
        if not normalized or normalized in BLOCKED_ANSWERS:
            raise ValueError("조금 더 생각을 담아 답변해 주세요.")
        return normalized


class MissionRecordResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: UUID
    article_id: UUID
    mission_type: MissionType
    mission_prompt: str
    user_answer: str
    selected_quote: str | None
    anchor_type: str
    created_at: datetime


class MissionRecordListItem(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: UUID
    article_id: UUID
    article_title: str
    source_name: str
    interest_tags: list[InterestTag]
    mission_type: MissionType
    mission_prompt: str
    user_answer: str
    created_at: datetime
    original_url: str
    url_status: str


class MissionRecordCalendarDay(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    date: Date
    record_count: int
    first_mission_type: MissionType


class MissionRecordCalendarResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    month: str
    days: list[MissionRecordCalendarDay]
