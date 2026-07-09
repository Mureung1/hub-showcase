# collector.py — 데이터 수집 계층
# 데이터 소스를 교체할 때 이 파일만 수정하면 되도록 분리
# pip install requests
import html
import os
import re

import requests

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET", "")

BLOG_SEARCH_URL = "https://openapi.naver.com/v1/search/blog.json"

# API 키가 없을 때 사용할 폴백 더미 데이터 (MVP 검증용)
FALLBACK_REVIEWS = [
    "사장님이 너무 불친절해요. 주문할 때 눈도 안 마주치고 던지듯이 음식을 줬어요.",
    "파스타가 정말 맛있어요! 크림소스가 진하고 면 익힘도 완벽했습니다. 재방문 의사 있어요.",
    "가격 대비 양이 너무 적네요. 만 오천 원인데 이 양은 좀 아닌 것 같아요.",
    "매장이 깔끔하고 인테리어가 예뻐서 데이트 코스로 좋아요. 직원분들도 친절하세요.",
    "웨이팅이 한 시간 넘게 걸렸는데 안내도 제대로 안 해주고, 음식도 식어서 나왔어요.",
]

TAG_RE = re.compile(r"<[^>]+>")


def _clean(text: str) -> str:
    """네이버 API 응답의 <b> 태그와 HTML 엔티티 제거"""
    return html.unescape(TAG_RE.sub("", text)).strip()


def fetch_reviews(store_name: str, count: int = 5) -> dict:
    """
    매장 관련 텍스트를 수집해 리턴.
    반환: {"source": "naver_blog" | "fallback_dummy", "texts": [str, ...]}
    """
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        return {"source": "fallback_dummy", "texts": FALLBACK_REVIEWS}

    resp = requests.get(
        BLOG_SEARCH_URL,
        headers={
            "X-Naver-Client-Id": NAVER_CLIENT_ID,
            "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
        },
        params={
            "query": f"{store_name} 후기",
            "display": min(count, 100),  # API 최대 100
            "sort": "sim",  # 정확도순
        },
        timeout=10,
    )
    resp.raise_for_status()
    items = resp.json().get("items", [])

    texts = []
    for item in items:
        title = _clean(item.get("title", ""))
        desc = _clean(item.get("description", ""))
        combined = f"{title}. {desc}".strip(". ")
        if combined:
            texts.append(combined)

    if not texts:
        return {"source": "fallback_dummy", "texts": FALLBACK_REVIEWS}

    return {"source": "naver_blog", "texts": texts}