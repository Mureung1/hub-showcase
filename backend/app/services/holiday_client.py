import os
from datetime import date

import httpx

BASE_URL = "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo"


def get_today_holiday():
    """오늘이 공휴일/기념일인지 특일정보 API로 조회.

    공휴일이면 이름(예: "삼일절")을 반환하고, 아니면 None을 반환.
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

    response = httpx.get(BASE_URL, params=params, timeout=5.0)
    response.raise_for_status()
    data = response.json()

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
