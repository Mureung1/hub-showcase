# AI 미스터리 쇼퍼 — 개발 위키

프로젝트의 구현 상세, 의사결정 기록, 트러블슈팅을 정리한 문서입니다.

---

## 1. 시스템 구성

### 1.1 컴포넌트

| 컴포넌트 | 파일 | 역할 |
|---|---|---|
| 프론트엔드 | `Dashboard.jsx` | 검색 입력, 분석 요청, 결과 시각화(도넛 게이지, 키워드 바, 리뷰 카드) |
| 백엔드 | `main.py` | API 엔드포인트, LLM 호출, 통계 집계, 컨설팅 리포트 생성 |
| 수집 계층 | `collector.py` | 네이버 블로그 검색 API 연동 (폴백: 더미 데이터) |
| DB 계층 | `database.py` | SQLAlchemy 엔진/세션, Competitor·Review 모델 정의 |

### 1.2 요청 흐름

1. 사용자가 대시보드에 가게 이름 입력 → `POST /api/analyze`
2. 백엔드가 매장 조회 또는 생성, 캐시 확인
3. 캐시 미스 시 `collector.fetch_reviews()`로 네이버 블로그 검색 API 호출
4. 수집된 리뷰 텍스트를 한 건씩 LLM에 전달, 구조화된 결과(감성·키워드·요약) 수신
5. 결과를 reviews 테이블에 저장
6. 통계 집계 후, 통계를 입력으로 두 번째 LLM 호출 → 컨설팅 리포트 생성
7. 통계 + 리포트 + 리뷰 상세를 JSON으로 반환, 프론트엔드가 렌더링
8. 응답에 `source`(naver_blog/fallback_dummy/database)와 `cached` 플래그 포함

---

## 2. AI 파이프라인

### 2.1 구조화된 출력

LLM 응답을 자유 텍스트가 아닌 고정 스키마로 받기 위해 Pydantic 모델과 LangChain의 `with_structured_output`을 사용했습니다.

```python
class ReviewAnalysis(BaseModel):
    sentiment: Literal["긍정", "부정"]
    keywords: List[str]
    summary: str
```

- `Literal` 타입으로 감성 값을 두 가지로 강제하여 후처리 분기를 단순화
- 파싱 실패나 임의 형식 응답 문제를 스키마 수준에서 차단

### 2.2 프롬프트 구성

- 분석 프롬프트: 역할(리뷰 분석 전문가) 지정 + 추출 항목 명시 + 리뷰 원문 주입
- 리포트 프롬프트: 집계된 통계(긍부정 건수, 키워드, 요약 목록)를 입력으로, "강점 벤치마킹 / 공략 가능한 약점" 관점의 5문장 이내 리포트를 요구

### 2.3 모델 선택

- **현재 모델**: `gemini-2.5-flash` (Google Gemini API)
- 이유: 무료 사용 가능, 구조화된 출력 지원, 한국어 처리 우수
- 무료 할당량: 일일 20회 요청 (RPD)

### 2.4 비용 구조

- 리뷰 N건 분석 = LLM 호출 N회 + 리포트 생성 1회
- 동일 매장 재분석 시 중복 호출이 발생하는 구조이므로, DB 캐싱이 적용됨 (분석 완료된 매장은 LLM 호출 생략)

---

## 3. 데이터 수집 계층

### 3.1 collector.py 설계

```python
def fetch_reviews(store_name: str, count: int = 20) -> dict:
    """
    네이버 블로그 검색 API로 리뷰 수집, 실패 시 더미 데이터 폴백
    """
```

- **소스 1**: 네이버 블로그 검색 API (공식, 약관 준수)
  - 쿼리: `"{매장명} 후기"` 
  - 반환: 제목 + 요약문 결합
  - HTML 태그(`<b>`) 및 엔티티 정리

- **소스 2**: 폴백 더미 데이터 (API 키 없거나 실패 시)
  - 목적: MVP 검증 및 개발 중 테스트 가능 상태 유지

### 3.2 수집 계층 분리

main.py의 수집 로직을 collector.py로 완전히 분리하여, 데이터 소스를 교체할 때 `main.py`는 수정하지 않아도 됨.

---

## 4. 데이터베이스

### 4.1 테이블 설계

**competitors**

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | BIGINT PK | 자동 증가 |
| name | VARCHAR(100), UNIQUE | 매장명 |
| category | VARCHAR(50) | 업종 |
| address | VARCHAR(255) | 주소 |
| created_at | DATETIME | 생성 시각 |

**reviews**

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | BIGINT PK | 자동 증가 |
| competitor_id | FK → competitors.id | ON DELETE CASCADE |
| content | TEXT | 리뷰 원문 (비정형) |
| sentiment | ENUM(긍정, 부정) | AI 분석 결과 (정형) |
| keywords | JSON | AI 추출 키워드 (정형) |
| summary | VARCHAR(255) | AI 한 줄 요약 |
| analyzed_at | DATETIME | 분석 시각 |
| created_at | DATETIME | 저장 시각 |

설계 의도: 비정형 텍스트(content)와 AI가 만든 정형 데이터(sentiment, keywords)를 같은 행에 두어, 원문 대비 분석 결과를 추적할 수 있게 함.

### 4.2 DB 선택 이력

- 최초 설계: MySQL (DDL 및 SQLAlchemy 연결 문자열 기준)
- MVP 단계: 개발 속도를 위해 SQLite로 전환
- SQLAlchemy ORM을 사용했기 때문에 연결 문자열 변경만으로 DB 교체 가능

---

## 5. 프론트엔드

### 5.1 구성

- 단일 컴포넌트(`Dashboard.jsx`)로 구성, 상태는 useState 4개(storeName, loading, error, data)
- 스타일: Tailwind CSS v4, 포인트 컬러 #03C75A (네이버 그린)
- 폰트: Pretendard (CDN)
- 시각화: SVG 직접 구현 도넛 게이지(stroke-dasharray 방식), 키워드 가로 바(최다 언급 대비 비율)

### 5.2 Tailwind v4 설정

```bash
npm install tailwindcss @tailwindcss/vite
```

- `vite.config.js`에 `@tailwindcss/vite` 플러그인 등록
- `src/index.css`는 `@import "tailwindcss";` 한 줄
- Vite 템플릿 기본 CSS(App.css 및 index.css의 데모 스타일)는 제거

---

## 6. 의사결정 기록 (ADR)

### ADR-1. 네이버 플레이스 리뷰 크롤링을 하지 않기로 함

- 배경: 기획 초안은 Selenium 등으로 플레이스 리뷰 50~100건을 수집하는 방안이었음
- 확인된 사실: 네이버는 플레이스 리뷰를 내려주는 공식 API를 제공하지 않으며, 이용약관은 자동화된 수집을 금지함
- 결정: 크롤링 대신 (1) MVP는 가상 데이터, (2) 고도화는 네이버 블로그 검색 API 등 공식 경로 사용
- 결과: 수집 계층을 교체 가능한 함수 단위로 분리하는 설계 방침 수립

### ADR-2. OpenAI에서 Gemini로 전환

- 배경: 초기 뼈대는 OpenAI gpt-4o 기준으로 작성
- 이유: 무료 사용 가능한 API 필요 (부트캠프 예산 제약)
- 방법: LangChain 추상화 덕분에 `ChatOpenAI` → `ChatGoogleGenerativeAI` 교체와 패키지 변경만으로 전환, Pydantic 스키마와 프롬프트는 그대로 재사용

### ADR-3. Streamlit 대신 React 채택

- 배경: 기획 초안의 프론트엔드는 Streamlit
- 이유: 프론트엔드-백엔드 분리 구조 학습 및 포트폴리오 활용도
- 비용: CORS 설정, Tailwind 설정 등 초기 세팅 작업 추가 발생

### ADR-4. gemini-1.5-flash에서 gemini-2.5-flash로 모델 업그레이드 (1주차)

- 배경: 초기 코드는 gemini-1.5-flash 기준으로 작성
- 문제 발견: 2026년 7월 기준, Gemini 1.5 모델은 완전히 종료되어 모든 요청이 404 NOT_FOUND 반환
- 결정: 현재 사용 가능한 최신 안정 모델인 gemini-2.5-flash로 업그레이드
- 영향: 코드 한 줄 수정(모델명 변경)만으로 즉시 적용, API 호출 로직 및 구조화된 출력은 그대로 유지

---

## 7. 트러블슈팅 기록

### 7.1 레이아웃 깨짐 (Tailwind 미적용)

- 증상: 클래스가 전부 무시되어 텍스트가 겹치고 카드·여백이 사라짐
- 원인: 프로젝트에 Tailwind가 설치되지 않은 상태에서 Tailwind 클래스를 사용 + Vite 템플릿 기본 CSS가 충돌
- 해결: Tailwind v4를 `@tailwindcss/vite` 플러그인으로 설치하고, 템플릿 기본 CSS 제거

### 7.2 Gemini 모델 404 에러 (1주차)

- 증상: `gemini-1.5-flash` 호출 시 "models/gemini-1.5-flash is not found" 404 NOT_FOUND 에러
- 원인: Gemini 1.5 모델 세트가 2026년 7월 기준 완전 종료됨
- 해결: 모델명을 `gemini-2.5-flash`로 변경, 즉시 정상 작동
- 교훈: Google의 모델 lifecycle 변화를 주기적으로 확인 필요

### 7.3 Gemini API 일일 할당량 한도 (1주차)

- 증상: 새 매장 조회 시 429 RESOURCE_EXHAUSTED, 메시지 "Quota exceeded for gemini-2.5-flash, limit: 20"
- 원인: Gemini API 무료 등급의 일일 요청 한도(RPD)가 20회이며, 리뷰 N건 분석 = N+1번의 LLM 호출로 구성되므로 한 번의 분석으로 거의 한도 소진
- 현황: 현재 collector.py의 기본값이 20건 수집이므로, count=5 정도로 축소하면 테스트 여유 확보 가능
- 장기 해결: Google Cloud 결제 계정을 프로젝트에 연결하면 무료 등급 제약 제거 (pay-as-you-go)

---

## 8. 1주차 체크리스트

### 완료 항목

- [x] 수집 계층 분리 (`collector.py` 작성)
- [x] 네이버 블로그 검색 API 연동 (환경변수: `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`)
- [x] 캐싱 구현 (동일 매장 재조회 시 LLM 호출 생략)
- [x] 응답에 `source`(`naver_blog`/`fallback_dummy`/`database`) 및 `cached` 플래그 추가
- [x] 모델 업그레이드 (gemini-1.5-flash → gemini-2.5-flash)
- [x] `/health` 엔드포인트 추가 (배포 대비)

### 검증 대기 (할당량 리셋 후)

- [ ] 네이버 API로부터 실제 리뷰 텍스트 수집 확인 (`source: naver_blog`)
- [ ] 새 매장 이름으로 전체 파이프라인 성공 응답 확인

---

## 9. 향후 과제

1. ~~네이버 블로그 검색 API 연동~~ **(1주차 완료)**
2. 분석 결과 완전 캐싱: 컨설팅 리포트도 DB에 저장 (현재는 재생성 중)
3. Docker 컨테이너화 및 docker-compose 구성 (2주차)
4. GitHub Actions 기반 CI/CD (3주차)
5. 네이버 클라우드 플랫폼 배포 및 헬스체크 모니터링 (3주차)
6. 간단한 모니터링 대시보드 (4주차)