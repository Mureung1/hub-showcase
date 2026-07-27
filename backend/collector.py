# collector.py — 데이터 수집 계층
# 데이터 소스를 교체할 때 이 파일만 수정하면 되도록 분리
# pip install requests
import html
import os
import re

import requests

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET", "")
KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY", "")

BLOG_SEARCH_URL = "https://openapi.naver.com/v1/search/blog.json"
KAKAO_LOCAL_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
KAKAO_ADDRESS_URL = "https://dapi.kakao.com/v2/local/search/address.json"

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


def search_local_kakao(query: str, x: float = None, y: float = None,
                        radius: int = None, size: int = 15, return_meta: bool = False):
    """
    카카오 로컬 API(키워드 검색)로 장소를 검색해 리턴.
    x/y(중심 좌표)와 radius(미터)를 함께 주면 반경 내 검색 + 거리순 정렬까지 API가 처리해줌.
    반환: [{"name", "address", "category", "latitude", "longitude", "distance_km"}, ...]
    return_meta=True면 (결과 리스트, meta.total_count) 튜플을 반환.
    """
    if not KAKAO_REST_API_KEY:
        raise RuntimeError("KAKAO_REST_API_KEY가 설정되지 않았습니다.")

    params = {"query": query, "size": min(size, 15)}
    if x is not None and y is not None:
        params["x"] = x
        params["y"] = y
        params["sort"] = "distance"
    if radius is not None:
        params["radius"] = min(radius, 20000)

    resp = requests.get(
        KAKAO_LOCAL_URL,
        headers={"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"},
        params=params,
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    docs = data.get("documents", [])

    results = [{
        "name": d["place_name"],
        "address": d.get("road_address_name") or d.get("address_name") or "",
        "category": d.get("category_name", ""),
        "latitude": float(d["y"]),
        "longitude": float(d["x"]),
        "distance_km": round(float(d["distance"]) / 1000, 2) if d.get("distance") else None,
    } for d in docs]

    if return_meta:
        total_count = data.get("meta", {}).get("total_count", len(results))
        return results, total_count
    return results


def geocode_region(region: str):
    """
    지역 문자열(예: '장전동', '강남구')을 좌표로 변환.
    1) 카카오 주소 검색 API로 시도 (행정동/지번/도로명 주소에 정확)
    2) 실패하면 키워드 검색(search_local_kakao)의 첫 결과 좌표로 폴백
       (예: '부산대'처럼 행정구역은 아니지만 실존 장소인 경우 대비)
    반환: (longitude, latitude) 튜플. 둘 다 실패하면 None — 예외를 던지지 않고
    호출부가 안전하게 기존 방식으로 폴백할 수 있게 한다.
    """
    if not KAKAO_REST_API_KEY:
        return None

    region = region.strip()

    try:
        resp = requests.get(
            KAKAO_ADDRESS_URL,
            headers={"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"},
            params={"query": region, "size": 5},
            timeout=10,
        )
        resp.raise_for_status()
        docs = resp.json().get("documents", [])
        # 카카오 주소 검색은 행정구역 접미사(동/리 등)를 무시하고 느슨하게 매칭할 때가 있다
        # (예: '장전동' 검색 시 무관한 '...남양읍 장전리'가 1순위로 뜨고 실제 '부산 금정구
        # 장전동'은 그 다음 순위로 밀림). 주소명이 검색어로 정확히 끝나는 문서만 신뢰한다.
        exact_docs = [d for d in docs if d.get("address_name", "").endswith(region)]
        if exact_docs:
            return float(exact_docs[0]["x"]), float(exact_docs[0]["y"])
    except requests.RequestException:
        pass

    try:
        results = search_local_kakao(region, size=1)
        if results:
            return results[0]["longitude"], results[0]["latitude"]
    except (RuntimeError, requests.RequestException):
        pass

    return None