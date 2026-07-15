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
- [ ] Upload 이력 API 구현 (`GET /api/uploads`)
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
- [ ] Validation Agent 검증

### 개발 프로세스

- [x] Planning Agent 사용하여 계획 수립
- [x] Validation Agent 구성
- [x] 구현 전에 Planning Agent 사용
- [ ] 구현 후에 Validation Agent 사용

### 완료 기준 (Definition of Done)

이 스프린트는 아래 조건을 모두 만족하면 완료로 간주합니다.

- [x] Upload 페이지에서 파일을 선택할 수 있다
- [x] Frontend가 Backend Upload API를 호출한다
- [x] Backend가 Supabase `uploads` 테이블에 메타데이터를 저장한다
- [x] Upload History가 DB에서 조회되어 화면에 표시된다
- [x] 새로고침 후에도 업로드 이력이 유지된다
- [ ] Validation Agent 검증을 통과한다

### 이번 스프린트에서 하지 않는 것 (Out of Scope)

- CSV/XLSX 실제 파싱
- Product Master 생성
- ETL 구현
- Analysis 데이터 처리
- Financial 계산
- Dashboard 실데이터 연동

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
