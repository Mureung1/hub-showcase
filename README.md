# AI 미스터리 쇼퍼

소상공인을 위한 경쟁업체 리뷰 분석 AI 에이전트입니다. 경쟁 가게의 리뷰 텍스트를 수집·분석하여 긍정/부정 비율, 핵심 키워드 순위, 경쟁 전략 리포트를 자동으로 생성합니다.

> 네이버 AI 부트캠프 프로젝트 (2026)

## 주요 기능

- **리뷰 감성 분석**: 리뷰를 한 건씩 LLM으로 분석해 긍정/부정으로 분류
- **키워드 추출**: 리뷰에서 핵심 키워드(맛, 가격, 불친절, 웨이팅 등)를 구조화된 JSON으로 추출
- **통계 집계**: 긍정/부정 비율, 키워드 언급 횟수 순위 산출
- **AI 전략 리포트**: 분석 결과를 바탕으로 벤치마킹 포인트와 공략 가능한 약점을 담은 컨설팅 리포트 생성
- **분석 결과 캐싱**: 분석 결과를 DB에 저장하여 동일 매장 재조회 시 LLM 재호출 비용 절감

## 기술 스택

| 구분 | 기술 |
|---|---|
| Frontend | React (Vite), Tailwind CSS v4 |
| Backend | FastAPI, Python |
| AI | LangChain, Google Gemini (gemini-2.5-flash) |
| Database | SQLite (MVP 단계) → MySQL 전환 예정 |
| ORM | SQLAlchemy |
| Data Collection | Naver Blog Search API (공식) |

## 아키텍처

```
[React Dashboard] --fetch--> [FastAPI]
                                ├── collector.py (네이버 블로그 검색)
                                ├── LangChain + Gemini (구조화된 출력)
                                └── SQLAlchemy ──> [SQLite/MySQL]
```

- 프론트엔드는 `POST /api/analyze`로 가게 이름을 전송
- 백엔드는 `collector.py`로 네이버 블로그 검색 API에서 후기 수집
- 수집된 텍스트를 LLM으로 분석하고, Pydantic 스키마 기반 `with_structured_output`으로 결과를 JSON으로 강제
- 분석 결과는 DB에 저장 후 통계와 함께 프론트엔드로 반환

## 데이터 수집에 대한 의사결정

네이버 플레이스 리뷰는 공식 API가 제공되지 않으며, 크롤링은 네이버 이용약관이 금지하는 자동화 수집에 해당합니다. 이에 따라 본 프로젝트는:

1. **MVP 단계(현재)**: 가상 리뷰 데이터로 분석 파이프라인을 검증
2. **고도화 단계(1주차 완료)**: 네이버 블로그 검색 API(공식) 기반 후기 텍스트 수집으로 교체 완료

수집 계층은 `collector.py`로 완전히 분리하여, 데이터 소스를 교체할 때 나머지 코드 수정이 불필요합니다.

## API 명세

### POST /api/analyze

가게 이름을 받아 리뷰를 수집·분석하고 DB에 저장한 뒤 결과를 반환합니다.

요청:
```json
{
  "store_name": "보노베리",
  "force_refresh": false
}
```

응답(주요 필드):
```json
{
  "competitor_id": 1,
  "store_name": "보노베리",
  "source": "naver_blog",
  "cached": false,
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

### GET /health

서버 상태 확인 (배포 모니터링용).

## 실행 방법

### 사전 설정 (처음 한 번)

**1. 환경 변수 파일 생성**

프로젝트 루트에 `.env` 파일을 생성합니다 (파일명: `.env`, 확장자 없음):

```
GOOGLE_API_KEY=발급받은_Gemini_API_키
NAVER_CLIENT_ID=발급받은_네이버_Client_ID
NAVER_CLIENT_SECRET=발급받은_네이버_Client_Secret
```

**주의**: `.env` 파일은 GitHub에 올리지 마세요. `.gitignore` 파일에 `.env`를 추가했습니다.

**2. Python 패키지 설치**

```bash
pip install fastapi uvicorn langchain langchain-google-genai pydantic sqlalchemy python-dotenv requests
```

**3. API 키 발급**

- [Google AI Studio](https://aistudio.google.com) → API 키 생성 (무료)
- [네이버 개발자센터](https://developers.naver.com) → Application 등록 → 검색 API 활성화

### 실행 (매번)

**터미널 1 - 백엔드:**

```bash
cd C:\AI_Agent\hub
uvicorn main:app --reload --port 8000
```

서버 시작 시 SQLite 테이블이 자동 생성됩니다.

**터미널 2 - 프론트엔드:**

```bash
cd C:\AI_Agent\hub\frontend
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

## 데이터베이스 스키마

- `competitors`: 경쟁업체 정보 (id, name, category, address, created_at)
- `reviews`: 리뷰 원문 및 분석 결과 (id, competitor_id[FK], content, sentiment, keywords[JSON], summary, analyzed_at, created_at)

## 주요 의사결정

| 항목 | 결정 | 이유 |
|---|---|---|
| 데이터 수집 | 네이버 블로그 검색 API | 공식, 약관 준수 |
| AI 모델 | Gemini 2.5 Flash | 무료 사용 가능, 구조화된 출력 지원 |
| 프론트엔드 | React + Vite | 프론트-백 분리, 포트폴리오 활용도 |
| DB | SQLite(MVP) → MySQL | 개발 속도 vs 본 배포 |

## 로드맵

- [x] 분석 파이프라인 및 대시보드 MVP
- [x] 네이버 블로그 검색 API 연동 (1주차)
- [x] 환경변수 `.env` 자동 로드 (1주차)
- [ ] 동일 매장 재조회 시 완전 캐싱 (컨설팅 리포트 DB 저장)
- [ ] Docker 컨테이너화 (docker-compose) (2주차)
- [ ] GitHub Actions CI/CD (3주차)
- [ ] 네이버 클라우드 플랫폼 배포 (3주차)
- [ ] 모니터링 대시보드 (4주차)

## 트러블슈팅

**Gemini API 429 에러 (할당량 초과)**
- 무료 등급: 일일 20회 요청 제한
- 해결: 1) 내일 리셋 대기 또는 2) Google Cloud 결제 연결 (pay-as-you-go)

**네이버 API 401 에러**
- 원인: `.env` 파일이 없거나 `python-dotenv`가 설치되지 않음
- 해결: 위 "사전 설정" 섹션 참고

## 기여 및 문의

네이버 AI 부트캠프 프로젝트입니다.