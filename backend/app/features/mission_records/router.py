from datetime import date as Date

from fastapi import APIRouter

from app.api.deps import CurrentUserId, UserClient
from app.features.mission_records.schemas import (
    MissionRecordCalendarResponse,
    MissionRecordListItem,
    MissionRecordRequest,
    MissionRecordResponse,
)
from app.features.mission_records.service import (
    create_mission_record as save_mission_record,
    get_mission_records_calendar as load_mission_records_calendar,
    list_mission_records as load_mission_records,
)

router = APIRouter(prefix="/mission-records", tags=["mission-records"])


@router.post("", response_model=MissionRecordResponse, status_code=201)
def create_mission_record(
    body: MissionRecordRequest,
    user_id: CurrentUserId,
    client: UserClient,
) -> MissionRecordResponse:
    return save_mission_record(client, user_id, body)


@router.get("", response_model=list[MissionRecordListItem])
def list_mission_records(
    user_id: CurrentUserId,
    client: UserClient,
    date: Date,
) -> list[MissionRecordListItem]:
    return load_mission_records(client, user_id, date)


@router.get("/calendar", response_model=MissionRecordCalendarResponse)
def get_mission_records_calendar(
    user_id: CurrentUserId,
    client: UserClient,
    month: str,
) -> MissionRecordCalendarResponse:
    return load_mission_records_calendar(client, user_id, month)
