# AI 미스터리 쇼퍼

소상공인을 위한 경쟁업체 리뷰 분석 AI 에이전트입니다. 경쟁 가게의 리뷰 텍스트를 수집·분석하여 긍정/부정 비율, 핵심 키워드 순위, 경쟁 전략 리포트를 자동으로 생성합니다.

> 네이버 AI 부트캠프 프로젝트 (2026)

## 주요 기능

- **리뷰 감성 분석**: 리뷰를 한 건씩 LLM으로 분석해 긍정/부정으로 분류
- **키워드 추출**: 리뷰에서 핵심 키워드(맛, 가격, 불친절, 웨이팅 등)를 구조화된 JSON으로 추출
- **통계 집계**: 긍정/부정 비율, 키워드 언급 횟수 순위 산출
- **AI 전략 리포트**: 분석 결과를 바탕으로 벤치마킹 포인트와 공략 가능한 약점을 담은 컨설팅 리포트 생성
- **분석 결과 캐싱**: 분석 결과를 DB에 저장하여 동일 요청 시 LLM 재호출 비용 절감 (구조 설계 완료, 캐싱 로직은 고도화 예정)

## 기술 스택

| 구분 | 기술 |
|---|---|
| Frontend | React (Vite), Tailwind CSS v4 |
| Backend | FastAPI, Python |
| AI | LangChain, Google Gemini (gemini-2.5-flash)
| Database | SQLite (MVP 단계) → MySQL 전환 예정 <!-- 현재 사용 DB 확인 후 수정 --> |
| ORM | SQLAlchemy |

## 아키텍처

```
[React Dashboard] --fetch--> [FastAPI]
                                ├── LangChain + Gemini (구조화된 출력)
                                └── SQLAlchemy ──> [DB]
```

- 프론트엔드는 `POST /api/analyze`로 가게 이름을 전송
- 백엔드는 리뷰를 LLM으로 분석하고, Pydantic 스키마 기반 `with_structured_output`으로 결과를 JSON으로 강제
- 분석 결과는 DB에 저장 후 통계와 함께 프론트엔드로 반환

## 데이터 수집에 대한 의사결정

네이버 플레이스 리뷰는 공식 API가 제공되지 않으며, 크롤링은 네이버 이용약관이 금지하는 자동화 수집에 해당합니다. 이에 따라 본 프로젝트는:

1. **MVP 단계(현재)**: 가상 리뷰 데이터로 분석 파이프라인을 검증
2. **고도화 단계(예정)**: 네이버 블로그 검색 API(공식) 등 합법적 데이터 소스로 수집 계층 교체

수집 계층은 교체 가능하도록 분리하는 것을 목표로 설계했습니다.

## API 명세

### POST /api/analyze

가게 이름을 받아 리뷰를 분석하고 DB에 저장한 뒤 결과를 반환합니다.

요청:
```json
{ "store_name": "보노베리" }
```

응답(주요 필드):
```json
{
  "competitor_id": 1,
  "store_name": "보노베리",
  "total_reviews": 5,
  "positive": 2,
  "negative": 3,
  "positive_ratio": 40.0,
  "negative_ratio": 60.0,
  "keyword_ranking": [{ "keyword": "불친절", "count": 2 }],
  "consulting_report": "...",
  "reviews": [{ "content": "...", "sentiment": "부정", "keywords": ["불친절"], "summary": "..." }]
}
```

### GET /api/report/{competitor_id}

저장된 리뷰 기반 통계(총 리뷰 수, 긍정/부정 비율, 키워드 순위)를 반환합니다.

## 실행 방법

### 백엔드

```bash
pip install fastapi uvicorn langchain langchain-google-genai pydantic sqlalchemy
export GOOGLE_API_KEY="발급받은 키"
uvicorn main:app --reload --port 8000
```

서버 시작 시 테이블이 자동 생성됩니다.

### 프론트엔드

```bash
npm install
npm run dev
```

Tailwind CSS v4는 `@tailwindcss/vite` 플러그인 방식으로 설정되어 있습니다.

## 데이터베이스 스키마

- `competitors`: 경쟁업체 정보 (id, name, category, address, created_at)
- `reviews`: 리뷰 원문 및 분석 결과 (id, competitor_id[FK], content, sentiment, keywords[JSON], summary, analyzed_at, created_at)

## 로드맵

- [x] 분석 파이프라인 및 대시보드 MVP
- [ ] 네이버 블로그 검색 API 연동
- [ ] 동일 매장 재조회 시 캐싱 응답
- [ ] Docker 컨테이너화 (docker-compose)
- [ ] GitHub Actions CI/CD
- [ ] 네이버 클라우드 플랫폼 배포