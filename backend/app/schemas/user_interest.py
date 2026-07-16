from uuid import UUID

from pydantic import BaseModel, ConfigDict
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
