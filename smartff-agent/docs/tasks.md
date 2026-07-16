## Milestone 1 ✅

- [x] 프로젝트 계획
- [x] 사용자 시나리오
- [x] UI 프로토타입
- [x] GitHub Wiki
- [x] MVP 범위

---

## Milestone 2 🚧

### 개발 환경

- [x] React 설정
- [x] Express 설정
- [x] Tailwind CSS
- [x] Main Layout
- [x] Supabase 프로젝트
- [x] Backend 환경 설정 (.env, Supabase Client)
- [x] Planning Agent
- [x] Validation Agent

### Core Features

- [ ] Upload
- [ ] Analysis
- [ ] Financial
- [ ] Dashboard

---

# 현재 Sprint 목표 (2주차)

하나의 **Vertical Slice** 완성

```
Frontend

↓

Backend

↓

Database

↓

Frontend
```

기능: Upload

목표: 하나의 완전한 요청-응답 사이클 완성

---

# Backlog (2주차~4주차)

우선순위

P0 (필수/차단)

P1 (중요)

P2 (여유 시)

---

# 2주차 — Sprint Goal (P0)

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

### 이번 스프린트에서 하지 않는 것 (Out of Scope)

- CSV/XLSX 실제 파싱
- Product Master 생성
- ETL 구현
- Analysis 데이터 처리
- Financial 계산
- Dashboard 실데이터 연동

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

## 목요일 — Analysis 전체 착수

**목표**: Analysis의 핵심 UI(탭/인사이트/바 차트)까지 한 번에 진행

- [ ] `AnalysisData` 인터페이스 정의 (4개 카테고리: 도시락/삼각김밥/김밥/샌드위치)
- [ ] Mock 데이터 (docs/specs/analysis_page_spec.md 52~74행 수치 그대로 사용)
- [ ] `<CategoryTabs/>` 카테고리 탭 선택기
- [ ] `<AIInsight/>` 인사이트 스트립 (카테고리 상태별 문구)
- [ ] `<WeekdayChart/>` 요일별 판매 패턴 (recharts, 최고값 #2563EB / 2위 #93C5FD)
- [ ] `<TimeChart/>` 시간대별 판매 패턴

**완료 기준**: Analysis 페이지에서 카테고리 탭 전환 시 인사이트 문구 + 바 차트 2종이 갱신됨

## 금요일 — Analysis 마무리 + Dashboard Skeleton

**오전: Analysis 트렌드 차트로 마무리**

- [ ] `<SalesTrendChart/>` 판매 추세 (12주 라인 차트)
- [ ] `<WasteTrendChart/>` 폐기 추세 (12주 라인 차트, 경고 상태면 빨강 라인 + #FEF2F2 배경 틴트)
- [ ] Analysis 페이지 spec 개발 체크리스트(94~111행) 전부 충족 확인

**오후: Dashboard Skeleton (최소 범위, Analysis 컴포넌트 재사용)**

- [ ] Analysis의 `TrendLineChart`를 Dashboard의 `SalesTrendChart`로 재사용 (design_system.md 616행 근거)
- [ ] 필수 2개 카드만: `AIBriefCard`, `KPICard` (mock 데이터)
- [ ] 타입 체크 (`npx tsc --noEmit`)
- [ ] **스트레치(시간 남을 때만)**: `RiskAlertCard`, `MarginBarList` 추가

**주간 마무리**

- [ ] `docs/tasks.md` 및 `docs/scrum.md` 2주차 마무리 여부 정리
- [ ] 필요 시 기능 단위 커밋 정리

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

# 3주차 — P1 (Analysis)

`ANALYSIS_PAGE_SPEC.md` 기준

- [ ] 요일별 판매 패턴
- [ ] 시간대별 판매 패턴
- [ ] 판매 추세
- [ ] 폐기 추세
- [ ] Merged Dataset 연동

---

# 3주차 — P1 (Financial)

`FINANCIAL_CALCULATION_SPEC.md` 기준

### Backend

- [ ] 마진액 계산
- [ ] 마진율 계산
- [ ] 폐기손실 계산
- [ ] 순이익 계산
- [ ] 순이익 기여도 계산
- [ ] 폐기율 계산

### Frontend

- [ ] Financial 페이지 구현
- [ ] 평균 마진 표시
- [ ] 평균 마진율 표시
- [ ] 폐기 손실 표시
- [ ] 카테고리별 수익성 표시

---

# 3주차~4주차 — P1 (Data Pipeline)

## Backend: Product Master / ETL

`data/raw` 실제 파일 확인 결과: 상품코드가 있는 파일은 `waste`/`inventory` 뿐이고, `sales`/`orders`는 상품명만 존재. 원가는 `waste`, 매가는 `inventory`에 나뉘어 있음. `sales`는 3단 그룹 헤더(조회기간/비교기간/차이)로 되어 있어 일반 파서로 바로 읽히지 않음.

- [ ] sales 파일 헤더 정규화: 3단 그룹 헤더 → 단일 헤더로 변환하는 파서 작성
- [ ] waste 상품코드 dtype 문제 해결: float(`2.700039e+12`) → 정수/문자열 변환, 정밀도 검증
- [ ] waste + inventory 병합: 상품코드 기준 원가+매가 통합 → Product Master 1차 버전
- [ ] inventory/waste 상품명 표기 규칙 확인: 두 파일 간 상품명 실제 일치 여부 샘플 대조
- [ ] sales 상품명 ↔ Product Master 매칭 로직: 정확 일치 실패 시 유사 매칭 or 수동 매핑 테이블
- [ ] orders 상품명 ↔ Product Master 매칭 (sales와 동일 로직 재사용)
- [ ] 매칭 실패 상품 리스트 산출 + 매칭률 검증
- [ ] Merged Dataset 조립: sales+waste+inventory+orders, 카테고리별 파일 통합 포함

### ⚠️ Risk: 월별/카테고리별 waste↔inventory 매칭률 편차

waste 상품코드가 inventory 상품코드에 포함되는 비율(매칭률)을 월×카테고리로 전수 확인한 결과:

| 카테고리 | 01월 | 02월 | 03월 | 04월 | 05월 | 06월 |
|---|---|---|---|---|---|---|
| 김밥 | 13% | 19% | 42% | 100% | 100% | 100% |
| 주먹밥 | 29% | 30% | 31% | 72% | 100% | 100% |
| 도시락 | 70% | 67% | 75% | 94% | 100% | 100% |
| 햄버거샌드위치 | 100% | 96% | 100% | 97% | 100% | 100% |

- 김밥/주먹밥은 01~03월 매칭률이 매우 낮음(13~42%). 도시락은 상대적으로 양호. 햄버거샌드위치는 처음부터 문제 없음.
- 04월 이후로는 전 카테고리 90%+ 로 안정화.
- **원인 불명** — 카테고리별 재고관리 도입 시점 차이인지, 원본 데이터 자체의 결측/오류인지 확인 필요.
- **대응 옵션**: (1) 01~03월 김밥/주먹밥 데이터는 분석 대상에서 제외, (2) 원본 데이터 재확보 요청, (3) 매칭 안 된 구간은 mock/추정치로 대체.
- **판단 기준**: Product Master 매칭 작업 중 실제 결측 원인을 먼저 파악한 뒤 세 옵션 중 결정.

---

# 4주차 — P1

- [ ] Dashboard 데이터 연동: Analysis/Financial 실데이터 연동
- [ ] AI Recommendation (Rule-Based Decision Engine 연결)
- [ ] 통합 테스트, 버그 수정
- [ ] 반응형 UI 점검

---

# Backlog — P2 (시간 남을 때 구현)

- [ ] 로그인/로그아웃: 사이드바 프로필 팝오버에 로그아웃 버튼 추가 (Supabase 인증 연동)
