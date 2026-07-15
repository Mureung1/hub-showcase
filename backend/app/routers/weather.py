from fastapi import APIRouter

router = APIRouter(tags=["weather"])

# TODO: 날씨 API 연동, 위경도→격자좌표 변환 포함 (3주차 작업 예정)