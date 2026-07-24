## Milestone 1 ✅

- [x] 프로젝트 계획
- [x] 사용자 시나리오
- [x] UI 프로토타입
- [x] GitHub Wiki
- [x] MVP 범위

---

## Milestone 2 ✅ (2주차)

### 개발 환경

- [x] React 설정
- [x] Express 설정
- [x] Tailwind CSS
- [x] Main Layout
- [x] Supabase 프로젝트
- [x] Backend 환경 설정 (.env, Supabase Client)
- [x] Planning Agent
- [x] Validation Agent

### Core Features (UI 스켈레톤 완성)

- [x] Upload (Vertical Slice 완성: FE-BE-DB 연결)
- [x] Analysis (Mock 데이터 기반 완성)
- [x] Dashboard (Mock 데이터 기반 스켈레톤)
- [x] Financial (3주차 완료 — 실데이터 연동 + 월/카테고리 필터 + 손익 구조까지, 2026-07-20)

---

## Milestone 3 🚧 (3주차)

### Data Pipeline

- [x] sales Parser — 2026-07-20 세션에서 스크립트 파일 복구 완료 (커밋 25d7ed1)
- [x] waste dtype 정리
- [ ] inventory / orders Parser — 설계 변경으로 불필요 (카테고리+월 집계 방식, inventory/orders 미사용)
- [ ] Product Master 생성 — 상품 단위 매칭률 낮아 P1로 이월, 카테고리+월 집계로 대체
- [x] Master Dataset 생성

### Core Features (실데이터 연동)

- [x] Financial Backend (마진/폐기손실 계산)
- [x] Financial Frontend (실데이터 연동) — 월/카테고리 필터, 전월 대비 비교, 손익 구조까지 확장 (2026-07-20)
- [x] Dashboard KPI 실데이터 연동 — 2026-07-21 완료 (`/api/financial/summary`, `/api/recommendations` 연동, mock 제거)
- [x] Rule Engine V1 (최소 3개 규칙) — 2026-07-21 완료 (`RecommendationService`, 카테고리 평균 폐기율/전체 평균 마진율 기반)
- [x] Analysis 판매/폐기 추세 차트 실데이터 연동 (P1) — 2026-07-22 완료 (전 카테고리, `/api/financial/summary` 기반)
- [x] Analysis 요일별/시간대별 판매 패턴 실데이터 연동 — 2026-07-22 완료. `data/scripts/pattern_parser.py` 신규(6월 4주 평균), `data/master/weekday_sales.csv`/`hourly_sales.csv`, `GET /api/patterns/weekday|hourly?category=` 신설, `AnalysisPage.tsx` mock 제거. 이로써 Analysis 페이지 4개 차트 전부 실데이터 기반
- [x] Analysis AI 인사이트(InsightStrip) 실데이터 연동 — 2026-07-22 완료. 기존 `/api/recommendations`(Rule Engine V1)를 카테고리별로 필터링해 상태(opportunity/neutral/risk) 판정(Dashboard의 risk 기준과 동일)과 사유 문구 생성, 요일/시간대 패턴과 결합. `ANALYSIS_MOCK_DATA`의 `type`/`reasons` 사용 중단(다른 필드는 트렌드 폴백용으로 유지)

---

# 현재 Sprint 목표 (3주차)

**MVP 완성: 전체 데이터 흐름 정상 동작**

```
Upload

↓

Python ETL (Parser, Product Master, Master Dataset)

↓

Express API (Financial 계산, Rule Engine)

↓

Dashboard / Financial (실데이터 기반 렌더링)

↓

Recommendation
```

목표: `Upload → ETL → API → Dashboard → Financial → Recommendation` End-to-End 흐름 완성

상세 계획: `docs/week3_plan.md`, 진행도 추적: `docs/week3_checklist.md`

---

# Backlog 우선순위

## 3주차 우선순위

**P0 (필수, MVP 완성 필수)**: Parser 전체, Product Master, Master Dataset, Financial Backend, Financial Frontend, Dashboard KPI 실데이터, Rule Engine V1

**P1 (중요, 시간 남으면)**: Dashboard Recommendation Card, Analysis 1개 카테고리 실데이터

**P2 (저순위, 4주차 이후)**: Analysis 전체 카테고리 실데이터, Rule 추가, UI 개선

---

# 2주차 — Sprint Goal ✅ (완료)

## Upload Vertical Slice

이번 스프린트의 우선순위를 의도적으로 조정했습니다.

CLAUDE.md의 "Development Flow"에서는 **Data Pipeline → Backend → Frontend** 순서를 권장하지만, 과제 요구사항이 **Frontend → Backend → Database → Frontend 한 사이클(Vertical Slice) 완성**이기 때문입니다.

따라서 이번 주는 **Product Master와 ETL 구현은 3~4주차로 미루고, Upload 기능을 끝까지 연결하는 것**을 우선합니다.

```
Frontend

↓

Backend

↓

Database

↓

Frontend
```

### Backend

- [x] Supabase에 `uploads` 테이블 생성
- [x] Upload API 구현 (`POST /api/uploads`)
- [x] Upload 이력 API 구현 (`GET /api/uploads`)
- [x] Upload API를 Supabase `uploads` 테이블에 연결

### Frontend

- [x] Upload 페이지 구현
- [x] 파일 선택 UI 구현
- [x] 업로드 이력 테이블 표시
- [x] 데이터셋 상태 표시
- [x] Frontend ↔ Backend 연결

### Validation

- [x] Frontend → Backend → Database → Frontend 흐름 완성 확인
- [x] 업로드 이력 영속성 검증 (새로고침 후 유지)
- [x] Validation Agent 검증

### 개발 프로세스

- [x] Planning Agent 사용하여 계획 수립
- [x] Validation Agent 구성
- [x] 구현 전에 Planning Agent 사용
- [x] 구현 후에 Validation Agent 사용

### 완료 기준 (Definition of Done)

이 스프린트는 아래 조건을 모두 만족하면 완료로 간주합니다.

- [x] Upload 페이지에서 파일을 선택할 수 있다
- [x] Frontend가 Backend Upload API를 호출한다
- [x] Backend가 Supabase `uploads` 테이블에 메타데이터를 저장한다
- [x] Upload History가 DB에서 조회되어 화면에 표시된다
- [x] 새로고침 후에도 업로드 이력이 유지된다
- [x] Validation Agent 검증을 통과한다

### 2주차에서 하지 않은 것 (3주차로 이월)

- ✅ Data Pipeline (Parser, Product Master, Master Dataset) — 3주차 Day 1~3에서 처리
- ✅ Financial Backend 계산 — 3주차 Day 3에서 처리
- ✅ Dashboard/Analysis 실데이터 연동 — 3주차 Day 4~5에서 처리
- ✅ Rule Engine V1 — 3주차 Day 3에서 처리

---

# 2주차 잔여 일정 (수요일 오후 / 목요일 / 금요일)

> Upload Vertical Slice 완성 후, "Layout, Upload, Dashboard Skeleton, Analysis 착수" 목표를 달성하기 위한 2.5일 스케줄
> 
> **주의**: Sidebar는 3개 메뉴만 (Upload/Analysis/Dashboard), Dashboard는 최소 스켈레톤(필수 2개 카드)으로 Analysis 우선도를 높임

## 사전 준비 (오늘 오후 시작 전)

- [x] `react-router-dom` npm 설치
- [x] `recharts` npm 설치

## 수요일 오후 — Sidebar & 라우팅

**목표**: 3개 페이지(Upload/Analysis/Dashboard)를 사이드바 메뉴로 오갈 수 있는 껍데기 완성

- [x] `frontend/src/layouts/MainLayout.tsx` 생성 — Icon Rail Sidebar (76px, 배경 #1E293B, active icon #60A5FA)
- [x] **3개 메뉴만** (Upload/Analysis/Dashboard) — Financial은 3주차 시작 시 추가
- [x] `react-router-dom` 라우트 설정 (`/upload`, `/analysis`, `/dashboard`)
- [x] `/analysis`, `/dashboard`에 빈 페이지 컴포넌트 (로딩 중 메시지 수준)
- [x] `App.tsx` 라우터 기반으로 교체
- [x] Upload 페이지는 기존 기능 그대로 유지 확인

**완료 기준**: 브라우저에서 사이드바 클릭으로 3개 페이지 이동 가능, Upload 페이지 기존 기능 동작

## 목요일 — Analysis 전체 착수 ✅

**목표**: Analysis의 핵심 UI(탭/인사이트/바 차트)까지 한 번에 진행

- [x] `AnalysisData` 인터페이스 정의 (4개 카테고리: 도시락/삼각김밥/김밥/햄버거샌드위치)
- [x] Mock 데이터 (docs/specs/analysis_page_spec.md 52~74행 수치 그대로 사용)
- [x] `<CategoryTabs/>` 카테고리 탭 선택기
- [x] `<InsightStrip/>` 인사이트 스트립 (카테고리 상태별 문구)
- [x] `<PatternBarChart/>` 요일별/시간대별 판매 패턴 (div 바, 최고값 #2563EB / 2위 #93C5FD)
- [x] `<TrendLineChart/>` 판매/폐기 추세 12주 라인 차트

**완료 기준**: ✅ Analysis 페이지에서 카테고리 탭 전환 시 인사이트 문구 + 바 차트 4종(요일별/시간대별/판매/폐기) + 추세 라인 차트가 갱신됨

## 금요일 — Analysis 마무리 + Dashboard Skeleton ✅ (오전 완료)

**오전: Analysis 트렌드 차트로 마무리** ✅

- [x] `<TrendLineChart/>` 판매 추세 (12주 라인 차트) — 구현 + 최고값 강조 원 추가
- [x] `<TrendLineChart/>` 폐기 추세 (12주 라인 차트, 라인 색상 동적) — 구현 + 배경 틴트 제거
- [x] Analysis 페이지 spec 개발 체크리스트(94~111행) 전부 충족 확인 — Validation Agent 검증 완료 (8/10, 중요 결함 해결)

**오후: Dashboard Skeleton (최소 범위, Analysis 컴포넌트 재사용)** ✅

- [x] Dashboard 판매 추세 차트 구현 — `SalesTrendChart` 별도 컴포넌트로 분리 결정
  - 결정 근거: Dashboard 사양(4주 기간, 포인트 호버 툴팁/확대, 누적 매출 헤더, 하단 매출액 표시)이
    Analysis `TrendLineChart`(12주, 정적)와 달라 재사용 대신 분리 구현 (2026-07-16)
- [x] 필수 2개 카드: `AIBriefCard`, `KPICard` (mock 데이터)
- [x] 타입 체크 (`npx tsc --noEmit`) 통과
- [x] **스트레치**: `RiskAlertCard`, `MarginBarList` 추가 완료
- [x] Claude Design 원본(`SmartFF Dashboard.dc.html`) 반영 + 3개 탭 헤더 규격 통일
- [x] Validation Agent 검증(7.5/10) 후 Major/Minor 지적사항 수정 완료

**주간 마무리**

- [x] `docs/tasks.md` 및 `docs/scrum.md` 2주차 마무리 정리
- [x] 기능 단위 커밋 정리

**완료 기준**: Analysis 페이지 완결, Dashboard가 mock 데이터로 최소 2개 카드를 보여줌

---

## 중요: Scope 관리

### ✅ 이번 2주차에서 하는 것

- Sidebar (3개 메뉴만)
- Analysis (전체 완성)
- Dashboard (필수 2개 카드 + 트렌드 차트 재사용)

### ❌ 이번 2주차에서 하지 않는 것

- Financial 페이지 (3주차 시작 시 추가)
- Analysis/Dashboard 실데이터 연동, Backend API (4주차)
- ETL/Data Pipeline — 혼자 진행 중이므로 `tasks.md` 원래 일정대로 **3주차부터** 착수. sales 3단 헤더 정규화, waste dtype 문제, waste+inventory 매칭률 편차(1~3월 김밥/주먹밥 13~42%) 원인 조사 등이 자체가 하루 이상 걸릴 수 있는 별도 트랙이므로 Frontend 스켈레톤 작업과 분리

---

# 3주차 — P0 Sprint Goal

**목표: MVP 완성 — `Upload → ETL → Master Dataset → Express API → Dashboard → Financial → Recommendation` 전체 데이터 흐름이 정상 동작**

세부 일정은 `docs/week3_plan.md` 참고. 진행도는 `docs/week3_checklist.md`에서 추적.

## Day 1 (월) — Data Pipeline 기초 구축

- [x] sales Parser 작성 (3단 헤더 → 단일 헤더)
- [x] waste 상품코드 dtype 정리 (float → 정수/문자열)
- [ ] inventory / orders Parser — 설계 변경으로 불필요 (카테고리+월 집계 방식, 미사용 결정)
- [x] Financial 계산식 최종 확정
- [x] `docs/specs/MASTER_DATASET_SPEC.md` 작성

## Day 2 (화) — Product Master + Master Dataset

- [ ] `data/master/product_master.csv` 생성 — 상품 단위 매칭률 낮아 P1 이월, 카테고리+월 집계로 대체
- [x] `data/master/merged_dataset.csv` 생성
- [x] 카테고리별 row 수 및 결측치 확인

## Day 3 (수) — Financial Backend + Rule Engine V1

### Financial Backend
- [x] 카테고리 평균 원가율 계산
- [x] 마진액 / 마진율 계산
- [x] 폐기손실 / 폐기율 계산
- [x] 순이익 / 순이익기여도 계산
- [x] `GET /api/financial` API 구현

### Rule Engine V1
- [x] Rule 1: 판매증가 + 폐기율 < 카테고리 평균 → 발주 확대 검토 (절대 임계값 대신 데이터셋 평균 기준으로 설계 변경)
- [x] Rule 2: 판매감소 + 폐기율 증가 → 발주 축소 검토
- [x] Rule 3: 마진율 낮음(전체 평균 이하) → 수익성 검토 필요
- [x] RecommendationService 구현
- [x] `GET /api/recommendations` API 구현

## Day 4 (목) — Financial Frontend + Dashboard 연결

- [x] Financial: mock 제거, API 연결
- [x] Dashboard KPI: 총매출/평균 마진율/폐기손실/추정 순이익 실데이터 연결
- [x] Dashboard Category Margin 실데이터 연결
- [x] Dashboard Recommendation Card

## Day 5 (금) — 통합 및 안정화

- [x] Upload → Dashboard 전체 흐름 확인 — 2026-07-22 Upload→ETL 자동화 완료로 실제 업로드부터 끝까지 End-to-End 검증 완료 (정상/실패 케이스 모두 curl로 직접 테스트)
- [x] Analysis 실데이터 연동 — 판매/폐기 추세 + 요일/시간대 패턴 + AI 인사이트 + 탭 배지까지 전부 실데이터 (2026-07-22, 애초 목표였던 "최소 1개 카테고리"를 초과 달성)
- [x] 예외 처리 및 버그 수정 — ETL 실패 시 캐시 미반영·업로드 이력 '오류' 기록 확인, financial/pattern/recommendation fetch 전부 에러 상태 처리
- [x] `npx tsc --noEmit` 통과 (backend, frontend)
- [x] `npm run build` 통과 (backend, frontend)
- [ ] 브라우저 실행 확인 (콘솔 에러·흰 화면 없음) — Analysis는 사용자 확인 완료, Dashboard/Upload는 미확인 (Chrome 확장 미설치로 자동 확인 불가)

---

## ⚠️ Risk: 월별/카테고리별 waste↔inventory 매칭률 편차

waste 상품코드가 inventory 상품코드에 포함되는 비율(매칭률) 현황:

| 카테고리 | 01월 | 02월 | 03월 | 04월 | 05월 | 06월 |
|---|---|---|---|---|---|---|
| 김밥 | 13% | 19% | 42% | 100% | 100% | 100% |
| 주먹밥 | 29% | 30% | 31% | 72% | 100% | 100% |
| 도시락 | 70% | 67% | 75% | 94% | 100% | 100% |
| 햄버거샌드위치 | 100% | 96% | 100% | 97% | 100% | 100% |

**대응 전략 (3주차 체크리스트 참고)**:
- Day2: 별도 조사 작업 없이 진행
- Day3: 카테고리 원가율 산출 시 이상치 확인 → 있으면 원인 파악, 없으면 스킵
- 최종 결정: `docs/tasks.md`의 이 Risk 항목에 "3주차 기준 정상" 또는 "구간 제외 처리" 메모 남김

**최종 결정 (2026-07-22, 구간 제외 처리)**: 상품 단위 waste↔inventory 매칭 자체를 설계에서 제외했다 (Day2에서 카테고리+월 집계 방식으로 전환, `MASTER_DATASET_SPEC.md` 참고). 따라서 이 매칭률 리스크는 더 이상 계산 경로에 존재하지 않는다. 대신 카테고리 원가율(`avg_cost_rate`)로 데이터 품질을 검증했고, 실측 62.1~75.7% 범위로 예상 범위(40~80%) 내 정상 확인됨 (`master_dataset_builder.py` 검증 로그, 2026-07-22 재확인).

---

# 4주차 — 통합·안정화·발표 준비

**전제**: 3주차에서 MVP 핵심 기능을 모두 완성하므로, 4주차는 새로운 기능 개발이 아닌 **통합 테스트, 버그 수정, Analysis 마무리, 발표 준비**에 집중.

## 개발 (월/수/목만, 화/금 개발 제약)

- [x] Analysis 전체 카테고리 실데이터 연동 — 3주차(2026-07-22)에 이미 완료됨(위 Milestone 3 참고), 이 항목은 "미완료 시" 조건부라 중복 표기였음
- [ ] Dashboard AI Insight 고도화 (필요 시)
- [x] 전체 통합 테스트 및 버그 수정 — 2026-07-23 진행. Upload/Dashboard/Analysis/Financial 전 페이지 브라우저 실행 확인(콘솔 에러·흰 화면 없음, API 200), backend/frontend `tsc`/`build` 매 변경마다 통과 확인
- [ ] 반응형 UI 점검

### 2026-07-23(목) 세션 — Upload 자동화 완결성 + 패턴 다월화 + 첫 단위 테스트

- [x] **Upload 완결성 체크**: sales/waste 8개 파일(4카테고리×2종) 중 부족하면 ETL을 실행하지 않고 어떤 파일이 더 필요한지 안내(`202` + `missingFiles`), 다 채워지면 자동 ETL 실행. 이전엔 격자 미완결 시 500 트레이스백만 노출됐음. `backend/src/services/uploadAutomationService.ts`의 `findMissingFiles()`로 구현, 실제 업로드로 8개 채우는 과정 끝까지 검증(마지막 파일에서 Dashboard 자동 반영 확인)
- [x] **Upload 처리 상태 API**: 업로드 시작 시 `처리중` 레코드 먼저 insert 후 ETL 결과에 따라 `정상`/`대기중`/`오류`로 갱신 (`uploadService.ts`의 `updateUploadStatus()` 신규)
- [x] **Upload "데이터 검증 결과" 카드 실데이터 연동** — 아래 P2 백로그 항목 완료 처리 참고
- [x] **패턴 파서(pattern_parser.py) 월 하드코딩 제거**: `06`월 고정 대신 `data/raw/{weekday,hourly}_sales`에 실제 존재하는 월·주차를 스캔(월~일 기준 분할 시 달마다 4~5주차까지 생길 수 있어 `MAX_WEEKS_PER_MONTH=5`로 유동 처리). CSV에 `month` 컬럼 추가, `patternService.ts`에 `reloadData()` 추가 + 카테고리별 최신월 자동 선택으로 프론트 계약은 그대로 유지. 기존 6월 데이터로 회귀 없음 확인
  - 실제 7월 데이터로 다월 동작 검증은 보류 — 2026-07-25(토) 사용자가 실제 `weekday_sales_07_w1~w3_*`/`hourly_sales_07_w1~w3_*` 데이터를 가져올 예정
- [x] **frontend 단위 테스트 인프라 첫 구축**: `vite.config.ts`(`defineConfig`를 `vitest/config`에서 가져오도록 수정), `setupTests.ts`(`@testing-library/jest-dom/vitest`로 수정) 등 vitest 실행 안 되던 버그 발견·수정. `frontend/src/utils/analysisSummary.ts` 전체 함수(`monthlyTrendSummary`/`weekdaySummary`/`timeSummary`/`trendSummary`/`seriesToSvg`)에 대해 정상 케이스·경계값·0으로 나누기 등 엣지케이스 포함 27개 테스트 작성, 전부 통과
- [x] **발주(orders) 데이터 조사**: `orders_MMDD.xlsx`(날짜별 1파일, 상품명 단위) 구조 확인 + 06월 판매 데이터와 상품명 매칭률 일회성 조사 — 전체 85.9%(도시락 90.9%/김밥 89.5%/주먹밥 90.9%/햄버거샌드위치 79.6%)로 3주차 waste↔inventory 사례(13~42%)와 달리 상품 단위 매칭이 실제로 잘 작동함을 확인. 상세 결론 및 다음 단계는 아래 P2 백로그 "발주 데이터 활용" 항목 참고

## 발표 준비

- [ ] 시연 스크립트 작성
- [ ] 데이터 마련 (시연용 데이터셋 확인)
- [ ] PPT/발표 자료 작성
- [ ] 시연 리허설

---

# Backlog — P2 (시간 남을 때 구현)

## MVP 완성 이후 고도화 (4주차 이후)

### Upload → ETL 자동화 (2026-07-21 논의, 2026-07-22 sales/waste 완료)

- [x] Upload → ETL → Financial 자동 반영 파이프라인 구축 (sales/waste만) — 2026-07-22 완료
  - `multer`로 실제 파일 업로드 처리 추가, `data/raw/{sales,waste}/`에 저장
  - `backend/src/services/etlService.ts`: sales_parser → waste_parser → master_dataset_builder를 child_process로 순차 실행
  - `backend/src/services/uploadAutomationService.ts`: 파일저장→ETL→reload 오케스트레이션 (Controller는 얇게 유지)
  - `financialService.reloadData()` 추가로 서버 재시작 없이 최신 데이터 반영 확인 완료 (RecommendationService는 캐시가 없어 자동 최신화)
  - ETL 실패 시 reload 스킵 + 업로드 이력 '오류' 상태 기록 — 실패해도 기존 정상 데이터 유지되는 것 실제 장애 주입 테스트로 확인
  - Upload 페이지에 상품 카테고리·월 선택 UI 추가 (기존엔 없었음)
  - `master_dataset_builder.py`는 매번 원본부터 전체 재계산하는 stateless 구조로 확인됨 — 증분 갱신 불확실성 해소
  - `financialService.ts`의 `data.length !== 24` 하드코딩은 건드리지 않음 (카테고리·월 그리드가 고정이라 재실행해도 24행 유지)
  - 남은 범위: orders/inventory 파서 없음(2026-07-23 발주 파서 조사 시작, 아래 "발주 데이터 활용" 항목 참고), hourly/weekday는 Upload UI 자동화 연결 아직 미착수(주차 선택 UI 필요). `patternService.ts`의 reload 미지원은 2026-07-23 `reloadData()` 추가로 해결

- [ ] 폐기 요일/시간대 패턴 실데이터 연동 — 판매 패턴은 2026-07-22 연동 완료(위 Milestone 3 참고). 폐기(waste)의 요일/시간대 원본 자체는 여전히 없어 보류
  - **2026-07-23 부수 개선**: `pattern_parser.py`의 "06월 4주 평균" 하드코딩은 제거함 — `data/raw/{weekday,hourly}_sales`에 실제 존재하는 월·주차를 스캔해 처리하도록 일반화(월~일 기준 분할 시 5주차까지 유동 허용). 이 항목 자체(폐기 패턴 연동)는 여전히 미완료, 파서 구조만 다월 지원 가능하게 준비된 상태

- [ ] **배송편(1편/2편) 데이터 모델 확장 검토** (2026-07-24 논의, v2 Rule Engine 범위)
  - GS25 자동발주 화면·발주 원본 데이터 재검토 결과, 상품마다 "1편"/"2편"(배송편) 개념이 존재하며 원본 상품명 접미사로 그대로 남아있음 확인 (예: `참치마요듬뿍김밥1편`, `NEW기본김밥2편`)
  - 현재 파이프라인 조사 결과: `sales_parser.py`/`waste_parser.py`는 상품명을 가공 없이 저장해 `data/master/sales.csv`/`waste.csv`에는 접미사가 남아있지만, `master_dataset_builder.py`의 `groupby(['month','category'])` 집계 단계에서 배송편 정보가 완전히 소실됨 — `merged_dataset.csv`엔 category+month 단위만 존재
  - `RecommendationService.ts`는 `category`를 그룹핑 키(dimension)로 취급하는 구조라, `${category}|${batch}` 복합키로 바꾸는 정도로 비교적 쉽게 확장 가능할 것으로 보임. 다만 `patternService.ts`(요일/시간대 패턴)는 원본 자체가 카테고리 단위 사전집계라 배송편 분리 불가 — 필요 시 원본 재수집부터 시작해야 함
  - v2 착수 시 손댈 지점: `sales_parser.py`/`waste_parser.py`(상품명에서 `delivery_batch` 분리), `master_dataset_builder.py`(groupby key 확장), `financial.ts`(`FinancialRecord`에 필드 추가), `RecommendationService.ts`(그룹핑 키 확장), 스펙 문서(`MASTER_DATASET_SPEC.md` 등) 갱신
  - v1 Rule Engine은 지금 변경하지 않기로 결정 — 현재는 판매 추세/폐기 추세/수익성/카테고리 추천까지만 유지

- [ ] 발주 데이터 활용 — 발주·판매 괴리(발주량 대비 실판매) + 폐기율 교차 규칙 추가 (2026-07-23 논의)
  - `orders_MMDD.xlsx`(날짜별 1파일, 상품명 단위)와 06월 `sales.csv` 상품명 매칭률을 일회성 스크립트로 조사한 결과 **전체 85.9%**(도시락 90.9%/김밥 89.5%/주먹밥 90.9%/햄버거샌드위치 79.6%)로, 3주차 waste↔inventory 매칭 실패 사례(13~42%)와 달리 상품 단위 매칭이 실제로 잘 작동함을 확인
  - 매칭 안 된 상품은 대부분 6월엔 없던 신상품으로 보여 진짜 매칭 실패가 아닐 가능성 높음
  - 결론: 카테고리 단위로 우회할 필요 없이 **상품 단위로 발주 파서를 새로 만들어도 될 것 같음** (orders는 날짜별 1파일·상품명 컬럼 구조라 sales/waste 파서 패턴 그대로 재사용은 불가, 신규 작성 필요)
  - 재고(inventory)는 MVP 범위 밖("실시간 재고 조회" 제외)이라 계속 보류
  - 다음 단계(미착수): (1) orders 파서 신규 작성 (2) 발주량 대비 실판매/폐기율 교차 Rule Engine 규칙 설계 (3) Upload 자동화 파이프라인 편입 여부 결정
- [ ] Fuzzy Matching: sales/orders 상품명 유사 매칭
- [ ] Product Master 자동 보정: 수동 매핑 테이블 구축
- [ ] Rule Engine V2: 더 복잡한 규칙 추가
- [x] FinancialService Cache Reload (V2) — 2026-07-22 "Upload → ETL 자동화" 작업에 포함되어 완료. `financialService.reloadData()` 구현, `uploadAutomationService`가 ETL 성공 시 호출. Recommendation은 캐시가 없어 자동 최신화됨
- [ ] Dashboard AI Insight: 자연어 분석 고도화
- [ ] 로그인/로그아웃: 사이드바 프로필 팝오버에 로그아웃 버튼 추가 (Supabase 인증 연동) — 배포 시점에 "접속 비밀번호" 수준 경량 보호부터 우선 검토하기로 결정 (2026-07-22)
- [ ] 프론트엔드 번들 코드 스플리팅 — `npm run build` 시 메인 청크 667KB 경고(2026-07-22 validation-agent 지적). 지금 당장 문제는 아니지만 페이지별 `React.lazy()` 분리 고려
- [x] Upload 페이지 "데이터 검증 결과" 카드 실데이터 연동 (2026-07-22 발견, 2026-07-23 완료) — `sales_parser.py`/`waste_parser.py`가 파일별 파싱 통계(`STATS_JSON:` 라인)를 stdout에 출력 → `etlService.ts`가 파싱해 `EtlStepResult.stats`에 포함 → `uploadAutomationService`/`uploadController`가 방금 업로드한 파일의 통계만 골라 `parseStats`로 응답 → `UploadPage.tsx`가 판매/폐기는 실제 통계(예: `sales_10_도시락.xlsx: 26개 상품 정상 인식`), 발주/재고는 "자동 검증 미지원 (파서 없음)"으로 정직하게 표시. 단, 이 통계는 서버에 영속화하지 않고 브라우저 세션(페이지 새로고침 전까지)에만 유지됨. 실제 업로드로 대기중/완료 양쪽 케이스 검증 완료

## MVP 범위 밖 (항상 제외, CLAUDE.md 준수)

- ❌ 머신러닝 기반 수요예측
- ❌ 자동 발주 기능
- ❌ POS 연동
- ❌ 실시간 재고 조회
- ❌ 발주 자동 실행
