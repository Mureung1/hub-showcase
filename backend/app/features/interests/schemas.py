from uuid import UUID

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class Interest(BaseModel):
    """관심사 응답 스키마.

    DB는 snake_case, 프론트엔드는 camelCase를 쓴다.
    변환은 여기서 한 번만 한다.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: UUID
    name: str
    display_order: int
    launch_status: str
    risk_level: str
    empty_state_message: str | None
