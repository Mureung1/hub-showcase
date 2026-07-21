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

- [x] sales Parser — ⚠️ 저장소에서 스크립트 파일 유실, git 히스토리에서 복구 필요 (week3_checklist.md 참고)
- [x] waste dtype 정리
- [ ] inventory / orders Parser — 설계 변경으로 불필요 (카테고리+월 집계 방식, inventory/orders 미사용)
- [ ] Product Master 생성 — 상품 단위 매칭률 낮아 P1로 이월, 카테고리+월 집계로 대체
- [x] Master Dataset 생성

### Core Features (실데이터 연동)

- [x] Financial Backend (마진/폐기손실 계산)
- [x] Financial Frontend (실데이터 연동) — 월/카테고리 필터, 전월 대비 비교, 손익 구조까지 확장 (2026-07-20)
- [ ] Dashboard KPI 실데이터 연동 — 미착수, 여전히 mock
- [ ] Rule Engine V1 (최소 3개 규칙) — 미착수
- [ ] Analysis 최소 1개 카테고리 실데이터 연동 (P1) — 미착수

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

- [ ] sales Parser 작성 (3단 헤더 → 단일 헤더)
- [ ] waste 상품코드 dtype 정리 (float → 정수/문자열)
- [ ] inventory / orders Parser
- [ ] Financial 계산식 최종 확정
- [ ] `docs/specs/MASTER_DATASET_SPEC.md` 작성

## Day 2 (화) — Product Master + Master Dataset

- [ ] `data/master/product_master.csv` 생성
- [ ] `data/master/merged_dataset.csv` 생성
- [ ] 카테고리별 row 수 및 결측치 확인

## Day 3 (수) — Financial Backend + Rule Engine V1

### Financial Backend
- [ ] 카테고리 평균 원가율 계산
- [ ] 마진액 / 마진율 계산
- [ ] 폐기손실 / 폐기율 계산
- [ ] 순이익 / 순이익기여도 계산
- [ ] `GET /api/financial` API 구현

### Rule Engine V1
- [ ] Rule 1: 판매증가 + 폐기율 < 5% → 발주 확대 검토
- [ ] Rule 2: 판매감소 + 폐기율 증가 → 발주 축소 검토
- [ ] Rule 3: 마진율 낮음 → 수익성 검토 필요
- [ ] RecommendationService 구현
- [ ] `GET /api/recommendations` API 구현

## Day 4 (목) — Financial Frontend + Dashboard 연결

- [ ] Financial: mock 제거, API 연결
- [ ] Dashboard KPI: 총매출/평균 마진율/폐기손실/추정 순이익 실데이터 연결
- [ ] Dashboard Category Margin 실데이터 연결
- [ ] Dashboard Recommendation Card (선택사항)

## Day 5 (금) — 통합 및 안정화

- [ ] Upload → Dashboard 전체 흐름 확인
- [ ] Analysis 최소 1개 카테고리 실데이터 연동 (P1, 여유 시)
- [ ] 예외 처리 및 버그 수정
- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run build` 통과
- [ ] 브라우저 실행 확인 (콘솔 에러·흰 화면 없음)

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

---

# 4주차 — 통합·안정화·발표 준비

**전제**: 3주차에서 MVP 핵심 기능을 모두 완성하므로, 4주차는 새로운 기능 개발이 아닌 **통합 테스트, 버그 수정, Analysis 마무리, 발표 준비**에 집중.

## 개발 (월/수/목만, 화/금 개발 제약)

- [ ] Analysis 전체 카테고리 실데이터 연동 (3주차 미완료 시)
- [ ] Dashboard AI Insight 고도화 (필요 시)
- [ ] 전체 통합 테스트 및 버그 수정
- [ ] 반응형 UI 점검

## 발표 준비

- [ ] 시연 스크립트 작성
- [ ] 데이터 마련 (시연용 데이터셋 확인)
- [ ] PPT/발표 자료 작성
- [ ] 시연 리허설

---

# Backlog — P2 (시간 남을 때 구현)

## MVP 완성 이후 고도화 (4주차 이후)

### ⭐ 최우선 — Upload → ETL 자동화 (2026-07-21 논의)

- [ ] Upload → ETL → Financial 자동 반영 파이프라인 구축
  - 현재: Upload는 파일명/카테고리 메타데이터만 Supabase에 기록, 실제 파일 저장·파서 실행 없음. ETL은 수동 실행, 백엔드 재시작 전까지 `merged_dataset.csv` 변경도 반영 안 됨
  - 작업 범위: (1) 실제 파일 업로드 처리(`data/raw/` 저장) (2) 백엔드에서 Python ETL 스크립트 subprocess 실행 트리거 (3) `FinancialService.reloadData()` + 캐시 무효화 (4) Upload 프론트 처리 상태 표시 (5) 에러 케이스 처리 (6) E2E 테스트
  - 예상 소요: 해피패스만이면 약 1일, 에러 처리 포함 견고하게 하면 약 2일
  - 불확실 지점: `master_dataset_builder.py`가 월 단위 증분 갱신을 지원하는지, 아니면 raw 전체 재계산 구조인지 확인 필요 — 착수 전 먼저 확인
  - 이 작업에 `FinancialService Cache Reload`(아래 항목) 포함됨
  - ⚠️ `financialService.ts`의 `if (this.data.length !== 24) throw ...` 하드코딩 검증도 이때 같이 제거/완화 필요 (데이터가 24행 이상으로 늘어나면 현재 로직은 에러를 던짐). Financial/Recommendation API 계약 자체는 안 바뀌므로 프론트는 그대로 호환됨

- [ ] Fuzzy Matching: sales/orders 상품명 유사 매칭
- [ ] Product Master 자동 보정: 수동 매핑 테이블 구축
- [ ] Rule Engine V2: 더 복잡한 규칙 추가
- [ ] FinancialService Cache Reload (V2): Upload 이후 최신 `merged_dataset.csv` 반영
  - `reloadData()` 구현, cache invalidation, Upload API와 연동, Recommendation 기준(카테고리 평균 폐기율/전체 평균 마진율) 재계산
  - 현재(V1)는 서버 기동 시 1회 로드 후 캐싱 — 의도적 설계 선택, 버그 아님 (2026-07-21 결정)
  - ⚠️ 위 "Upload → ETL 자동화" 작업에 포함되므로 별도 착수 불필요
- [ ] Dashboard AI Insight: 자연어 분석 고도화
- [ ] 로그인/로그아웃: 사이드바 프로필 팝오버에 로그아웃 버튼 추가 (Supabase 인증 연동)

## MVP 범위 밖 (항상 제외, CLAUDE.md 준수)

- ❌ 머신러닝 기반 수요예측
- ❌ 자동 발주 기능
- ❌ POS 연동
- ❌ 실시간 재고 조회
- ❌ 발주 자동 실행
