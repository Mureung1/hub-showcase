import json
import random
from datetime import date
from pathlib import Path

_KEYWORDS_PATH = Path(__file__).parent.parent / "data" / "keywords.json"


def _load_keywords() -> dict:
    with open(_KEYWORDS_PATH, encoding="utf-8") as f:
        return json.load(f)


def _season_for_month(month: int) -> str:
    if month in (3, 4, 5):
        return "spring"
    if month in (6, 7, 8):
        return "summer"
    if month in (9, 10, 11):
        return "autumn"
    return "winter"


def pick_keyword() -> str:
    """오늘 계절/요일에 맞는 키워드를 하나 골라서 반환.

    외부 API 없이 순수 로직으로만 동작하기 때문에, 날씨/공휴일 API가
    둘 다 실패해도 이 키워드 하나는 항상 안정적으로 제공됨 (안전망 역할).
    """
    keywords = _load_keywords()
    today = date.today()

    season = _season_for_month(today.month)
    is_weekend = today.weekday() >= 5  # 5=토, 6=일

    pool = list(keywords.get(season, []))
    if not is_weekend:
        pool += keywords.get("weekday", [])
    pool += keywords.get("meme", [])

    if not pool:
        return ""

    return random.choice(pool)
