# main.py — 1주차 업데이트 버전
# 변경점:
#   1) 하드코딩된 가상 리뷰 → collector.fetch_reviews()로 교체 (수집 계층 분리)
#   2) 이미 분석된 매장 재조회 시 LLM 재호출 없이 DB 결과 반환 (캐싱)
#   3) 응답에 데이터 출처(source)와 캐시 여부(cached) 포함
#   4) USE_MOCK 스위치 추가 — .env에 USE_MOCK=true 넣으면 LLM 호출 없이 목 데이터 반환
#
# pip install fastapi uvicorn langchain langchain-google-genai pydantic sqlalchemy requests
# export GOOGLE_API_KEY="AIza..."
# export NAVER_CLIENT_ID="..."        # 없으면 더미 데이터로 동작
# export NAVER_CLIENT_SECRET="..."
# 실행: uvicorn main:app --reload --port 8000
from dotenv import load_dotenv
import os
load_dotenv()  # .env 파일 읽기
from collections import Counter
from datetime import datetime
from typing import List, Literal, Optional
import requests
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from langchain_google_genai import ChatGoogleGenerativeAI
from database import init_db, get_db, Competitor, Review, MyStore
from collector import fetch_reviews, search_local_kakao

# ── 목(Mock) 모드 설정 ────────────────────────────────────────
# .env에 USE_MOCK=true 를 넣으면 LLM 호출 없이 고정 데이터 반환 (Gemini 할당량과 무관하게 화면 작업 가능)
USE_MOCK = os.getenv("USE_MOCK", "false").lower() == "true"

MOCK_RESPONSE = {
    "cached": False,
    "source": "mock",
    "total_reviews": 5,
    "positive": 3,
    "negative": 2,
    "positive_ratio": 60.0,
    "negative_ratio": 40.0,
    "keyword_ranking": [
        {"keyword": "웨이팅", "count": 3},
        {"keyword": "맛", "count": 2},
        {"keyword": "친절", "count": 2},
        {"keyword": "가격", "count": 1},
        {"keyword": "주차", "count": 1},
    ],
    "consulting_report": (
        "경쟁업체는 맛과 친절도에서 강한 긍정 반응을 얻고 있어 벤치마킹이 필요합니다. "
        "웨이팅 불만이 가장 많이 언급되어, 대기시간 단축이 차별화 포인트가 될 수 있습니다. "
        "주차 불편 언급도 있어, 주차 편의 안내를 강조하면 고객 유입에 유리합니다."
    ),
    "reviews": [
        {"content": "디저트가 정말 맛있어요. 직원분들도 친절했습니다.", "sentiment": "긍정", "keywords": ["맛", "친절"], "summary": "맛과 응대 모두 만족"},
        {"content": "웨이팅이 너무 길어요. 30분 넘게 기다렸습니다.", "sentiment": "부정", "keywords": ["웨이팅"], "summary": "대기 시간이 김"},
        {"content": "분위기 좋고 커피도 훌륭해요. 재방문 의사 있어요.", "sentiment": "긍정", "keywords": ["맛"], "summary": "분위기와 음료 만족"},
        {"content": "주차가 불편하고 자리가 좁아요.", "sentiment": "부정", "keywords": ["주차"], "summary": "주차·공간 불편"},
        {"content": "가격 대비 만족스럽고 웨이팅도 감수할 만해요.", "sentiment": "긍정", "keywords": ["가격", "웨이팅", "친절"], "summary": "가성비 긍정적"},
    ],
}

# ── LLM 세팅 ─────────────────────────────────────────────────
class ReviewAnalysis(BaseModel):
    """리뷰 한 건에 대한 분석 결과"""
    sentiment: Literal["긍정", "부정"] = Field(description="리뷰의 전체적인 감성")
    keywords: List[str] = Field(description="핵심 키워드 목록 (예: 불친절, 맛, 가격, 웨이팅, 위생)")
    summary: str = Field(description="리뷰 핵심 내용 한 줄 요약")

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
structured_llm = llm.with_structured_output(ReviewAnalysis)

ANALYZE_PROMPT = """당신은 소상공인을 위한 경쟁업체 리뷰 분석 전문가입니다.
아래 텍스트는 특정 매장에 대한 온라인 후기입니다.
감성(긍정/부정), 핵심 키워드, 한 줄 요약을 추출하세요.
후기: {review}"""

REPORT_PROMPT = """당신은 소상공인 컨설턴트입니다. 경쟁업체 '{name}'의 후기 분석 결과입니다.
- 총 후기 수: {total}건 (긍정 {pos}건 / 부정 {neg}건)
- 주요 키워드: {keywords}
- 후기 요약: {summaries}
이 데이터를 바탕으로, 우리 가게가 이 경쟁업체 대비 취해야 할 전략을
'강점 벤치마킹 포인트'와 '공략 가능한 약점' 중심으로 5문장 이내의 컨설팅 리포트로 작성하세요."""

# ── FastAPI 앱 ───────────────────────────────────────────────
app = FastAPI(title="상권 스캐너")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


class AnalyzeRequest(BaseModel):
    store_name: str
    force_refresh: bool = False  # true면 캐시 무시하고 재수집·재분석


def build_stats(db_reviews: List[Review]):
    total = len(db_reviews)
    pos = sum(1 for r in db_reviews if r.sentiment == "긍정")
    neg = total - pos
    keyword_counter = Counter(k for r in db_reviews for k in (r.keywords or []))
    return {
        "total_reviews": total,
        "positive": pos,
        "negative": neg,
        "positive_ratio": round(pos / total * 100, 1) if total else 0,
        "negative_ratio": round(neg / total * 100, 1) if total else 0,
        "keyword_ranking": [
            {"keyword": k, "count": c} for k, c in keyword_counter.most_common(10)
        ],
    }


def review_to_dict(r: Review):
    return {
        "content": r.content,
        "sentiment": r.sentiment,
        "keywords": r.keywords,
        "summary": r.summary,
    }


def generate_report(name: str, stats: dict, reviews: List[Review]) -> str:
    return llm.invoke(
        REPORT_PROMPT.format(
            name=name,
            total=stats["total_reviews"],
            pos=stats["positive"],
            neg=stats["negative"],
            keywords=", ".join(k["keyword"] for k in stats["keyword_ranking"]),
            summaries=" / ".join(r.summary or "" for r in reviews),
        )
    ).content


# ── POST /api/analyze ────────────────────────────────────────
@app.post("/api/analyze")
def analyze(req: AnalyzeRequest, db: Session = Depends(get_db)):
    name = req.store_name.strip()

    # 목 모드: LLM 호출 없이 고정 데이터 즉시 반환 (Gemini 할당량 문제 우회용)
    if USE_MOCK:
        return {"competitor_id": 1, "store_name": name, **MOCK_RESPONSE}

    competitor = db.query(Competitor).filter(Competitor.name == name).first()

    # 1) 캐시 확인: 이미 분석된 매장이면 LLM 호출 없이 DB 결과 반환
    if competitor and not req.force_refresh:
        existing = db.query(Review).filter(Review.competitor_id == competitor.id).all()
        if existing:
            stats = build_stats(existing)
            report = generate_report(name, stats, existing)  # 리포트만 재생성
            return {
                "competitor_id": competitor.id,
                "store_name": competitor.name,
                "cached": True,
                "source": "database",
                **stats,
                "consulting_report": report,
                "reviews": [review_to_dict(r) for r in existing],
            }

    if not competitor:
        competitor = Competitor(name=name)
        db.add(competitor)
        db.commit()
        db.refresh(competitor)

    # 2) 수집: 네이버 블로그 검색 API (키 없으면 더미 데이터)
    collected = fetch_reviews(name, count=5)

    # 3) 분석 및 저장
    saved = []
    for content in collected["texts"]:
        result: ReviewAnalysis = structured_llm.invoke(ANALYZE_PROMPT.format(review=content))
        review = Review(
            competitor_id=competitor.id,
            content=content,
            sentiment=result.sentiment,
            keywords=result.keywords,
            summary=result.summary,
            analyzed_at=datetime.now(),
        )
        db.add(review)
        saved.append(review)
    db.commit()

    stats = build_stats(saved)
    report = generate_report(name, stats, saved)
    return {
        "competitor_id": competitor.id,
        "store_name": competitor.name,
        "cached": False,
        "source": collected["source"],
        **stats,
        "consulting_report": report,
        "reviews": [review_to_dict(r) for r in saved],
    }


# ── GET /api/report/{competitor_id} ──────────────────────────
@app.get("/api/report/{competitor_id}")
def report(competitor_id: int, db: Session = Depends(get_db)):
    competitor = db.query(Competitor).filter(Competitor.id == competitor_id).first()
    if not competitor:
        raise HTTPException(status_code=404, detail="해당 매장을 찾을 수 없습니다.")
    db_reviews = db.query(Review).filter(Review.competitor_id == competitor_id).all()
    return {
        "competitor_id": competitor.id,
        "store_name": competitor.name,
        **build_stats(db_reviews),
    }

# ── 내 가게 저장/조회 (오늘 추가한 DB 연동 기능) ──────────────
class MyStoreRequest(BaseModel):
    name: str


def my_store_to_dict(s: MyStore):
    return {"id": s.id, "name": s.name, "category": s.category, "address": s.address}


@app.post("/api/my-store")
def create_my_store(req: MyStoreRequest, db: Session = Depends(get_db)):
    name = req.name.strip()
    if not name:
        return {"error": "가게 이름을 입력하세요."}
    store = MyStore(name=name)
    db.add(store)
    db.commit()
    db.refresh(store)
    return my_store_to_dict(store)


@app.get("/api/my-stores")
def list_my_stores(db: Session = Depends(get_db)):
    stores = db.query(MyStore).order_by(MyStore.id.desc()).all()
    return {"stores": [my_store_to_dict(s) for s in stores]}


# ── 검색 → 후보 선택 → 주변 경쟁업체 (카카오 로컬 API 연동) ──────
# 카카오의 meta.total_count는 "느슨하게 관련된 모든 곳"까지 포함하는 카운트라
# (예: "카페그라운드" 검색 시 "휴먼그라운드 카페" 같은 무관한 곳까지 섞여 72건으로 잡힘)
# 지역 좁히기 판단은 total_count가 아니라, 실제 place_name이 검색어와 정확히
# 일치하는 후보 수(exact_match_count)로 한다. 이 값이 아래 임계값을 넘으면 지역을 물어본다.
SEARCH_NARROW_THRESHOLD = 5


def _normalize_name(s: str) -> str:
    """공백 제거 + 소문자 변환 후 비교 — 표기 차이(띄어쓰기 등)로 인한 오탐 방지"""
    return "".join(s.split()).lower()


class SearchStoreRequest(BaseModel):
    store_name: str
    region: str = ""


class NearbyCompetitorsRequest(BaseModel):
    name: str
    address: str = ""
    latitude: float
    longitude: float
    category: str = ""


def _category_keyword(category: str) -> str:
    """카카오 category_name('음식점 > 카페 > 커피전문점 > 스타벅스')에서 검색용 키워드 추출.
    마지막 segment는 브랜드명(예: '스타벅스')인 경우가 많아 그대로 쓰면 같은 브랜드 지점만
    검색되므로, 중분류(두 번째 segment, 예: '카페')를 우선 사용한다."""
    if not category:
        return "가게"
    parts = [p.strip() for p in category.split(">") if p.strip()]
    if len(parts) >= 2:
        return parts[1]
    return parts[-1] if parts else "가게"


def competitor_to_dict(c: Competitor):
    return {
        "id": c.id,
        "name": c.name,
        "address": c.address,
        "category": c.category,
        "distance": c.distance_km,
    }


@app.post("/api/search-store")
def search_store(req: SearchStoreRequest):
    name = req.store_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="가게 이름을 입력하세요.")
    region = req.region.strip()
    query = f"{name} {region}" if region else name
    try:
        raw_candidates, total_count = search_local_kakao(query, size=15, return_meta=True)
    except (RuntimeError, requests.RequestException) as e:
        raise HTTPException(status_code=502, detail=f"카카오 API 호출에 실패했습니다: {e}")
    if not raw_candidates:
        raise HTTPException(status_code=404, detail="검색 결과가 없습니다.")

    target = _normalize_name(name)
    # 완전 일치(==)로 하면 프랜차이즈 지점명("스타벅스 OO점")이 전부 걸러져 0건이 되어버려
    # 오히려 지역을 안 물어보는 반대 버그가 생김 — place_name이 검색어로 "시작하는지"로 판단
    exact_matches = [c for c in raw_candidates if _normalize_name(c["name"]).startswith(target)]
    exact_match_count = len(exact_matches)
    # 정확히 일치하는 곳이 하나도 없으면(표기 차이 등) 느슨한 검색 결과라도 후보로 보여준다
    candidates = exact_matches if exact_matches else raw_candidates

    return {
        "candidates": candidates,
        "total_count": total_count,  # 참고용(카카오의 느슨한 전체 매칭 수) — 판단 기준으로는 안 씀
        "exact_match_count": exact_match_count,
        "needs_region": exact_match_count > SEARCH_NARROW_THRESHOLD,
    }


@app.post("/api/nearby-competitors")
def nearby_competitors(req: NearbyCompetitorsRequest, db: Session = Depends(get_db)):
    keyword = _category_keyword(req.category)
    try:
        raw = search_local_kakao(keyword, x=req.longitude, y=req.latitude, radius=2000, size=15)
    except (RuntimeError, requests.RequestException) as e:
        raise HTTPException(status_code=502, detail=f"카카오 API 호출에 실패했습니다: {e}")

    # 검색 대상 가게 자신은 경쟁업체 목록에서 제외
    raw = [r for r in raw if r["name"] != req.name and (not req.address or r["address"] != req.address)]

    saved = []
    for r in raw:
        comp = (
            db.query(Competitor)
            .filter(Competitor.name == r["name"], Competitor.source_store_name == req.name)
            .first()
        )
        if not comp:
            comp = Competitor(name=r["name"], source_store_name=req.name)
            db.add(comp)
        comp.category = r["category"]
        comp.address = r["address"]
        comp.latitude = r["latitude"]
        comp.longitude = r["longitude"]
        comp.distance_km = r["distance_km"]
        db.commit()
        db.refresh(comp)
        saved.append(comp)

    return {"competitors": [competitor_to_dict(c) for c in saved]}


@app.get("/api/nearby-competitors/{store_name}")
def get_nearby_competitors(store_name: str, db: Session = Depends(get_db)):
    rows = (
        db.query(Competitor)
        .filter(Competitor.source_store_name == store_name)
        .order_by(Competitor.distance_km)
        .all()
    )
    return {"competitors": [competitor_to_dict(c) for c in rows]}


# ── GET /health (배포 대비 헬스체크) ──────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)