import os
import time
from datetime import date

import httpx

BASE_URL = "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo"

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 1.0


def get_today_holiday():
    """오늘이 공휴일/기념일인지 특일정보 API로 조회.

    공휴일이면 이름(예: "삼일절")을 반환하고, 아니면 None을 반환.
    배포 환경에서는 이 API 응답이 5초를 넘는 경우가 잦아서, 날씨 API와
    동일하게 넉넉한 타임아웃 + 재시도를 적용함.
    """
    today = date.today()
    api_key = os.getenv("HOLIDAY_API_KEY")

    params = {
        "serviceKey": api_key,
        "solYear": today.year,
        "solMonth": f"{today.month:02d}",
        "_type": "json",
        "numOfRows": "50",
    }

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = httpx.get(BASE_URL, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            break
        except Exception as e:
            last_error = e
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SECONDS)
    else:
        raise last_error

    body = data.get("response", {}).get("body", {})
    items = body.get("items")

    # 이번 달에 공휴일이 하나도 없으면 items 자체가 빈 문자열로 옴
    if not items or not isinstance(items, dict):
        return None

    item_list = items.get("item", [])
    # 결과가 1건이면 리스트가 아니라 dict 하나로 옴 (공공데이터포털 API 특유의 동작)
    if isinstance(item_list, dict):
        item_list = [item_list]

    today_str = today.strftime("%Y%m%d")
    for item in item_list:
        if str(item.get("locdate")) == today_str:
            return item.get("dateName")

    return None
