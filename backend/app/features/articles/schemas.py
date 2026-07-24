from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.shared.mission_types import MissionType


class InterestTag(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: UUID
    name: str


class TodayArticle(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: UUID
    title: str
    translated_title: str | None
    source_name: str
    source_type: str
    content_type: str
    published_at: datetime | None
    interest_tags: list[InterestTag]
    official_excerpt: str | None
    translated_excerpt: str | None
    thumbnail_url: str | None
    reading_time_minutes: int | None
    language: str
    access_type: str
    original_url: str
    recommendation_reason: str


class TodayArticlesResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    items: list[TodayArticle]
    empty_state_message: str | None


class Mission(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    type: MissionType
    prompt: str


class ArticleDetail(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: UUID
    title: str
    translated_title: str | None
    source_name: str
    source_type: str
    content_type: str
    published_at: datetime | None
    author: str | None
    official_excerpt: str | None
    translated_excerpt: str | None
    reading_time_minutes: int | None
    language: str
    access_type: str
    url_status: str
    original_url: str
    recommended_mission: Mission
    mission_options: list[Mission]
