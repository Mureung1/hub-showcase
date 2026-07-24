from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class UserInterestItem(BaseModel):
    """저장된 관심사 응답 항목. selectable은 launch_status에서 파생한다."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: UUID
    name: str
    display_order: int
    launch_status: str
    selectable: bool


class UserInterestsResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    has_completed_onboarding: bool
    interests: list[UserInterestItem]


class ReplaceUserInterestsRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )

    interest_ids: list[UUID] = Field(min_length=1, max_length=3)

    @field_validator("interest_ids")
    @classmethod
    def reject_duplicates(cls, value: list[UUID]) -> list[UUID]:
        if len(set(value)) != len(value):
            raise ValueError("관심사는 중복될 수 없습니다.")
        return value


class ReplaceUserInterestsResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    interest_ids: list[UUID]
