import math
import os
import time
from datetime import datetime, timedelta

import httpx

BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst"

# TODO: 지금은 서울시청 좌표로 고정. 나중에 업장 프로필에 주소를 받으면
# 그 주소를 위경도로 변환해서 여기에 동적으로 넣어야 함.
DEFAULT_LAT = 37.5665
DEFAULT_LON = 126.9780

# 강수형태(PTY) 코드 → 사람이 읽을 수 있는 라벨
# 참고: 이 API는 "맑음/흐림" 같은 하늘상태(SKY)는 안 주고 강수형태만 줌.
# 그래서 비/눈이 없으면 "맑음"으로 단순화해서 표시함 (실제로는 흐릴 수도 있음).
PTY_LABELS = {
    "0": "맑음",
    "1": "비",
    "2": "비/눈",
    "3": "눈",
    "5": "빗방울",
    "6": "빗방울눈날림",
    "7": "눈날림",
}

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 1.0


def latlon_to_grid(lat, lon):
    """위경도를 기상청 격자좌표(nx, ny)로 변환. (기상청 공식 변환 공식, Lambert Conformal Conic 투영)"""
    RE = 6371.00877
    GRID = 5.0
    SLAT1 = 30.0
    SLAT2 = 60.0
    OLON = 126.0
    OLAT = 38.0
    XO = 43
    YO = 136

    DEGRAD = math.pi / 180.0

    re = RE / GRID
    slat1 = SLAT1 * DEGRAD
    slat2 = SLAT2 * DEGRAD
    olon = OLON * DEGRAD
    olat = OLAT * DEGRAD

    sn = math.tan(math.pi * 0.25 + slat2 * 0.5) / math.tan(math.pi * 0.25 + slat1 * 0.5)
    sn = math.log(math.cos(slat1) / math.cos(slat2)) / math.log(sn)
    sf = math.tan(math.pi * 0.25 + slat1 * 0.5)
    sf = math.pow(sf, sn) * math.cos(slat1) / sn
    ro = math.tan(math.pi * 0.25 + olat * 0.5)
    ro = re * sf / math.pow(ro, sn)

    ra = math.tan(math.pi * 0.25 + lat * DEGRAD * 0.5)
    ra = re * sf / math.pow(ra, sn)
    theta = lon * DEGRAD - olon
    if theta > math.pi:
        theta -= 2.0 * math.pi
    if theta < -math.pi:
        theta += 2.0 * math.pi
    theta *= sn

    nx = int(ra * math.sin(theta) + XO + 0.5)
    ny = int(ro - ra * math.cos(theta) + YO + 0.5)
    return nx, ny


def _latest_base_datetime():
    """초단기실황은 매시 40분에 갱신됨. 안전하게 직전 정시 기준으로 요청 시각을 구함."""
    now = datetime.now()
    if now.minute < 45:
        now -= timedelta(hours=1)
    base_date = now.strftime("%Y%m%d")
    base_time = now.strftime("%H00")
    return base_date, base_time


def _fetch_weather_once(params):
    """API 요청 1회 시도. 실패하면 예외를 그대로 던짐 (재시도는 호출하는 쪽에서 처리)."""
    response = httpx.get(BASE_URL, params=params, timeout=5.0)
    response.raise_for_status()
    return response.json()


def get_current_weather():
    """오늘의 날씨(기온, 강수형태)를 초단기실황 API로 조회.

    기상청 API가 가끔 일시적으로 응답이 느리거나 실패하는 경우가 있어서,
    최대 MAX_RETRIES번까지 짧은 간격으로 재시도함.
    """
    api_key = os.getenv("WEATHER_API_KEY")
    nx, ny = latlon_to_grid(DEFAULT_LAT, DEFAULT_LON)
    base_date, base_time = _latest_base_datetime()

    params = {
        "serviceKey": api_key,
        "pageNo": "1",
        "numOfRows": "10",
        "dataType": "JSON",
        "base_date": base_date,
        "base_time": base_time,
        "nx": nx,
        "ny": ny,
    }

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            data = _fetch_weather_once(params)
            items = data["response"]["body"]["items"]["item"]
            values = {item["category"]: item["obsrValue"] for item in items}

            temp = values.get("T1H")  # 기온
            pty = values.get("PTY", "0")  # 강수형태
            label = PTY_LABELS.get(pty, "맑음")

            return {
                "label": label,
                "temp": f"{temp}°C" if temp is not None else None,
            }
        except Exception as e:
            last_error = e
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SECONDS)

    # 재시도 다 실패하면 마지막 에러를 그대로 던짐 (라우터에서 최종적으로 폴백 처리)
    raise last_error
